import type { CSSProperties } from "react";
import { Noto_Serif_KR } from "next/font/google";
import Logo from "@/components/Logo";
import { assessment } from "@/lib/exam";
import ExamStatusBar from "@/components/exam/ExamStatusBar";
import ExamFooterNote from "@/components/exam/ExamFooterNote";
import ExamRail from "@/components/exam/ExamRail";
import SessionBar from "@/components/exam/SessionBar";
import ExamGuard from "@/components/exam/ExamGuard";
import ExamTabs from "@/components/exam/ExamTabs";
import { ExamMain, ExamShell, ExamSiteBrand, ExamSiteNav } from "@/components/exam/ExamShell";
import { examGuideLinks } from "@/lib/examNav";

/**
 * 응시 존 레이아웃 — 학생이 접수하고 응시하고 결과를 보는 자리.
 *
 * 헤더가 두 줄이다 —
 *   첫 줄  로고 · 안내(서비스 안내 · 시험 안내 · 샘플 리포트 · 연구·자문진 · 고객지원) · 로그아웃
 *   둘째 줄 접수하기 · 응시하기 · 정답과 해설 · 결과보기
 *
 * 응시 화면에서는 이 줄이 통째로 **시험지 머리 하나**가 된다 — 로고도 메뉴도 로그아웃도
 * 감추고 평가명 · 과목 · 남은 시간만 세운다.
 *
 * 사이트를 도는 길과 시험을 보는 동안 오가는 길을 갈라 둔다. 오른쪽에는 같은 응시 메뉴를
 * 화면에 붙여 따라다니게 한다(ExamRail) — 목록이 길어 아래로 내려가도 옮겨 다닐 수 있다.
 *
 * 응시 화면(/exam/session — 실제 응시와 셋트)은 문항에 집중하는 자리라 첫 줄의 안내 메뉴,
 * 둘째 줄, 오른쪽 메뉴를 모두 감추고 남은 시간만 띄운다. 틀은 화면 높이에 고정해 바깥
 * 스크롤이 생기지 않는다(ExamShell).
 */

/**
 * 헤더 첫 줄의 안내.
 *
 * 앞의 둘(서비스 안내 · 시험 안내)은 응시 존 안의 화면이라 누르면 아래 응시 메뉴와 오른쪽
 * 리모컨이 그대로 남는다. 뒤의 셋은 공개 존(lib/nav.ts)으로 나간다.
 */
const siteLinks = [
  ...examGuideLinks,
  { href: "/sample", label: "샘플 리포트" },
  { href: "/about/team", label: "연구·자문진" },
  { href: "/support", label: "고객지원" },
];

/** 시험지 글꼴 — 자료·발문·보기에만 쓴다(font-myeongjo). 메뉴와 버튼은 고딕 그대로 둔다 */
const myeongjo = Noto_Serif_KR({
  variable: "--font-noto-serif-kr",
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  display: "swap",
});

/**
 * 응시 존의 색과 모서리.
 *
 * ── 파랑을 걷는다 ──
 * 홍보 화면의 선명한 파랑(soft-primary)은 시험을 보는 자리에서 눈을 먼저 잡아끈다. 존
 * 안에서만 **옅은 청회색**으로 덮으면 단추 · 링크 · 고른 표시가 모두 따라온다 — 자리마다
 * 색을 고쳐 심을 필요가 없고, 회원 존의 파랑은 그대로 남는다.
 *
 * 순수한 검정으로는 두지 않는다. 시험지 글자(exam-text, 짙은 남색) 옆에 새까만 단추가
 * 서면 글보다 단추가 먼저 읽히고, 화면이 딱딱해진다. 글자와 같은 계열에서 한두 단 밝은
 * 청회색이라야 단추가 종이 위에 얹힌 것으로 보인다.
 *
 * ── 모서리를 세운다 ──
 * 알약 모양 단추는 홍보 화면의 말투다. 시험을 보는 자리에서는 가볍게 읽혀, 둥글기를 거의
 * 없앤다. 값은 components/exam/ui.ts가 변수로 읽는다.
 */
const examZone = {
  "--color-soft-primary": "#4a5b76",
  "--color-soft-primary-dark": "#3a4960",
  "--color-soft-primary-soft": "#eef1f6",
  "--ui-r-pill": "2px",
  "--ui-r-card": "2px",
  "--ui-r-field": "2px",
  "--ui-r-box": "2px",
} as CSSProperties;

export default function ExamLayout({ children }: LayoutProps<"/">) {
  return (
    <ExamShell className={`bg-exam-bg text-exam-text ${myeongjo.variable}`} style={examZone}>
      {/* 관리자 화면(ADM-05-3 응시 화면 보호)에서 켜 둔 것만 적용한다 */}
      <ExamGuard />
      {/* 구분선은 inset shadow로 그린다 — border를 쓰면 헤더가 65px이 되어 응시 화면에 1px 스크롤이 생긴다.
          높이는 첫 줄(h-16)이 정한다. 둘째 줄은 응시 화면에서 그리지 않으므로 응시 중에는 늘 64px이다 */}
      <header className="sticky top-0 z-40 shrink-0 bg-exam-panel shadow-[inset_0_-1px_0_var(--color-exam-line)]">
        <div className="container-x flex h-16 items-center justify-between gap-4">
          {/* 왼쪽 — 플랫폼(GENIXX) 옆에 지금 보는 검사 이름(TalentMe)을 붙인다.
              응시 중에는 감춘다. 그 자리에 평가명 · 과목 · 남은 시간이 대신 선다 */}
          <ExamSiteBrand>
            <div className="flex items-center gap-3">
              <Logo />
              <span aria-hidden className="hidden h-5 w-px bg-exam-line sm:block" />
              <span className="hidden text-[13px] font-bold text-exam-muted sm:inline">
                {assessment.name} 재능진단
              </span>
            </div>
          </ExamSiteBrand>
          {/* 가운데 — 사이트 안내. 좁은 화면에서는 로고와 로그아웃에 자리를 내준다.
              응시 화면에서는 그리지 않는다 */}
          <ExamSiteNav links={siteLinks} />
          {/* 응시 중에는 이 줄이 통째로 시험지 머리가 된다 — 평가명 · 과목 · 남은 시간 */}
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            <ExamStatusBar />
            <ExamSiteBrand>
              <SessionBar />
            </ExamSiteBrand>
          </div>
        </div>
        {/* 둘째 줄 — 응시 메뉴 */}
        <ExamTabs />
      </header>

      {/* 오른쪽에 붙어 따라다니는 같은 메뉴 */}
      <ExamRail />

      <ExamMain>{children}</ExamMain>

      <ExamFooterNote />
    </ExamShell>
  );
}
