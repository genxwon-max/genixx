"use client";

import { itemStates, items, type ItemRow } from "@/lib/admin";
import type { Tone } from "@/lib/admin2";
import DataTable, { type Col, type Filter } from "@/components/admin2/DataTable";
import { Status, Tag } from "@/components/admin2/ui";
import { STATE_ORDER, selfReview, stateRank } from "./order";

/*
 * ADM-04 문항 은행의 표.
 *
 * DataTable이 함수 prop(value·cell·match)을 받으므로 이 조각만 클라이언트로 내린다.
 * 칸 정의와 거르개는 모듈 바깥 상수로 둔다 — 컴포넌트 안에서 만들면 매 렌더마다 새 배열이
 * 되어 DataTable의 useMemo가 늘 다시 돈다(QueueTable과 같은 이유).
 *
 * ── 칸을 이 순서로 놓은 이유 ──
 *   무엇인가 (문항 ID)
 *     → 어디에 쓰이는가 (과목 · 학년 · 유형 · 재능 축)
 *     → 실제로 무슨 문제인가 (발문)
 *     → 지금 어디까지 왔나 (상태)
 *     → 누가 붙어 있나 (출제자 · 검수자)
 *     → 지난번에 어땠나 (정답률)
 * 앞의 넉 칸은 전부 짧은 분류값이라 폭이 고정된다. 그 뒤에 남는 자리를 발문 한 칸이
 * 통째로 먹고(width 100% + a2-clip), 오른쪽 끝의 사람·숫자 칸은 다시 고정폭으로 선다.
 * 발문을 맨 왼쪽에 두지 않은 것은 ID로 문항을 찾아 오는 일이 훨씬 잦아서다 — 검수 요청도
 * 회차 편성도 Q-K-0231로 문항을 부른다.
 *
 * ── 일부러 뺀 것 ──
 *  · 보기·정답·배점: 목록에서 정답이 보이면 이 화면 자체가 유출 경로가 된다. 문항 상세를
 *    붙일 때 그 화면에서만 연다.
 *  · 「수정」·「승인」 같은 줄 단위 동작: 문항 상세(ADM-04-1)가 아직 없다. 동작하지 않는
 *    단추를 자리만 잡아 두면 급한 날 그것부터 눌린다.
 *  · itemStates[].className: 기존 /admin의 팔레트 클래스라 이 콘솔에서 쓰지 않는다.
 *    label만 가져다 쓰고 색은 Status의 tone으로만 간다.
 */

/** 상태 → 색. 검수 대기는 기다리는 것(warn), 수정 요청은 되돌아온 것(danger)으로 가른다.
 *  작성중·사용 중지는 아직/이미 은행 밖이라 회색으로 떨어뜨린다 — 표의 붉은색과 노란색은
 *  오늘 손이 가야 하는 두 상태에만 남겨 둔다. */
const ITEM_TONE: Record<ItemRow["state"], Tone> = {
  draft: "muted",
  review: "warn",
  revise: "danger",
  approved: "ok",
  retired: "muted",
};

/**
 * 정렬 자리와 검색 글자를 한 값에 담는다.
 *
 * DataTable은 value 하나로 정렬과 검색을 함께 하므로, 글자만 주면 정렬이 가나다순으로
 * 떨어지고 숫자만 주면 검색창에 「검수 대기」를 쳤을 때 안 걸린다. 앞에 한 자리 숫자를
 * 붙여 순서를 잡고 뒤에 원래 글자를 남긴다. 자리는 한 자리로 유지한다 — 열 개가 넘으면
 * 문자열 비교라 10이 2보다 위에 선다.
 */


/** 학년을 학교급·숫자 순으로 세우기 위한 자리. 글자 그대로 정렬하면 한글 자모순이라
 *  중1이 초4보다 위에 선다 */
const GRADE_ORDER = ["초3", "초4", "초5", "초6", "중1", "중2", "중3"];
const gradeRank = (g: string) => {
  const i = GRADE_ORDER.indexOf(g);
  return i < 0 ? GRADE_ORDER.length : i;
};

const COLS: Col<ItemRow>[] = [
  {
    key: "id",
    head: "문항 ID",
    width: "6.5rem",
    nowrap: true,
    value: (r) => r.id,
    cell: (r) => <span className="a2-mono font-semibold text-(--a2-ink)">{r.id}</span>,
  },
  {
    // 과목은 거르개로 좁히는 칸이라 정렬(=검색)을 달지 않는다. 검색창의 「수학」이 과목
    // 전체를 끌고 오기 시작하면 발문 검색이 못 쓰게 된다
    key: "subject",
    head: "과목",
    width: "4.25rem",
    nowrap: true,
    cell: (r) => <Tag>{r.subject}</Tag>,
  },
  {
    key: "grade",
    head: "학년",
    width: "4rem",
    nowrap: true,
    hide: "sm",
    value: (r) => r.grade,
    sort: (r) => gradeRank(r.grade),
    cell: (r) => <span className="a2-mono">{r.grade}</span>,
  },
  {
    // 유형도 거르개가 맡는다. 꼬리표를 과목 옆에 연달아 세우지 않은 것은 한 줄에 상자가
    // 둘 서면 정작 값(발문)보다 상자가 먼저 읽혀서다 — 꼬리표는 한 표에 한 종류만
    key: "type",
    head: "유형",
    width: "4.5rem",
    nowrap: true,
    hide: "md",
    cell: (r) => <span className="a2-t-sm text-(--a2-ink-2)">{r.type}</span>,
  },
  {
    // 재능 축은 거르개가 없으므로 value를 남긴다 — 「자연·탐구 문항이 몇 개인가」는
    // 검색창으로 답하게 두고, 축이 늘어나면 그때 거르개로 올린다
    key: "axis",
    head: "재능 축",
    width: "6rem",
    nowrap: true,
    hide: "lg",
    value: (r) => r.axis,
    cell: (r) => <span className="a2-t-sm text-(--a2-ink-2)">{r.axis}</span>,
  },
  {
    // 폭을 100%로 두어 남는 자리를 이 칸이 먹고, 넘치면 말줄임한다(a2-clip).
    // 발문은 길이가 제각각이라 고정폭을 주면 짧은 줄에서 표가 성글어지고 긴 줄은 잘린다.
    // 줄바꿈을 허용해 두 줄로 펴는 쪽도 버렸다 — 한 줄 32px이 무너지면 200줄을 못 훑는다.
    // 잘린 뒤는 title로 붙여 마우스를 올리면 전문이 뜬다
    key: "stem",
    head: "발문",
    width: "100%",
    clip: true,
    value: (r) => r.stem,
    cell: (r) => <span title={r.stem}>{r.stem}</span>,
  },
  {
    key: "state",
    head: "상태",
    width: "7rem",
    nowrap: true,
    value: (r) => itemStates[r.state].label,
    sort: (r) => stateRank(r.state),
    cell: (r) => <Status tone={ITEM_TONE[r.state]}>{itemStates[r.state].label}</Status>,
  },
  {
    key: "author",
    head: "출제자",
    width: "5.25rem",
    nowrap: true,
    value: (r) => r.author,
    cell: (r) => r.author,
  },
  {
    key: "reviewer",
    head: "검수자",
    width: "6rem",
    nowrap: true,
    // 미배정도 값으로 넣는다 — 검색창에 쳐서 걸리고, 정렬하면 한곳에 뭉친다.
    //
    // 출제자 = 검수자(order.ts의 selfReview)인 줄은 이 칸에 붉은 점을 세운다. 위반이
    // 생기는 자리가 검수자를 고르는 순간이라 그 칸에 붙여야 눈이 옮겨 가지 않고,
    // 거르개를 하나 더 세우는 대신 검색값에 자가검수를 이어 붙여 모아 볼 수 있게 했다 —
    // 평소 0건인 조건을 위해 도구 줄에 상시 차림표를 세우면 자리만 먹는다.
    // 점은 색만으로 알리지 않는다. title과 aria-label에 문장을 함께 적는다
    value: (r) => (selfReview(r) ? `${r.reviewer} 자가검수` : (r.reviewer ?? "미배정")),
    cell: (r) =>
      r.reviewer === null ? (
        <span className="text-(--a2-ink-4)">미배정</span>
      ) : selfReview(r) ? (
        <span className="inline-flex items-center gap-1.5">
          <span
            role="img"
            aria-label="출제자와 검수자가 같음 — 이해충돌"
            title="출제자와 검수자가 같습니다 — 자가 검수(lib/admin.ts maySelfReview)"
            className="a2-dot"
            style={{ color: "var(--a2-danger)" }}
          />
          {r.reviewer}
        </span>
      ) : (
        r.reviewer
      ),
  },
  {
    key: "correctRate",
    head: "정답률",
    width: "6rem",
    num: true,
    // 미출제(null)를 -1로 떨어뜨려 정렬하면 한쪽 끝에 뭉치게 한다. 0으로 두면 「아무도
    // 못 맞힌 문항」과 「아직 안 낸 문항」이 같은 자리에 서서 뜻이 섞인다
    value: (r) => r.correctRate ?? -1,
    // 색을 칠하지 않는다. 너무 쉬움·너무 어려움의 경계가 저장소 어디에도 정해져 있지
    // 않은데 임의로 그은 선에 붉은색을 칠하면 그 선이 규칙인 줄로 읽힌다
    cell: (r) =>
      r.correctRate == null ? (
        <span className="a2-t-sm text-(--a2-ink-4)">미출제</span>
      ) : (
        <>
          {r.correctRate}
          <span className="a2-t-xs text-(--a2-ink-4)">%</span>
        </>
      ),
  },
];

const FILTERS: Filter<ItemRow>[] = [
  {
    id: "state",
    label: "상태",
    options: STATE_ORDER.map((s) => ({ value: s, label: itemStates[s].label })),
    match: (r, v) => r.state === v,
  },
  {
    // 실제로 등장한 과목에서만 뽑는다. 타입에 적힌 셋을 그대로 펴 두면 문항이 하나도 없는
    // 과목이 차림표에 남아 0줄을 보여 준다
    id: "subject",
    label: "과목",
    options: [...new Set(items.map((i) => i.subject))].map((v) => ({ value: v, label: v })),
    match: (r, v) => r.subject === v,
  },
  {
    id: "type",
    label: "유형",
    options: [...new Set(items.map((i) => i.type))].map((v) => ({ value: v, label: v })),
    match: (r, v) => r.type === v,
  },
];

export default function ItemsTable({ rows }: { rows: ItemRow[] }) {
  return (
    <DataTable
      rows={rows}
      cols={COLS}
      getKey={(r) => r.id}
      filters={FILTERS}
      searchHint="문항 ID · 발문 · 재능 축 · 출제자"
      empty="조건에 맞는 문항이 없습니다."
      // 넘겨받은 순서가 검수 대기 먼저라는 것을 적어 둔다. 적지 않으면 머리 행의 정렬
      // 화살표는 꺼져 있는데 줄 순서는 뒤섞여 보여, 표가 고장 난 것처럼 읽힌다
      toolbarExtra={<span className="a2-t-xs text-(--a2-ink-4)">기본 정렬 · 검수 대기 먼저</span>}
    />
  );
}
