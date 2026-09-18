"use client";

import { useMemo } from "react";
import { subjects, type SubjectId } from "./exam";
import { archivedRounds, availabilityOf, type Availability } from "./examCatalog";
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
  subjects: CatalogSubject[];
};

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
        subjects: subjects.map((s) => ({ id: s.id, name: s.short, minutes: s.limitMin })),
      }));

    return [...live, ...past].sort((a, b) => b.opensOn.localeCompare(a.opensOn));
  }, [plans, rounds, config]);
}
