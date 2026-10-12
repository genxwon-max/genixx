import { labelCheck, type LabelFinding } from "./labelCheck";
import {
  bandFromScore,
  bandOf,
  cellsOf,
  crossKeyOf,
  defaultCrossCuts,
  defaultCuts,
  gradeLabel,
  gradesOfBand,
  keyOf,
  lowGapOf,
  measuredAxes,
  seedCross,
  seedRules,
  seedTemplates,
  slots as seedSlots,
  templateGrades,
  type Band,
  type BandCuts,
  type CrossCellRule,
  type CrossCuts,
  type CrossKey,
  type Rule,
  type Slot,
  type SlotId,
  type TemplateGrade,
} from "./reportAssets";
import { axes, primaryTypes, type AxisId } from "./result";

/**
 * 리포트 조립 (ADM-08-4) — 채점이 끝난 답안지 한 장이 리포트 한 벌이 되는 셈.
 *
 * 리포트의 글은 그때그때 지어내지 않는다. 검수해 둔 문구(해석 템플릿 · 교차 셀)를 규칙이 골라
 * 차례대로 세운다. 이 파일이 그 「고르는 일」 전부다.
 *
 *   ① 읽는다    과목 점수 → 축 점수 → 높은 차례 · 발현 밴드 · 유형 · 학력 × 재능 칸
 *   ② 고른다    규칙을 차례대로 보며, 조건에 해당하는 규칙마다 문구 한 칸을 고른다
 *   ③ 남긴다    붙은 문단에는 규칙이 본 값을, 붙지 않은 규칙에는 왜 빠졌는지를 적는다
 *
 * ── 조립하는 곳은 여기 하나다 ──
 * 조립 규칙 화면의 미리 보기, 채점이 끝날 때 만들어지는 리포트, 디자인 보기의 예시가 모두 이
 * 함수(assemble)를 지난다. 화면이 보여 준 것과 실제로 나가는 글이 다른 코드에서 나오면 미리
 * 보기는 「그럴 것이다」를 말하는 자리가 되어 아무도 믿지 않는다. 한동안 리포트 승인 목록의
 * 리포트는 규칙을 거치지 않고 지어낸 글이었다 — 규칙을 고쳐도 목록의 리포트는 그대로였다.
 *
 * ── 점수가 같을 때 ──
 * 높은 차례를 정할 때 점수가 같으면 정해 둔 축 차례(언어 → 수리·논리 → 자연·탐구)를 따른다.
 * 어느 쪽으로 정하든 까닭이 있어야 같은 답안지가 언제나 같은 리포트가 된다. 그렇게 정했다는
 * 것은 규칙의 근거에 적는다.
 *
 * ⚠ 지시자("use client")를 붙이지 않는다. 저장소(lib/reportAssetStore.ts)는 운영자가 고친 값을
 *   덮어 이 함수에 넘기고, 디자인 보기는 처음 값(seedKit)을 그대로 넘긴다.
 */

/* ───────────────────────── 조립이 읽는 값 ───────────────────────── */

/**
 * 답안지 한 장에서 조립이 읽는 것 전부.
 *
 * 리포트에 함께 저장한다(ReportDoc.facts). 규칙이나 문구가 바뀌어 발행 전 리포트를 다시 조립할
 * 때 이 값으로 다시 센다 — 답안지를 다시 채점하지 않는다.
 */
export type Facts = {
  /** 문구를 고르는 학년 */
  grade: TemplateGrade;
  /** 대상 학년(초등 3~6학년)이 아니어서 가장 어린 칸으로 읽었으면, 원래 학년 */
  offGrade?: string;
  /** 본 과목의 축 점수(0~100). 응시하지 않은 과목의 축은 넣지 않는다 */
  scores: { axis: AxisId; score: number }[];
  /** 관찰 설문(학부모 · 지도교사)이 들어온 건수 */
  surveys: number;
};

export type AxisRead = { axis: AxisId; label: string; score: number; band: Band };

/** 점수에서 읽어 낸 것 — 규칙은 이 값만 본다 */
export type Reading = {
  /** 측정한 축, 높은 차례 */
  ranked: AxisRead[];
  top: AxisRead | null;
  /** 가장 낮은 축 — 측정한 축이 둘 이상일 때만 */
  low: AxisRead | null;
  /** 가장 높은 점수가 둘 이상인가 — 축 차례로 정했다는 뜻이다 */
  tieTop: boolean;
  /** 가장 높은 축과 가장 낮은 축의 점수 차 */
  gap: number | null;
  /** 학력 — 본 과목 점수의 평균 */
  paper: number | null;
  /** 재능 — 가장 높은 축의 점수 */
  talent: number | null;
  /** 학력 × 재능이 떨어지는 칸. 본 과목이 하나면 견줄 것이 없어 null이다 */
  cell: CrossKey | null;
  typeCode: string;
  typeName: string;
  /** 리포트 신뢰도 — 관찰 설문이 몇 건 들어왔는가 */
  confidence: "높음" | "보통" | "참고";
};

/** 조립에 쓰는 것 한 벌 — 규칙 · 컷 · 교차 셀 · 문구 */
export type Kit = {
  /** 차례대로 */
  rules: Rule[];
  cuts: BandCuts;
  crossCuts: CrossCuts;
  cross: CrossCellRule[];
  /** 문구가 놓이는 자리 — 처음부터 있던 것과 운영자가 더한 것 */
  slots: Slot[];
  /** 해석 템플릿 한 칸의 문구. 아무도 쓰지 않은 칸이면 null */
  template: (
    slot: SlotId,
    grade: TemplateGrade,
    axis: AxisId | null,
    band: Band | null,
  ) => { id: string; title: string; text: string } | null;
};

/* ───────────────────────── ① 읽는다 ───────────────────────── */

const AXIS_ORDER = measuredAxes.map((a) => a.id);
const axisLabel = (id: AxisId) => axes.find((a) => a.id === id)?.label ?? id;

/** 정해 둔 축 차례 — 점수가 같을 때 따르는 순서를 글로 */
export const axisOrderText = measuredAxes.map((a) => a.label).join(" → ");

export function confidenceOf(surveys: number): Reading["confidence"] {
  return surveys >= 2 ? "높음" : surveys === 1 ? "보통" : "참고";
}

export function readFacts(f: Facts, kit: Pick<Kit, "cuts" | "crossCuts">): Reading {
  const ranked: AxisRead[] = f.scores
    .filter((s) => AXIS_ORDER.includes(s.axis))
    .map((s) => ({
      axis: s.axis,
      label: axisLabel(s.axis),
      score: s.score,
      band: bandFromScore(s.score, kit.cuts),
    }))
    .sort((a, b) => b.score - a.score || AXIS_ORDER.indexOf(a.axis) - AXIS_ORDER.indexOf(b.axis));

  const top = ranked[0] ?? null;
  const low = ranked.length > 1 ? ranked[ranked.length - 1] : null;
  const paper = ranked.length
    ? Math.round(ranked.reduce((sum, a) => sum + a.score, 0) / ranked.length)
    : null;
  const talent = top?.score ?? null;

  return {
    ranked,
    top,
    low,
    tieTop: ranked.length > 1 && ranked[0].score === ranked[1].score,
    gap: top && low ? top.score - low.score : null,
    paper,
    talent,
    cell:
      ranked.length >= 2 && paper !== null && talent !== null
        ? crossKeyOf(paper, talent, kit.crossCuts)
        : null,
    typeCode: top
      ? `${ranked
          .slice(0, 3)
          .map((a) => primaryTypes[a.axis].code)
          .join("")}형`
      : "미판정",
    typeName: top ? `${primaryTypes[top.axis].name}형` : "판정 보류",
    confidence: confidenceOf(f.surveys),
  };
}

/** 밴드의 점수 구간을 글로 — 「75점 이상」 · 「55~74점」 · 「55점 미만」 */
export function bandRange(band: Band, cuts: BandCuts) {
  if (band === "L3") return `${cuts.L3}점 이상`;
  if (band === "L2") return `${cuts.L2}~${cuts.L3 - 1}점`;
  return `${cuts.L2}점 미만`;
}

/** 축 점수를 한 줄로 — 「언어 78 · 수리·논리 71 · 자연·탐구 64」 */
export const scoreLine = (list: { label: string; score: number }[]) =>
  list.map((a) => `${a.label} ${a.score}`).join(" · ");

/* ───────────────────────── ② 고른다 ───────────────────────── */

/** 리포트에 서는 문단 하나 — 문구와, 그 문구가 왜 여기 있는지 */
export type AssembledBlock = {
  /** 규칙 하나가 문단 하나를 만든다 — 규칙 번호로 문단을 가린다 */
  id: string;
  section: string;
  title: string;
  /** 「R-04 · 강하게 나타난 축」 */
  rule: string;
  /** 규칙이 본 값 — 왜 이 문단이 붙었는가 */
  evidence: string;
  text: string;
  ruleId: string;
  /** 문구가 온 곳 — 해석 템플릿 칸의 열쇠, 교차 셀이면 「cross:gap」 */
  source: string;
  /** 그 학년의 문구가 없어 다른 학년 문구를 썼으면, 그 학년 */
  fellBack?: TemplateGrade;
};

/** 규칙 하나를 본 결과 */
export type Step = {
  rule: Rule;
  /** 문단이 붙었는가 */
  fired: boolean;
  /** 붙었으면 규칙이 본 값, 안 붙었으면 왜 빠졌는지 */
  why: string;
  block?: AssembledBlock & { axis: AxisId | null; band: Band | null; findings: LabelFinding[] };
  /** 조건에는 해당하는데 넣을 문구가 없다 — 비어 있는 칸의 열쇠 */
  missing?: string;
};

export type Assembly = {
  reading: Reading;
  /** 규칙마다 하나씩, 차례대로 */
  steps: Step[];
  /** 조립하며 남기는 말 — 대상 학년이 아니었다, 점수가 같아 축 차례로 정했다 */
  notes: string[];
};

/**
 * 빈 칸에서 대신 쓰는 학년 — 같은 학년대의 다른 학년(4학년이 비면 3학년), 그다음 초등 3학년.
 *
 * 어느 학년의 문구가 아직 없다고 리포트에 구멍을 낼 수는 없다. 대신 썼다는 사실은 문단에
 * 남긴다(AssembledBlock.fellBack) — 조용히 바꿔 쓰면 「초6 문구를 다 썼다」고 믿은 채로 나간다.
 */
export function fallbacksOf(g: TemplateGrade): TemplateGrade[] {
  const band = templateGrades.find((x) => x.id === g)!.band;
  const sibling = gradesOfBand[band].filter((x) => x !== g);
  return [...sibling, "e3" as TemplateGrade].filter((x, k, all) => x !== g && all.indexOf(x) === k);
}

const slotIn = (kit: Kit, id: SlotId) => kit.slots.find((s) => s.id === id) ?? null;

/** 조건에 해당하는가, 그리고 규칙이 본 값 */
function check(rule: Rule, f: Facts, r: Reading, kit: Kit): { ok: boolean; why: string } {
  const c = rule.cond;
  const slot = rule.slot === "cross" ? null : slotIn(kit, rule.slot);

  switch (c.kind) {
    case "always": {
      if (rule.slot !== "unmeasured") return { ok: true, why: "모든 리포트에 붙는 항목입니다." };
      const never = axes.filter((a) => !a.subject).map((a) => a.label);
      const untaken = measuredAxes.filter((a) => !r.ranked.some((x) => x.axis === a.id));
      return {
        ok: true,
        why:
          `이번 진단에서 재지 않는 축이 ${never.length}개 있습니다(${never.join(" · ")}).` +
          (untaken.length > 0
            ? ` 응시하지 않은 과목의 축(${untaken.map((a) => a.label).join(" · ")})도 점수가 없습니다.`
            : ""),
      };
    }

    case "topAxis": {
      if (!r.top) return { ok: false, why: "측정한 축이 없습니다." };
      const tie = r.tieTop
        ? ` 점수가 같은 축이 있어 정해 둔 축 차례(${axisOrderText})를 따랐습니다.`
        : "";
      if (rule.slot === "type") {
        return {
          ok: true,
          why:
            `가장 높은 축은 ${r.top.label}(${r.top.score}점)입니다. 높은 차례(${scoreLine(r.ranked)})대로 ` +
            `유형 코드는 ${r.typeCode}입니다.${tie}`,
        };
      }
      /* 축 차례로 정했다는 말은 유형 판정의 근거에만 적는다. 가장 높은 축을 보는 규칙마다
         되풀이하면 근거 세 줄이 같은 말로 끝난다 */
      if (slot?.byBand) {
        return {
          ok: true,
          why:
            `가장 높은 축 ${r.top.label} ${r.top.score}점은 ${r.top.band} ${bandOf(r.top.band).label} ` +
            `구간입니다(${bandRange(r.top.band, kit.cuts)}).`,
        };
      }
      return {
        ok: true,
        why: slot?.byAxis
          ? `가장 높은 축(${r.top.label})과 학년(${gradeLabel(f.grade)})으로 골랐습니다.`
          : "측정한 축이 있어 붙는 항목입니다.",
      };
    }

    case "lowAxis": {
      if (!r.top || !r.low || r.gap === null) {
        return {
          ok: false,
          why: r.top ? "측정한 축이 하나라 견줄 축이 없습니다." : "측정한 축이 없습니다.",
        };
      }
      const need = lowGapOf(c);
      const line =
        `가장 낮은 축 ${r.low.label}(${r.low.score}점)이 가장 높은 축 ${r.top.label}(${r.top.score}점)보다 ` +
        `${r.gap}점 낮습니다.`;
      return r.gap >= need
        ? { ok: true, why: `${line} ${need}점 이상 낮으면 붙습니다.` }
        : { ok: false, why: `${line} ${need}점 이상 낮을 때만 붙습니다.` };
    }

    case "sourcesBelow":
      return f.surveys < c.n
        ? { ok: true, why: `관찰 설문이 ${f.surveys}건입니다. ${c.n}건 미만이면 붙습니다.` }
        : {
            ok: false,
            why: `관찰 설문이 ${f.surveys}건 들어왔습니다. ${c.n}건 미만일 때만 붙습니다.`,
          };

    case "cross": {
      if (r.cell === null || r.paper === null || r.talent === null) {
        return {
          ok: false,
          why: r.top
            ? "본 과목이 하나라 학력과 재능을 견줄 수 없습니다."
            : "측정한 축이 없습니다.",
        };
      }
      const cell = kit.cross.find((x) => x.id === r.cell);
      const paperSide =
        r.paper < kit.crossCuts.paper
          ? `${kit.crossCuts.paper}점 미만`
          : `${kit.crossCuts.paper}점 이상`;
      const talentSide =
        r.talent >= kit.crossCuts.talent
          ? `${kit.crossCuts.talent}점 이상`
          : `${kit.crossCuts.talent}점 미만`;
      const line = `학력 ${r.paper}점(${paperSide}) × 재능 ${r.talent}점(${talentSide})은 「${cell?.label ?? r.cell}」 칸입니다.`;
      return cell?.on
        ? { ok: true, why: line }
        : { ok: false, why: `${line} 이 칸은 꺼져 있어 붙지 않습니다.` };
    }
  }
}

function stepOf(rule: Rule, f: Facts, r: Reading, kit: Kit): Step {
  if (!rule.on) return { rule, fired: false, why: "꺼 둔 규칙입니다." };

  const { ok, why } = check(rule, f, r, kit);
  if (!ok) return { rule, fired: false, why };

  const head = { id: `b-${rule.id}`, rule: `${rule.id} · ${rule.label}`, evidence: why, ruleId: rule.id };

  /* 교차 해석은 학년이 아니라 걸린 칸이 문구를 든다 */
  if (rule.slot === "cross") {
    const cell = kit.cross.find((x) => x.id === r.cell)!;
    if (!cell.text.trim()) {
      return { rule, fired: false, why: `${why} 그런데 이 칸의 문구가 비어 있습니다.`, missing: `cross:${cell.id}` };
    }
    return {
      rule,
      fired: true,
      why,
      block: {
        ...head,
        section: "교차 해석",
        title: cell.title || cell.label,
        text: cell.text,
        source: `cross:${cell.id}`,
        axis: null,
        band: null,
        findings: labelCheck(cell.text),
      },
    };
  }

  const slot = slotIn(kit, rule.slot);
  if (!slot) return { rule, fired: false, why: "이 규칙이 채우는 항목이 없습니다." };

  /* 어느 축 · 어느 밴드의 문구인가 — 낮은 축 규칙만 가장 낮은 축을 본다 */
  const who = rule.cond.kind === "lowAxis" ? r.low : r.top;
  const axis = slot.byAxis ? (who?.axis ?? null) : null;
  const band = slot.byBand ? (who?.band ?? null) : null;
  if ((slot.byAxis && !axis) || (slot.byBand && !band)) {
    return { rule, fired: false, why: "측정한 축이 없어 고를 문구가 없습니다." };
  }

  let found = kit.template(rule.slot, f.grade, axis, band);
  let fellBack: TemplateGrade | undefined;
  if (!found) {
    for (const g of fallbacksOf(f.grade)) {
      const back = kit.template(rule.slot, g, axis, band);
      if (back) {
        found = back;
        fellBack = g;
        break;
      }
    }
  }
  if (!found || !found.text.trim()) {
    return {
      rule,
      fired: false,
      why: `${why} 그런데 넣을 문구가 아직 없습니다.`,
      missing: keyOf(rule.slot, f.grade, axis, band),
    };
  }

  return {
    rule,
    fired: true,
    why,
    block: {
      ...head,
      section: slot.section,
      title: found.title || slot.label,
      text: found.text,
      source: found.id,
      ...(fellBack ? { fellBack } : {}),
      axis,
      band,
      findings: labelCheck(found.text),
    },
  };
}

/** 답안지 한 장을 리포트 한 벌로 */
export function assemble(f: Facts, kit: Kit): Assembly {
  const reading = readFacts(f, kit);
  const notes: string[] = [];
  if (f.offGrade) {
    notes.push(
      `${f.offGrade}은 대상 학년(초등 3~6학년)이 아니어서 ${gradeLabel(f.grade)} 문구로 조립했습니다.`,
    );
  }
  if (!reading.top) notes.push("측정한 축이 없어 유형을 정하지 않았습니다.");
  if (reading.tieTop && reading.top) {
    notes.push(
      `가장 높은 점수가 같은 축이 있어, 정해 둔 축 차례(${axisOrderText})에 따라 ${reading.top.label}를 가장 높은 축으로 읽었습니다.`,
    );
  }
  return { reading, steps: kit.rules.map((rule) => stepOf(rule, f, reading, kit)), notes };
}

/** 조립 결과에서 리포트에 서는 문단만 — 차례대로 */
export function blocksOf(a: Assembly): AssembledBlock[] {
  return a.steps.flatMap((s) => {
    const b = s.block;
    if (!b) return [];
    return [
      {
        id: b.id,
        section: b.section,
        title: b.title,
        rule: b.rule,
        evidence: b.evidence,
        text: b.text,
        ruleId: b.ruleId,
        source: b.source,
        ...(b.fellBack ? { fellBack: b.fellBack } : {}),
      },
    ];
  });
}

/** 붙지 않은 규칙 — 리포트에 함께 남겨 「왜 이 문단이 없나」에 답한다 */
export type Skipped = { ruleId: string; label: string; why: string };

export const skippedOf = (a: Assembly): Skipped[] =>
  a.steps
    .filter((s) => !s.fired)
    .map((s) => ({ ruleId: s.rule.id, label: s.rule.label, why: s.why }));

/** 두 답안지에서 읽은 값이 같은가 — 다시 채점해 점수가 바뀌었는지를 본다 */
export function sameFacts(a: Facts | undefined, b: Facts | undefined) {
  if (!a || !b) return a === b;
  const line = (f: Facts) =>
    `${f.grade}|${f.surveys}|${f.scores
      .map((s) => `${s.axis}=${s.score}`)
      .sort()
      .join(",")}`;
  return line(a) === line(b);
}

/* ───────────────────────── 처음 값 ───────────────────────── */

const seedTemplateMap = new Map(seedTemplates.map((t) => [t.id, t]));

/**
 * 운영자가 아무것도 고치지 않았을 때의 한 벌 — 디자인 보기와 씨앗 리포트가 쓴다.
 *
 * 씨앗 리포트는 저장소를 읽지 않고 이 값으로 조립한다. 서버와 브라우저가 같은 목록으로
 * 시작해야 하기 때문이다 — 운영자가 고친 규칙은 화면이 열린 뒤에 발행 전 리포트에 반영된다
 * (lib/reportStore.ts의 syncWaitingReports).
 */
export const seedKit: Kit = {
  rules: [...seedRules].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)),
  cuts: defaultCuts,
  crossCuts: defaultCrossCuts,
  cross: seedCross,
  slots: seedSlots,
  template: (slot, grade, axis, band) => {
    const t = seedTemplateMap.get(keyOf(slot, grade, axis, band));
    return t ? { id: t.id, title: t.title, text: t.text } : null;
  },
};

/* ───────────────────────── 고치는 한 벌 ───────────────────────── */

/**
 * 조립 규칙 화면이 한 번에 고치는 것 — 컷 둘, 규칙의 차례 · 조건 숫자 · 사용, 교차 셀.
 *
 * 문구(해석 템플릿)는 여기 없다. 글을 쓰는 자리와 「언제 부를지」를 정하는 자리를 갈라 둔
 * 까닭은 lib/admin2.ts에 적어 두었다.
 */
export type RuleSet = {
  cuts: BandCuts;
  crossCuts: CrossCuts;
  rules: Rule[];
  cross: CrossCellRule[];
};

const byOrder = (a: Rule, b: Rule) => a.order - b.order || a.id.localeCompare(b.id);

export const ruleSetOf = (kit: Kit): RuleSet => ({
  cuts: kit.cuts,
  crossCuts: kit.crossCuts,
  rules: kit.rules,
  cross: kit.cross,
});

/** 고치는 중인 값을 얹은 한 벌 — 저장하기 전에 미리 조립해 보는 데 쓴다 */
export const withRuleSet = (kit: Kit, set: RuleSet): Kit => ({
  ...kit,
  ...set,
  rules: [...set.rules].sort(byOrder),
});

const whole = (v: number, min: number, max: number) => Number.isInteger(v) && v >= min && v <= max;

/**
 * 이대로 저장할 수 없는 까닭 — 없으면 null.
 *
 * 화면이 저장 단추를 잠그는 데 쓰고, 저장소도 같은 검사를 한 번 더 한다. 숫자 하나가 틀리면
 * 그 뒤에 조립되는 리포트가 전부 달라지므로, 반쯤 친 값이 저장되지 않게 한다.
 */
export function ruleSetError(set: RuleSet): string | null {
  const { cuts, crossCuts } = set;
  if (!whole(cuts.L3, 2, 100) || !whole(cuts.L2, 1, 99) || cuts.L3 <= cuts.L2) {
    return "발현 밴드 컷은 1~100점 사이의 숫자여야 하고, L2 컷이 L3 컷보다 낮아야 합니다.";
  }
  if (!whole(crossCuts.paper, 1, 100) || !whole(crossCuts.talent, 1, 100)) {
    return "교차 셀의 학력 컷과 재능 컷은 1~100점 사이의 숫자여야 합니다.";
  }
  for (const r of set.rules) {
    if (!Number.isFinite(r.order)) return `${r.id} 규칙의 차례를 숫자로 적어 주세요.`;
    if (r.locked && !r.on) return `${r.id} 규칙은 끌 수 없습니다.`;
    if (r.cond.kind === "sourcesBelow" && !whole(r.cond.n, 1, 3)) {
      return `${r.id} 규칙의 관찰 설문 건수는 1~3 사이여야 합니다.`;
    }
    if (r.cond.kind === "lowAxis" && !whole(lowGapOf(r.cond), 1, 100)) {
      return `${r.id} 규칙의 점수 차는 1~100 사이여야 합니다.`;
    }
  }
  for (const c of set.cross) {
    if (!c.text.trim()) return `교차 셀 「${c.label}」의 문구가 비어 있습니다.`;
    if (!c.title.trim()) return `교차 셀 「${c.label}」의 리포트 제목이 비어 있습니다.`;
    if (labelCheck(`${c.title} ${c.text}`).some((x) => x.tone === "block")) {
      return `교차 셀 「${c.label}」의 문구에 검토가 필요한 표현이 있습니다.`;
    }
  }
  return null;
}

/** 조건 둘이 같은가 — 갈래와 숫자를 견준다 */
export function sameCond(a: Rule["cond"], b: Rule["cond"]) {
  if (a.kind !== b.kind) return false;
  if (a.kind === "sourcesBelow" && b.kind === "sourcesBelow") return a.n === b.n;
  if (a.kind === "lowAxis" && b.kind === "lowAxis") return lowGapOf(a) === lowGapOf(b);
  return true;
}

/** 고친 것이 있는가 */
export function sameRuleSet(a: RuleSet, b: RuleSet) {
  return (
    a.cuts.L3 === b.cuts.L3 &&
    a.cuts.L2 === b.cuts.L2 &&
    a.crossCuts.paper === b.crossCuts.paper &&
    a.crossCuts.talent === b.crossCuts.talent &&
    a.rules.length === b.rules.length &&
    a.rules.every((r) => {
      const o = b.rules.find((x) => x.id === r.id);
      return !!o && o.order === r.order && o.on === r.on && sameCond(o.cond, r.cond);
    }) &&
    a.cross.every((c) => {
      const o = b.cross.find((x) => x.id === c.id);
      return !!o && o.on === c.on && o.text === c.text && o.title === c.title && o.next === c.next;
    })
  );
}

/**
 * 무엇을 무엇으로 고쳤는가 — 감사 로그에 한 줄로 적는다.
 * 「L3 컷 75 → 80 · R-12 꺼짐 · 교차 셀 「잠재-발현 갭」 문구 수정」
 */
export function ruleSetDiff(was: RuleSet, next: RuleSet): string {
  const out: string[] = [];
  if (was.cuts.L3 !== next.cuts.L3) out.push(`L3 컷 ${was.cuts.L3} → ${next.cuts.L3}`);
  if (was.cuts.L2 !== next.cuts.L2) out.push(`L2 컷 ${was.cuts.L2} → ${next.cuts.L2}`);
  if (was.crossCuts.paper !== next.crossCuts.paper) {
    out.push(`학력 컷 ${was.crossCuts.paper} → ${next.crossCuts.paper}`);
  }
  if (was.crossCuts.talent !== next.crossCuts.talent) {
    out.push(`재능 컷 ${was.crossCuts.talent} → ${next.crossCuts.talent}`);
  }
  for (const r of next.rules) {
    const o = was.rules.find((x) => x.id === r.id);
    if (!o) continue;
    if (o.order !== r.order) out.push(`${r.id} 차례 ${o.order} → ${r.order}`);
    if (o.on !== r.on) out.push(`${r.id} ${r.on ? "켜짐" : "꺼짐"}`);
    if (!sameCond(o.cond, r.cond)) {
      const num = (c: Rule["cond"]) =>
        c.kind === "sourcesBelow" ? `${c.n}건` : c.kind === "lowAxis" ? `${lowGapOf(c)}점` : "";
      out.push(`${r.id} 조건 ${num(o.cond)} → ${num(r.cond)}`);
    }
  }
  for (const c of next.cross) {
    const o = was.cross.find((x) => x.id === c.id);
    if (!o) continue;
    if (o.on !== c.on) out.push(`교차 셀 「${c.label}」 ${c.on ? "켜짐" : "꺼짐"}`);
    if (o.text !== c.text || o.title !== c.title || o.next !== c.next) {
      out.push(`교차 셀 「${c.label}」 문구 수정`);
    }
  }
  return out.join(" · ");
}

/* ───────────────────────── 점검 ─────────────────────────
   「지금 규칙과 문구로 조립하면 빠지는 것이 없는가」를 조립하기 전에 본다. 규칙이 고를 수 있는
   칸을 전부 세워, 그 학년의 문구가 있는지 · 다른 학년 것으로 대신하는지 · 아예 없는지를 가른다.
   아이의 리포트가 나간 뒤에야 빈 문단을 발견하는 일을 막는 자리다. */

export type Gap = {
  /**
   *   missing   어느 학년에도 문구가 없다 — 이 조건에 해당하는 리포트에서 문단이 빠진다
   *   fallback  그 학년의 문구가 없어 다른 학년 문구가 나간다
   *   blocked   검토가 필요한 표현이 들어 있다 — 이 문구가 든 리포트는 자동 발행에서 빠진다
   */
  kind: "missing" | "fallback" | "blocked";
  rule: string;
  /** 비어 있거나 걸린 칸 — 해석 템플릿 칸의 열쇠, 교차 셀이면 「cross:gap」 */
  source: string;
  /** 「초등 5학년 · 자연·탐구 · L2」 */
  where: string;
  /** 대신 쓰는 학년 */
  from?: TemplateGrade;
};

export function coverage(kit: Kit): { cells: number; ready: number; gaps: Gap[] } {
  const gaps: Gap[] = [];
  let cells = 0;
  let ready = 0;

  for (const rule of kit.rules) {
    if (!rule.on) continue;

    if (rule.slot === "cross") {
      for (const cell of kit.cross) {
        /* 2×2 밖의 칸(배제영역)은 조립에서 걸리지 않는다. 꺼 둔 칸도 문단을 만들지 않는다 */
        if (cell.paper === null || !cell.on) continue;
        cells += 1;
        const source = `cross:${cell.id}`;
        if (!cell.text.trim()) {
          gaps.push({ kind: "missing", rule: rule.id, source, where: `교차 셀 · ${cell.label}` });
        } else if (labelCheck(cell.text).some((x) => x.tone === "block")) {
          gaps.push({ kind: "blocked", rule: rule.id, source, where: `교차 셀 · ${cell.label}` });
        } else ready += 1;
      }
      continue;
    }

    const slot = slotIn(kit, rule.slot);
    if (!slot) continue;
    for (const g of templateGrades) {
      for (const cell of cellsOf(slot)) {
        cells += 1;
        const where = [
          g.label,
          slot.label,
          cell.axis ? axisLabel(cell.axis) : null,
          cell.band,
        ]
          .filter(Boolean)
          .join(" · ");
        const source = keyOf(rule.slot, g.id, cell.axis, cell.band);
        const own = kit.template(rule.slot, g.id, cell.axis, cell.band);
        if (own?.text.trim()) {
          if (labelCheck(own.text).some((x) => x.tone === "block")) {
            gaps.push({ kind: "blocked", rule: rule.id, source, where });
          } else ready += 1;
          continue;
        }
        const from = fallbacksOf(g.id).find((x) =>
          kit.template(rule.slot, x, cell.axis, cell.band)?.text.trim(),
        );
        gaps.push(
          from
            ? { kind: "fallback", rule: rule.id, source, where, from }
            : { kind: "missing", rule: rule.id, source, where },
        );
      }
    }
  }

  return { cells, ready, gaps };
}

/* ───────────────────────── 달라진 것 ─────────────────────────
   규칙 · 문구 · 점수가 바뀌어 발행 전 리포트를 다시 조립하면 무엇이 달라지는가. 조립 규칙 화면은
   저장하기 전에 「몇 건이 달라지는지」를 세고, 리포트는 기록에 「어느 문단이 달라졌는지」를 남긴다.
   둘이 같은 셈을 쓴다. */

type Para = { id: string; ruleId?: string; section: string; title: string; text: string };

export type Change = { section: string; kind: "added" | "removed" | "changed" | "moved" };

/**
 * 회원이 읽는 것이 어떻게 달라지는가 — 문단이 생기고 빠지는 것, 제목과 문구, 차례.
 * 근거 줄만 달라진 것(컷을 옮겨 「75점 이상」이 「80점 이상」이 된 것)은 세지 않는다.
 */
export function changesOf(was: Para[], next: Para[]): Change[] {
  const key = (b: Para) => b.ruleId ?? b.id;
  const out: Change[] = [];
  for (const b of next) {
    const o = was.find((x) => key(x) === key(b));
    if (!o) out.push({ section: b.section, kind: "added" });
    else if (o.text !== b.text || o.title !== b.title) out.push({ section: b.section, kind: "changed" });
  }
  for (const o of was) {
    if (!next.some((x) => key(x) === key(o))) out.push({ section: o.section, kind: "removed" });
  }
  if (out.length === 0) {
    const a = was.map(key).join(">");
    const b = next.map(key).join(">");
    if (a !== b) out.push({ section: "문단 차례", kind: "moved" });
  }
  return out;
}

const CHANGE_WORD: Record<Change["kind"], string> = {
  added: "추가",
  removed: "제외",
  changed: "문구 변경",
  moved: "변경",
};

/** 「강하게 나타난 축(문구 변경) · 교차 해석(추가)」 */
export const changeText = (list: Change[]) =>
  list.map((c) => `${c.section}(${CHANGE_WORD[c.kind]})`).join(" · ");
