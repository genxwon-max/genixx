import { IBM_Plex_Sans_KR, Noto_Serif_KR } from "next/font/google";
import EdHeader from "@/components/home3/EdHeader";
import EdFooter from "@/components/home3/EdFooter";
import "./home3.css";

/**
 * 잡지 문법의 홍보 존 껍데기 — /home3 전용.
 *
 * (promo)·(site)와 헤더·푸터·글꼴·색을 모두 달리 하려고 존을 따로 뗐다. 한 존
 * 안에 두면 헤더가 같아서 첫 화면이 닮아 보이고, 그러면 색을 아무리 바꿔도 「같은
 * 사이트의 다른 페이지」로 읽힌다.
 *
 * 글꼴은 이 존에서만 싣는다 — 제목은 명조(Noto Serif KR), 본문은 IBM Plex Sans KR.
 * 루트 레이아웃의 Noto Sans KR은 .ed가 덮어쓴다.
 */
const plex = IBM_Plex_Sans_KR({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const serif = Noto_Serif_KR({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["700", "900"],
  display: "swap",
});

export default function EditorialLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`ed flex min-h-full flex-1 flex-col ${plex.variable} ${serif.variable}`}>
      <EdHeader />
      <main className="flex-1">{children}</main>
      <EdFooter />
    </div>
  );
}
