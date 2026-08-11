import AccountChrome from "@/components/account/AccountChrome";

/**
 * 계정 존(ACC) 레이아웃.
 * 사이트맵 12장 URL 규칙 — 공개=/ · 회원=/my · 응시=/exam.
 * 공개 존 대메뉴를 그대로 달지 않는다. 가입·로그인 도중 다른 메뉴로 새는 것을 막기 위해서다.
 */
export default function AccountLayout({ children }: LayoutProps<"/">) {
  return <AccountChrome>{children}</AccountChrome>;
}
