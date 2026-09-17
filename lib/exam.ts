// 문항 본문은 분량이 커서 따로 뒀다. 여기는 얼개와 셈만 둔다.
import { questions as authored } from "./examQuestions";

/**
 * 같은 자료(brief)를 쓰는 문항에 같은 묶음 열쇠를 매긴다.
 *
 * 자료 객체는 examQuestions.ts에서 상수 하나를 여러 문항이 나눠 쓴다(korStory 등).
 * 그 **객체 신원**이 곧 「같은 글을 읽는가」이므로, 그것으로 묶으면 손으로 적어 둔 값과
 * 어긋날 일이 없다. 앞으로 문항을 붙일 때 자료를 복사해 붙이면 다른 묶음이 되는데,
 * 그것도 뜻대로다 — 글자가 같아도 따로 실린 자료라면 따로 읽히는 것이 맞다.
 */
function withSets(list: Omit<Question, "setId">[]): Question[] {
  const key = new Map<Brief, string>();
  return list.map((q) => {
    if (!key.has(q.brief)) key.set(q.brief, `${q.subject}-S${key.size + 1}`);
    return { ...q, setId: key.get(q.brief)! };
  });
}

export const questions: Question[] = withSets(authored);

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
 * 자료 · 문제에 싣는 사진 한 장.
 *
 * `marks`는 사진 위에 그리는 화살표 이름표다(시험지의 「A →」). 사진에 구워 넣지 않고
 * 따로 그리는 까닭은 글자가 흐려지지 않게 하려는 것이다. 좌표는 사진 크기에 대한 %다 —
 * (x, y)에 이름을 쓰고 (toX, toY)를 화살표 끝으로 가리킨다.
 */
export type Figure = {
  /** public 경로 */
  src: string;
  caption: string;
  alt: string;
  /** 이름표 — (toX, toY)가 없으면 화살표 없이 글자만 둔다 */
  marks?: { label: string; x: number; y: number; toX?: number; toY?: number }[];
  /** 점선 타원 표시(「흰색 점선으로 표시한 마을」) — 가운데 (x, y), 반지름 (rx, ry), 모두 % */
  rings?: { x: number; y: number; rx: number; ry: number }[];
};

/**
 * 표 자료.
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

/** 좌측 패널에 들어가는 기본 설명·자료 */
export type Brief = {
  label: string;
  title: string;
  /** 자료 위에 서는 지시문 — 「다음 … 을 읽고 물음에 답하시오.」 (선택) */
  lead?: string;
  /**
   * 문단 단위 본문. 「( ㄱ )」처럼 괄호에 든 자음은 **빈칸 표지**로 읽어 칸 모양으로
   * 세운다 — 문항이 그 빈칸을 가리켜 묻는다.
   */
  paragraphs: string[];
  /** 본문 아래 사진 (선택) */
  figures?: Figure[];
  /** 사진을 시간 순서로 읽는가 — 사진 사이에 화살표(⇨)를 세운다 */
  sequence?: boolean;
  /** 표 형태 자료 (선택) */
  table?: Table;
  /** 목록 형태 자료 (선택) */
  list?: string[];
  /** 하단 안내 문구 (선택) */
  note?: string;
};

/**
 * S위계 — 무엇이 적혀 있는가(S1)에서 왜 그런가(S2), 어떻게 할 것인가(S3),
 * 다르게 하면 어떤가(S4)로 묻는 층위를 올린다. 응시 화면의 문항 이동판이 이 단위로
 * 묶이고, 리포트도 같은 축으로 읽는다.
 */
export type Level = "S1" | "S2" | "S3" | "S4";

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
  /** 과목 내 순번 (1~10) */
  no: number;
  /**
   * 함께 읽는 자료를 나눠 쓰는 묶음의 열쇠 — **세트 문항**.
   *
   * 세트를 두는 까닭은 하나다. 자료를 두 번 읽히지 않고 묻는 층을 올린다 — 같은 글을
   * 놓고 「무엇이라고 했나」(S1)를 묻고 이어서 「왜 그런가」(S3)를 묻는다. 응시 화면은
   * 왼쪽에 그 자료를 붙들어 둔 채 오른쪽 문제만 문제 1 → 문제 2로 넘긴다.
   *
   * 값은 손으로 적지 않고 **같은 자료(brief)를 쓰는 문항끼리 묶어** 매긴다(withSets).
   * 자료를 나눠 쓰는 것과 세트인 것이 이 자료에서는 같은 말이고, 두 곳에 적어 두면
   * 언젠가 둘이 갈린다. 문항 하나뿐인 묶음은 그냥 낱개로 선다.
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
  /** 발문 아래 사진 (선택) — 문제에만 딸린 그림 */
  figures?: Figure[];
  /** 발문 아래 표 (선택) */
  table?: Table;
  /**
   * 발문 아래 움직이는 자료 — 지금은 진자 하나뿐이다(「아래 동영상을 보고 주기를 재시오」).
   * 영상 파일 대신 화면에서 정해진 주기로 흔들어 보인다. 재생 단추를 눌러야 움직인다 —
   * 아이가 초시계를 준비한 뒤 시작하게 하려는 것이다.
   */
  clip?: { kind: "pendulum"; periodSec: number; caption: string };
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

export type Blank = {
  label: string;
  placeholder?: string;
  options?: string[];
  short?: boolean;
  suffix?: string;
  /**
   * 문장 속 칸 — 「강물은 {}보다 {}에서 더 빠르게 흐른다.」의 {}마다 짧은 칸을 연다.
   * 칸들의 값은 SLOT으로 이어 이 칸 하나의 답으로 둔다.
   */
  template?: string;
  /** 그려서 답하는 칸 — 밑그림 경로(빈 문자열이면 흰 종이). 그린 그림은 이미지 데이터 주소로 둔다 */
  draw?: string;
  /** 비워 두어도 되는 칸 — 「그림을 그려서 설명해도 됩니다」 */
  optional?: boolean;
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
export const questionCount = (subject: SubjectId) => questionsOf(subject).length;

/** 전 과목 문항 수 */
export const totalQuestions = () => questions.length;

/** 「국어 10 · 수학 10 · 과학 20문항」 */
export const questionCountText = () =>
  `${subjects.map((s) => `${s.short} ${questionCount(s.id)}`).join(" · ")}문항`;

export function questionsOf(subject: SubjectId) {
  return questions.filter((q) => q.subject === subject);
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

export function pagesOf(subject: SubjectId): Page[] {
  const list = questionsOf(subject);
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
export function examOrderOf(subject: SubjectId): Question[] {
  return pagesOf(subject).flatMap((pg) => pg.items);
}

/**
 * 응시 화면이 한 번에 오른쪽에 세우는 문제들 — **화면** 단위로 자른 푸는 차례.
 *
 * 기본은 문제 하나가 한 화면이다. 같은 세트 안에서 group이 같은 문제가 이어 붙어 있으면
 * 그 문제들이 한 화면에 함께 선다. 왼쪽 자료는 세트가 같으면 화면이 바뀌어도 그대로다.
 */
export function screensOf(subject: SubjectId): Question[][] {
  const screens: Question[][] = [];
  for (const q of examOrderOf(subject)) {
    const last = screens[screens.length - 1];
    const head = last?.[0];
    if (head && q.group && head.group === q.group && head.setId === q.setId) last.push(q);
    else screens.push([q]);
  }
  return screens;
}

/** 문항 id → 학생에게 보이는 문제 번호(1부터) */
export function questionNumbers(subject: SubjectId): Map<string, number> {
  return new Map(examOrderOf(subject).map((q, i) => [q.id, i + 1]));
}

/** 이 문항이 몇 쪽에 있는가 — 문항 이동판이 번호를 눌렀을 때 갈 곳 */
export function pageIndexOf(subject: SubjectId, q: Question) {
  return pagesOf(subject).findIndex((pg) => pg.id === q.setId);
}

/** 문항 이동판이 쓰는 묶음 — 위계별로 갈라 준다 */
export function questionsByLevel(subject: SubjectId) {
  const list = questionsOf(subject);
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
