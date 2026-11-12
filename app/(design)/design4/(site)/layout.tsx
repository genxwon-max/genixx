import Header4 from "@/components/design4/Header4";
import Footer4 from "@/components/design4/Footer4";
import Frame4 from "@/components/design4/Frame4";
import "../design4.css";

/**
 * /design4 화면들의 껍데기 — 머리띠 · 틀(왼쪽 갈래 메뉴 + 현재 위치) · 푸터.
 * 홈(/design4/home)은 틀 없이 머리띠와 푸터만 두른다(Frame4가 가른다).
 *
 * .d4가 공개 사이트의 남색 팔레트(brand-*)를 이 시안의 파랑으로 바꿔 끼운다(design4.css).
 * 그래서 공개 사이트에서 옮겨 온 화면 조각도 따로 고치지 않고 같은 색을 입는다.
 */
export default function Design4SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="d4 flex min-h-full flex-1 flex-col">
      <Header4 />
      <main className="flex-1">
        <Frame4>{children}</Frame4>
      </main>
      <Footer4 />
    </div>
  );
}
