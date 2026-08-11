import { redirect } from "next/navigation";

/** /my 는 자녀 프로필을 기본 화면으로 삼는다 (사이트맵 12장 URL 규칙: 회원=/my) */
export default function MyPage() {
  redirect("/my/children");
}
