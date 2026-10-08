import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ExamDesign from "@/components/exam/ExamDesign";
import { designOf, designs, isDesignKind } from "@/lib/examDesign";

/**
 * 문항 유형 디자인 보기 (/exam/session/design/[유형]) — 디자인 확인용.
 *
 *   listen  음성 듣기      speak  음성 말하기
 *   short   단답형         file   파일 첨부
 *
 * 응시 화면에서 유형 하나만 떼어 세운다. 실제 서비스의 메뉴에는 두지 않는다.
 */
export function generateStaticParams() {
  return designs.map((d) => ({ kind: d.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/exam/session/design/[kind]">): Promise<Metadata> {
  const { kind } = await params;
  return {
    title: isDesignKind(kind) ? `문항 유형 · ${designOf(kind).name}` : "문항 유형",
    robots: { index: false, follow: false },
  };
}

export default async function ExamDesignPage({
  params,
}: PageProps<"/exam/session/design/[kind]">) {
  const { kind } = await params;
  if (!isDesignKind(kind)) notFound();
  return <ExamDesign kind={kind} />;
}
