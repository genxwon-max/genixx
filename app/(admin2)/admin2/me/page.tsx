import MyInfo from "./MyInfo";

export const metadata = { title: "내 정보" };

/*
 * ADM-00 내 정보 — 콘솔에 들어와 있는 사람이 자기 계정을 본다.
 *
 * 전문가(출제자 · 검토자 · 진단 위원)는 작업을 이 콘솔에서 하므로, 프로필(이름 · 사진 · 직함 ·
 * 소속 · 연혁 · 소개)도 여기서 고친다. 운영자 계정은 계정 정보를 읽기만 한다 — 운영자의
 * 이름 · 역할은 슈퍼 관리자가 「운영자·권한」에서 정한다.
 *
 * 메뉴(기둥)에는 세우지 않는다. 화면 권한 그룹이 고르는 목록에 「내 정보」가 끼면 누군가는
 * 자기 정보를 못 여는 그룹이 생긴다. 상단 바의 이름을 누르면 온다(components/admin2/Shell.tsx).
 */
export default function Admin2MePage() {
  return <MyInfo />;
}
