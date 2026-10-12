"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { AxisId } from "./result";
import { axes } from "./result";
import { labelCheck } from "./labelCheck";
import {
  assemble,
  ruleSetError,
  sameCond,
  type Assembly,
  type Facts,
  type Kit,
  type RuleSet,
} from "./reportAssembly";
import {
  parseKey,
  defaultCrossCuts,
  defaultCuts,
  seedCross,
  keyOf,
  seedRules,
  seedTemplates,
  gradesOfBand,
  setCustomSlots,
  slots as seedSlots,
  templateGrades,
  slotOf,
  slotOrder,
  type Band,
  type BandCuts,
  type CrossCellRule,
  type CrossCuts,
  type CustomSlot,
  type Rule,
  type SlotId,
  type Template,
  type TemplateGrade,
} from "./reportAssets";

/**
 * 리포트 자산을 고치는 자리 (ADM-08).
 *
 * 씨앗(lib/reportAssets.ts) 위에 **운영자가 고친 것만** 덮는다. 문의 답변(lib/inquiryStore.ts)이
 * 문의 목록 위에 덮는 것과 같은 꼴이다 — 원본을 통째로 복사해 들면 씨앗을 고칠 때 이미
 * 저장한 브라우저가 그것을 영영 못 받는다.
 *
 * ── 덮는 단위 ──
 * 템플릿은 **칸 하나**, 규칙은 **규칙 하나**가 열쇠다. 배열째 저장하지 않는다. 씨앗에
 * 템플릿을 하나 더하면 그 줄만 새로 서고, 운영자가 고쳐 둔 칸은 그대로 남는다
 * (lib/expertStore.ts가 배열을 통째로 덮어 같은 함정에 걸려 있는 것과 반대로 짰다).
 *
 * ── 고친 것은 발행 전 리포트까지 ──
 * 이 저장소는 **리포트를 건드리지 않는다.** 규칙과 문구를 들고 있을 뿐이다. 여기서 고친 것은
 * 그 뒤에 조립되는 리포트와, **아직 발행하지 않은 리포트**에 걸린다 — 리포트를 읽는 화면이 열릴
 * 때 발행 전 리포트를 지금 규칙으로 다시 조립한다(lib/reportStore.ts의 syncWaitingReports).
 * 발행한 리포트는 그대로다. 보호자가 이미 읽은 글이 뒤에서 소리 없이 바뀌면 안 된다.
 *
 * ⚠ 브라우저 저장소에만 남는다. 붙일 때는 리포트 자산 API로 갈아 끼운다 — 그때 「버전과
 *   사용 이력 보존」(사이트맵 ADM-08-1)이 서버 쪽 일이 된다. 지금은 마지막 한 벌만 든다.
 */

/* ───────────────────────── 덮어 드는 값 ───────────────────────── */

/** 고쳐 온 자취 한 줄 */
export type TemplateRev = { title: string; text: string; at: string; by: string };

/**
 * 운영자가 고친 템플릿 한 칸.
 *
 * 지금 값과 **고쳐 온 자취**를 함께 든다. 사이트맵 ADM-08-1이 「버전과 사용 이력 보존」을
 * 못 박아 둔 까닭은, 문구를 고친 뒤에 리포트가 이상해졌을 때 「무엇을 어떻게 바꿨더라」를
 * 되짚을 자리가 있어야 해서다. 마지막 한 벌만 들면 그 되짚기가 불가능하다.
 *
 * ⚠ 열 벌에서 자른다. 문구 한 칸을 백 번 고칠 일이 없고, localStorage는 5MB 남짓이라
 *   칸 스물한 개 × 학년대 넷에 자취가 무한정 쌓이면 다른 저장소를 밀어낸다.
 *
 * ⚠ 자취는 이 브라우저에만 남는다. 다른 브라우저에서 고친 것은 여기 안 뜬다 — 온전한
 *   이력 보존은 API로 옮길 때 서버 쪽 일이 된다.
 */
export type TemplateEdit = {
  title: string;
  text: string;
  at: string;
  by: string;
  /** 새것이 앞. 지금 값은 여기 넣지 않는다 — 위 세 칸이 그것이다 */
  history?: TemplateRev[];
};

/** 운영자가 고친 규칙 한 줄 — 고친 칸만 든다 */
export type RuleEdit = Partial<Pick<Rule, "desc" | "order" | "on" | "cond">> & {
  at: string;
  by: string;
};

/** 밴드 컷을 옮긴 자취 — 같은 점수의 아이가 다른 문구를 받게 되는 값이라 남긴다 */
export type CutRev = { L3: number; L2: number; at: string; by: string };

/** 운영자가 고친 교차 셀 한 칸 */
export type CrossEdit = Partial<Pick<CrossCellRule, "title" | "text" | "next" | "on">> & {
  at: string;
  by: string;
};

export type Assets = {
  templates: Record<string, TemplateEdit>;
  rules: Record<string, RuleEdit>;
  cuts?: BandCuts;
  cutLog?: CutRev[];
  cross?: Record<string, CrossEdit>;
  crossCuts?: CrossCuts;
  /** 운영자가 해석 템플릿 화면에서 더한 자리 — 리포트 맨 끝 쪽에 새 절로 붙는다 */
  slots?: CustomSlot[];
  /** 조립 규칙 화면에서 마지막으로 저장한 때와 사람 */
  savedAt?: string;
  savedBy?: string;
};

const EMPTY: Assets = { templates: {}, rules: {} };

const KEY = "genixx.report-assets";
const EVENT = "genixx:report-assets-change";

let cacheRaw: string | null = null;
let cacheValue: Assets = EMPTY;

function read(): Assets {
  if (typeof window === "undefined") return EMPTY;
  const raw = window.localStorage.getItem(KEY);
  if (raw === cacheRaw) return cacheValue;
  cacheRaw = raw;
  try {
    cacheValue = raw ? { ...EMPTY, ...(JSON.parse(raw) as Assets) } : EMPTY;
  } catch {
    cacheValue = EMPTY;
  }
  cacheValue = migrateGrades(cacheValue);
  /* 더한 자리를 slotOf · parseKey가 보는 목록에 올린다(lib/reportAssets.ts setCustomSlots) */
  setCustomSlots(cacheValue.slots ?? []);
  return cacheValue;
}

/**
 * 학년대로 고쳐 둔 문구(「top-e34-language-L3」)를 학년마다의 칸(e3 · e4)으로 옮긴다.
 *
 * 템플릿 학년을 학년대 넷에서 학년 하나씩으로 바꿨다(2026-09-22). 옛 열쇠를 그대로 두면 고쳐 둔
 * 문구가 격자에서 떨어져 나가 씨앗 문구로 되돌아간 것처럼 보인다. 새 열쇠에 이미 고친 것이 있으면
 * 그것을 남긴다. 옮긴 값은 다음 저장 때 함께 적힌다.
 *
 * 중학교 학년대(m23)의 문구는 갈 곳이 없어 버린다 — 진단평가 대상이 초3~6이라 그 학년의
 * 리포트가 나가지 않는다.
 */
function migrateGrades(a: Assets): Assets {
  const old = Object.keys(a.templates).filter((k) => /-(e34|e56|m23)-/.test(k));
  if (old.length === 0) return a;
  const templates = { ...a.templates };
  for (const k of old) {
    const [slot, band, axis, bnd] = k.split("-");
    for (const g of gradesOfBand[band as keyof typeof gradesOfBand] ?? []) {
      const nk = `${slot}-${g}-${axis}-${bnd}`;
      if (!templates[nk]) templates[nk] = a.templates[k];
    }
    delete templates[k];
  }
  return { ...a, templates };
}

function write(next: Assets) {
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

function useAssets(): Assets {
  /* ⚠ 서버 스냅숏으로 모듈 상수를 돌려준다. 새 객체를 만들면 렌더마다 참조가 달라
     React가 무한 루프로 본다 */
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

function now() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/* ───────────────────────── 읽는 길 ───────────────────────── */

/** 씨앗 한 칸에 고친 것을 덮는다 */
export type TemplateRow = Template & {
  /** 운영자가 고쳤는가 — 목록에서 「고침」으로 세운다 */
  edited: boolean;
  editedAt: string | null;
  editedBy: string | null;
  /** 고쳐 온 자취. 새것이 앞 */
  history: TemplateRev[];
  /** 씨앗에도 없고 고친 것도 없는 칸 — 아직 아무도 안 쓴 자리 */
  empty: boolean;
};

const seedMap = new Map(seedTemplates.map((x) => [x.id, x]));

function rowOf(
  a: Assets,
  slot: SlotId,
  grade: TemplateGrade,
  axis: AxisId | null,
  band: Band | null,
): TemplateRow {
  const id = keyOf(slot, grade, axis, band);
  const seed = seedMap.get(id);
  const edit = a.templates[id];
  return {
    id,
    slot,
    grade,
    axis,
    band,
    title: edit?.title ?? seed?.title ?? "",
    text: edit?.text ?? seed?.text ?? "",
    edited: !!edit,
    editedAt: edit?.at ?? null,
    editedBy: edit?.by ?? null,
    history: edit?.history ?? [],
    empty: !edit && !seed,
  };
}

/** 열쇠로 한 칸 — 상세 화면이 주소에서 받은 글자로 찾는다. 아는 칸이 아니면 null */
export function useTemplateById(id: string): TemplateRow | null {
  const a = useAssets();
  return useMemo(() => {
    const k = parseKey(id);
    return k ? rowOf(a, k.slot, k.grade, k.axis, k.band) : null;
  }, [a, id]);
}

/** 한 슬롯 × 한 학년대의 격자 — 빈 칸까지 전부 선다 */
export function useTemplateGrid(slot: SlotId, grade: TemplateGrade): TemplateRow[] {
  const a = useAssets();
  return useMemo(() => {
    const s = slotOf(slot);
    const axisList: (AxisId | null)[] = s.byAxis
      ? axes.filter((x) => x.subject).map((x) => x.id)
      : [null];
    const bandList: (Band | null)[] = s.byBand ? (["L3", "L2", "L1"] as Band[]) : [null];
    return axisList.flatMap((axis) => bandList.map((band) => rowOf(a, slot, grade, axis, band)));
  }, [a, slot, grade]);
}

/** 모든 학년의 모든 칸 — 학년 차례, 그 안에서 자리 차례. 목록이 조회 조건 「학년」으로 거른다 */
export function useEveryTemplate(): TemplateRow[] {
  const a = useAssets();
  return useMemo(() => templateGrades.flatMap((g) => allOf(a, g.id)), [a]);
}

/**
 * 처음 값 그대로의 모든 칸 — 저장소를 읽지 않는다.
 * 디자인 보기(/design/admin2/reports/templates)가 목록과 상세를 이 값으로 그린다.
 */
export const seedTemplateRows = (): TemplateRow[] =>
  templateGrades.flatMap((g) => allOf(EMPTY, g.id));

/** 학년 하나의 모든 칸 — 「몇 칸이 비었나」를 세는 데 쓴다 */
export function useAllTemplates(grade: TemplateGrade): TemplateRow[] {
  const a = useAssets();
  return useMemo(() => allOf(a, grade), [a, grade]);
}

function allOf(a: Assets, grade: TemplateGrade): TemplateRow[] {
  {
    const out: TemplateRow[] = [];
    for (const s of [...slotOrder, ...(a.slots ?? []).map((x) => x.id)]) {
      const def = slotOf(s);
      const axisList: (AxisId | null)[] = def.byAxis
        ? axes.filter((x) => x.subject).map((x) => x.id)
        : [null];
      const bandList: (Band | null)[] = def.byBand ? (["L3", "L2", "L1"] as Band[]) : [null];
      for (const axis of axisList) for (const band of bandList) out.push(rowOf(a, s, grade, axis, band));
    }
    return out;
  }
}


/** 씨앗 규칙에 고친 것을 덮어 차례대로 세운다 — 훅과 조립이 같은 것을 쓴다 */
function rulesOf(a: Assets): (Rule & { edited: boolean })[] {
  return [...seedRules, ...(a.slots ?? []).map(customRule)]
    .map((r) => {
      const e = a.rules[r.id];
      return {
        ...r,
        desc: e?.desc ?? r.desc,
        order: e?.order ?? r.order,
        on: e?.on ?? r.on,
        cond: e?.cond ?? r.cond,
        edited: !!e,
      };
    })
    .sort((x, y) => x.order - y.order || x.id.localeCompare(y.id));
}

/**
 * 더한 자리의 규칙 — 자리를 더하면 규칙 하나가 따라 선다. 규칙이 없으면 문구를 채워도 리포트에
 * 붙지 않는다. 축마다 다른 글이면 가장 높은 축의 문구를, 아니면 늘 붙인다. 차례 · 켜고 끄기 ·
 * 근거 줄은 조립 규칙 화면에서 씨앗 규칙과 똑같이 고친다(a.rules에 같은 열쇠로 덮는다).
 */
function customRule(s: CustomSlot, k: number): Rule {
  return {
    id: `R-${s.id}`,
    label: s.label,
    desc: s.guide || "운영자가 해석 템플릿 화면에서 추가한 항목",
    slot: s.id,
    cond: s.byAxis ? { kind: "topAxis" } : { kind: "always" },
    order: 100 + k * 10,
    on: true,
  };
}

const cutsOf = (a: Assets): BandCuts => a.cuts ?? defaultCuts;

const crossCutsOf = (a: Assets): CrossCuts => a.crossCuts ?? defaultCrossCuts;

/** 씨앗 셀에 고친 것을 덮는다 */
function crossOfAssets(a: Assets): (CrossCellRule & { edited: boolean })[] {
  return seedCross.map((c) => {
    const e = a.cross?.[c.id];
    return {
      ...c,
      title: e?.title ?? c.title,
      text: e?.text ?? c.text,
      next: e?.next ?? c.next,
      on: e?.on ?? c.on,
      edited: !!e,
    };
  });
}

/* ───────────────────────── 쓰는 길 ───────────────────────── */

/**
 * 템플릿 한 칸을 저장한다.
 *
 * ⚠ 라벨링 금칙어가 든 문구는 저장하지 않는다. 리포트 승인 화면(EXP-08)은 아이 하나의
 *   문구를 막지만, **템플릿은 그 문구를 받는 모든 아이에게 나간다.** 한 번 막는 자리를
 *   여기에도 두는 까닭이 그것이다. 부르는 쪽에서도 막지만 여기서 한 번 더 본다.
 */
export function saveTemplate(id: string, title: string, text: string, by: string): boolean {
  if (!text.trim()) return false;
  if (labelCheck(text).some((f) => f.tone === "block")) return false;
  const cur = read();
  const was = cur.templates[id];
  /* 앞 값을 자취로 밀어 넣는다. 씨앗을 처음 고치는 것이면 밀 것이 없다 —
     그때의 앞 값은 씨앗이고, 그것은 lib/reportAssets.ts에 그대로 있다 */
  const history = was
    ? [{ title: was.title, text: was.text, at: was.at, by: was.by }, ...(was.history ?? [])].slice(0, 10)
    : [];
  write({
    ...cur,
    templates: {
      ...cur.templates,
      [id]: { title: title.trim(), text: text.trim(), at: now(), by, history },
    },
  });
  return true;
}

/**
 * 자리를 더한다 — 리포트에 새 절이 생긴다. 학년대 넷 × (축) × (밴드)만큼 빈 칸이 목록에 선다.
 * 이름이 비었거나 이미 있는 자리 이름이면 null.
 */
export function addSlot(
  input: { label: string; section: string; guide: string; byAxis: boolean; byBand: boolean },
  by: string,
): CustomSlot["id"] | null {
  const label = input.label.trim();
  if (!label) return null;
  const cur = read();
  const taken = [...slotOrder.map((x) => slotOf(x).label), ...(cur.slots ?? []).map((x) => x.label)];
  if (taken.includes(label)) return null;
  const id = `c${Date.now().toString(36)}` as CustomSlot["id"];
  const slot: CustomSlot = {
    id,
    label,
    section: input.section.trim() || label,
    guide: input.guide.trim(),
    byAxis: input.byAxis,
    byBand: input.byBand,
    createdAt: now(),
    createdBy: by,
  };
  write({ ...cur, slots: [...(cur.slots ?? []), slot] });
  return id;
}

/**
 * 더한 자리를 지운다 — 그 자리의 문구와 규칙 고침도 함께 걷는다. 씨앗 자리는 지우지 못한다.
 * 이미 발행된 리포트는 조립 때 문장을 복사해 담았으므로 그대로다.
 */
export function removeSlot(id: string) {
  const cur = read();
  if (!(cur.slots ?? []).some((x) => x.id === id)) return;
  const templates = Object.fromEntries(
    Object.entries(cur.templates).filter(([k]) => !k.startsWith(`${id}-`)),
  );
  const rules = { ...cur.rules };
  delete rules[`R-${id}`];
  write({ ...cur, slots: (cur.slots ?? []).filter((x) => x.id !== id), templates, rules });
}

/** 더한 자리 목록 */
export function useCustomSlots(): CustomSlot[] {
  return useAssets().slots ?? EMPTY_SLOTS;
}
const EMPTY_SLOTS: CustomSlot[] = [];

/** 고친 것을 물리고 씨앗 문구로 되돌린다 — 씨앗에 없던 칸이면 다시 빈 칸이 된다 */
export function resetTemplate(id: string) {
  const cur = read();
  if (!cur.templates[id]) return;
  const next = { ...cur.templates };
  delete next[id];
  write({ ...cur, templates: next });
}

/**
 * 조립 규칙 화면의 저장 — 컷 · 규칙 · 교차 셀을 **한 번에** 적는다.
 *
 * 한동안 값 하나를 고칠 때마다 그 자리에서 저장했다. 숫자 하나가 그 뒤의 모든 리포트를 바꾸는
 * 화면인데, 「75」를 지우고 「8」을 치는 사이에 L3 컷이 8점이 되었다. 지금은 고친 것을 화면에서
 * 미리 조립해 본 뒤 저장을 눌러야 걸린다.
 *
 * 씨앗과 같은 값은 덮어 두지 않는다. 덮어 둔 것만 남겨야 씨앗을 고쳤을 때 이미 저장한
 * 브라우저도 그 값을 받는다(이 파일 머리의 「덮는 단위」).
 *
 * ⚠ 값이 어긋나면(ruleSetError) 저장하지 않는다. 화면도 같은 검사로 저장 단추를 잠그지만
 *   여기서 한 번 더 본다 — 미측정 안내가 꺼진 채로, 또는 검토가 필요한 표현이 든 교차 셀
 *   문구가 저장되면 그 뒤의 리포트가 전부 그 값으로 나간다.
 */
export function saveRuleSet(set: RuleSet, by: string): boolean {
  if (ruleSetError(set)) return false;
  const cur = read();
  const at = now();

  const rules: Record<string, RuleEdit> = {};
  for (const base of [...seedRules, ...(cur.slots ?? []).map(customRule)]) {
    const was = cur.rules[base.id];
    const next = set.rules.find((r) => r.id === base.id);
    if (!next) {
      if (was) rules[base.id] = was;
      continue;
    }
    const change: Omit<RuleEdit, "at" | "by"> = {};
    if (was?.desc !== undefined) change.desc = was.desc;
    if (next.order !== base.order) change.order = next.order;
    if (next.on !== base.on) change.on = next.on;
    if (!sameCond(next.cond, base.cond)) change.cond = next.cond;
    if (Object.keys(change).length === 0) continue;
    const same =
      !!was &&
      was.order === change.order &&
      was.on === change.on &&
      (was.cond === undefined) === (change.cond === undefined) &&
      (!was.cond || !change.cond || sameCond(was.cond, change.cond));
    rules[base.id] = same ? was : { ...change, at, by };
  }

  const cross: Record<string, CrossEdit> = {};
  for (const base of seedCross) {
    const next = set.cross.find((c) => c.id === base.id);
    if (!next) continue;
    const change: Omit<CrossEdit, "at" | "by"> = {};
    if (next.title.trim() !== base.title) change.title = next.title.trim();
    if (next.text.trim() !== base.text) change.text = next.text.trim();
    if (next.next.trim() !== base.next) change.next = next.next.trim();
    if (next.on !== base.on) change.on = next.on;
    if (Object.keys(change).length === 0) continue;
    const was = cur.cross?.[base.id];
    const same =
      !!was &&
      was.title === change.title &&
      was.text === change.text &&
      was.next === change.next &&
      was.on === change.on;
    cross[base.id] = same ? was : { ...change, at, by };
  }

  const wasCuts = cutsOf(cur);
  const cutMoved = wasCuts.L3 !== set.cuts.L3 || wasCuts.L2 !== set.cuts.L2;

  write({
    ...cur,
    rules,
    cross,
    cuts: set.cuts,
    crossCuts: set.crossCuts,
    cutLog: cutMoved
      ? [{ ...set.cuts, at, by }, ...(cur.cutLog ?? [])].slice(0, 10)
      : cur.cutLog,
    savedAt: at,
    savedBy: by,
  });
  return true;
}

/** 조립 규칙을 마지막으로 저장한 때와 사람 — 한 번도 고치지 않았으면 null */
export function useRuleSetStamp(): { at: string; by: string } | null {
  const a = useAssets();
  return useMemo(() => (a.savedAt ? { at: a.savedAt, by: a.savedBy ?? "" } : null), [a]);
}

/* ───────────────────────── 조립 ─────────────────────────
   조립하는 셈은 lib/reportAssembly.ts 하나다. 여기서는 그 셈에 넘길 한 벌(규칙 · 컷 · 교차 셀 ·
   문구)을 씨앗 위에 운영자가 고친 것을 덮어 꾸린다. 조립 규칙 화면의 미리 보기와 실제 조립이
   **같은 한 벌, 같은 함수**를 쓴다. */

/** 지금 걸려 있는 한 벌 */
function kitOf(a: Assets): Kit {
  return {
    rules: rulesOf(a),
    cuts: cutsOf(a),
    crossCuts: crossCutsOf(a),
    cross: crossOfAssets(a),
    slots: [...seedSlots, ...(a.slots ?? [])],
    template: (slot, grade, axis, band) => {
      const row = rowOf(a, slot, grade, axis, band);
      return row.empty ? null : { id: row.id, title: row.title, text: row.text };
    },
  };
}

export function useKit(): Kit {
  const a = useAssets();
  return useMemo(() => kitOf(a), [a]);
}

/** 훅 밖에서 읽는 한 벌 — 리포트 저장소가 발행 전 리포트를 다시 조립할 때 쓴다 */
export const getKit = (): Kit => kitOf(read());

/** 지금 규칙으로 조립한다 — lib/reportStore.ts가 쓴다 */
export function assembleFrom(facts: Facts): Assembly {
  return assemble(facts, getKit());
}
