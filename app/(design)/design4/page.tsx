import type { Metadata } from "next";
import DesignIndex from "@/components/design/DesignIndex";

export const metadata: Metadata = {
  title: "디자인 화면 목록 4",
  robots: { index: false, follow: false },
};

/**
 * 디자인 화면 목록 4 (/design4) — 2026-11-12 공개 사이트를 다시 짠 시안을 모은 곳(사용자 요청).
 * 홈은 /design4/home, 하위 화면은 /design4 + 실제 주소다. 목록은 lib/designScreens.ts(area: "design4")가
 * 사이트맵(lib/nav.ts)에서 만든다.
 */
export default function Design4IndexPage() {
  return (
    <DesignIndex
      area="design4"
      title="디자인 화면 목록 4"
      lead={
        <>
          공개 사이트 전체를 공공 교육 포털 모양으로 다시 짠 시안입니다. 홈의 섹션을 넷으로 줄이고, 하위 화면은
          왼쪽 갈래 메뉴 · 현재 위치 · 회색 설명 상자 · 파란 막대 제목으로 통일했습니다. 화면을 내려도 따라오는
          것은 없습니다. 그림 자리와 프롬프트는 docs/design4-image-prompts.md에 있습니다.
        </>
      }
    />
  );
}
