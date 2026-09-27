"use client";

import { useMemo } from "react";
import { subjects, type SubjectId } from "./exam";
import { archivedRounds, availabilityOf, type Availability } from "./examCatalog";
import { orderWon } from "./orderStore";
import { periodOf, planOf, subjectsFor, usePlans, useRounds } from "./roundPlanStore";
import { useExamConfig } from "./roundStore";

/**
 * 응시 존이 그리는 회차 — 관리자 회차 편성을 학생 말로 옮긴 것.
 *
 * 상태와 기간은 편성 저장분(planOf)에서 읽는다. 회차 목록(useRounds)의 state는 코드에
 * 박힌 씨앗이라, 관리자가 열고 닫은 결과가 거기에는 안 들어온다.
 *
 * 과목은 편성에서 정한 **차례 그대로** 세우고, 제한 시간은 응시 화면이 실제로 쓰는 값
 * (lib/roundStore.ts)을 적는다. 카드에 40분이라 적어 놓고 응시 화면이 45분을 주면 아이는
 * 어느 쪽을 믿어야 할지 모른다. 이번 회차에서 끈 과목은 뺀다.
 *
 * 응시료도 편성 저장분에서 읽는다. 값의 주인은 **회차**다 — 상품 차림표(PAY-01)에 응시권을
 * 한 줄 세워 두면 회차가 넷일 때 상품도 넷이 되고, 어느 상품이 어느 회차의 것인지를 이름으로
 * 맞춰야 한다. 학생·보호자 화면 셋(접수 목록 · 접수 확인 창 · 결제)이 모두 이 값을 읽는다.
 *
 * 지난 해 평가(archivedRounds)는 뒤에 잇는다. 이미 끝난 평가라 과목과 시간은 검사 기본값
 * 으로 적는다 — 지금 회차 설정을 적으면 그때와 다른 시간이 지난 평가에 붙는다.
 *
 * 최신 회차가 앞에 온다.
 */

export type CatalogSubject = { id: SubjectId; name: string; minutes: number };

/**
 * 한 시기 — 이 안에 학년마다 평가가 하나씩 선다(「2026 3-1 평가」 · 「2026 3-2 평가」 …).
 * 학생 화면에 부르는 이름은 evalName(lib/examCatalog.ts)이 짓는다.
 */
export type CatalogRound = {
  id: string;
  /** 관리자가 붙인 이름 — 시기 번호 꼴이 아닌 회차의 평가 이름에만 쓴다 */
  label: string;
  availability: Availability;
  opensOn: string;
  closesOn: string;
  /** 응시료 정가 (원). 0이면 무료 회차다 */
  price: number;
  /** 할인가. 없으면 정가 그대로 받는다 */
  salePrice: number | null;
  subjects: CatalogSubject[];
};

/** 실제로 내는 값 — 할인가가 있으면 그것, 없으면 정가 */
export const examFee = (r: CatalogRound) => r.salePrice ?? r.price;

/** 「무료」 · 「39,000원」 — 목록·창·결제가 같은 글자를 쓴다 */
export const examFeeText = (r: CatalogRound) => orderWon(examFee(r));

/** 할인 중인가 — 그때만 정가를 함께 적는다 */
export const examDiscounted = (r: CatalogRound) =>
  r.salePrice != null && r.price > 0 && r.salePrice < r.price;

export function useCatalogRounds(): CatalogRound[] {
  const plans = usePlans();
  const rounds = useRounds();
  const config = useExamConfig();

  return useMemo(() => {
    const live: CatalogRound[] = rounds.map((r) => {
      const plan = planOf(plans, r.id);
      const period = periodOf(plan);
      return {
        id: r.id,
        label: r.label,
        availability: availabilityOf(plan.state),
        opensOn: period.opensOn,
        closesOn: period.closesOn,
        price: plan.price ?? 0,
        salePrice: plan.salePrice ?? null,
        subjects: subjectsFor(plan).flatMap((name) => {
          const s = subjects.find((x) => x.short === name);
          return s && config.enabled[s.id]
            ? [{ id: s.id, name: s.short, minutes: config.limits[s.id] }]
            : [];
        }),
      };
    });

    const past: CatalogRound[] = archivedRounds
      .filter((a) => !live.some((r) => r.id === a.id))
      .map((a) => ({
        id: a.id,
        label: a.id,
        availability: "ended",
        opensOn: a.opensOn,
        closesOn: a.closesOn,
        /* 지난 평가의 값은 남아 있지 않다. 지금 값을 적으면 그때 낸 값과 다른 값이 지난
           평가에 붙으므로 0으로 두고, 접수가 막혀 있어 낼 일도 없다 */
        price: 0,
        salePrice: null,
        subjects: subjects.map((s) => ({ id: s.id, name: s.short, minutes: s.limitMin })),
      }));

    return [...live, ...past].sort((a, b) => b.opensOn.localeCompare(a.opensOn));
  }, [plans, rounds, config]);
}
