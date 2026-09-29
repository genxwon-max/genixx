import { redirect } from "next/navigation";

/**
 * ACC-01-1a 만 14세 미만 학생의 법정대리인 동의 요청이었던 자리.
 *
 * 만 14세 미만은 보호자가 학부모로 가입해 자녀를 등록하는 길 하나로 모았다. 법정대리인
 * 동의는 그 학부모 가입에서 본인인증과 함께 받는다. 예전 주소는 학부모 가입으로 넘긴다.
 */
export default function SignupGuardianPage() {
  redirect("/signup/type?stage=method&type=parent");
}
