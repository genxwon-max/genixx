"use client";

import { matchSet } from "@/lib/examDesign";
import { seedItem, type ItemDraft } from "@/lib/itemStore";
import ItemPreview from "@/components/admin2/ItemPreview";

/**
 * 문항 미리보기 (실제 주소 /admin2/items/[문항] 의 「미리보기」 창) — 디자인.
 *
 * 검수자가 문항을 아이가 보는 그대로 띄워 보는 창이다. 응시 화면과 같은 조각으로 그리므로, 응시
 * 화면이 바뀌면 이 창도 함께 바뀐다. 달라진 것은 둘이다.
 *
 *   독립 문항   함께 읽는 자료(지문)가 없는 문항은 왼쪽 자료 칸 없이 문항만 가운데 한 칸에 선다.
 *               예전에는 화면 폭에 그대로 펴져 발문 한 줄이 끝에서 끝까지 늘어졌다
 *   선 잇기     긴 글 칸으로 보이던 것이 선을 긋는 칸으로 보인다. 정답은 검수자에게만 글로 적힌다
 *
 * 창은 실제 조각(components/admin2/ItemPreview.tsx)이고, 화면을 통째로 덮는다. 머리의 「정답·해설」
 * 단추는 실제처럼 눌린다. 「닫기」는 눌러도 바뀌지 않는다 — 닫힌 화면(문항 상세)은 디자인에 없다.
 *
 * 객관식 문항은 문항 은행의 것(IT-2602)이고, 선 잇기 문항은 문항 유형 보기의 예시
 * (lib/examDesign.ts의 matchSet)를 문항 은행의 꼴로 옮긴 것이다.
 */

/** 지문이 없는 독립 문항 — 문항 은행의 객관식 한 건 */
const single = seedItem("IT-2602")!;

const matchNode = matchSet.nodes[0];

/**
 * 선 잇기 독립 문항 — 은행의 문항에 응시 화면이 읽는 내용(왼쪽 2개 · 오른쪽 5개 · 정답인 선)을
 * 실었다. 문항 줄은 분류와 배점을 지는 원본이라 번호(id)를 내용의 문항과 맞춘다.
 */
const match: ItemDraft = {
  ...single,
  id: "IT-2651",
  code: "SCI-3-021",
  subject: "과학",
  unit: "자석의 이용",
  passage: "",
  stem: "stem" in matchNode ? matchNode.stem : "",
  guidance: "금속이면 모두 자석에 붙는다고 보는 오개념을 가립니다. 알루미늄 캔이 그 보기입니다.",
  reviewRequest: "",
  comments: [],
  contentAuthored: true,
  content: { id: "IT-2651", material: { blocks: [] }, nodes: matchSet.nodes },
  questions: [
    {
      ...single.questions[0],
      id: matchNode.id,
      type: "short",
      level: "S2",
      stem: "stem" in matchNode ? matchNode.stem : "",
      choices: [],
      distractorIntent: [],
      explain: "철로 만든 못과 클립만 자석에 붙습니다. 알루미늄은 금속이지만 자석에 붙지 않습니다.",
    },
  ],
};

export default function ItemPreviewScreen({ state }: { state: string }) {
  return (
    <ItemPreview
      /* 상태마다 켠 값이 다르다 — 주소를 옮기면 창을 새로 세운다 */
      key={state}
      item={state.startsWith("match") ? match : single}
      startReveal={!state.endsWith("plain")}
      onClose={() => {}}
    />
  );
}
