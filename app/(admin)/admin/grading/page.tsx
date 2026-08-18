import { redirect } from "next/navigation";

/**
 * 옛 「채점·판정 큐」 주소.
 *
 * 정의서 9장은 이 일을 채점 워크벤치(EXP-04)와 판정 협진(EXP-07) 둘로 갈라 둔다.
 * 한 화면에 뭉쳐 두면 판정을 확정하는 자리가 두 곳이 되어, 어느 쪽 값이 맞는지 알 수
 * 없게 된다. 이 주소는 협진으로 보낸다 — 링크를 눌렀는데 없는 화면이 나오면 쓰는
 * 사람은 자기가 잘못 눌렀다고 여긴다.
 */
export default function GradingPage() {
  redirect("/admin/conference");
}
