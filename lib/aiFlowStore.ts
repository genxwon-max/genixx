"use client";

import { useMemo, useSyncExternalStore } from "react";
import { recordAction } from "./adminStore";
import { modelOf } from "./aiModels";
import {
  aiJobs,
  promptSubjects,
  withSubject,
  type AiJob,
  type PromptSubject,
  type SubjectExtra,
} from "./aiPrompts";

/**
 * 업무마다 짜 놓은 AI 흐름 (ADM-13-1).
 *
 * 씨앗(lib/aiPrompts.ts)에는 업무마다 AI 하나가 들어 있고, 그 뒤는 운영자가 화면에서 만든다.
 * 앞 AI가 낸 것이 다음 AI에 그대로 들어가므로 **차례가 곧 뜻**이다 — 배열의 순서를 그대로 쓴다.
 *
 * ── 통째로 저장하는 까닭 ──
 * 다른 저장소는 씨앗 위에 고친 것만 덮는다(lib/reportAssetStore.ts). 여기는 아니다. 단계를
 * 더하고 지우고 자리를 바꾸는 것이 이 화면이 하는 일이라, 「고친 칸만」으로는 지운 단계를
 * 나타낼 수가 없다. 저장분이 있으면 그것이 전부이고, 없으면 씨앗 한 벌로 시작한다.
 *
 * ── 파일 ──
 * 글로 읽히는 파일은 내용까지 든다. 프롬프트에 붙여 보내야 뜻이 있는 첨부라서다. 그림·PDF는
 * 이름과 크기만 든다 — 브라우저 저장소는 5MB 남짓이고, 여기서 다른 저장소를 밀어내면 회차와
 * 문항이 함께 사라진다.
 *
 * ── 과목 요구사항 ──
 * 단계마다 든다(FlowStep.extra). 흐름 밖에 따로 두면 단계를 지우거나 자리를 바꿀 때 그
 * 단계의 요구사항이 주인을 잃는다 — 단계에 붙여 두면 함께 지워지고 함께 옮겨진다.
 *
 * ⚠ 브라우저 저장소에만 남는다. 붙일 때는 프롬프트 API로 갈아 끼우고 파일은 파일 저장소로 간다.
 */

/* ───────────────────────── 값 ───────────────────────── */

export type AiFile = {
  id: string;
  name: string;
  /** 바이트 */
  size: number;
  /** 글로 읽어 프롬프트에 붙일 수 있는가 */
  text: boolean;
  /** 글 내용. text가 아니면 없다 */
  body?: string;
};

export type FlowStep = {
  id: string;
  name: string;
  prompt: string;
  /** lib/aiModels.ts의 id */
  model: string;
  files: AiFile[];
  /** 과목 탭에 적은 요구사항 — lib/aiPrompts.ts의 withSubject()가 이 단계 프롬프트에 붙인다 */
  extra?: SubjectExtra;
};

export type Flow = { steps: FlowStep[] };

/** 한 파일에서 글로 들고 있을 최대 길이 */
export const MAX_FILE_CHARS = 100_000;
/** 한 업무가 들고 있을 수 있는 저장분 크기 — 넘으면 저장을 막는다 */
export const MAX_FLOW_BYTES = 1_500_000;

const EMPTY: Record<string, Flow> = {};

const KEY = "genixx.ai-flow";
const EVENT = "genixx:ai-flow-change";

let cacheRaw: string | null = null;
let cacheValue: Record<string, Flow> = EMPTY;

function read(): Record<string, Flow> {
  if (typeof window === "undefined") return EMPTY;
  const raw = window.localStorage.getItem(KEY);
  if (raw === cacheRaw) return cacheValue;
  cacheRaw = raw;
  try {
    cacheValue = raw ? (JSON.parse(raw) as Record<string, Flow>) : EMPTY;
  } catch {
    cacheValue = EMPTY;
  }
  return cacheValue;
}

function write(next: Record<string, Flow>) {
  window.localStorage.setItem(KEY, JSON.stringify(next));
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

function useAll(): Record<string, Flow> {
  /* ⚠ 서버 스냅숏으로 모듈 상수를 돌려준다. 새 객체를 만들면 렌더마다 참조가 달라
     React가 무한 루프로 본다 */
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

/* 열쇠는 이 브라우저 안에서만 유일하면 된다 — 붙일 때 서버가 제 번호를 준다 */
let seq = 0;
export const uid = (head: string) => `${head}-${Date.now().toString(36)}-${(seq += 1)}`;

/* ───────────────────────── 읽는 길 ───────────────────────── */

/** 씨앗 한 벌 — 저장분이 없을 때 화면이 여는 값 */
export function seedFlow(job: AiJob): Flow {
  return {
    steps: [
      {
        id: `${job.id}-1`,
        name: job.seed.name,
        prompt: job.seed.prompt,
        model: job.seed.model,
        files: [],
        ...(job.seed.extra ? { extra: { ...job.seed.extra } } : {}),
      },
    ],
  };
}

/** 요구사항이 적힌 과목들 — 과목 차례 그대로. 빈칸만 있는 과목은 세지 않는다 */
export function subjectsIn(steps: FlowStep[]): PromptSubject[] {
  return promptSubjects.filter((sub) => steps.some((s) => s.extra?.[sub]?.trim()));
}

/**
 * 한 단계의 한 과목 요구사항을 바꾼다.
 *
 * 다 지우면 열쇠째 걷는다. 빈 글을 남기면 저장분(열쇠 없음)과 초안(빈 글)이 달라, 쳤다가
 * 지웠을 뿐인데 「저장하지 않은 변경」이 켜진다.
 *
 * 열쇠는 과목 차례로 새로 쌓는다. 지웠다 되살린 과목이 맨 뒤로 가면 값은 같아도 JSON이
 * 달라지고, 초안을 JSON으로 견주는 EditGuard가 「저장하지 않은 변경」을 끄지 못한다.
 */
export function withExtra(step: FlowStep, subject: PromptSubject, text: string): FlowStep {
  const merged: SubjectExtra = { ...step.extra, [subject]: text };
  const extra: SubjectExtra = {};
  for (const s of promptSubjects) if (merged[s]) extra[s] = merged[s];
  const next: FlowStep = { ...step, extra };
  if (Object.keys(extra).length === 0) delete next.extra;
  return next;
}

export function useFlow(job: AiJob): Flow {
  const all = useAll();
  return useMemo(() => all[job.id] ?? seedFlow(job), [all, job]);
}

export type FlowStat = {
  steps: number;
  files: number;
  edited: boolean;
  /** 요구사항이 적힌 과목들 */
  subjects: PromptSubject[];
};

/** 목록이 쓰는 요약 */
export function useFlowStat(job: AiJob): FlowStat {
  const all = useAll();
  return useMemo(() => {
    const flow = all[job.id];
    const steps = flow ? flow.steps : seedFlow(job).steps;
    return {
      steps: steps.length,
      files: steps.reduce((n, s) => n + s.files.length, 0),
      edited: !!flow,
      subjects: subjectsIn(steps),
    };
  }, [all, job]);
}

/** 이 업무가 실제로 부르는 모델들 — 차례 그대로, 겹치는 것은 한 번만 */
export function useFlowModels(job: AiJob): string[] {
  const flow = useFlow(job);
  return useMemo(() => {
    const out: string[] = [];
    for (const s of flow.steps) if (s.model && !out.includes(s.model)) out.push(s.model);
    return out;
  }, [flow]);
}

/* ───────────────────────── 거르는 길 ───────────────────────── */

export type FlowFinding = { stepId: string | null; text: string };

/**
 * 저장 전에 거른다.
 *
 * 막는 것은 다섯이다 — AI가 하나도 없는 흐름, 이름이 빈 단계, 프롬프트가 빈 단계, 목록에 없는
 * 모델, 그리고 **필수 자리표가 빠진 1번 AI**.
 *
 * ── 필수 자리표를 1번 AI에서만 보는 까닭 ──
 * 이 업무의 자료가 흐름에 들어오는 자리가 거기 하나다. 2번부터는 앞 AI가 낸 것을 받으므로
 * 같은 값을 다시 받을 까닭이 없고, 모든 단계에 요구하면 되짚기 단계마다 쓰지도 않을 자리표를
 * 적어 넣게 된다.
 *
 * 빠지면 막는 까닭 — {{학생답안}} 없이 나간 채점 프롬프트는 답안을 못 본 채로 점수를 매기고,
 * 그 사실은 산출물에서야 드러난다.
 */
export function checkFlow(job: AiJob, steps: FlowStep[]): FlowFinding[] {
  const out: FlowFinding[] = [];
  if (steps.length === 0) out.push({ stepId: null, text: "AI가 하나도 없습니다." });
  steps.forEach((s, i) => {
    if (!s.name.trim()) out.push({ stepId: s.id, text: `${i + 1}번 AI의 이름이 비었습니다.` });
    /* 과목 요구사항 자리표를 걷고 본다. 자리표 하나만 든 단계는 요구사항을 적지 않은
       과목에서 빈 프롬프트로 나간다 */
    if (!withSubject(s.prompt, null).trim()) {
      out.push({ stepId: s.id, text: `${i + 1}번 AI의 프롬프트가 비었습니다.` });
    }
    if (!modelOf(s.model)) out.push({ stepId: s.id, text: `${i + 1}번 AI의 모델을 고르지 않았습니다.` });
  });
  const first = steps[0];
  if (first) {
    const missing = job.vars.filter((v) => v.must && !first.prompt.includes(v.key));
    if (missing.length > 0) {
      out.push({
        stepId: first.id,
        text: `1번 AI에 ${missing.map((v) => v.key).join(" ")} 이(가) 빠졌습니다.`,
      });
    }
  }
  const size = JSON.stringify({ steps }).length;
  if (size > MAX_FLOW_BYTES) {
    out.push({
      stepId: null,
      text: "붙인 파일이 너무 큽니다. 큰 파일을 덜어 내고 저장해 주세요.",
    });
  }
  return out;
}

/* ───────────────────────── 고치는 길 ───────────────────────── */

export function saveFlow(job: AiJob, steps: FlowStep[], by: string): boolean {
  if (checkFlow(job, steps).length > 0) return false;
  const all = read();
  write({ ...all, [job.id]: { steps } });
  const subs = subjectsIn(steps);
  recordAction(
    job.label,
    "AI 흐름 수정",
    `AI ${steps.length}개 · 파일 ${steps.reduce((n, s) => n + s.files.length, 0)}개` +
      (subs.length > 0 ? ` · 과목 요구사항 ${subs.join("·")}` : ""),
    by,
  );
  return true;
}

/** 씨앗 한 벌로 되돌린다 */
export function resetFlow(job: AiJob, by: string) {
  const all = read();
  if (!all[job.id]) return;
  const next = { ...all };
  delete next[job.id];
  write(next);
  recordAction(job.label, "AI 흐름 되돌림", "기본값으로", by);
}

/** 새 AI 한 칸 — 이름은 몇 번째인지로 지어 두고 운영자가 고친다 */
export const blankStep = (at: number): FlowStep => ({
  id: uid("ai"),
  name: `${at}번 AI`,
  prompt: "",
  model: "claude-sonnet-5",
  files: [],
});

/* 목록 화면이 씨앗만으로 세는 자리 — 훅을 쓸 수 없는 서버 렌더에서 쓴다 */
export const seedTotals = () => ({
  jobs: aiJobs.length,
  steps: aiJobs.length,
});
