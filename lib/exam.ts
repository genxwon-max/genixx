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

/** 좌측 패널에 들어가는 기본 설명·자료 */
export type Brief = {
  label: string;
  title: string;
  /** 문단 단위 본문 */
  paragraphs: string[];
  /** 표 형태 자료 (선택) */
  table?: { head: string[]; rows: string[][] };
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
   * 함께 읽는 자료를 나눠 쓰는 묶음의 열쇠 — **한 화면에 함께 서는 문항들**.
   *
   * 세트를 두는 까닭은 하나다. 자료를 두 번 읽히지 않고 묻는 층을 올린다 — 같은 글을
   * 놓고 「무엇이라고 했나」(S1)를 묻고 이어서 「왜 그런가」(S3)를 묻는다. 그러려면 그
   * 자료를 붙들어 둔 채 문항을 내려가야 하고, 한 문항씩 넘기면 2번을 풀다가 자료를 보러
   * 되돌아가게 된다.
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
};

export const QUESTIONS_PER_SUBJECT = 10;

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
    const items = bag.get(id)!.slice().sort((a, b) => a.no - b.no);
    return { id, brief: items[0].brief, items };
  });
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
