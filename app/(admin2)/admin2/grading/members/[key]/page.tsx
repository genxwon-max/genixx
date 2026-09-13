import SheetView from "./SheetView";

export const metadata = { title: "답안지" };

/*
 * EXP-04-1 답안지 — 배점을 손보고 해설을 붙인다.
 *
 * 주소는 「회차-응시번호」다. 응시번호는 회차 안에서만 유일해서 회차를 앞에 붙여야
 * 다른 회차의 같은 번호와 갈린다.
 */
export default async function Admin2SheetPage({ params }: PageProps<"/admin2/grading/members/[key]">) {
  const { key } = await params;
  return <SheetView key={key} sheetId={key} />;
}
