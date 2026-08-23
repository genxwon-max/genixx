"use client";

import { useSyncExternalStore } from "react";
import { rounds, type RoundState } from "./admin";
import { gradeBands, type GradeBand } from "./blueprint";
import { formItems, type ExamForm } from "./formStore";
import type { ItemDraft } from "./itemStore";

/**
 * 회차 편성과 개폐 (ADM-05-4).
 *
 * 「이 회차에 어떤 문항이 나가는가」와 「이 회차를 열어도 되는가」는 한 가지 물음의
 * 앞뒤다. 그런데 앞엣것은 문항 은행(검사지 조립)에, 뒤엣것은 어디에도 없었다.
 * 그래서 관리자는 검사지를 확정해 놓고도 그것이 회차에 걸렸는지 확인할 자리가
 * 없었고, 회차 상태는 코드에 박힌 글자였다.
 *
 * 이 파일이 그 둘을 잇는다 —
 *
 *   편성  한 회차는 **과목 × 학년군** 칸으로 이루어진다(3 × 2 = 여섯 칸). 한 칸이
 *         검사지 한 벌이고, 칸마다 짜거나 비워 둘 수 있다. 비운 칸은 이번 회차에
 *         그 과목·학년군을 보지 않는다는 뜻이다.
 *
 *   개폐  준비중 → 응시 진행중 → 채점중 → 마감. 여는 것은 사람이 누르되, **초안이
 *         하나라도 남아 있으면 막는다.** 확정되지 않은 검사지가 회차에 걸리면 응시
 *         도중에 문항이 갈릴 수 있고, 그러면 같은 회차 점수를 견줄 수 없다.
 *
 * ⚠ 검사지 내용을 여기 복사해 두지 않는다. 무엇이 나가는지는 formStore가 들고 있는
 *   문항 번호에서 매번 다시 센다 — 복사본을 들면 은행에서 고친 문항과 회차에 걸린
 *   문항이 조용히 갈라진다.
 */

export type PlanAction = "open" | "close" | "finish" | "reopen";

export const planActions: Record<PlanAction, string> = {
  open: "회차 열기",
  close: "응시 마감",
  finish: "회차 종료",
  reopen: "응시 다시 열기",
};

export type PlanLog = { at: string; by: string; action: PlanAction; text: string };

export type RoundPlan = {
  round: string;
  state: RoundState;
  openedAt?: string;
  openedBy?: string;
  closedAt?: string;
  closedBy?: string;
  log: PlanLog[];
};

export type Plans = Record<string, RoundPlan>;

/* 씨앗은 lib/admin.ts의 회차 목록이다. 상태를 두 군데 적어 두면 한쪽만 고쳐지는
   날이 반드시 온다 — 여기서는 회차 목록의 상태를 시작값으로만 받아 쓴다. */
const SEED: Plans = Object.fromEntries(
  rounds.map((r): [string, RoundPlan] => [r.id, { round: r.id, state: r.state, log: [] }]),
);

const KEY = "genixx.roundplan";
const EVENT = "genixx:roundplan-change";

let cacheRaw: string | null = null;
let cacheValue: Plans = SEED;

function read(): Plans {
  if (typeof window === "undefined") return SEED;
  const raw = window.localStorage.getItem(KEY);
  if (raw === cacheRaw) return cacheValue;
  cacheRaw = raw;
  try {
    /* 씨앗 위에 덮는다 — 뒤에 회차가 늘어나도 옛 저장분이 그 회차를 빠뜨리지 않는다 */
    cacheValue = raw ? { ...SEED, ...(JSON.parse(raw) as Plans) } : SEED;
  } catch {
    cacheValue = SEED;
  }
  return cacheValue;
}

function write(next: Plans) {
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

export function usePlans(): Plans {
  return useSyncExternalStore(subscribe, read, () => SEED);
}

export function planOf(plans: Plans, roundId: string): RoundPlan {
  return plans[roundId] ?? { round: roundId, state: "draft", log: [] };
}

/* ───────────────────────── 편성판 ───────────────────────── */

export const planSubjects: ItemDraft["subject"][] = ["국어", "수학", "과학"];

export type PlanSlot = {
  /** 과목:학년군 — 화면에서 어느 칸을 열었는지 붙들어 두는 열쇠 */
  key: string;
  subject: ItemDraft["subject"];
  band: GradeBand;
  label: string;
  /**
   * 여럿을 이어 붙일 때 쓰는 짧은 이름 — 「국어 3·4」.
   *
   * 점검 문구는 어긋난 칸을 모두 부른다. 「국어 · 초등 3·4학년군」을 여섯 번 이으면
   * 한 줄이 세 줄이 되고, 그 안에서 어느 칸이 걸렸는지 도로 찾아 읽어야 한다.
   */
  short: string;
  form: ExamForm | null;
  /** 담긴 문항 (출제 순서대로) */
  picked: ItemDraft[];
  /** 아직 안 담긴, 담을 수 있는 승인 문항 수 */
  pool: number;
};

/**
 * 이 회차의 여섯 칸.
 *
 * 검사지가 없는 칸도 빼지 않고 낸다. 「없는 것」이 안 보이면 관리자는 짜야 할 칸이
 * 남았다는 사실을 회차를 열려다가 처음 알게 된다.
 */
export function slotsOf(roundId: string, forms: ExamForm[], items: ItemDraft[]): PlanSlot[] {
  return planSubjects.flatMap((subject) =>
    gradeBands.map((g): PlanSlot => {
      const form =
        forms.find((f) => f.round === roundId && f.subject === subject && f.band === g.id) ?? null;
      return {
        key: `${subject}:${g.id}`,
        subject,
        band: g.id,
        label: `${subject} · ${g.label}`,
        short: `${subject} ${g.id.replace("-", "·")}`,
        form,
        picked: form ? formItems(form, items) : [],
        pool: items.filter(
          (i) =>
            i.state === "approved" &&
            i.subject === subject &&
            i.band === g.id &&
            !form?.itemIds.includes(i.id),
        ).length,
      };
    }),
  );
}

/* ───────────────────────── 여는 관문 ───────────────────────── */

export type PlanCheck = { tone: "block" | "warn"; text: string };

/**
 * 회차를 열기 전에 대조한다.
 *
 * block은 막는 것이고 warn은 사람이 보고 그대로 갈 수 있는 것이다. 파일럿 회차는
 * 과목 하나만 보는 일이 실제로 있으므로, 「빈 칸이 있다」로 회차를 못 열게 하면
 * 화면이 현실을 막는 셈이 된다.
 */
export function openChecks(roundId: string, slots: PlanSlot[], plans: Plans): PlanCheck[] {
  const out: PlanCheck[] = [];

  const built = slots.filter((s) => s.form);
  if (built.length === 0) {
    out.push({
      tone: "block",
      text: "편성한 검사지가 하나도 없습니다. 적어도 한 칸은 짜야 회차를 열 수 있습니다.",
    });
  }

  const unconfirmed = slots.filter((s) => s.form && s.form.state !== "confirmed");
  if (unconfirmed.length > 0) {
    out.push({
      tone: "block",
      text: `아직 확정하지 않은 검사지가 ${unconfirmed.length}벌 있습니다 — ${unconfirmed
        .map((s) => s.short)
        .join(" · ")}`,
    });
  }

  /* 두 회차가 함께 열려 있으면 응시자가 어느 회차를 푸는지 정해지지 않는다 */
  const other = rounds.find((r) => r.id !== roundId && planOf(plans, r.id).state === "open");
  if (other) {
    out.push({
      tone: "block",
      text: `${other.label}가 아직 열려 있습니다. 먼저 그 회차의 응시를 마감해 주세요.`,
    });
  }

  /* 하나도 짜지 않은 회차에는 적지 않는다 — 위의 막는 줄과 같은 말이 된다 */
  const empty = slots.filter((s) => !s.form);
  if (empty.length > 0 && built.length > 0) {
    out.push({
      tone: "warn",
      text: `비워 둔 칸 ${empty.length}개(${empty
        .map((s) => s.short)
        .join(" · ")})는 이 회차에 응시하지 않습니다.`,
    });
  }

  return out;
}

/* ───────────────────────── 상태를 옮긴다 ───────────────────────── */

function now() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function patch(id: string, change: Partial<RoundPlan>, entry: Omit<PlanLog, "at">) {
  const cur = read();
  const before = planOf(cur, id);
  write({
    ...cur,
    [id]: { ...before, ...change, log: [{ ...entry, at: now() }, ...before.log].slice(0, 40) },
  });
}

export function openRound(id: string, by: string, text: string) {
  patch(id, { state: "open", openedAt: now(), openedBy: by }, { by, action: "open", text });
}

export function closeRound(id: string, by: string, text: string) {
  patch(id, { state: "grading", closedAt: now(), closedBy: by }, { by, action: "close", text });
}

export function finishRound(id: string, by: string, text: string) {
  patch(id, { state: "closed" }, { by, action: "finish", text });
}

/** 마감을 되돌린다 — 마감 시각을 지우되 되돌린 사실은 기록에 남는다 */
export function reopenRound(id: string, by: string, text: string) {
  patch(
    id,
    { state: "open", closedAt: undefined, closedBy: undefined },
    { by, action: "reopen", text },
  );
}
