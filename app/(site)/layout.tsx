import Header from "@/components/Header";
import Footer from "@/components/Footer";
import NoticePopup from "@/components/site/NoticePopup";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      {/* 콘솔에서 「팝업으로 띄움」을 켠 공지가 있으면 여기서 뜬다(ADM-15).
          존 전체에 두는 까닭은 어느 화면으로 들어와도 봐야 하는 말이기 때문이다 —
          점검 안내를 홈에만 띄우면 링크로 바로 들어온 사람은 모르고 응시하러 간다 */}
      <NoticePopup />
    </>
  );
}
