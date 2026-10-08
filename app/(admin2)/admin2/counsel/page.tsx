import CounselList from "./CounselList";

export const metadata = { title: "내 상담" };

/* EXP-06-3 내 상담 — 상담사 권한을 받은 전문가가 자기에게 들어온 면담 신청을 본다 */
export default function Admin2CounselPage() {
  return <CounselList />;
}
