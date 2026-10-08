import { flattenSets, type ExamSet, type Question } from "./exam";

/**
 * 문항 유형 디자인 보기 (/exam/session/design/[유형]) — 디자인 확인용.
 *
 * 응시 화면에서 유형 하나씩만 떼어 본다. 실제 응시에서 이 유형들을 보려면 표지를 넘기고
 * 그 문항까지 가야 해서, 디자인을 확인하는 사람이 주소 하나로 바로 열 수 있게 따로 세웠다.
 * 화면은 응시와 같은 컴포넌트로 그린다 — 여기서 본 것이 곧 시험지에 서는 모양이다.
 *
 * 문항은 보여 주려고 임의로 적은 것이다. 답은 이 화면 안에만 있고 응시 기록에 남지 않는다.
 */

export type DesignKind = "listen" | "speak" | "short" | "file";

type Design = {
  id: DesignKind;
  /** 유형 이름 — 머리와 목록에 적는다 */
  name: string;
  /** 이 화면에서 볼 것 */
  desc: string;
  set: ExamSet;
};

const story = [
  "민서는 아침마다 창문을 열고 화단을 살폈다. 지난 주말에 심은 봉숭아 씨앗이 언제쯤 싹을 틔울지 궁금했기 때문이다. 첫날에도, 둘째 날에도 흙은 그대로였다.",
  "“씨앗이 잘못된 걸까?” 민서는 걱정이 되었지만 물 주는 일을 거르지 않았다. 사흘째 아침, 흙 위로 아주 작은 초록빛이 고개를 내밀었다. 민서는 소리를 지를 뻔했다.",
];

export const designs: Design[] = [
  {
    id: "listen",
    name: "음성 듣기",
    desc: "음성 파일이 있는 자료와 문항의 「듣기」 버튼",
    set: {
      id: "design-listen",
      subject: "korean",
      material: {
        lead: "다음 이야기를 듣고 물음에 답하시오.",
        blocks: [
          {
            kind: "audio",
            src: "/audio/exam/kor-story.wav",
            caption: "이야기를 읽어 주는 음성입니다. 여러 번 들어도 됩니다.",
            transcript: story.join(" "),
          },
        ],
      },
      nodes: [
        {
          id: "design-listen-1",
          level: "S1",
          stem: "이야기에서 민서가 매일 아침 창문을 연 이유로 가장 알맞은 것은 무엇인가요?",
          response: {
            kind: "choice",
            choices: [
              "방 안 공기를 바꾸고 싶어서",
              "화단에 심은 씨앗이 자랐는지 확인하고 싶어서",
              "화단에서 놀 친구를 기다리고 있어서",
              "그날의 날씨를 미리 알아보고 싶어서",
            ],
            answer: 1,
          },
        },
        {
          id: "design-listen-2",
          level: "S1",
          stem: "다음 세 문장을 듣고, “억지로”와 뜻이 가장 비슷한 말이 들어 있는 문장을 고르세요.",
          blocks: [
            {
              kind: "audio",
              src: "/audio/exam/kor-words.wav",
              caption: "세 문장을 차례로 읽어 줍니다.",
              transcript:
                "하나. 동생이 내 말을 곧이곧대로 믿었다. 둘. 형은 마지못해 자리에서 일어났다. 셋. 고양이가 슬며시 방으로 들어왔다.",
            },
          ],
          response: {
            kind: "choice",
            choices: ["첫째 문장", "둘째 문장", "셋째 문장"],
            answer: 1,
          },
        },
      ],
    },
  },
  {
    id: "speak",
    name: "음성 말하기",
    desc: "서술형 · 논술형 답 칸의 「음성 입력」 — 말한 것이 글로 입력됩니다",
    set: {
      id: "design-speak",
      subject: "korean",
      material: {
        blocks: story.map((text) => ({ kind: "text" as const, text })),
      },
      nodes: [
        {
          id: "design-speak-1",
          level: "S3",
          stem: "이 이야기를 아직 읽지 않은 친구에게 한두 문장으로 간추려 들려준다면 어떻게 말하겠습니까?",
          response: {
            kind: "essay",
            guide: ["누가 무엇을 했는지 먼저 말하기", "그래서 어떻게 되었는지 잇기"],
            placeholder: "예) 민서가 봉숭아 씨앗을 심고 …",
            minLength: 15,
          },
        },
      ],
    },
  },
  {
    id: "short",
    name: "단답형",
    desc: "괄호 칸에 짧게 쓰는 답과, 칸 옆의 음성 입력 버튼",
    set: {
      id: "design-short",
      subject: "math",
      material: {
        blocks: [
          {
            kind: "text",
            text: "학급 문구점에서 구슬 84개를 팔려고 합니다. 구슬은 낱개로 팔지 않고 봉지에 담아서 팝니다.",
          },
          {
            kind: "text",
            text: "한 봉지에는 구슬을 정확히 7개씩 담습니다. 구슬이 남으면 그 구슬은 봉지에 담지 않고 따로 보관합니다.",
          },
        ],
      },
      nodes: [
        {
          id: "design-short-1",
          level: "S1",
          stem: "구슬 84개를 한 봉지에 7개씩 담을 때, 다음 물음에 답하시오.",
          response: {
            kind: "blanks",
            blanks: [
              { label: "필요한 봉지 수", short: true, suffix: "개", accept: ["12"] },
              { label: "계산한 식", placeholder: "예) 84 ÷ …" },
              { label: "남는 구슬이 없는 이유" },
            ],
          },
        },
      ],
    },
  },
  {
    id: "file",
    name: "파일 첨부",
    desc: "종이에 쓰거나 그린 것을 찍어 올리는 「사진 올리기」",
    set: {
      id: "design-file",
      subject: "math",
      material: {
        blocks: [
          {
            kind: "text",
            text: "학급 문구점에서 구슬 84개를 팔려고 합니다. 구슬은 낱개로 팔지 않고 봉지에 담아서 팝니다.",
          },
          {
            kind: "text",
            text: "한 봉지에는 구슬을 정확히 7개씩 담습니다. 구슬이 남으면 그 구슬은 봉지에 담지 않고 따로 보관합니다.",
          },
        ],
      },
      nodes: [
        {
          id: "design-file-1",
          level: "S3",
          stem: "구슬 84개를 한 봉지에 7개씩 담는 모습을 종이에 그림이나 식으로 나타내고, 사진을 찍어 올려 보세요.",
          response: { kind: "upload", media: "image" },
        },
      ],
    },
  },
];

export const isDesignKind = (v: string): v is DesignKind => designs.some((d) => d.id === v);

export const designOf = (id: DesignKind) => designs.find((d) => d.id === id)!;

/** 이 유형의 문항 — 한 화면에 모두 세운다 */
export const designQuestions = (id: DesignKind): Question[] => flattenSets([designOf(id).set]);
