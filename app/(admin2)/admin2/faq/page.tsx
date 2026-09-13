import FaqView from "./FaqView";

export const metadata = { title: "자주 묻는 질문" };

/* ADM-15-1 — 고객지원(PUB-06-1)과 홈이 읽는 목록. 글은 브라우저 저장소에 있다 */
export default function Admin2FaqPage() {
  return <FaqView />;
}
