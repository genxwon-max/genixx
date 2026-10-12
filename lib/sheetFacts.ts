import type { SubjectId } from "./exam";
import { gradeOf, type GradeMarks, type GradeSubject } from "./gradeSheet";
import type { Facts } from "./reportAssembly";
import { isTargetGrade, templateGradeFrom } from "./reportAssets";
import { axes } from "./result";

/**
 * 채점이 끝난 답안지에서 리포트 조립이 읽는 값을 낸다.
 *
 *   과목 점수   그 과목에서 받은 점수 ÷ 만점 × 100 (반올림)
 *   축 점수     과목 점수 그대로 — 2026 파일럿은 과목 하나가 축 하나를 잰다
 *               (국어 → 언어 · 수학 → 수리·논리 · 과학 → 자연·탐구)
 *   관찰 설문   학부모 · 지도교사 설문이 들어온 건수
 *
 * 회원 채점의 정오표(components/admin2/GradeSheet.tsx)가 보여 주는 점수와 **같은 셈**
 * (lib/gradeSheet.ts의 gradeOf)을 쓴다. 정오표에는 16 / 30인데 리포트의 근거에는 61점이라고
 * 적혀 있으면, 어느 쪽이 맞는지 물을 곳이 없다.
 *
 * ⚠ 지시자("use client")를 붙이지 않는다. 씨앗 리포트(lib/reportStore.ts)와 채점 화면이 함께 쓴다.
 */

/** 채점 자료는 학년을 「초4」로, 리포트는 「초등 4학년」으로 적는다 */
const GRADE_LONG: Record<string, string> = {
  초3: "초등 3학년",
  초4: "초등 4학년",
  초5: "초등 5학년",
  초6: "초등 6학년",
  중1: "중학교 1학년",
  중2: "중학교 2학년",
};

export const gradeLong = (short: string) => GRADE_LONG[short] ?? short;

export type SubjectScore = { subject: SubjectId; got: number; max: number; score: number };

/** 과목마다의 점수 — 받은 점수와, 그것을 100점으로 고친 값 */
export function subjectScores(subjects: GradeSubject[], marks: GradeMarks): SubjectScore[] {
  return subjects.map((s) => {
    let got = 0;
    let max = 0;
    for (const line of s.lines) {
      got += gradeOf(line, marks).points;
      max += line.max;
    }
    return { subject: s.id, got, max, score: max ? Math.round((got / max) * 100) : 0 };
  });
}

/**
 * 이 답안지에 들어온 관찰 설문 건수(0~2).
 *
 * ⚠ 지어낸 값이다. 콘솔의 답안지는 응시번호뿐이라 누가 설문을 냈는지 알 길이 없다. 붙일 때는
 *   설문 API가 그 학생의 학부모 · 지도교사 설문 제출 여부를 돌려준다.
 */
export function surveysOf(sheetKey: string) {
  let h = 0;
  for (let i = 0; i < sheetKey.length; i += 1) h = (h * 33 + sheetKey.charCodeAt(i)) >>> 0;
  const v = h % 20;
  return v < 8 ? 0 : v < 15 ? 1 : 2;
}

/** 학년 글자에서 조립이 읽는 학년 — 대상 학년이 아니면 원래 학년을 함께 든다 */
export function gradeFacts(text: string): Pick<Facts, "grade" | "offGrade"> {
  const grade = templateGradeFrom(text);
  return text.trim() && !isTargetGrade(text) ? { grade, offGrade: text.trim() } : { grade };
}

/** 답안지 한 장에서 조립이 읽는 값 */
export function factsOfSheet(
  sheet: { key: string; grade: string },
  subjects: GradeSubject[],
  marks: GradeMarks,
): Facts {
  const scores = subjectScores(subjects, marks).flatMap((s) => {
    const axis = axes.find((a) => a.subject === s.subject);
    return axis ? [{ axis: axis.id, score: s.score }] : [];
  });
  return { ...gradeFacts(gradeLong(sheet.grade)), scores, surveys: surveysOf(sheet.key) };
}
