// 문항 본문은 분량이 커서 따로 뒀다. 여기는 얼개와 셈만 둔다.
import { questions } from "./examQuestions";

export { questions };

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
export function deadlineDays(at: Date = new Date()): number {
  const [y, m, d] = assessment.deadline.split("-").map(Number);
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
