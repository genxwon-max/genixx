import type { Blank, Response } from "./content";
import type { ItemType } from "./itemStore";

/**
 * 답 칸 표지 — 문항 글 안에 적어, 그 자리에 학생이 답하는 칸을 세우는 약속 (2026-10-16 요청).
 *
 * 출제자는 한글 원고를 쓰듯 문서 편집기에 문항을 쓰고, 답이 들어갈 자리에 표지를 적는다 —
 * 「강물은 ( [정답1] )보다 ( [정답2] )에서 더 빠르게 흐른다.」 · 「그렇게 생각한 이유를 쓰시오.
 * {서술형1}」. 적용하면 출제 화면에는 표지마다 정답을 적는 줄이 생기고, 학생 화면에는 그 자리에
 * 칸이 선다. 문항의 형식도 표지에서 정해진다.
 *
 * 한동안은 형식을 먼저 고르고, 문항 아래 「답 칸 편집기」에서 칸을 하나씩 더해 이름 · 모양을
 * 골랐다. 문항 글과 칸이 떨어져 있어 몇 번째 칸이 어느 괄호인지 다시 맞춰야 했고, 형식을 바꾸면
 * 답 칸이 통째로 바뀌었다. 한글 원고에 「ㄱ = 단답, ㄴ = 서술(이유)」로 적던 것을 그대로 옮기려면
 * 칸이 글 안에 있어야 한다.
 *
 *   표지          형식         학생 화면                출제 화면에서 적는 것
 *   [정답1]       단답형       문장 안의 짧은 칸         정답(여럿이면 쉼표) · 단위
 *   [OX1]         OX           문장 안의 O · X           O 또는 X
 *   [선택1]       객관식       문장 안의 고르는 칸       고를 것들과 그중 정답
 *   {서술형1}     서술형       몇 줄 쓰는 칸             예시 답
 *   {논술형1}     논술형       긴 글 칸 · 글자 수        예시 답
 *   {그리기1}     이미지 첨부  밑그림 위에 그리는 칸     밑그림 · 채점 메모
 *   {사진1}       이미지 첨부  사진을 찍어 올리는 칸     채점 메모
 *   {선잇기1}     객관식       선을 잇는 칸              왼쪽 · 오른쪽 항목과 정답인 선
 *   (표지 없이)   객관식       줄 맨 앞 ① ② ③ … 보기    정답 번호
 *
 * ── 정답을 표지 안에 함께 적는다 ──
 * 「[정답1: A]」처럼 쌍점 뒤에 정답을 적으면 그 칸의 정답으로 들어간다(서술 · 논술은 예시 답).
 * 문서 편집기에서 답이 될 글자를 끌어 고르고 표지 단추를 누르면 고른 글자가 이 꼴로 바뀐다 —
 * 다 쓴 문장에서 빈칸을 뚫듯이 출제한다. 짧은 칸(정답 · OX · 선택)은 편집기를 열 때 정답을 표지
 * 안에 다시 펴 보이고(withSlotAnswers), 적용할 때 표지 안의 것이 그 칸의 정답이 된다
 * (takeSlotAnswers). 저장하는 글에는 정답을 남기지 않는다 — 학생 화면이 읽는 글이다.
 *
 * ── 괄호 ──
 * 대괄호는 문장 안에 들어가는 짧은 칸, 중괄호는 문장 아래에 따로 서는 큰 칸이다. 짧은 칸은
 * 중괄호로 써도 받는다. 큰 칸은 **중괄호만** 받는다 — 시험지는 문제 이름표를 「[서술형 1]」 ·
 * 「[사진 1]」로 적는다. 대괄호까지 받으면 문제 이름표마다 칸이 생긴다(scanSlots의 notes가 짚는다).
 *
 * ── 번호 ──
 * 표지마다 따로 센다(정답1 · 정답2 · 서술형1). 번호가 칸의 이름이라, 글을 고쳐 차례가 바뀌어도
 * 칸마다 적어 둔 정답이 이름을 따라간다(fitSlots). 번호 없이 쓴 표지와 같은 번호를 두 번 쓴 표지는
 * 문서 편집기에서 적용할 때 비어 있는 번호를 받는다(numberSlots). 그 밖의 길로 들어온 글에서는
 * 칸을 세우지 않고 까닭을 남긴다 — 차례로 번호를 매겨 두면 앞에 표지 하나를 끼우는 순간 뒤 칸의
 * 정답이 한 칸씩 밀린다.
 *
 * ⚠ 사진 · 선 잇기는 한 문항에 하나만, 다른 표지 없이 쓴다. 응시 기록이 문항 하나에 사진 한 장 ·
 *   선 잇기 한 판만 담는다(lib/content.ts Response).
 *
 * 저장은 그대로 괄호 칸(Response의 blanks)이다. 칸마다 표지 이름(Blank.slot)을 달 뿐이라 채점 ·
 * 정오표 · 답안 풀이는 지금 셈을 그대로 쓴다. 칸을 글의 그 자리에 세우는 것은 응시 화면
 * (components/exam/ExamSession.tsx의 SlotStem)이고, 출제 화면의 정답 줄은
 * components/admin2/SlotFields.tsx다.
 */

export type SlotKind = "short" | "ox" | "pick" | "write" | "essay" | "draw" | "photo" | "match";

export type SlotSpec = {
  kind: SlotKind;
  /** 표지에 적는 말 — [정답1]의 「정답」 */
  word: string;
  /** 화면에 적는 이름 — 「선 잇기 1」처럼 띄어 쓴 꼴 */
  label: string;
  /** 리본 단추와 안내가 쓰는 괄호 */
  open: "[" | "{";
  /** 칸 종류의 이름 — 출제 화면의 정답 줄 머리 */
  name: string;
  /** 이 표지만 있을 때의 문항 형식 */
  type: ItemType;
  /** 문장 안에 서는 칸인가 — 아니면 문장 아래에 따로 선다 */
  inline: boolean;
  /** 한 문항에 이것 하나만, 다른 표지 없이 */
  alone?: boolean;
  /** 기계로 채점하는가 — 정답을 적어야 검수로 낼 수 있다 */
  machine: boolean;
  /**
   * 문서 편집기에서 글자를 고르고 단추를 누르면 고른 글자를 무엇으로 삼는가 —
   * answer는 정답(예시 답)으로 표지 안에 담고, 없으면 고른 글자를 두고 그 뒤에 표지를 넣는다.
   */
  pick?: "answer";
  /** 표지 안내 — 학생 화면에 서는 것 */
  shows: string;
  /** 표지 안내 — 출제 화면에서 적는 것 */
  asks: string;
  /** 표지 안내 — 문항 글의 예 */
  example: string;
};

export const slotSpecs: SlotSpec[] = [
  {
    kind: "short",
    word: "정답",
    label: "정답",
    open: "[",
    name: "단답형",
    type: "short",
    inline: true,
    machine: true,
    pick: "answer",
    shows: "문장 안의 짧은 칸",
    asks: "정답 — 여럿이면 쉼표로 · 단위",
    example: "강물은 ( [정답1: A] )보다 ( [정답2: B] )에서 더 빠르게 흐른다.",
  },
  {
    kind: "ox",
    word: "OX",
    label: "OX",
    open: "[",
    name: "OX",
    type: "ox",
    inline: true,
    machine: true,
    shows: "문장 안의 O · X",
    asks: "O 또는 X",
    example: "물은 얼면 부피가 늘어난다. ( [OX1: O] )",
  },
  {
    kind: "pick",
    word: "선택",
    label: "선택",
    open: "[",
    name: "선택형",
    type: "choice",
    inline: true,
    machine: true,
    pick: "answer",
    shows: "문장 안의 고르는 칸",
    asks: "고를 것들과 그중 정답",
    example: "친구의 주장에 동의합니까? [선택1: 동의하지 않음]",
  },
  {
    kind: "write",
    word: "서술형",
    label: "서술형",
    open: "{",
    name: "서술형",
    type: "descriptive",
    inline: false,
    machine: false,
    pick: "answer",
    shows: "몇 줄 쓰는 칸",
    asks: "예시 답",
    example: "그렇게 생각한 이유를 쓰시오. {서술형1}",
  },
  {
    kind: "essay",
    word: "논술형",
    label: "논술형",
    open: "{",
    name: "논술형",
    type: "essay",
    inline: false,
    machine: false,
    pick: "answer",
    shows: "긴 글 칸 · 글자 수",
    asks: "예시 답",
    example: "자신의 생각을 한 편의 글로 쓰시오. {논술형1}",
  },
  {
    kind: "draw",
    word: "그리기",
    label: "그리기",
    open: "{",
    name: "그리기",
    type: "image",
    inline: false,
    machine: false,
    shows: "밑그림 위에 그리는 칸",
    asks: "밑그림 · 채점 메모",
    example: "먼 훗날의 모습을 그림 위에 그리시오. {그리기1}",
  },
  {
    kind: "photo",
    word: "사진",
    label: "사진",
    open: "{",
    name: "사진 올리기",
    type: "image",
    inline: false,
    alone: true,
    machine: false,
    shows: "사진을 찍어 올리는 칸",
    asks: "채점 메모",
    example: "종이에 식을 쓰고 사진을 찍어 올리시오. {사진1}",
  },
  {
    kind: "match",
    word: "선잇기",
    label: "선 잇기",
    open: "{",
    name: "선 잇기",
    type: "choice",
    inline: false,
    alone: true,
    machine: true,
    shows: "선을 잇는 칸",
    asks: "왼쪽 · 오른쪽 항목과 정답인 선",
    example: "알맞은 것끼리 선으로 이으시오. {선잇기1}",
  },
];

const specByWord = new Map(slotSpecs.map((s) => [s.word, s]));

export const slotSpec = (kind: SlotKind) => slotSpecs.find((s) => s.kind === kind)!;

/** 표지에 적은 말을 고른 말로 — 「선 잇기」 · 「ox」도 받는다 */
function wordOf(raw: string) {
  const w = raw.replace(/\s+/g, "");
  return /^ox$/i.test(w) ? "OX" : w;
}

const INLINE_WORDS = "정답|OX|선택";
const BLOCK_WORDS = "서술형|논술형|그리기|사진|선\\s?잇기";
/** 표지 안의 정답 — 쌍점(: ：) 또는 = 뒤. 대괄호 안에서는 줄을 넘지 않는다 */
const SEP = "[:：=]";
const MARK =
  `\\[\\s*(${INLINE_WORDS})\\s*(\\d{1,2})?\\s*(?:${SEP}([^\\]\\n]*))?\\]` +
  `|\\{\\s*(${INLINE_WORDS}|${BLOCK_WORDS})\\s*(\\d{1,2})?\\s*(?:${SEP}([^}]*))?\\}`;
/** 대괄호로 쓴 큰 칸 — 시험지의 문제 이름표(「[서술형 1]」)와 같은 꼴이라 칸으로 읽지 않는다 */
const SQUARE_BLOCK = `\\[\\s*(?:${BLOCK_WORDS})\\s*\\d{0,2}\\s*\\]`;

/** 표지를 찾는 식 — g 깃발이라 부를 때마다 새로 만든다(lastIndex를 나눠 쓰지 않게) */
export const slotPattern = () => new RegExp(MARK, "gi");

/** 칸 하나 — 표지 이름(정답1)과 종류, 글 안의 자리 */
export type SlotMark = {
  /** 칸의 이름 — 「정답1」. 한 문항 안에서 하나뿐이다 */
  key: string;
  kind: SlotKind;
  no: number;
  at: number;
  end: number;
};

/** 글에 적힌 표지 하나 — 칸이 서는 것(mark)과, 서지 않는 까닭(problem) */
export type SlotToken = {
  at: number;
  end: number;
  raw: string;
  kind: SlotKind;
  /** 적은 번호 — 없으면 null */
  no: number | null;
  /** 표지 안에 적은 정답 — 쌍점이 없으면 undefined, 쌍점만 있으면 빈 글 */
  answer?: string;
  mark?: SlotMark;
  problem?: string;
  /** 문서 편집기가 적용할 때 번호를 새로 줄 표지인가 — 번호가 없거나 겹친다 */
  renumber?: boolean;
};

export type SlotScan = {
  /** 칸이 서는 표지 — 글에 적힌 차례대로 */
  marks: SlotMark[];
  /** 표지로 읽은 것 전부 — 칸이 서지 않는 것까지. 학생 화면은 서지 않는 것을 글에서 걷는다 */
  tokens: SlotToken[];
  /** 고쳐야 칸이 서는 것 — 검수로 낼 수 없다 */
  issues: string[];
  /** 알려 둘 것 — 칸으로 읽지 않은 문제 이름표 */
  notes: string[];
};

/** 표지 이름 → 화면에 적는 이름 — 「정답1」 → 「정답 1」 */
export function slotName(key: string) {
  const m = key.match(/^(\D+?)(\d+)$/);
  if (!m) return key;
  return `${specByWord.get(m[1])?.label ?? m[1]} ${m[2]}`;
}

/** 표지 이름 → 칸 종류 */
export function slotKindOf(key: string | undefined): SlotKind | null {
  const m = key?.match(/^(\D+?)(\d+)$/);
  return m ? (specByWord.get(m[1])?.kind ?? null) : null;
}

/** 표지 안에 담을 수 있는 글 — 닫는 괄호와 줄바꿈은 뺀다 */
const answerText = (s: string) =>
  s
    .replace(/[\]}]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** 문서에 넣는 표지 — 「[정답1]」 · 「[정답1: A]」 · 「{서술형2}」 */
export function slotToken(kind: SlotKind, no: number | null, answer?: string) {
  const s = slotSpec(kind);
  const body = `${s.word}${no ?? ""}${answer ? `: ${answerText(answer)}` : ""}`;
  return s.open === "[" ? `[${body}]` : `{${body}}`;
}

export function scanSlots(text: string): SlotScan {
  const tokens: SlotToken[] = [];
  const seen = new Set<string>();
  for (const m of text.matchAll(slotPattern())) {
    const word = wordOf(m[1] ?? m[4]);
    const digits = m[2] ?? m[5];
    const given = m[3] ?? m[6];
    const spec = specByWord.get(word)!;
    const token: SlotToken = {
      at: m.index,
      end: m.index + m[0].length,
      raw: m[0],
      kind: spec.kind,
      no: digits ? Number(digits) : null,
      ...(given !== undefined ? { answer: given.trim() } : {}),
    };
    const key = digits ? `${word}${Number(digits)}` : "";
    if (!digits) {
      token.problem = `「${m[0]}」 — 번호가 없어 칸이 생기지 않습니다. 「${slotToken(spec.kind, 1)}」처럼 번호를 붙여 주세요.`;
      token.renumber = true;
    } else if (seen.has(key)) {
      token.problem = `「${slotName(key)}」 표시가 두 번 있습니다. 뒤의 표시에는 칸이 생기지 않습니다.`;
      token.renumber = true;
    } else {
      seen.add(key);
      token.mark = { key, kind: spec.kind, no: Number(digits), at: token.at, end: token.end };
    }
    tokens.push(token);
  }

  /* 사진 · 선 잇기는 혼자 쓴다. 다른 칸이 있으면 그 칸들을 살리고, 혼자 쓰는 표지끼리만 있으면
     첫 것을 살린다 — 어느 쪽이든 출제자가 짚을 수 있게 까닭을 남긴다 */
  const live = tokens.filter((t) => t.mark || t.renumber);
  const alone = live.filter((t) => slotSpec(t.kind).alone);
  if (alone.length > 0 && (live.length > alone.length || alone.length > 1)) {
    const keep = live.length === alone.length ? alone[0] : null;
    for (const t of alone) {
      if (t === keep) continue;
      t.problem = `「${slotSpec(t.kind).label}」 표시는 다른 표시와 함께 쓸 수 없습니다. 사진 · 선 잇기는 한 문항에 하나만 씁니다.`;
      t.mark = undefined;
      t.renumber = undefined;
    }
  }

  const notes = [...text.matchAll(new RegExp(SQUARE_BLOCK, "g"))].map((m) => {
    const spec = specByWord.get(wordOf(m[0].replace(/[[\]\d\s]/g, "")));
    return `「${m[0]}」 — 대괄호로 쓴 큰 칸은 문제 이름표로 보고 칸을 만들지 않았습니다. 칸을 만들려면 「${
      spec ? slotToken(spec.kind, 1) : "{서술형1}"
    }」처럼 중괄호로 씁니다.`;
  });

  return {
    marks: tokens.flatMap((t) => (t.mark ? [t.mark] : [])),
    tokens,
    issues: tokens.flatMap((t) => (t.problem ? [t.problem] : [])),
    notes,
  };
}

/** 글에 표지가 하나라도 있는가 — 칸이 서지 않는 표지까지 센다 */
export const hasSlots = (text: string) => slotPattern().test(text);

/** 다음 번호 — 그 표지가 이미 쓴 번호 가운데 가장 큰 것 다음 */
export function nextSlotNo(text: string, kind: SlotKind) {
  const nos = scanSlots(text)
    .tokens.filter((t) => t.kind === kind && t.no !== null)
    .map((t) => t.no!);
  return nos.length > 0 ? Math.max(...nos) + 1 : 1;
}

/** 글을 표지 자리에서 갈라 다시 잇는다 — 표지마다 바꿀 글을 돌려받는다 */
function rewrite(text: string, tokens: SlotToken[], put: (t: SlotToken) => string) {
  let out = "";
  let k = 0;
  for (const t of tokens) {
    out += text.slice(k, t.at) + put(t);
    k = t.end;
  }
  return out + text.slice(k);
}

/**
 * 번호 없는 표지와 겹친 번호에 빈 번호를 준다 — 문서 편집기가 적용할 때.
 *
 * 「[정답]」 · 「[정답: A]」로 써도 되고, 한 줄을 복사해 「[정답1]」이 둘이 되어도 뒤의 것이 새 번호를
 * 받는다. 번호는 그 표지가 쓰지 않은 가장 작은 수부터 글의 차례대로 준다.
 */
export function numberSlots(text: string) {
  const { tokens } = scanSlots(text);
  if (!tokens.some((t) => t.renumber)) return text;
  const used = new Map<SlotKind, Set<number>>();
  for (const t of tokens) {
    if (!t.mark) continue;
    used.set(t.kind, (used.get(t.kind) ?? new Set()).add(t.mark.no));
  }
  return rewrite(text, tokens, (t) => {
    if (!t.renumber) return t.raw;
    const taken = used.get(t.kind) ?? new Set<number>();
    let no = 1;
    while (taken.has(no)) no += 1;
    used.set(t.kind, taken.add(no));
    return slotToken(t.kind, no, t.answer);
  });
}

/**
 * 표지 안에 적은 정답을 떼어 낸다 — 문서 편집기가 적용할 때.
 *
 * 돌려주는 글에는 정답 없는 표지(「[정답1]」)만 남는다. 짧은 칸(정답 · OX · 선택)은 표지 안이 곧 그
 * 칸의 정답이라 쌍점이 없으면 빈 글로 담는다 — 편집기를 열 때 정답을 표지 안에 펴 두므로(withSlotAnswers),
 * 거기서 지운 정답은 지운 것이다. 큰 칸은 적은 것만 담는다 — 예시 답은 편집기에 펴지 않는다.
 */
export function takeSlotAnswers(text: string): { text: string; given: Record<string, string> } {
  const { tokens } = scanSlots(text);
  const given: Record<string, string> = {};
  const out = rewrite(text, tokens, (t) => {
    if (!t.mark) return t.raw;
    if (t.answer !== undefined) given[t.mark.key] = answerText(t.answer);
    else if (slotSpec(t.kind).inline) given[t.mark.key] = "";
    return slotToken(t.kind, t.mark.no);
  });
  return { text: out, given };
}

/**
 * 짧은 칸의 정답을 표지 안에 펴 둔다 — 문서 편집기를 열 때.
 * 「[정답1]」 → 「[정답1: A, 에이]」 · 「[OX1]」 → 「[OX1: O]」 · 「[선택1]」 → 「[선택1: 동의함]」.
 */
export function withSlotAnswers(text: string, fit: SlotAnswer) {
  const blanks = fit.response.kind === "blanks" ? fit.response.blanks : [];
  const { tokens } = scanSlots(text);
  return rewrite(text, tokens, (t) => {
    const b = t.mark && blanks.find((x) => x.slot === t.mark!.key);
    if (!t.mark || !b || !slotSpec(t.kind).inline) return t.raw;
    const accept = (b.accept ?? []).filter((a) => a.trim());
    const answer = t.kind === "short" ? accept.join(", ") : (accept[0] ?? "");
    return slotToken(t.kind, t.mark.no, answer);
  });
}

/* ───────────────────────── 학생 화면이 읽는 꼴 ───────────────────────── */

/** 글 한 조각 · 칸 하나 · 칸이 서지 않는 표지(출제 화면만 — 붉게 보인다) */
export type SlotRun = { text: string } | { mark: SlotMark } | { bad: SlotToken };

/**
 * 한 줄 흐름(글과 문장 안 칸)이거나, 따로 서는 큰 칸.
 *
 * 큰 칸 앞뒤의 줄바꿈은 걷는다 — 「이유를 쓰시오.⏎{서술형1}⏎(2) …」에서 칸이 이미 줄을 가르므로
 * 줄바꿈까지 그리면 칸 위아래에 빈 줄이 하나씩 더 생긴다.
 */
export type SlotFlow = { line: SlotRun[] } | { block: SlotMark };

export function slotFlows(text: string, { keepBad = false }: { keepBad?: boolean } = {}): SlotFlow[] {
  const { tokens } = scanSlots(text);
  const flows: SlotFlow[] = [];
  let line: SlotRun[] = [];
  let k = 0;
  let afterBlock = false;
  const pushText = (t: string) => {
    const s = afterBlock ? t.replace(/^\s*\n/, "") : t;
    afterBlock = false;
    if (s) line.push({ text: s });
  };
  const closeLine = () => {
    const last = line[line.length - 1];
    if (last && "text" in last) {
      const s = last.text.trimEnd();
      if (s) line[line.length - 1] = { text: s };
      else line.pop();
    }
    if (line.some((r) => !("text" in r) || r.text.trim())) flows.push({ line });
    line = [];
  };
  for (const t of tokens) {
    if (t.at > k) pushText(text.slice(k, t.at));
    k = t.end;
    /* 칸이 서지 않는 표지는 학생 화면에서 걷는다 — 「[정답]」이 글자로 보이면 시험지가 아니다.
       출제 화면은 남겨 붉게 그린다(keepBad) — 고칠 자리가 보여야 한다 */
    if (!t.mark) {
      if (keepBad) line.push({ bad: t });
      continue;
    }
    if (slotSpec(t.kind).inline) {
      afterBlock = false;
      line.push({ mark: t.mark });
    } else {
      closeLine();
      flows.push({ block: t.mark });
      afterBlock = true;
    }
  }
  if (k < text.length) pushText(text.slice(k));
  closeLine();
  return flows;
}

/**
 * 목록 한 줄에 세울 글 — 문장 안 칸은 「□」로, 큰 칸은 걷는다.
 * 목록 · 검수 대기열은 발문을 한 줄로 읽는다. 「[정답1]」을 읽어야 할 까닭이 없다. 괄호로 바꾸지
 * 않는 것은 출제자가 표지를 괄호 안에 쓰기 때문이다 — 「( [정답1] )」이 「( (   ) )」가 된다.
 */
export function slotPlain(text: string) {
  const { tokens } = scanSlots(text);
  return rewrite(text, tokens, (t) => (t.mark && slotSpec(t.kind).inline ? "□" : ""));
}

/* ───────────────────────── 답 칸 짜기 ───────────────────────── */

/** 답하는 방식과 칸마다의 정답 · 예시 답 — 칸 차례대로 */
export type SlotAnswer = { response: Response; answers: string[] };

/** 새 칸 — 종류마다 정답 자리를 세워 둔다 */
export function newSlotBlank(mark: Pick<SlotMark, "key" | "kind">): Blank {
  const base: Blank = { label: "", slot: mark.key };
  switch (mark.kind) {
    case "short":
      return { ...base, short: true };
    case "ox":
      return { ...base, options: ["O", "X"] };
    case "pick":
      return { ...base, options: ["", ""] };
    case "draw":
      return { ...base, draw: "" };
    default:
      return base;
  }
}

/** O · X로 읽히는 글 — 「○」 · 「맞다」도 받는다 */
export function oxOf(s: string): "O" | "X" | null {
  const t = s.replace(/\s+/g, "");
  if (/^(o|○|◯|맞다|맞음|예|참)$/i.test(t)) return "O";
  if (/^(x|×|✕|✗|틀리다|틀림|아니다|아니오|거짓)$/i.test(t)) return "X";
  return null;
}

/** 쉼표로 적은 정답들 */
export const acceptOf = (s: string) =>
  s
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);

/**
 * 칸 하나에 정답을 넣는다 — 표지 안에 적은 것 · 정답 줄에 적은 것이 같은 길로 들어온다.
 *
 *   정답       쉼표로 가른 것이 허용 답, 첫 것이 예시 답
 *   OX         O 또는 X
 *   선택       고를 것 가운데 하나 — 없는 것이면 빈 자리에 넣는다
 *   서술 · 논술 · 그리기   예시 답 · 채점 메모
 */
export function putSlotAnswer(kind: SlotKind, b: Blank, given: string): [Blank, string] {
  const v = given.trim();
  switch (kind) {
    case "short": {
      const accept = acceptOf(v);
      return [{ ...b, accept: accept.length > 0 ? accept : undefined }, accept[0] ?? ""];
    }
    case "ox": {
      const ox = oxOf(v);
      return [{ ...b, accept: ox ? [ox] : undefined }, ox ?? ""];
    }
    case "pick": {
      if (!v) return [{ ...b, accept: undefined }, ""];
      const options = [...(b.options ?? [])];
      if (!options.includes(v)) {
        const empty = options.findIndex((o) => !o.trim());
        if (empty >= 0) options[empty] = v;
        else options.push(v);
      }
      while (options.length < 2) options.push("");
      return [{ ...b, options, accept: [v] }, v];
    }
    default:
      return [b, given];
  }
}

/**
 * 글의 표지에 맞춰 답 칸을 다시 짠다.
 *
 * 칸은 표지가 적힌 차례로 선다. 이름(정답1)이 같은 칸은 적어 둔 정답 · 예시 답을 그대로 옮기고,
 * 새 표지에는 빈 칸을 세운다. 글에서 지운 표지의 칸은 함께 사라진다. given은 표지 안에 적은
 * 정답이다(takeSlotAnswers) — 있으면 옮겨 온 것보다 앞선다.
 */
export function fitSlots(text: string, prev: SlotAnswer, given: Record<string, string> = {}): SlotAnswer {
  const { marks } = scanSlots(text);
  const alone = marks.find((m) => slotSpec(m.kind).alone);
  if (alone?.kind === "photo") {
    const memo = given[alone.key] ?? (prev.response.kind === "upload" ? prev.answers[0] : undefined);
    return { response: { kind: "upload", media: "image" }, answers: memo ? [memo] : [] };
  }
  if (alone?.kind === "match") {
    return {
      response:
        prev.response.kind === "match"
          ? prev.response
          : { kind: "match", left: [{ text: "" }], right: [{ text: "" }], pairs: [] },
      answers: [],
    };
  }
  const old = prev.response.kind === "blanks" ? prev.response.blanks : [];
  const blanks: Blank[] = [];
  const answers: string[] = [];
  for (const m of marks) {
    const k = old.findIndex((b) => b.slot === m.key);
    let b = k >= 0 ? old[k] : newSlotBlank(m);
    let a = k >= 0 ? (prev.answers[k] ?? "") : "";
    if (given[m.key] !== undefined) [b, a] = putSlotAnswer(m.kind, b, given[m.key]);
    blanks.push(b);
    answers.push(a);
  }
  return { response: { kind: "blanks", blanks }, answers };
}

/**
 * 표지에서 읽은 문항 형식 — 칸이 여럿이면 사람이 채점하는 칸이 형식을 정한다.
 *
 * 단답 칸 둘에 서술 칸 하나를 둔 문항은 서술형이다. 단답 칸은 기계가 맞춰 보지만 서술 칸은
 * 전문가가 채점하므로, 문항은 통째로 전문가에게 간다(lib/exam.ts autoGraded).
 */
const TYPE_RANK: ItemType[] = ["essay", "descriptive", "image", "short", "choice", "ox"];

export function slotType(marks: Pick<SlotMark, "kind">[]): ItemType | null {
  const types = new Set(marks.map((m) => slotSpec(m.kind).type));
  return TYPE_RANK.find((t) => types.has(t)) ?? null;
}

/**
 * 칸마다 모자란 것 — 기계가 채점하는 칸의 정답. 서술 · 논술 · 그리기 · 사진의 예시 답은 묻지
 * 않는다(모범답안 · 부분점수 칸이 문항 전체로 받는다).
 *
 * 「정답 1」 · 「OX 1 정답」처럼 칸 이름으로 적는다 — 검수로 제출 단추의 풍선 도움말이 읽는다.
 */
export function slotGaps(text: string, fit: SlotAnswer): string[] {
  const { marks, issues } = scanSlots(text);
  const out: string[] = issues.length > 0 ? ["답 칸 표시"] : [];
  const r = fit.response;
  for (const m of marks) {
    const name = m.kind === "short" ? slotName(m.key) : `${slotName(m.key)} 정답`;
    if (m.kind === "match") {
      if (r.kind !== "match" || r.pairs.length === 0) out.push(name);
      continue;
    }
    if (!slotSpec(m.kind).machine) continue;
    const b = r.kind === "blanks" ? r.blanks.find((x) => x.slot === m.key) : undefined;
    const accept = b?.accept?.filter((a) => a.trim()) ?? [];
    if (accept.length === 0) out.push(name);
    else if (m.kind === "pick" && (b!.options ?? []).filter((o) => o.trim()).length < 2) {
      out.push(`${slotName(m.key)} 고를 것`);
    }
  }
  return out;
}

/* ───────────────────────── 표지 없이 만든 답 칸 ───────────────────────── */

/**
 * 표지 없이 만든 답 칸을 표지로 옮긴다 — 문항 글 끝에 표지를 잇고, 칸마다 적어 둔 것을 담는다.
 *
 * 표지가 생기기 전의 문항은 답 칸이 문항 글 밖에 있다(「○ 이유 : (    )」 꼴의 이름 붙은 칸,
 * 긴 글 칸 하나, 사진, 선 잇기). 칸 이름은 글 한 줄로 옮긴다 —
 *
 *   문장 속 괄호   「강물은 {}보다 {}에서 …」 → 「강물은 ( [정답1] )보다 ( [정답2] )에서 …」
 *   짧은 칸        「○ 방위각 : ( [정답1] )」 — 단위는 칸에 그대로
 *   고르는 칸      「○ 동의 여부 : [선택1]」
 *   쓰는 칸        「○ 이유 : {서술형1}」
 *   그리는 칸      「○ 먼 옛날의 모습 {그리기1}」
 *   긴 글 칸       서술형이면 {서술형1}, 논술형이면 {논술형1}
 *
 * 이름 없는 짧은 칸 하나뿐인 문항(옛 단답형)은 문항 글 끝 줄에 「( [정답1] )」을 붙인다.
 */
export function legacySlots(
  stem: string,
  type: ItemType,
  prev: SlotAnswer,
): SlotAnswer & { stem: string } {
  const r = prev.response;
  const head = stem.trimEnd();
  const below = (line: string) => (head ? `${head}\n${line}` : line);

  if (r.kind === "upload") return { stem: below("{사진1}"), response: r, answers: prev.answers };
  if (r.kind === "match") return { stem: below("{선잇기1}"), response: r, answers: [] };
  if (r.kind === "essay") {
    const kind: SlotKind = type === "essay" ? "essay" : "write";
    const blank: Blank = {
      ...newSlotBlank({ key: `${slotSpec(kind).word}1`, kind }),
      ...(r.placeholder ? { placeholder: r.placeholder } : {}),
    };
    return {
      stem: below(slotToken(kind, 1)),
      response: { kind: "blanks", blanks: [blank] },
      answers: [prev.answers[0] ?? ""],
    };
  }
  if (r.kind !== "blanks") return { stem, response: r, answers: prev.answers };

  const count: Partial<Record<SlotKind, number>> = {};
  const take = (kind: SlotKind) => {
    const no = (count[kind] ?? 0) + 1;
    count[kind] = no;
    return { key: `${slotSpec(kind).word}${no}`, kind, no };
  };
  const blanks: Blank[] = [];
  const answers: string[] = [];
  const lines: string[] = [];

  r.blanks.forEach((b, i) => {
    const answer = prev.answers[i] ?? "";
    const label = b.label.trim();
    const named = label ? `○ ${label} : ` : "";
    if (b.template !== undefined) {
      const sample = slotsInSample(b.template, answer);
      let n = 0;
      const line = b.template.replace(/\{\}/g, () => {
        const m = take("short");
        const accept = (b.accept?.[n] ?? sample[n] ?? "").trim();
        n += 1;
        blanks.push({ ...newSlotBlank(m), ...(accept ? { accept: [accept] } : {}) });
        answers.push(accept);
        return `( ${slotToken("short", m.no)} )`;
      });
      lines.push(named + line);
      return;
    }
    if (b.options) {
      const m = take("pick");
      blanks.push({ ...b, label: "", slot: m.key });
      answers.push(answer);
      lines.push(`${named}${slotToken("pick", m.no)}`);
      return;
    }
    if (b.draw !== undefined) {
      const m = take("draw");
      blanks.push({ ...b, label: "", slot: m.key });
      answers.push(answer);
      lines.push(`${label ? `○ ${label} ` : ""}${slotToken("draw", m.no)}`);
      return;
    }
    if (b.short || b.accept?.length) {
      const m = take("short");
      blanks.push({ ...b, label: "", slot: m.key, short: true });
      /* 짧은 칸의 예시 답은 첫 정답이다(출제 화면의 정답 줄과 같은 약속). 옛 단답형은 이 자리에
         모범답안 글이 들어 있다 — 그대로 옮기면 정답 칸 옆에 해설 한 문단이 선다 */
      answers.push(b.accept?.[0] ?? answer);
      lines.push(`${named}( ${slotToken("short", m.no)} )`);
      return;
    }
    const m = take("write");
    blanks.push({ ...b, label: "", slot: m.key });
    answers.push(answer);
    lines.push(`${named}${slotToken("write", m.no)}`);
  });

  /* 옛 단답형 — 이름 없는 짧은 칸 하나. 발문 끝 줄에 괄호째 붙인다 */
  const lone = r.blanks.length === 1 && !r.blanks[0].label.trim() && lines[0]?.startsWith("( [");
  const next = lone ? `${head} ${lines[0]}`.trim() : lines.length > 0 ? below(lines.join("\n")) : stem;
  return { stem: next, response: { kind: "blanks", blanks }, answers };
}

/** 채워 둔 예시 답(「강물은 ( A )보다 ( B )에서 …」)에서 괄호마다의 답을 읽는다 */
function slotsInSample(template: string, sample: string): string[] {
  if (!template.includes("{}") || !sample) return [];
  const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
  const pattern = template.split("{}").map(esc).join("\\(\\s*(.*?)\\s*\\)");
  const m = sample.match(new RegExp(`^${pattern}$`));
  return m ? m.slice(1) : [];
}

/** 학생이 답할 칸이 있는가 — 긴 글 · 사진 · 선 잇기, 또는 괄호 칸이 하나라도 */
export const hasAnswerArea = (r: Response) =>
  r.kind === "essay" || r.kind === "upload" || r.kind === "match" || (r.kind === "blanks" && r.blanks.length > 0);

/**
 * 예전 방식으로 **만든** 답 칸인가 — 형식에 따라 저절로 선 빈 칸과 가른다.
 *
 * 표시가 없는 문항은 형식에 따라 빈 칸 하나(이름 없는 괄호 칸 · 긴 글 칸)를 저절로 받는다. 그것은
 * 출제자가 만든 칸이 아니라서 옮길 것이 없다 — 새 문항을 저장했더니 「( [정답1] )」이 저절로 붙으면
 * 고르지도 않은 칸이 선다. 이름 · 모양(고르기 · 문장 속 괄호 · 그림 · 짧은 칸) · 적어 둔 정답이 있거나,
 * 긴 글 칸에 안내를 달았거나, 사진 · 선 잇기를 고른 칸만 예전 답 칸 편집기로 만든 것으로 본다.
 */
export function oldAnswerArea(r: Response): boolean {
  switch (r.kind) {
    case "blanks":
      return r.blanks.some(
        (b) =>
          !!b.label.trim() ||
          !!b.options ||
          b.template !== undefined ||
          b.draw !== undefined ||
          !!b.short ||
          !!b.suffix ||
          !!b.placeholder ||
          !!b.accept?.some((a) => a.trim()),
      );
    case "essay":
      return !!(r.guide?.length || r.placeholder || r.minLength);
    case "upload":
    case "match":
      return true;
    default:
      return false;
  }
}

/** 칸 이름 — 이름 붙은 칸은 그 이름, 표지로 세운 칸은 「정답 1」. 둘 다 없으면 빈 글 */
export const blankTitle = (b: Blank) => b.label || (b.slot ? slotName(b.slot) : "");
