import type { ItemRow } from "@/lib/admin";

/*
 * ADM-04 문항 은행 — 표(클라이언트)와 머리 지표(서버)가 함께 쓰는 규칙만 모아 둔 조각.
 *
 * ItemsTable.tsx에 두지 않은 까닭: 저 파일은 "use client"라 서버 컴포넌트인 page.tsx가
 * 그 export를 부르면 클라이언트 참조가 넘어와 호출에서 터진다. 그렇다고 page.tsx와
 * ItemsTable.tsx에 같은 배열을 한 벌씩 두면 언젠가 한쪽만 고쳐져 지표와 표의 순서가
 * 어긋난다. 공유 파일(lib/)은 이 화면 하나 때문에 건드릴 것이 아니므로 화면 폴더 안에 둔다.
 */

/**
 * 상태를 세우는 단 하나의 순서 — 「손이 가야 하는 순」.
 *
 * 제작 흐름 순(작성중 → 검수 대기 → …)과 가나다순 둘 다 버렸다. 이 화면을 여는 이유는
 * 거의 언제나 검수 대기를 찾는 것이라, 흐름 순으로 두면 아무도 안 찾는 작성중이 맨 위에
 * 서고 가나다순으로 두면 「사용 중지」가 「승인」보다 위에 선다. 이 배열 하나가 거르개
 * 차림표 · 상태 칸 정렬 · 표의 기본 줄 순서를 모두 정한다.
 */
export const STATE_ORDER: ItemRow["state"][] = ["review", "revise", "draft", "approved", "retired"];

export const stateRank = (s: ItemRow["state"]) => STATE_ORDER.indexOf(s);

/**
 * 출제자와 검수자가 같은 줄.
 *
 * lib/admin.ts의 maySelfReview 주석이 정한 이해충돌 규칙이다 — 출제자와 검수자를 갈라
 * 두는 것이 이 저장소의 전제이고, 슈퍼 관리자만 예외로 통과한다. 예외로 통과했다는 것은
 * 「없던 일」이 아니라 「세어야 할 일」이므로 목록에서 그 줄이 보여야 한다.
 * 지금 예시 데이터에는 위반이 없다 — 한나래↔송준영처럼 서로를 검수한 줄은 위반이 아니다.
 * 그래도 검사는 남긴다. 화면을 꾸미는 규칙이 아니라 데이터가 지켜야 하는 규칙이라서다.
 */
export const selfReview = (r: ItemRow) => r.reviewer !== null && r.reviewer === r.author;
