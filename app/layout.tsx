import type { Metadata } from "next";
import { Noto_Sans_KR, Saira } from "next/font/google";
import "./globals.css";

const notoKr = Noto_Sans_KR({
  variable: "--font-noto-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
});

/** 로고 워드마크 전용. 본문에는 쓰지 않는다. */
const saira = Saira({
  variable: "--font-saira",
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
    <html lang="ko" className={`${notoKr.variable} ${saira.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
