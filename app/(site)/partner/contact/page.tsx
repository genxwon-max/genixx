import type { Metadata } from "next";
import InquiryForm from "@/components/InquiryForm";
import SubHero from "@/components/site/SubHero";
import { Chapter, Rows, Steps } from "@/components/site/Article";

export const metadata: Metadata = {
  title: "기관 도입 문의",
  description: "교육청·학교·학원·영재교육원 대상 도입 문의. (PUB-07-1)",
};

const benefits = [
  {
    t: "학급·학년 집단 리포트",
    d: "학급·학년 단위로 분포와 강한 영역을 봅니다. 인원이 너무 적은 집단은 누구인지 짐작할 수 없도록 통계를 내지 않습니다.",
  },
  {
    t: "교사 관찰 설문",
    d: "담당 교사가 관찰 설문 12문항을 입력하면, 학생·학부모 응답에 교사의 눈이 더해져 여러 방향에서 교차 확인할 수 있습니다.",
  },
  {
    t: "응시권·일정 관리",
    d: "응시권 구매·배정·회수, 고사실 배정, 응시 진행 상황 확인을 기관 전용 화면에서 합니다.",
  },
  {
    t: "동의 범위 준수",
    d: "학생 개인 상세 데이터는 학부모가 동의한 범위 안에서만 열람할 수 있습니다.",
  },
];

const steps = [
  { t: "문의 접수", d: "아래 양식으로 기관 정보와 대상 인원을 알려 주세요." },
  { t: "사전 협의", d: "담당자가 1~2 영업일 안에 연락드려 일정과 범위를 협의합니다." },
  {
    t: "시범 운영",
    d: "한 학급 규모로 먼저 운영하며 문항이 아이들에게 잘 읽히는지, 진행 순서에 막힘이 없는지 점검합니다.",
  },
  { t: "정식 도입", d: "응시권 배정과 교사 계정 승인 후 회차 단위로 운영합니다." },
];

export default function PartnerContactPage() {
  return (
    <>
      <SubHero
        href="/partner/contact"
        title="기관 도입 문의"
        lead="교육청·학교·학원·영재교육원 단위로 도입할 수 있습니다. 파일럿 참여 기관에는 집단 리포트를 무상으로 제공합니다."
      />

      <div className="container-x section-y">
        <Chapter no="01" title="도입하면 달라지는 것">
          <Rows items={benefits} />
        </Chapter>

        <Chapter no="02" title="도입 절차" lead="문의부터 정식 운영까지 네 단계입니다.">
          <Steps items={steps} />
        </Chapter>

        <Chapter
          no="03"
          title="도입 문의하기"
          lead="기관명과 대상 학년·인원을 함께 적어 주시면 상담이 빠릅니다."
        >
          <InquiryForm
            categories={[
              "학교 도입 문의",
              "교육청·지자체 사업 문의",
              "학원·영재교육원 문의",
              "집단 리포트 문의",
              "기타 제휴 제안",
            ]}
            orgLabel="기관명"
            submitLabel="도입 문의 접수하기"
          />
        </Chapter>
      </div>
    </>
  );
}
