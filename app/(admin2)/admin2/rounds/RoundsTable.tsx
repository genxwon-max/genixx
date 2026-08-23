"use client";

import DataTable, { type Col, type Filter } from "@/components/admin2/DataTable";
import { Bar, Status } from "@/components/admin2/ui";
import { rounds, roundStates, type Round, type RoundState } from "@/lib/admin";
import { n, pct, roundTone } from "@/lib/admin2";

/**
 * ADM-05 회차 표.
 *
 * 지금 회차는 넷뿐이라 page.tsx 안에 손으로 그려도 되지만 공용 표(DataTable)를 쓴다.
 * 회차는 분기마다 한 줄씩 쌓이는 목록이라 두 해면 여덟, 다섯 해면 스무 줄이 된다.
 * 그때 가서 손으로 그린 표에 정렬과 쪽넘김을 도로 붙이느니, 늘어나는 줄을 감당하는
 * 표를 처음부터 세운다. 정렬(회차·대상·제출)도 이 표가 이미 들고 있다.
 *
 * 대신 지금 과한 것 둘은 껐다 —
 *  · 검색창: 이름이 「2026 파일럿 N회차」 한 꼴이라 무엇을 쳐도 거의 다 걸린다.
 *            열 몇 줄까지는 상태 거르개와 정렬로 충분하다.
 *  · 쪽당 25줄: 기본값 그대로 두면 네 줄짜리 표는 한 쪽에 다 들어와 쪽넘김이 눌리지
 *            않는다. 줄이 늘어나는 날 저절로 살아난다.
 */

/* 회차 상태 → 색조는 lib/admin2.ts의 roundTone 하나를 쓴다. 처음에는 이 파일에 두고
   page.tsx가 가져갔는데, 이 파일이 "use client"라 서버에서 그릴 때 값이 undefined가 되어
   같은 회차 상태가 표에서는 초록, 머리와 요약판에서는 회색으로 나왔다. */

const dash = <span className="text-(--a2-ink-4)">—</span>;

/*
 * 칸 순서 — 왼쪽은 「어느 회차인가」, 가운데는 「언제인가」, 오른쪽은 「얼마나 왔나」.
 * 진행 셋(제출 → 판정 → 발행)은 실제 일이 흐르는 차례라 왼쪽에서 오른쪽으로 읽으면
 * 그대로 공정이 된다. 순서를 바꾸면 막대 세 개가 그냥 막대 세 개가 된다.
 *
 * 기간과 마감일을 둘 다 둔다. 기간은 사람이 읽는 문자열이고 마감일(closesOn)은 기계가
 * 쓰는 값이다(lib/admin.ts 주석). 둘이 어긋나는 회차가 생기면 그 어긋남 자체가 고칠
 * 거리이므로 나란히 놓아 눈에 걸리게 한다.
 *
 * 일부러 뺀 칸 —
 *  · 회차 ID(2026-3): 이름에 연도와 번호가 이미 들어 있어 같은 값을 두 벌 적는 셈이다.
 *  · 남은 날짜(D-12): 서버에서 오늘을 세면 브라우저의 오늘과 어긋나 하이드레이션이
 *    깨진다(lib/exam.ts deadlineDays 주석). 날짜만 적고 셈은 하지 않는다.
 *  · 미제출 인원: 대상과 제출률에서 바로 나오는 값이라 칸을 만들지 않는다.
 *  · 열기·마감 단추: 회차 개폐 기록은 클라이언트 스토어(roundPlanStore)가 들고 있다.
 *    이 화면은 읽기만 한다.
 */
const cols: Col<Round>[] = [
  {
    key: "label",
    head: "회차",
    width: "11rem",
    nowrap: true,
    /* 이름 앞에 연도가 있어 이름순이 사실상 시간순이다 */
    value: (r) => r.label,
    cell: (r) => <span className="font-semibold text-(--a2-ink)">{r.label}</span>,
  },
  {
    key: "state",
    head: "상태",
    width: "6.5rem",
    nowrap: true,
    /* 정렬하지 않는다 — 준비중·응시·채점중·마감은 크기 순서가 아니라 차례이고,
       그 차례는 마감일 순으로 이미 보인다. 고르고 싶으면 위 거르개를 쓴다. */
    cell: (r) => <Status tone={roundTone[r.state]}>{roundStates[r.state].label}</Status>,
  },
  {
    key: "period",
    head: "기간",
    width: "10.5rem",
    nowrap: true,
    hide: "md",
    cell: (r) => <span className="a2-mono a2-t-sm">{r.period}</span>,
  },
  {
    key: "closesOn",
    head: "마감일",
    width: "6.5rem",
    nowrap: true,
    cell: (r) => <span className="a2-mono a2-t-sm">{r.closesOn}</span>,
  },
  {
    key: "target",
    head: "대상",
    width: "5rem",
    num: true,
    value: (r) => r.target,
    cell: (r) => (r.target ? n(r.target) : dash),
  },
  {
    /* 막대 셋은 비율만 보인다. 표에서 묻는 것은 「어느 회차가 덜 걷혔나」이지 건수가
       아니고, 건수는 지금 회차만 위 지표 넉 줄에 적어 두었다. 여덟 칸짜리 표에 건수와
       비율을 함께 넣으면 가로로 밀린다. */
    key: "submitted",
    head: "제출",
    width: "8rem",
    nowrap: true,
    /* 막대가 보여 주는 값, 곧 제출률로 정렬한다. 건수 정렬은 대상 칸에서 얻는다 */
    value: (r) => pct(r.submitted, r.target),
    cell: (r) => (r.target ? <Bar value={r.submitted} total={r.target} /> : dash),
  },
  {
    /* 판정·발행의 분모는 대상이 아니라 제출이다. 응시하지 않은 사람은 판정할 것이
       없으므로 대상으로 나누면 세 막대가 늘 함께 낮아져 어디가 막혔는지 안 보인다. */
    key: "graded",
    head: "판정",
    width: "8rem",
    nowrap: true,
    hide: "sm",
    cell: (r) => (r.submitted ? <Bar value={r.graded} total={r.submitted} /> : dash),
  },
  {
    key: "published",
    head: "발행",
    width: "8rem",
    nowrap: true,
    hide: "sm",
    cell: (r) => (r.submitted ? <Bar value={r.published} total={r.submitted} /> : dash),
  },
];

/* 거르개는 상태 하나. 연도별 거르개는 회차 이름과 마감일에 연도가 있어 정렬로 갈음된다 */
const filters: Filter<Round>[] = [
  {
    id: "state",
    label: "상태",
    options: (Object.keys(roundStates) as RoundState[]).map((k) => ({
      value: k,
      label: roundStates[k].label,
    })),
    match: (r, v) => r.state === v,
  },
];

export default function RoundsTable() {
  return (
    <DataTable
      rows={rounds}
      cols={cols}
      getKey={(r) => r.id}
      filters={filters}
      search={false}
      empty="조건에 맞는 회차가 없습니다."
    />
  );
}
