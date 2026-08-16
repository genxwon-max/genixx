import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/PageHero";
import SectionHead from "@/components/site/SectionHead";
import QuestionSample from "@/components/site/QuestionSample";
import { ArrowRight } from "@/components/Icons";
import {
  assessment,
  levels,
  questionsOf,
  subjects,
  QUESTIONS_PER_SUBJECT,
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
 * 항목 → 검사 방식 → 예시 문항」을 공개하는 구성을 따랐다. 우리는 결과지는 전 페이지
 * 공개하면서(PUB-04-1) 정작 아이가 무슨 문제를 푸는지는 어디에도 없었는데, 학부모가
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
      <PageHero
        eyebrow="PUB-04-3"
        title="우리 아이가 푸는 문제, 미리 보세요"
        desc={`${assessment.name}(${assessment.ko}) 검사가 어떤 문항으로 이루어져 있는지 가입 전에 공개합니다. 아래 예시는 실제 세트에서 그대로 가져온 문항이며, 정답은 싣지 않았습니다.`}
        primary={{ label: "샘플 리포트 보기", href: "/sample/report" }}
        secondary={{ label: "무료 학력진단 시작", href: "/exam" }}
      />

      {/* ① 검사도구 개요 */}
      <section className="section-y">
        <div className="container-x">
          <SectionHead
            eyebrow="검사 구성"
            title="세 과목, 각 10문항"
            lead="한 번에 몰아 보지 않습니다. 과목마다 따로 접속해서 40분씩 풉니다."
          />

          <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { t: "검사 이름", d: `${assessment.name} (${assessment.ko})` },
              { t: "회차", d: assessment.round },
              { t: "문항 수", d: `3과목 × ${QUESTIONS_PER_SUBJECT}문항` },
              { t: "제한 시간", d: "과목당 40분" },
            ].map((s) => (
              <div
                key={s.t}
                className="rounded-3xl border border-brand-100 bg-white p-6 shadow-card"
              >
                <dt className="type-meta text-slate-500">{s.t}</dt>
                <dd className="type-h3 mt-1.5 font-black text-brand-950">{s.d}</dd>
              </div>
            ))}
          </dl>

          {/* S위계 — 이 검사가 무엇을 다르게 보는지가 여기서 갈린다 */}
          <div className="mt-10">
            <h3 className="type-h3 font-black text-brand-950">묻는 층위를 네 단계로 올립니다</h3>
            <p className="type-body mt-2 max-w-3xl text-slate-600">
              같은 자료를 놓고 층위를 올려 가며 묻습니다. 정답을 맞혔는지보다{" "}
              <b className="font-bold text-brand-800">어느 층위까지 올라가는지</b>가 재능 좌표를
              가릅니다.
            </p>

            <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {levels.map((l) => (
                <li key={l.id} className="rounded-3xl bg-brand-50/70 p-6">
                  <span className="type-tag rounded-full bg-brand-900 px-2.5 py-1 text-white">
                    {l.id}
                  </span>
                  <p className="type-h3 mt-3 font-black text-brand-950">{l.name}</p>
                  <p className="type-body mt-1.5 text-slate-600">{l.desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ② 응시 화면이 이렇게 생겼습니다 */}
      <section className="section-y bg-brand-50/50">
        <div className="container-x">
          <SectionHead
            eyebrow="응시 화면"
            title="자료는 왼쪽, 묻는 말은 오른쪽"
            lead="자료를 외웠는지 보려는 검사가 아니라서, 지문과 표는 푸는 내내 그대로 열려 있습니다."
          />

          <ul className="mt-8 grid gap-4 md:gap-5 lg:grid-cols-3">
            {[
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
                d: "오른쪽 이동판이 위계별로 묶여 있어, 어려운 문항은 뒤로 미뤄 두어도 됩니다.",
              },
            ].map((s) => (
              <li
                key={s.t}
                className="rounded-3xl border border-brand-100 bg-white p-6 shadow-card"
              >
                <p className="type-h3 font-black text-brand-950">{s.t}</p>
                <p className="type-body mt-2 text-slate-600">{s.d}</p>
              </li>
            ))}
          </ul>

          <p className="type-meta mt-5 text-slate-500">
            아래 예시 문항도 같은 좌·우 구성으로 보여 드립니다. 다만 이 화면에서는 답을 쓸 수
            없습니다.
          </p>
        </div>
      </section>

      {/* ③ 과목별 — 개요 · 구성 · 예시 문항 */}
      {subjects.map((subject, i) => {
        const list = questionsOf(subject.id);
        const axis = axisOf(subject.id);
        const choice = list.filter((q) => q.type === "choice").length;
        const essay = list.length - choice;
        const byLevel = levels.map((l) => ({
          level: l,
          count: list.filter((q) => q.level === l.id).length,
        }));

        return (
          <section
            key={subject.id}
            id={subject.id}
            className={`section-y scroll-mt-24 ${i % 2 === 1 ? "bg-brand-50/50" : ""}`}
          >
            <div className="container-x">
              <SectionHead
                eyebrow={`과목 ${String(i + 1).padStart(2, "0")}`}
                title={subject.name}
                lead={subject.hint}
              />

              <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-3xl border border-brand-100 bg-white p-6">
                  <dt className="type-meta text-slate-500">이어지는 재능 축</dt>
                  <dd className="type-h3 mt-1.5 font-black text-brand-950">
                    {axis ? axis.label : "—"}
                  </dd>
                  {axis && <p className="type-body mt-1.5 text-slate-600">{axis.desc}</p>}
                </div>
                <div className="rounded-3xl border border-brand-100 bg-white p-6">
                  <dt className="type-meta text-slate-500">문항 형식</dt>
                  <dd className="type-h3 mt-1.5 font-black text-brand-950">
                    객관식 {choice} · 서술형 {essay}
                  </dd>
                  <p className="type-body mt-1.5 text-slate-600">
                    서술형은 글자 수보다 근거를 함께 적었는지를 봅니다.
                  </p>
                </div>
                <div className="rounded-3xl border border-brand-100 bg-white p-6">
                  <dt className="type-meta text-slate-500">위계별 문항 수</dt>
                  <dd className="mt-2 flex flex-wrap gap-1.5">
                    {byLevel.map(({ level, count }) => (
                      <span
                        key={level.id}
                        className="type-tag rounded-full bg-surface-blue px-2.5 py-1 text-brand-700"
                      >
                        {level.id} {count}
                      </span>
                    ))}
                  </dd>
                  <p className="type-body mt-2.5 text-slate-600">
                    낮은 층위에서 시작해 뒤로 갈수록 올라갑니다.
                  </p>
                </div>
              </dl>

              <h3 className="type-h3 mt-10 font-black text-brand-950">예시 문항</h3>
              <p className="type-body mt-1.5 text-slate-600">
                같은 자료라도 묻는 층위가 달라지면 문항이 이렇게 달라집니다.
              </p>

              <div className="mt-5 space-y-4">
                {samplePair(subject.id).map((q) => (
                  <QuestionSample key={q.id} q={q} />
                ))}
              </div>
            </div>
          </section>
        );
      })}

      {/* ④ 다음 걸음 */}
      <section className="section-y border-t border-brand-100 bg-brand-50/60">
        <div className="container-x">
          <SectionHead
            align="center"
            title="문항을 보셨다면, 결과지도 보세요"
            lead="이 문항들을 풀고 나면 어떤 리포트를 받게 되는지 전 페이지를 공개하고 있습니다."
          />
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/sample/report"
              className="btn btn-lg bg-brand-900 text-white shadow-card hover:bg-brand-800"
            >
              샘플 리포트 전체 보기
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/exam"
              className="btn btn-lg border border-brand-200 bg-white text-brand-800 hover:border-brand-400"
            >
              무료 학력진단 시작하기
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
