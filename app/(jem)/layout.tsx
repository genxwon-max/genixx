import { Jua } from "next/font/google";
import JemHeader from "@/components/home5/JemHeader";
import JemFooter from "@/components/home5/JemFooter";
import "./home5.css";

/**
 * 잼 파인더 시안의 껍데기 — /home5 전용.
 *
 * 캐릭터 브랜드 화면이라 헤더·푸터·글꼴·색을 다른 존과 전부 달리 한다. 제목 글꼴은
 * Jua(둥근 손글씨) 하나, 본문은 루트의 Noto Sans KR.
 */
const jua = Jua({
  variable: "--font-jua",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

export default function JemLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`jem flex min-h-full flex-1 flex-col ${jua.variable}`}>
      <JemHeader />
      <main className="flex-1">{children}</main>
      <JemFooter />
    </div>
  );
}
