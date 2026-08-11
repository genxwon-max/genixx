import type { Metadata } from "next";
import HubPage from "@/components/site/HubPage";

export const metadata: Metadata = {
  title: "샘플 리포트 전체 공개",
  description: "실제 발행되는 리포트 전 페이지를 가입 전에 공개합니다.",
};

export default function SamplePage() {
  return (
    <HubPage
      groupId="PUB-04"
      title={
        <>
          결과지를 먼저 보고
          <br />
          결정하셔도 됩니다
        </>
      }
      desc="무엇을 받게 되는지 모르는 상태로 결정하지 않으셔도 됩니다. 실제 리포트 전 페이지를 그대로 공개하고, 대시보드는 읽기 전용 데모로 직접 조작해 볼 수 있습니다."
    />
  );
}
