/**
 * 홍보 영상 — /newhome 아래쪽 「영상으로 보기」 칸이 읽는다.
 *
 * ⚠ 아직 올린 영상이 없다. `url`을 비워 두면 카드가 링크가 아니라 「준비 중」 표시로
 *   그려진다 — 없는 주소를 지어 넣지 않기 위해서다. 영상이 올라오면 여기 url만 채우면
 *   화면이 저절로 링크로 바뀐다.
 *
 * 긴 영상(long)은 유튜브 가로 영상, 짧은 영상(short)은 숏폼(쇼츠·릴스)이다. 화면이
 * 카드의 비율을 이 값으로 가른다 — 긴 것은 16:9, 짧은 것은 9:16.
 */

export type ClipKind = "long" | "short";

export type Clip = {
  id: string;
  kind: ClipKind;
  title: string;
  desc: string;
  /** 「3:12」 */
  length: string;
  /** 유튜브 주소. 올리기 전에는 비워 둔다 */
  url?: string;
};

export const clips: Clip[] = [
  {
    id: "intro",
    kind: "long",
    title: "성적표로는 보이지 않던 것",
    desc: "학력 축과 재능 축을 왜 따로 재는지, 3분으로 줄인 소개.",
    length: "3:12",
  },
  {
    id: "hitl",
    kind: "long",
    title: "AI가 먼저 읽고, 사람이 확정합니다",
    desc: "AI 1차 분석에서 전문가 협진까지 — 판정이 정해지는 과정을 따라갑니다.",
    length: "5:40",
  },
  {
    id: "report",
    kind: "long",
    title: "진단서 한 장 읽는 법",
    desc: "무료 요약본 2면을 처음부터 끝까지 함께 읽어 봅니다.",
    length: "4:25",
  },
  {
    id: "short-math",
    kind: "short",
    title: "수학만 유독 잘하는 아이",
    desc: "한 축만 높게 나왔을 때 어떻게 읽어야 할까요.",
    length: "0:45",
  },
  {
    id: "short-mark",
    kind: "short",
    title: "밑줄이 그어지는 자리",
    desc: "창의성이 보이는 순간을 문항 하나로 보여 드립니다.",
    length: "0:38",
  },
  {
    id: "short-code",
    kind: "short",
    title: "접속코드 8자리로 응시하기",
    desc: "아이는 계정을 만들지 않습니다. 보호자가 받은 코드로 들어갑니다.",
    length: "0:52",
  },
];

export const longClips = clips.filter((c) => c.kind === "long");
export const shortClips = clips.filter((c) => c.kind === "short");
