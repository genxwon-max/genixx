import NoticesView from "./NoticesView";

export const metadata = { title: "공지" };

/*
 * ADM-15 공지 — 사이트에 내보내는 안내.
 *
 * 글이 전부 브라우저 저장소에 있어(lib/contentStore.ts) 서버에서 그릴 것이 없다.
 * 붙일 때는 이 자리에서 콘텐츠 API를 부르고, 첫 화면을 서버가 그리게 옮긴다.
 */
export default function Admin2NoticesPage() {
  return <NoticesView />;
}
