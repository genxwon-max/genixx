"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { n } from "@/lib/admin2";
import { labelCheck } from "@/lib/labelCheck";
import {
  assemble,
  axisOrderText,
  blocksOf,
  coverage,
  ruleSetError,
  ruleSetOf,
  sameRuleSet,
  withRuleSet,
  type Assembly,
  type Facts,
  type Gap,
  type Kit,
  type RuleSet,
} from "@/lib/reportAssembly";
import {
  bandOf,
  condText,
  gradeLabel,
  lowGapOf,
  measuredAxes,
  sourceText,
  templateGrades,
  type CrossCellRule,
  type CrossKey,
  type Rule,
  type TemplateGrade,
} from "@/lib/reportAssets";
import type { AxisId } from "@/lib/result";
import { LeaveDialog, PageSaveBar, useUnsavedGuard } from "./EditGuard";
import { PaperBlock, PaperHead } from "./ReportPaper";
import { Body, DescList, FormRow, PageHead, Panel, Status, Tag } from "./ui";

/**
 * ADM-08-4 조립 규칙 — 채점 결과가 어떤 차례로 어떤 문단이 되는지를 정하고, 그 자리에서 본다.
 *
 * 리포트의 글은 그때그때 짓지 않는다. 써 둔 문구(해석 템플릿 · 교차 셀)를 규칙이 골라 차례대로
 * 세운다(lib/reportAssembly.ts). 이 화면은 그 「고르는 기준」을 고치는 자리다.
 *
 *   왼쪽  기준   발현 밴드 컷 · 교차 셀 · 규칙(차례 · 넣는 조건과 문구 · 사용) · 점검
 *   오른쪽 결과   표본 하나를 놓고 — 읽은 값 → 규칙마다 붙었는지와 그 근거 → 「리포트 미리 보기」
 *
 * ── 표본은 과목 점수로 받는다 ──
 * 한동안 「가장 높은 축」과 「가장 낮은 축」을 손으로 골랐다. 실제 조립은 과목 점수에서 그것을
 * 읽어 내는데 표본은 결과를 직접 받으니, 높은 축과 낮은 축에 같은 축을 넣을 수도 있었고 실제로는
 * 나올 수 없는 조합의 리포트가 미리 보기에 섰다. 지금은 채점이 끝난 답안지가 주는 것(학년 ·
 * 과목 점수 · 관찰 설문 건수)만 받고 나머지는 조립과 같은 셈으로 읽는다.
 *
 * ── 고친 것은 저장을 눌러야 걸린다 ──
 * 숫자 하나가 그 뒤의 모든 리포트를 바꾸는 화면이다. 고치는 동안에는 오른쪽 결과만 달라지고,
 * 저장을 눌러야 실제 조립에 걸린다. 저장 줄에 「발행을 기다리는 리포트 몇 건이 달라지는지」를
 * 적는다 — 스케줄러(SchedulerBoard.tsx)와 같은 방식이다.
 *
 * ── 실제 회원의 점수를 불러오지 않는다 ──
 * 표본은 손으로 놓는 값과 몇 가지 예시뿐이다. 회원의 점수를 여기로 끌어오면 규칙을 고치는
 * 화면이 개인정보를 펴는 자리가 된다. 그 회원의 리포트가 어떻게 조립됐는지는 리포트 승인의
 * 상세(ReportView.tsx의 「조립 내역」)에서 본다.
 *
 * 값을 읽고 저장하는 일은 부르는 쪽이 한다. 실제 화면(app/(admin2)/admin2/reports/rules)은
 * 저장소를, 디자인 보기는 처음 값(lib/reportAssembly.ts의 seedKit)을 넘긴다.
 */

/* ───────────────────────── 표본 ───────────────────────── */

/** 표본 — 채점이 끝난 답안지 한 장이 조립에 주는 값. 점수가 null이면 그 과목을 응시하지 않았다 */
export type Sample = {
  grade: TemplateGrade;
  scores: Partial<Record<AxisId, number | null>>;
  surveys: number;
};

export const samplePresets: { id: string; label: string; sample: Sample }[] = [
  {
    id: "clear",
    label: "한 축이 뚜렷한 학생",
    sample: { grade: "e4", scores: { language: 78, logic: 71, nature: 64 }, surveys: 2 },
  },
  {
    id: "gap",
    label: "전체 점수는 낮고 한 축만 높은 학생",
    sample: { grade: "e4", scores: { language: 38, logic: 30, nature: 74 }, surveys: 0 },
  },
  {
    id: "even",
    label: "세 축이 고른 학생",
    sample: { grade: "e5", scores: { language: 62, logic: 66, nature: 60 }, surveys: 1 },
  },
  {
    id: "low",
    label: "모든 축이 낮게 나온 학생",
    sample: { grade: "e3", scores: { language: 42, logic: 38, nature: 45 }, surveys: 0 },
  },
  {
    id: "single",
    label: "한 과목만 응시한 학생",
    sample: { grade: "e6", scores: { language: null, logic: 82, nature: null }, surveys: 1 },
  },
];

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

export function factsOfSample(s: Sample): Facts {
  return {
    grade: s.grade,
    scores: measuredAxes.flatMap((a) => {
      const v = s.scores[a.id];
      return v == null || Number.isNaN(v) ? [] : [{ axis: a.id, score: clamp(v) }];
    }),
    surveys: s.surveys,
  };
}

const sameSample = (a: Sample, b: Sample) =>
  a.grade === b.grade &&
  a.surveys === b.surveys &&
  measuredAxes.every((x) => (a.scores[x.id] ?? null) === (b.scores[x.id] ?? null));

const gradeShort = (g: TemplateGrade) => templateGrades.find((x) => x.id === g)?.short ?? g;

/* ───────────────────────── 화면 ───────────────────────── */

export default function RuleBoard({
  kit,
  stamp,
  draft: startDraft,
  sample: startSample,
  openCell,
  previewing,
  onPreview,
  onPreviewClose,
  effect,
  templatesHref,
  templateHref,
  guarded = false,
  onSave,
  children,
}: {
  /** 지금 저장돼 있는 한 벌 — 규칙 · 컷 · 교차 셀 · 문구 */
  kit: Kit;
  /** 마지막으로 저장한 때와 사람 — 한 번도 고치지 않았으면 없다 */
  stamp?: { at: string; by: string } | null;
  /** 처음부터 고쳐져 있을 값 — 디자인 보기가 「고치는 중」을 그릴 때만 넘긴다 */
  draft?: RuleSet;
  sample?: Sample;
  /** 처음부터 열려 있을 교차 셀 */
  openCell?: CrossKey;
  /** 「리포트 미리 보기」 창이 열려 있는가 */
  previewing: boolean;
  onPreview: () => void;
  onPreviewClose: () => void;
  /** 이렇게 바꾸면 발행을 기다리는 리포트 가운데 몇 건의 내용이 달라지는가 */
  effect?: (next: Kit) => { waiting: number; changed: number };
  templatesHref: string;
  /** 문구가 든 칸으로 가는 주소 — 없으면 링크를 두지 않는다 */
  templateHref?: (source: string) => string | null;
  /** 고치다 만 채로 나가려 할 때 붙잡는가 — 실제 화면만 켠다 */
  guarded?: boolean;
  onSave: (next: RuleSet) => boolean | void;
  /** 판 아래에 붙일 것 — 예시 자료 고지 */
  children?: React.ReactNode;
}) {
  const saved = useMemo(() => ruleSetOf(kit), [kit]);
  const [base, setBase] = useState(saved);
  const [draft, setDraft] = useState<RuleSet>(startDraft ?? saved);
  /* 저장된 값이 바뀌면(방금 저장했거나 다른 창에서 고쳤다) 초안을 그 값에서 다시 뜬다 */
  if (!sameRuleSet(base, saved)) {
    setBase(saved);
    setDraft(saved);
  }

  const [sample, setSample] = useState<Sample>(startSample ?? samplePresets[0].sample);
  const [open, setOpen] = useState<CrossKey | null>(openCell ?? null);

  const dirty = !sameRuleSet(draft, saved);
  const error = useMemo(() => ruleSetError(draft), [draft]);
  /* 값이 어긋난 동안에는 저장된 값으로 조립해 보인다 — 반쯤 친 컷으로 그린 결과는 아무 뜻이 없다 */
  const live = useMemo(() => (error ? kit : withRuleSet(kit, draft)), [kit, draft, error]);

  const facts = useMemo(() => factsOfSample(sample), [sample]);
  const asm = useMemo(() => assemble(facts, live), [facts, live]);
  const check = useMemo(() => coverage(live), [live]);
  const impact = useMemo(() => (dirty && !error && effect ? effect(live) : null), [dirty, error, effect, live]);

  const save = () => {
    if (error || !dirty) return false;
    return onSave(draft) !== false;
  };
  const reset = () => setDraft(saved);
  const guard = useUnsavedGuard(guarded && dirty, save, reset);

  const setRule = (id: string, change: Partial<Rule>) =>
    setDraft((d) => ({ ...d, rules: d.rules.map((r) => (r.id === id ? { ...r, ...change } : r)) }));
  const setCell = (id: CrossKey, change: Partial<CrossCellRule>) =>
    setDraft((d) => ({ ...d, cross: d.cross.map((c) => (c.id === id ? { ...c, ...change } : c)) }));

  const on = draft.rules.filter((r) => r.on).length;
  const preset = samplePresets.find((p) => sameSample(p.sample, sample));
  const blocks = blocksOf(asm);

  return (
    <>
      <PageHead
        title="조립 규칙"
        actions={
          <Link href={templatesHref} className="a2-btn">
            해석 템플릿
          </Link>
        }
      />

      <Body className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_27rem]">
        {/* ───────── 기준 ───────── */}
        <div className="grid content-start gap-3">
          <Panel
            title="발현 밴드 컷"
            meta={<span className="max-sm:hidden">축 점수를 세 단계로 가르는 점수</span>}
            flush
          >
            <div className="a2-form" style={{ borderTop: 0 }}>
              <FormRow label="L3 뚜렷하게 나타남">
                <Num
                  label="L3 컷"
                  value={draft.cuts.L3}
                  onChange={(v) => setDraft((d) => ({ ...d, cuts: { ...d.cuts, L3: v } }))}
                />
                <span className="a2-t-sm text-(--a2-ink-3)">점 이상</span>
              </FormRow>
              <FormRow label="L2 나타나는 중">
                <Num
                  label="L2 컷"
                  value={draft.cuts.L2}
                  onChange={(v) => setDraft((d) => ({ ...d, cuts: { ...d.cuts, L2: v } }))}
                />
                <span className="a2-t-sm text-(--a2-ink-3)">점 이상 · L3 컷 미만</span>
              </FormRow>
              <FormRow label="L1 덜 나타남">
                <span className="a2-t-sm text-(--a2-ink-3)">L2 컷 미만</span>
              </FormRow>
            </div>
          </Panel>

          <CrossPanel
            set={draft}
            here={asm.reading.cell}
            open={open}
            onOpen={setOpen}
            onCuts={(crossCuts) => setDraft((d) => ({ ...d, crossCuts }))}
            onCell={setCell}
          />

          <Panel title="규칙" meta={`${on}/${draft.rules.length} 켜짐 · 차례가 작은 것부터 리포트에 들어갑니다`} flush>
            <div className="a2-table-wrap">
              <table className="a2-table">
                <thead>
                  <tr>
                    <th style={{ width: "4.5rem" }}>차례</th>
                    <th style={{ width: "10rem" }}>규칙</th>
                    <th>넣는 조건과 문구</th>
                    <th style={{ width: "6.5rem" }}>사용</th>
                  </tr>
                </thead>
                <tbody>
                  {/* 줄의 차례는 저장된 값을 따른다 — 차례 숫자를 치는 동안 줄이 자리를 옮기면
                      치던 칸이 손 밑에서 달아난다. 바뀐 차례는 오른쪽 결과에서 본다 */}
                  {kit.rules.map((was) => {
                    const r = draft.rules.find((x) => x.id === was.id) ?? was;
                    return (
                      <tr key={r.id} data-on={r.on ? undefined : "false"}>
                        <td>
                          <Num
                            label={`${r.id} 차례`}
                            value={r.order}
                            width="3.5rem"
                            onChange={(v) => setRule(r.id, { order: v })}
                          />
                        </td>
                        <td className="a2-td-key">
                          <span title={r.desc}>{r.label}</span>
                          <span className="mt-0.5 block a2-mono a2-t-xs font-normal text-(--a2-ink-4)">
                            {r.id}
                          </span>
                        </td>
                        {/* 조건과 문구를 한 칸에 위아래로 둔다. 칸을 둘로 가르면 판이 좁을 때 조건이
                            석 줄로 접혀, 숫자 칸이 글 사이에 끼어 읽히지 않는다 */}
                        <td>
                          <Cond rule={r} onChange={(cond) => setRule(r.id, { cond })} />
                          <span className="mt-1 block a2-t-xs text-(--a2-ink-4)">{sourceText(r)}</span>
                        </td>
                        <td className="a2-nowrap">
                          {r.locked ? (
                            <span title={r.locked}>
                              <Status tone="muted">항상 켜짐</Status>
                            </span>
                          ) : (
                            <label className="a2-choice">
                              <input
                                type="checkbox"
                                aria-label={`${r.id} ${r.label} 사용`}
                                checked={r.on}
                                onChange={(e) => setRule(r.id, { on: e.target.checked })}
                              />
                              {r.on ? "켜짐" : "꺼짐"}
                            </label>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          <CheckPanel
            cells={check.cells}
            ready={check.ready}
            gaps={check.gaps}
            templatesHref={templatesHref}
            templateHref={templateHref}
          />
        </div>

        {/* ───────── 결과 ───────── */}
        <div className="grid content-start gap-3">
          <Panel title="표본" meta="채점이 끝난 답안지 한 장" flush>
            <div className="a2-form" style={{ borderTop: 0 }}>
              <FormRow label="예시">
                <select
                  className="a2-select"
                  aria-label="표본 예시"
                  value={preset?.id ?? ""}
                  onChange={(e) => {
                    const hit = samplePresets.find((p) => p.id === e.target.value);
                    if (hit) setSample(hit.sample);
                  }}
                >
                  {!preset && <option value="">직접 입력한 값</option>}
                  {samplePresets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </FormRow>
              <FormRow label="학년">
                <select
                  className="a2-select"
                  style={{ maxWidth: "10rem" }}
                  aria-label="표본 학년"
                  value={sample.grade}
                  onChange={(e) => setSample({ ...sample, grade: e.target.value as TemplateGrade })}
                >
                  {templateGrades.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </FormRow>
              <FormRow label="과목 점수" hint="비워 두면 그 과목을 응시하지 않은 것으로 봅니다.">
                <span className="grid w-full gap-1.5">
                  {measuredAxes.map((a) => (
                    <span key={a.id} className="flex items-center gap-2">
                      <span className="w-24 shrink-0 a2-t-sm text-(--a2-ink-2)">
                        {subjectName(a.id)} <span className="text-(--a2-ink-4)">· {a.label}</span>
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        className="a2-input a2-mono"
                        style={{ maxWidth: "5rem" }}
                        aria-label={`${subjectName(a.id)} 점수`}
                        placeholder="미응시"
                        value={sample.scores[a.id] ?? ""}
                        onChange={(e) =>
                          setSample({
                            ...sample,
                            scores: {
                              ...sample.scores,
                              [a.id]: e.target.value === "" ? null : Number(e.target.value),
                            },
                          })
                        }
                      />
                      <span className="a2-t-sm text-(--a2-ink-3)">점</span>
                    </span>
                  ))}
                </span>
              </FormRow>
              <FormRow label="관찰 설문">
                <select
                  className="a2-select"
                  style={{ maxWidth: "6rem" }}
                  aria-label="표본 관찰 설문 건수"
                  value={sample.surveys}
                  onChange={(e) => setSample({ ...sample, surveys: Number(e.target.value) })}
                >
                  {[0, 1, 2].map((k) => (
                    <option key={k} value={k}>
                      {k}건
                    </option>
                  ))}
                </select>
                <span className="a2-t-sm text-(--a2-ink-3)">학부모 · 지도교사</span>
              </FormRow>
            </div>
          </Panel>

          <Panel title="읽은 값" meta="점수에서 읽어 낸 것 — 규칙은 이 값만 봅니다">
            <Reading
              asm={asm}
              surveys={facts.surveys}
              cell={live.cross.find((c) => c.id === asm.reading.cell) ?? null}
            />
          </Panel>

          <Panel
            title="조립 결과"
            meta={`문단 ${blocks.length}개`}
            actions={
              <button
                type="button"
                className="a2-btn a2-btn-sm a2-btn-primary"
                disabled={blocks.length === 0}
                onClick={onPreview}
              >
                리포트 미리 보기
              </button>
            }
            flush
          >
            <ul className="divide-y divide-(--a2-line)">
              {asm.steps.map((s) => (
                <li key={s.rule.id} className="p-3">
                  <p className="flex flex-wrap items-center gap-1.5">
                    <span className="a2-mono a2-t-xs text-(--a2-ink-4)">{s.rule.id}</span>
                    {s.block ? (
                      <>
                        <span className="a2-t-sm font-semibold text-(--a2-ink)">{s.block.title}</span>
                        <span className="a2-t-xs text-(--a2-ink-3)">{s.block.section}</span>
                        {s.block.band && <Tag>{s.block.band}</Tag>}
                        {s.block.fellBack && (
                          <Status tone="warn">{gradeShort(s.block.fellBack)} 문구로 대체</Status>
                        )}
                        {s.block.findings.some((f) => f.tone === "block") && (
                          <Status tone="danger">검토필요</Status>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="a2-t-sm text-(--a2-ink-3)">{s.rule.label}</span>
                        <Status tone={s.missing ? "warn" : "muted"}>
                          {s.missing ? "빈 칸" : "제외"}
                        </Status>
                      </>
                    )}
                  </p>
                  {s.block && (
                    <p className="mt-1 a2-t-sm leading-[1.7] text-(--a2-ink-2)">{s.block.text}</p>
                  )}
                  <p className="mt-1 a2-t-xs leading-[1.6] text-(--a2-ink-4)">{s.why}</p>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </Body>

      <PageSaveBar
        dirty={dirty}
        onSave={save}
        onCancel={reset}
        disabled={!!error}
        note={
          error
            ? error
            : dirty
              ? impact
                ? impact.waiting === 0
                  ? "저장하면 앞으로 조립하는 리포트부터 적용됩니다."
                  : `저장하면 발행을 기다리는 리포트 ${n(impact.waiting)}건 가운데 ${n(impact.changed)}건의 내용이 달라집니다. 이미 발행한 리포트는 바뀌지 않습니다.`
                : "저장하면 발행을 기다리는 리포트와 앞으로 조립하는 리포트에 적용됩니다."
              : stamp
                ? `마지막 변경 ${stamp.at} · ${stamp.by}`
                : "처음 정해 둔 값입니다."
        }
      />
      <LeaveDialog guard={guard} />

      {children}

      {previewing && (
        <PreviewDialog
          asm={asm}
          grade={sample.grade}
          dirty={dirty}
          onClose={onPreviewClose}
        />
      )}
    </>
  );
}

/* ───────────────────────── 작은 조각 ───────────────────────── */

const SUBJECT: Partial<Record<AxisId, string>> = { language: "국어", logic: "수학", nature: "과학" };
const subjectName = (id: AxisId) => SUBJECT[id] ?? id;

/** 숫자 한 칸 — 비우면 NaN으로 넘긴다. 저장할 수 없는 값이라는 것은 화면 아래 저장 줄이 말한다 */
function Num({
  label,
  value,
  width = "5rem",
  onChange,
}: {
  label: string;
  value: number;
  width?: string;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="number"
      className="a2-input a2-mono"
      style={{ maxWidth: width }}
      aria-label={label}
      value={Number.isNaN(value) ? "" : value}
      onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))}
    />
  );
}

/** 넣는 조건 — 갈래는 바꾸지 못하고 그 안의 숫자만 고친다 */
function Cond({ rule, onChange }: { rule: Rule; onChange: (cond: Rule["cond"]) => void }) {
  const c = rule.cond;

  if (c.kind === "sourcesBelow") {
    return (
      <span className="flex flex-wrap items-center gap-1.5 a2-t-sm">
        <span>관찰 설문이</span>
        <Num
          label={`${rule.id} 관찰 설문 건수`}
          value={c.n}
          width="3.5rem"
          onChange={(v) => onChange({ ...c, n: v })}
        />
        <span>건 미만일 때</span>
      </span>
    );
  }

  if (c.kind === "lowAxis") {
    return (
      <span className="flex flex-wrap items-center gap-1.5 a2-t-sm">
        <span>가장 낮은 축이 가장 높은 축보다</span>
        <Num
          label={`${rule.id} 점수 차`}
          value={lowGapOf(c)}
          width="3.5rem"
          onChange={(v) => onChange({ ...c, gap: v })}
        />
        <span>점 이상 낮을 때</span>
      </span>
    );
  }

  return <span className="a2-t-sm text-(--a2-ink-2)">{condText(c)}</span>;
}

/** 점수에서 읽어 낸 것 — 높은 차례와 밴드, 유형, 학력 × 재능, 신뢰도 */
function Reading({
  asm,
  surveys,
  cell,
}: {
  asm: Assembly;
  surveys: number;
  /** 표본이 떨어지는 교차 셀 — 본 과목이 하나면 없다 */
  cell: CrossCellRule | null;
}) {
  const r = asm.reading;
  if (!r.top) {
    return <p className="a2-t-sm text-(--a2-ink-3)">과목 점수를 하나 이상 적어 주세요.</p>;
  }
  return (
    <DescList
      rows={[
        {
          k: "높은 차례",
          v: (
            <span className="grid gap-1">
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {r.ranked.map((a) => (
                  <span key={a.axis} className="inline-flex items-center gap-1">
                    <span>{a.label}</span>
                    <b className="a2-num">{a.score}</b>
                    <Tag>
                      {a.band} {bandOf(a.band).label}
                    </Tag>
                  </span>
                ))}
              </span>
              {r.tieTop && (
                <span className="a2-t-xs text-(--a2-ink-4)">
                  점수가 같은 축은 정해 둔 차례({axisOrderText})를 따릅니다.
                </span>
              )}
            </span>
          ),
        },
        {
          k: "재능 유형",
          v: (
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold">{r.typeName}</span>
              <Tag accent>{r.typeCode}</Tag>
            </span>
          ),
        },
        {
          k: "학력 × 재능",
          v:
            r.cell === null ? (
              <span className="text-(--a2-ink-3)">본 과목이 하나라 견주지 않습니다.</span>
            ) : (
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>
                  학력 <b className="a2-num">{r.paper}</b>점 × 재능{" "}
                  <b className="a2-num">{r.talent}</b>점
                </span>
                {cell && <Tag>{cell.label}</Tag>}
                {cell && !cell.on && <Status tone="muted">꺼짐</Status>}
              </span>
            ),
        },
        { k: "리포트 신뢰도", v: `${r.confidence} · 관찰 설문 ${surveys}건` },
      ]}
    />
  );
}

/**
 * 교차 셀 — 학력 × 재능 2×2.
 *
 * 네 칸을 목록으로 눕히면 두 축이 있다는 사실이 안 보인다. 이 판에서 확인하는 것은 칸 하나의
 * 문구가 아니라 「네 칸이 서로 다른 말을 하고 있는가」이고, 그것은 나란히 놓아야 보인다.
 * 배제영역 둘은 2×2 밖이라 아래에 따로 둔다 — 이번 진단에는 걸리지 않지만 자리를 비워 두지
 * 않는다.
 *
 * 표본이 떨어지는 칸에 「표본」을 표시한다. 오른쪽 표본의 점수를 바꾸면 이 표시가 따라 옮겨
 * 가므로, 지금 고치는 칸이 그 아이에게 가는 칸인지를 눈으로 맞출 수 있다.
 */
function CrossPanel({
  set,
  here,
  open,
  onOpen,
  onCuts,
  onCell,
}: {
  set: RuleSet;
  here: CrossKey | null;
  open: CrossKey | null;
  onOpen: (id: CrossKey | null) => void;
  onCuts: (cuts: RuleSet["crossCuts"]) => void;
  onCell: (id: CrossKey, change: Partial<CrossCellRule>) => void;
}) {
  const cells = set.cross;
  const cuts = set.crossCuts;
  const at = (paper: "high" | "low", talent: "high" | "low") =>
    cells.find((c) => c.paper === paper && c.talent === talent)!;
  const spare = cells.filter((c) => c.paper === null);
  const cell = cells.find((c) => c.id === open) ?? null;
  const findings = cell ? labelCheck(`${cell.title} ${cell.text}`) : [];

  const box = (c: CrossCellRule) => (
    <button
      key={c.id}
      type="button"
      className="grid content-start gap-1 border border-(--a2-line) bg-(--a2-panel) p-2.5 text-left"
      style={
        c.id === here
          ? { background: "var(--a2-accent-soft)", borderColor: "var(--a2-accent-line)" }
          : undefined
      }
      aria-pressed={open === c.id}
      onClick={() => onOpen(open === c.id ? null : c.id)}
    >
      <span className="flex flex-wrap items-center gap-1.5">
        <span className="a2-t-sm font-semibold text-(--a2-ink)">{c.label}</span>
        {c.id === here && <Tag accent>표본</Tag>}
        {!c.on && <Status tone="muted">꺼짐</Status>}
      </span>
      <span className="a2-t-xs text-(--a2-ink-3)">{c.desc}</span>
    </button>
  );

  return (
    <Panel
      title="교차 셀"
      meta={<span className="max-sm:hidden">본 과목이 둘 이상일 때 학력과 재능을 견줍니다</span>}
      flush
    >
      <div className="a2-form" style={{ borderTop: 0 }}>
        <FormRow label="학력">
          <span className="a2-t-sm text-(--a2-ink-2)">본 과목 점수의 평균이</span>
          <Num label="학력 컷" value={cuts.paper} onChange={(v) => onCuts({ ...cuts, paper: v })} />
          <span className="a2-t-sm text-(--a2-ink-2)">점 미만이면 부진</span>
        </FormRow>
        <FormRow label="재능">
          <span className="a2-t-sm text-(--a2-ink-2)">가장 높은 축의 점수가</span>
          <Num label="재능 컷" value={cuts.talent} onChange={(v) => onCuts({ ...cuts, talent: v })} />
          <span className="a2-t-sm text-(--a2-ink-2)">점 이상이면 강세</span>
        </FormRow>
      </div>

      <div className="border-t border-(--a2-line) p-3">
        {/* 2×2 — 세로가 학력, 가로가 재능 */}
        <div className="grid grid-cols-[4.5rem_1fr_1fr] gap-1.5">
          <span aria-hidden />
          <span className="a2-label text-center">재능 강세</span>
          <span className="a2-label text-center">재능 약세</span>

          <span className="a2-label flex items-center">학력 우수</span>
          {box(at("high", "high"))}
          {box(at("high", "low"))}

          <span className="a2-label flex items-center">학력 부진</span>
          {box(at("low", "high"))}
          {box(at("low", "low"))}

          <span className="a2-label flex items-center">배제영역</span>
          {spare.map((c) => box(c))}
        </div>

        {cell && (
          <div className="mt-3 border-t border-(--a2-line) pt-3">
            <div className="a2-form">
              <FormRow label="칸">
                <Tag accent>{cell.label}</Tag>
                <span className="a2-t-sm text-(--a2-ink-3)">{cell.desc}</span>
                <label className="a2-choice ml-auto">
                  <input
                    type="checkbox"
                    checked={cell.on}
                    onChange={(e) => onCell(cell.id, { on: e.target.checked })}
                  />
                  {cell.on ? "켜짐" : "꺼짐"}
                </label>
              </FormRow>
              <FormRow label="리포트 제목">
                <input
                  className="a2-input"
                  aria-label={`${cell.label} 리포트 제목`}
                  value={cell.title}
                  onChange={(e) => onCell(cell.id, { title: e.target.value })}
                />
              </FormRow>
              <FormRow label="리포트 문구">
                <textarea
                  className="a2-textarea"
                  rows={4}
                  aria-label={`${cell.label} 리포트 문구`}
                  value={cell.text}
                  onChange={(e) => onCell(cell.id, { text: e.target.value })}
                />
                {findings.map((f, k) => (
                  <span
                    key={`${f.word}-${k}`}
                    className="a2-note w-full"
                    style={{
                      borderLeftColor: f.tone === "block" ? "var(--a2-danger)" : "var(--a2-warn)",
                    }}
                  >
                    <span>
                      <b>「{f.word}」</b> {f.why}
                    </span>
                  </span>
                ))}
              </FormRow>
              <FormRow label="다음 단계" hint="운영자가 보는 안내입니다. 리포트에는 들어가지 않습니다.">
                <textarea
                  className="a2-textarea"
                  rows={2}
                  aria-label={`${cell.label} 다음 단계`}
                  value={cell.next}
                  onChange={(e) => onCell(cell.id, { next: e.target.value })}
                />
              </FormRow>
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}

const GAP_LABEL: Record<Gap["kind"], string> = {
  missing: "문구가 없어 문단이 빠지는 칸",
  fallback: "다른 학년 문구가 대신 들어가는 칸",
  blocked: "검토가 필요한 표현이 있는 칸",
};

const GAP_TONE: Record<Gap["kind"], "danger" | "warn"> = {
  missing: "danger",
  fallback: "warn",
  blocked: "danger",
};

/**
 * 점검 — 지금 규칙과 문구로 조립하면 빠지거나 대신 들어가는 것이 있는가.
 *
 * 규칙이 고를 수 있는 칸을 전부 세워 본 결과다(lib/reportAssembly.ts의 coverage). 아이의 리포트가
 * 나간 뒤에야 빈 문단을 발견하는 일을 막는 자리다. 칸을 채우는 일은 해석 템플릿에서 한다.
 */
function CheckPanel({
  cells,
  ready,
  gaps,
  templatesHref,
  templateHref,
}: {
  cells: number;
  ready: number;
  gaps: Gap[];
  templatesHref: string;
  templateHref?: (source: string) => string | null;
}) {
  const kinds: Gap["kind"][] = ["missing", "blocked", "fallback"];
  return (
    <Panel
      title="점검"
      meta={`규칙이 고를 수 있는 칸 ${n(cells)}개 가운데 ${n(ready)}개에 그 학년의 문구가 있습니다`}
      actions={
        <Link href={templatesHref} className="a2-btn a2-btn-sm">
          해석 템플릿
        </Link>
      }
    >
      {gaps.length === 0 ? (
        <p className="a2-t-sm text-(--a2-ink-2)">
          <Status tone="ok">정상</Status> 어느 조건에서도 빠지는 문단이 없습니다.
        </p>
      ) : (
        <ul className="grid gap-2.5">
          {kinds.map((kind) => {
            const list = gaps.filter((g) => g.kind === kind);
            if (list.length === 0) return null;
            return (
              <li key={kind}>
                <p className="flex flex-wrap items-center gap-1.5 a2-t-sm">
                  <Status tone={GAP_TONE[kind]}>{GAP_LABEL[kind]}</Status>
                  <b className="a2-num text-(--a2-ink)">{n(list.length)}칸</b>
                </p>
                <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 a2-t-xs text-(--a2-ink-3)">
                  {list.slice(0, 8).map((g) => {
                    const href = templateHref?.(g.source) ?? null;
                    const text =
                      g.kind === "fallback" && g.from
                        ? `${g.where} → ${gradeLabel(g.from)} 문구`
                        : g.where;
                    return (
                      <li key={`${g.rule}-${g.source}`}>
                        {href ? (
                          <Link href={href} className="underline">
                            {text}
                          </Link>
                        ) : (
                          text
                        )}
                      </li>
                    );
                  })}
                  {list.length > 8 && <li>그 밖에 {n(list.length - 8)}칸</li>}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

/**
 * 리포트 미리 보기 — 표본을 지금 규칙으로 조립하면 회원이 받는 모습.
 *
 * 리포트 승인의 「리포트 보기」 창과 같은 지면이다(ReportPaper.tsx). 여기서는 읽기만 한다 —
 * 문구를 고치는 자리는 해석 템플릿이고, 이 창은 고른 결과를 이어서 읽어 보는 자리다.
 */
function PreviewDialog({
  asm,
  grade,
  dirty,
  onClose,
}: {
  asm: Assembly;
  grade: TemplateGrade;
  dirty: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const blocks = blocksOf(asm);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/35 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="a2-rule-preview-title"
        className="a2-panel my-4 w-full max-w-[44rem]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="a2-panel-head">
          <div className="flex min-w-0 items-baseline gap-2">
            <h2 id="a2-rule-preview-title" className="a2-h">
              리포트 미리 보기
            </h2>
            <span className="truncate a2-t-xs text-(--a2-ink-4)">
              {dirty ? "저장하기 전의 규칙으로 조립했습니다" : "지금 규칙으로 조립했습니다"}
            </span>
          </div>
          <button type="button" className="a2-btn a2-btn-sm" onClick={onClose}>
            닫기
          </button>
        </div>

        <div className="a2-preview" style={{ maxHeight: "none" }}>
          <PaperHead
            line={`표본 · ${gradeLabel(grade)}`}
            name="표본 학생"
            typeName={asm.reading.typeName}
          />
          <div className="mt-5 grid gap-5">
            {blocks.map((b) => (
              <PaperBlock key={b.id} section={b.section} title={b.title} text={b.text} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
