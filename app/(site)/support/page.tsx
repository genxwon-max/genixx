import type { Metadata } from "next";
import HubPage from "@/components/site/HubPage";

export const metadata: Metadata = {
  title: "고객지원",
  description: "자주 묻는 질문, 1:1 문의, 학부모 설명회 영상 안내.",
};

export default function SupportPage() {
  return (
    <HubPage
      groupId="PUB-06"
      title="무엇을 도와드릴까요?"
      desc="진단·응시·결과 해석·개인정보·결제 다섯 가지 주제로 답변을 정리했습니다. 비회원도 이메일 인증만으로 문의를 남길 수 있습니다."
    />
  );
}
