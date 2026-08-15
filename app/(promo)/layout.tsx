import PromoHeader from "@/components/promo/PromoHeader";
import Footer from "@/components/Footer";

/**
 * 새 홍보 존 껍데기.
 *
 * 기존 홍보 존((site))은 그대로 두고 헤더만 갈아 끼운 별도 존을 만든다. 두
 * 시안을 나란히 놓고 고른 뒤, 남길 쪽을 `/`로 승격하고 다른 쪽 라우트를 지우면
 * 된다 — 계정 존의 /login1·/login2와 같은 방식이다.
 */
export default function PromoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PromoHeader />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
