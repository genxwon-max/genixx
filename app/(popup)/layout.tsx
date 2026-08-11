/** 설문 팝업 전용 레이아웃 — 헤더·푸터 없이 창 전체를 설문에 쓴다. */
export default function PopupLayout({ children }: LayoutProps<"/">) {
  return <div className="min-h-full bg-exam-bg text-exam-text">{children}</div>;
}
