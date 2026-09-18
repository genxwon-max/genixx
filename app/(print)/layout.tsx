import "@/components/report/report.css";

/** 보고서 새 창 — 헤더·푸터 없이 종이만 편다. 명조 글꼴은 뷰어(ReportViewer)가 붙인다 */
export default function PrintLayout({ children }: LayoutProps<"/">) {
  return <div className="min-h-full">{children}</div>;
}
