import { redirect } from "next/navigation";

/**
 * ACC-03-4 동의 철회·데이터 파기 요청이었던 자리.
 *
 * 요청은 이제 마이페이지의 「자료 파기 요청」에서 한다. 예전 주소는 그 칸으로 넘긴다.
 */
export default function WithdrawPage() {
  redirect("/mypage?section=withdraw");
}
