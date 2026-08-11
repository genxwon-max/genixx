import type { Metadata } from "next";
import HubPage from "@/components/site/HubPage";

export const metadata: Metadata = {
  title: "파트너·채널",
  description: "학교·학원·교육청 도입 문의와 인증 해석 전문가 과정 안내.",
};

export default function PartnerPage() {
  return (
    <HubPage
      groupId="PUB-07"
      title={
        <>
          학교와 기관에서
          <br />
          함께 쓰는 진단
        </>
      }
      desc="학급·학년 단위 집단 리포트와 교사 관찰 설문을 제공합니다. 개인 상세 데이터는 학부모 동의 범위 안에서만 열람하며, 기본 제공은 비식별 집단 통계로 한정합니다."
    />
  );
}
