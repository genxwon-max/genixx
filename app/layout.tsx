import type { Metadata } from "next";
import { Chakra_Petch, Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const notoKr = Noto_Sans_KR({
  variable: "--font-noto-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
});

/**
 * 로고 워드마크 전용. 본문에는 쓰지 않는다.
 *
 * 한동안 Saira를 썼는데, 인쇄된 로고 원본과 나란히 놓아 보니 G의 배가 둥글게 말리고
 * E의 모서리가 부드러워 원본의 네모난 인상이 나오지 않았다. Chakra Petch는 G의 가로대가
 * 곧게 끊기고 X의 끝이 직각으로 잘려 원본에 훨씬 가깝다.
 */
const chakra = Chakra_Petch({
  variable: "--font-chakra",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "GENIXX | 아이의 재능을 좌표로 보여주는 진단 플랫폼",
    template: "%s | GENIXX",
  },
  description:
    "AI 1차 분석과 교육전문가 협진(HITL)으로 학력과 재능을 각각의 축으로 진단하고, 성장 좌표와 실행 가이드를 제공합니다.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${notoKr.variable} ${chakra.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
