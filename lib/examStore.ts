"use client";

import { useSyncExternalStore } from "react";
import { SUBJECT_IDS, type SubjectId } from "./exam";

/** 설문 상태 — 미제출 / 제출 완료 */
export type SurveyState = "none" | "done";

/** 설문 주체 */
export type SurveyKey = "mother" | "father" | "teacher";

export const surveyKeys: SurveyKey[] = ["mother", "father", "teacher"];

export const surveyMeta: Record<
  SurveyKey,
  { label: string; who: string; note: string; required: boolean }
> = {
  mother: {
    label: "학부모 설문 (어머니)",
    who: "어머니",
    note: "가정에서 관찰한 모습",
    required: false,
  },
  father: {
    label: "학부모 설문 (아버지)",
    who: "아버지",
    note: "가정에서 관찰한 모습",
    required: false,
  },
  teacher: {
    label: "지도교사 관찰 설문",
    who: "담당 교사·교수",
    note: "학교·학원에서 관찰한 모습",
    required: false,
  },
};

export type ExamStatus = "ready" | "in-progress" | "submitted" | "forfeited";

/** 과목 하나에 대한 응시 기록. 과목은 각각 따로 응시한다. */
export type SubjectRecord = {
  /** 문항 ID → 선택한 보기 index(객관식) 또는 작성한 글(서술형) */
  answers: Record<string, number | string>;
  status: ExamStatus;
  startedAt: string | null;
  submittedAt: string | null;
  /** 남은 응시 기회. '포기하기' 선택 시 1 감소 */
  attemptsLeft: number;
  /** 제출 후 문항별로 적는 해석 — 왜 그렇게 답했는지 / 왜 못 풀었는지 */
  reflections: Record<string, string>;
  /** 해석 작성을 마친 시각. null이면 아직 작성 중 */
  reflectionAt: string | null;
};

export type ExamRecord = {
  subjects: Record<SubjectId, SubjectRecord>;
  surveys: Record<SurveyKey, SurveyState>;
  surveyAt: Partial<Record<SurveyKey, string>>;
  /** 최종 제출(결과 산출 요청) 여부 */
  finalized: boolean;
  finalizedAt: string | null;
};

const emptySubject: SubjectRecord = {
  answers: {},
  status: "ready",
  startedAt: null,
  submittedAt: null,
  attemptsLeft: 1,
  reflections: {},
  reflectionAt: null,
};

export const initialRecord: ExamRecord = {
  subjects: Object.fromEntries(SUBJECT_IDS.map((id) => [id, emptySubject])) as Record<
    SubjectId,
    SubjectRecord
  >,
  surveys: { mother: "none", father: "none", teacher: "none" },
  surveyAt: {},
  finalized: false,
  finalizedAt: null,
};

type Store = Record<string, ExamRecord>;

const KEY = "genixx.exam.records";
const EVENT = "genixx:exam-change";

let cacheRaw: string | null = null;
let cacheStore: Store = {};
/** 학생별 정규화 결과를 캐시해 useSyncExternalStore가 안정된 참조를 받도록 한다 */
let cacheRecords: Record<string, ExamRecord> = {};

function normalize(raw: Partial<ExamRecord> | undefined): ExamRecord {
  const subjects = Object.fromEntries(
    SUBJECT_IDS.map((id) => [id, { ...emptySubject, ...raw?.subjects?.[id] }]),
  ) as Record<SubjectId, SubjectRecord>;
  return {
    subjects,
    surveys: { ...initialRecord.surveys, ...raw?.surveys },
    surveyAt: { ...raw?.surveyAt },
    finalized: raw?.finalized ?? false,
    finalizedAt: raw?.finalizedAt ?? null,
  };
}

function readStore(): Store {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(KEY);
  if (raw === cacheRaw) return cacheStore;
  cacheRaw = raw;
  cacheRecords = {};
  try {
    cacheStore = raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    cacheStore = {};
  }
  return cacheStore;
}

function readRecord(studentId: string): ExamRecord {
  if (typeof window === "undefined") return initialRecord;
  const store = readStore();
  if (!cacheRecords[studentId]) cacheRecords[studentId] = normalize(store[studentId]);
  return cacheRecords[studentId];
}

function writeRecord(studentId: string, next: ExamRecord) {
  const store = { ...readStore(), [studentId]: next };
  window.localStorage.setItem(KEY, JSON.stringify(store));
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

/** 학생 한 명의 응시 기록 */
export function useExamRecord(studentId: string): ExamRecord {
  return useSyncExternalStore(
    subscribe,
    () => readRecord(studentId),
    () => initialRecord,
  );
}

/** 전체 학생의 기록 (학원장 현황 표) */
export function useExamStore(): Store {
  return useSyncExternalStore(subscribe, readStore, () => ({}));
}

export function getRecord(studentId: string) {
  return readRecord(studentId);
}

/** 클라이언트에서 하이드레이션이 끝났는지 — 저장값 렌더 전 깜빡임 방지용 */
export function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function patchSubject(studentId: string, subject: SubjectId, patch: Partial<SubjectRecord>) {
  const current = readRecord(studentId);
  writeRecord(studentId, {
    ...current,
    subjects: { ...current.subjects, [subject]: { ...current.subjects[subject], ...patch } },
  });
}

export function setAnswer(
  studentId: string,
  subject: SubjectId,
  questionId: string,
  value: number | string,
) {
  const rec = readRecord(studentId).subjects[subject];
  patchSubject(studentId, subject, {
    status: rec.status === "ready" ? "in-progress" : rec.status,
    startedAt: rec.startedAt ?? new Date().toISOString(),
    answers: { ...rec.answers, [questionId]: value },
  });
}

export function startSubject(studentId: string, subject: SubjectId) {
  const rec = readRecord(studentId).subjects[subject];
  if (rec.startedAt) return;
  patchSubject(studentId, subject, { status: "in-progress", startedAt: new Date().toISOString() });
}

export function submitSubject(studentId: string, subject: SubjectId) {
  patchSubject(studentId, subject, { status: "submitted", submittedAt: new Date().toISOString() });
}

/** 제출 후 문항별 해석 작성 */
export function setReflection(
  studentId: string,
  subject: SubjectId,
  questionId: string,
  text: string,
) {
  const rec = readRecord(studentId).subjects[subject];
  patchSubject(studentId, subject, {
    reflections: { ...rec.reflections, [questionId]: text },
  });
}

export function finishReflection(studentId: string, subject: SubjectId) {
  patchSubject(studentId, subject, { reflectionAt: new Date().toISOString() });
}

/** 포기하기 — 해당 과목의 응시 기회가 1회 소모되고 답안은 폐기된다. */
export function forfeitSubject(studentId: string, subject: SubjectId) {
  const rec = readRecord(studentId).subjects[subject];
  patchSubject(studentId, subject, {
    answers: {},
    status: "forfeited",
    submittedAt: new Date().toISOString(),
    attemptsLeft: Math.max(0, rec.attemptsLeft - 1),
    reflections: {},
    reflectionAt: null,
  });
}

export function restartSubject(studentId: string, subject: SubjectId) {
  const rec = readRecord(studentId).subjects[subject];
  if (rec.attemptsLeft <= 0) return;
  patchSubject(studentId, subject, {
    answers: {},
    status: "ready",
    startedAt: null,
    submittedAt: null,
    reflections: {},
    reflectionAt: null,
  });
}

export function setSurvey(studentId: string, key: SurveyKey, state: SurveyState) {
  const current = readRecord(studentId);
  writeRecord(studentId, {
    ...current,
    surveys: { ...current.surveys, [key]: state },
    surveyAt: { ...current.surveyAt, [key]: state === "done" ? new Date().toISOString() : undefined },
  });
}

/** 최종 제출 — 설문이 빠져 있어도 진행할 수 있다 */
export function finalize(studentId: string) {
  const current = readRecord(studentId);
  writeRecord(studentId, {
    ...current,
    finalized: true,
    finalizedAt: new Date().toISOString(),
  });
}

export function resetStudent(studentId: string) {
  writeRecord(studentId, initialRecord);
}

/** 세 과목을 모두 제출했는지 */
export function allSubmitted(record: ExamRecord) {
  return SUBJECT_IDS.every((id) => record.subjects[id].status === "submitted");
}

export function submittedCount(record: ExamRecord) {
  return SUBJECT_IDS.filter((id) => record.subjects[id].status === "submitted").length;
}

/** 아직 제출되지 않은 설문 목록 */
export function missingSurveys(record: ExamRecord) {
  return surveyKeys.filter((k) => record.surveys[k] !== "done");
}
