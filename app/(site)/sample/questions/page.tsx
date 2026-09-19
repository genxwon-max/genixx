import type { Metadata } from "next";
import SubHero from "@/components/site/SubHero";
import { Aside, Chapter, NextStep, Rows } from "@/components/site/Article";
import QuestionSample from "@/components/site/QuestionSample";
import {
  assessment,
  levels,
  questionsOf,
  subjects,
  questionCountText,
  type SubjectId,
} from "@/lib/exam";
import { axes } from "@/lib/result";

export const metadata: Metadata = {
  title: "문항 미리보기",
  description:
    "TalentMe 검사가 어떤 문항으로 이루어져 있는지, 과목별 예시 문항을 가입 전에 공개합니다. (PUB-04-3)",
};

/**
 * PUB-04-3 문항 미리보기.
 *
 * KEDI 영재성 검사 소개(ged.kedi.re.kr intro4_1~4_4)가 검사도구마다 「개요 → 측정
 * 항목 → 검사 방식 → 예시 문항」을 공개하는 구성을 따랐다. 우리는 결과지는 미리
 * 보여 주면서(PUB-04-1) 정작 아이가 무슨 문제를 푸는지는 어디에도 없었는데, 학부모가
 * 가입 전에 가장 알고 싶어 하는 것이 그쪽이다.
 *
 * ⚠ 이 화면은 「소개」다. 응시 화면(ASM)과 섞지 않는다. 예시 문항에 정답을 싣지 않는
 *   것도 같은 이유로, 정답을 걸면 미리 풀어 보고 오는 자리가 된다.
 *
 * 문항은 새로 쓰지 않고 lib/examQuestions.ts의 세트에서 뽑아 온다. 소개용 문항을
 * 따로 두면 실제 시험과 소개가 조용히 갈라진다.
 */

/** 과목마다 어느 재능 축으로 이어지는지 — lib/result.ts의 subject 연결을 그대로 쓴다 */
const axisOf = (id: SubjectId) => axes.find((a) => a.subject === id);

/** 과목별 예시로 뽑을 두 문항 — 가장 낮은 위계 하나와 가장 높은 위계 하나 */
const samplePair = (id: SubjectId) => {
  const list = questionsOf(id);
  const low = list.find((q) => q.level === "S1" && q.type === "choice") ?? list[0];
  const high = list.find((q) => q.level === "S4" && q.type === "essay") ?? list[list.length - 1];
  return [low, high];
};

export default function QuestionPreviewPage() {
  return (
    <>
      <SubHero
        href="/sample/questions"
        title="문항 미리보기"
        lead={`${assessment.name}(${assessment.ko}) 검사가 어떤 문항으로 이루어져 있는지 가입 전에 공개합니다. 아래 예시는 실제 세트에서 그대로 가져온 문항이며, 정답은 싣지 않았습니다.`}
      />

      <div className="container-x section-y">
        {/* ① 검사 구성 — 상자 네 개 대신 한 줄 명세 */}
        <Chapter
          no="01"
          title="검사 구성"
          lead="한 번에 몰아 보지 않습니다. 과목마다 따로 접속해서 40분씩 풉니다."
        >
          <dl className="grid border-b border-brand-100 sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-4">
            {[
              { t: "검사 이름", d: `${assessment.name} (${assessment.ko})` },
              { t: "회차", d: assessment.round },
              { t: "문항 수", d: questionCountText() },
              { t: "제한 시간", d: "과목당 40분" },
            ].map((it) => (
              <div key={it.t} className="border-t border-brand-100 py-4">
                <dt className="type-meta text-slate-500">{it.t}</dt>
                <dd className="type-h4 mt-1 font-bold text-brand-950">{it.d}</dd>
              </div>
            ))}
          </dl>

          <h3 className="type-h4 mt-10 font-bold text-brand-950">묻는 층위를 네 단계로 올립니다</h3>
          <p className="type-body mt-1.5 max-w-2xl text-slate-600">
            같은 자료를 놓고 층위를 올려 가며 묻습니다. 정답을 맞혔는지보다{" "}
            <b className="font-bold text-brand-800">어느 층위까지 올라가는지</b>가 재능 좌표를
            가릅니다.
          </p>
          <div className="mt-4">
            <Rows term="7rem" items={levels.map((l) => ({ t: `${l.id} ${l.name}`, d: l.desc }))} />
          </div>
        </Chapter>

        {/* ② 응시 화면 */}
        <Chapter
          no="02"
          title="응시 화면"
          lead="자료는 왼쪽, 묻는 말은 오른쪽. 지문과 표는 푸는 내내 그대로 열려 있습니다."
        >
          <Rows
            items={[
              {
                t: "자료는 계속 열려 있습니다",
                d: "한 자료에 여러 문항이 매달립니다. 앞 문항으로 돌아가도 자료는 그대로입니다.",
              },
              {
                t: "답은 자동 저장됩니다",
                d: "인터넷이 끊겨도 다시 들어오면 이어서 풉니다. 남은 시간은 서버가 셉니다.",
              },
              {
                t: "순서를 건너뛸 수 있습니다",
                d: "오른쪽 이동판이 층위별로 묶여 있어, 어려운 문항은 뒤로 미뤄 두어도 됩니다.",
              },
            ]}
          />
          <Aside>
            아래 예시 문항도 같은 좌·우 구성으로 보여 드립니다. 다만 이 화면에서는 답을 쓸 수
            없습니다.
          </Aside>
        </Chapter>

        {/* ③ 과목별 — 명세 한 줄 + 예시 문항 두 개. 문항 그림은 넓게 쓰려고 구간 틀 밖에 둔다 */}
        {subjects.map((subject, i) => {
          const list = questionsOf(subject.id);
          const axis = axisOf(subject.id);
          const choice = list.filter((q) => q.type === "choice").length;
          const essay = list.length - choice;
          const byLevel = levels
            .map((l) => `${l.id} ${list.filter((q) => q.level === l.id).length}`)
            .join(" · ");

          return (
            <section
              key={subject.id}
              id={subject.id}
              className="scroll-mt-24 border-t border-brand-100 py-12 md:py-16"
            >
              <p className="type-eyebrow tabular-nums text-brand-500">
                {String(i + 3).padStart(2, "0")}
              </p>
              <h2 className="type-h3 mt-2 font-black text-brand-950">{subject.name}</h2>
              <p className="type-body mt-2 max-w-2xl text-slate-600">{subject.hint}</p>

              <div className="mt-6">
                <Rows
                  term="10rem"
                  items={[
                    {
                      t: "이어지는 재능 축",
                      d: axis ? `${axis.label} — ${axis.desc}` : "—",
                    },
                    {
                      t: "문항 형식",
                      d: `객관식 ${choice} · 서술형 ${essay}. 서술형은 글자 수보다 근거를 함께 적었는지를 봅니다.`,
                    },
                    {
                      t: "층위별 문항 수",
                      d: `${byLevel}. 낮은 층위에서 시작해 뒤로 갈수록 올라갑니다.`,
                    },
                  ]}
                />
              </div>

              <h3 className="type-h4 mt-10 font-bold text-brand-950">예시 문항</h3>
              <p className="type-body mt-1 text-slate-600">
                같은 자료라도 묻는 층위가 달라지면 문항이 이렇게 달라집니다.
              </p>
              <div className="mt-5 space-y-6">
                {samplePair(subject.id).map((q) => (
                  <QuestionSample key={q.id} q={q} />
                ))}
              </div>
            </section>
          );
        })}

        <div className="mt-4">
          <NextStep
            text="이 문항들을 풀고 나면 어떤 결과지를 받는지도 미리 볼 수 있습니다."
            href="/sample/report"
            label="샘플 리포트 보기"
          />
        </div>
      </div>
    </>
  );
}
