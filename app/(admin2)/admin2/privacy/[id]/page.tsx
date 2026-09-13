import PrivacyDetail from "./PrivacyDetail";

export const metadata = { title: "개인정보 상세" };

/*
 * ADM-10 개인정보 상세 — 한 회원의 동의 이력 전건.
 *
 * 고치는 칸은 없다. 동의는 정보주체가 누르는 것이고, 운영자가 하는 일(파기)은 파기
 * 스케줄러(ADM-10-1)가 맡는다 — 되돌릴 수 없는 일은 한 자리에서만 실행한다.
 */
export default async function Admin2PrivacyDetailPage({ params }: PageProps<"/admin2/privacy/[id]">) {
  const { id } = await params;
  return <PrivacyDetail key={id} id={id} />;
}
