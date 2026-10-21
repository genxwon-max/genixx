import {
  markOfPoints,
  type Grades,
  type Mark,
  type Question,
  type SubjectId,
} from "./exam";

/**
 * 채점할 답안지 — 운영 콘솔의 「회원 채점」이 한 아이의 시험지를 채점하는 데 쓰는 셈.
 *
 * 채점은 두 겹이다.
 *   AI      모든 문항에 먼저 점수를 매긴다. 객관식 · 단답형은 정답과 맞춰 본 값이고, 서술형 ·
 *           논술형은 글을 읽고 매긴 값이다. 사진은 AI가 채점하지 않는다(0점으로 깔린다)
 *   채점자  1번부터 끝까지 넘기며 AI의 점수를 확인하고, 틀렸으면 고친다. **모든 문항을 고칠 수
 *           있다** — 2점 만점에 2점을 받은 문항도 1점으로 낮출 수 있다
 *
 * 채점자가 점수를 적은 문항만 「확인한 문항」으로 센다. AI의 점수가 그대로 맞아도 채점자가
 * 확인했다는 표시가 남아야, 답안지 한 장을 다 봤는지를 셀 수 있다.
 *
 * 정오(정답 · 부분 정답 · 오답 · 미응답)는 따로 매기지 않는다. 지금 점수에서 읽는다
 * (lib/exam.ts markOfPoints) — 만점이면 정답, 0점이면 오답, 그 사이는 부분 정답이다.
 *
 * 사진으로 낸 답을 알아볼 수 없으면(흐림 · 잘림 · 빛 반사 …) 채점자는 점수를 매기지 않고
 * 「알아볼 수 없음」을 고른다(2026-10-21). 그 문항은 **운영자 확인**으로 넘어가 확인한 문항으로
 * 세지 않는다 — 운영자가 보호자에게 사진을 다시 받아 오거나 지금 사진으로 채점하라고 돌려보내기
 * 전까지 답안지 채점은 끝나지 않고, 리포트도 조립되지 않는다.
 *
 * ⚠ 지시자("use client")를 붙이지 않는다. 콘솔의 화면과 디자인 보기, 학생 화면이 함께 읽는다.
 */

/** 채점할 답안지의 한 줄 — 문항 하나와 AI가 먼저 매긴 것 */
export type GradeLine = {
  q: Question;
  /** 과목 안에서의 번호(1부터) — 응시 때 푼 차례 그대로다 */
  no: number;
  /** 낸 답 — 응시 기록에 적히는 꼴 그대로(lib/examStore.ts). 응시 화면의 조각이 그대로 그린다 */
  value: number | string | undefined;
  /** 만점 */
  max: number;
  /**
   * AI가 매긴 점수 — 채점자가 고치기 전의 시작값.
   * null이면 AI가 채점하지 않은 문항이다(사진으로 낸 답). 채점자가 점수를 매기기 전까지 이
   * 문항에는 점수가 없다 — 0점이 아니다.
   */
  ai: number | null;
  /** AI 채점 해설 — 왜 그 점수인가 */
  aiWhy: string;
  /** 제출한 뒤 아이가 적은 것 — 왜 그렇게 답했는지(자아성찰) */
  reflect?: { pick: string; text: string };
};

/** 과목 한 벌 — 그 과목의 문항을 푼 차례대로 */
export type GradeSubject = { id: SubjectId; short: string; lines: GradeLine[] };

/**
 * 사진을 알아볼 수 없어 점수를 매기지 않고 운영자 확인으로 넘긴 것 — 사진으로 낸 답에만 있다.
 * reason은 아래 unreadableReasons 가운데 하나, memo는 운영자에게 남기는 말이다(아이에게는 보이지 않는다).
 */
export type Unreadable = { reason: string; memo?: string };

/** 「알아볼 수 없는 이유」 — 진단 채점 · 회원 채점 · 운영자 확인이 같은 말을 쓴다 */
export const unreadableReasons = [
  "사진이 흐립니다",
  "답의 일부가 잘렸습니다",
  "너무 어둡거나 빛이 반사됩니다",
  "문항과 관계없는 사진입니다",
  "빈 종이입니다",
];

/** 채점자가 손본 것 — 문항 ID → 점수와 해설. 점수가 적혀 있으면 확인한 문항이다 */
export type GradeMarks = Record<string, { points?: number; comment?: string; unreadable?: Unreadable }>;

/**
 * 채점자가 화면에서 고친 것 한 건 — 저장소(lib/sheetMarkStore.ts)가 받는 꼴.
 * unreadable은 점수와 함께 있을 수 없다 — 점수를 매기면 지우고, 「알아볼 수 없음」을 고르면 점수를 지운다.
 */
export type GradeEdit = { id: string; points: number | null; comment: string; unreadable?: Unreadable | null };

/**
 * 문항의 채점 상태.
 *   ai       AI의 점수만 있다 — 채점자가 아직 확인하지 않았다
 *   checked  채점자가 AI의 점수 그대로 확인했다
 *   edited   채점자가 점수를 고쳤다
 *   held     사진을 알아볼 수 없어 운영자 확인으로 넘겼다 — 점수가 없고, 확인한 문항으로 세지 않는다
 */
export type GradeState = "ai" | "checked" | "edited" | "held";

export const gradeStateLabel: Record<GradeState, string> = {
  ai: "확인 전",
  checked: "확인",
  edited: "수정",
  held: "운영자 확인",
};

/**
 * 한 문항의 지금 점수 · 상태 · 정오.
 *
 * scored가 false면 아직 점수가 없다 — AI가 채점하지 않았고 채점자도 매기지 않았다. 그때 points는
 * 0으로 오지만 0점이라는 뜻이 아니고, 정오도 「채점 중」이다.
 */
export function gradeOf(line: GradeLine, marks: GradeMarks) {
  const m = marks[line.q.id];
  /* 운영자 확인으로 넘긴 사진 — 점수를 매기면 그 표시는 지워지지만, 둘이 함께 남아 있으면 점수가 이긴다 */
  const held = !!m?.unreadable && m.points === undefined;
  const scored = m?.points !== undefined || line.ai !== null;
  const points = m?.points ?? line.ai ?? 0;
  const state: GradeState = held
    ? "held"
    : m?.points === undefined
      ? "ai"
      : line.ai === null || m.points === line.ai
        ? "checked"
        : "edited";
  const mark: Mark = scored && !held ? markOfPoints(line.q, line.value, points) : "pending";
  return { points, scored, state, comment: m?.comment ?? "", mark, unreadable: held ? m?.unreadable : undefined };
}

/**
 * 답안지 한 장의 채점 진척과 점수 — 목록과 상세가 같은 셈을 쓴다.
 * 운영자 확인으로 넘긴 문항(held)은 확인한 문항(done)에 넣지 않는다 — 넣으면 사진을 다시 받기 전에
 * 답안지가 「채점 완료」가 되어 리포트가 조립된다.
 */
export function gradeStat(subjects: GradeSubject[], marks: GradeMarks) {
  const out = { done: 0, total: 0, got: 0, max: 0, edited: 0, held: 0, comments: 0 };
  for (const s of subjects) {
    for (const line of s.lines) {
      const g = gradeOf(line, marks);
      out.total += 1;
      out.max += line.max;
      out.got += g.points;
      if (g.state === "held") out.held += 1;
      else if (g.state !== "ai") out.done += 1;
      if (g.state === "edited") out.edited += 1;
      if (g.comment) out.comments += 1;
    }
  }
  return out;
}

/**
 * 채점 결과를 학생 화면이 읽는 꼴로 — **채점자가 확인한 문항만** 싣는다.
 * 확인하지 않은 문항의 AI 점수는 아이에게 내보이지 않는다. 그 문항은 정오표에 「채점 중」으로 남는다.
 */
export function gradesOf(subjects: GradeSubject[], marks: GradeMarks): Grades {
  const out: Grades = {};
  for (const s of subjects) {
    for (const line of s.lines) {
      const m = marks[line.q.id];
      if (m?.points === undefined) continue;
      out[line.q.id] = { points: m.points, comment: m.comment || undefined };
    }
  }
  return out;
}
