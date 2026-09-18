import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import LiveReport from "@/components/report/LiveReport";
import { editions, isEdition } from "@/lib/diagReport";

export function generateStaticParams() {
  return [{ edition: "summary" }, { edition: "full" }];
}

export async function generateMetadata({
  params,
}: PageProps<"/report/[edition]">): Promise<Metadata> {
  const { edition } = await params;
  return isEdition(edition)
    ? { title: `진단 보고서 · ${editions[edition].label}`, robots: { index: false, follow: false } }
    : {};
}

/** RPT-02 진단 보고서 — 결과 화면에서 새 창으로 여는 요약본(무료)·정밀본 */
export default async function ReportPage({ params }: PageProps<"/report/[edition]">) {
  const { edition } = await params;
  if (!isEdition(edition)) notFound();

  return (
    /* 누구의 보고서인지 ?student= 로 받는다 — useSearchParams는 경계가 있어야 한다 */
    <Suspense
      fallback={
        <div className="py-20 text-center text-[13px] text-slate-500">
          보고서를 불러오는 중입니다…
        </div>
      }
    >
      <LiveReport edition={edition} />
    </Suspense>
  );
}
