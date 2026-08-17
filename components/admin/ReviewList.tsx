"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAdminPrefs } from "@/lib/adminStore";
import { useHydrated } from "@/lib/examStore";
import { daysWaiting, typeLabel, useItems, type ItemDraft } from "@/lib/itemStore";
import { LEVELS, levelSpecs } from "@/lib/blueprint";
import DataList, { Picker, type Column } from "./DataList";
import { PageHead, Callout } from "./Parts";
import * as a from "./ui";

/**
 * EXP-03 검수 워크벤치 — 검수 대기 목록.
 *
 * 원래는 한 화면 안에서 왼쪽 목록·오른쪽 검수판으로 갈라 두었다. 문항이 열 몇 개일
 * 때는 괜찮았는데, 오른쪽 검수판이 지문·보기·3단 검수·반려 사유까지 세로로 길어서
 * 목록을 보려면 매번 맨 위로 올라와야 했다. 출제 워크벤치와 같이 목록과 상세를
 * 갈라 라우트를 나눈다 — 같은 존의 두 화면이 같은 방식으로 움직여야 한다.
 *
 * 자기가 쓴 문항은 목록에 뜨지 않는다. 출제자와 검수자를 갈라 둔 이유가 여기서
 * 실제로 작동해야 한다(정의서 9장).
 */

/** 오래 기다린 것이 위로 온다 — 검수 대기는 선입선출이 원칙이다 */
const byWaiting = (x: ItemDraft, y: ItemDraft) => x.updatedAt.localeCompare(y.updatedAt);

const subjectOptions = ["국어", "수학", "과학"].map((v) => ({ value: v, label: v }));
const levelOptions = LEVELS.map((l) => ({ value: l, label: `${l} ${levelSpecs[l].name}` }));
const roundOptions = [
  { value: "first", label: "첫 검수" },
  { value: "again", label: "재검수 (반려 이력 있음)" },
];

type Tab = "queue" | "mine";

export default function ReviewList() {
  const prefs = useAdminPrefs();
  const hydrated = useHydrated();
  const all = useItems();

  const [tab, setTab] = useState<Tab>("queue");
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState("all");
  const [level, setLevel] = useState("all");
  const [round, setRound] = useState("all");

  /** 검수 대상 = 제출된 것 중 내가 쓰지 않은 것 */
  const queue = useMemo(
    () => all.filter((i) => i.state === "submitted" && i.author !== prefs.loginId).sort(byWaiting),
    [all, prefs.loginId],
  );

  /** 내가 결론을 낸 문항 — 「이거 내가 봤던가」를 확인하는 자리 */
  const mine = useMemo(
    () =>
      all
        .filter((i) => i.reviews.some((r) => r.by === prefs.staffName))
        .sort((x, y) => y.updatedAt.localeCompare(x.updatedAt)),
    [all, prefs.staffName],
  );

  const base = tab === "queue" ? queue : mine;

  const filtering =
    q.trim() !== "" || subject !== "all" || level !== "all" || (tab === "queue" && round !== "all");
  const reset = () => {
    setQ("");
    setSubject("all");
    setLevel("all");
    setRound("all");
  };

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return base.filter(
      (i) =>
        (!needle ||
          [i.code, i.stem, i.unit, i.standardCode, i.authorName].some((f) =>
            f.toLowerCase().includes(needle),
          )) &&
        (subject === "all" || i.subject === subject) &&
        (level === "all" || i.level === level) &&
        (tab !== "queue" ||
          round === "all" ||
          (round === "again" ? i.reviews.length > 0 : i.reviews.length === 0)),
    );
  }, [base, q, subject, level, round, tab]);

  /** 내가 쓴 채로 검수를 기다리는 것 — 왜 안 보이는지 알려 준다 */
  const mineSubmitted = all.filter(
    (i) => i.state === "submitted" && i.author === prefs.loginId,
  ).length;

  /** 닷새 넘게 묵은 것 — 회차 마감이 걸린 일이라 먼저 알린다 */
  const stale = hydrated ? queue.filter((i) => daysWaiting(i) >= 5).length : 0;

  if (!hydrated) {
    return (
      <>
        <PageHead id="EXP-03" title="검수 워크벤치" lead={LEAD} />
        <p className="py-16 text-center adm-t-sm text-exam-muted">확인 중입니다…</p>
      </>
    );
  }

  const columns: Column<ItemDraft>[] = [
    {
      key: "code",
      head: "문항 ID",
      cell: (i) => (
        <>
          <Link
            href={`/admin/review/${i.id}`}
            className="font-black tabular-nums text-brand-800 underline underline-offset-4 hover:text-brand-600"
          >
            {i.code || i.id}
          </Link>
          {i.reviews.length > 0 && (
            <span className="mt-0.5 block adm-t-xs font-bold text-amber-700">
              {i.reviews.length + 1}회차 검수
            </span>
          )}
        </>
      ),
    },
    {
      key: "stem",
      head: "발문",
      cell: (i) => (
        <>
          <span className="line-clamp-2 font-bold text-exam-text">
            {i.stem || "발문을 아직 쓰지 않았습니다"}
          </span>
          <span className="mt-0.5 block adm-t-xs">
            {[i.subject, i.grade, i.unit || "단원 미정"].join(" · ")}
          </span>
        </>
      ),
    },
    {
      key: "type",
      head: "유형 · 단계",
      hide: "md",
      cell: (i) => (
        <>
          {typeLabel(i.type)}
          <span className="mt-0.5 block adm-t-xs">
            {i.level} {levelSpecs[i.level].name}
          </span>
        </>
      ),
    },
    { key: "author", head: "출제자", hide: "lg", cell: (i) => i.authorName },
    {
      key: "waited",
      head: tab === "queue" ? "제출 · 대기" : "최근 변경",
      hide: "md",
      cell: (i) => {
        const days = daysWaiting(i);
        return (
          <>
            <span className="tabular-nums">{i.updatedAt}</span>
            {tab === "queue" && (
              <span
                className={`mt-0.5 block adm-t-xs font-bold ${
                  days >= 5 ? "text-rose-700" : "text-exam-muted"
                }`}
              >
                {days === 0 ? "오늘" : `${days}일째 대기`}
              </span>
            )}
          </>
        );
      },
    },
    {
      key: "act",
      head: "할 일",
      cell: (i) => {
        const draft = i.reviewDraft;
        return (
          <span className="flex flex-col items-start gap-1">
            <Link
              href={`/admin/review/${i.id}`}
              className={tab === "queue" ? a.btnRow : a.btnRowGhost}
            >
              {tab === "queue" ? (draft ? "이어서 검수" : "검수하기") : "검수 기록 보기"}
            </Link>
            {tab === "queue" && draft && (
              <span className="adm-t-xs text-exam-muted">{draft.by} 작성 중</span>
            )}
          </span>
        );
      },
    },
  ];

  return (
    <>
      <PageHead id="EXP-03" title="검수 워크벤치" lead={LEAD} />

      {mineSubmitted > 0 && (
        <div className="mb-5">
          <Callout tone="info">
            내가 쓴 문항 {mineSubmitted}건은 이 목록에 없습니다. 자기가 낸 문항을 자기가 승인하지
            못하도록 갈라 두었습니다 — 다른 검수자에게 넘어갑니다.
          </Callout>
        </div>
      )}

      {stale > 0 && tab === "queue" && (
        <div className="mb-5">
          <Callout tone="warn">
            닷새 넘게 검수를 기다리는 문항이 {stale}건 있습니다. 목록은 오래 기다린 것부터 보여
            줍니다.
          </Callout>
        </div>
      )}

      {/* 두 갈래 — 지금 볼 것과 내가 이미 본 것 */}
      <div className="mb-5 flex flex-wrap gap-2 border-b border-exam-line pb-4">
        {(
          [
            { id: "queue", label: "검수 대기", n: queue.length },
            { id: "mine", label: "내가 검수함", n: mine.length },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              reset();
            }}
            aria-current={tab === t.id ? "true" : undefined}
            className={tab === t.id ? a.btnPrimary : a.btnGhost}
          >
            {t.label} {t.n}건
          </button>
        ))}
      </div>

      <DataList
        rows={rows}
        totalCount={base.length}
        columns={columns}
        rowKey={(i) => i.id}
        searchPlaceholder="문항 ID · 발문 · 단원 · 성취기준 · 출제자로 찾기"
        query={q}
        onQuery={setQ}
        filtering={filtering}
        onReset={reset}
        emptyText={
          tab === "queue" ? "지금 검수할 문항이 없습니다." : "아직 검수한 문항이 없습니다."
        }
        filters={
          <>
            <Picker
              label="과목 전체"
              options={subjectOptions}
              value={subject}
              onChange={setSubject}
              className="w-full sm:w-32"
            />
            <Picker
              label="인지단계 전체"
              options={levelOptions}
              value={level}
              onChange={setLevel}
              className="w-full sm:w-44"
            />
            {tab === "queue" && (
              <Picker
                label="검수 회차 전체"
                options={roundOptions}
                value={round}
                onChange={setRound}
                className="w-full sm:w-56"
              />
            )}
          </>
        }
      />
    </>
  );
}

const LEAD =
  "제출된 문항을 내용·태깅·윤리 3단으로 검수합니다. 문항 ID를 누르면 검수 화면이 열리고, 쓰던 검수는 임시저장됩니다.";
