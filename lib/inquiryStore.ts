"use client";

import { useMemo, useSyncExternalStore } from "react";
import { inquiries, type InquiryRow } from "./admin";
import { blankRich, canonRich, richIsEmpty, richOf, type RichText } from "./contentStore";

/**
 * 문의에 답하는 자리 (ADM-10).
 *
 * 목록은 있었지만 답을 쓰는 자리가 없었다 — 표의 「답변」 단추는 붙일 자리만 잡아 둔
 * 껍데기였고, 상태(대기 → 처리중 → 답변 완료)는 코드에 박힌 글자였다. 그래서
 * 「24시간 목표 초과 4건」을 보고도 이 콘솔에서 할 수 있는 일이 없었다.
 *
 * ── 씨앗 위에 덮는다 ──
 * 들어온 문의 자체(누가 · 무엇을 · 언제)는 사람이 보낸 것이라 콘솔이 만들지 않는다.
 * 여기에 담는 것은 **우리가 한 일**뿐이다 — 맡았는가, 무엇이라 답했는가. 회차 편성이
 * 회차 목록 위에 편성을 덮는 것과 같은 꼴이다(lib/roundPlanStore.ts).
 *
 * ── 답은 한 벌, 기록은 여러 줄 ──
 * 답변을 판으로 쌓지 않는다. 묻는 사람이 받는 것은 마지막 답 하나이고, 고쳐 보낸 사실은
 * 기록에 남으면 된다. 판을 쌓으면 「지금 나간 답이 무엇인가」를 세는 코드가 화면마다 생긴다.
 *
 * ⚠ 브라우저 저장소에만 남는다. 붙일 때는 문의 API로 갈아 끼운다 — 그때 답변 발송
 *   (메일·알림)도 이 자리에서 함께 부른다.
 */

/**
 * 기록에 남는 동작.
 *
 * take(맡음)를 내는 자리는 이제 없다 — 「내가 맡기」 단추를 걷었고, 맡은 사람은 답을 보내는
 * 순간 정해진다. 목록에서 이름은 남겨 둔다: 이미 저장된 브라우저에 take 기록이 쌓여 있고,
 * 이름을 지우면 그 줄이 화면에서 빈 꼬리표로 선다.
 */
export type InquiryAction = "take" | "answer" | "reopen";

export const inquiryActions: Record<InquiryAction, string> = {
  take: "맡음",
  answer: "답변",
  reopen: "다시 열기",
};

export type InquiryLog = { at: string; by: string; action: InquiryAction; text: string };

/** 씨앗 위에 덮는 값 — 우리가 한 일만 */
export type InquiryWork = {
  id: string;
  state?: InquiryRow["state"];
  /** 답한 사람 — 답을 보내는 순간 정해진다 */
  owner?: string;
  answer?: RichText;
  answeredAt?: string;
  answeredBy?: string;
  log: InquiryLog[];
};

export type Works = Record<string, InquiryWork>;

/** 답과 기록이 붙은 한 줄 — 화면은 이것만 본다 */
export type Inquiry = InquiryRow & {
  owner: string | null;
  answer: RichText;
  answeredAt: string | null;
  answeredBy: string | null;
  log: InquiryLog[];
};

const KEY = "genixx.inquiries";
const EVENT = "genixx:inquiries-change";

let cacheRaw: string | null = null;
let cacheValue: Works = {};

function read(): Works {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(KEY);
  if (raw === cacheRaw) return cacheValue;
  cacheRaw = raw;
  try {
    cacheValue = raw ? (JSON.parse(raw) as Works) : {};
  } catch {
    cacheValue = {};
  }
  return cacheValue;
}

function write(next: Works) {
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

function useWorks(): Works {
  return useSyncExternalStore(subscribe, read, () => ({}));
}

/** 씨앗 한 줄에 우리가 한 일을 덮는다 */
export function inquiryOf(works: Works, row: InquiryRow): Inquiry {
  const w = works[row.id];
  return {
    ...row,
    state: w?.state ?? row.state,
    owner: w?.owner ?? null,
    answer: richOf(w?.answer),
    answeredAt: w?.answeredAt ?? null,
    answeredBy: w?.answeredBy ?? null,
    log: w?.log ?? [],
  };
}

export function useInquiries(): Inquiry[] {
  const works = useWorks();
  return useMemo(() => inquiries.map((r) => inquiryOf(works, r)), [works]);
}

function now() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function patch(id: string, change: Partial<InquiryWork>, entry: Omit<InquiryLog, "at">) {
  const cur = read();
  const was = cur[id] ?? { id, log: [] };
  write({
    ...cur,
    [id]: { ...was, ...change, log: [...was.log, { ...entry, at: now() }] },
  });
}

/**
 * 답을 보낸다 — 처리중을 답변 완료로.
 *
 * 빈 답은 보내지 않는다. 부르는 쪽에서도 막지만 여기서 한 번 더 본다 — 빈 답으로 상태만
 * 「답변 완료」가 되면 목록이 거짓말을 한다.
 */
export function answerInquiry(id: string, answer: RichText, by: string) {
  if (richIsEmpty(answer)) return;
  const at = now();
  patch(
    id,
    { state: "answered", owner: by, answer: canonRich(answer), answeredAt: at, answeredBy: by },
    { by, action: "answer", text: "답변을 보냈습니다" },
  );
}

/** 다시 연다 — 보낸 답이 틀렸거나 되물음이 왔을 때. 답은 지우지 않고 그대로 둔다 */
export function reopenInquiry(id: string, by: string, why: string) {
  patch(id, { state: "working", owner: by }, { by, action: "reopen", text: why });
}

/** 아직 아무 답도 쓰지 않은 문의의 빈 답 */
export const blankAnswer = blankRich;
