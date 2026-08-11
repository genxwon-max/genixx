import Link from "next/link";
import Logo from "@/components/Logo";
import ExamFooterNote from "@/components/exam/ExamFooterNote";

/**
 * 계정 존(ACC) 레이아웃.
 * 사이트맵 12장 URL 규칙 — 공개=/ · 회원=/my · 응시=/exam.
 * 계정 화면은 공개 존 헤더(대메뉴)를 달지 않는다. 가입·로그인 도중에
 * 다른 메뉴로 새는 것을 막기 위해서다.
 */
export default function AccountLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-col bg-exam-bg text-exam-text">
      <header className="sticky top-0 z-40 h-16 shrink-0 bg-exam-panel shadow-[inset_0_-1px_0_var(--color-exam-line)]">
        <div className="container-x flex h-16 items-center justify-between gap-4">
          <Logo />
          <Link
            href="/"
            className="text-[13px] font-bold text-exam-muted transition-colors hover:text-exam-text"
          >
            홈으로
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <div className="container-x py-10 sm:py-14">
          <div className="mx-auto max-w-2xl">{children}</div>
        </div>
      </main>

      <ExamFooterNote />
    </div>
  );
}
