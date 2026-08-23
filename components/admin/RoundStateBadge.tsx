"use client";

import { roundStates } from "@/lib/admin";
import { planOf, usePlans } from "@/lib/roundPlanStore";
import { Badge } from "./Parts";

/**
 * 회차가 어디쯤 왔는지 알리는 딱지.
 *
 * lib/admin.ts의 회차 목록에 적힌 상태를 그대로 쓰지 않는다. 그 값은 **씨앗**이고,
 * 실제로 열고 닫은 결과는 편성 기록(roundPlanStore)에 남는다. 두 군데를 따로 읽으면
 * 회차 편성에서는 「채점중」인 회차가 응시 현황에서는 「응시 진행중」으로 보인다 —
 * 같은 회차를 두 화면이 다르게 부르는 순간, 어느 쪽이 맞는지 사람이 확인할 방법이
 * 없다.
 */
export default function RoundStateBadge({ id }: { id: string }) {
  return <Badge {...roundStates[planOf(usePlans(), id).state]} />;
}
