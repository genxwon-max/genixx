import type { Metadata } from "next";
import GuardianConsent from "@/components/account/GuardianConsent";

export const metadata: Metadata = {
  title: "법정대리인 동의",
  description:
    "만 14세 미만 학생의 개인정보 수집·이용에 법정대리인이 직접 동의하는 화면입니다. (ACC-03-1)",
  robots: { index: false, follow: false },
};

/**
 * ACC-03-1 법정대리인 동의 — 문자·알림톡으로 받은 링크가 도착하는 자리.
 *
 * ?req= 토큰으로만 열린다. 요청을 만든 학생이나 기관이 이 화면을 대신 열어 동의를
 * 누를 수 없도록, 화면 안에서 본인확인을 한 번 더 거친다.
 */
export default async function GuardianConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ req?: string }>;
}) {
  const { req } = await searchParams;
  return <GuardianConsent reqId={req} />;
}
