import StaffDetail from "./StaffDetail";

export const metadata = { title: "운영자 상세" };

/*
 * ADM-03-1 운영자 상세.
 *
 * 목록의 「권한 보기」가 화면 아래 대조표로 뛰던 것을 제 주소로 뺐다. 대조표는 역할
 * 넷의 기본값을 그리는 자리라 「이 사람에게 무엇을 열어 줄까」에는 답하지 못했고,
 * 주소가 없으니 「이 계정 권한 좀 봐 달라」고 링크를 건넬 수도 없었다.
 *
 * ⚠ key를 준다. 같은 경로 꼴 안에서 계정만 갈아 끼우면 React가 조각을 그대로 두어,
 *   앞 계정에 고치던 권한이 다음 계정 화면에 그대로 남는다.
 */
export default async function Admin2StaffDetailPage({ params }: PageProps<"/admin2/staff/[id]">) {
  const { id } = await params;
  return <StaffDetail key={id} id={id} />;
}
