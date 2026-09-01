"use client";

import Link from "next/link";
import { useMemo } from "react";
import DataTable, { type Col, type Filter } from "@/components/admin2/DataTable";
import { Bar, Status } from "@/components/admin2/ui";
import { roundStates, type Round, type RoundState } from "@/lib/admin";
import { n, pct, roundTone } from "@/lib/admin2";
import { useForms } from "@/lib/formStore";
import { planOf, usePlans, useRounds } from "@/lib/roundPlanStore";

/**
 * ADM-05 회차 표.
 *
 * 지금 회차는 넷뿐이라 손으로 그려도 되지만 공용 표(DataTable)를 쓴다. 회차는 분기마다
 * 한 줄씩 쌓이는 목록이라 두 해면 여덟, 다섯 해면 스무 줄이 된다.
 *
 * 상태와 기간은 **씨앗이 아니라 편성 기록에서 읽는다**(lib/roundPlanStore.ts). 처음에는
 * lib/admin.ts의 값을 그대로 그렸는데, 편성 화면에서 회차를 열고 목록으로 돌아오면
 * 목록만 여전히 「준비중」이라고 말했다. 회차를 열고 닫고 기간을 고치는 자리가 편성
 * 화면 하나뿐이므로, 목록은 그 결과를 비추기만 한다.
 *
 * ⚠ 이 표에는 열기·마감 단추를 두지 않는다. 되돌리기 어려운 동작은 무엇이 걸려 있는지
 *   (확정 안 된 검사지·다른 열린 회차)를 함께 보여 주는 자리에서만 눌려야 한다.
 */

const dash = <span className="text-(--a2-ink-4)">—</span>;

const stateOptions = (Object.keys(roundStates) as RoundState[]).map((k) => ({
  value: k,
  label: roundStates[k].label,
}));

export default function RoundsTable() {
  const plans = usePlans();
  const forms = useForms();
  /* 코드에 박힌 넷 + 여기서 만든 회차. 목록이 둘로 갈리면 만든 회차가 표에 안 선다 */
  const allRounds = useRounds();

  /* 거르개는 상태 하나. 씨앗이 아니라 **화면에 그리는 값**으로 거른다 — 「응시
     진행중」을 골랐는데 방금 연 회차가 안 걸리면 거르개가 고장 난 것으로 읽힌다.
     연도별 거르개는 회차 이름과 기간에 연도가 있어 정렬로 갈음된다. */
  const filters: Filter<Round>[] = useMemo(
    () => [
      {
        id: "state",
        label: "상태",
        options: stateOptions,
        match: (r, v) => planOf(plans, r.id).state === v,
      },
    ],
    [plans],
  );

  /*
   * 칸 순서 — 왼쪽은 「어느 회차인가」, 가운데는 「언제 · 무엇이 나가나」, 오른쪽은
   * 「얼마나 왔나」. 진행 셋(제출 → 판정 → 발행)은 실제 일이 흐르는 차례라 왼쪽에서
   * 오른쪽으로 읽으면 그대로 공정이 된다.
   *
   * plans·forms를 읽으므로 컴포넌트 안에서 만든다. 매 렌더마다 새 배열을 넘기면
   * DataTable의 useMemo가 늘 다시 도므로 useMemo로 묶는다.
   *
   * 일부러 뺀 칸 —
   *  · 회차 ID(2026-3): 이름에 연도와 번호가 이미 들어 있다.
   *  · 남은 날짜(D-12): 서버에서 오늘을 세면 브라우저의 오늘과 어긋난다. 날짜만 적는다.
   *  · 미제출 인원: 대상과 제출률에서 바로 나오는 값이다.
   */
  const cols: Col<Round>[] = useMemo(
    () => [
      {
        key: "label",
        head: "회차",
        width: "11rem",
        nowrap: true,
        /* 이름 앞에 연도가 있어 이름순이 사실상 시간순이다 */
        value: (r) => r.label,
        cell: (r) => (
          <Link href={`/admin2/rounds/${r.id}`} className="font-semibold text-(--a2-ink) hover:text-(--a2-accent) hover:underline">
            {r.label}
          </Link>
        ),
      },
      {
        key: "state",
        head: "상태",
        width: "6.5rem",
        nowrap: true,
        /* 정렬하지 않는다 — 준비중·응시·채점중·마감은 크기 순서가 아니라 차례이고,
           그 차례는 기간 순으로 이미 보인다. 고르고 싶으면 위 거르개를 쓴다. */
        cell: (r) => {
          const st = planOf(plans, r.id).state;
          return <Status tone={roundTone[st]}>{roundStates[st].label}</Status>;
        },
      },
      {
        key: "period",
        head: "응시 기간",
        width: "12rem",
        nowrap: true,
        value: (r) => planOf(plans, r.id).opensOn,
        cell: (r) => {
          const p = planOf(plans, r.id);
          return (
            <span className="a2-mono a2-t-sm">
              {p.opensOn} – {p.closesOn}
            </span>
          );
        },
      },
      {
        key: "plan",
        head: "편성",
        width: "7rem",
        nowrap: true,
        cell: (r) => {
          const mine = forms.filter((f) => f.round === r.id);
          const ok = mine.filter((f) => f.state === "confirmed").length;
          return mine.length === 0 ? (
            <Link href={`/admin2/rounds/${r.id}`} className="a2-t-sm text-(--a2-ink-4) hover:text-(--a2-accent) hover:underline">
              아직 없음
            </Link>
          ) : (
            <Link href={`/admin2/rounds/${r.id}`} className="a2-t-sm hover:text-(--a2-accent) hover:underline">
              <span className="a2-num">
                {ok}/{mine.length}
              </span>{" "}
              확정
            </Link>
          );
        },
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
           아니고, 건수는 지금 회차만 위 지표 넉 줄에 적어 두었다. */
        key: "submitted",
        head: "제출",
        width: "8rem",
        nowrap: true,
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
        hide: "md",
        cell: (r) => (r.submitted ? <Bar value={r.graded} total={r.submitted} /> : dash),
      },
      {
        key: "published",
        head: "발행",
        width: "8rem",
        nowrap: true,
        hide: "md",
        cell: (r) => (r.submitted ? <Bar value={r.published} total={r.submitted} /> : dash),
      },
      {
        /* 오른쪽 끝의 관리 칸 — 콘솔의 다른 목록과 같은 자리에 같은 말로 세운다.
           회차 이름에도 링크가 걸려 있지만 그것은 표를 훑다가 눈에 걸린 이름을 바로
           누르는 길이고, 이 단추는 「이 줄을 고친다」가 늘 같은 자리에 있게 하는 것이다 */
        key: "act",
        head: "관리",
        width: "5.5rem",
        nowrap: true,
        cell: (r) => (
          <Link href={`/admin2/rounds/${r.id}`} className="a2-btn a2-btn-sm" aria-label={`${r.label} 수정하기`}>
            수정하기
          </Link>
        ),
      },
    ],
    [plans, forms],
  );

  return (
    <DataTable
      rows={allRounds}
      cols={cols}
      getKey={(r) => r.id}
      filters={filters}
      /* 회차 이름으로 찾는다. 한동안 껐던 것은 넷뿐이라 눈으로 찾는 편이 빨라서인데,
         여기서 회차를 만들 수 있게 되면서 분기마다 한 줄씩 쌓이는 목록이 되었다 */
      searchHint="회차 이름"
      empty="조건에 맞는 회차가 없습니다."
      toolbarExtra={<span className="a2-t-xs text-(--a2-ink-4)">회차 이름을 누르면 편성 화면으로</span>}
    />
  );
}
