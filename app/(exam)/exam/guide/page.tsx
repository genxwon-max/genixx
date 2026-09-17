import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/exam/Registrations";
import { ArrowRight } from "@/components/Icons";
import { examOrderOf, questionCount, subjects } from "@/lib/exam";
import { talentSamples } from "@/lib/talentSamples";
import ExamPaper from "@/components/exam/ExamPaper";

export const metadata: Metadata = {
  title: "서비스 안내",
  description: "학력진단 문항과 재능진단 문항이 어떻게 다른지 샘플로 비교합니다.",
  robots: { index: false, follow: false },
};

/**
 * 응시 존 서비스 안내 (/exam/guide).
 *
 * 헤더의 「서비스 안내」가 사이트(/service)로 나가지 않고 여기서 열린다 — 응시 메뉴와
 * 오른쪽 리모컨이 그대로 남아, 둘러본 뒤 바로 접수·응시로 옮겨 갈 수 있다.
 *
 * 왼쪽은 **학력진단**(교과 문항, 정답이 있다), 오른쪽은 **재능진단**(상황판단·확산적
 * 사고, 정답이 없다). 나란히 놓아야 두 진단이 무엇을 다르게 보는지 한눈에 읽힌다.
 * 학력 문항은 실제 세트(lib/examQuestions.ts)에서 과목마다 첫 문제를 가져오고, 정답은
 * 싣지 않는다 — 여기가 미리 풀어 보고 오는 자리가 되면 안 된다.
 */
export default function ExamGuidePage() {
  const academic = subjects.map((s) => ({ subject: s, q: examOrderOf(s.id)[0] }));

  return (
    <ExamPaper>
      <PageTitle sub="같은 아이를 두 가지 눈으로 봅니다. 왼쪽은 교과 학력을, 오른쪽은 재능이 드러나는 방식을 묻는 문항입니다.">
        서비스 안내
      </PageTitle>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {/* 왼쪽 — 학력진단 */}
        <section aria-labelledby="guide-academic" className="flex flex-col">
          <Head
            id="guide-academic"
            tag="학력진단"
            title="일반 학력 문항"
            desc={`${subjects.map((s) => `${s.short} ${questionCount(s.id)}문항`).join(" · ")}을 과목마다 따로 풉니다. 정답이 있고, 학년 성취기준에 비춰 지금 위치를 봅니다.`}
          />
          <ul className="mt-4 flex-1 space-y-4">
            {academic.map(({ subject, q }) => (
              <li key={subject.id} className="rounded-[10px] border border-soft-line bg-white p-5">
                <p className="flex items-center justify-between gap-2 text-[12px] font-semibold text-soft-muted">
                  <span className="text-soft-primary">{subject.name}</span>
                  <span>{q.type === "essay" ? "서술형" : "객관식"}</span>
                </p>
                <div className="font-myeongjo">
                  <div className="mt-3 rounded-[6px] bg-exam-raised px-4 py-3">
                    <p className="text-[12px] text-soft-muted">{q.brief.label}</p>
                    <p className="mt-1 text-[15px] font-bold text-soft-ink">{q.brief.title}</p>
                    <p className="mt-1.5 line-clamp-3 text-[13px] leading-[1.8] text-soft-ink/80">
                      {q.brief.paragraphs[0]}
                    </p>
                  </div>
                  <p className="mt-4 text-[15px] font-bold leading-[1.7] text-soft-ink">
                    문제 1. {q.stem}
                  </p>
                  {q.choices && <Choices items={q.choices} />}
                  {q.blanks && (
                    <ul className="mt-3 space-y-1.5">
                      {q.blanks.map((b) => (
                        <li key={b.label} className="text-[14px] text-soft-ink">
                          ○ {b.label} : ({" ".repeat(24)})
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <Link
            href="/exam/apply"
            className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-[4px] bg-soft-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-soft-primary-dark"
          >
            평가 골라 무료로 풀어보기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        {/* 오른쪽 — 재능진단 */}
        <section aria-labelledby="guide-talent" className="flex flex-col">
          <Head
            id="guide-talent"
            tag="재능진단"
            title="재능진단 문항 샘플"
            desc="정답이 없습니다. 어떤 상황에서 어떻게 생각하고, 어디에 몰입하는지를 지필 · 상황판단 · 설문 · 면담으로 교차해 봅니다."
          />
          <ul className="mt-4 flex-1 space-y-4">
            {talentSamples.map((t) => (
              <li key={t.stem} className="rounded-[10px] border border-soft-line bg-white p-5">
                <p className="flex items-center justify-between gap-2 text-[12px] font-semibold text-soft-muted">
                  <span className="text-amber-700">{t.kind}</span>
                  <span>{t.looks}</span>
                </p>
                <div className="font-myeongjo">
                  <p className="mt-3 rounded-[6px] bg-amber-50/70 px-4 py-3 text-[13px] leading-[1.8] text-soft-ink/80">
                    {t.situation}
                  </p>
                  <p className="mt-4 text-[15px] font-bold leading-[1.7] text-soft-ink">{t.stem}</p>
                  {t.choices ? (
                    <Choices items={t.choices} />
                  ) : (
                    <p className="mt-3 rounded-[6px] border border-dashed border-soft-line px-4 py-3 text-[13px] text-slate-400">
                      {t.placeholder}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <Link
            href="/service/talent-base"
            className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-[4px] border border-soft-line bg-white px-5 py-3 text-sm font-semibold text-soft-ink transition-colors hover:bg-slate-50"
          >
            재능진단 자세히 보기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </div>

      <p className="mt-8 text-center text-[13px] text-soft-muted">
        샘플 문항에는 정답을 싣지 않습니다. 응시 순서와 규정은{" "}
        <Link href="/exam/info" className="font-semibold text-soft-primary hover:underline">
          시험 안내
        </Link>
        에서 확인하세요.
      </p>
    </ExamPaper>
  );
}

function Head({ id, tag, title, desc }: { id: string; tag: string; title: string; desc: string }) {
  return (
    <div className="border-b-2 border-soft-ink pb-4">
      <p className="text-[12px] font-bold tracking-[0.08em] text-soft-muted">{tag}</p>
      <h2 id={id} className="mt-1 text-[22px] font-bold tracking-tight text-soft-ink">
        {title}
      </h2>
      <p className="mt-2 text-[13px] leading-relaxed text-soft-muted">{desc}</p>
    </div>
  );
}

function Choices({ items }: { items: string[] }) {
  return (
    <ol className="mt-3 space-y-1.5">
      {items.map((c, i) => (
        <li key={c} className="flex gap-2.5 text-[14px] leading-[1.7] text-soft-ink">
          <span
            aria-hidden
            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-soft-line text-[11px] tabular-nums text-soft-muted"
          >
            {i + 1}
          </span>
          {c}
        </li>
      ))}
    </ol>
  );
}
