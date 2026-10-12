import type { CSSProperties } from "react";
import { Noto_Serif_KR } from "next/font/google";

/**
 * 응시 존의 글꼴 · 색 · 모서리 — 한곳에 적어 두고 세 자리가 함께 쓴다.
 *
 *   app/(exam)/layout.tsx              응시 존 레이아웃
 *   components/design/ExamFrame.tsx    디자인 보기의 응시 존 껍데기
 *   components/exam/AnswerReview.tsx   정답과 해설의 「답안 풀이 보기」 창 — 학생 대시보드 위에 뜬다
 *
 * 글꼴을 부르는 자리마다 글꼴 파일이 한 벌씩 따로 실린다(next/font). 그래서 여기서 한 번만
 * 부르고 나머지는 이 값을 가져다 쓴다.
 */

/** 시험지 글꼴 — 자료 · 발문 · 보기에만 쓴다(font-myeongjo). 메뉴와 버튼은 고딕 그대로 둔다 */
export const examSerif = Noto_Serif_KR({
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
export const examZone = {
  "--color-soft-primary": "#4a5b76",
  "--color-soft-primary-dark": "#3a4960",
  "--color-soft-primary-soft": "#eef1f6",
  "--ui-r-pill": "2px",
  "--ui-r-card": "2px",
  "--ui-r-field": "2px",
  "--ui-r-box": "2px",
} as CSSProperties;

/**
 * 응시 화면의 바탕 — 시험지처럼 흰 종이.
 *
 * 응시 존의 색 토큰(globals.css의 --color-exam-*)을 응시 화면 안에서만 덮는다. 헤더 · 자료 ·
 * 문제 · 이동판 · 하단 바가 모두 이 토큰을 쓰므로 한 곳에서 바꾸면 화면 전체가 희어진다.
 * raised만은 옅은 회색으로 남긴다 — 번호 단추에 마우스를 올렸을 때의 표시가 사라지면 안 된다.
 */
export const examPaper = {
  "--color-exam-bg": "#ffffff",
  "--color-exam-panel": "#ffffff",
  "--color-exam-raised": "#f4f5f7",
} as CSSProperties;
