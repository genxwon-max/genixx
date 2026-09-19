import { Noto_Serif_KR } from "next/font/google";

/**
 * 보고서 제목과 숫자에 쓰는 명조 — 시안처럼. 본문은 사이트와 같은 고딕(루트 레이아웃)이다.
 * 보고서 새 창과 샘플 미리보기에서만 쓰니 거기서만 불러 다른 화면의 글꼴 내려받기를 늘리지 않는다.
 */
export const serifKr = Noto_Serif_KR({
  variable: "--font-serif-kr",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});
