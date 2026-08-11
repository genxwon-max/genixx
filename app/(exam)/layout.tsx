import Logo from "@/components/Logo";
import ExamTabs from "@/components/exam/ExamTabs";
import ExamStatusBar from "@/components/exam/ExamStatusBar";
import ExamFooterNote from "@/components/exam/ExamFooterNote";
import SessionBar from "@/components/exam/SessionBar";

export default function ExamLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-col bg-exam-bg text-exam-text">
      {/* 구분선은 inset shadow로 그린다 — border를 쓰면 헤더가 65px이 되어 응시 화면에 1px 스크롤이 생긴다 */}
      <header className="sticky top-0 z-40 h-16 shrink-0 bg-exam-panel shadow-[inset_0_-1px_0_var(--color-exam-line)]">
        <div className="container-x flex h-16 items-center justify-between gap-4">
          <Logo />
          {/* 오른쪽 위 — 응시 중에는 남은 시간, 그 외에는 메뉴 */}
          <div className="flex items-center gap-2">
            <ExamStatusBar />
            <ExamTabs />
            <SessionBar />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <ExamFooterNote />
    </div>
  );
}
