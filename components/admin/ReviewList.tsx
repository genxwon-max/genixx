"use client";

import { useMemo, useState } from "react";
import { maySelfReview } from "@/lib/admin";
import { useAdminPrefs } from "@/lib/adminStore";
import { useHydrated } from "@/lib/examStore";
import { daysWaiting, runAiAudit, useItems, type ItemDraft } from "@/lib/itemStore";
import { LEVELS, levelSpecs } from "@/lib/blueprint";
import DataList, { Picker, type Column } from "./DataList";
import {
  actionCol,
  authorCol,
  codeCol,
  linkBtn,
  stemCol,
  typeCol,
  whenCol,
} from "./itemColumns";
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
  const [picked, setPicked] = useState<string[]>([]);
  const [audited, setAudited] = useState<string | null>(null);

  /**
   * 검수 대상 = 제출된 것 중 내가 쓰지 않은 것.
   *
   * 슈퍼 관리자는 자기가 쓴 것도 목록에 든다 — 콘솔의 모든 권한을 가지므로 막지
   * 않되, 검수 화면에서 경고하고 기록에 자가 검수로 남긴다.
   */
  const selfOk = maySelfReview(prefs.role);
  const queue = useMemo(
    () =>
      all
        .filter((i) => i.state === "submitted" && (selfOk || i.author !== prefs.loginId))
        .sort(byWaiting),
    [all, prefs.loginId, selfOk],
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

  /** AI 검수를 돌릴 대상 — 고른 것이 있으면 그것만, 없으면 대기 전체 */
  const target = picked.length > 0 ? picked : queue.map((i) => i.id);

  const audit = () => {
    if (target.length === 0) return;
    const r = runAiAudit(target);
    setAudited(
      `${r.done}건을 검수했습니다 — 승인 ${r.approved}건 · 반려 ${r.rejected}건 · 사람에게 넘김 ${r.held}건. ` +
        (r.rejected > 0
          ? "반려한 문항에는 사유 코드와 「무엇을 어떻게 고쳐야 하는지」를 적어 출제자의 반려함으로 돌려보냈습니다. "
          : "") +
        (r.held > 0
          ? "규칙으로 가릴 수 없는 것이 남은 문항은 상태를 바꾸지 않고 「AI가 짚은 것」으로 적어 두었습니다 — 그 문항의 결론은 사람이 냅니다."
          : ""),
    );
    setPicked([]);
  };

  if (!hydrated) {
    return (
      <>
        <PageHead title="검수 워크벤치" />
        <p className="py-16 text-center adm-t-sm text-exam-muted">확인 중입니다…</p>
      </>
    );
  }

  const columns: Column<ItemDraft>[] = [
    /* 앞의 여섯 열은 출제 워크벤치·문항 은행과 같은 것을 쓴다(itemColumns.tsx).
       뒤의 둘만 이 화면의 일이다 — AI 검수 결과와 검수 버튼. */
    codeCol((i) => `/admin/review/${i.id}`),
    stemCol,
    typeCol,
    authorCol,
    whenCol(tab === "queue" ? "제출 · 대기" : "최근 변경", (i) => {
      if (tab !== "queue") return null;
      const days = daysWaiting(i);
      return {
        text: days === 0 ? "오늘" : `${days}일째 대기`,
        tone: days >= 5 ? "text-rose-700" : undefined,
      };
    }),
    {
      key: "ai",
      head: "AI 검수",
      nowrap: true,
      cell: (i) => {
        if (!i.aiAudit) return <span className="adm-t-md">아직 안 돌림</span>;
        const { blocks, warns, verdict } = i.aiAudit;
        if (verdict === "approve") {
          return <span className="adm-t-md font-bold text-emerald-700">AI가 승인함</span>;
        }
        return (
          <span className="adm-t-md font-bold text-rose-700">
            {blocks > 0 && `규칙 위반 ${blocks}`}
            {blocks > 0 && warns > 0 && " · "}
            {warns > 0 && `확인 필요 ${warns}`}
            <span className="block font-bold text-violet-800">
              {verdict === "reject" ? "AI가 반려함" : "사람에게 넘김"}
            </span>
          </span>
        );
      },
    },
    actionCol("할 일", (i) => {
      const draft = i.reviewDraft;
      return (
        <span className="flex flex-col items-start gap-1">
          {linkBtn(
            `/admin/review/${i.id}`,
            tab === "queue" ? (draft ? "이어서 검수하기" : "검수하기") : "상세보기",
            tab === "queue",
          )}
          {tab === "queue" && draft && (
            <span className="adm-t-sm text-exam-muted">{draft.by} 작성 중</span>
          )}
        </span>
      );
    }),
  ];

  return (
    <>
      {/* 설명 줄을 두지 않는다. 「3단으로 검수합니다」는 검수판을 열면 바로 보이는
          말이고, 갈래와 AI 검수 단추가 제목과 한 줄에 서면 화면이 곧 설명이 된다. */}
      <PageHead
        title="검수 워크벤치"
        action={
          <>
            {/* AI 검수 — 고른 것이 있으면 그것만, 없으면 대기 전체를 본다.
                갈래를 옮겨도 자리를 지키도록 감추지 않고 눌리지 않게만 둔다. */}
            <button
              type="button"
              onClick={audit}
              disabled={tab !== "queue" || target.length === 0}
              className={tab !== "queue" || target.length === 0 ? a.btnDisabled : a.btnGhost}
            >
              AI 검수 {picked.length > 0 ? `고른 ${picked.length}건` : `${queue.length}건`}
            </button>

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
          </>
        }
      />

      {audited && (
        <div className="mb-5">
          <Callout tone="good" title="AI 검수를 마쳤습니다">
            {audited}
          </Callout>
        </div>
      )}

      {mineSubmitted > 0 && (
        <div className="mb-5">
          <Callout tone={selfOk ? "warn" : "info"}>
            {selfOk ? (
              <>
                내가 쓴 문항 {mineSubmitted}건도 이 목록에 함께 있습니다. 슈퍼 관리자만 자기가 낸
                문항을 볼 수 있고, 결론을 내면 검수 기록에 「본인 출제 문항 자가 검수」로 남습니다.
              </>
            ) : (
              <>
                내가 쓴 문항 {mineSubmitted}건은 이 목록에 없습니다. 자기가 낸 문항을 자기가
                승인하지 못하도록 갈라 두었습니다 — 다른 검수자에게 넘어갑니다.
              </>
            )}
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

      <DataList
        rows={rows}
        totalCount={base.length}
        select={tab === "queue" ? { selected: picked, onChange: setPicked } : undefined}
        columns={columns}
        rowKey={(i) => i.id}
        rowHref={(i) => `/admin/review/${i.id}`}
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

