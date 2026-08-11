import type { Metadata } from "next";
import HubPage from "@/components/site/HubPage";
import BrandMeaning from "@/components/site/BrandMeaning";

export const metadata: Metadata = {
  title: "GENIXX 소개",
  description:
    "우리가 무엇을 재능이라 부르고, AI와 교육전문가가 어떻게 함께 그것을 확인하는지 설명합니다.",
};

export default function AboutPage() {
  return (
    <>
      <HubPage
        groupId="PUB-02"
        title={
          <>
            재능은 등급이 아니라
            <br />
            드러나는 조건의 문제입니다
          </>
        }
        desc="GENIXX는 8개 재능 영역과 4단계 처리위계를 좌표로 삼아, 아이가 어떤 조건에서 몰입하는지를 확인합니다. AI가 1차로 분석하고 교육전문가가 협진으로 확정합니다."
      />
      <BrandMeaning tone="muted" />
    </>
  );
}
