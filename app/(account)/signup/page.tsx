import { redirect } from "next/navigation";

/**
 * ACC-01 회원가입.
 * 원본 디자인(3b)이 회원 유형 선택과 가입 수단 선택을 STEP 1 한 화면에 묶었으므로,
 * 별도 입구를 두지 않고 곧바로 STEP 1로 보낸다.
 */
export default function SignupPage() {
  redirect("/signup/type");
}
