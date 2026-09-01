"use client";

import Link from "next/link";
import { roundStates } from "@/lib/admin";
import { roundTone } from "@/lib/admin2";
import { planOf, useCurrentRound, usePlans } from "@/lib/roundPlanStore";
import { Body, PageHead, SeedNote, Status } from "@/components/admin2/ui";
import RoundsTable from "./RoundsTable";

/**
 * ADM-05 평가 회차.
 *
 * 이 화면은 회차 목록 하나다. 답하는 것도 하나 — 「어느 회차를 손대야 하나」.
 *
 * 한동안 위에 지표 넉 줄(대상·제출·판정·발행)과 오른쪽에 「이번 회차」 요약을 세워 두었다.
 * 둘 다 뺐다. 지금 회차 하나만 크게 세우는 자리인데, 이 화면에 오는 까닭은 대개 **다른**
 * 회차를 열거나 새로 만들려는 것이었다. 지금 회차의 진행은 대시보드가 이미 그 일을 하고,
 * 이 회차에 무엇이 나가는지는 편성 화면이 훨씬 자세히 답한다 — 같은 값을 세 곳에서 세면
 * 셋이 갈리는 날이 온다. 머리에는 지금 회차의 이름·기간·상태 한 줄만 남긴다.
 *
 * 화면 전체가 클라이언트다. 회차 상태·기간·편성이 브라우저 저장소에 있어(lib/
 * roundPlanStore.ts) 서버에서 읽으면 씨앗값만 나오기 때문이다. 예전에는 표만 살아 있는
 * 값을 그리고 머리는 씨앗을 그려서, 회차를 연 직후 같은 화면 안에서 「응시 진행중」과
 * 「준비중」이 함께 서 있었다.
 */
export default function RoundsView() {
  const plans = usePlans();

  const r = useCurrentRound();
  const plan = planOf(plans, r.id);

  return (
    <>
      <PageHead
        title="평가 회차"
        meta={
          <>
            <span>{r.label}</span>
            <span aria-hidden>·</span>
            <span className="a2-mono">
              {plan.opensOn} – {plan.closesOn}
            </span>
            <span aria-hidden>·</span>
            <Status tone={roundTone[plan.state]}>{roundStates[plan.state].label}</Status>
          </>
        }
        actions={
          <>
            <Link href="/admin2/forms" className="a2-btn">
              평가별 문항관리
            </Link>
            {/* 만드는 일은 목록 위에서 판을 펼치지 않고 제 주소로 간다(ADM-05-1).
                「이번 회차 편성」은 뺐다 — 이 화면에 오는 까닭은 대개 다른 회차를 열려는
                것이고, 지금 회차로 가는 길은 표의 수정하기가 이미 낸다 */}
            <Link href="/admin2/rounds/new" className="a2-btn a2-btn-primary">
              회차 생성
            </Link>
          </>
        }
      />

      <Body>
        <RoundsTable />
      </Body>
      <SeedNote>
        대상 · 제출 · 판정 · 발행 숫자는 화면 설계를 위한 예시입니다(lib/admin.ts). 상태 · 기간 · 편성 칸은 이
        브라우저에 저장된 편성 기록에서 읽고, 여기서 만든 회차도 이 브라우저에만 남습니다.
      </SeedNote>
    </>
  );
}
