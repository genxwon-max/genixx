import Header4 from "@/components/design4/Header4";
import Footer4 from "@/components/design4/Footer4";
import "../design4.css";

/**
 * /design4 로그인 · 회원가입 껍데기 — 공개 사이트 시안(/design4)과 같은 머리띠 · 푸터를 두른다
 * (2026-11-12 요청). 실제 계정 존(app/(account))은 따로 둔 머리띠(AccountChrome)를 쓰는데,
 * 시안에서는 사이트 어디서 들어와도 같은 머리띠가 보이게 맞췄다.
 *
 * 본문 화면은 계정 존 화면의 사본(components/design4/account)이다 — 링크만 /design4 쪽으로 돌렸다.
 * .d4가 계정 화면의 밝은 파랑(soft-primary)도 이 시안의 파랑으로 바꿔 끼운다(design4.css).
 */
export default function Design4AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="d4 flex min-h-full flex-1 flex-col">
      <Header4 menu={false} />
      <main className="flex-1 bg-[var(--d4-tint)]">{children}</main>
      <Footer4 />
    </div>
  );
}
