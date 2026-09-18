import type { Metadata } from "next";
import SubHero from "@/components/site/SubHero";
import { Aside, Chapter, NextStep, Rows } from "@/components/site/Article";

const title = "요금 안내";
const lead =
  "2026 파일럿 회차는 전면 무료로 운영합니다. 정식 서비스 요금은 파일럿 종료 후 확정해 공지합니다.";

export const metadata: Metadata = { title, description: lead };

/**
 * PUB-03-5 — 금액은 아직 없다. 정식 서비스에서 고를 수 있는 모양만 알리고,
 * 지금은 무료라는 말을 가장 먼저 읽히게 둔다.
 * (결제 화면·콘솔이 「파일럿은 무료」를 이 화면 기준으로 맞춘다 — PaymentForm, admin2)
 */
export default function PricingPage() {
  return (
    <>
      <SubHero href="/service/pricing" title={title} lead={lead} />

      <div className="container-x section-y">
        <Chapter
          no="01"
          title="정식 서비스 이용 방식"
          lead="파일럿이 끝난 뒤 고를 수 있는 세 가지 방식입니다. 금액은 확정되는 대로 이 화면에 알려 드립니다."
        >
          <Rows
            term="7rem"
            items={[
              { t: "단품", d: "재능진단 리포트 1회", aside: "회차 단위" },
              { t: "패키지", d: "재능진단과 전문가 해석 상담", aside: "상담 1회 포함" },
              {
                t: "구독",
                d: "1년에 4번 이어서 진단하고 성장 그래프(G-Graph)로 변화를 봅니다",
                aside: "연 4회",
              },
            ]}
          />
          <Aside>학교·교육청 같은 기관은 따로 정한 할인 구조로 운영합니다.</Aside>
        </Chapter>

        <NextStep
          text="기관 단위 도입은 파트너 메뉴에서 접수합니다."
          href="/partner/contact"
          label="기관 도입 문의"
        />
      </div>
    </>
  );
}
