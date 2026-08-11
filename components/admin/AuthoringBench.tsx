"use client";

import { useState } from "react";
import { useAdminPrefs } from "@/lib/adminStore";
import {
  addItem,
  itemReady,
  patchItem,
  rejectLabel,
  stateLabel,
  stateTone,
  submitItem,
  useItems,
  type ItemDraft,
  type ItemState,
} from "@/lib/itemStore";
import { useHydrated } from "@/lib/examStore";
import { PageHead, Badge } from "./Parts";
import * as a from "./ui";

/**
 * EXP-02 출제 워크벤치.
 *
 * 왼쪽에 내 문항, 오른쪽에 편집기를 둔다. 반려된 문항이 맨 위로 올라오고, 검수 코멘트가
 * 편집기 머리에 붙는다 — 무엇을 고쳐야 하는지 보지 않고 고칠 수는 없기 때문이다.
 *
 * 제출한 뒤에는 잠긴다(EXP-02-5). 검수 중에 원본이 바뀌면 검수자가 본 것과 승인된 것이
 * 달라진다. 반려되면 다시 열린다.
 *
 * 내 문항만 보인다. 남이 쓴 문항은 여기 없다.
 */

const tabs: { id: ItemState | "all"; label: string }[] = [
  { id: "rejected", label: "반려함" },
  { id: "draft", label: "작성 중" },
  { id: "submitted", label: "검수 대기" },
  { id: "approved", label: "승인됨" },
  { id: "all", label: "전체" },
];

export default function AuthoringBench() {
  const prefs = useAdminPrefs();
  const hydrated = useHydrated();
  const all = useItems();
  const [tab, setTab] = useState<ItemState | "all">("rejected");
  const [openId, setOpenId] = useState<string | null>(null);

  const mine = all.filter((i) => i.author === prefs.loginId);
  const shown = tab === "all" ? mine : mine.filter((i) => i.state === tab);
  const current = mine.find((i) => i.id === openId) ?? shown[0] ?? null;

  const countOf = (state: ItemState) => mine.filter((i) => i.state === state).length;

  return (
    <>
      <PageHead
        id="EXP-02"
        title="출제 워크벤치"
        lead="발주 사양에 맞춰 문항을 쓰고 제출합니다. 반려된 문항은 사유와 함께 여기로 돌아옵니다."
        action={
          <button
            type="button"
            onClick={() => {
              const item = addItem(prefs.loginId ?? "", prefs.staffName);
              setTab("draft");
              setOpenId(item.id);
            }}
            className={a.btnPrimary}
          >
            새 문항 만들기
          </button>
        }
      />

      {!hydrated ? (
        <p className={`${a.panel} p-8 text-center ${a.bodyText}`}>확인 중입니다…</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[20rem_1fr]">
          {/* ── 왼쪽: 내 문항 ── */}
          <section className={`${a.panel} overflow-hidden self-start`}>
            <div className="flex flex-wrap gap-1 border-b border-exam-line p-2">
              {tabs.map((t) => {
                const n = t.id === "all" ? mine.length : countOf(t.id as ItemState);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTab(t.id);
                      setOpenId(null);
                    }}
                    aria-current={tab === t.id ? "true" : undefined}
                    className={`min-h-[2.5rem] rounded-md px-3 adm-t-sm font-bold transition-colors ${
                      tab === t.id
                        ? "bg-brand-900 text-white"
                        : "text-exam-text hover:bg-exam-raised"
                    }`}
                  >
                    {t.label}
                    <span className="ml-1.5 tabular-nums">{n}</span>
                  </button>
                );
              })}
            </div>

            {shown.length === 0 ? (
              <p className={`px-5 py-8 text-center ${a.bodyText}`}>
                이 칸에 있는 문항이 없습니다.
              </p>
            ) : (
              <ul>
                {shown.map((i) => (
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
                        <span className="adm-t-md font-bold text-exam-text">
                          {i.code || "코드 없음"}
                        </span>
                        <Badge label={stateLabel[i.state]} className={stateTone[i.state]} />
                      </span>
                      <span className="mt-1 block adm-t-sm text-exam-muted">
                        {i.subject} · {i.grade} · {i.level}
                      </span>
                      <span className="mt-0.5 block truncate adm-t-sm text-exam-muted">
                        {i.stem || "발문을 아직 쓰지 않았습니다"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ── 오른쪽: 편집기 ── */}
          {current ? (
            <Editor key={current.id} item={current} />
          ) : (
            <section className={`${a.panel} p-8 text-center`}>
              <p className={a.cardTitle}>왼쪽에서 문항을 고르세요</p>
              <p className={`${a.bodyText} mt-2`}>
                또는 오른쪽 위 「새 문항 만들기」로 새로 시작하실 수 있습니다.
              </p>
            </section>
          )}
        </div>
      )}
    </>
  );
}

function Editor({ item }: { item: ItemDraft }) {
  const locked = item.state === "submitted" || item.state === "approved";
  const ready = itemReady(item);
  const set = (patch: Partial<ItemDraft>) => patchItem(item.id, patch);
  const lastReject = [...item.comments].reverse().find((c) => c.code);

  return (
    <section className={`${a.panel} p-5 sm:p-6`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-exam-line pb-4">
        <div>
          <h2 className={a.cardTitle}>{item.code || "새 문항"}</h2>
          <p className="mt-1 adm-t-sm text-exam-muted">
            {item.id} · 마지막 수정 {item.updatedAt}
          </p>
        </div>
        <Badge label={stateLabel[item.state]} className={stateTone[item.state]} />
      </div>

      {/* 반려 사유는 편집기 맨 위에 붙인다 — 보지 않고 고칠 수는 없다 */}
      {item.state === "rejected" && lastReject && (
        <div className="mt-5 rounded-lg border border-rose-300 bg-rose-50 p-5">
          <p className="adm-t-md font-black text-rose-900">
            반려 — {rejectLabel(lastReject.code!)}
          </p>
          <p className="mt-2 adm-t-md leading-relaxed text-rose-900">{lastReject.text}</p>
          <p className="mt-2 adm-t-sm text-rose-800">
            {lastReject.by} · {lastReject.at}
          </p>
        </div>
      )}

      {locked && (
        <div className="mt-5 rounded-lg border border-exam-line bg-exam-panel p-5">
          <p className="adm-t-md font-bold text-exam-text">
            {item.state === "submitted" ? "검수 중이라 고칠 수 없습니다" : "승인된 문항입니다"}
          </p>
          <p className={`${a.bodyText} mt-1.5`}>
            {item.state === "submitted"
              ? "검수자가 본 것과 승인되는 것이 달라지지 않게 잠가 둡니다. 반려되면 다시 열립니다."
              : "문항 은행에 올라가 검사지 조립 대상이 되었습니다."}
          </p>
        </div>
      )}

      <fieldset disabled={locked} className="mt-5 grid gap-5 disabled:opacity-60">
        <div className="grid gap-4 sm:grid-cols-4">
          <label className="block">
            <span className={a.label}>문항 코드</span>
            <input
              value={item.code}
              onChange={(e) => set({ code: e.target.value })}
              placeholder="KOR-3-015"
              className={`mt-2 ${a.input}`}
            />
          </label>
          <label className="block">
            <span className={a.label}>과목</span>
            <select
              value={item.subject}
              onChange={(e) => set({ subject: e.target.value as ItemDraft["subject"] })}
              className={`mt-2 ${a.select}`}
            >
              {["국어", "수학", "과학"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={a.label}>학년</span>
            <select
              value={item.grade}
              onChange={(e) => set({ grade: e.target.value })}
              className={`mt-2 ${a.select}`}
            >
              {["초등 3학년", "초등 4학년", "초등 5학년", "초등 6학년"].map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={a.label}>S위계</span>
            <select
              value={item.level}
              onChange={(e) => set({ level: e.target.value as ItemDraft["level"] })}
              className={`mt-2 ${a.select}`}
            >
              <option value="S1">S1 지각</option>
              <option value="S2">S2 이해</option>
              <option value="S3">S3 생성</option>
              <option value="S4">S4 창의</option>
            </select>
          </label>
        </div>

        <label className="block">
          <span className={a.label}>
            지문·자료 <span className="font-normal text-exam-muted">(없으면 비워 둡니다)</span>
          </span>
          <textarea
            value={item.passage}
            onChange={(e) => set({ passage: e.target.value })}
            rows={3}
            className={`mt-2 ${a.input}`}
          />
        </label>

        <label className="block">
          <span className={a.label}>발문</span>
          <textarea
            value={item.stem}
            onChange={(e) => set({ stem: e.target.value })}
            rows={2}
            placeholder="무엇을 묻는지 한 문장으로 씁니다."
            className={`mt-2 ${a.input}`}
          />
        </label>

        <div>
          <span className={a.label}>보기와 정답</span>
          <p className="mt-1 adm-t-sm text-exam-muted">
            왼쪽 동그라미가 정답입니다. 정답은 하나만 고를 수 있습니다.
          </p>
          <ul className="mt-2 space-y-2">
            {item.choices.map((c, idx) => (
              <li key={idx} className="flex items-center gap-3">
                <label className="flex shrink-0 items-center gap-2">
                  <input
                    type="radio"
                    name={`answer-${item.id}`}
                    checked={item.answer === idx}
                    onChange={() => set({ answer: idx })}
                    className="h-5 w-5"
                  />
                  <span className="adm-t-sm font-bold text-exam-text">{idx + 1}</span>
                  <span className="sr-only">{idx + 1}번을 정답으로</span>
                </label>
                <input
                  value={c}
                  onChange={(e) =>
                    set({ choices: item.choices.map((x, j) => (j === idx ? e.target.value : x)) })
                  }
                  className={a.input}
                />
              </li>
            ))}
          </ul>
        </div>

        <label className="block">
          <span className={a.label}>해설</span>
          <textarea
            value={item.explain}
            onChange={(e) => set({ explain: e.target.value })}
            rows={2}
            placeholder="왜 그 보기가 정답인지 적습니다."
            className={`mt-2 ${a.input}`}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={a.label}>Tag A — 학력 내용축</span>
            <input
              value={item.tagA}
              onChange={(e) => set({ tagA: e.target.value })}
              placeholder="읽기 — 추론"
              className={`mt-2 ${a.input}`}
            />
          </label>
          <label className="block">
            <span className={a.label}>Tag B — 재능·인지과정축</span>
            <input
              value={item.tagB}
              onChange={(e) => set({ tagB: e.target.value })}
              placeholder="언어 — 범주화"
              className={`mt-2 ${a.input}`}
            />
          </label>
        </div>
        <p className="rounded-md bg-exam-panel px-4 py-3 adm-t-sm leading-relaxed text-exam-muted">
          두 축은 따로 붙입니다. 같은 문항이 학력에서는 「읽기 추론」이고 재능에서는 「언어
          범주화」일 수 있습니다. 검수 2차에서 이 태깅을 교차 검증합니다.
        </p>
      </fieldset>

      {!locked && (
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-exam-line pt-5">
          <button
            type="button"
            disabled={!ready}
            onClick={() => submitItem(item.id)}
            className={ready ? a.btnPrimary : a.btnDisabled}
          >
            검수에 제출하기
          </button>
          <span className={a.bodyText}>
            {ready
              ? "제출하면 검수자에게 넘어가고, 그동안은 고칠 수 없습니다."
              : "코드·발문·보기 4개·해설·태그 두 축을 모두 채워야 제출할 수 있습니다."}
          </span>
        </div>
      )}

      {item.comments.length > 0 && (
        <div className="mt-6 border-t border-exam-line pt-5">
          <h3 className={a.cardTitle}>검수 이력</h3>
          <ul className="mt-3 space-y-3">
            {item.comments.map((c, i) => (
              <li key={i} className="rounded-md bg-exam-panel px-4 py-3.5">
                <p className="adm-t-sm font-bold text-exam-text">
                  {c.by} · {c.at}
                  {c.code && (
                    <span className="ml-2 text-rose-700">반려 — {rejectLabel(c.code)}</span>
                  )}
                </p>
                <p className="mt-1.5 adm-t-md leading-relaxed text-exam-muted">{c.text}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
