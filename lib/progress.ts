"use client";

import { getRecord, surveyKeys, type ExamRecord } from "./examStore";
import { SUBJECT_IDS, subjectOf, type SubjectId } from "./exam";
import type { Student } from "./roster";

/**
 * 학생 한 명의 진행 상황 요약.
 *
 * 학부모 홈(/my)과 기관 대시보드(/org)가 같은 계산을 쓰기 때문에 한곳에 모았다.
 * 응시 기록은 학생별로 저장되므로(lib/examStore.ts) 명부와 짝지어 집계한다.
 */

export type Phase = "미응시" | "응시중" | "제출완료" | "검사완료";

/** 과목 한 칸의 상태. 막대 하나로 뭉뚱그리지 않고 과목별로 따로 보여 주기 위한 값이다. */
export type SubjectState = "완료" | "진행중" | "포기" | "미완료";

export type SubjectProgress = {
  id: SubjectId;
  short: string;
  state: SubjectState;
};

export type StudentProgress = {
  student: Student;
  /** 제출한 과목 수 */
  submitted: number;
  /** 전체 과목 수 */
  total: number;
  /** 포기한 과목 수 */
  forfeited: number;
  /** 과목별 상태 — 국어·수학·과학 세 칸 */
  subjects: SubjectProgress[];
  /** 제출된 설문 수 (어머니·아버지·교사) */
  surveys: number;
  phase: Phase;
  /** 다음에 해야 할 일 한 줄 */
  nextAction: string;
};

function phaseOf(record: ExamRecord, submitted: number, total: number): Phase {
  if (record.finalized) return "검사완료";
  if (submitted >= total) return "제출완료";
  const started = SUBJECT_IDS.some((id) => record.subjects[id].status !== "ready");
  return started ? "응시중" : "미응시";
}

export function progressOf(student: Student): StudentProgress {
  const record = getRecord(student.id);
  const total = SUBJECT_IDS.length;
  const subjectRows: SubjectProgress[] = SUBJECT_IDS.map((id) => {
    const st = record.subjects[id].status;
    return {
      id,
      // SUBJECT_IDS가 subjects에서 나온 값이라 항상 찾아지지만, 타입상 옵셔널이다
      short: subjectOf(id)?.short ?? id,
      state:
        st === "submitted"
          ? "완료"
          : st === "in-progress"
            ? "진행중"
            : st === "forfeited"
              ? "포기"
              : "미완료",
    };
  });
  const submitted = SUBJECT_IDS.filter((id) => record.subjects[id].status === "submitted").length;
  const forfeited = SUBJECT_IDS.filter((id) => record.subjects[id].status === "forfeited").length;
  const surveys = surveyKeys.filter((k) => record.surveys[k] === "done").length;
  const phase = phaseOf(record, submitted, total);

  const nextAction =
    phase === "미응시"
      ? "아직 시작하지 않았습니다. 접속코드로 응시 화면에 들어가면 시작됩니다."
      : phase === "응시중"
        ? `${total - submitted}과목이 남았습니다.`
        : phase === "제출완료"
          ? surveys === 0
            ? "설문이 아직 없습니다. 설문 없이 제출하거나 설문을 채울 수 있습니다."
            : "최종 제출하면 결과 분석이 시작됩니다."
          : "결과 리포트를 볼 수 있습니다.";

  return { student, submitted, total, forfeited, subjects: subjectRows, surveys, phase, nextAction };
}

/**
 * 상태를 나타내는 색 — 글자색만 쓴다.
 *
 * 알약 배지에 배경과 테두리를 두르면 한 줄에 색 덩어리가 다섯 개 생겨서, 정작 읽어야
 * 할 이름과 코드가 묻힌다. 면을 걷고 글자색만 남겨도 상태는 그대로 구분된다.
 * 색만으로 나누지 않고 「완료 · 진행중 · 미완료」라는 말을 함께 두어, 색을 구분하기
 * 어려운 사람도 읽을 수 있게 한다.
 */
export const subjectTone: Record<SubjectState, string> = {
  완료: "text-emerald-600",
  진행중: "text-soft-primary",
  포기: "text-slate-400",
  미완료: "text-slate-400",
};

/** 앞에 찍는 작은 점의 색. 배지 대신 이것 하나로 상태를 표시한다. */
export const phaseTone: Record<Phase, { dot: string; text: string }> = {
  미응시: { dot: "bg-slate-300", text: "text-slate-500" },
  응시중: { dot: "bg-amber-500", text: "text-amber-700" },
  제출완료: { dot: "bg-soft-primary", text: "text-soft-primary" },
  검사완료: { dot: "bg-emerald-500", text: "text-emerald-700" },
};
