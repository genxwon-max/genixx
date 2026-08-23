import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import Shell from "@/components/admin2/Shell";
import "./admin2.css";

/**
 * /admin2 껍데기.
 *
 * 고정폭 글꼴을 이 존에서만 싣는다 — ID·시각·금액이 표에서 자릿수를 맞춰야 세로로
 * 훑힌다. 본문 한글은 루트의 Noto Sans KR 그대로 쓴다(한글 고정폭은 자간이 벌어져
 * 표가 오히려 성글어진다).
 */
const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "GENIXX 콘솔", template: "%s · GENIXX 콘솔" },
  // 내부 콘솔이므로 검색엔진에 노출하지 않는다
  robots: { index: false, follow: false },
};

export default function Admin2Layout({ children }: LayoutProps<"/">) {
  return (
    <div className={`a2 ${mono.variable}`}>
      <Shell>{children}</Shell>
    </div>
  );
}
