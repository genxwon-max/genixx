"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { AxisId } from "./result";
import { axes } from "./result";
import { labelCheck, type LabelFinding } from "./labelCheck";
import {
  bandFromScore,
  condText,
  crossKeyOf,
  parseKey,
  defaultCrossCuts,
  defaultCuts,
  seedCross,
  keyOf,
  seedRules,
  seedTemplates,
  gradesOfBand,
  setCustomSlots,
  templateGrades,
  slotOf,
  slotOrder,
  type Band,
  type BandCuts,
  type CrossCellRule,
  type CrossCuts,
  type CrossKey,
  type CustomSlot,
  type Rule,
  type RuleCond,
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
 * ── 고친 문구는 다음 조립부터 ──
 * 이 저장소는 **리포트를 건드리지 않는다.** 리포트는 조립되는 순간 문장을 블록에 복사해
 * 담고(lib/reportStore.ts의 ReportBlock.text) 그 뒤로는 템플릿을 다시 보지 않는다. 보호자가
 * 이미 읽은 글이 뒤에서 소리 없이 바뀌면 안 되기 때문이다. 그래서 여기서 무엇을 고쳐도
 * 발행된 리포트는 그대로이고, 바뀌는 것은 다음에 조립되는 리포트뿐이다.
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
export type CrossEdit = Partial<Pick<CrossCellRule, "text" | "next" | "on">> & {
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
    desc: s.guide || "운영자가 해석 템플릿 화면에서 더한 자리",
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
      text: e?.text ?? c.text,
      next: e?.next ?? c.next,
      on: e?.on ?? c.on,
      edited: !!e,
    };
  });
}

export function useCrossCells(): (CrossCellRule & { edited: boolean })[] {
  const a = useAssets();
  return useMemo(() => crossOfAssets(a), [a]);
}

export function useCrossCuts(): CrossCuts {
  return crossCutsOf(useAssets());
}

/** 교차 셀 한 칸을 고친다 */
export function saveCross(id: CrossKey, change: Omit<CrossEdit, "at" | "by">, by: string) {
  const cur = read();
  write({
    ...cur,
    cross: { ...(cur.cross ?? {}), [id]: { ...(cur.cross?.[id] ?? {}), ...change, at: now(), by } },
  });
}

/** 2×2를 가르는 점수를 옮긴다 */
export function saveCrossCuts(cuts: CrossCuts): boolean {
  if (!(cuts.paper > 0 && cuts.paper <= 100 && cuts.talent > 0 && cuts.talent <= 100)) return false;
  write({ ...read(), crossCuts: cuts });
  return true;
}

export function useRules(): (Rule & { edited: boolean })[] {
  const a = useAssets();
  return useMemo(() => rulesOf(a), [a]);
}

export function useBandCuts(): BandCuts {
  return cutsOf(useAssets());
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
 * 규칙 한 줄을 고친다.
 *
 * ⚠ 잠긴 규칙(Rule.locked)은 **끄지 못한다.** 화면에서도 스위치를 잠그지만 여기서 한 번 더
 *   본다 — 미측정 안내가 꺼진 채로 리포트가 나가면 재지 않은 축이 「0점」으로 읽힌다.
 *   끄는 것만 막고 차례·근거 줄·조건 숫자는 그대로 받는다.
 */
export function saveRule(id: string, change: Omit<RuleEdit, "at" | "by">, by: string): boolean {
  const seed = seedRules.find((r) => r.id === id);
  if (!seed) return false;
  if (seed.locked && change.on === false) return false;
  const cur = read();
  write({
    ...cur,
    rules: { ...cur.rules, [id]: { ...cur.rules[id], ...change, at: now(), by } },
  });
  return true;
}

/** 규칙을 씨앗 값으로 되돌린다 */
export function resetRule(id: string) {
  const cur = read();
  if (!cur.rules[id]) return;
  const next = { ...cur.rules };
  delete next[id];
  write({ ...cur, rules: next });
}

/**
 * 밴드 컷을 고친다.
 *
 * L3 컷이 L2 컷보다 낮으면 가운데 구간이 사라진다. 부르는 쪽에서도 막지만 여기서 한 번 더 본다.
 */
export function saveCuts(cuts: BandCuts, by: string): boolean {
  if (!(cuts.L3 > cuts.L2 && cuts.L2 > 0 && cuts.L3 <= 100)) return false;
  const cur = read();
  write({
    ...cur,
    cuts,
    cutLog: [{ ...cuts, at: now(), by }, ...(cur.cutLog ?? [])].slice(0, 10),
  });
  return true;
}

/** 컷을 옮겨 온 자취 */
export function useCutLog(): CutRev[] {
  return useAssets().cutLog ?? [];
}

/* ───────────────────────── 조립 미리보기 ───────────────────────── */

/**
 * 「이 규칙을 고치면 리포트가 어떻게 달라지나」를 그 자리에서 보이는 값.
 *
 * 진짜 아이 자료로 미리 보이지 않는다. 발행된 리포트는 이미 문장을 복사해 담았고, 아직
 * 조립되지 않은 아이의 점수를 여기서 끌어오면 이 화면이 개인정보를 펴는 자리가 된다.
 * 대신 **운영자가 값을 세워 보는 표본**을 받는다 — 축·점수·설문 건수를 손으로 놓고
 * 「그러면 어떤 블록이 붙나」를 본다. 규칙을 고치는 사람이 알고 싶은 것이 바로 그것이다.
 */
export type PreviewInput = {
  grade: TemplateGrade;
  topAxis: AxisId;
  topScore: number;
  lowAxis: AxisId | null;
  lowScore: number;
  /** 과목 점수 — 교차 셀 규칙이 본다 */
  subjectScore: number;
  /** 들어온 관찰 설문 건수 */
  surveys: number;
};

export type PreviewBlock = {
  rule: Rule;
  section: string;
  title: string;
  text: string;
  /** 규칙은 걸렸는데 그 칸의 문구가 없다 */
  missing: boolean;
  /** 그 학년대에 없어 초등 3~4학년 문구로 물러섰다 */
  fellBack: boolean;
  axis: AxisId | null;
  band: Band | null;
  findings: LabelFinding[];
};

/** 조건이 걸리는가 */
function fires(c: RuleCond, v: PreviewInput, a: Assets): boolean {
  switch (c.kind) {
    case "always":
      return true;
    case "topAxis":
      return true;
    case "lowAxis":
      return v.lowAxis !== null;
    case "sourcesBelow":
      return v.surveys < c.n;
    case "cross": {
      /* 걸린 칸이 꺼져 있으면 블록도 붙지 않는다 — 규칙을 켜 두고 칸만 끄는 것이
         「이 조합에는 아무 말도 하지 않는다」를 뜻한다 */
      const key = crossKeyOf(v.subjectScore, v.topScore, crossCutsOf(a));
      return crossOfAssets(a).find((x) => x.id === key)?.on ?? false;
    }
  }
}

/**
 * 빈 칸에서 물러서는 자리.
 *
 * 어느 학년의 문구가 아직 없다고 리포트에 구멍을 낼 수는 없다. 같은 슬롯의 초등 3~4학년
 * 문구로 물러서고, **물러섰다는 사실을 값에 담아** 화면이 그것을 적게 한다 — 조용히
 * 물러서면 「초6 문구를 다 썼다」고 착각한 채로 리포트가 나간다.
 */
/**
 * 물러서는 차례 — 같은 옛 학년대의 다른 학년(4학년이 비면 3학년), 그다음 초등 3학년.
 * 초등 3 · 4학년은 씨앗이 온전히 차 있다.
 */
function fallbacksOf(g: TemplateGrade): TemplateGrade[] {
  const band = templateGrades.find((x) => x.id === g)!.band;
  const sibling = gradesOfBand[band].filter((x) => x !== g);
  return [...sibling, "e3" as TemplateGrade].filter((x, k, all) => x !== g && all.indexOf(x) === k);
}

function build(
  a: Assets,
  rules: Rule[],
  cuts: BandCuts,
  v: PreviewInput,
): PreviewBlock[] {
  {
    const band = bandFromScore(v.topScore, cuts);
    return rules
      .filter((r) => r.on && fires(r.cond, v, a))
      .map((r) => {
        /* 교차 해석은 학년대가 아니라 걸린 셀이 문구를 든다.
           ⚠ slotOf보다 **먼저** 가른다 — cross는 슬롯 목록에 없어서 저것이 undefined를
             돌려주고, 바로 아래 s.byAxis에서 터진다 */
        if (r.slot === "cross") {
          const key = crossKeyOf(v.subjectScore, v.topScore, crossCutsOf(a));
          const cell = crossOfAssets(a).find((x) => x.id === key)!;
          return {
            rule: r,
            section: "교차 해석",
            title: cell.label,
            text: cell.text,
            missing: !cell.text.trim(),
            fellBack: false,
            axis: null,
            band: null,
            findings: cell.text ? labelCheck(cell.text) : [],
          };
        }

        const s = slotOf(r.slot);
        /* 어느 축의 문구를 부르는가 — 자리마다 다르다 */
        const axis = !s.byAxis ? null : r.cond.kind === "lowAxis" ? v.lowAxis : v.topAxis;
        const useBand = s.byBand ? band : null;

        let row = rowOf(a, r.slot, v.grade, axis, useBand);
        let fellBack = false;
        if (row.empty) {
          for (const g of fallbacksOf(v.grade)) {
            const back = rowOf(a, r.slot, g, axis, useBand);
            if (!back.empty) {
              row = back;
              fellBack = true;
              break;
            }
          }
        }

        return {
          rule: r,
          section: s.section,
          title: row.title || s.label,
          text: row.text,
          missing: row.empty && !fellBack,
          fellBack,
          axis,
          band: useBand,
          findings: row.text ? labelCheck(row.text) : [],
        };
      });
  }
}

export function useAssemblyPreview(v: PreviewInput): PreviewBlock[] {
  const a = useAssets();
  const rules = useRules();
  const cuts = useBandCuts();
  return useMemo(() => build(a, rules, cuts, v), [a, rules, cuts, v]);
}

/** 규칙 한 줄이 이 표본에 걸리는가 */
export function useRuleFires(r: Rule, v: PreviewInput) {
  const a = useAssets();
  return r.on && fires(r.cond, v, a);
}

export { condText };

/* ───────────────────────── 실제 조립 ─────────────────────────
   미리보기와 **같은 함수를 쓴다.** 화면이 보여 준 것과 실제로 나가는 글이 다른 코드에서
   나오면, 미리보기가 「그럴 것이다」를 말하는 자리가 되어 아무도 믿지 않게 된다.
   위의 useAssemblyPreview는 이 함수를 훅으로 감싼 것뿐이다. */

/** 훅 밖에서 부르는 조립 — lib/reportStore.ts의 ensureReport가 쓴다 */
export function assembleFrom(v: PreviewInput): PreviewBlock[] {
  const a = read();
  return build(a, rulesOf(a), cutsOf(a), v);
}
