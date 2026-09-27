import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "./newhome.css";

/**
 * /newhome 껍데기.
 *
 * 앞선 시안들(/home2 ~ /home5)은 헤더·푸터·글꼴까지 통째로 갈아입었지만 이 시안은
 * 그러지 않는다. 바꾸려는 것이 「어떤 옷을 입을까」가 아니라 **첫 화면이 무엇으로
 * 시작하는가**여서다 — 설명하는 문장 대신 직접 풀어 보는 문항 하나로 연다. 껍데기를
 * 그대로 두어야 기존 첫 화면(/)과 나란히 놓고 그 차이만 볼 수 있다.
 *
 * 존을 따로 뗀 까닭은 CSS 하나 때문이다. 움직임 규칙(newhome.css)을 (site) 전체에
 * 걸면 모든 공개 화면이 그 무게를 진다.
 */
export default function NewHomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="nh flex min-h-full flex-1 flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
