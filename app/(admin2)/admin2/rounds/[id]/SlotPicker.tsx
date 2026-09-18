"use client";

import type { GradeBand } from "@/lib/blueprint";
import { useForms } from "@/lib/formStore";
import type { ItemDraft } from "@/lib/itemStore";
import PlanPicker from "@/components/admin2/PlanPicker";
import { FormRow, Panel } from "@/components/admin2/ui";

/**
 * 이 회차의 편성을 다시 정한다 — 학년과 평가 과목.
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
 *
 * ⚠ 고른 것을 저장소에 바로 쓰지 않는다. 회차 편성 화면이 기간·공지와 함께 한 초안으로
 *   들고 있다가 저장을 누를 때 함께 나간다 — 화면 하나에 저장이 셋이면 무엇이 저장된
 *   상태인지가 판마다 달라진다.
 */
export default function SlotPicker({
  value,
  onChange,
  locked,
  round,
}: {
  value: { band: GradeBand; subjects: ItemDraft["subject"][] };
  onChange: (next: { band: GradeBand; subjects: ItemDraft["subject"][] }) => void;
  locked: boolean;
  /** 담긴 문항 수를 세는 데만 쓴다 */
  round: string;
}) {
  const forms = useForms();

  /* 그 과목·학년에 담긴 문항 수 — 뺄 때 무엇을 잃는지(잃지는 않지만) 알려 주는 값 */
  const pickedOf = (subject: string, band: string) =>
    forms.find((f) => f.round === round && f.subject === subject && f.band === band)?.itemIds.length ?? 0;

  return (
    <Panel title="평가 과목 편성" flush>
      {/* 잠긴 회차도 같은 두 줄로 적는다 — 고칠 수 있을 때와 없을 때 칸이 다른 자리에
          서면, 잠겼다는 사실보다 화면이 바뀌었다는 것이 먼저 읽힌다 */}
      <div className="a2-form">
        {locked ? (
          <>
            <FormRow label="학년">
              <span className="a2-t-sm text-(--a2-ink-2)">
                {value.band === "3-4" ? "초등 3·4학년" : "초등 5·6학년"}
              </span>
            </FormRow>
            <FormRow
              label="평가 과목"
              hint="응시가 시작된 뒤에는 편성을 바꾸지 못합니다 — 아이마다 다른 검사지를 받게 됩니다."
            >
              <span className="a2-t-sm text-(--a2-ink-2)">{value.subjects.join(" · ") || "과목 없음"}</span>
            </FormRow>
          </>
        ) : (
          <PlanPicker
            band={value.band}
            subjects={value.subjects}
            pickedOf={pickedOf}
            onChange={onChange}
          />
        )}
      </div>
    </Panel>
  );
}
