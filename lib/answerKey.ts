import type { CatalogRound } from "./catalogRounds";
import type { CsvCell } from "./csv";
import {
  answerKind,
  answerText,
  keyText,
  markLabel,
  markOf,
  markOfPoints,
  pointText,
  pointsOf,
  screensOf,
  subjects,
  tierQuestions,
  type Grades,
  type Mark,
  type Question,
  type SubjectId,
} from "./exam";
import type { ExamRecord } from "./examStore";

/**
 * 정오표의 셈 — 진단 한 건의 답을 과목마다 줄로 편다.
 *
 * 화면 셋이 이 셈을 나눠 쓴다. 같은 줄 · 같은 번호 · 같은 정오를 말해야 하므로 한곳에 둔다.
 *   정오표        components/exam/AnswerKey.tsx
 *   답안 풀이 창   components/exam/AnswerReview.tsx
 *   내려받는 파일  CSV(여기 answerCsv) · PDF와 인쇄(정오표를 종이 모양으로 다시 그린 것)
 *
 * ── 정오는 두 군데서 온다 ──
 *   기계 채점   객관식 · 단답형은 정답과 맞춰 보아 바로 정답 · 오답 · 미응답이 난다
 *   전문가 채점 채점자가 점수를 매긴 문항(grades)은 그 점수를 따른다 — 만점이면 정답, 0점이면
 *               오답, 그 사이는 **부분 정답**이다. 기계가 정답으로 본 문항의 점수를 채점자가
 *               낮췄다면 그것도 채점자의 점수를 따른다
 * 서술형 · 논술형 · 사진은 채점자가 점수를 매기기 전까지 「채점 중」이다.
 */

/** 정오표의 한 줄 — 문항 하나 */
export type Line = {
  q: Question;
  /** 과목 안에서의 번호(1부터) — 응시 때 푼 차례 그대로다 */
  no: number;
  value: number | string | undefined;
  mark: Mark;
  /** 만점 */
  max: number;
  /** 받은 점수 — 아직 채점 중이면 null */
  points: number | null;
  /** 채점자가 점수를 매긴 문항인가 — 아니면 기계가 채점한 것이다 */
  expert: boolean;
  /** 채점자가 적은 해설 — 아이와 보호자가 읽는다 */
  comment?: string;
};

/**
 * 한 과목의 정오표 줄 — 응시 때와 같은 차례.
 *
 * 그 진단이 연 문항만 싣는다. 무료 진단을 본 아이의 정오표에 풀지 않은 문항을 「미응답」으로
 * 스무 줄 세우면, 다 푼 아이가 자기 진단을 망친 것으로 읽는다.
 */
export function linesOf(subject: SubjectId, record: ExamRecord, grades?: Grades): Line[] {
  const answers = record.subjects[subject].answers;
  return tierQuestions(record.tier, subject, record.setSubject).map((q, i) => {
    const value = answers[q.id];
    const max = pointsOf(q);
    const grade = grades?.[q.id];
    if (grade) {
      return {
        q,
        no: i + 1,
        value,
        max,
        mark: markOfPoints(q, value, grade.points),
        points: grade.points,
        expert: true,
        comment: grade.comment,
      };
    }
    const mark = markOf(q, value);
    return {
      q,
      no: i + 1,
      value,
      max,
      mark,
      points: mark === "pending" ? null : mark === "right" ? max : 0,
      expert: false,
    };
  });
}

/**
 * 한 번에 세우는 문항들 — 응시 화면과 같은 **화면** 단위로 줄을 묶는다.
 * 기본은 문항 하나이고, 세트 안의 작은 묶음이면 그 문항들이 함께 선다(lib/exam.ts screensOf).
 * 답안 풀이 창과 채점 창이 함께 쓴다.
 */
export function lineScreens<T extends { q: Question }>(subject: SubjectId, lines: T[]): T[][] {
  const byId = new Map(lines.map((l) => [l.q.id, l]));
  return screensOf(subject)
    .map((screen) => screen.flatMap((q) => byId.get(q.id) ?? []))
    .filter((screen) => screen.length > 0);
}

export function tally(lines: { mark: Mark }[]) {
  const n = (m: Mark) => lines.filter((l) => l.mark === m).length;
  return {
    right: n("right"),
    partial: n("partial"),
    wrong: n("wrong"),
    empty: n("empty"),
    pending: n("pending"),
  };
}

/** 접수 기록에서 정오표가 읽는 것 — 회차가 목록에서 사라졌으면 info가 없다 */
type Row = { info?: CatalogRound };

/** 이 진단에서 본 과목 — 회차가 목록에서 사라졌으면 검사 기본 과목을 모두 편다 */
export const answerSubjects = (row: Row) =>
  subjects.filter((s) => !row.info || row.info.subjects.some((x) => x.id === s.id));

/** 진단 한 건의 채점 합계 — 목록의 한 줄(「채점한 18문항 중 14문항 정답」)이 쓴다 */
export function answerTotals(row: Row, record: ExamRecord, grades?: Grades) {
  const lines = answerSubjects(row).flatMap((s) => linesOf(s.id, record, grades));
  const count = tally(lines);
  return { ...count, graded: lines.length - count.pending };
}

/* ───────────────────────── 내려받는 파일 ───────────────────────── */

export const answerCsvHead = ["과목", "문항", "유형", "정답", "내 답", "정오", "점수", "만점"];

/**
 * 정오표를 CSV 줄로 — 본 과목을 모두 한 파일에 담는다.
 *
 * 화면의 정오표는 객관식 답을 동그라미 번호(②)로 적지만 파일에는 「2번」으로 적는다. 표
 * 프로그램에서 고르고 세기 쉽고, 글꼴에 따라 동그라미 번호가 깨지는 일이 없다. 쓴 글은
 * 줄이지 않고 그대로 담고, 사진과 그림은 파일에 담을 수 없어 제출했다는 말만 적는다.
 * 점수는 채점이 끝난 문항에만 적는다.
 */
export function answerCsv(row: Row, record: ExamRecord, grades?: Grades): CsvCell[][] {
  return answerSubjects(row).flatMap((s) =>
    linesOf(s.id, record, grades).map(({ q, no, value, mark, points, max }) => {
      const key = q.type === "choice" ? `${q.answer! + 1}번` : keyText(q) || "전문가 채점";
      const mine =
        q.type === "choice"
          ? typeof value === "number"
            ? `${value + 1}번`
            : ""
          : answerText(q, value);
      return [
        s.short,
        no,
        answerKind(q),
        key,
        mine,
        markLabel[mark],
        points === null ? "" : pointText(points),
        max,
      ];
    }),
  );
}
