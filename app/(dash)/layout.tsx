import DashShell from "@/components/account/DashShell";

/**
 * 로그인 후 회원 존 레이아웃 (/my · /org · /mypage).
 *
 * 가입·로그인 존과 껍데기를 나눈다. 저쪽은 아직 회원이 아닌 사람이 오는 자리라
 * 공개 존 헤더를 이고 있어야 하지만, 여기는 이미 들어온 사람의 작업 공간이다.
 * 사이트맵 12장 URL 규칙(회원=/my)의 경계가 그대로 이 레이아웃의 경계다.
 */
export default function DashLayout({ children }: LayoutProps<"/">) {
  return <DashShell>{children}</DashShell>;
}
