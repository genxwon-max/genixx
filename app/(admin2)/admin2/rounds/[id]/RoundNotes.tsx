"use client";

import { noteOf, setRoundNotes, type RoundPlan } from "@/lib/roundPlanStore";
import NoteField from "@/components/admin2/NoteField";
import { Panel } from "@/components/admin2/ui";

/**
 * 이 회차에만 붙는 공지와 유의사항 — 글과 그림.
 *
 * 회차 생성(ADM-05-1)에서 적은 것을 여기서 고친다. 만들 때만 적을 수 있으면 오탈자 하나에
 * 회차를 다시 만들어야 한다.
 *
 * 검사 전체의 유의사항(lib/exam.ts)과 갈라 둔다. 저쪽은 회차가 바뀌어도 같은 말이고 이쪽은
 * 「이번 회차는 서술형 첨부 제출을 30분 더 받습니다」처럼 그 회차에서만 참인 말이다. 한 칸에
 * 담으면 회차마다 검사 전체 유의사항을 다시 적게 된다.
 *
 * 고치는 즉시 저장한다. 저장 단추를 두지 않는 까닭은 이 콘솔의 다른 고치는 칸과 같다 —
 * 저장하기 전에 다른 화면으로 넘어갔을 때 그 값이 어디로 갔는지 설명할 자리가 없다.
 */
export default function RoundNotes({ plan, locked }: { plan: RoundPlan; locked: boolean }) {
  const notice = noteOf(plan.notice);
  const caution = noteOf(plan.caution);

  return (
    <Panel title="회차 공지" meta="이 회차에만 붙는 말 · 그림 첨부" className="mt-3">
      <div className="grid gap-3">
        <NoteField
          label="회차 공지"
          value={notice}
          disabled={locked}
          placeholder="이 회차에만 해당하는 안내를 적습니다."
          onChange={(v) => setRoundNotes(plan.round, { notice: v, caution })}
        />
        <NoteField
          label="회차 유의사항"
          value={caution}
          disabled={locked}
          placeholder="이 회차에서만 조심할 것을 적습니다."
          onChange={(v) => setRoundNotes(plan.round, { notice, caution: v })}
          hint={
            locked
              ? "마감된 회차입니다. 지나간 회차의 공지를 고치면 그때 받은 안내와 기록이 달라집니다."
              : "검사 전체의 유의사항과 다릅니다 — 저쪽은 회차가 바뀌어도 같은 말입니다."
          }
        />
      </div>
    </Panel>
  );
}
