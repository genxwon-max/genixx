import AuthoringView from "./AuthoringView";

export const metadata = { title: "문항 출제" };

/*
 * EXP-02 문항 출제.
 *
 * 문항은 브라우저 저장소에만 있어(lib/itemStore.ts) 서버에서 세지 못한다. 이 파일은
 * 껍데기만 두고 안을 클라이언트로 내린다 — 문항 은행(ADM-04)과 같은 꼴이다.
 */
export default function Admin2AuthoringPage() {
  return <AuthoringView />;
}
