// 문항 본문은 분량이 커서 따로 뒀다. 여기는 얼개와 셈만 둔다.
import {
  isGroup,
  materialIsEmpty,
  type Blank,
  type Block,
  type ContentQuestion,
  type ContentSet,
  type Level,
  type MatchItem,
  type Material,
  type Response,
} from "./content";
import { examSets } from "./examQuestions";

export type { Blank, Block, Figure, Level, MatchItem, Material, Table } from "./content";

/** 평가에 싣는 세트 — 공통 얼개(lib/content.ts)에 과목을 붙인 것 */
export type ExamSet = ContentSet & { subject: SubjectId };

/**
 * 세트 얼개를 응시 화면이 읽는 문항 줄로 편다.
 *
 * 화면은 여전히 문항 하나씩을 넘기고 답과 채점도 문항 단위다. 얼개에서 오는 것은 셋이다 —
 *   setId       어느 세트의 자료를 왼쪽에 둘까
 *   group       오른쪽에 함께 세울 문항인가
 *   groupBrief  묶음의 머리 자료 — 묶음의 첫 문항에만 싣는다
 */
export function flattenSets(sets: ExamSet[]): Question[] {
  const counter = new Map<SubjectId, number>();
  const toQuestion = (
    set: ExamSet,
    cq: ContentQuestion,
    group?: { id: string; brief?: Material },
  ): Question => {
    const no = (counter.get(set.subject) ?? 0) + 1;
    counter.set(set.subject, no);
    return {
      id: cq.id,
      subject: set.subject,
      no,
      setId: set.id,
      level: cq.level,
      brief: set.material,
      stem: cq.stem,
      blocks: cq.blocks,
      response: cq.response,
      ...answerFields(cq.response),
      group: group?.id,
      groupBrief: group?.brief,
      scoring: cq.scoring,
      points: cq.points,
      sampleAnswer: cq.sampleAnswer,
    };
  };
  return sets.flatMap((set) =>
    set.nodes.flatMap((n) =>
      isGroup(n)
        ? n.questions.map((cq, i) =>
            toQuestion(set, cq, { id: n.id, brief: i === 0 ? n.material : undefined }),
          )
        : [toQuestion(set, n)],
    ),
  );
}

/** 답하는 방식을 화면이 읽는 납작한 칸으로 */
function answerFields(
  r: Response,
): Pick<
  Question,
  | "type"
  | "choices"
  | "answer"
  | "blanks"
  | "guide"
  | "placeholder"
  | "minLength"
  | "upload"
  | "match"
> {
  switch (r.kind) {
    case "choice":
      return { type: "choice", choices: r.choices, answer: r.answer };
    case "blanks":
      return { type: "essay", blanks: r.blanks };
    case "essay":
      return { type: "essay", guide: r.guide, placeholder: r.placeholder, minLength: r.minLength };
    case "upload":
      /* 사진은 글 대신 파일로 낸다 — 채점은 서술형과 같이 전문가가 한다.
         녹음 제출 화면은 두지 않는다. 말로 답하는 것은 긴 글 칸의 음성 입력이 받아 적는다 */
      return r.media === "image" ? { type: "essay", upload: "image" } : { type: "essay" };
    case "match":
      /* 선 잇기 — 이은 선들을 문자열로 굳혀 긴 글과 같은 자리에 담는다(joinPairs) */
      return { type: "essay", match: matchOf(r) };
  }
}

/** 출제한 선 잇기를 응시 화면이 읽는 꼴로 — 정답에서 「한 항목에 선 여럿」을 읽어 둔다 */
function matchOf(r: Extract<Response, { kind: "match" }>): Match {
  const pairs = tidyPairs(
    r.pairs.filter(([l, k]) => l >= 0 && l < r.left.length && k >= 0 && k < r.right.length),
  );
  const twice = (side: 0 | 1) =>
    pairs.some((p, i) => pairs.some((o, k) => k !== i && o[side] === p[side]));
  return { left: r.left, right: r.right, pairs, many: { left: twice(0), right: twice(1) } };
}

/**
 * 기본 문항 — 코드에 적어 둔 세트(examQuestions.ts)를 편 것.
 *
 * 응시 화면은 회차 편성에서 확정된 검사지를 먼저 읽고(lib/examBank.ts), 그 과목의 검사지가
 * 없을 때만 이것으로 채운다. 홍보 화면의 문항 수 · 공개 예시도 이것을 센다.
 *
 * 아래 셈 함수들은 마지막 인자로 **문항 목록(bank)** 을 받는다. 넘기지 않으면 이 기본 문항을 쓴다.
 */
export const questions: Question[] = flattenSets(examSets);

/** 한 평가가 쓰는 문항 목록 — 과목이 섞여 있고, 과목 안에서는 푸는 차례대로다 */
export type Bank = Question[];

/**
 * 응시 존(ASM) 문항 정의.
 * 사이트맵 ASM-03 세션 1 — 실제 검사는 외부 CBT 임베드 경계이므로,
 * 여기 문항은 화면 설계 확인용 더미 세트다.
 *
 * 과목은 한 번에 몰아 보지 않고 **과목별로 따로** 응시하며, 과목당 제한 시간은 40분이다.
 * 각 문항은 좌측(기본 설명·자료)과 우측(발문·보기)으로 나뉜다.
 */

/**
 * 이 검사의 이름.
 *
 * 평가(검사) 이름은 **TalentMe(텔렌트미)** 다 — Talent(재능) + Me(나)를 붙인 합성어이고,
 * "재능은 남이 찾아주는 것이 아니라 아이 자신이 발견하는 것"이라는 관점을 담았다.
 * **GENIXX는 회사·플랫폼 이름**이므로 둘을 바꿔 쓰지 않는다.
 * 홍보 존(PUB)의 브랜드 표기는 GENIXX 그대로 두고, 검사를 가리키는 자리에서만 이 이름을 쓴다.
 */
export const assessment = {
  name: "TalentMe",
  ko: "텔렌트미",
  /** 현재 회차 — 응시 현황과 결과 리포트가 같은 값을 쓴다 */
  round: "2026학년도 1회차(26A)",
  /** 이번 회차 응시 마감일 (YYYY-MM-DD) */
  deadline: "2026-09-30",
};

/**
 * 마감까지 남은 날.
 *
 * 서버와 브라우저의 날짜가 갈리면 하이드레이션이 어긋나므로, 부르는 쪽에서
 * 하이드레이션이 끝난 뒤에만 쓴다.
 */
export function deadlineDays(at: Date = new Date(), deadline = assessment.deadline): number {
  const [y, m, d] = deadline.split("-").map(Number);
  const end = Date.UTC(y, m - 1, d);
  const now = Date.UTC(at.getFullYear(), at.getMonth(), at.getDate());
  return Math.round((end - now) / 86_400_000);
}

export type SubjectId = "korean" | "math" | "science";

export type Subject = {
  id: SubjectId;
  name: string;
  short: string;
  hint: string;
  dot: string;
  /** 과목별 제한 시간(분) */
  limitMin: number;
};

export const subjects: Subject[] = [
  {
    id: "korean",
    name: "국어 (언어)",
    short: "국어",
    hint: "글을 읽고 뜻을 이해하며 자기 생각을 표현하는 힘을 봅니다",
    dot: "bg-brand-500",
    limitMin: 40,
  },
  {
    id: "math",
    name: "수학",
    short: "수학",
    hint: "수와 규칙을 다루고 풀이 과정을 설명하는 힘을 봅니다",
    dot: "bg-accent-500",
    limitMin: 40,
  },
  {
    id: "science",
    name: "과학",
    short: "과학",
    hint: "관찰한 것에서 원인을 찾아내는 힘을 봅니다",
    dot: "bg-emerald-500",
    limitMin: 40,
  },
];

export const SUBJECT_IDS = subjects.map((s) => s.id);

/**
 * 왼쪽 칸에 서는 자료 — 공통 형태의 Material 그대로다.
 * 응시 화면 코드가 오래 「brief」라고 불러 와서 이름을 남겨 둔다.
 */
export type Brief = Material;

/**
 * 독립 문항인가 — 함께 읽는 자료 없이 문항만 있는 것.
 *
 * 세트 문항은 왼쪽에 자료를 두고 오른쪽에서 문제를 넘긴다. 자료가 없는 문항을 그 틀에 그대로
 * 두면 왼쪽에 빈 상자만 남는다. 그래서 자료가 없으면 왼쪽 칸을 걷고 문항을 가운데 한 칸에
 * 둔다(components/exam/ExamSession.tsx의 BriefPanel · ScreenColumn). 자료가 딸린 독립 문항은
 * 세트와 같은 두 칸이고, 머리에 번호 범위([1~4])만 붙지 않는다(setRange).
 */
export const standsAlone = (brief: Brief) => materialIsEmpty(brief);

/**
 * S위계 — 무엇이 적혀 있는가(S1)에서 왜 그런가(S2), 어떻게 할 것인가(S3),
 * 다르게 하면 어떤가(S4)로 묻는 층위를 올린다. 응시 화면의 문항 이동판이 이 단위로
 * 묶이고, 리포트도 같은 축으로 읽는다.
 */
export const levels: { id: Level; name: string; desc: string }[] = [
  { id: "S1", name: "지각", desc: "자료에 적힌 것을 그대로 찾아낸다" },
  { id: "S2", name: "이해", desc: "왜 그런지 이유와 관계를 파악한다" },
  { id: "S3", name: "생성", desc: "자기 말과 자기 순서로 다시 만든다" },
  { id: "S4", name: "창의", desc: "조건을 바꾸거나 새로 지어 낸다" },
];

export const levelOf = (id: Level) => levels.find((l) => l.id === id)!;

export type Question = {
  id: string;
  subject: SubjectId;
  /** 과목 안에서 푸는 차례 (1부터) */
  no: number;
  /**
   * 함께 읽는 자료를 나눠 쓰는 묶음의 열쇠 — **세트 문항**.
   *
   * 세트를 두는 까닭은 하나다. 자료를 두 번 읽히지 않고 묻는 층을 올린다 — 같은 글을
   * 놓고 「무엇이라고 했나」(S1)를 묻고 이어서 「왜 그런가」(S3)를 묻는다. 응시 화면은
   * 왼쪽에 그 자료를 붙들어 둔 채 오른쪽 문제만 문제 1 → 문제 2로 넘긴다.
   *
   * 값은 세트 얼개(ExamSet.id)에서 온다. 문항 하나뿐인 세트는 그냥 낱개로 선다.
   */
  setId: string;
  /** S위계 — 목록 순서도 이 순서를 따른다 */
  level: Level;
  type: "choice" | "essay";
  brief: Brief;
  stem: string;
  /** 객관식 보기 */
  choices?: string[];
  /** 정답 보기 index (객관식만) */
  answer?: number;
  /** 서술형 안내 */
  guide?: string[];
  placeholder?: string;
  minLength?: number;
  /**
   * 세트 안의 작은 묶음 — 같은 값이 붙은 문제는 **오른쪽에 함께** 선다.
   *
   * 세트(setId)는 왼쪽 자료를 나눠 읽는 단위이고, 오른쪽은 기본으로 한 번에 문제 하나다.
   * 세트 안에서도 두 문제가 한 물음처럼 이어질 때(예: 문제 2 · 3) 같은 group을 붙이면
   * 그 둘이 한 화면에 선다. 이어 붙은 문제끼리만 묶는다.
   */
  group?: string;
  /**
   * 작은 묶음의 머리 자료 — 시험지의 「[2 ~ 3] 다음은 …」.
   *
   * 묶음의 **첫 문제에만** 적는다. 오른쪽 칸 맨 위, 묶인 문제들 위에 선다. 왼쪽 세트 자료는
   * 그대로 두고 이 묶음만 따로 읽는 자료다.
   */
  groupBrief?: Brief;
  /** 발문 아래 자료 — 이 문항에만 딸린 사진 · 표 · 움직이는 그림 */
  blocks?: Block[];
  /** 답하는 방식 원본 — 아래 type · choices · blanks 는 이것을 편 것이다 */
  response: Response;
  /**
   * 괄호 칸 — 시험지의 「○ 차이점 : (        )」처럼 칸마다 따로 답하는 문제.
   *
   * 있으면 긴 글 칸 하나 대신 이름 붙은 칸을 여럿 연다. 답은 칸 순서대로 담은 배열을
   * 문자열로 굳혀 저장한다(joinBlanks) — 응시 기록의 답 자리가 `number | string`이라서다.
   *
   * 칸마다 모양을 고른다 —
   *   options  있으면 글을 쓰지 않고 그중 하나를 고른다(「○ ⓐ - ( ㄱ~ㄹ )」, 「동의 여부」)
   *   short    짧은 값 하나(「방위각 : (   ° )」) — suffix로 단위를 붙인다
   *   없으면   한 문장 이상 쓰는 칸
   */
  blanks?: Blank[];
  /**
   * 파일로 내는 문제 — 종이에 쓰거나 그린 것을 찍어 사진으로 올린다.
   *
   * 있으면 긴 글 칸 대신 올리는 칸을 연다. 파일은 브라우저의 파일 저장소에 두고
   * (lib/answerMedia.ts), 답 자리에는 그 열쇠만 적는다(joinUpload).
   */
  upload?: "image";
  /**
   * 선 잇기 — 왼쪽 항목과 오른쪽 항목을 선으로 잇는다.
   *
   * 있으면 긴 글 칸 대신 두 줄의 항목과 그 사이에 선을 긋는 칸을 연다
   * (components/exam/MatchAnswer.tsx). 답 자리에는 이은 선들을 적는다(joinPairs).
   */
  match?: Match;
  /** 채점 기준 — 학생 화면에는 내보이지 않는다 */
  scoring?: string[];
  /** 만점 — 채점 기준이 정한 값. 없으면 pointsOf가 유형을 보고 정한다 */
  points?: number;
  /** 예시 답 — 칸이 있으면 칸 순서대로 */
  sampleAnswer?: string[];
};

/** 문장 속 칸들의 값을 잇는 구분자 */
export const SLOT = String.fromCharCode(31);

/** 문장 속 칸의 수 */
export const slotCount = (template: string) => template.split("{}").length - 1;

/** 문장 속 칸들의 값 — 칸 수만큼 */
export function slotValues(template: string, v: string) {
  const parts = v.split(SLOT);
  return Array.from({ length: slotCount(template) }, (_, i) => parts[i] ?? "");
}

/** 이 칸을 다 채웠는가 */
export function blankFilled(b: Blank, v: string) {
  if (b.optional) return true;
  if (b.template) return slotValues(b.template, v).every((x) => x.trim().length > 0);
  return v.trim().length > 0;
}

/** 칸 하나의 답을 읽는 글로 */
function blankText(b: Blank, v: string) {
  if (b.draw !== undefined) return v ? "(그림 답안)" : "";
  if (b.template) {
    const parts = slotValues(b.template, v);
    if (parts.every((x) => !x.trim())) return "";
    let k = 0;
    return b.template.replaceAll("{}", () => `( ${parts[k++].trim() || " "} )`);
  }
  return v.trim();
}

/** 괄호 칸 답을 저장용 문자열로 */
export function joinBlanks(values: string[]) {
  return JSON.stringify(values);
}

/** 저장된 답을 칸 수만큼의 배열로 — 칸 없는 글로 적혀 있으면 첫 칸에 둔다 */
export function splitBlanks(value: number | string | undefined, count: number): string[] {
  let list: string[] = [];
  if (typeof value === "string" && value) {
    try {
      const parsed: unknown = JSON.parse(value);
      list = Array.isArray(parsed) ? parsed.map((v) => String(v ?? "")) : [value];
    } catch {
      list = [value];
    }
  }
  return Array.from({ length: count }, (_, i) => list[i] ?? "");
}

/** 파일로 낸 답 — 파일은 파일 저장소에 있고 답 자리에는 이것만 적는다 */
export type UploadAnswer = {
  media: "image";
  /** 파일 저장소의 열쇠 */
  key: string;
};

/** 파일로 낸 답을 저장용 문자열로 */
export function joinUpload(a: UploadAnswer) {
  return JSON.stringify({ upload: a.media, key: a.key });
}

/** 저장된 답에서 낸 파일을 읽는다 — 내지 않았으면 null */
export function splitUpload(value: number | string | undefined): UploadAnswer | null {
  if (typeof value !== "string" || !value) return null;
  try {
    const v = JSON.parse(value) as { upload?: unknown; key?: unknown };
    if (v.upload !== "image" || typeof v.key !== "string") return null;
    return { media: v.upload, key: v.key };
  } catch {
    return null;
  }
}

/* ───────────────────────── 선 잇기 ───────────────────────── */

/** 선 하나 — [왼쪽 항목의 차례, 오른쪽 항목의 차례], 둘 다 0부터 */
export type Pair = [number, number];

/**
 * 선 잇기 문항의 항목과 정답.
 *
 * 선은 왼쪽 항목 하나와 오른쪽 항목 하나를 잇는다. 한 항목에 선을 몇 개까지 받는지는 문항마다
 * 다르고, **정답에서 읽는다**(many) —
 *
 *   3개와 3개를 하나씩 맞추는 문항     양쪽 모두 선 하나. 이미 이은 항목을 다른 항목에 이으면
 *                                      선이 옮겨 간다
 *   2개에 5개를 나누어 잇는 문항       왼쪽 항목은 선 여럿, 오른쪽 항목은 선 하나
 *
 * 정답에 선이 둘 이상 닿는 항목이 있는 쪽만 여럿을 받는다. 학생에게 알려지는 것은 「이 문항은
 * 한 항목에 여러 개를 이을 수 있다」까지다 — 어느 항목이 몇 개인지는 화면에 나오지 않는다.
 */
export type Match = {
  left: MatchItem[];
  right: MatchItem[];
  /** 정답인 선 — 학생 화면에는 내보이지 않는다 */
  pairs: Pair[];
  /** 그쪽 항목 하나에 선을 여럿 이을 수 있는가 */
  many: { left: boolean; right: boolean };
};

/** 선들을 왼쪽 · 오른쪽 차례로 늘어놓고 겹친 것을 걷는다 */
function tidyPairs(pairs: Pair[]): Pair[] {
  const seen = new Set<string>();
  return pairs
    .filter(([l, r]) => {
      const key = `${l}-${r}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

/** 이은 선을 저장용 문자열로 */
export function joinPairs(pairs: Pair[]) {
  return JSON.stringify({ match: tidyPairs(pairs) });
}

/** 저장된 답에서 이은 선을 읽는다 — 항목 수를 벗어난 선은 버린다 */
export function splitPairs(value: number | string | undefined, m: Match): Pair[] {
  if (typeof value !== "string" || !value) return [];
  try {
    const v = JSON.parse(value) as { match?: unknown };
    if (!Array.isArray(v.match)) return [];
    return tidyPairs(
      v.match.filter(
        (p): p is Pair =>
          Array.isArray(p) &&
          p.length === 2 &&
          Number.isInteger(p[0]) &&
          Number.isInteger(p[1]) &&
          p[0] >= 0 &&
          p[0] < m.left.length &&
          p[1] >= 0 &&
          p[1] < m.right.length,
      ),
    );
  } catch {
    return [];
  }
}

/**
 * 선을 하나 잇는다.
 *
 * 선을 하나만 받는 쪽의 항목에 이미 선이 있으면 그 선을 걷고 새 선을 둔다 — 잘못 이은 것을
 * 지우지 않고 다시 이어서 고칠 수 있다.
 */
export function connectPair(m: Match, pairs: Pair[], [l, r]: Pair): Pair[] {
  return tidyPairs([
    ...pairs.filter((p) => (m.many.left || p[0] !== l) && (m.many.right || p[1] !== r)),
    [l, r],
  ]);
}

/** 두 묶음의 선이 같은가 — 차례는 보지 않는다 */
export function samePairs(a: Pair[], b: Pair[]) {
  const x = tidyPairs(a);
  const y = tidyPairs(b);
  return x.length === y.length && x.every((p, i) => p[0] === y[i][0] && p[1] === y[i][1]);
}

const MATCH_RIGHT = "ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ";

/** 항목의 이름 — 왼쪽은 (1) · (2), 오른쪽은 ㄱ · ㄴ. 출제 화면의 선 잇기 칸과 같은 이름이다 */
export const matchLeftName = (i: number) => `(${i + 1})`;
export const matchRightName = (i: number) => MATCH_RIGHT[i % MATCH_RIGHT.length];

/** 이은 선을 글로 — 「(1) - ㄱ · ㄷ / (2) - ㄴ」. 정오표와 채점 자료가 쓴다 */
export function pairsText(m: Match, pairs: Pair[]): string {
  return m.left
    .map((_, l) => {
      const to = pairs.filter((p) => p[0] === l).map((p) => matchRightName(p[1]));
      return `${matchLeftName(l)} - ${to.length > 0 ? to.join(" · ") : "없음"}`;
    })
    .join(" / ");
}

/**
 * 서술형 답을 사람이 읽는 글로 — 칸이 있으면 「차이점: … / 공통점: …」처럼 줄마다 편다.
 * 해설 · 해석 화면처럼 쓴 답을 그대로 보여 주는 자리에서 쓴다.
 */
export function answerText(q: Question, value: number | string | undefined): string {
  if (typeof value !== "string") return "";
  if (q.upload) {
    return splitUpload(value) ? "사진을 제출했습니다." : "";
  }
  if (q.match) {
    const mine = splitPairs(value, q.match);
    return mine.length > 0 ? pairsText(q.match, mine) : "";
  }
  if (!q.blanks) return value.trim();
  const parts = splitBlanks(value, q.blanks.length);
  if (parts.every((p) => !p.trim())) return "";
  /* 이름 없는 칸이 여럿이면(답 칸 표지로 쓴 문항) 차례를 붙인다 — 「답 : … / 답 : …」은 어느 칸인지 모른다 */
  const many = q.blanks.filter((b) => !b.label).length > 1;
  return q.blanks
    .map((b, i) => `${b.label || (many ? `답 ${i + 1}` : "답")} : ${blankText(b, parts[i]) || "(빈칸)"}`)
    .join("\n");
}

/* ───────────────────────── 정오 ───────────────────────── */

/**
 * 문항 하나의 정오.
 *
 *   right    정답
 *   partial  부분 정답 — 만점보다 적게 받았다. 전문가가 점수를 매긴 문항에서만 나온다
 *   wrong    오답
 *   empty    미응답 — 답하지 않았다. 정오표에서는 오답과 같이 ✕로 적는다
 *   pending  채점 중 — 기계로 맞춰 볼 수 없어 전문가가 채점한다
 *
 * 기계로 맞춰 보는 것은 객관식과 선 잇기, 칸마다 허용 답(accept)이 적힌 괄호 칸 문항이다.
 * 한 칸이라도 허용 답이 없으면 그 문항은 통째로 전문가에게 넘긴다 — 반만 맞춰 보고
 * ○ · ✕를 붙이면 부분점수 문항의 정오가 틀어진다. 선 잇기는 정답인 선을 빠짐없이, 다른 선
 * 없이 이었을 때만 정답이다.
 */
export type Mark = "right" | "partial" | "wrong" | "empty" | "pending";

/**
 * 정오를 화면에 적는 말 — 정오표 · 답안 풀이 · 내려받는 파일이 같은 말을 쓴다.
 *
 * 「맞음 · 틀림」이라 적던 것을 「정답 · 오답」으로 바꿨다(2026-10-12). 표 이름이 정오표이고
 * 옆 칸이 「정답」이라 짝이 맞고, 운영 콘솔의 채점 화면도 오답 · 미응답이라 적는다.
 */
export const markLabel: Record<Mark, string> = {
  right: "정답",
  partial: "부분 정답",
  wrong: "오답",
  empty: "미응답",
  pending: "채점 중",
};

/** 허용 답과 견줄 때 — 띄어쓰기 · 대소문자는 보지 않는다 */
const plain = (s: string) => s.replace(/\s+/g, "").toLowerCase();

/** 기계로 맞춰 볼 수 있는 문항인가 */
export function autoGraded(q: Question) {
  if (q.type === "choice" || q.match) return true;
  return !!q.blanks?.length && q.blanks.every((b) => b.optional || b.accept?.length);
}

export function markOf(q: Question, value: number | string | undefined): Mark {
  if (q.type === "choice") {
    if (typeof value !== "number") return "empty";
    return value === q.answer ? "right" : "wrong";
  }
  if (q.match) {
    const mine = splitPairs(value, q.match);
    if (mine.length === 0) return "empty";
    return samePairs(mine, q.match.pairs) ? "right" : "wrong";
  }
  if (!autoGraded(q)) return "pending";
  const parts = splitBlanks(value, q.blanks!.length);
  if (parts.every((p) => !p.trim())) return "empty";
  const ok = q.blanks!.every(
    (b, i) => b.optional || b.accept!.some((a) => plain(a) === plain(parts[i])),
  );
  return ok ? "right" : "wrong";
}

/* ───────────────────────── 점수 ───────────────────────── */

/**
 * 문항의 만점.
 *
 * 채점 기준이 값을 정해 둔 문항(「총 3점」)은 그 값을 쓴다. 적혀 있지 않으면 기계로 채점하는
 * 문항(객관식 · 단답형 · 선 잇기)은 1점, 전문가가 채점하는 문항(서술형 · 논술형 · 사진)은 2점이다 —
 * 채점 루브릭의 세 칸(완전 2 · 부분 1 · 오답 0)과 같은 만점이다.
 */
export function pointsOf(q: Question): number {
  return q.points ?? (autoGraded(q) ? 1 : 2);
}

/** 답을 내지 않았는가 — 고르지도 쓰지도 올리지도 않았다 */
export function unanswered(q: Question, value: number | string | undefined): boolean {
  if (q.type === "choice") return typeof value !== "number";
  if (q.upload) return splitUpload(value) === null;
  if (q.match) return splitPairs(value, q.match).length === 0;
  if (q.blanks) return splitBlanks(value, q.blanks.length).every((p) => !p.trim());
  return typeof value !== "string" || !value.trim();
}

/**
 * 매긴 점수에서 정오를 읽는다 — 만점이면 정답, 0점이면 오답(답을 내지 않았으면 미응답),
 * 그 사이는 부분 정답이다.
 *
 * 기계가 정답으로 본 문항도 채점자가 점수를 낮출 수 있다(찍어서 맞힌 것이 분명한 답). 그래서
 * 정오는 기계의 판정이 아니라 **마지막에 매겨진 점수**를 따른다.
 */
export function markOfPoints(
  q: Question,
  value: number | string | undefined,
  points: number,
): Mark {
  if (points >= pointsOf(q)) return "right";
  if (points > 0) return "partial";
  return unanswered(q, value) ? "empty" : "wrong";
}

/** 채점자가 문항 하나에 매긴 것 — 점수와, 아이와 보호자가 읽는 해설 */
export type Grade = { points: number; comment?: string };

/** 채점이 끝난 문항들 — 문항 ID → 매긴 것. 여기 없는 문항은 아직 채점자가 보지 않았다 */
export type Grades = Record<string, Grade>;

/** 점수를 적는 꼴 — 1.5는 1.5로, 2는 2로 */
export const pointText = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

/** 동그라미 번호 — 정오표의 객관식 답 */
export const circled = (i: number) => String.fromCharCode(0x2460 + i);

/** 정오표의 「정답」 칸 — 기계 채점 문항만 값이 있다 */
export function keyText(q: Question): string {
  if (q.type === "choice") return circled(q.answer!);
  if (q.match) return pairsText(q.match, q.match.pairs);
  if (!autoGraded(q)) return "";
  return q
    .blanks!.map((b) => (b.optional ? "" : (b.accept![0] ?? "") + (b.suffix ?? "")))
    .join(", ");
}

/**
 * 정오표의 「내 답」 칸 — 기계로 채점하는 문항의 짧은 답.
 * 전문가가 채점하는 문항(서술형 · 논술형 · 사진)은 쓴 글과 올린 사진을 그대로 편다(answerParts).
 */
export function shortAnswer(q: Question, value: number | string | undefined): string {
  if (q.type === "choice") return typeof value === "number" ? circled(value) : "";
  if (q.match) return answerText(q, value);
  if (!autoGraded(q)) return "";
  const parts = splitBlanks(value, q.blanks!.length);
  if (parts.every((p) => !p.trim())) return "";
  return q
    .blanks!.map((b, i) => (parts[i].trim() ? parts[i].trim() + (b.suffix ?? "") : "-"))
    .join(", ");
}

/**
 * 문항 유형 — 정오표와 내려받는 파일이 적는 이름.
 *
 *   객관식  보기에서 고른다
 *   선 잇기  왼쪽 항목과 오른쪽 항목을 선으로 잇는다 — 기계로 채점한다
 *   단답형  칸마다 정해진 답이 있어 기계로 채점한다
 *   서술형  칸마다 한두 문장을 쓴다 — 전문가가 채점한다
 *   논술형  긴 글 칸 하나에 쓴다 — 전문가가 채점한다
 *   사진    종이에 쓰거나 그린 것을 찍어 올린다 — 전문가가 채점한다
 */
export type AnswerKind = "객관식" | "선 잇기" | "단답형" | "서술형" | "논술형" | "사진";

export function answerKind(q: Question): AnswerKind {
  if (q.type === "choice") return "객관식";
  if (q.upload) return "사진";
  if (q.match) return "선 잇기";
  if (!q.blanks) return "논술형";
  /* 답 칸 표지로 쓴 문항은 긴 글 칸도 괄호 칸 하나다(「{논술형1}」, lib/answerSlots.ts) */
  if (q.blanks.some((b) => b.slot?.startsWith("논술형"))) return "논술형";
  return autoGraded(q) ? "단답형" : "서술형";
}

/** 쓴 답의 한 칸 — 글이거나, 그림 칸에 그린 그림이다 */
export type AnswerPart = {
  /** 칸 이름 — 긴 글 칸 하나뿐인 문항은 빈 글이다 */
  label: string;
  /** 쓴 글. 쓰지 않았으면 빈 글 */
  text: string;
  /** 그림 칸에 그린 것 — 밑그림(없으면 빈 글)과 그 위에 그은 선 */
  drawing?: { background: string; strokes: string };
  /** 비워 두어도 되는 칸 — 비었으면 정오표에 적지 않는다 */
  optional: boolean;
};

/**
 * 글로 쓴 답을 칸마다 갈라 읽는다 — 쓴 것이 하나도 없으면 빈 배열.
 *
 * 정오표와 답안 풀이는 쓴 글을 줄이지 않고 모두 보여 주고, 그림 칸에 그린 것은 그림으로
 * 보여 준다. 글 한 줄로 이어 붙인 answerText로는 그림을 놓을 자리가 없어 따로 둔다.
 */
export function answerParts(q: Question, value: number | string | undefined): AnswerPart[] {
  if (typeof value !== "string" || q.type === "choice" || q.upload || q.match) return [];
  if (!q.blanks) {
    return value.trim() ? [{ label: "", text: value.trim(), optional: false }] : [];
  }
  const parts = splitBlanks(value, q.blanks.length);
  if (parts.every((p) => !p.trim())) return [];
  return q.blanks.map((b, i) =>
    b.draw !== undefined
      ? {
          label: b.label,
          text: "",
          drawing: parts[i] ? { background: b.draw, strokes: parts[i] } : undefined,
          optional: !!b.optional,
        }
      : {
          label: b.label,
          /* 짧은 칸의 단위(°)는 쓴 값 뒤에 붙인다 — 칸에 적혀 있던 모양 그대로 */
          text: blankText(b, parts[i]) + (b.short && parts[i].trim() ? (b.suffix ?? "") : ""),
          optional: !!b.optional,
        },
  );
}

/* ───────────────────────── 시험 세 갈래 ───────────────────────── */

/**
 * 시험은 세 갈래로 이어진다 — **셋트 → 무료 진단 → 유료 진단**.
 *
 *   set    가입 전에 한 교과만 골라 푸는 1셋트(4문항). 다 풀면 회원가입으로 넘어간다.
 *   free   가입한 학생이 결제 없이 푸는 무료 진단. 셋트 4문항을 물려받아 모두 20문항이다.
 *   paid   접수·결제를 거치는 유료 진단. 수 20 · 과 20 · 국 10, 과목당 40분.
 *
 * 갈래를 셋으로 두는 까닭은 **가입과 결제라는 두 문턱을 따로 넘게** 하는 것이다. 한 문턱에
 * 몰아 두면 문항이 어떤 모양인지 보지 못한 채 결제를 결정해야 한다. 셋트는 가입을 권하는
 * 자리이고, 무료 진단은 결제를 권하는 자리다.
 *
 * 셋트 답은 버리지 않고 무료 진단의 앞 문항으로 물려받는다 — 절차가 「1셋트 문항을 풀고
 * 회원 가입하면 나머지 문항으로 넘어간다」이므로, 같은 문항을 두 번 풀리면 20문항이라고
 * 적어 놓은 셈이 어긋난다(lib/setStore.ts가 그 답을 들고 있다).
 */
export type ExamTier = "set" | "free" | "paid";

export const tiers: { id: ExamTier; label: string; short: string; desc: string }[] = [
  {
    id: "set",
    label: "셋트 문항",
    short: "셋트",
    desc: "가입 없이 한 교과를 골라 풀어 봅니다",
  },
  {
    id: "free",
    label: "무료 진단",
    short: "무료",
    desc: "가입하면 세 과목 20문항을 결제 없이 한 번에 풉니다",
  },
  {
    id: "paid",
    label: "유료 진단",
    short: "유료",
    desc: "접수한 학생이 과목마다 따로 응시합니다",
  },
];

export const tierOf = (id: ExamTier) => tiers.find((t) => t.id === id)!;

export const isExamTier = (v: string): v is ExamTier => tiers.some((t) => t.id === v);

/**
 * 셋트 하나의 문항 수 — 가입 전에 풀어 보는 만큼.
 *
 * 세트 문항(Question.setId)의 「세트」와 이름이 닿아 있지만 같은 것이 아니다. 저쪽은 자료
 * 하나를 나눠 읽는 묶음이라 셋일 수도 다섯일 수도 있고, 이쪽은 절차가 정한 **수**다. 앞에서
 * 부터 이만큼을 열고 묶음이 한도에 걸치면 열린 문항만 세운다.
 */
export const SET_QUESTIONS = 4;

/**
 * 무료 진단이 과목마다 여는 문항 수 — 합이 20이다.
 *
 * 절차의 예시를 그대로 옮긴 것이다. 「과(1셋트 4문항) + 16문항(국4, 과4, 수8)」이라 적혀
 * 있으므로, 셋트로 푼 과학 4문항을 포함하면 국 4 · 수 8 · 과 8이 된다.
 *
 * ── 셋트 문항은 이 안에 든다 ──
 * 셋트를 「더하는 것」으로 셈하지 않는다. 더하는 것으로 두면 셋트를 풀지 않고 바로 가입한
 * 학생은 16문항만 받게 되고, 어느 교과를 골랐는지에 따라 총 문항 수가 갈린다. 셋트는 고른
 * 과목의 **앞 4문항**이므로 이미 이 배분 안에 있다 — 그래서 어느 교과를 골라도, 아무것도
 * 고르지 않아도 무료 진단은 늘 20문항이고 새로 풀 것은 16문항이다.
 */
export const FREE_COUNT: Record<SubjectId, number> = { korean: 4, math: 8, science: 8 };

/** 무료 진단 전체 문항 수 — 20 */
export const FREE_TOTAL = SUBJECT_IDS.reduce((sum, id) => sum + FREE_COUNT[id], 0);

/**
 * 유료 진단 편성 문항 수 — 과목마다. 절차가 정한 정원이다.
 *
 * ⚠ 문항 은행이 아직 이만큼을 들고 있지 않은 과목이 있다(수학). 화면은 편성 수를 적되
 *   **실제로 여는 것은 있는 만큼**이다 — 20문항이라 적고 10문항을 주면 아이는 시험이
 *   중간에 끊긴 것으로 안다. 모자란 수는 paidShort가 센다.
 */
export const PAID_COUNT: Record<SubjectId, number> = { korean: 10, math: 20, science: 20 };

/** 유료 진단 편성 문항 수 합 — 50 */
export const PAID_TOTAL = SUBJECT_IDS.reduce((sum, id) => sum + PAID_COUNT[id], 0);

/** 편성 수에서 몇 문항이 모자란가 — 0이면 다 차 있다 */
export const paidShort = (subject: SubjectId, bank: Bank = questions) =>
  Math.max(0, PAID_COUNT[subject] - questionCount(subject, bank));

/**
 * 이 갈래가 이 과목에서 여는 문항 수.
 *
 * 셋트를 고른 교과(setSubject)는 셋트 갈래에서만 쓴다 — 그 갈래는 고른 한 과목만 열고
 * 나머지는 0이다. 무료 진단과 유료 진단은 편성 수를 쓰되, 문항 은행에 있는 것보다 많이
 * 열지 않는다. 적어 놓은 수만큼 열려고 빈 문항을 세우면 시험이 끊긴 것으로 읽힌다.
 */
export function tierCount(
  tier: ExamTier,
  subject: SubjectId,
  setSubject: SubjectId | null = null,
  bank: Bank = questions,
): number {
  const have = questionCount(subject, bank);
  if (tier === "set") return subject === setSubject ? Math.min(SET_QUESTIONS, have) : 0;
  return Math.min(tier === "free" ? FREE_COUNT[subject] : PAID_COUNT[subject], have);
}

/** 이 갈래에서 여는 문항 — 푸는 차례로 앞에서부터 */
export function tierQuestions(
  tier: ExamTier,
  subject: SubjectId,
  setSubject: SubjectId | null = null,
  bank: Bank = questions,
): Question[] {
  return examOrderOf(subject, bank).slice(0, tierCount(tier, subject, setSubject, bank));
}

/**
 * 무료 진단이 한 번에 여는 문항 — **국어 4 → 수학 8 → 과학 8, 모두 20문항**.
 *
 * 무료 진단은 과목을 고르고 들어가지 않는다. 절차가 「1셋트 + 수, 과, 국 = 총 20문항」
 * 한 줄로 적고 있으므로, 과목 셋이 아니라 시험 하나다 — 응시도 한 번에 이어서 한다.
 *
 * 과목 차례는 과목 목록(subjects) 그대로다. 과목이 바뀌는 자리는 문항 이동판이 머리글로
 * 갈라 보여 준다 — 번호는 1부터 20까지 죽 이어지고, 아이는 과목이 바뀌는 것만 안다.
 *
 * 유료 진단은 그대로 과목마다 따로 응시한다. 과목당 40분이라는 제한이 과목을 갈라 놓는
 * 근거이고, 50문항을 한 자리에서 보게 할 수도 없다.
 */
export function freeOrder(bank: Bank = questions): Question[] {
  return SUBJECT_IDS.flatMap((id) => tierQuestions("free", id, null, bank));
}

/**
 * 무료 진단 제한 시간(분) — 20문항을 한 번에 본다.
 *
 * ⚠ 절차 문서는 유료 진단만 「과목당 40분」으로 적고 무료 진단 시간은 적지 않았다. 과목당
 *   40분을 그대로 세 번 주면 두 시간이 되어 20문항에 견주어 지나치게 길다. 문항 수에 맞춰
 *   60분으로 두었으니, 확정되면 이 값 하나만 고친다.
 */
export const FREE_LIMIT_MIN = 60;

/** 이 갈래의 전 과목 문항 수 — 「무료 진단 20문항」 */
export function tierTotal(
  tier: ExamTier,
  setSubject: SubjectId | null = null,
  bank: Bank = questions,
): number {
  return SUBJECT_IDS.reduce((sum, id) => sum + tierCount(tier, id, setSubject, bank), 0);
}

/**
 * 이 과목의 문항 수.
 *
 * 과목마다 문항 수를 고정하지 않는다 — 세트 문항이 붙으면서 과학만 20문항이 되었고,
 * 앞으로 더 늘 수 있다. 화면은 늘 실제 문항 수를 센다.
 */
export const questionCount = (subject: SubjectId, bank: Bank = questions) =>
  questionsOf(subject, bank).length;

/** 전 과목 문항 수 */
export const totalQuestions = () => questions.length;

/** 「국어 10 · 수학 10 · 과학 20문항」 */
export const questionCountText = () =>
  `${subjects.map((s) => `${s.short} ${questionCount(s.id)}`).join(" · ")}문항`;

export function questionsOf(subject: SubjectId, bank: Bank = questions) {
  return bank.filter((q) => q.subject === subject);
}

/**
 * 응시 화면이 한 번에 그리는 단위 — **쪽**.
 *
 * 한 쪽은 세트 하나(자료 + 문항 여럿)이거나 낱개 문항 하나다. 이동·제출은 이 단위로
 * 움직이고, 답과 채점은 여전히 문항 단위다 — 아이가 넘기는 것과 우리가 세는 것이
 * 다른 층이라는 뜻이다.
 *
 * 쪽의 차례는 **그 쪽 첫 문항의 순번**이 정한다. 자료를 나눠 쓰는 문항이 흩어져 있어도
 * 한 쪽으로 모이므로 전체 순번은 촘촘하지 않게 되지만, 아이가 보는 차례(1쪽 → 2쪽)는
 * 그대로 앞에서 뒤로 간다.
 */
export type Page = { id: string; brief: Brief; items: Question[] };

export function pagesOf(subject: SubjectId, bank: Bank = questions): Page[] {
  const list = questionsOf(subject, bank);
  const order: string[] = [];
  const bag = new Map<string, Question[]>();
  for (const q of list) {
    if (!bag.has(q.setId)) {
      bag.set(q.setId, []);
      order.push(q.setId);
    }
    bag.get(q.setId)!.push(q);
  }
  return order.map((id) => {
    const items = bag
      .get(id)!
      .slice()
      .sort((a, b) => a.no - b.no);
    return { id, brief: items[0].brief, items };
  });
}

/**
 * 학생이 푸는 차례 — 쪽 차례대로 문항을 늘어놓은 것.
 *
 * 학생 화면에는 S위계도, 위계 순으로 매긴 순번(no)도 내보이지 않는다. no는 세트로 묶이면
 * 한 쪽에 1·3·7번처럼 띄어 서기 때문이다. 학생에게는 이 차례로 「문제 1 · 문제 2 …」를
 * 붙인다(questionNumbers).
 */
export function examOrderOf(subject: SubjectId, bank: Bank = questions): Question[] {
  return pagesOf(subject, bank).flatMap((pg) => pg.items);
}

/**
 * 응시 화면이 한 번에 오른쪽에 세우는 문제들 — **화면** 단위로 자른 푸는 차례.
 *
 * 기본은 문제 하나가 한 화면이다. 같은 세트 안에서 group이 같은 문제가 이어 붙어 있으면
 * 그 문제들이 한 화면에 함께 선다. 왼쪽 자료는 세트가 같으면 화면이 바뀌어도 그대로다.
 */
export function screensOf(subject: SubjectId, bank: Bank = questions): Question[][] {
  const screens: Question[][] = [];
  for (const q of examOrderOf(subject, bank)) {
    const last = screens[screens.length - 1];
    const head = last?.[0];
    if (head && q.group && head.group === q.group && head.setId === q.setId) last.push(q);
    else screens.push([q]);
  }
  return screens;
}

/** 문항 id → 학생에게 보이는 문제 번호(1부터) */
export function questionNumbers(subject: SubjectId, bank: Bank = questions): Map<string, number> {
  return new Map(examOrderOf(subject, bank).map((q, i) => [q.id, i + 1]));
}

/** 이 문항이 몇 쪽에 있는가 — 문항 이동판이 번호를 눌렀을 때 갈 곳 */
export function pageIndexOf(subject: SubjectId, q: Question, bank: Bank = questions) {
  return pagesOf(subject, bank).findIndex((pg) => pg.id === q.setId);
}

/** 문항 이동판이 쓰는 묶음 — 위계별로 갈라 준다 */
export function questionsByLevel(subject: SubjectId, bank: Bank = questions) {
  const list = questionsOf(subject, bank);
  return levels
    .map((l) => ({ level: l, items: list.filter((q) => q.level === l.id) }))
    .filter((g) => g.items.length > 0);
}

export function subjectOf(id: SubjectId) {
  return subjects.find((s) => s.id === id);
}

export function isSubjectId(value: string): value is SubjectId {
  return SUBJECT_IDS.includes(value as SubjectId);
}
