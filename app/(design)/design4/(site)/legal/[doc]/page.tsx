import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LegalDocView from "@/components/design4/legal/LegalDocView";
import { d4LegalDoc, d4LegalDocs } from "@/lib/design4Legal";

/**
 * /design4 정책 문서 — 조문 전문(lib/design4Legal.ts). 공개 사이트 /legal/[doc]의 요점 카드(lib/pageContent)와
 * 따로 간다(2026-11-17 요청 · 한국창의영재교육원 정책 묶음을 참고해 다시 씀).
 */
export function generateStaticParams() {
  return d4LegalDocs.map((d) => ({ doc: d.slug }));
}

export async function generateMetadata({ params }: PageProps<"/design4/legal/[doc]">): Promise<Metadata> {
  const { doc } = await params;
  const d = d4LegalDoc(doc);
  return d ? { title: d.title, description: d.lead } : {};
}

export default async function LegalDocPage({ params }: PageProps<"/design4/legal/[doc]">) {
  const { doc } = await params;
  const d = d4LegalDoc(doc);
  if (!d) notFound();
  return <LegalDocView doc={d} />;
}
