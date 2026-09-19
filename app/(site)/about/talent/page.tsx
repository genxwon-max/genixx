import type { Metadata } from "next";
import SubHero from "@/components/site/SubHero";
import { Aside, Chapter } from "@/components/site/Article";

const title = "우리가 보는 '재능'";
const lead =
  "재능은 타고난 등급이 아니라, 조건이 맞았을 때 드러나는 행동입니다. GENIXX는 재능을 8개 영역과 4단계 처리위계의 좌표로 정의합니다.";

export const metadata: Metadata = { title, description: lead };

const areas = [
  { t: "언어", d: "말과 글로 의미를 만들고 정교하게 다루는 힘" },
  { t: "수리·논리", d: "수와 규칙, 인과 구조를 다루는 힘" },
  { t: "공간", d: "형태와 위치를 머릿속에서 조작하는 힘" },
  { t: "청각·리듬", d: "소리의 높낮이와 박자를 구별하고 표현하는 힘" },
  { t: "신체·운동", d: "몸의 움직임을 계획하고 정밀하게 실행하는 힘" },
  { t: "사회·관계", d: "타인의 상태를 읽고 관계를 조정하는 힘" },
  { t: "자기이해", d: "자신의 감정과 동기를 알아차리고 조절하는 힘" },
  { t: "자연·생태", d: "자연 현상을 관찰하고 분류·연결하는 힘" },
];

const stages = [
  { s: "S1", t: "지각", d: "차이를 알아차리고 구별한다" },
  { s: "S2", t: "이해", d: "규칙과 관계를 파악한다" },
  { s: "S3", t: "생성", d: "배운 것을 새로운 상황에 적용해 만들어 낸다" },
  { s: "S4", t: "창의", d: "기존 틀을 재구성해 자기만의 결과를 만든다" },
];

/** PUB-02-1 — 8개 영역은 나란한 목록으로, 4단계는 계단으로 그려 「위계」가 보이게 한다 */
export default function TalentPage() {
  return (
    <>
      <SubHero href="/about/talent" title={title} lead={lead} />

      <div className="container-x section-y">
        <Chapter
          no="01"
          title="8가지 핵심 재능 영역"
          lead="각 영역은 독립된 축이며, 높고 낮음의 서열이 아닙니다."
        >
          {/* 가나다·서열 없이 나란히 — 두 칸으로 흘려 번호만 붙인다 */}
          <dl className="grid border-b border-brand-100 sm:grid-cols-2 sm:gap-x-12">
            {areas.map((a, i) => (
              <div key={a.t} className="flex gap-5 border-t border-brand-100 py-5">
                <span className="type-meta w-6 shrink-0 pt-0.5 tabular-nums text-brand-400">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <dt className="type-h4 font-bold text-brand-950">{a.t}</dt>
                  <dd className="type-body mt-1 text-slate-600">{a.d}</dd>
                </div>
              </div>
            ))}
          </dl>
        </Chapter>

        <Chapter
          no="02"
          title="S1~S4 처리위계"
          lead="같은 영역이라도 어느 단계에서 작동하는지에 따라 필요한 지원이 달라집니다."
        >
          {/* 넓은 화면: 칸마다 한 단씩 높아지는 계단. 좁은 화면: 왼쪽 세로줄에 매단 목록 */}
          <ol className="relative space-y-7 border-l-2 border-brand-100 pl-6 md:grid md:grid-cols-4 md:items-end md:gap-4 md:space-y-0 md:border-l-0 md:pl-0">
            {stages.map((st, i) => (
              <li key={st.s} className="relative">
                <span
                  aria-hidden
                  className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-brand-500 md:hidden"
                />
                <div className="md:pb-4">
                  <p className="type-h2 font-black tabular-nums text-brand-700">{st.s}</p>
                  <p className="type-h4 mt-1 font-bold text-brand-950">{st.t}</p>
                  <p className="type-body mt-1.5 text-slate-600">{st.d}</p>
                </div>
                <div
                  aria-hidden
                  className="hidden rounded-t-md bg-gradient-to-t from-brand-200 to-brand-100 md:block"
                  style={{ height: `${28 + i * 28}px` }}
                />
              </li>
            ))}
          </ol>
          <p className="type-meta mt-4 hidden text-slate-500 md:block">
            오른쪽으로 갈수록 처리 단계가 깊어집니다 →
          </p>
          <Aside>
            발현되지 않은 재능은 진단할 수 없습니다. 낮게 나온 영역은 &lsquo;없는 재능&rsquo;이
            아니라 &lsquo;아직 관찰되지 않은 영역&rsquo;으로 표기합니다.
          </Aside>
        </Chapter>
      </div>
    </>
  );
}
