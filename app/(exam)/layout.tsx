import Logo from "@/components/Logo";
import { assessment } from "@/lib/exam";
import ExamStatusBar from "@/components/exam/ExamStatusBar";
import ExamFooterNote from "@/components/exam/ExamFooterNote";
import SessionBar from "@/components/exam/SessionBar";
import ExamGuard from "@/components/exam/ExamGuard";
import { ExamMain, ExamShell, ExamSiteBrand, ExamSiteNav } from "@/components/exam/ExamShell";
import { examSerif, examZone } from "@/components/exam/skin";
import { examGuideLinks } from "@/lib/examNav";

/**
 * 응시 존 레이아웃 — 문항을 푸는 창과, 가입 전 사람이 진단을 둘러보는 자리.
 *
 * 헤더는 한 줄이다 —
 *   로고 · 안내(서비스 안내 · 진단 안내 · 샘플 리포트 · 연구·자문진 · 고객지원) · 내 대시보드 · 로그아웃
 *
 * ── 접수 · 응시 · 정답과 해설 · 결과는 여기 없다 ──
 * 예전에는 헤더 둘째 줄에 그 넷이 탭으로 서고, 오른쪽에 같은 메뉴가 따라다녔다. 학생
 * 대시보드(/student)에도 같은 일을 하는 화면이 있어 한 가지 일에 자리가 둘이었다. 넷을
 * 모두 대시보드로 모았다 — 진단 접수 · 내 진단 · 정답과 해설 · 진단 결과(DashShell의
 * studentMenu). 이 존에 남은 화면은 진단 둘러보기(/exam) · 서비스 안내 · 진단 안내와
 * 응시 화면(/exam/session)이다.
 *
 * 응시 화면에서는 이 줄이 통째로 **시험지 머리 하나**가 된다 — 로고도 메뉴도 로그아웃도
 * 감추고 평가명 · 과목 · 남은 시간만 세운다. 틀은 화면 높이에 고정해 바깥 스크롤이 생기지
 * 않는다(ExamShell).
 */

/**
 * 헤더 첫 줄의 안내.
 *
 * 앞의 둘(서비스 안내 · 진단 안내)은 응시 존 안의 화면이라 이 헤더가 그대로 남는다.
 * 뒤의 셋은 공개 존(lib/nav.ts)으로 나간다.
 */
const siteLinks = [
  ...examGuideLinks,
  { href: "/sample", label: "샘플 리포트" },
  { href: "/about/team", label: "연구·자문진" },
  { href: "/support", label: "고객지원" },
];

/* 시험지 글꼴(font-myeongjo)과 응시 존의 색 · 모서리는 components/exam/skin.ts에 있다 —
   대시보드 위에 뜨는 「답안 풀이 보기」 창과 디자인 보기의 껍데기가 같은 값을 쓴다 */

export default function ExamLayout({ children }: LayoutProps<"/">) {
  return (
    <ExamShell className={`bg-exam-bg text-exam-text ${examSerif.variable}`} style={examZone}>
      {/* 관리자 화면(ADM-05-3 응시 화면 보호)에서 켜 둔 것만 적용한다 */}
      <ExamGuard />
      {/* 구분선은 inset shadow로 그린다 — border를 쓰면 헤더가 65px이 되어 응시 화면에 1px 스크롤이 생긴다.
          높이는 이 한 줄(h-16)이 정한다 — 응시 화면은 「화면 높이 − 4rem」으로 판을 짠다 */}
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
      </header>

      <ExamMain>{children}</ExamMain>

      <ExamFooterNote />
    </ExamShell>
  );
}
