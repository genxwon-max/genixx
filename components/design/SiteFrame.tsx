import Footer from "@/components/Footer";
import Header, { type HeaderAs } from "@/components/Header";

/**
 * 공개 사이트 껍데기의 디자인용 사본 — 머리글 · 본문 · 바닥글.
 *
 * 실제 머리글은 로그인했는지에 따라 오른쪽 단추가 바뀐다(로그인 · 회원가입 ↔ 내 대시보드).
 * 디자인 화면은 주소가 그 상태를 정하므로 비회원 · 회원 가운데 하나로 굳혀 그린다.
 * 공지 팝업은 띄우지 않는다 — 콘솔에서 켠 공지에 따라 화면이 달라지기 때문이다.
 */
export default function SiteFrame({ as, children }: { as: HeaderAs; children: React.ReactNode }) {
  return (
    <>
      <Header forced={as} />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
