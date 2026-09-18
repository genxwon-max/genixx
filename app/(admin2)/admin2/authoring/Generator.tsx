"use client";

import { useState } from "react";
import { LEVELS, levelAllowed, type Level } from "@/lib/blueprint";
import { useAdminPrefs } from "@/lib/adminStore";
import {
  GENERATE_MAX,
  SET_MAX,
  blankQuestion,
  checkSpec,
  countOf,
  generateItems,
  itemForms,
  type GenerateSpec,
  type ItemDraft,
  type ItemForm,
  type Question,
} from "@/lib/itemStore";
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
 * 규칙은 저장소와 한 벌로 쓴다(lib/itemStore.ts checkSpec) — 몇 문항까지 담을 수 있는지, 어떤
 * 축이 어떤 단계를 못 만드는지, 성취기준 코드 · 교과 단원이 학년과 맞는지를 여기서 다시 적지
 * 않는다. 화면과 저장소가 다른 규칙을 보면 화면이 통과시킨 것을 저장소가 막는 날이 온다.
 */

const NO_COUNTS: Record<Level, number> = { S1: 0, S2: 0, S3: 0, S4: 0 };

export default function Generator({
  onDone,
  onCancel,
}: {
  onDone: (made: ItemDraft[]) => void;
  onCancel: () => void;
}) {
  const prefs = useAdminPrefs();

  const [form, setForm] = useState<ItemForm>("single");
  const [place, setPlace] = useState<BandUnit>({
    band: "3-4",
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
    /* 형식 · 배점은 넘기지 않는다 — 단일도 세트도 단계마다 고정 매핑을 따른다(머리 주석) */
    counts,
    brief,
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
    const bad = checkSpec(spec);
    if (bad.length > 0) return setErrors(bad);
    onDone(generateItems(spec, prefs.loginId ?? "", prefs.staffName || "운영자"));
  };

  return (
    <div className="border-b border-(--a2-line) bg-(--a2-raised) px-3 py-3">
      <div className="grid gap-3">
        <Panel flush>
          <div className="a2-form a2-form-lg a2-card">
            {/* 같은 단계별 수가 구성에 따라 다른 것을 만든다. 그 차이를 칸 아래 한 줄로 적는다 —
                적지 않으면 단일에서 S1 · S2를 고른 사람이 세트 한 장을 기다린다 */}
            <FormRow
              label="문항 구성"
              req
              hint={
                isSet
                  ? "고른 문항을 세트 한 장에 담습니다 — 보기 하나를 함께 읽고 S1 → S4 차례로 묻습니다."
                  : "고른 수만큼 단일 문항이 따로 생깁니다 — 문항마다 서로 다른 문제이고, 형식 · 배점은 단계의 기본값으로 들어갑니다."
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
                setPlace((p) => ({
                  band: patch.band ?? p.band,
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
              onChange={pickQ}
            />
          </div>
        </Panel>

        <Panel flush>
          <div className="a2-form a2-form-lg a2-card">
            <FormRow label="출제 지시">
              <GrowTextarea
                className="a2-textarea a2-textarea-lg"
                rows={2}
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="소재·주의사항을 적으면 문항마다 유의사항에 그대로 남습니다. 예 — 계절 소재는 피할 것"
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
        <button
          type="button"
          className="a2-btn a2-btn-primary"
          disabled={total === 0}
          onClick={run}
        >
          {total === 0 ? "생성" : isSet ? `세트 ${total}문항 생성` : `단일 ${total}문항 생성`}
        </button>
      </div>
    </div>
  );
}
