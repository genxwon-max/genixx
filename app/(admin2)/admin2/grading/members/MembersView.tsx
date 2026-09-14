"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { rounds } from "@/lib/admin";
import { n } from "@/lib/admin2";
import { sheetsOf, useExpert, type Sheet } from "@/lib/expertStore";
import { AI_POINT_OF, QUESTION_POINT, sheetAnswersOf } from "@/lib/examSheet";
import { markKey, useAllMarks, type SheetMarks } from "@/lib/sheetMarkStore";
import DataTable, { type Col, type Filter } from "@/components/admin2/DataTable";
import { PageHead, Tab } from "@/components/admin2/ui";

/**
 * EXP-04-1 회원 채점 — 한 아이가 낸 답안지 한 장.
 *
 * 평가 채점(EXP-04)과 같은 자료를 보되 묶는 단위가 다르다. 저쪽은 **응답**이라
 * 「지금 봐야 하는 것이 무엇인가」에 답하고, 여기는 **사람**이라 「이 아이에게 무엇을
 * 돌려주는가」에 답한다.
 *
 * 단위를 나눈 까닭은 리포트다. 학부모가 받는 것은 응답 하나가 아니라 답안지 한 장이고,
 * 거기 실리는 것은 총점과 해설이다. 응답 목록만 있으면 「이 아이 것을 다 봤나」를 물을
 * 자리가 없어, 국어만 해설이 붙고 수학은 빈 채로 나가는 일이 생긴다.
 */

const roundLabel = (id: string) => rounds.find((r) => r.id === id)?.label ?? id;

/** 소수점은 필요할 때만 — 1.5는 1.5로, 2는 2로 적는다 */
const pt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

/**
 * 답안지 한 장의 채점 진척 — 상세와 **같은 자료**로 센다.
 *
 * 예전에는 서술형 응답 큐(ScoreTask)만 세었다. 상세가 시험지 전체를 펴게 되면서 목록의
 * 「0 / 2」와 상세의 「35 / 100」이 서로 다른 것을 세게 되었고, 두 화면이 같은 답안지를
 * 다른 숫자로 말했다.
 *
 * 이제 둘 다 시험지 문항 + 서술형 응답을 함께 세고, 전문가가 점수를 친 문항을 「채점함」으로
 * 본다(lib/sheetMarkStore.ts).
 */
function sheetStat(sheet: Sheet, marks: SheetMarks) {
  const paper = sheetAnswersOf(
    sheet.seat,
    [...new Set(sheet.tasks.map((t) => t.subject))],
  );
  const rows = [
    ...paper.map((a) => ({ id: a.q.id, ai: a.aiPoints ?? 0 })),
    ...sheet.tasks.map((t) => ({ id: t.id, ai: AI_POINT_OF[t.human?.level ?? t.aiLevel] })),
  ];

  let done = 0;
  let got = 0;
  let comments = 0;
  for (const r of rows) {
    const m = marks[markKey(sheet.key, r.id)];
    if (m?.points !== undefined) done += 1;
    if (m?.comment) comments += 1;
    got += m?.points ?? r.ai;
  }
  return { done, got, comments, total: rows.length, max: rows.length * QUESTION_POINT };
}

type TabId = "open" | "done" | "all";

export default function MembersView() {
  const { scores } = useExpert();
  const marks = useAllMarks();
  const [tab, setTab] = useState<TabId>("open");

  const sheets = useMemo(() => sheetsOf(scores), [scores]);
  /* 답안지마다 한 번만 센다 — 칸 여섯이 저마다 세면 스물다섯 장 × 스무 문항을 여섯 번 돈다 */
  const stat = useMemo(() => {
    const out = new Map<string, ReturnType<typeof sheetStat>>();
    for (const s of sheets) out.set(s.key, sheetStat(s, marks));
    return out;
  }, [sheets, marks]);
  const of = useCallback((s: Sheet) => stat.get(s.key)!, [stat]);

  const tabs = useMemo(() => {
    const left = sheets.filter((s) => {
      const v = stat.get(s.key)!;
      return v.done < v.total;
    });
    return [
      { id: "open" as TabId, label: "채점 중", rows: left, empty: "채점할 답안지가 없습니다." },
      {
        id: "done" as TabId,
        label: "채점 끝",
        rows: sheets.filter((s) => !left.includes(s)),
        empty: "다 채점한 답안지가 없습니다.",
      },
      { id: "all" as TabId, label: "전체", rows: sheets, empty: "답안지가 없습니다." },
    ];
  }, [sheets, stat]);

  const current = tabs.find((t) => t.id === tab) ?? tabs[0];

  const cols = useMemo<Col<Sheet>[]>(
    () => [
      {
        key: "seat",
        head: "응시번호",
        width: "7.5rem",
        nowrap: true,
        value: (s) => `${s.seat} ${s.grade}`,
        cell: (s) => (
          <span className="inline-flex items-center gap-1.5">
            {/* 이름을 적지 않는다 — 채점하는 사람이 누구 답인지 알면 안 된다 */}
            <Link
              href={`/admin2/grading/members/${s.key}`}
              className="a2-mono font-semibold text-(--a2-ink) hover:text-(--a2-accent) hover:underline"
            >
              {s.seat}
            </Link>
            <span className="a2-t-xs text-(--a2-ink-4)">{s.grade}</span>
          </span>
        ),
      },
      {
        /*
         * 평가명 — 「3회차」가 아니라 「2026 파일럿 3회차」를 그대로 적는다.
         *
         * 회차 번호만 적어 두었을 때는 해가 바뀌면 같은 「3회차」가 둘이 되고, 리포트·문의에
         * 적히는 이름과도 달라 두 화면을 오가며 맞춰 봐야 했다. 이름 하나로 세운다.
         *
         * 과목 칸을 이 자리에 두었던 것을 걷었다. 답안지 한 장이 보는 과목은 상세를 열면
         * 응시 판이 꼬리표로 적고, 목록에서 답할 물음은 「어느 회차의 답안지인가」다.
         */
        key: "round",
        head: "평가명",
        width: "100%",
        value: (s) => roundLabel(s.round),
        sort: (s) => s.round,
        cell: (s) => <span className="a2-t-sm text-(--a2-ink)">{roundLabel(s.round)}</span>,
      },
      {
        key: "progress",
        head: "채점",
        width: "7rem",
        nowrap: true,
        value: (s) => {
          const v = of(s);
          return `${v.done}/${v.total}`;
        },
        sort: (s) => {
          const v = of(s);
          return v.total === 0 ? 0 : v.done / v.total;
        },
        cell: (s) => {
          const v = of(s);
          const left = v.total - v.done;
          return (
            <span className="inline-flex flex-col">
              <span className="a2-num a2-t-sm text-(--a2-ink)">
                {v.done} / {v.total}
              </span>
              {left > 0 && (
                <span className="a2-t-xs font-semibold" style={{ color: "var(--a2-warn)" }}>
                  {n(left)}문항 남음
                </span>
              )}
            </span>
          );
        },
      },
      {
        key: "score",
        head: "점수",
        width: "6.5rem",
        nowrap: true,
        value: (s) => {
          const v = of(s);
          return `${pt(v.got)}/${v.max}`;
        },
        sort: (s) => {
          const v = of(s);
          return v.max === 0 ? 0 : v.got / v.max;
        },
        cell: (s) => {
          const v = of(s);
          /* 아직 다 안 매긴 답안지의 총점은 **아직 총점이 아니다.** 그대로 적어 두면
             낮은 점수로 읽혀, 채점이 끝나기 전에 판단이 먼저 선다 */
          return (
            <span className="inline-flex flex-col">
              <span className="a2-num a2-t-sm font-semibold text-(--a2-ink)">
                {pt(v.got)} / {v.max}
              </span>
              {v.done < v.total && <span className="a2-t-xs text-(--a2-ink-4)">채점 중</span>}
            </span>
          );
        },
      },
      {
        key: "comment",
        head: "해설",
        width: "6rem",
        nowrap: true,
        value: (s) => String(of(s).comments),
        sort: (s) => of(s).comments,
        cell: (s) => {
          const has = of(s).comments;
          return has === 0 ? (
            <span className="a2-t-xs text-(--a2-ink-4)">없음</span>
          ) : (
            <span className="a2-num a2-t-sm text-(--a2-ink-2)">
              {has} / {of(s).total}
            </span>
          );
        },
      },
      {
        key: "act",
        head: "관리",
        width: "5.5rem",
        nowrap: true,
        cell: (s) => (
          <Link
            href={`/admin2/grading/members/${s.key}`}
            className="a2-btn a2-btn-sm"
            aria-label={`${s.seat} 답안지`}
          >
            답안지
          </Link>
        ),
      },
    ],
    /* 칸이 채점 상태를 읽으므로 셈이 바뀌면 칸도 다시 세워야 한다 — 빈 배열로 두면
       점수를 손보고 돌아왔을 때 표만 옛 숫자를 계속 그린다 */
    [of],
  );

  const filters = useMemo<Filter<Sheet>[]>(
    () => [
      {
        id: "round",
        label: "회차",
        options: rounds
          .filter((r) => sheets.some((s) => s.round === r.id))
          .map((r) => ({ value: r.id, label: r.label })),
        match: (s, x) => s.round === x,
      },
      {
        id: "grade",
        label: "학년",
        options: [...new Set(sheets.map((s) => s.grade))]
          .sort()
          .map((v) => ({ value: v, label: v })),
        match: (s, x) => s.grade === x,
      },
    ],
    [sheets],
  );

  return (
    <>
      <PageHead
        title="회원 채점"
        tabsLabel="조회 조건"
        tabs={tabs.map((t) => (
          <Tab
            key={t.id}
            label={t.label}
            count={n(t.rows.length)}
            active={tab === t.id}
            onClick={() => setTab(t.id)}
          />
        ))}
      />

      <DataTable
        key={tab}
        rows={current.rows}
        cols={cols}
        filters={filters}
        getKey={(s) => s.key}
        pageSize={25}
        searchHint="응시번호 · 과목"
        empty={current.empty}
        showCount={false}
      />
    </>
  );
}
