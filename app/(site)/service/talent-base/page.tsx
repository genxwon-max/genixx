import type { Metadata } from "next";
import SubHero from "@/components/site/SubHero";
import { Aside, Chapter, Rows } from "@/components/site/Article";

const title = "재능진단 1단계";
const lead =
  "지필 검사, 상황판단(SJT), 학생·학부모 설문, 면담을 교차해 재능이 어떤 조건에서 드러나는지 확인합니다.";

export const metadata: Metadata = { title, description: lead };

/** PUB-03-2 — 무엇을 얼마 동안 하는지를 시간표처럼 읽게 한다 */
export default function TalentBasePage() {
  return (
    <>
      <SubHero href="/service/talent-base" title={title} lead={lead} />

      <div className="container-x section-y">
        <Chapter
          no="01"
          title="구성과 소요 시간"
          lead="아이가 푸는 두 번의 세션과 보호자 설문, 원하는 가정만 신청하는 면담으로 이루어집니다."
        >
          <Rows
            term="9rem"
            items={[
              {
                t: "세션 1",
                d: "본검사 — 지필 문항과, 어떤 상황에서 어떻게 할지 고르는 상황판단(SJT) 문항",
                aside: "약 55분",
              },
              { t: "세션 2", d: "학생 소개와 학생 설문", aside: "15~19분" },
              {
                t: "학부모 설문",
                d: "보호자가 지켜본 모습 42문항 — 재능이 드러나는 조건과 자라 온 과정을 함께 묻습니다",
                aside: "18~20분",
              },
              {
                t: "면담",
                d: "정해진 질문으로 나누는 면담 — 학부모 10분, 학생 5분",
                aside: "신청한 가정만",
              },
            ]}
          />
          <Aside>
            세션 1과 세션 2는 따로 접속해서 봅니다. 한 번에 이어서 보면 70분이 넘어 집중이
            흐트러지고, 그만큼 답의 질도 떨어지기 때문입니다.
          </Aside>
        </Chapter>
      </div>
    </>
  );
}
