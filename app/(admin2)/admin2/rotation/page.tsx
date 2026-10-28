import RotationView from "./RotationView";

export const metadata = { title: "문항 회전" };

/*
 * ADM-04-4 문항 회전 · ADM-04-2 앵커 — 확정된 검사지에서 문항이 몇 번 나갔는지 세고, 한계에 닿은 문항을
 * 한 회차 쉬게 한다. 앵커가 등화에 넉넉한지도 함께 본다.
 *
 * 9월 27일 옛 콘솔(/admin/items/rotation)을 걷어 낼 때 함께 사라졌다가 2026-10-28 다시 세웠다.
 */
export default function Admin2RotationPage() {
  return <RotationView />;
}
