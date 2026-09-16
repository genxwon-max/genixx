import Link from "next/link";
import Logo from "@/components/Logo";
import { assessment } from "@/lib/exam";
import ExamStatusBar from "@/components/exam/ExamStatusBar";
import ExamFooterNote from "@/components/exam/ExamFooterNote";
import ExamRail from "@/components/exam/ExamRail";
import SessionBar from "@/components/exam/SessionBar";
import ExamGuard from "@/components/exam/ExamGuard";
import ExamTabs from "@/components/exam/ExamTabs";

/**
 * 응시 존 레이아웃 — 학생이 접수하고 응시하고 결과를 보는 자리.
 *
 * 헤더가 두 줄이다 —
 *   첫 줄  로고 · 사이트 안내(서비스 안내 · 샘플 리포트 · 연구·자문진 · 고객지원) · 로그아웃
 *   둘째 줄 접수하기 · 응시하기 · 정답과 해설 · 결과보기
 *
 * 사이트를 도는 길과 시험을 보는 동안 오가는 길을 갈라 둔다. 오른쪽에는 같은 응시 메뉴를
 * 화면에 붙여 따라다니게 한다(ExamRail) — 목록이 길어 아래로 내려가도 옮겨 다닐 수 있다.
 *
 * 실제 응시 화면(/exam/session)은 문항에 집중하는 자리라 둘째 줄과 오른쪽 메뉴를 감추고,
 * 남은 시간과 세션 정보만 띄운다.
 */

/** 헤더 첫 줄의 사이트 안내 — 공개 존(lib/nav.ts)에서 학부모가 가장 자주 찾는 넷 */
const siteLinks = [
  { href: "/service", label: "서비스 안내" },
  { href: "/sample", label: "샘플 리포트" },
  { href: "/about/team", label: "연구·자문진" },
  { href: "/support", label: "고객지원" },
];

export default function ExamLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-col bg-exam-bg text-exam-text">
      {/* 관리자 화면(ADM-05-3 응시 화면 보호)에서 켜 둔 것만 적용한다 */}
      <ExamGuard />
      {/* 구분선은 inset shadow로 그린다 — border를 쓰면 헤더가 65px이 되어 응시 화면에 1px 스크롤이 생긴다.
          높이는 첫 줄(h-16)이 정한다. 둘째 줄은 응시 화면에서 그리지 않으므로 응시 중에는 늘 64px이다 */}
      <header className="sticky top-0 z-40 shrink-0 bg-exam-panel shadow-[inset_0_-1px_0_var(--color-exam-line)]">
        <div className="container-x flex h-16 items-center justify-between gap-4">
          {/* 왼쪽 — 플랫폼(GENIXX) 옆에 지금 보는 검사 이름(TalentMe)을 붙인다 */}
          <div className="flex items-center gap-3">
            <Logo />
            <span aria-hidden className="hidden h-5 w-px bg-exam-line sm:block" />
            <span className="hidden text-[13px] font-bold text-exam-muted sm:inline">
              {assessment.name} 재능진단
            </span>
          </div>
          {/* 가운데 — 사이트 안내. 좁은 화면에서는 로고와 로그아웃에 자리를 내준다 */}
          <nav aria-label="사이트 안내" className="hidden lg:block">
            <ul className="flex items-center gap-x-7">
              {siteLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="whitespace-nowrap text-[15px] text-soft-ink/80 transition-colors hover:text-soft-ink"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          {/* 오른쪽 위 — 응시 중에는 남은 시간, 그 외에는 이름과 로그아웃 */}
          <div className="flex items-center gap-2">
            <ExamStatusBar />
            <SessionBar />
          </div>
        </div>
        {/* 둘째 줄 — 응시 메뉴 */}
        <ExamTabs />
      </header>

      {/* 오른쪽에 붙어 따라다니는 같은 메뉴 */}
      <ExamRail />

      <main className="flex-1">{children}</main>

      <ExamFooterNote />
    </div>
  );
}
