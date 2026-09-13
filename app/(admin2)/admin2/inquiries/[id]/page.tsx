import InquiryDetail from "./InquiryDetail";

export const metadata = { title: "문의 상세" };

/*
 * ADM-10 문의 상세 — 한 건에 답하는 자리.
 *
 * 답을 목록 아래에서 펴던 것을 제 주소로 뺐다. 하나 답하고 다음 줄로 내려가는 흐름이
 * 좋아 붙여 두었는데, 붙여 두어 잃은 것이 더 컸다 —
 *
 *   ① 주소가 없어 「이 문의 좀 봐 달라」고 링크를 건넬 수가 없다. 문의는 영업·운영이
 *      나눠 받는 것이라 그 왕복이 잦다.
 *   ② 목록이 답변 판만큼 아래로 밀려, 답을 쓰는 동안 표가 화면 밖으로 나갔다.
 *   ③ 이 콘솔의 다른 목록은 전부 상세로 간다. 문의만 아래에서 펴지면 「답변」을 눌렀을
 *      때 무엇이 일어날지가 화면마다 달라진다.
 *
 * ⚠ key를 준다. 같은 경로 꼴 안에서 문의만 갈아 끼우면 React가 조각을 그대로 두어,
 *   앞 문의에 쓰던 답이 다음 문의 화면에 그대로 남는다.
 */
export default async function Admin2InquiryPage({ params }: PageProps<"/admin2/inquiries/[id]">) {
  const { id } = await params;
  return <InquiryDetail key={id} id={id} />;
}
