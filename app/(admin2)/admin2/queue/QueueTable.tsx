"use client";

import { caseStates, type CaseState, type GradingCase } from "@/lib/admin";
import type { Tone } from "@/lib/admin2";
import DataTable, { type Col, type Filter } from "@/components/admin2/DataTable";
import { Status } from "@/components/admin2/ui";

/*
 * EXP-07 판정 큐의 표.
 *
 * DataTable이 함수 prop(value·cell·match)을 받으므로 이 조각만 클라이언트로 내린다.
 * 칸 정의와 거르개는 모듈 바깥에 상수로 둔다 — 컴포넌트 안에서 만들면 매 렌더마다
 * 새 배열이 되어 DataTable의 useMemo가 늘 다시 돈다.
 *
 * ── 칸을 이 순서로 놓은 이유 ──
 *   무엇인가 (케이스 · 응시번호)
 *     → 누구 것인가 (학년 · 기관)
 *     → 지금 어디까지 왔나 (상태)
 *     → 무엇이라 판정했고 얼마나 믿는가 (제안 축 · 신뢰도)
 *     → 그 판정을 받쳐 주는 것 (설문 3종)
 *     → 누가 붙어 있나 (검토자) → 언제 (갱신) → 동작
 * 사람이 표를 읽는 순서(대상 → 상태 → 값 → 담당 → 시각)를 그대로 왼쪽에서 오른쪽으로
 * 폈다. 동작은 admin2.css의 규칙대로 늘 맨 오른쪽 끝에 세워 둔다.
 *
 * ── 일부러 뺀 것 ──
 *  · 학생 이름·생년월일·보호자 연락처: lib/admin.ts가 응시번호(seat)만 주는 것도 같은
 *    이유다. 판정에 필요한 것은 답안이지 누구인지가 아니고, 목록은 어깨너머로 가장 잘
 *    보이는 화면이다.
 *  · 「사유(flag)」 전용 칸: 사유가 있는 줄은 여덟 중 셋뿐이라 칸을 하나 더 두면 대부분이
 *    빈 칸이 된다. 대신 상태 칸 앞에 경고 점으로 세우고 title로 문장을 붙였으며,
 *    상태 칸의 검색값에 사유를 이어 붙여 검색창에 「경계」를 쳐도 걸리게 했다.
 *  · caseStates[].className: 저쪽은 기존 /admin의 팔레트 클래스라 이 콘솔에서 쓰지 않는다.
 *    label만 가져다 쓰고 색은 Status의 tone으로만 간다.
 */

/** 상태 → 색. 대시보드(app/(admin2)/admin2/page.tsx)와 같은 짝을 쓴다 — 두 화면에서 같은
 *  상태가 다른 색으로 보이면 그 색은 아무 뜻도 없어진다. */
const CASE_TONE: Record<CaseState, Tone> = {
  ai: "info",
  review: "warn",
  conference: "danger",
  confirmed: "ok",
  published: "muted",
};

/** 설문 두 종. 자리 순서가 곧 누구의 설문인지이므로 이 배열이 유일한 기준이다 */
const SURVEYS = [
  { key: "guardian", label: "학부모" },
  { key: "teacher", label: "교사" },
] as const;

const collected = (c: GradingCase) =>
  SURVEYS.filter((s) => c.surveys[s.key])
    .map((s) => s.label)
    .join("·");

/** 사람이 확인해야 하는 신뢰도 경계. 이 아래는 숫자를 붉게 적는다 */
const LOW = 75;

const COLS: Col<GradingCase>[] = [
  {
    key: "id",
    head: "케이스",
    width: "8rem",
    nowrap: true,
    value: (c) => c.id,
    cell: (c) => <span className="a2-mono font-semibold text-(--a2-ink)">{c.id}</span>,
  },
  {
    key: "seat",
    head: "응시번호",
    width: "5rem",
    nowrap: true,
    value: (c) => c.seat,
    // 수량이 아니라 번호라 num(오른쪽 정렬)을 주지 않는다. 고정폭만 준다
    cell: (c) => <span className="a2-mono">{c.seat}</span>,
  },
  {
    key: "grade",
    head: "학년",
    width: "3.75rem",
    nowrap: true,
    hide: "sm",
    value: (c) => c.grade,
    cell: (c) => c.grade,
  },
  {
    // 폭을 100%로 두어 남는 자리를 이 칸이 먹고, 넘치면 말줄임한다.
    // 기관명은 「인천 미추홀 영재교육원」처럼 길이가 제각각이라 고정폭을 주면 표가 성글어진다
    key: "org",
    head: "기관",
    width: "100%",
    clip: true,
    hide: "md",
    value: (c) => c.org,
    cell: (c) => c.org,
  },
  {
    key: "state",
    head: "상태",
    width: "7.5rem",
    nowrap: true,
    // 정렬·검색이 같은 값을 쓰므로 사유를 이어 붙였다. 정렬은 이름차순이 되지만 상태에는
    // 거르개가 따로 있어 정렬보다 검색이 쓸모가 크다
    value: (c) => `${caseStates[c.state].label} ${c.flag ?? ""}`,
    cell: (c) => (
      <span className="inline-flex items-center gap-1.5">
        {c.flag && (
          <span
            role="img"
            aria-label={`사람이 봐야 하는 이유 — ${c.flag}`}
            title={c.flag}
            className="a2-dot"
            style={{ color: "var(--a2-warn)" }}
          />
        )}
        <Status tone={CASE_TONE[c.state]}>{caseStates[c.state].label}</Status>
      </span>
    ),
  },
  {
    key: "suggested",
    head: "제안 축",
    width: "5.75rem",
    nowrap: true,
    hide: "lg",
    value: (c) => c.suggested,
    cell: (c) => c.suggested,
  },
  {
    key: "confidence",
    head: "신뢰도",
    width: "4.5rem",
    num: true,
    value: (c) => c.confidence,
    // 낮은 값만 붉게. 높은 값을 초록으로 칠하지 않는다 — 스무 줄이 다 초록이면 붉은 셋이 안 보인다
    cell: (c) => (
      <span
        style={{ color: c.confidence < LOW ? "var(--a2-danger)" : undefined }}
        title={c.confidence < LOW ? `신뢰도 ${LOW} 미만 — 사람 확인 필요` : undefined}
      >
        {c.confidence}
      </span>
    ),
  },
  {
    // 세 칸을 만들면 표가 열세 칸이 된다. 자리 순서로 압축하되 색만으로 가르지 않는다 —
    // 채운 원/빈 원으로 모양을 다르게 하고, 낱개마다 title로 누구 설문인지 적는다
    key: "surveys",
    head: "설문(학부모·교사)",
    width: "8.5rem",
    nowrap: true,
    // 걷힌 것의 이름을 값으로 준다. 개수(숫자)로 두면 검색창의 「3」이 온 표에 걸린다
    value: (c) => collected(c) || "없음",
    cell: (c) => (
      <span className="a2-mono inline-flex items-center gap-1" aria-label={`설문 ${collected(c) || "없음"}`}>
        {SURVEYS.map((s) => {
          const on = c.surveys[s.key];
          return (
            <span
              key={s.key}
              aria-hidden
              title={`${s.label} 설문 ${on ? "제출" : "미제출"}`}
              style={{ color: on ? "var(--a2-ink)" : "var(--a2-ink-4)" }}
            >
              {on ? "●" : "○"}
            </span>
          );
        })}
      </span>
    ),
  },
  {
    key: "reviewer",
    head: "검토자",
    width: "5.5rem",
    nowrap: true,
    // 미배정도 값으로 넣는다 — 검색창에 「미배정」을 쳐도 걸리고, 정렬하면 한곳에 뭉친다
    value: (c) => c.reviewer ?? "미배정",
    cell: (c) => c.reviewer ?? <span className="text-(--a2-ink-4)">미배정</span>,
  },
  {
    key: "updatedAt",
    head: "갱신",
    width: "6.5rem",
    nowrap: true,
    hide: "md",
    value: (c) => c.updatedAt,
    cell: (c) => <span className="a2-mono a2-t-sm text-(--a2-ink-3)">{c.updatedAt}</span>,
  },
  {
    // 정렬 화살표가 설 이유가 없어 value를 주지 않는다
    key: "open",
    head: "동작",
    width: "4.5rem",
    nowrap: true,
    // ⚠ 케이스 상세(EXP-08)가 아직 없어 지금은 자리만 잡아 둔다. 붙일 때 이 버튼을
    //   /admin2/queue/[id] 링크로 바꾸면 된다. hover에서만 나타나게 두지 않는다
    cell: () => (
      <button type="button" className="a2-btn a2-btn-sm" title="케이스 상세 열기">
        열기
      </button>
    ),
  },
];

/* 상태는 머리의 탭이 맡는다(QueueView). 같은 조건을 두 군데서 걸면 서로 부딪친다 */
const FILTERS: Filter<GradingCase>[] = [
  {
    // 「75 이상만」은 두지 않는다. 이 화면에서 아무도 찾지 않는 묶음이라 차림표만 길어진다
    id: "confidence",
    label: "신뢰도",
    options: [{ value: "low", label: `${LOW} 미만` }],
    match: (c, v) => (v === "low" ? c.confidence < LOW : true),
  },
  {
    id: "reviewer",
    label: "검토자",
    options: [
      { value: "unassigned", label: "미배정" },
      { value: "assigned", label: "배정됨" },
    ],
    match: (c, v) => (v === "unassigned" ? !c.reviewer : Boolean(c.reviewer)),
  },
];

export default function QueueTable({ rows, empty }: { rows: GradingCase[]; empty: string }) {
  return (
    <DataTable
      rows={rows}
      cols={COLS}
      getKey={(c) => c.id}
      filters={FILTERS}
      searchHint="케이스·응시번호·기관·사유"
      empty={empty}
      // 줄 수는 끈다 — 탭의 개수 알약과 쪽 넘김 줄이 이미 같은 수를 적는다
      showCount={false}
    />
  );
}
