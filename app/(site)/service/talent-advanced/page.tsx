import type { Metadata } from "next";
import SubHero from "@/components/site/SubHero";
import { Aside, Chapter, Rows } from "@/components/site/Article";

const title = "심화진단 2단계";
const lead =
  "종이 검사로는 보기 어려운 청각·리듬, 신체·운동, 사회·관계 세 영역을 소리·움직임·함께하는 활동 과제로 확인합니다.";

export const metadata: Metadata = { title, description: lead };

/** PUB-03-3 */
export default function TalentAdvancedPage() {
  return (
    <>
      <SubHero href="/service/talent-advanced" title={title} lead={lead} />

      <div className="container-x section-y">
        <Chapter
          no="01"
          title="어떤 과제를 하나요"
          lead="세 영역마다 직접 해 보는 과제가 하나씩 있습니다."
        >
          <Rows
            term="9rem"
            items={[
              {
                t: "청각·리듬",
                d: "노래나 박자를 녹음해, 소리를 내는 타이밍과 음의 높낮이가 얼마나 정확한지 봅니다.",
              },
              {
                t: "신체·운동",
                d: "몸을 움직이는 모습과 화면을 누르는 순서·속도를 보고, 움직임을 얼마나 계획대로 해내는지 봅니다.",
              },
              {
                t: "사회·관계",
                d: "사람 사이의 여러 상황에서 어떻게 할지 고르는 문항과, 함께 풀어야 하는 게임 과제로 봅니다.",
              },
            ]}
          />
          <Aside>
            목소리·영상·조작 기록은 처음 받은 동의와 따로 한 번 더 동의를 받은 뒤에만 모읍니다.
            원본은 꼭 필요한 기간만 보관하고, 할 수 있는 처리는 기기 안에서 먼저 합니다.
          </Aside>
        </Chapter>
      </div>
    </>
  );
}
