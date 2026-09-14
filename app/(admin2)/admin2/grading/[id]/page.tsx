import ScoreBench from "./ScoreBench";

export const metadata = { title: "채점대" };

/*
 * EXP-04 채점대 — 응답 하나에 루브릭을 댄다.
 *
 * 단위가 학생이 아니라 응답이라 주소도 응답 번호(SC-…)로 잡는다.
 */
export default async function Admin2ScorePage({ params }: PageProps<"/admin2/grading/[id]">) {
  const { id } = await params;
  return <ScoreBench key={id} id={id} />;
}
