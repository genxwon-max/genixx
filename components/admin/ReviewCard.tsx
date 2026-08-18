"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAdminPrefs } from "@/lib/adminStore";
import { useHydrated } from "@/lib/examStore";
import {
  addComment,
  approveItem,
  blankChecks,
  checkReasons,
  clearReviewDraft,
  daysWaiting,
  reasonText,
  rejectCodes,
  rejectLabel,
  rejectItem,
  reviewChecks,
  saveReviewDraft,
  stateLabel,
  stateTone,
  typeLabel,
  useItems,
  type ItemDraft,
  type RejectCode,
  type ReviewCheckId,
  type ReviewCheckResult,
  type ReviewRecord,
} from "@/lib/itemStore";
import { levelSpecs, talents } from "@/lib/blueprint";
import { PageHead, Badge, Callout } from "./Parts";
import AssetView from "./AssetView";
import CommentList from "./CommentList";
import * as a from "./ui";

/**
 * EXP-03-1 검수 화면 — 문항 하나를 놓고 결론을 내는 자리.
 *
 * 3단(내용·태깅·윤리)을 칸마다 「통과 / 걸림」으로 짚고 소견을 적는다. 예전에는
 * 체크상자 셋을 켰는지만 보고 승인 버튼을 열어 주었는데, 무엇을 보고 통과시켰는지가
 * 아무 데도 남지 않아 반려된 문항이 다시 올라왔을 때 처음부터 다시 읽어야 했다.
 *
 * 한 칸이라도 「걸림」이면 승인 버튼이 잠긴다. 걸린 것을 알면서 통과시키는 길을
 * 열어 두면 3단 검수는 형식이 된다. 대신 반려는 언제든 할 수 있다.
 *
 * 쓰던 검수는 임시저장된다. 문항 하나에 몇 분씩 걸리고 중간에 다른 것을 열어 볼
 * 일이 생기는데, 돌아왔을 때 비어 있으면 지문부터 다시 읽어야 한다.
 */
export default function ReviewCard({ id }: { id: string }) {
  const prefs = useAdminPrefs();
  const hydrated = useHydrated();
  const items = useItems();
  const item = items.find((i) => i.id === id);

  if (!hydrated) {
    return <p className="py-16 text-center adm-t-sm text-exam-muted">확인 중입니다…</p>;
  }

  if (!item) {
    return (
      <Gate title="문항을 찾을 수 없습니다">
        주소가 잘못되었거나 삭제된 문항입니다. 목록에서 다시 골라 주세요.
      </Gate>
    );
  }

  /* 자기가 쓴 문항은 자기가 못 본다. 목록에서 감추는 것만으로는 부족하다 —
     주소를 직접 치면 열리는 문을 남겨 두면 갈라 둔 의미가 없다. */
  if (item.author === prefs.loginId) {
    return (
      <Gate title="내가 쓴 문항은 검수할 수 없습니다">
        {item.code || item.id}은(는) 본인이 출제한 문항입니다. 출제자와 검수자를 갈라 두었기 때문에
        다른 검수자에게 넘어갑니다.
      </Gate>
    );
  }

  return <Panel key={item.id} item={item} reviewer={prefs.staffName || "검수자"} />;
}

function Gate({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <BackLink />
      <section className={`${a.panel} p-8 text-center`}>
        <p className={a.cardTitle}>{title}</p>
        <p className={`${a.bodyText} mx-auto mt-2 max-w-xl leading-relaxed`}>{children}</p>
        <Link href="/admin/review" className={`${a.btnGhost} mt-5`}>
          검수 대기 목록으로
        </Link>
      </section>
    </>
  );
}

function BackLink() {
  return (
    <Link
      href="/admin/review"
      className="mb-4 inline-flex items-center gap-1.5 adm-t-sm font-bold text-brand-700 hover:underline"
    >
      ← 검수 워크벤치
    </Link>
  );
}

/* ───────────────────────── 검수판 ───────────────────────── */

function Panel({ item, reviewer }: { item: ItemDraft; reviewer: string }) {
  const router = useRouter();
  const done = item.state !== "submitted";

  /* 쓰다 만 것이 있으면 이어서 쓴다 */
  const [checks, setChecks] = useState<ReviewCheckResult[]>(
    item.reviewDraft?.checks ?? blankChecks(),
  );
  const [mode, setMode] = useState<"none" | "reject">(item.reviewDraft?.code ? "reject" : "none");
  const [code, setCode] = useState<RejectCode | "">(item.reviewDraft?.code ?? "");
  const [text, setText] = useState(item.reviewDraft?.text ?? "");
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState<string | null>(item.reviewDraft?.updatedAt ?? null);

  const unseen = checks.filter((c) => c.ok === null).length;
  const blocked = checks.filter((c) => c.ok === false).length;
  const canApprove = unseen === 0 && blocked === 0;

  /** 체크나 소견이 바뀔 때마다 문항에 붙여 둔다 */
  const keep = (next: { checks?: ReviewCheckResult[]; code?: RejectCode | ""; text?: string }) => {
    const draft = {
      by: reviewer,
      checks: next.checks ?? checks,
      code: (next.code ?? code) || undefined,
      text: next.text ?? text,
    };
    saveReviewDraft(item.id, draft);
    setSaved("방금");
  };

  const setCheck = (cid: ReviewCheckId, patch: Partial<ReviewCheckResult>) => {
    const next = checks.map((c) => {
      if (c.id !== cid) return c;
      /* 통과↔걸림을 바꾸면 고른 소견을 버린다. 두 목록이 다른 말을 담고 있어서,
         남겨 두면 「통과 3번」이 소리 없이 「걸림 3번」이 된다. */
      const flipped = patch.ok !== undefined && patch.ok !== c.ok;
      const reason = flipped ? undefined : "reason" in patch ? patch.reason : c.reason;
      return { ...c, ...patch, reason };
    });
    setChecks(next);
    keep({ checks: next });
  };

  const doApprove = () => {
    if (!canApprove) return;
    approveItem(
      item.id,
      reviewer,
      text.trim() || "3단 검수를 모두 통과했습니다. 승인합니다.",
      checks,
    );
    router.push("/admin/review");
  };

  const doReject = () => {
    /* 「걸림」은 그대로 출제자에게 돌아간다. 무엇이 걸렸는지 없이 돌려보내면
       출제자는 문항을 처음부터 다시 읽으며 무엇이 문제인지 추측해야 한다.
       고른 소견 하나면 충분하므로, 서술까지 요구하지는 않는다. */
    const unsaid = checks.filter((c) => c.ok === false && !c.reason && !c.note.trim());
    if (unsaid.length > 0) {
      const names = unsaid
        .map((c) => reviewChecks.find((x) => x.id === c.id)?.label)
        .filter(Boolean)
        .join(" · ");
      return setError(`${names} — 「걸림」으로 두었는데 무엇이 걸리는지가 없습니다.`);
    }
    if (!code) return setError("반려 사유를 골라 주세요.");
    if (text.trim().length < 10)
      return setError("무엇을 어떻게 고쳐야 하는지 한 문장 이상 적어 주세요.");
    rejectItem(item.id, reviewer, code, text.trim(), checks);
    router.push("/admin/review");
  };

  return (
    <>
      <BackLink />

      <PageHead
        id="EXP-03-1"
        title={item.code || item.id}
        lead={`${typeLabel(item.type)} · ${item.subject} · ${item.grade} · ${item.level} ${levelSpecs[item.level].name} · 출제 ${item.authorName}`}
        action={<Badge label={stateLabel[item.state]} className={stateTone[item.state]} />}
      />

      {done ? (
        <div className="mb-5">
          <Callout tone={item.state === "approved" ? "good" : "warn"}>
            이 문항은 이미 {item.state === "approved" ? "승인" : "반려"}되어 검수가 끝났습니다.
            아래는 기록이며 다시 결론을 낼 수는 없습니다.
          </Callout>
        </div>
      ) : null}

      {/* AI가 낸 초안이면 검수자가 먼저 알아야 한다 — 어디를 볼지가 달라진다 */}
      {item.origin === "ai" && (
        <div className="mb-5">
          <Callout title="AI가 출제한 문항입니다">
            AI가 낸 문항을 출제자가 확인·수정해 제출했습니다. 형식과 태깅이 명세대로 맞아떨어지는
            것과 이 학년 아이가 읽을 수 있는 것은 다른 문제입니다. 태깅이 문항이 실제로 재는 것과
            맞는지, 학년 이독성과 편향은 어떤지를 특히 보아 주세요.
            {item.aiBrief && (
              <span className="mt-1.5 block">
                <b className="font-bold">출제 지시</b> — {item.aiBrief}
              </span>
            )}
          </Callout>
        </div>
      )}

      {!done && (
        <div className="mb-5">
          <Callout tone={daysWaiting(item) >= 5 ? "warn" : "info"}>
            {item.updatedAt}에 제출되어 {daysWaiting(item)}일째 기다리고 있습니다.
            {item.reviews.length > 0 && ` 앞서 ${item.reviews.length}번 검수를 거친 문항입니다.`}
          </Callout>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_25rem] xl:items-start">
        {/* ── 왼쪽: 읽는 면 ── */}
        <div className="space-y-5">
          <ItemBody item={item} />
          {item.reviews.length > 0 && <History reviews={item.reviews} />}
        </div>

        {/* ── 오른쪽: 쓰는 면 ──
            읽는 면과 쓰는 면을 갈라 둔다. 세로로 이으면 지문을 확인하려고 스크롤을
            올리는 순간 방금 적던 소견이 화면 밖으로 나간다. */}
        <div className="space-y-5 xl:sticky xl:top-[5.5rem]">
          {!done && (
            <section className={`${a.panel} p-5`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className={a.cardTitle}>검수 3단</h2>
                {saved && <span className="adm-t-xs text-exam-muted">임시저장 {saved}</span>}
              </div>
              <p className={`${a.bodyText} mt-1.5 leading-relaxed`}>
                칸마다 통과 여부를 짚습니다. 하나라도 「걸림」이면 승인할 수 없습니다.
              </p>

              {/* AI가 먼저 훑은 것이 있으면 3단 위에 붙인다. 옮겨 담는 것은 사람이
                  누른다 — 자동으로 채워 두면 읽지 않고 넘어가게 된다. */}
              {item.aiAudit && (
                <div className="mt-4 border-l-4 border-violet-500 pl-4">
                  <p className="adm-t-md font-bold text-violet-800">
                    AI가 짚은 것 · {item.aiAudit.at}
                  </p>
                  {item.aiAudit.blocks + item.aiAudit.warns === 0 ? (
                    <p className={`${a.bodyText} mt-1.5`}>
                      규칙으로 볼 수 있는 것에서는 걸린 것이 없습니다. 교과 내용과 학년 이독성은
                      기계가 알 수 없으니 직접 보아 주세요.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1.5">
                      {item.aiAudit.checks.flatMap((c) =>
                        c.notes.map((n, k) => (
                          <li key={`${c.id}-${k}`} className="adm-t-sm text-exam-text">
                            <b className="font-bold">
                              {reviewChecks.find((x) => x.id === c.id)?.label}
                            </b>{" "}
                            — {n}
                          </li>
                        )),
                      )}
                    </ul>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      /* 「걸림」만 옮긴다. 통과는 옮기지 않는다 —
                         규칙 대조에서 안 걸렸다는 것과 이 문항이 괜찮다는 것은
                         다른 말이다. 특히 윤리·편향은 낱말로 잡는 것이라, 안 걸린
                         것을 통과로 찍어 두면 사람이 보지 않고 넘어가게 된다. */
                      const next = checks.map((c) => {
                        const found = item.aiAudit?.checks.find((x) => x.id === c.id);
                        if (!found || found.notes.length === 0) return c;
                        const ok = found.ok ? c.ok : false;
                        return {
                          ...c,
                          ok,
                          /* 통과였다가 걸림으로 뒤집히면 「무엇을 보고 통과시켰나」로
                             골라 둔 것은 더 이상 맞는 말이 아니다 */
                          reason: ok === c.ok ? c.reason : undefined,
                          note: [c.note, ...found.notes].filter(Boolean).join("\n"),
                        };
                      });
                      setChecks(next);
                      keep({ checks: next });
                    }}
                    className={`${a.btnGhost} mt-3`}
                  >
                    아래 3단에 옮겨 담기
                  </button>
                </div>
              )}

              <ul className="mt-4 space-y-4">
                {reviewChecks.map((c, i) => {
                  const r = checks.find((x) => x.id === c.id)!;
                  return (
                    <li
                      key={c.id}
                      className="border-t border-exam-line pt-4 first:border-t-0 first:pt-0"
                    >
                      <p className="adm-t-md font-bold text-exam-text">
                        {i + 1}. {c.label}
                      </p>
                      <p className="mt-1 adm-t-md leading-relaxed text-exam-muted">{c.desc}</p>

                      <div className="mt-2.5 flex gap-2">
                        <Choice
                          on={r.ok === true}
                          tone="ok"
                          onClick={() => setCheck(c.id, { ok: true })}
                          name={`chk-${c.id}`}
                        >
                          통과
                        </Choice>
                        <Choice
                          on={r.ok === false}
                          tone="no"
                          onClick={() => setCheck(c.id, { ok: false })}
                          name={`chk-${c.id}`}
                        >
                          걸림
                        </Choice>
                      </div>

                      {/* 자주 나오는 소견은 골라서 끝낸다. 서술은 그 아래 선택으로
                          둔다 — 고를 것이 없거나 더 적을 것이 있을 때 쓴다. */}
                      {r.ok !== null && (
                        <ReasonPicker
                          check={c.id}
                          ok={r.ok}
                          picked={r.reason}
                          onPick={(reason) => setCheck(c.id, { reason })}
                        />
                      )}

                      <label className="mt-2.5 block">
                        <span className="sr-only">{c.label} 소견 서술</span>
                        <textarea
                          value={r.note}
                          onChange={(e) => setCheck(c.id, { note: e.target.value })}
                          rows={2}
                          placeholder={
                            r.ok === false
                              ? "고른 것 말고 더 적을 것이 있으면 (선택)"
                              : "덧붙일 것이 있으면 (선택)"
                          }
                          className={a.input}
                        />
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {!done && (
            <section className={`${a.panel} p-5`}>
              <h2 className={a.cardTitle}>결론</h2>

              {mode === "none" ? (
                <>
                  <label className="mt-3 block">
                    <span className={a.label}>
                      승인 소견 <span className="font-normal text-exam-muted">(선택)</span>
                    </span>
                    <textarea
                      value={text}
                      onChange={(e) => {
                        setText(e.target.value);
                        keep({ text: e.target.value });
                      }}
                      rows={3}
                      placeholder="전체 소견을 적어 두면 나중에 같은 문항을 다시 볼 때 도움이 됩니다."
                      className={`mt-2 ${a.input}`}
                    />
                  </label>

                  <p className={`${a.bodyText} mt-3 leading-relaxed`}>
                    {canApprove
                      ? "3단을 모두 통과로 두었습니다. 승인하면 문항 은행에 올라가 검사지 조립 대상이 됩니다."
                      : blocked > 0
                        ? `「걸림」으로 둔 칸이 ${blocked}개 있습니다. 통과로 바꾸거나 반려해 주세요.`
                        : `아직 짚지 않은 칸이 ${unseen}개 있습니다. 훑어보고 넘기는 검수를 막기 위해 세 칸을 다 짚어야 승인이 열립니다.`}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={!canApprove}
                      onClick={doApprove}
                      className={canApprove ? a.btnPrimary : a.btnDisabled}
                    >
                      승인하기
                    </button>
                    <button type="button" onClick={() => setMode("reject")} className={a.btnDanger}>
                      반려하기
                    </button>
                  </div>
                </>
              ) : (
                <div className="mt-3 border-l-4 border-rose-500 pl-4">
                  <p className="adm-t-md font-bold text-rose-700">반려</p>
                  <p className={`${a.bodyText} mt-1.5 leading-relaxed`}>
                    사유와 코멘트가 출제자의 반려함으로 그대로 전달됩니다.
                  </p>

                  <fieldset className="mt-4">
                    <legend className={a.label}>사유</legend>
                    <ul className="mt-2 space-y-2">
                      {rejectCodes.map((c) => (
                        <li key={c.id}>
                          <label
                            className={`flex cursor-pointer items-start gap-3 rounded-md border p-3.5 transition-colors ${
                              code === c.id
                                ? "border-rose-500"
                                : "border-exam-line hover:bg-exam-raised"
                            }`}
                          >
                            <input
                              type="radio"
                              name={`reject-${item.id}`}
                              checked={code === c.id}
                              onChange={() => {
                                setCode(c.id);
                                setError(null);
                                keep({ code: c.id });
                              }}
                              className="mt-0.5 h-5 w-5 shrink-0"
                            />
                            <span>
                              <span className="block adm-t-sm font-bold text-exam-text">
                                {c.label}
                              </span>
                              <span className="mt-0.5 block adm-t-xs text-exam-muted">
                                {c.desc}
                              </span>
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
                        keep({ text: e.target.value });
                      }}
                      rows={4}
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

              {item.reviewDraft && (
                <button
                  type="button"
                  onClick={() => {
                    clearReviewDraft(item.id);
                    setChecks(blankChecks());
                    setCode("");
                    setText("");
                    setMode("none");
                    setSaved(null);
                  }}
                  className={`${a.btnGhost} mt-4`}
                >
                  쓰던 검수 지우기
                </button>
              )}
            </section>
          )}

          {/* 반려까지는 아닌데 짚고 넘어갈 것 */}
          <section className={`${a.panel} p-5`}>
            <h2 className={a.cardTitle}>코멘트</h2>
            <p className={`${a.bodyText} mt-1.5 leading-relaxed`}>
              상태는 바뀌지 않고 출제자에게 보입니다.
            </p>

            <CommentList comments={item.comments} />

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
          </section>
        </div>
      </div>
    </>
  );
}

/* ───────────────────────── 조각 ───────────────────────── */

/**
 * 자주 나오는 소견 여섯 가지 — 번호로 고른다.
 *
 * 통과와 걸림에서 목록이 갈린다. 하나만 고르게 두는 것은 「가장 큰 이유」를
 * 대게 하려는 것이고, 그 밖은 아래 서술 칸에 적는다. 잘못 골랐을 때 되돌릴
 * 자리가 없으면 라디오는 한 번 켜면 끌 수 없으므로 지우는 버튼을 함께 둔다.
 */
function ReasonPicker({
  check,
  ok,
  picked,
  onPick,
}: {
  check: ReviewCheckId;
  ok: boolean;
  picked?: string;
  onPick: (reason: string | undefined) => void;
}) {
  const list = ok ? checkReasons[check].pass : checkReasons[check].block;
  const active = ok
    ? "border-emerald-600 bg-emerald-50 text-emerald-900"
    : "border-rose-500 bg-rose-50 text-rose-900";

  return (
    <fieldset className="mt-3">
      <legend className="adm-t-xs font-bold text-exam-muted">
        {ok ? "무엇을 보고 통과시켰습니까" : "무엇이 걸립니까"}
        <span className="font-normal"> · 하나 고르기</span>
      </legend>

      <ul className="mt-1.5 space-y-1">
        {list.map((r, n) => (
          <li key={r.id}>
            <label
              className={`flex cursor-pointer items-start gap-2 rounded-md border px-2.5 py-2 adm-t-sm leading-snug transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-brand-700 ${
                picked === r.id
                  ? active
                  : "border-exam-line text-exam-text hover:bg-exam-raised"
              }`}
            >
              <input
                type="radio"
                name={`reason-${check}`}
                checked={picked === r.id}
                onChange={() => onPick(r.id)}
                className="sr-only"
              />
              <span className="w-3.5 shrink-0 text-center font-bold tabular-nums">{n + 1}</span>
              <span>{r.text}</span>
            </label>
          </li>
        ))}
      </ul>

      {picked && (
        <button
          type="button"
          onClick={() => onPick(undefined)}
          className="mt-1.5 adm-t-xs font-bold text-exam-muted underline hover:text-exam-text"
        >
          고른 것 지우기
        </button>
      )}
    </fieldset>
  );
}

/** 통과 / 걸림 — 색만으로 가르지 않고 글자를 본체로 둔다 */
function Choice({
  on,
  tone,
  onClick,
  name,
  children,
}: {
  on: boolean;
  tone: "ok" | "no";
  onClick: () => void;
  name: string;
  children: React.ReactNode;
}) {
  const active =
    tone === "ok"
      ? "border-emerald-600 bg-emerald-50 text-emerald-800"
      : "border-rose-500 bg-rose-50 text-rose-800";

  return (
    <label
      className={`flex min-h-[2.75rem] flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 adm-t-sm font-bold transition-colors ${
        on ? active : "border-exam-line bg-white text-exam-muted hover:bg-exam-raised"
      }`}
    >
      <input type="radio" name={name} checked={on} onChange={onClick} className="h-4 w-4" />
      {children}
    </label>
  );
}

/** 지난 검수 — 재검수라면 이걸 먼저 읽어야 한다 */
function History({ reviews }: { reviews: ReviewRecord[] }) {
  return (
    <section className={`${a.panel} p-5`}>
      <h2 className={a.cardTitle}>지난 검수 {reviews.length}회</h2>
      <ul className="mt-3 border-t border-exam-line">
        {reviews.map((r) => (
          <li key={`${r.round}-${r.at}`} className="border-b border-exam-line py-4">
            <p className="adm-t-sm font-bold text-exam-text">
              {r.round}회차 · {r.by} · {r.at}
              <span
                className={`ml-2 ${r.verdict === "approve" ? "text-emerald-700" : "text-rose-700"}`}
              >
                {r.verdict === "approve"
                  ? "승인"
                  : `반려 — ${r.code ? rejectLabel(r.code) : "사유 없음"}`}
              </span>
            </p>
            <p className="mt-1.5 adm-t-md leading-relaxed text-exam-muted">{r.text}</p>

            <ul className="mt-2.5 space-y-1">
              {r.checks.map((c) => {
                const spec = reviewChecks.find((x) => x.id === c.id);
                const picked = reasonText(c.id, c.ok, c.reason);
                return (
                  <li key={c.id} className="adm-t-sm text-exam-muted">
                    <span
                      className={`font-bold ${
                        c.ok === true
                          ? "text-emerald-700"
                          : c.ok === false
                            ? "text-rose-700"
                            : "text-exam-muted"
                      }`}
                    >
                      {spec?.label}{" "}
                      {c.ok === true ? "통과" : c.ok === false ? "걸림" : "확인 안 함"}
                    </span>
                    {picked && <span> — {picked}</span>}
                    {c.note && <span className="whitespace-pre-line"> — {c.note}</span>}
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** 문항 본문 — 읽는 면이라 색을 깔지 않는다. 테두리로만 묶는다. */
function ItemBody({ item }: { item: ItemDraft }) {
  const talent = talents.find((t) => t.id === item.talent);

  return (
    <section className={`${a.panel} p-5 sm:p-6`}>
      <h2 className={a.cardTitle}>문항</h2>

      {item.passage && (
        <p className="mt-4 whitespace-pre-line adm-t-md leading-relaxed text-exam-text">
          {item.passage}
        </p>
      )}

      {/* 붙임 파일 — 그림이 문항의 일부이면 발문과 같은 무게로 봐야 검수가 된다.
          눌러서 원본 크기로 열 수 있다. */}
      {item.assets.length > 0 && (
        <div className="mt-4 border-t border-exam-line pt-3">
          <p className="adm-t-sm font-bold text-exam-text">
            붙임 파일 {item.assets.length}건{" "}
            <span className="font-normal text-exam-muted">— 눌러서 크게 볼 수 있습니다</span>
          </p>
          <AssetView assets={item.assets} />
        </div>
      )}

      <p className="mt-4 adm-t-md font-bold text-exam-text">
        {item.stem || "발문을 아직 쓰지 않았습니다."}
      </p>

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
              <span>{c || <span className="text-exam-muted">보기를 쓰지 않았습니다</span>}</span>
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

      <p className="mt-4 border-t border-exam-line pt-3 adm-t-md leading-relaxed text-exam-muted">
        해설 — {item.explain || "해설을 쓰지 않았습니다."}
      </p>

      {/* 태깅은 2차 검수 대상이라 값을 그대로 펼쳐 둔다 */}
      <dl className="mt-4 grid gap-x-6 gap-y-2 border-t border-exam-line pt-3 sm:grid-cols-2">
        {[
          ["단원", item.unit || "미정"],
          ["성취기준", item.standardCode || "없음"],
          ["Tag A", item.tagA || "없음"],
          ["Tag B", item.tagB || "없음"],
          ["재능 축", `${talent?.name ?? "미정"} · ${item.subskill}`],
          ["배점 · b모수", `${item.points}점 · ${item.b}`],
        ].map(([k, v]) => (
          <div key={k} className="flex gap-3">
            <dt className="w-[5.5rem] shrink-0 adm-t-sm text-exam-muted">{k}</dt>
            <dd className="min-w-0 adm-t-sm font-bold text-exam-text">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
