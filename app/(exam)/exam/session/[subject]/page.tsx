import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ExamGate from "@/components/exam/ExamGate";
import ExamSession from "@/components/exam/ExamSession";
import { SUBJECT_IDS, isSubjectId, subjectOf } from "@/lib/exam";

export function generateStaticParams() {
  return SUBJECT_IDS.map((subject) => ({ subject }));
}

export async function generateMetadata({
  params,
}: PageProps<"/exam/session/[subject]">): Promise<Metadata> {
  const { subject } = await params;
  const meta = isSubjectId(subject) ? subjectOf(subject) : null;
  return {
    title: meta ? `${meta.name} 응시` : "응시",
    description: meta ? `${meta.name} ${meta.limitMin}분 응시 화면입니다.` : undefined,
    robots: { index: false, follow: false },
  };
}

export default async function ExamSessionPage({ params }: PageProps<"/exam/session/[subject]">) {
  const { subject } = await params;
  if (!isSubjectId(subject)) notFound();

  return (
    <ExamGate>
      <ExamSession subject={subject} />
    </ExamGate>
  );
}
