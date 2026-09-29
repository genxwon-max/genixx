import ScreenRolesView from "./ScreenRolesView";

export const metadata = { title: "화면 권한" };

/*
 * ADM-03-2 화면 권한 — 이름을 붙인 화면 묶음을 만들고, 운영자에게 준다.
 *
 * 묶음을 받은 운영자의 콘솔에는 고른 화면만 선다. 저장은 lib/screenAccessStore.ts.
 */
export default function Admin2ScreenRolesPage() {
  return <ScreenRolesView />;
}
