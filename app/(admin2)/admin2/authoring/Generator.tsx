"use client";

import { useMemo, useState } from "react";
import { LEVELS, cardPoints, levelAllowed, type Level } from "@/lib/blueprint";
import {
  GENERATE_MAX,
  SET_MAX,
  SIMILAR_MAX,
  blankQuestion,
  checkSpec,
  countOf,
  itemForms,
  stateLabel,
  typeLabel,
  unitStandards,
  withUnitStandard,
  type GenerateSpec,
  type ItemDraft,
  type ItemForm,
  type Question,
} from "@/lib/itemStore";
import DataTable, { type Col, type Filter } from "@/components/admin2/DataTable";
import GrowTextarea from "@/components/admin2/GrowTextarea";
import { FormRow, Panel } from "@/components/admin2/ui";
import BandUnitRows, { type BandUnit } from "../items/[id]/BandUnitRows";
import LevelCounts from "../items/[id]/LevelCounts";
import { QuestionClassRows } from "../items/[id]/QuestionEditor";

/**
 * AI 문항 출제 (EXP-02-2) — 출제 화면 안에서 펼치는 판.
 *
 * ── 문항 상세와 같은 칸으로 받는다 ──
 * 뽑은 문항은 곧장 문항 상세(ADM-04-1)로 들어가 고친다. 그런데 생성 판은 한동안 제 칸을 따로
 * 세웠다 — 과목 고르개 · 손으로 적는 단원 · 코드 한 칸짜리 Tag A. 그래서 뽑을 때 고른 것과
 * 열어서 고치는 것의 이름 · 차례가 달랐고, 손으로 적은 단원은 문항 상세에서 「목록 밖」으로 섰다.
 * 이제 두 화면이 같은 줄을 쓴다 —
 *
 *   문항 구성   단일 · 세트 + 단계별 문항 수(LevelCounts)
 *   분류        학년 · 교과 단원(BandUnitRows) · Tag A · Tag B · 난이도(QuestionClassRows)
 *   원안지 항목  그림·삽화 사양 · 이 문항의 특성
 *   출제 지시
 *
 * 과목 줄은 없다. 교과 단원을 고르면 과목이 따라온다(문항 상세와 같다).
 *
 * ── 단일도 세트도 S1~S4를 골라 뽑는다. 나오는 꼴만 다르다 ──
 * 두 구성 모두 문항 구성 줄에서 S1~S4를 몇 문항씩 뽑을지 적는다.
 *   단일   고른 수만큼 **단일 문항이 따로** 생긴다. S1 하나 · S3 하나면 서로 다른 문제 둘이다.
 *   세트   고른 문항을 **세트 한 장**에 담는다. 보기 하나를 함께 읽고 S1 → S4 차례로 묻는다.
 *
 * 한동안 단일은 분류 판의 인지단계 · 형식 · 배점으로 한 문항만 뽑았다. 그러면 S1~S4를 한 벌씩
 * 만들려면 판을 네 번 채워야 했다. 이제 단일도 단계별 수를 받고, 그 대신 분류 판에서 인지단계 ·
 * 형식 · 배점 줄이 빠진다 — 분류 판 한 벌이 서로 다른 단계의 문항 여럿에 걸리므로 한 벌로 고를
 * 값이 아니다. 단계는 그 수가 정하고, 형식 · 배점은 단계마다 고정 매핑을 따른다. 다른 형식이
 * 필요하면 뽑은 뒤 문항 상세에서 고친다.
 *
 * ── 원안지 양식(10.22)의 칸 (2026-10-28) ──
 * 문항 상세에 얹은 칸 가운데 **뽑기 전에 정할 수 있는 것**만 여기에도 둔다 — 그림·삽화 사양(그림 없음 /
 * 그림 있음)과 이 문항의 특성(선택). 배점은 원안지의 고정 배점(cardPoints)이라 고르지 않고 문항 구성 줄
 * 아래에 적어만 둔다. 인정 · 불인정 예, NCIC · 2022 확인, 체크리스트 12항은 뽑은 문항을 사람이 읽고
 * 채운다. Tag B는 문항 상세처럼 직접 적은 글이 그대로 넘어간다(talentText).
 *
 * ── 비슷한 문항 만들기 (2026-10-28) ──
 * 맨 위에서 「새로 만들기 / 비슷한 문항 만들기」를 고른다. 비슷한 문항은 문항 은행의 문항을 여럿 골라,
 * 원본마다 1~3개씩 분류를 그대로 물려받은 초안을 만든다(lib/itemStore.ts generateSimilar). 문항 은행에서
 * 줄을 골라 「비슷한 문항 만들기」를 누르면 이 판이 그 문항을 고른 채로 열린다.
 *
 * 읽는 쪽과 그리는 쪽을 갈랐다 — 문항 목록과 만드는 손잡이(make · makeSimilar)는 부르는 쪽이 넘긴다.
 * 실제 화면(AuthoringView)은 저장소를, 디자인 보기(/design2/admin2/authoring)는 예시 값을 넘긴다.
 *
 * 규칙은 저장소와 한 벌로 쓴다(lib/itemStore.ts checkSpec) — 몇 문항까지 담을 수 있는지, 어떤
 * 축이 어떤 단계를 못 만드는지, 성취기준 코드 · 교과 단원이 학년과 맞는지를 여기서 다시 적지
 * 않는다. 화면과 저장소가 다른 규칙을 보면 화면이 통과시킨 것을 저장소가 막는 날이 온다.
 */

const NO_COUNTS: Record<Level, number> = { S1: 0, S2: 0, S3: 0, S4: 0 };

export type GenMode = "new" | "similar";

/** 처음 모습 — 문항 은행에서 골라 왔거나, 디자인 보기가 상태마다 정한다 */
export type GenStart = {
  mode?: GenMode;
  /** 비슷한 문항의 원본으로 골라 둔 문항 */
  chosen?: string[];
  per?: number;
  figure?: "none" | "has";
};

/** 원안지(10.22)의 고정 배점 — 고르는 값이 아니라 적어만 둔다 */
const pointsText = `배점은 원안지의 고정 배점 — ${LEVELS.map((l) => `${l} ${cardPoints[l]}점`).join(" · ")}.`;

export default function Generator({
  items,
  make,
  makeSimilar,
  onDone,
  onCancel,
  start,
}: {
  /** 문항 은행 — 비슷한 문항의 원본을 고르는 표가 읽는다 */
  items: ItemDraft[];
  /** 새로 만들기 — 실제 화면은 저장소의 generateItems */
  make: (spec: GenerateSpec) => ItemDraft[];
  /** 비슷한 문항 만들기 — 실제 화면은 저장소의 generateSimilar */
  makeSimilar: (ids: string[], per: number, brief: string) => ItemDraft[];
  onDone: (made: ItemDraft[]) => void;
  onCancel: () => void;
  start?: GenStart;
}) {
  const [mode, setMode] = useState<GenMode>(start?.mode ?? "new");
  const [chosen, setChosen] = useState<string[]>(start?.chosen ?? []);
  const [per, setPer] = useState(start?.per ?? 1);
  const [figure, setFigure] = useState<"none" | "has">(start?.figure ?? "none");
  const [trait, setTrait] = useState("");

  const [form, setForm] = useState<ItemForm>("single");
  const [place, setPlace] = useState<BandUnit>({
    band: "3-4",
    gradeNo: 3,
    subject: "국어",
    unit: "",
    unitNo: "",
    unitTerm: "",
  });
  /* 분류 판이 고치는 값 — 문항 상세와 같은 줄을 쓰려고 문항 한 칸의 꼴로 든다.
     난이도는 비워 둔 채 시작한다. 미리 골라 두면 「아무도 안 고른 것」과 구별되지 않는다 */
  const [q, setQ] = useState<Question>(() => blankQuestion([]));
  /* 단일과 세트가 한 벌을 나눠 쓴다. 단계를 골라 둔 채 구성을 바꿔도 고른 것이 남는다 */
  const [counts, setCounts] = useState<Record<Level, number>>(NO_COUNTS);
  const [brief, setBrief] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const isSet = form === "set";
  const total = countOf(counts);
  const spec: GenerateSpec = {
    form,
    subject: place.subject,
    band: place.band,
    gradeNo: place.gradeNo,
    unit: place.unit,
    unitNo: place.unitNo,
    unitTerm: place.unitTerm,
    b: q.b,
    talent: q.talent,
    subskill: q.subskill,
    standardCode: q.standardCode,
    standardText: q.standardText,
    tagADetail: q.tagADetail,
    tagAIntent: q.tagAIntent,
    talentText: q.talentText,
    /* 형식 · 배점은 넘기지 않는다 — 단일도 세트도 단계마다 고정 매핑을 따른다(머리 주석) */
    counts,
    brief,
    figure,
    trait,
  };

  const pickQ = (next: Question) => {
    /* 축을 바꾸면 그 축이 못 다루는 단계의 수를 비운다 — 남겨 두면 생성에서 막힌다.
       막고 나서 「자기-성찰 축은 S4를 만들 수 없습니다」를 읽게 하는 것보다 한 번 덜 막힌다 */
    if (next.talent !== q.talent) {
      setCounts((prev) => {
        const kept = { ...prev };
        for (const l of LEVELS) if (!levelAllowed(next.talent, l)) kept[l] = 0;
        return kept;
      });
    }
    setQ(next);
    setErrors([]);
  };

  const run = () => {
    if (mode === "similar") {
      if (chosen.length === 0) return setErrors(["비슷한 문항을 만들 원본을 한 개 이상 골라 주세요."]);
      return onDone(makeSimilar(chosen, per, brief));
    }
    const bad = checkSpec(spec);
    if (bad.length > 0) return setErrors(bad);
    onDone(make(spec));
  };

  const similarTotal = chosen.length * per;
  const ready = mode === "similar" ? similarTotal > 0 : total > 0;

  return (
    <div className="border-b border-(--a2-line) bg-(--a2-raised) px-3 py-3">
      <div className="grid gap-3">
        <Panel flush>
          <div className="a2-form a2-form-lg a2-card">
            <FormRow
              label="만드는 방법"
              hint={
                mode === "similar"
                  ? "문항 은행에서 원본을 여럿 고르면, 원본마다 분류를 그대로 물려받은 비슷한 문항이 초안으로 생깁니다."
                  : "분류와 단계별 문항 수를 정해 새 문항을 만듭니다."
              }
            >
              <div className="a2-cell-pad flex flex-wrap items-center gap-x-5 gap-y-1">
                {(
                  [
                    ["new", "새로 만들기"],
                    ["similar", "비슷한 문항 만들기"],
                  ] as const
                ).map(([id, label]) => (
                  <label key={id} className="a2-choice">
                    <input
                      type="radio"
                      name="gen-mode"
                      checked={mode === id}
                      onChange={() => {
                        setMode(id);
                        setErrors([]);
                      }}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </FormRow>
          </div>
        </Panel>

        {mode === "similar" ? (
          <SimilarPicker
            items={items}
            chosen={chosen}
            onChosen={(next) => {
              setChosen(next);
              setErrors([]);
            }}
            per={per}
            onPer={setPer}
          />
        ) : (
          <>
            <Panel flush>
              <div className="a2-form a2-form-lg a2-card">
                {/* 같은 단계별 수가 구성에 따라 다른 것을 만든다. 그 차이를 칸 아래 한 줄로 적는다 —
                    적지 않으면 단일에서 S1 · S2를 고른 사람이 세트 한 장을 기다린다 */}
                <FormRow
                  label="문항 구성"
                  req
                  hint={
                    isSet
                      ? `고른 문항을 세트 한 장에 담습니다 — 보기 하나를 함께 읽고 S1 → S4 차례로 묻습니다. ${pointsText}`
                      : `고른 수만큼 독립 문항이 따로 생깁니다 — 문항마다 서로 다른 문제이고, 형식은 단계의 기본값으로 들어갑니다. ${pointsText}`
                  }
                >
                  <div className="a2-cell-pad flex flex-wrap items-center gap-x-5 gap-y-1">
                    {itemForms.map((f) => (
                      <label key={f.id} className="a2-choice">
                        <input
                          type="radio"
                          name="gen-form"
                          checked={form === f.id}
                          onChange={() => {
                            setForm(f.id);
                            setErrors([]);
                          }}
                        />
                        {f.label}
                      </label>
                    ))}
                  </div>
                  <LevelCounts
                    counts={counts}
                    total={total}
                    min={0}
                    max={isSet ? SET_MAX : GENERATE_MAX}
                    allowed={(l) => levelAllowed(q.talent, l)}
                    disabled={false}
                    onChange={(l, n) => {
                      setCounts((prev) => ({ ...prev, [l]: n }));
                      setErrors([]);
                    }}
                  />
                </FormRow>
              </div>
            </Panel>

            <Panel title="분류" flush>
              <div className="a2-form a2-form-lg a2-card">
                <BandUnitRows
                  value={place}
                  disabled={false}
                  onChange={(patch) => {
                    /* 단원을 고르면 성취기준 코드가 따라 들어간다 — 문항 상세와 같은 셈(withUnitStandard) */
                    const fit = withUnitStandard({ ...place, questions: [q] }, patch).questions;
                    if (fit) setQ(fit[0]);
                    setPlace((p) => ({
                      band: patch.band ?? p.band,
                      gradeNo: patch.gradeNo ?? p.gradeNo,
                      subject: patch.subject ?? p.subject,
                      unit: patch.unit ?? p.unit,
                      unitNo: patch.unitNo ?? p.unitNo,
                      unitTerm: patch.unitTerm ?? p.unitTerm,
                    }));
                    setErrors([]);
                  }}
                />
                <QuestionClassRows
                  q={q}
                  band={place.band}
                  disabled={false}
                  withLevel={false}
                  ncic={false}
                  standards={unitStandards(place)}
                  onChange={pickQ}
                />
              </div>
            </Panel>

            {/* 원안지 양식(10.22)의 칸 가운데 뽑기 전에 정할 수 있는 것 */}
            <Panel title="원안지 항목" flush>
              <div className="a2-form a2-form-lg a2-card">
                <FormRow
                  label="그림·삽화 사양"
                  hint={
                    figure === "has"
                      ? "그림이 들어갈 문항을 뽑습니다. 뽑은 뒤 그림을 넣고 확인 세 칸을 짚어야 검수로 낼 수 있습니다."
                      : "그림 없이 글로만 묻는 문항을 뽑습니다."
                  }
                >
                  <div className="a2-cell-pad flex flex-wrap items-center gap-x-5 gap-y-1">
                    {(
                      [
                        ["none", "그림 없음"],
                        ["has", "그림 있음"],
                      ] as const
                    ).map(([id, label]) => (
                      <label key={id} className="a2-choice">
                        <input
                          type="radio"
                          name="gen-figure"
                          checked={figure === id}
                          onChange={() => setFigure(id)}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </FormRow>
                <FormRow label="이 문항의 특성">
                  <GrowTextarea
                    className="a2-textarea"
                    rows={1}
                    value={trait}
                    onChange={(e) => setTrait(e.target.value)}
                    placeholder="선택 — 적으면 뽑은 문항마다 그대로 듭니다. 예 — 일상 속 소리를 비유로 표현해 보는 문항"
                    aria-label="이 문항의 특성"
                  />
                </FormRow>
              </div>
            </Panel>
          </>
        )}

        <Panel flush>
          <div className="a2-form a2-form-lg a2-card">
            <FormRow label="출제 지시">
              <GrowTextarea
                className="a2-textarea a2-textarea-lg"
                rows={2}
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder={
                  mode === "similar"
                    ? "무엇을 바꿀지 적으면 문항마다 유의사항에 그대로 남습니다. 예 — 소재만 바꾸고 수치와 구조는 그대로"
                    : "소재·주의사항을 적으면 문항마다 유의사항에 그대로 남습니다. 예 — 계절 소재는 피할 것"
                }
                aria-label="출제 지시"
              />
            </FormRow>
          </div>
        </Panel>
      </div>

      {errors.length > 0 && (
        /* 한 줄에 하나씩 — a2-note는 가로로 늘어놓는 줄이라, 막힌 까닭 둘셋이 한 줄에 붙어 읽혔다 */
        <ul
          className="a2-note mt-2 flex-col gap-0.5"
          style={{ borderLeftColor: "var(--a2-danger)" }}
        >
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-end gap-1.5">
        <button type="button" className="a2-btn" onClick={onCancel}>
          닫기
        </button>
        <button type="button" className="a2-btn a2-btn-primary" disabled={!ready} onClick={run}>
          {mode === "similar"
            ? similarTotal === 0
              ? "비슷한 문항 만들기"
              : `비슷한 문항 ${similarTotal}개 만들기`
            : total === 0
              ? "생성"
              : isSet
                ? `세트 ${total}문항 생성`
                : `단일 ${total}문항 생성`}
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────── 비슷한 문항 · 원본 고르기 ───────────────────────── */

const typeOf = (r: ItemDraft) =>
  r.form === "set" ? `세트 ${r.questions.length}문항` : typeLabel(r.questions[0]?.type ?? r.type);

const pickCols: Col<ItemDraft>[] = [
  {
    key: "code",
    head: "문항번호",
    width: "11rem",
    nowrap: true,
    value: (r) => r.code || r.id,
    cell: (r) => <span className="a2-mono">{r.code || r.id}</span>,
  },
  {
    key: "place",
    head: "과목 · 학년",
    width: "8rem",
    nowrap: true,
    value: (r) => `${r.subject} ${r.gradeNo}학년`,
    cell: (r) => `${r.subject} · ${r.gradeNo}학년`,
  },
  {
    key: "level",
    head: "단계",
    width: "4rem",
    nowrap: true,
    value: (r) => r.level,
    cell: (r) => <span className="a2-mono">{r.level}</span>,
  },
  { key: "type", head: "형식", width: "7rem", nowrap: true, value: typeOf, cell: typeOf },
  {
    key: "state",
    head: "상태",
    width: "5.5rem",
    nowrap: true,
    value: (r) => stateLabel[r.state],
    cell: (r) => stateLabel[r.state],
  },
  {
    key: "stem",
    head: "발문",
    width: "100%",
    clip: true,
    value: (r) => `${r.stem} ${r.unit}`,
    cell: (r) => <span title={r.stem}>{r.stem || "발문 없음"}</span>,
  },
];

const pickFilters: Filter<ItemDraft>[] = [
  {
    id: "subject",
    label: "과목",
    options: ["국어", "수학", "과학"].map((v) => ({ value: v, label: v })),
    match: (r, v) => r.subject === v,
  },
  {
    id: "level",
    label: "단계",
    options: LEVELS.map((l) => ({ value: l, label: l })),
    match: (r, v) => r.level === v,
  },
];

/**
 * 원본 고르기 — 문항 은행의 문항을 체크로 여럿 고른다. 폐기한 문항은 원본이 될 수 없어 늘어놓지 않는다.
 * 고른 것은 표 밖(Generator)이 들고 있다 — 거르개를 바꿔도 고른 것이 남는다.
 */
function SimilarPicker({
  items,
  chosen,
  onChosen,
  per,
  onPer,
}: {
  items: ItemDraft[];
  chosen: string[];
  onChosen: (ids: string[]) => void;
  per: number;
  onPer: (n: number) => void;
}) {
  const rows = useMemo(() => items.filter((i) => i.state !== "retired"), [items]);
  const picked = chosen
    .map((id) => items.find((i) => i.id === id))
    .filter((i): i is ItemDraft => !!i);
  const toggle = (id: string) =>
    onChosen(chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id]);

  return (
    <>
      <Panel title="원본 문항" meta={`고른 문항 ${chosen.length}개`} flush>
        <DataTable
          rows={rows}
          cols={pickCols}
          filters={pickFilters}
          getKey={(r) => r.id}
          searchHint="문항번호 · 발문 · 단원"
          empty="고를 수 있는 문항이 없습니다."
          pageSize={10}
          selection={{
            chosen,
            onToggle: toggle,
            onToggleMany: (keys, on) =>
              onChosen(
                on ? [...new Set([...chosen, ...keys])] : chosen.filter((id) => !keys.includes(id)),
              ),
            labelOf: (r) => r.code || r.id,
          }}
        />
      </Panel>

      <Panel flush>
        <div className="a2-form a2-form-lg a2-card">
          <FormRow
            label="원본마다"
            req
            hint={`고른 문항 ${chosen.length}개 × ${per}개 = ${chosen.length * per}문항이 작성 중 초안으로 생깁니다. 분류(단원 · 성취기준 · Tag A · Tag B · 인지단계 · 형식 · 배점 · 그림 사양 · 특성)는 원본 그대로입니다.`}
          >
            <div className="a2-cell-pad flex flex-wrap items-center gap-x-5 gap-y-1">
              {Array.from({ length: SIMILAR_MAX }, (_, i) => i + 1).map((n) => (
                <label key={n} className="a2-choice">
                  <input type="radio" name="gen-per" checked={per === n} onChange={() => onPer(n)} />
                  {n}개씩
                </label>
              ))}
            </div>
          </FormRow>
          {picked.length > 0 && (
            <FormRow label="고른 원본">
              <div className="a2-cell-pad flex flex-wrap gap-1.5">
                {picked.map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    className="a2-btn a2-btn-sm"
                    onClick={() => toggle(i.id)}
                    title="누르면 고른 것에서 뺍니다"
                  >
                    <span className="a2-mono">{i.code || i.id}</span> ✕
                  </button>
                ))}
              </div>
            </FormRow>
          )}
        </div>
      </Panel>
    </>
  );
}
