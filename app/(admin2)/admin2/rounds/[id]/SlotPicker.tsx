"use client";

import { gradeBands } from "@/lib/blueprint";
import { n } from "@/lib/admin2";
import { useAdminPrefs } from "@/lib/adminStore";
import { useForms } from "@/lib/formStore";
import { bandFor, setRoundPlan, subjectsFor, type RoundPlan } from "@/lib/roundPlanStore";
import PlanPicker from "@/components/admin2/PlanPicker";
import { Panel } from "@/components/admin2/ui";

/**
 * 이 회차의 편성을 다시 정한다 — 학년군과 평가 과목.
 *
 * 회차를 만들 때 고른 것을 나중에 고치는 자리다. 「이번엔 과학도 넣기로 했다」가 실제로
 * 생기고, 그때 회차를 새로 만들게 하면 이미 짜 둔 검사지가 따라오지 않는다.
 *
 * ── 이미 담긴 과목을 빼는 것 ──
 * 막지 않는다. 대신 **검사지를 지우지 않는다** — 뺐다가 다시 넣으면 짜 두었던 것이 그대로
 * 돌아온다. 빼기 전에 그 과목에 몇 문항이 담겨 있는지 묻는다(PlanPicker). 「과목을 뺐더니
 * 열 문항이 사라졌다」는 되돌릴 수 없는 일이라, 되돌릴 수 있게 만들어 두고 그 사실을
 * 화면에 적는 편이 낫다.
 *
 * 회차가 열린 뒤에는 잠근다. 응시가 시작된 회차에서 편성을 바꾸면 이미 시험을 본 아이와
 * 그 뒤에 보는 아이가 다른 검사지를 받는다.
 */
export default function SlotPicker({ plan, locked }: { plan: RoundPlan; locked: boolean }) {
  const prefs = useAdminPrefs();
  const forms = useForms();

  const band = bandFor(plan);
  const subjects = subjectsFor(plan);

  /* 그 과목·학년군에 담긴 문항 수 — 뺄 때 무엇을 잃는지(잃지는 않지만) 알려 주는 값 */
  const pickedOf = (subject: string, band: string) =>
    forms.find((f) => f.round === plan.round && f.subject === subject && f.band === band)?.itemIds.length ?? 0;

  return (
    <Panel
      title="평가 과목 편성"
      meta={`검사지 ${n(subjects.length)}벌 · ${gradeBands.find((g) => g.id === band)?.label}`}
      className="mt-3"
    >
      {locked ? (
        <>
          <p className="a2-t-sm text-(--a2-ink-2)">
            {subjects.join(" · ") || "과목 없음"} / {gradeBands.find((g) => g.id === band)?.label}
          </p>
          <p className="a2-hint">
            응시가 시작된 뒤에는 편성을 바꾸지 못합니다 — 아이마다 다른 검사지를 받게 됩니다.
          </p>
        </>
      ) : (
        <PlanPicker
          band={band}
          subjects={subjects}
          pickedOf={pickedOf}
          onChange={(next) => setRoundPlan(plan.round, next, prefs.staffName || "운영자")}
        />
      )}
    </Panel>
  );
}
