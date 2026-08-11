"use client";

import { useState } from "react";
import { useAdminPrefs } from "@/lib/adminStore";
import { useHydrated } from "@/lib/examStore";
import {
  addComment,
  approveItem,
  rejectCodes,
  rejectItem,
  rejectLabel,
  reviewChecks,
  stateLabel,
  stateTone,
  typeLabel,
  useItems,
  type ItemDraft,
  type RejectCode,
  type ReviewCheckId,
} from "@/lib/itemStore";
import { PageHead, Badge } from "./Parts";
import * as a from "./ui";

/**
 * EXP-03 검수 워크벤치.
 *
 * 제출된 문항을 3단으로 본다 — 내용 · 태깅 · 윤리. 세 칸을 다 짚기 전에는 승인 버튼이
 * 열리지 않는다. 훑어보고 통과시키는 일을 막기 위한 장치다.
 *
 * 반려에는 사유 코드를 반드시 고르게 한다. 출제자가 무엇을 고쳐야 하는지 코멘트만으로는
 * 흐릿해지기 때문이다.
 *
 * 반려하지 않고 코멘트만 남길 수도 있다. 「반려까지는 아닌데 짚고 넘어갈 것」을 적을
 * 자리가 없으면 검수자가 반려를 남발하게 되고, 출제자는 사소한 지적에도 문항을 통째로
 * 되돌려 받는다. 승인할 때도 소견을 함께 남긴다.
 *
 * 자기가 쓴 문항은 목록에 뜨지 않는다. 출제자와 검수자를 갈라 둔 이유가 여기서 실제로
 * 작동해야 한다(정의서 9장).
 */
export default function ReviewBench() {
  const prefs = useAdminPrefs();
  const hydrated = useHydrated();
  const all = useItems();
  const [openId, setOpenId] = useState<string | null>(null);

  // 검수 대상 = 제출된 것 중 내가 쓰지 않은 것
  const queue = all.filter((i) => i.state === "submitted" && i.author !== prefs.loginId);
  const mineSubmitted = all.filter((i) => i.state === "submitted" && i.author === prefs.loginId);
  const current = queue.find((i) => i.id === openId) ?? queue[0] ?? null;

  return (
    <>
      <PageHead
        id="EXP-03"
        title="검수 워크벤치"
        lead="제출된 문항을 내용·태깅·윤리 3단으로 검수하고, 통과 여부를 결정합니다."
      />

      {!hydrated ? (
        <p className={`${a.panel} p-8 text-center ${a.bodyText}`}>확인 중입니다…</p>
      ) : (
        <>
          {mineSubmitted.length > 0 && (
            <div className="mb-5 rounded-lg border border-exam-line bg-exam-panel px-5 py-4">
              <p className="adm-t-md font-bold text-exam-text">
                내가 쓴 문항 {mineSubmitted.length}건은 이 목록에 없습니다
              </p>
              <p className={`${a.bodyText} mt-1`}>
                자기가 낸 문항을 자기가 승인하지 못하게 갈라 두었습니다. 다른 검수자에게 넘어갑니다.
              </p>
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-[20rem_1fr]">
            <section className={`${a.panel} overflow-hidden self-start`}>
              <h2 className="border-b border-exam-line px-5 py-4 adm-t-lg font-black text-exam-text">
                검수 대기 {queue.length}건
              </h2>
              {queue.length === 0 ? (
                <p className={`px-5 py-8 text-center ${a.bodyText}`}>
                  지금 검수할 문항이 없습니다.
                </p>
              ) : (
                <ul>
                  {queue.map((i) => (
                    <li key={i.id} className="border-b border-exam-line last:border-b-0">
                      <button
                        type="button"
                        onClick={() => setOpenId(i.id)}
                        aria-current={current?.id === i.id ? "true" : undefined}
                        className={`w-full px-4 py-3.5 text-left transition-colors ${
                          current?.id === i.id ? "bg-brand-50" : "hover:bg-exam-raised"
                        }`}
                      >
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="adm-t-md font-bold text-exam-text">{i.code}</span>
                          <Badge label={stateLabel[i.state]} className={stateTone[i.state]} />
                        </span>
                        <span className="mt-1 block adm-t-sm text-exam-muted">
                          {typeLabel(i.type)} · {i.subject} · {i.grade} · {i.authorName}
                        </span>
                        <span className="mt-0.5 block truncate adm-t-sm text-exam-muted">
                          {i.stem}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {current ? (
              <ReviewPanel key={current.id} item={current} reviewer={prefs.staffName} />
            ) : (
              <section className={`${a.panel} p-8 text-center`}>
                <p className={a.cardTitle}>검수할 문항이 없습니다</p>
                <p className={`${a.bodyText} mt-2`}>
                  출제자가 제출하면 여기에 쌓입니다.
                </p>
              </section>
            )}
          </div>
        </>
      )}
    </>
  );
}

function ReviewPanel({ item, reviewer }: { item: ItemDraft; reviewer: string }) {
  const [checked, setChecked] = useState<ReviewCheckId[]>([]);
  const [mode, setMode] = useState<"none" | "reject">("none");
  const [code, setCode] = useState<RejectCode | "">("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  /** 승인 소견 — 무엇을 보고 통과시켰는지 남긴다 */
  const [approveNote, setApproveNote] = useState("");
  /** 반려하지 않고 남기는 코멘트 */
  const [note, setNote] = useState("");

  const allChecked = reviewChecks.every((c) => checked.includes(c.id));
  const toggle = (id: ReviewCheckId) =>
    setChecked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const doReject = () => {
    if (!code) return setError("반려 사유를 골라 주세요.");
    if (text.trim().length < 10)
      return setError("무엇을 어떻게 고쳐야 하는지 한 문장 이상 적어 주세요.");
    rejectItem(item.id, reviewer, code, text.trim());
  };

  return (
    <section className={`${a.panel} p-5 sm:p-6`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-exam-line pb-4">
        <div>
          <h2 className={a.cardTitle}>{item.code}</h2>
          <p className="mt-1 adm-t-sm text-exam-muted">
            {typeLabel(item.type)} · {item.subject} · {item.grade} · {item.level} · 출제{" "}
            {item.authorName} · 제출 {item.updatedAt}
          </p>
        </div>
      </div>

      {/* ── 문항 본문 ── */}
      <div className="mt-5 rounded-lg border border-exam-line bg-exam-panel p-5">
        {item.passage && (
          <p className="mb-4 whitespace-pre-line adm-t-md leading-relaxed text-exam-text">
            {item.passage}
          </p>
        )}

        {/* 붙임 파일 — 원본 시험지나 지문 그림과 대조할 수 있어야 한다 */}
        {item.assets.length > 0 && (
          <ul className="mb-4 flex flex-wrap gap-2">
            {item.assets.map((f) =>
              f.kind === "image" && f.dataUrl ? (
                // 사람이 올린 자료라 빌드 시점에 알 수 없다
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={f.id}
                  src={f.dataUrl}
                  alt={f.name}
                  className="h-28 w-auto rounded border border-exam-line bg-white"
                />
              ) : (
                <span
                  key={f.id}
                  className="inline-flex items-center gap-2 rounded border border-exam-line bg-white px-3 py-2 adm-t-sm text-exam-text"
                >
                  {f.kind === "pdf" ? "PDF" : "엑셀·CSV"} · {f.name}
                </span>
              ),
            )}
          </ul>
        )}

        <p className="adm-t-md font-bold text-exam-text">{item.stem}</p>

        {item.type === "choice" && (
          <ol className="mt-3 space-y-1.5">
            {item.choices.map((c, i) => (
              <li key={i} className="flex items-baseline gap-2 adm-t-md text-exam-text">
                <span
                  className={`shrink-0 font-bold ${
                    i === item.answer ? "text-emerald-700" : "text-exam-muted"
                  }`}
                >
                  {i + 1}
                </span>
                <span>{c}</span>
                {i === item.answer && (
                  <span className="adm-t-sm font-bold text-emerald-700">정답</span>
                )}
              </li>
            ))}
          </ol>
        )}

        {item.type === "short" && (
          <p className="mt-3 adm-t-md text-exam-text">
            <span className="font-bold">허용 답안</span> — {item.shortAnswers}
          </p>
        )}

        {(item.type === "descriptive" || item.type === "essay") && (
          <div className="mt-3">
            <p className="adm-t-sm font-bold text-exam-text">채점 기준</p>
            <p className="mt-1 whitespace-pre-line adm-t-md leading-relaxed text-exam-text">
              {item.rubric}
            </p>
          </div>
        )}

        <p className="mt-4 border-t border-exam-line pt-3 adm-t-sm leading-relaxed text-exam-muted">
          해설 — {item.explain}
        </p>
        <p className="mt-2 adm-t-sm text-exam-muted">
          Tag A {item.tagA} · Tag B {item.tagB}
        </p>
      </div>

      {/* ── 3단 검수 ── */}
      <div className="mt-6">
        <h3 className={a.cardTitle}>검수 3단</h3>
        <p className={`${a.bodyText} mt-1.5`}>
          세 칸을 모두 확인해야 승인할 수 있습니다. 반려는 언제든 할 수 있습니다.
        </p>
        <ul className="mt-3 space-y-2">
          {reviewChecks.map((c) => {
            const on = checked.includes(c.id);
            return (
              <li key={c.id}>
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                    on ? "border-emerald-300 bg-emerald-50" : "border-exam-line bg-white"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(c.id)}
                    className="mt-0.5 h-5 w-5 shrink-0"
                  />
                  <span>
                    <span className="block adm-t-md font-bold text-exam-text">{c.label} 검수</span>
                    <span className="mt-0.5 block adm-t-sm leading-relaxed text-exam-muted">
                      {c.desc}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ── 결정 ── */}
      <div className="mt-6 border-t border-exam-line pt-5">
        {mode === "none" ? (
          <>
            <label className="block">
              <span className={a.label}>
                승인 소견 <span className="font-normal text-exam-muted">(선택)</span>
              </span>
              <textarea
                value={approveNote}
                onChange={(e) => setApproveNote(e.target.value)}
                rows={2}
                placeholder="무엇을 보고 통과시켰는지 적어 두면 나중에 같은 문항을 다시 볼 때 도움이 됩니다."
                className={`mt-2 ${a.input}`}
              />
            </label>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={!allChecked}
                onClick={() =>
                  approveItem(
                    item.id,
                    reviewer,
                    approveNote.trim() || "3단 검수를 모두 확인했습니다. 승인합니다.",
                  )
                }
                className={allChecked ? a.btnPrimary : a.btnDisabled}
              >
                승인하기
              </button>
              <button type="button" onClick={() => setMode("reject")} className={a.btnDanger}>
                반려하기
              </button>
              <span className={a.bodyText}>
                {allChecked
                  ? "승인하면 문항 은행에 올라가 검사지 조립 대상이 됩니다."
                  : "3단 검수를 모두 확인해야 승인할 수 있습니다."}
              </span>
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-rose-300 bg-rose-50 p-5">
            <h3 className="adm-t-lg font-black text-rose-900">반려</h3>
            <p className="mt-1.5 adm-t-sm leading-relaxed text-rose-900">
              사유와 코멘트가 출제자의 반려함으로 그대로 전달됩니다.
            </p>

            <fieldset className="mt-4">
              <legend className={a.label}>사유</legend>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                {rejectCodes.map((c) => (
                  <li key={c.id}>
                    <label
                      className={`flex cursor-pointer items-start gap-3 rounded-md border bg-white p-3.5 transition-colors ${
                        code === c.id ? "border-rose-500" : "border-exam-line"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`reject-${item.id}`}
                        checked={code === c.id}
                        onChange={() => {
                          setCode(c.id);
                          setError(null);
                        }}
                        className="mt-0.5 h-5 w-5 shrink-0"
                      />
                      <span>
                        <span className="block adm-t-sm font-bold text-exam-text">{c.label}</span>
                        <span className="mt-0.5 block adm-t-xs text-exam-muted">{c.desc}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>

            <label className="mt-4 block">
              <span className={a.label}>코멘트</span>
              <textarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setError(null);
                }}
                rows={3}
                placeholder="무엇이 문제이고 어떻게 고치면 되는지 적어 주세요."
                className={`mt-2 ${a.input}`}
              />
            </label>

            {error && (
              <p role="alert" className="mt-3 adm-t-sm font-bold text-rose-700">
                {error}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={doReject} className={a.btnDanger}>
                반려 보내기
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("none");
                  setError(null);
                }}
                className={a.btnGhost}
              >
                취소
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 코멘트 — 반려하지 않고도 말을 남긴다 ── */}
      <div className="mt-6 border-t border-exam-line pt-5">
        <h3 className={a.cardTitle}>코멘트</h3>
        <p className={`${a.bodyText} mt-1.5`}>
          반려까지는 아니지만 짚고 넘어갈 것을 적습니다. 상태는 바뀌지 않고 출제자에게 보입니다.
        </p>

        {item.comments.length > 0 && (
          <ul className="mt-3 space-y-3">
            {item.comments.map((c, i) => (
              <li
                key={i}
                className={`rounded-md px-4 py-3.5 ${
                  c.kind === "reject" ? "bg-rose-50" : "bg-exam-panel"
                }`}
              >
                <p className="adm-t-sm font-bold text-exam-text">
                  {c.by} · {c.at}
                  {c.kind === "reject" && c.code && (
                    <span className="ml-2 text-rose-700">반려 — {rejectLabel(c.code)}</span>
                  )}
                  {c.kind === "approve" && <span className="ml-2 text-emerald-700">승인</span>}
                  {c.kind === "note" && <span className="ml-2 text-exam-muted">코멘트</span>}
                </p>
                <p className="mt-1.5 adm-t-md leading-relaxed text-exam-muted">{c.text}</p>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4">
          <label className="block">
            <span className="sr-only">코멘트 내용</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="예: 보기 3번 표현이 학년에 비해 어렵습니다. 반려까지는 아니니 다음 회차에 다듬어 주세요."
              className={a.input}
            />
          </label>
          <button
            type="button"
            disabled={note.trim().length < 2}
            onClick={() => {
              addComment(item.id, reviewer, "reviewer", note.trim());
              setNote("");
            }}
            className={`mt-3 ${note.trim().length < 2 ? a.btnDisabled : a.btnGhost}`}
          >
            코멘트 남기기
          </button>
        </div>
      </div>
    </section>
  );
}
