"use client";

import { useState } from "react";
import {
  LEVELS,
  gradeBands,
  levelAllowed,
  levelSpecs,
  subskillsOf,
  talents,
  type GradeBand,
  type Level,
  type TalentId,
} from "@/lib/blueprint";
import { useAdminPrefs } from "@/lib/adminStore";
import {
  GENERATE_MAX,
  checkSpec,
  countOf,
  difficulties,
  itemForms,
  generateItems,
  type GenerateSpec,
  type ItemDraft,
  type ItemForm,
} from "@/lib/itemStore";
import { FormRow, Panel } from "@/components/admin2/ui";

/**
 * AI 문항 출제 (EXP-02-2) — 출제 화면 안에서 펼치는 판.
 *
 * 왼쪽에 명칭, 오른쪽에 값. 칸을 격자로 늘어놓던 것을 줄로 세운다 — 격자는 칸이 여덟을
 * 넘어가면 어디까지 채웠는지가 눈으로 안 잡히고, 무엇이 필수인지도 칸마다 흩어진다.
 * 줄로 세우면 왼쪽 한 줄만 타고 내려가면 되고, 별표가 붙은 줄만 채우면 끝난다.
 *
 * ── 필수 다섯 · 선택 넷 ──
 * 필수는 **문항이 무엇인지 정하는 것**들이다 — 구성(단일·세트)·과목·학년·난이도·단계별
 * 문항 수. 이 다섯이 정해지면 뽑을 것이 정해진다.
 * 선택은 **뽑고 나서 붙여도 되는 것**들이다 — Tag A(성취기준)·Tag B(재능 축)·단원·출제
 * 지시. 문항을 보고 나서 코드를 붙이는 편이 맞는 자리가 많아, 여기서 막지 않는다.
 *
 * 규칙은 저장소와 한 벌로 쓴다(lib/itemStore.ts) — 몇 개까지 뽑을 수 있는지, 어떤 축이
 * 어떤 단계를 못 만드는지, 성취기준 코드가 학년군과 맞는지를 여기서 다시 적지 않고
 * checkSpec 하나에 묻는다. 화면과 저장소가 다른 규칙을 보면 화면이 통과시킨 것을
 * 저장소가 막는 날이 온다.
 */
export default function Generator({
  onDone,
  onCancel,
}: {
  onDone: (made: ItemDraft[]) => void;
  onCancel: () => void;
}) {
  const prefs = useAdminPrefs();

  const [form, setForm] = useState<ItemForm>("single");
  const [subject, setSubject] = useState<GenerateSpec["subject"]>("국어");
  const [band, setBand] = useState<GradeBand>("3-4");
  const [b, setB] = useState<number>(difficulties[1].b);
  const [talent, setTalent] = useState<TalentId>("LANG");
  const [subskill, setSubskill] = useState(subskillsOf("LANG")[0].code);
  const [unit, setUnit] = useState("");
  const [unitNo, setUnitNo] = useState("");
  const [standardCode, setStandardCode] = useState("");
  const [counts, setCounts] = useState<Record<Level, number>>({ S1: 0, S2: 0, S3: 0, S4: 0 });
  const [brief, setBrief] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const subskills = subskillsOf(talent);
  const total = countOf(counts);
  const spec: GenerateSpec = {
    form,
    subject,
    band,
    b,
    talent,
    subskill,
    unit,
    unitNo,
    standardCode,
    counts,
    brief,
  };

  /* 축을 바꾸면 그 축이 못 다루는 단계의 수를 비운다 — 남겨 두면 생성에서 막힌다.
     막고 나서 「자기-성찰 축은 S4를 만들 수 없습니다」를 읽게 하는 것보다, 고를 수
     없게 해 두고 칸을 비우는 편이 한 번 덜 막힌다 */
  const pickTalent = (id: TalentId) => {
    setTalent(id);
    setSubskill(subskillsOf(id)[0].code);
    setCounts((prev) => {
      const next = { ...prev };
      for (const l of LEVELS) if (!levelAllowed(id, l)) next[l] = 0;
      return next;
    });
    setErrors([]);
  };

  const run = () => {
    const bad = checkSpec(spec);
    if (bad.length > 0) return setErrors(bad);
    onDone(generateItems(spec, prefs.loginId ?? "", prefs.staffName || "운영자"));
  };

  return (
    <div className="border-b border-(--a2-line) bg-(--a2-raised) px-3 py-3">
      <Panel flush>
        <div className="a2-form a2-form-lg">
          {/* ── 여기까지가 필수. 다섯이 정해지면 뽑을 것이 정해진다 ── */}
          <FormRow label="구성" req>
            <span className="flex flex-wrap items-center gap-x-5 gap-y-1">
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
            </span>
            {form === "set" && (
              <span className="a2-t-xs text-(--a2-ink-4)">
                보기 하나 아래 묶어 초안 한 장으로 나옵니다.
              </span>
            )}
          </FormRow>

          <FormRow label="과목" req>
            <select
              className="a2-select a2-input-lg"
              style={{ maxWidth: "10rem" }}
              value={subject}
              onChange={(e) => setSubject(e.target.value as GenerateSpec["subject"])}
            >
              {(["국어", "수학", "과학"] as const).map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </FormRow>

          <FormRow label="학년" req>
            <select
              className="a2-select a2-input-lg"
              style={{ maxWidth: "14rem" }}
              value={band}
              onChange={(e) => setBand(e.target.value as GradeBand)}
            >
              {gradeBands.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          </FormRow>

          {/* 값을 앞에 세운다 — 문항 목록·문항 상세가 난이도를 b 숫자로 적고 있어서,
              여기서 말로만 고르면 고른 것과 표에 선 것이 같은 값인지 매번 짚어야 한다.
              말은 뒤에 흐리게 남긴다: 숫자만으로는 어느 쪽이 어려운 쪽인지 모른다 */}
          <FormRow label="난이도" req>
            <span className="flex flex-wrap items-center gap-x-5 gap-y-1">
              {difficulties.map((d) => (
                <label key={d.b} className="a2-choice">
                  <input
                    type="radio"
                    name="gen-b"
                    checked={b === d.b}
                    onChange={() => {
                      setB(d.b);
                      setErrors([]);
                    }}
                  />
                  <span className="a2-mono">{d.b}</span>
                  <span className="font-normal text-(--a2-ink-4)">{d.label}</span>
                </label>
              ))}
            </span>
          </FormRow>

          {/* 단계마다 형식·배점이 따라오므로(§1 고정 매핑) 개수만 적으면 나머지는 정해진다 */}
          <FormRow label="S1–S4" req hint={`한 번에 ${GENERATE_MAX}문항까지 뽑을 수 있습니다.`}>
            <span className="grid w-full gap-1.5 sm:grid-cols-2 xl:grid-cols-4">
              {LEVELS.map((l) => {
                const can = levelAllowed(talent, l);
                return (
                  <label key={l} className="a2-field block">
                    <span className="a2-t-xs text-(--a2-ink-3)">
                      <span className="a2-mono font-bold text-(--a2-ink-2)">{l}</span>{" "}
                      {levelSpecs[l].name}
                    </span>
                    <input
                      type="number"
                      className="a2-input"
                      min={0}
                      max={GENERATE_MAX}
                      value={counts[l] || 0}
                      disabled={!can}
                      onChange={(e) => {
                        const v = Math.max(
                          0,
                          Math.min(GENERATE_MAX, Math.round(Number(e.target.value) || 0)),
                        );
                        setCounts((prev) => ({ ...prev, [l]: v }));
                        setErrors([]);
                      }}
                    />
                    {!can && (
                      <span className="a2-hint">{talent} 축은 이 단계를 만들 수 없습니다</span>
                    )}
                  </label>
                );
              })}
            </span>
          </FormRow>

          {/* ── 여기부터 선택. 뽑고 나서 문항을 보고 붙여도 되는 것들 ── */}
          <FormRow label="Tag A">
            <input
              className="a2-input a2-input-lg a2-mono"
              style={{ maxWidth: "11rem" }}
              value={standardCode}
              onChange={(e) => setStandardCode(e.target.value)}
              placeholder={band === "3-4" ? "[4국04-01]" : "[6국04-01]"}
            />
            {/* 학년군마다 앞자리가 다르다. 코드를 틀리면 5·6학년군 내용을 3·4학년군에
                내는 일이 생기므로, 무엇을 기준으로 보는지 여기서 적어 둔다 */}
            <span className="a2-t-xs text-(--a2-ink-4)">
              {gradeBands.find((g) => g.id === band)?.note}
            </span>
          </FormRow>

          <FormRow label="Tag B">
            <select
              className="a2-select a2-input-lg"
              style={{ maxWidth: "13rem" }}
              value={talent}
              onChange={(e) => pickTalent(e.target.value as TalentId)}
            >
              {talents.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <select
              className="a2-select a2-input-lg"
              style={{ maxWidth: "16rem" }}
              value={subskill}
              onChange={(e) => setSubskill(e.target.value)}
            >
              {subskills.map((v) => (
                <option key={v.code} value={v.code}>
                  {v.code} · {v.name}
                </option>
              ))}
            </select>
          </FormRow>

          <FormRow label="단원">
            <input
              className="a2-input a2-input-lg"
              style={{ maxWidth: "18rem" }}
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="낱말의 의미 관계"
            />
            <input
              className="a2-input a2-input-lg a2-mono"
              style={{ maxWidth: "6rem" }}
              value={unitNo}
              onChange={(e) => setUnitNo(e.target.value)}
              placeholder="02"
              aria-label="단원 번호"
            />
          </FormRow>

          <FormRow label="출제 지시">
            <textarea
              className="a2-textarea"
              rows={2}
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="소재·주의사항을 적으면 문항마다 유의사항에 그대로 남습니다. 예 — 계절 소재는 피할 것"
            />
          </FormRow>
        </div>
      </Panel>

      {errors.length > 0 && (
        <ul className="a2-note mt-2" style={{ borderLeftColor: "var(--a2-danger)" }}>
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
          {total > 0 ? `${total}문항 생성` : "생성"}
        </button>
      </div>
    </div>
  );
}
