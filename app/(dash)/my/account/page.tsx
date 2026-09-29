import { redirect } from "next/navigation";

/**
 * ACC-04 내 정보 설정이었던 자리.
 *
 * 같은 내용(회원정보·알림·동의·탈퇴)을 마이페이지(/mypage)가 더 온전하게 들고 있어서
 * 두 화면이 서로 다른 값을 보여 주고 있었다. 이 주소를 눌러 둔 자리가 있을 수 있으므로
 * 없애지 않고 마이페이지로 넘긴다.
 */
export default function AccountPage() {
  redirect("/mypage");
}
