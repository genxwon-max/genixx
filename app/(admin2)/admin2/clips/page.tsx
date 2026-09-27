import ClipsView from "./ClipsView";

export const metadata = { title: "홍보 영상" };

/*
 * ADM-15-2 홍보 영상 — 첫 화면(/newhome)의 「영상으로 보기」 칸.
 *
 * 목록이 브라우저 저장소에만 있어(lib/clipStore.ts) 서버에서 그릴 것이 없다. 붙일 때는
 * 이 자리에서 콘텐츠 API를 부르고, 첫 화면을 서버가 그리게 옮긴다.
 */
export default function Admin2ClipsPage() {
  return <ClipsView />;
}
