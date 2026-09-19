import type { Metadata } from "next";
import SubHero from "@/components/site/SubHero";
import { Aside, Chapter, Rows } from "@/components/site/Article";

const title = "성장추적 3단계";
const lead =
  "재능은 한 번의 사진이 아니라 이어지는 곡선입니다. 연 4회 회차로 같은 좌표를 다시 측정해 변화를 추적합니다.";

export const metadata: Metadata = { title, description: lead };

/** PUB-03-4 */
export default function TrackingPage() {
  return (
    <>
      <SubHero href="/service/tracking" title={title} lead={lead} />

      <div className="container-x section-y">
        <Chapter
          no="01"
          title="다시 보면 보이는 것"
          lead="한 번의 결과로는 알 수 없고, 회차가 쌓여야 보이는 것들입니다."
        >
          <Rows
            items={[
              {
                t: "회차 사이의 변화",
                d: "지난 회차와 비교해 어떤 영역이 움직였는지 보여 드립니다.",
              },
              {
                t: "환경이 바뀔 때의 반응",
                d: "학교·학원·생활이 달라졌을 때 어떤 영역이 함께 반응했는지 짚어 드립니다.",
              },
              {
                t: "성장 곡선",
                d: "회차 결과를 이어 붙인 성장 그래프(G-Graph)로, 쌓인 변화를 한눈에 보여 드립니다.",
              },
            ]}
          />
          <Aside>다시 진단할 때는 6개월 간격을 권합니다.</Aside>
        </Chapter>
      </div>
    </>
  );
}
