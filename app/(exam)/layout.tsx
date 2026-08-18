import Logo from "@/components/Logo";
import { assessment } from "@/lib/exam";
import ExamStatusBar from "@/components/exam/ExamStatusBar";
import ExamFooterNote from "@/components/exam/ExamFooterNote";
import SessionBar from "@/components/exam/SessionBar";
import ExamGuard from "@/components/exam/ExamGuard";

/**
 * 응시 존 레이아웃 — 이제 실제 응시 화면(/exam/session)만 남았다.
 * 응시 현황·결과·설문은 회원 대시보드로 옮겼다. 여기는 문항에 집중하는 자리라
 * 존 이동 메뉴를 두지 않고 남은 시간과 세션 정보만 띄운다.
 */
export default function ExamLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-col bg-exam-bg text-exam-text">
      {/* 관리자 화면(ADM-04-4)에서 켜 둔 보호만 적용한다 */}
      <ExamGuard />
      {/* 구분선은 inset shadow로 그린다 — border를 쓰면 헤더가 65px이 되어 응시 화면에 1px 스크롤이 생긴다 */}
      <header className="sticky top-0 z-40 h-16 shrink-0 bg-exam-panel shadow-[inset_0_-1px_0_var(--color-exam-line)]">
        <div className="container-x flex h-16 items-center justify-between gap-4">
          {/* 왼쪽 — 플랫폼(GENIXX) 옆에 지금 보는 검사 이름(TalentMe)을 붙인다 */}
          <div className="flex items-center gap-3">
            <Logo />
            <span aria-hidden className="hidden h-5 w-px bg-exam-line sm:block" />
            <span className="hidden text-[13px] font-bold text-exam-muted sm:inline">
              {assessment.name} 재능진단
            </span>
          </div>
          {/* 오른쪽 위 — 응시 중에는 남은 시간, 그 외에는 메뉴 */}
          <div className="flex items-center gap-2">
            <ExamStatusBar />
            <SessionBar />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <ExamFooterNote />
    </div>
  );
}
