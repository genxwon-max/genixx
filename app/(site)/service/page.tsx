import type { Metadata } from "next";
import HubPage from "@/components/site/HubPage";

export const metadata: Metadata = {
  title: "진단 서비스 안내",
  description: "무료 학력진단에서 재능진단·심화진단·성장추적까지 이어지는 4단계 서비스 사다리.",
};

export default function ServicePage() {
  return (
    <HubPage
      groupId="PUB-03"
      title={
        <>
          무료 학력진단에서 시작해
          <br />
          성장 좌표까지
        </>
      }
      desc="먼저 국어·수학·과학 3과목으로 현재 위치를 확인하고, 필요하면 재능진단으로 넘어갑니다. 성적과 재능은 서로 다른 축이므로 각각 따로 측정합니다."
    />
  );
}
