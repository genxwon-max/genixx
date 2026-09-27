import CounselorEdit from "./CounselorEdit";

export const metadata = { title: "상담사 상세" };

/*
 * EXP-06-2-1 상담사 상세.
 *
 * `new`도 이 주소로 온다 — 등록하는 화면과 고치는 화면이 같은 칸을 쓰므로 둘로 가르면
 * 같은 폼을 두 곳에서 그리게 된다. 번호는 저장할 때 받는다(CounselorEdit).
 */
export default async function Admin2CounselorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CounselorEdit key={id} id={id} />;
}
