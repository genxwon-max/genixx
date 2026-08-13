import { redirect } from "next/navigation";

/**
 * ACC-03-1이었던 별도 동의 화면.
 *
 * 동의는 이제 등록 폼 안에 있다. 이 주소를 눌러 둔 자리(북마크·예전 안내 메일)가
 * 있을 수 있으므로 없애지 않고 등록 폼으로 넘긴다.
 */
export default function ChildConsentPage() {
  redirect("/my/children/new");
}
