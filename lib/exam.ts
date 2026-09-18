// 문항 본문은 분량이 커서 따로 뒀다. 여기는 얼개와 셈만 둔다.
import {
  isGroup,
  type Blank,
  type Block,
  type ContentQuestion,
  type ContentSet,
  type Level,
  type Material,
  type Response,
} from "./content";
import { examSets } from "./examQuestions";

export type { Blank, Block, Figure, Level, Material, Table } from "./content";

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
  "type" | "choices" | "answer" | "blanks" | "guide" | "placeholder" | "minLength"
> {
  switch (r.kind) {
    case "choice":
      return { type: "choice", choices: r.choices, answer: r.answer };
    case "blanks":
      return { type: "essay", blanks: r.blanks };
    case "essay":
      return { type: "essay", guide: r.guide, placeholder: r.placeholder, minLength: r.minLength };
    case "match":
    case "upload":
      /* 선 잇기 · 파일 제출 화면은 아직 없다 — 그리기 전까지는 긴 글 칸으로 받는다 */
      return { type: "essay" };
  }
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
 * S위계 — 무엇이 적혀 있는가(S1)에서 왜 그런가(S2), 어떻게 할 것인가(S3),
 * 다르게 하면 어떤가(S4)로 묻는 층위를 올린다. 응시 화면의 문항 이동판이 이 단위로
 * 묶이고, 리포트도 같은 축으로 읽는다.
 */
export const levels: { id: Level; name: string; desc: string }[] = [
  { id: "S1", name: "지각", desc: "자료에 적힌 것을 그대로 찾아낸다" },
  { id: "S2", name: "이해", desc: "왜 그런지 까닭과 관계를 짚는다" },
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
  /** 채점 기준 — 학생 화면에는 내보이지 않는다 */
  scoring?: string[];
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
  if (b.draw) return v ? "(그림을 그림)" : "";
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

/**
 * 서술형 답을 사람이 읽는 글로 — 칸이 있으면 「차이점: … / 공통점: …」처럼 줄마다 편다.
 * 해설 · 해석 화면처럼 쓴 답을 그대로 보여 주는 자리에서 쓴다.
 */
export function answerText(q: Question, value: number | string | undefined): string {
  if (typeof value !== "string") return "";
  if (!q.blanks) return value.trim();
  const parts = splitBlanks(value, q.blanks.length);
  if (parts.every((p) => !p.trim())) return "";
  return q.blanks
    .map((b, i) => `${b.label || "답"} : ${blankText(b, parts[i]) || "(비움)"}`)
    .join("\n");
}

/* ───────────────────────── 정오 ───────────────────────── */

/**
 * 문항 하나의 정오.
 *
 *   right    맞음
 *   wrong    틀림
 *   empty    답하지 않음 — 정오표에서는 틀림과 같이 센다
 *   pending  기계로 맞춰 볼 수 없어 전문가가 채점한다
 *
 * 기계로 맞춰 보는 것은 객관식과, 칸마다 허용 답(accept)이 적힌 괄호 칸 문항뿐이다.
 * 한 칸이라도 허용 답이 없으면 그 문항은 통째로 전문가에게 넘긴다 — 반만 맞춰 보고
 * ○ · ✕를 붙이면 부분점수 문항의 정오가 틀어진다.
 */
export type Mark = "right" | "wrong" | "empty" | "pending";

/** 허용 답과 견줄 때 — 띄어쓰기 · 대소문자는 보지 않는다 */
const plain = (s: string) => s.replace(/\s+/g, "").toLowerCase();

/** 기계로 맞춰 볼 수 있는 문항인가 */
export function autoGraded(q: Question) {
  if (q.type === "choice") return true;
  return !!q.blanks?.length && q.blanks.every((b) => b.optional || b.accept?.length);
}

export function markOf(q: Question, value: number | string | undefined): Mark {
  if (q.type === "choice") {
    if (typeof value !== "number") return "empty";
    return value === q.answer ? "right" : "wrong";
  }
  if (!autoGraded(q)) return "pending";
  const parts = splitBlanks(value, q.blanks!.length);
  if (parts.every((p) => !p.trim())) return "empty";
  const ok = q.blanks!.every(
    (b, i) => b.optional || b.accept!.some((a) => plain(a) === plain(parts[i])),
  );
  return ok ? "right" : "wrong";
}

/** 동그라미 번호 — 정오표의 객관식 답 */
export const circled = (i: number) => String.fromCharCode(0x2460 + i);

/** 정오표의 「정답」 칸 — 기계 채점 문항만 값이 있다 */
export function keyText(q: Question): string {
  if (q.type === "choice") return circled(q.answer!);
  if (!autoGraded(q)) return "";
  return q
    .blanks!.map((b) => (b.optional ? "" : (b.accept![0] ?? "") + (b.suffix ?? "")))
    .join(", ");
}

/** 정오표의 「내 답」 칸 — 짧게 */
export function shortAnswer(q: Question, value: number | string | undefined): string {
  if (q.type === "choice") return typeof value === "number" ? circled(value) : "";
  if (!autoGraded(q)) return answerText(q, value) ? "작성함" : "";
  const parts = splitBlanks(value, q.blanks!.length);
  if (parts.every((p) => !p.trim())) return "";
  return q
    .blanks!.map((b, i) => (parts[i].trim() ? parts[i].trim() + (b.suffix ?? "") : "-"))
    .join(", ");
}

/**
 * 무료 체험(/exam/try)에서 가입 없이 풀어 보는 문항 수 — **평가 하나의 과목마다**.
 *
 * 앞에서부터 이만큼만 열고, 나머지는 회원가입을 권하는 판으로 막는다. 과목마다 세는
 * 까닭은 보호자가 궁금한 과목이 저마다라서다 — 평가 전체로 세면 국어를 넘기다가 수학은
 * 한 문항도 못 보고 막힌다.
 */
export const FREE_QUESTIONS = 5;

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
