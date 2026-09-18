/**
 * 문항 내용의 공통 형태 — 출제(admin2)가 쓰고 응시 화면(exam)이 그리는 한 벌.
 *
 * 두 쪽이 따로 생긴 형태를 들고 있으면, 출제 화면에서 아무리 공들여 적어도 응시 화면이
 * 그것을 그릴 길이 없다. 그래서 「학생이 보는 것과 채점에 쓰는 정답」만큼은 여기 한 곳에
 * 정의하고, 양쪽은 이 형태를 저장하거나 읽는다. 출제 쪽에만 있는 분류 · 난이도 · 문항 카드는
 * 여기 두지 않는다 — 그것은 학생 화면과 상관이 없다.
 *
 * ── 얼개: 세트 → 묶음 → 문항 ──
 *
 *   세트 [1~4]      자료(Material) 하나를 모든 문항이 함께 읽는다
 *    ├ 문항 1
 *    ├ 묶음 [2~3]   세트 안의 작은 세트 — 자기 자료를 더 얹고, 응시 화면에 함께 선다
 *    │  ├ 문항 2
 *    │  └ 문항 3
 *    └ 문항 4
 *
 * 단일 문항은 「문항 하나짜리 세트」다(자료가 비어 있어도 된다). 그래서 모든 문항이 한
 * 얼개에 들어간다. 깊이는 두 단계까지만 둔다 — 묶음 안에 또 묶음을 두면 번호 머리
 * ([2~3])가 겹쳐 학생이 어느 자료를 읽는지 놓친다.
 *
 * ── 자료는 블록을 쌓는다 ──
 *
 * 지문을 글 한 칸으로 받으면 사진 · 표 · 영상이 들어갈 자리가 없다. 문단 · 목록 · 사진 묶음 ·
 * 표 · 영상 · 음성을 **적힌 차례대로** 쌓는다. 문항도 발문 아래에 같은 블록을 둘 수 있다
 * (문항에만 딸린 사진이나 표).
 */

/** S1 지각 · S2 이해 · S3 생성 · S4 창의 */
export type Level = "S1" | "S2" | "S3" | "S4";

/* ───────────────────────── 자료 블록 ───────────────────────── */

/**
 * 사진 한 장.
 *
 * `marks`는 사진 위에 그리는 화살표 이름표다(시험지의 「A →」). 사진에 구워 넣지 않고
 * 따로 그리는 까닭은 글자가 흐려지지 않게 하려는 것이다. 좌표는 사진 크기에 대한 %다 —
 * (x, y)에 이름을 쓰고 (toX, toY)를 화살표 끝으로 가리킨다.
 */
export type Figure = {
  /** 주소 — public 경로이거나 파일 저장소 주소 */
  src: string;
  caption: string;
  /** 그림을 글로 옮긴 것 — 화면 낭독기가 그림 대신 읽는다 */
  alt: string;
  /** 이름표 — (toX, toY)가 없으면 화살표 없이 글자만 둔다 */
  marks?: { label: string; x: number; y: number; toX?: number; toY?: number }[];
  /** 점선 타원 표시(「흰색 점선으로 표시한 마을」) — 가운데 (x, y), 반지름 (rx, ry), 모두 % */
  rings?: { x: number; y: number; rx: number; ry: number }[];
};

/**
 * 표.
 *
 * `groups`는 머리 위에 한 줄 더 얹는 묶음 머리다(「측정 횟수」가 1회 · 2회 · 3회를 덮는 것).
 * 칸 수만큼 span을 나눠 적고, 빈 머리는 label을 비운다. 칸 안의 줄바꿈은 그대로 줄을 바꾼다.
 */
export type Table = {
  /** 표 위 제목 — 「[측정 결과]」 */
  caption?: string;
  head: string[];
  groups?: { label: string; span: number }[];
  rows: string[][];
};

/**
 * 자료 한 덩이.
 *
 *   text       문단. 「( ㄱ )」처럼 괄호에 든 자음은 빈칸 표지로 읽어 칸 모양으로 세운다
 *   list       목록. 「[측정 방법]」처럼 대괄호로 시작하는 줄은 굵은 머리, 「○」 줄은 들여 쓴다
 *   images     사진 묶음. row는 나란히, sequence는 사이에 ⇨를 세워 시간 순서로 읽힌다
 *   table      표
 *   video      영상 — 소리를 못 듣는 학생을 위해 대본(transcript)을 함께 둔다
 *   audio      음성 — 대본은 채점 · 검수용이고 학생 화면에는 내보이지 않는다(듣기 문항)
 *   animation  화면이 직접 그리는 움직임 — 영상 파일 없이 정해진 주기로 흔드는 진자 따위
 *   rich       마크다운 · HTML로 적어 둔 옛 지문(lib/richText.ts). 새로 쓰는 자료는 블록으로 쓴다
 *   note       자료 아래 붙는 짧은 알림 — 「※ 위 표에서 단위는 초이다.」
 *   box        〈보기〉 상자 — 가운데 이름을 얹은 네모 칸. 발문 아래 「〈보기〉에서 고르시오」 따위
 */
export type Block =
  | { kind: "text"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "images"; layout: "row" | "sequence"; images: Figure[] }
  | { kind: "table"; table: Table }
  | { kind: "video"; src: string; caption: string; transcript: string; poster?: string }
  | { kind: "audio"; src: string; caption: string; transcript: string }
  | { kind: "animation"; preset: "pendulum"; periodSec: number; caption: string }
  | { kind: "rich"; format: "markdown" | "html"; body: string }
  | { kind: "note"; text: string }
  | { kind: "box"; title: string; text: string };

export type BlockKind = Block["kind"];

/**
 * 자료 — 세트나 묶음이 함께 읽는 것.
 *
 * `title`은 출제자가 부르는 이름이다(「등잔과 초」). 응시 화면에는 내보이지 않고, 목록 ·
 * 검수 · 공개 예시가 쓴다. 학생이 읽는 머리는 `lead`다(「다음을 읽고 물음에 답하시오.」).
 */
export type Material = {
  title?: string;
  /** 자료의 갈래 이름 — 「읽기 자료」 · 「관찰 자료」. 공개 예시에만 쓴다 */
  label?: string;
  /** 자료 위 지시문 — 비우면 응시 화면이 기본 지시문을 쓴다 */
  lead?: string;
  blocks: Block[];
};

/* ───────────────────────── 답 칸 ───────────────────────── */

/**
 * 괄호 칸 하나 — 시험지의 「○ 차이점 : (        )」.
 *
 * 칸마다 모양을 고른다 —
 *   options   있으면 글을 쓰지 않고 그중 하나를 고른다(「○ ⓐ - ( ㄱ~ㄹ )」, 「동의 여부」)
 *   short     짧은 값 하나(「방위각 : (   ° )」) — suffix로 단위를 붙인다
 *   template  문장 속 칸 — 「강물은 {}보다 {}에서 더 빠르게 흐른다.」의 {}마다 짧은 칸
 *   draw      그려서 답한다 — 밑그림 주소(빈 문자열이면 흰 종이)
 *   (없으면)  한 문장 이상 쓰는 칸
 */
export type Blank = {
  label: string;
  placeholder?: string;
  options?: string[];
  short?: boolean;
  suffix?: string;
  template?: string;
  draw?: string;
  /** 비워 두어도 되는 칸 — 「그림을 그려서 설명해도 됩니다」 */
  optional?: boolean;
  /** 기계로 맞춰 볼 수 있는 허용 답 — 고르는 칸 · 짧은 칸에서만 쓴다 */
  accept?: string[];
};

/** 선 잇기의 한쪽 항목 — 글이나 사진 */
export type MatchItem = { text: string; image?: Figure };

/**
 * 답하는 방식.
 *
 *   choice  보기 중 하나를 고른다(OX도 보기 둘인 choice다)
 *   blanks  이름 붙은 괄호 칸을 여럿 채운다
 *   essay   긴 글 칸 하나
 *   match   왼쪽 항목과 오른쪽 항목을 선으로 잇는다 — 응시 화면은 4단계에서 붙인다
 *   upload  파일로 낸다 — 그린 것을 찍어 올리는 사진, 말하기 문항의 녹음
 */
export type Response =
  | { kind: "choice"; choices: string[]; answer: number }
  | { kind: "blanks"; blanks: Blank[] }
  | { kind: "essay"; guide?: string[]; placeholder?: string; minLength?: number }
  | { kind: "match"; left: MatchItem[]; right: MatchItem[]; pairs: [number, number][] }
  | { kind: "upload"; media: "image" | "audio" };

export type ResponseKind = Response["kind"];

/* ───────────────────────── 얼개 ───────────────────────── */

/** 문항 하나 — 학생이 보는 것과 채점에 쓰는 것 */
export type ContentQuestion = {
  /** 세트 안에서 유일한 열쇠 */
  id: string;
  level: Level;
  /** 발문 — 줄바꿈은 그대로 줄을 바꾼다 */
  stem: string;
  /** 발문 아래 자료 — 이 문항에만 딸린 사진 · 표 · 영상 */
  blocks?: Block[];
  response: Response;
  /** 채점 기준 — 학생 화면에는 내보이지 않는다 */
  scoring?: string[];
  /** 예시 답 — 칸이 있으면 칸 순서대로 */
  sampleAnswer?: string[];
};

/** 세트 안의 작은 세트 — 자기 자료를 얹고, 안의 문항이 응시 화면에 함께 선다 */
export type ContentGroup = {
  kind: "group";
  id: string;
  material: Material;
  questions: ContentQuestion[];
};

export type ContentNode = ContentQuestion | ContentGroup;

/** 세트 — 자료 하나와 그 자료로 푸는 문항 · 묶음들 */
export type ContentSet = {
  id: string;
  material: Material;
  nodes: ContentNode[];
};

export const isGroup = (n: ContentNode): n is ContentGroup => "kind" in n && n.kind === "group";

/** 세트 안의 문항을 푸는 차례대로 — 묶음은 펼친다 */
export function questionsIn(set: ContentSet): ContentQuestion[] {
  return set.nodes.flatMap((n) => (isGroup(n) ? n.questions : [n]));
}

/** 이 문항이 든 묶음 — 세트에 바로 달린 문항이면 null */
export function groupOf(set: ContentSet, questionId: string): ContentGroup | null {
  for (const n of set.nodes) {
    if (isGroup(n) && n.questions.some((q) => q.id === questionId)) return n;
  }
  return null;
}

/* ───────────────────────── 읽기 도우미 ───────────────────────── */

export const emptyMaterial = (): Material => ({ blocks: [] });

/** 자료에 학생이 읽을 것이 있는가 */
export const materialIsEmpty = (m: Material) =>
  m.blocks.every((b) => {
    switch (b.kind) {
      case "text":
      case "note":
      case "box":
        return !b.text.trim();
      case "rich":
        return !b.body.trim();
      case "list":
        return b.items.every((i) => !i.trim());
      case "images":
        return b.images.length === 0;
      case "table":
        return b.table.rows.length === 0;
      case "video":
      case "audio":
        return !b.src;
      case "animation":
        return false;
    }
  });

/** 자료의 첫 문단 — 목록 · 공개 예시가 한 줄로 보여 줄 때 */
export function firstText(m: Material): string {
  for (const b of m.blocks) if (b.kind === "text" && b.text.trim()) return b.text;
  return "";
}

/** 자료에 든 블록 중 한 갈래만 */
export function blocksOf<K extends BlockKind>(blocks: Block[], kind: K) {
  return blocks.filter((b): b is Extract<Block, { kind: K }> => b.kind === kind);
}

/**
 * 블록 이름 — 출제 화면의 「+ 블록 추가」 메뉴와 검수 목록이 같은 이름을 쓴다.
 */
export const blockKinds: { id: BlockKind; label: string }[] = [
  { id: "text", label: "문단" },
  { id: "list", label: "목록" },
  { id: "images", label: "사진" },
  { id: "table", label: "표" },
  { id: "box", label: "〈보기〉 상자" },
  { id: "video", label: "영상" },
  { id: "audio", label: "음성" },
  { id: "animation", label: "움직이는 그림" },
  { id: "rich", label: "서식 글" },
  { id: "note", label: "알림" },
];

export const responseKinds: { id: ResponseKind; label: string }[] = [
  { id: "choice", label: "보기 고르기" },
  { id: "blanks", label: "괄호 칸" },
  { id: "essay", label: "긴 글" },
  { id: "match", label: "선 잇기" },
  { id: "upload", label: "파일 제출" },
];

/* ───────────────────────── 고치기 도우미 ───────────────────────── */

/** 세트 안의 문항 하나를 고친다 — 묶음 안에 있어도 찾는다 */
export function patchQuestion(
  set: ContentSet,
  id: string,
  patch: (q: ContentQuestion) => ContentQuestion,
): ContentSet {
  const fix = (q: ContentQuestion) => (q.id === id ? patch(q) : q);
  return {
    ...set,
    nodes: set.nodes.map((n) => (isGroup(n) ? { ...n, questions: n.questions.map(fix) } : fix(n))),
  };
}

/** 묶음 하나 — 푸는 차례로 몇 번째부터 몇 번째까지(0부터)를 함께 세우는가 */
export type GroupSpan = { id: string; from: number; to: number; material: Material };

/** 세트의 묶음들을 차례 범위로 */
export function groupSpans(set: ContentSet): GroupSpan[] {
  const spans: GroupSpan[] = [];
  let k = 0;
  for (const n of set.nodes) {
    if (isGroup(n)) {
      spans.push({ id: n.id, from: k, to: k + n.questions.length - 1, material: n.material });
      k += n.questions.length;
    } else k += 1;
  }
  return spans;
}

/**
 * 차례 범위로 묶음을 다시 짠다.
 *
 * 문항 차례는 그대로 두고 묶음 경계만 바꾼다. 범위가 겹치면 앞의 묶음이 이긴다 — 한 문항이
 * 두 묶음에 들 수는 없다.
 */
export function regroup(set: ContentSet, spans: GroupSpan[]): ContentSet {
  const flat = questionsIn(set);
  const sorted = [...spans].sort((a, b) => a.from - b.from);
  const nodes: ContentNode[] = [];
  let k = 0;
  while (k < flat.length) {
    const span = sorted.find((g) => g.from === k && g.to > g.from);
    if (span) {
      const end = Math.min(span.to, flat.length - 1);
      nodes.push({
        kind: "group",
        id: span.id,
        material: span.material,
        questions: flat.slice(k, end + 1),
      });
      k = end + 1;
    } else {
      nodes.push(flat[k]);
      k += 1;
    }
  }
  return { ...set, nodes };
}

/**
 * 자료에 적힌 빈칸 표지 — 「( ㄱ )」 · 「( ㄴ )」.
 *
 * 문항의 답 칸을 만들 때 「지문의 빈칸 불러오기」가 이것을 읽어 칸 이름으로 세운다.
 */
export function blankMarks(blocks: Block[]): string[] {
  const text = blocks
    .map((b) => {
      switch (b.kind) {
        case "text":
        case "note":
        case "box":
          return b.text;
        case "list":
          return b.items.join("\n");
        case "table":
          return [b.table.caption ?? "", ...b.table.head, ...b.table.rows.flat()].join("\n");
        default:
          return "";
      }
    })
    .join("\n");
  const found = [...text.matchAll(/\(\s*([ㄱ-ㅎ])\s*\)/g)].map((m) => `( ${m[1]} )`);
  return [...new Set(found)];
}
