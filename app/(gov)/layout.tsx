import { Gothic_A1 } from "next/font/google";
import GovHeader from "@/components/home4/GovHeader";
import GovFooter from "@/components/home4/GovFooter";
import "./home4.css";

/**
 * 공공기관 문법의 홍보 존 껍데기 — /home4 전용.
 *
 * (editorial)과 같은 이유로 존을 따로 뗀다 — 헤더·푸터·글꼴·색이 다른 존과
 * 섞이면 「같은 사이트의 다른 페이지」로 읽힌다. 본문 글꼴은 루트의 Noto Sans KR을
 * 그대로 쓰고(공공 누리집의 글꼴이 그것이다), 제목만 Gothic A1을 얹는다.
 */
const gothic = Gothic_A1({
  variable: "--font-gothic",
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
});

export default function GovLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`gov relative flex min-h-full flex-1 flex-col ${gothic.variable}`}>
      <a href="#content" className="gv-skip">
        본문 바로가기
      </a>
      <GovHeader />
      <main id="content" className="flex-1">
        {children}
      </main>
      <GovFooter />
    </div>
  );
}
