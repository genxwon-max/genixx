import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ExamSession from "@/components/exam/ExamSession";
import { SUBJECT_IDS, isSubjectId, subjectOf } from "@/lib/exam";

export function generateStaticParams() {
  return SUBJECT_IDS.map((subject) => ({ subject }));
}

export async function generateMetadata({
  params,
}: PageProps<"/exam/session/paid/[subject]">): Promise<Metadata> {
  const { subject } = await params;
  const meta = isSubjectId(subject) ? subjectOf(subject) : null;
  return {
    title: meta ? `${meta.name} 유료시험 응시` : "유료시험 응시",
    description: meta ? `${meta.name} ${meta.limitMin}분 응시 화면입니다.` : undefined,
    robots: { index: false, follow: false },
  };
}

/**
 * 유료시험 응시 창 (/exam/session/paid/[과목]).
 *
 * 접수한 학생이 과목마다 따로 들어간다 — 과목당 40분이라는 제한이 과목을 갈라 놓는
 * 근거이고, 50문항을 한 자리에서 보게 할 수도 없다.
 *
 * ── 갈래를 주소에 적는다 ──
 * 예전 주소는 /exam/session/[과목] 하나였고, 무료인지 유료인지는 브라우저에 저장된
 * record.tier가 정했다. 같은 주소가 남은 값에 따라 다른 시험을 열면 화면을 열어 보려는
 * 사람이 먼저 그 값을 맞춰 놓아야 한다. 이제 갈래가 주소에 적혀 있다 — trial · free · paid.
 *
 * ── 로그인 문을 두지 않는다 ──
 * 응시 기록은 계정에 붙지만(명부에 없으면 demo 학생으로 돈다), 화면 자체는 주소만으로
 * 열린다. 가입을 권하는 자리는 평가 목록과 셋트 끝 화면이다.
 */
export default async function PaidExamPage({
  params,
}: PageProps<"/exam/session/paid/[subject]">) {
  const { subject } = await params;
  if (!isSubjectId(subject)) notFound();

  return <ExamSession scope={{ kind: "paid", subject }} />;
}
