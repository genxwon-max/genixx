import { redirect } from "next/navigation";

/**
 * ACC-04-2 회원 탈퇴였던 자리.
 *
 * 탈퇴는 이제 마이페이지 안에서 끝난다 — 회원정보 맨 끝 「탈퇴하기」 → 정말 탈퇴하시겠어요?
 * → 「탈퇴하기」 → 예/아니오. 예전 주소는 그 두 번째 칸으로 넘긴다.
 */
export default function LeavePage() {
  redirect("/mypage?section=leave");
}
