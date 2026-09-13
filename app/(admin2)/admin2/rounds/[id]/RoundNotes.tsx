"use client";

import type { RoundNote } from "@/lib/roundPlanStore";
import BodyEditor from "@/components/admin2/BodyEditor";
import { FormRow, Panel } from "@/components/admin2/ui";

/**
 * 이 회차에만 붙는 공지와 유의사항 — 글 · 마크다운 · HTML · 그림.
 *
 * 회차 생성(ADM-05-1)에서 적은 것을 여기서 고친다. 만들 때만 적을 수 있으면 오탈자 하나에
 * 회차를 다시 만들어야 한다.
 *
 * 검사 전체의 유의사항(lib/exam.ts)과 갈라 둔다. 저쪽은 회차가 바뀌어도 같은 말이고 이쪽은
 * 「이번 회차는 서술형 첨부 제출을 30분 더 받습니다」처럼 그 회차에서만 참인 말이다.
 *
 * ── 제 저장 줄을 들지 않는다 ──
 * 한동안 이 판만 제 초안과 저장 줄을 들고 있었다. 그러면 한 화면에서 공지는 저장을 눌러야
 * 나가고 기간·편성은 각자 제 단추로 나가, 「지금 무엇이 저장된 상태인가」가 판마다 달랐다.
 * 지금은 회차 편성 화면(ADM-05-4)이 기간·편성·공지를 **한 초안으로 들고 한 번에 저장한다.**
 * 이 조각은 값을 받아 그리고 고친 것을 되돌려 줄 뿐이다.
 */
export default function RoundNotes({
  value,
  onChange,
  locked,
}: {
  value: { notice: RoundNote; caution: RoundNote };
  onChange: (next: { notice: RoundNote; caution: RoundNote }) => void;
  locked: boolean;
}) {
  return (
    <Panel title="회차 공지" flush>
      <div className="a2-form">
        <FormRow label="회차 공지">
          <BodyEditor
            /* 라디오 묶음 이름은 화면 안에서 겹치면 안 된다 — 겹치면 공지에서 마크다운을
               고르는 순간 유의사항의 갈래가 꺼진다 */
            name="round-notice-mode"
            value={value.notice}
            disabled={locked}
            rows={5}
            placeholder="이 회차에만 해당하는 안내를 적습니다."
            onChange={(patch) => onChange({ ...value, notice: { ...value.notice, ...patch } })}
          />
        </FormRow>

        <FormRow
          label="회차 유의사항"
          /* 마감된 회차만 짚어 준다 — 지나간 회차의 공지를 고치는 것은 되돌리기 어렵다 */
          hint={
            locked
              ? "마감된 회차입니다. 지나간 회차의 공지를 고치면 그때 받은 안내와 기록이 달라집니다."
              : undefined
          }
        >
          <BodyEditor
            name="round-caution-mode"
            value={value.caution}
            disabled={locked}
            rows={5}
            placeholder="이 회차에서만 조심할 것을 적습니다."
            onChange={(patch) => onChange({ ...value, caution: { ...value.caution, ...patch } })}
          />
        </FormRow>
      </div>
    </Panel>
  );
}
