import PrivacyView from "./PrivacyView";

export const metadata = { title: "개인정보 관리" };

/*
 * ADM-10 개인정보 관리 — 누가 무엇에 동의했나.
 *
 * 지우는 자리는 파기 스케줄러(ADM-10-1)로 나갔다. 여기는 명부라 매일 열어 훑는다.
 *
 * 동의 이력은 회원 명부에서 지은 씨앗이고(lib/privacyStore.ts) 파기 실행만 브라우저에
 * 남는다. 붙일 때는 동의 이력 API로 갈아 끼운다 — 그때 파기 실행도 서버가 맡는다.
 */
export default function Admin2PrivacyPage() {
  return <PrivacyView />;
}
