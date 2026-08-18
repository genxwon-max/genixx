"use client";

import { useSyncExternalStore } from "react";
import { ANCHOR_RATIO, LEVELS, levelSpecs, talentOf, type GradeBand, type Level } from "./blueprint";
import { rounds } from "./admin";
import type { ItemDraft } from "./itemStore";

/**
 * 검사지 조립 (ADM-04-3).
 *
 * 승인된 문항을 골라 한 회차의 검사지를 만든다. 이 화면의 전제는 문항 은행과 같다 —
 * **AI가 조합을 제안하고 사람이 확정한다.** 제안은 상태를 바꾸지 않고 초안에만
 * 들어가며, 확정 버튼을 누르는 것은 언제나 사람이다.
 *
 * 확정된 검사지는 잠근다. 응시가 시작된 뒤에 문항이 갈리면 같은 회차 안에서 서로
 * 다른 검사지를 푼 아이들이 생기고, 그 회차 점수는 견줄 수 없게 된다. 고쳐야 하면
 * 잠금을 풀되 그 사실이 기록에 남는다.
 *
 * 저장하는 것은 문항 번호 목록뿐이다. 문항 내용을 복사해 두지 않는다 — 복사본을
 * 들면 은행에서 고친 문항과 검사지 안의 문항이 갈라진다.
 */

export type FormState = "draft" | "confirmed";

export type FormLogEntry = {
  at: string;
  by: string;
  action: "create" | "suggest" | "edit" | "confirm" | "reopen";
  text: string;
};

export type ExamForm = {
  id: string;
  /** 어느 회차의 검사지인가 */
  round: string;
  subject: ItemDraft["subject"];
  band: GradeBand;
  title: string;
  /** 담긴 문항 번호. 순서가 곧 출제 순서다. */
  itemIds: string[];
  state: FormState;
  createdAt: string;
  createdBy: string;
  confirmedAt?: string;
  confirmedBy?: string;
  log: FormLogEntry[];
};

/* ── 한 검사지의 형태 ──
   과목당 10문항 · 40분(lib/exam.ts). 단계 배분은 발주서 §7의 S1~S4 비율을 따른다.
   합계 배점은 3×1 + 3×1 + 2×2 + 2×3 = 16점. */
export const FORM_SIZE = 10;

export const LEVEL_MIX: Record<Level, number> = { S1: 3, S2: 3, S3: 2, S4: 2 };

const KEY = "genixx.forms";
const EVENT = "genixx:forms-change";

/**
 * 지난 회차에서 실제로 나간 검사지 한 벌.
 *
 * 씨앗을 하나 둔다. 앵커 화면의 「나간 회차」가 이 검사지에서 나오기 때문이다 —
 * 확정된 검사지가 하나도 없으면 앵커가 어디에 쓰였는지 볼 수 없고, 그러면 앵커라는
 * 개념 자체가 화면에서 설명되지 않는다.
 */
const SEED: ExamForm[] = [
  {
    id: "FM-26B-KOR34",
    round: "2026-2",
    subject: "국어",
    band: "3-4",
    title: "2026 파일럿 2회차 · 국어 · 초등 3~4학년군",
    itemIds: [
      "IT-2606",
      "IT-2612",
      "IT-2604",
      "IT-2607",
      "IT-2613",
      "IT-2614",
      "IT-2608",
      "IT-2615",
      "IT-2609",
      "IT-2616",
    ],
    state: "confirmed",
    createdAt: "2026-04-24 10:15",
    createdBy: "한나래",
    confirmedAt: "2026-04-26 15:40",
    confirmedBy: "이검수",
    log: [
      { at: "2026-04-24 10:15", by: "한나래", action: "create", text: "검사지를 새로 만들었습니다" },
      { at: "2026-04-24 10:22", by: "한나래", action: "suggest", text: "조합 제안 10문항" },
      {
        at: "2026-04-25 09:40",
        by: "한나래",
        action: "edit",
        text: "4K03-S2-001을 3번에서 5번으로 옮김 — 지문이 있는 문항을 앞에 두지 않기로 함",
      },
      {
        at: "2026-04-26 15:40",
        by: "이검수",
        action: "confirm",
        text: "단계 배분과 앵커 비율을 확인했습니다. 한 단원 쏠림은 2회차 범위가 이 단원이라 그대로 갑니다.",
      },
    ],
  },
];

let cacheRaw: string | null = null;
let cacheValue: ExamForm[] = SEED;

function read(): ExamForm[] {
  if (typeof window === "undefined") return SEED;
  const raw = window.localStorage.getItem(KEY);
  if (raw === cacheRaw) return cacheValue;
  cacheRaw = raw;
  try {
    cacheValue = raw ? (JSON.parse(raw) as ExamForm[]) : SEED;
  } catch {
    cacheValue = SEED;
  }
  return cacheValue;
}

function write(next: ExamForm[]) {
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

export function useForms(): ExamForm[] {
  return useSyncExternalStore(subscribe, read, () => SEED);
}

function now() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function patch(id: string, change: Partial<ExamForm>, entry?: Omit<FormLogEntry, "at">) {
  write(
    read().map((f) =>
      f.id === id
        ? { ...f, ...change, log: entry ? [...f.log, { ...entry, at: now() }] : f.log }
        : f,
    ),
  );
}

export function createForm(
  round: string,
  subject: ItemDraft["subject"],
  band: GradeBand,
  by: string,
): ExamForm {
  const list = read();
  const label = rounds.find((r) => r.id === round)?.label ?? round;
  const form: ExamForm = {
    id: `FM-${Date.now().toString(36).toUpperCase()}`,
    round,
    subject,
    band,
    title: `${label} · ${subject} · ${band === "3-4" ? "초등 3~4학년군" : "초등 5~6학년군"}`,
    itemIds: [],
    state: "draft",
    createdAt: now(),
    createdBy: by,
    log: [{ at: now(), by, action: "create", text: "검사지를 새로 만들었습니다" }],
  };
  write([form, ...list]);
  return form;
}

/** 확정된 검사지는 고칠 수 없다 — 부르는 쪽에서 막지만 여기서도 한 번 더 본다 */
function editable(form: ExamForm | undefined): form is ExamForm {
  return !!form && form.state === "draft";
}

export function addFormItem(id: string, itemId: string, by: string, code: string) {
  const form = read().find((f) => f.id === id);
  if (!editable(form) || form.itemIds.includes(itemId)) return;
  patch(id, { itemIds: [...form.itemIds, itemId] }, { by, action: "edit", text: `${code} 넣음` });
}

export function removeFormItem(id: string, itemId: string, by: string, code: string) {
  const form = read().find((f) => f.id === id);
  if (!editable(form)) return;
  patch(
    id,
    { itemIds: form.itemIds.filter((x) => x !== itemId) },
    { by, action: "edit", text: `${code} 뺌` },
  );
}

export function moveFormItem(id: string, itemId: string, dir: 1 | -1) {
  const form = read().find((f) => f.id === id);
  if (!editable(form)) return;
  const ids = [...form.itemIds];
  const at = ids.indexOf(itemId);
  const to = at + dir;
  if (at < 0 || to < 0 || to >= ids.length) return;
  [ids[at], ids[to]] = [ids[to], ids[at]];
  patch(id, { itemIds: ids });
}

export function setFormItems(id: string, itemIds: string[], by: string, text: string) {
  const form = read().find((f) => f.id === id);
  if (!editable(form)) return;
  patch(id, { itemIds }, { by, action: "suggest", text });
}

export function confirmForm(id: string, by: string, note: string) {
  const form = read().find((f) => f.id === id);
  if (!editable(form)) return;
  patch(
    id,
    { state: "confirmed", confirmedAt: now(), confirmedBy: by },
    { by, action: "confirm", text: note },
  );
}

/** 잠금을 푼다 — 왜 풀었는지가 남아야 한다 */
export function reopenForm(id: string, by: string, reason: string) {
  const form = read().find((f) => f.id === id);
  if (!form || form.state !== "confirmed") return;
  patch(
    id,
    { state: "draft", confirmedAt: undefined, confirmedBy: undefined },
    { by, action: "reopen", text: reason },
  );
}

export function deleteForm(id: string) {
  const form = read().find((f) => f.id === id);
  if (!editable(form)) return;
  write(read().filter((f) => f.id !== id));
}

/* ───────────────────────── 대조 ───────────────────────── */

export type FormFinding = { tone: "block" | "warn"; text: string };

/** 검사지에 담긴 문항을 순서대로 */
export const formItems = (form: ExamForm, items: ItemDraft[]) =>
  form.itemIds.map((id) => items.find((i) => i.id === id)).filter((i): i is ItemDraft => !!i);

export const levelCount = (picked: ItemDraft[]) =>
  Object.fromEntries(LEVELS.map((l) => [l, picked.filter((i) => i.level === l).length])) as Record<
    Level,
    number
  >;

export const formPoints = (picked: ItemDraft[]) => picked.reduce((n, i) => n + i.points, 0);

/**
 * 확정 전에 대조한다.
 *
 * block은 규칙을 어긴 것이라 확정을 막는다. warn은 사람이 보고 그래도 된다고
 * 할 수 있는 것이다 — 파일럿 회차처럼 은행이 얇을 때 앵커 30%를 못 맞추는 일은
 * 실제로 있고, 그걸 기계가 막아 버리면 회차 자체가 열리지 않는다.
 */
export function checkForm(form: ExamForm, picked: ItemDraft[]): FormFinding[] {
  const out: FormFinding[] = [];

  if (picked.length === 0) {
    out.push({ tone: "block", text: "문항이 하나도 담기지 않았습니다." });
    return out;
  }

  if (picked.length !== FORM_SIZE) {
    out.push({
      tone: "block",
      text: `${FORM_SIZE}문항이어야 하는데 ${picked.length}문항입니다.`,
    });
  }

  const notApproved = picked.filter((i) => i.state !== "approved");
  if (notApproved.length > 0) {
    out.push({
      tone: "block",
      text: `승인되지 않은 문항이 ${notApproved.length}건 있습니다 — ${notApproved.map((i) => i.code || i.id).join(", ")}`,
    });
  }

  const wrongSubject = picked.filter((i) => i.subject !== form.subject);
  if (wrongSubject.length > 0) {
    out.push({ tone: "block", text: `다른 과목의 문항이 ${wrongSubject.length}건 섞였습니다.` });
  }

  const wrongBand = picked.filter((i) => i.band !== form.band);
  if (wrongBand.length > 0) {
    out.push({
      tone: "block",
      text: `다른 학년군의 문항이 ${wrongBand.length}건 섞였습니다. 학년군이 다르면 성취기준이 달라 같은 잣대로 볼 수 없습니다.`,
    });
  }

  const codes = picked.map((i) => i.code || i.id);
  if (codes.length !== new Set(codes).size) {
    out.push({ tone: "block", text: "같은 문항이 두 번 담겼습니다." });
  }

  /* ── 여기부터는 사람이 판단할 것 ── */

  const byLevel = levelCount(picked);
  const off = LEVELS.filter((l) => byLevel[l] !== LEVEL_MIX[l]);
  if (off.length > 0) {
    out.push({
      tone: "warn",
      text: `단계 배분이 발주 사양과 다릅니다 — ${off
        .map((l) => `${l} ${byLevel[l]}/${LEVEL_MIX[l]}`)
        .join(" · ")}`,
    });
  }

  const anchors = picked.filter((i) => i.anchor).length;
  const ratio = anchors / picked.length;
  if (ratio < ANCHOR_RATIO) {
    out.push({
      tone: "warn",
      text: `앵커가 ${anchors}건(${Math.round(ratio * 100)}%)입니다. ${Math.round(ANCHOR_RATIO * 100)}%를 채워야 회차 간 등화의 기준이 섭니다.`,
    });
  }

  const disclosed = picked.filter((i) => i.disclosed);
  if (disclosed.length > 0) {
    out.push({
      tone: "warn",
      text: `밖에 공개된 적이 있는 문항이 ${disclosed.length}건 있습니다 — ${disclosed.map((i) => i.code || i.id).join(", ")}`,
    });
  }

  const talentCounts = new Map<string, number>();
  for (const i of picked) talentCounts.set(i.talent, (talentCounts.get(i.talent) ?? 0) + 1);
  for (const [t, n] of talentCounts) {
    if (n / picked.length > 0.6) {
      out.push({
        tone: "warn",
        text: `${talentOf(t as ItemDraft["talent"]).name} 축이 ${n}건으로 치우쳤습니다. 한 축이 6할을 넘으면 다른 축은 재지 못합니다.`,
      });
    }
  }

  const unit = new Map<string, number>();
  for (const i of picked) if (i.unit) unit.set(i.unit, (unit.get(i.unit) ?? 0) + 1);
  for (const [u, n] of unit) {
    if (n > FORM_SIZE / 2) {
      out.push({ tone: "warn", text: `「${u}」 단원이 ${n}건입니다. 한 단원에 몰려 있습니다.` });
    }
  }

  return out;
}

/**
 * 조합 제안.
 *
 * ⚠ 이건 **제안일 뿐이다.** 초안에만 넣고 확정하지 않는다. 고르는 규칙은 발주서에
 *   적힌 것뿐이라 기계가 확실히 볼 수 있다 — 단계별 개수, 앵커 비율, 단원 쏠림.
 *   「이 문항이 이 학년에 맞는가」는 여기서 알 수 없고 사람이 봐야 한다.
 *
 * 같은 단계 안에서는 앵커를 먼저, 그다음 정답률이 한가운데(50%)에 가까운 것을
 * 먼저 고른다. 너무 쉽거나 너무 어려운 문항은 변별에 보태는 것이 적다.
 */
export function suggestItems(form: ExamForm, items: ItemDraft[]) {
  const pool = items.filter(
    (i) => i.state === "approved" && i.subject === form.subject && i.band === form.band,
  );

  const picked: ItemDraft[] = [];
  const short: string[] = [];

  for (const level of LEVELS) {
    const want = LEVEL_MIX[level];
    const rank = pool
      .filter((i) => i.level === level)
      .sort((x, y) => {
        /* 밖으로 나간 적이 있는 문항은 대신할 것이 있으면 쓰지 않는다 */
        if (!!x.disclosed !== !!y.disclosed) return x.disclosed ? 1 : -1;
        if (x.anchor !== y.anchor) return x.anchor ? -1 : 1;
        const mid = (i: ItemDraft) => Math.abs((i.correctRate ?? 60) - 50);
        return mid(x) - mid(y);
      });
    picked.push(...rank.slice(0, want));
    if (rank.length < want) short.push(`${level} ${rank.length}/${want}`);
  }

  return { itemIds: picked.map((i) => i.id), picked, short };
}

/** 한 문항이 어느 확정 검사지에 실렸는가 — 앵커 화면이 노출 이력으로 쓴다 */
export function roundsOf(itemId: string, forms: ExamForm[]) {
  return forms
    .filter((f) => f.state === "confirmed" && f.itemIds.includes(itemId))
    .map((f) => rounds.find((r) => r.id === f.round)?.label ?? f.round);
}

export const levelLabel = (l: Level) => `${l} ${levelSpecs[l].name}`;
