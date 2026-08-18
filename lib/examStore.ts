"use client";

import { useSyncExternalStore } from "react";
import { SUBJECT_IDS, type SubjectId } from "./exam";
import { getExamConfig } from "./roundStore";

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
  /**
   * 시작할 때의 제한 시간(분).
   *
   * 회차 설정(ADM-05)에서 읽어 여기에 박아 둔다. 관리자가 도중에 40분을 30분으로
   * 줄여도 이미 시작한 아이의 시계는 줄지 않는다 — 푸는 중에 남은 시간이 갑자기
   * 깎이면, 그 아이는 자기가 무엇을 잘못했는지 알 수 없다.
   * null이면 옛 기록이므로 지금 회차 설정을 쓴다.
   */
  limitMin: number | null;
  /** 남은 응시 기회. '포기하기' 선택 시 1 감소 */
  attemptsLeft: number;
  /** 제출 후 문항별로 적는 해석 — 왜 그렇게 답했는지 / 왜 못 풀었는지 */
  reflections: Record<string, string>;
  /**
   * 문항별로 고른 까닭. 문항 ID → reflectionReasons의 id.
   *
   * 글로만 받으면 3~4학년은 「몰라서요」 넉 자로 끝난다. 쓰기가 어려운 것이지
   * 생각이 없는 것이 아닌데, 그 구별이 기록에 남지 않는다. 고르는 칸을 먼저
   * 두면 쓰기 힘이 약한 아이도 자기 상태를 말할 수 있다.
   */
  reflectionPicks: Record<string, string>;
  /** 해석 작성을 마친 시각. null이면 아직 작성 중 */
  reflectionAt: string | null;
};

/**
 * 왜 그렇게 답했는지 — 고를 수 있는 까닭.
 *
 * 세 벌로 갈린다. 답을 못 낸 문항에 「어떻게 골랐나」를 물으면 답할 말이 없고,
 * 서술형에 「보기를 지웠나」를 물어도 마찬가지다. 물음이 맞아야 답이 나온다.
 *
 * 말투는 아이가 자기를 탓하지 않도록 고른다. 「몰라서 틀렸다」가 아니라
 * 「무슨 말인지 잘 모르겠어서 못 풀었어요」다. 진단 윤리 헌장이 막는 것은
 * 아이를 규정하는 말인데, 아이가 스스로에게 붙이는 말도 다르지 않다.
 */
export type ReflectionReason = { id: string; text: string };

export const reflectionReasons: Record<"blank" | "choice" | "essay", ReflectionReason[]> = {
  blank: [
    { id: "b1", text: "무슨 말인지 잘 모르겠어서 못 풀었어요" },
    { id: "b2", text: "어디를 봐야 할지 몰라서 못 찾았어요" },
    { id: "b3", text: "알 것 같은데 어떻게 써야 할지 몰랐어요" },
    { id: "b4", text: "처음 보는 내용이라 배운 적이 없어요" },
    { id: "b5", text: "풀다가 헷갈려서 그만뒀어요" },
    { id: "b6", text: "시간이 모자랐어요" },
  ],
  choice: [
    { id: "c1", text: "자료에서 그렇게 쓰인 곳을 찾아서 골랐어요" },
    { id: "c2", text: "배운 것이 생각나서 골랐어요" },
    { id: "c3", text: "나머지가 아닌 것 같아서 남은 것을 골랐어요" },
    { id: "c4", text: "두 개 사이에서 고민하다가 하나를 골랐어요" },
    { id: "c5", text: "잘 모르겠어서 하나를 골랐어요" },
    { id: "c6", text: "다 읽지 못하고 골랐어요" },
  ],
  essay: [
    { id: "e1", text: "자료에서 까닭을 찾아 그대로 썼어요" },
    { id: "e2", text: "배운 것을 떠올려 내 말로 썼어요" },
    { id: "e3", text: "내 생각을 먼저 정하고 까닭을 붙였어요" },
    { id: "e4", text: "무슨 말인지는 알겠는데 쓰기가 어려웠어요" },
    { id: "e5", text: "생각나는 대로 일단 썼어요" },
    { id: "e6", text: "시간이 모자라서 다 쓰지 못했어요" },
  ],
};

/** 고른 까닭을 글로 되돌린다 */
export const reflectionReasonText = (kind: "blank" | "choice" | "essay", id?: string) =>
  (id && reflectionReasons[kind].find((r) => r.id === id)?.text) || "";

export type ExamRecord = {
  subjects: Record<SubjectId, SubjectRecord>;
  surveys: Record<SurveyKey, SurveyState>;
  surveyAt: Partial<Record<SurveyKey, string>>;
  /**
   * 어느 판(version)의 설문에 답한 것인지. 설문 원본은 관리자 화면(ADM-14)에서
   * 고칠 수 있어서, 판 번호가 없으면 이 응답이 무엇을 물은 것에 대한 답인지
   * 나중에 알 길이 없다.
   */
  surveyVersion: Partial<Record<SurveyKey, number>>;
  /** 최종 제출(결과 산출 요청) 여부 */
  finalized: boolean;
  finalizedAt: string | null;
};

const emptySubject: SubjectRecord = {
  answers: {},
  status: "ready",
  startedAt: null,
  submittedAt: null,
  limitMin: null,
  attemptsLeft: 1,
  reflections: {},
  reflectionPicks: {},
  reflectionAt: null,
};

export const initialRecord: ExamRecord = {
  subjects: Object.fromEntries(SUBJECT_IDS.map((id) => [id, emptySubject])) as Record<
    SubjectId,
    SubjectRecord
  >,
  surveys: { mother: "none", father: "none", teacher: "none" },
  surveyAt: {},
  surveyVersion: {},
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
    surveyVersion: { ...raw?.surveyVersion },
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

/** 서버 스냅샷은 매번 같은 참조를 돌려줘야 한다 (새 객체면 무한 루프 경고) */
const EMPTY_STORE: Store = {};

/** 전체 학생의 기록 (학원장 현황 표) */
export function useExamStore(): Store {
  return useSyncExternalStore(subscribe, readStore, () => EMPTY_STORE);
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
    limitMin: rec.limitMin ?? getExamConfig().limits[subject],
    answers: { ...rec.answers, [questionId]: value },
  });
}

/**
 * 응시 시작 — 이때의 제한 시간을 기록에 박아 둔다.
 *
 * 회차 설정을 바로 읽어 쓰면, 관리자가 도중에 시간을 줄이는 순간 이미 풀고 있던
 * 아이의 남은 시간이 함께 깎인다. 시작한 시점의 조건이 그 아이의 조건이다.
 */
export function startSubject(studentId: string, subject: SubjectId) {
  const rec = readRecord(studentId).subjects[subject];
  if (rec.startedAt) return;
  patchSubject(studentId, subject, {
    status: "in-progress",
    startedAt: new Date().toISOString(),
    limitMin: getExamConfig().limits[subject],
  });
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

/** 고른 까닭. 같은 것을 다시 누르면 지워진다 — 잘못 고르고 못 되돌리면 아이는 멈춘다. */
export function setReflectionPick(
  studentId: string,
  subject: SubjectId,
  questionId: string,
  reasonId: string | null,
) {
  const rec = readRecord(studentId).subjects[subject];
  const next = { ...rec.reflectionPicks };
  if (reasonId) next[questionId] = reasonId;
  else delete next[questionId];
  patchSubject(studentId, subject, { reflectionPicks: next });
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
    reflectionPicks: {},
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
    /* 다시 볼 때는 지금 회차 설정을 새로 받는다 */
    limitMin: null,
    reflections: {},
    reflectionPicks: {},
    reflectionAt: null,
  });
}

/** 제출 시각과 함께 「몇 판에 답한 것인지」를 적는다 */
export function setSurvey(
  studentId: string,
  key: SurveyKey,
  state: SurveyState,
  version?: number,
) {
  const current = readRecord(studentId);
  const done = state === "done";
  writeRecord(studentId, {
    ...current,
    surveys: { ...current.surveys, [key]: state },
    surveyAt: { ...current.surveyAt, [key]: done ? new Date().toISOString() : undefined },
    surveyVersion: { ...current.surveyVersion, [key]: done ? version : undefined },
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
