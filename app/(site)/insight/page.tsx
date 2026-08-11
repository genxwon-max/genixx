import type { Metadata } from "next";
import HubPage from "@/components/site/HubPage";

export const metadata: Metadata = {
  title: "콘텐츠 허브",
  description: "재능 영역별 해설, 양육 가이드, 연구노트와 공지를 모았습니다.",
};

export default function InsightPage() {
  return (
    <HubPage
      groupId="PUB-05"
      title={
        <>
          진단 결과를 기다리는 동안
          <br />
          읽어두면 좋은 이야기
        </>
      }
      desc="재능 영역별 해설과 가정에서 만들 수 있는 발현 조건, 그리고 우리가 공개하는 연구 지표를 정리했습니다."
    />
  );
}
