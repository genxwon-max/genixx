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
  generateItems,
  type GenerateSpec,
  type ItemDraft,
} from "@/lib/itemStore";

/**
 * AI 문항 생성 (EXP-02-2) — 출제 화면 안에서 펼치는 판.
 *
 * 기존 콘솔은 이것을 별도 주소(/admin/authoring/generate)로 뗐다. 여기서는 출제 화면
 * 안에 둔다 — 만들고 나면 바로 아래 목록에 초안이 쌓이는 것을 같은 화면에서 봐야
 * 「몇 개가 들어왔나」를 확인하러 다시 옮겨 다니지 않는다.
 *
 * 규칙은 저장소와 한 벌로 쓴다(lib/itemStore.ts) — 몇 개까지 뽑을 수 있는지, 어떤 축이
 * 어떤 단계를 못 만드는지, 성취기준 코드가 학년군과 맞는지를 여기서 다시 적지 않고
 * checkSpec 하나에 묻는다. 화면과 저장소가 다른 규칙을 보면 화면이 통과시킨 것을
 * 저장소가 막는 날이 온다.
 *
 * ⚠ 나온 문항은 전부 **작성 중**으로 들어간다. 만들자마자 검수로 넘기는 길은 없다 —
 *   사람이 한 번도 안 읽은 문항이 검수 목록에 쌓이는 것을 저장소가 막는다.
 */
export default function Generator({
  onDone,
  onCancel,
}: {
  onDone: (made: ItemDraft[]) => void;
  onCancel: () => void;
}) {
  const prefs = useAdminPrefs();

  const [subject, setSubject] = useState<GenerateSpec["subject"]>("국어");
  const [band, setBand] = useState<GradeBand>("3-4");
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
  const spec: GenerateSpec = { subject, band, talent, subskill, unit, unitNo, standardCode, counts, brief };

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
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="a2-h">AI 문항 생성</h2>
        <span className="a2-t-xs text-(--a2-ink-4)">
          지문 · 보기 · 정답 · 해설 · 채점 기준까지 채워져 나옵니다 · 한 번에 {GENERATE_MAX}문항까지
        </span>
      </div>

      {/* ── 무엇을 재는 문항인가 ── */}
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <label className="a2-field block">
          <span className="a2-label">교과</span>
          <select
            className="a2-select"
            value={subject}
            onChange={(e) => setSubject(e.target.value as GenerateSpec["subject"])}
          >
            {(["국어", "수학", "과학"] as const).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>

        <label className="a2-field block">
          <span className="a2-label">학년군</span>
          <select className="a2-select" value={band} onChange={(e) => setBand(e.target.value as GradeBand)}>
            {gradeBands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </label>

        <label className="a2-field block">
          <span className="a2-label">재능 축 (Tag B)</span>
          <select className="a2-select" value={talent} onChange={(e) => pickTalent(e.target.value as TalentId)}>
            {talents.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>

        <label className="a2-field block">
          <span className="a2-label">세부 인지기제</span>
          <select className="a2-select" value={subskill} onChange={(e) => setSubskill(e.target.value)}>
            {subskills.map((s) => (
              <option key={s.code} value={s.code}>
                {s.code} · {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* ── 어디에 붙는 문항인가 ── */}
      <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_8rem_minmax(0,1fr)]">
        <label className="a2-field block">
          <span className="a2-label">단원</span>
          <input className="a2-input" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="낱말의 의미 관계" />
        </label>
        <label className="a2-field block">
          <span className="a2-label">단원 번호</span>
          <input
            className="a2-input"
            value={unitNo}
            onChange={(e) => setUnitNo(e.target.value)}
            placeholder="02"
          />
          <span className="a2-hint">문항 ID에 들어갑니다.</span>
        </label>
        <label className="a2-field block">
          <span className="a2-label">성취기준 코드</span>
          <input
            className="a2-input a2-mono"
            value={standardCode}
            onChange={(e) => setStandardCode(e.target.value)}
            placeholder={band === "3-4" ? "[4국04-01]" : "[6국04-01]"}
          />
          {/* 학년군마다 앞자리가 다르다. 코드를 틀리면 5·6학년군 내용을 3·4학년군에 내는
              일이 생기므로, 무엇을 기준으로 보는지 여기서 적어 둔다 */}
          <span className="a2-hint">{gradeBands.find((b) => b.id === band)?.note}</span>
        </label>
      </div>

      {/* ── 몇 개를 뽑을 것인가 ──
          단계마다 형식·배점·b모수가 따라오므로(§1 고정 매핑) 개수만 적으면 나머지는 정해진다 */}
      <div className="mt-2">
        <span className="a2-label">단계별 문항 수</span>
        <div className="mt-1 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {LEVELS.map((l) => {
            const can = levelAllowed(talent, l);
            return (
              <label key={l} className="a2-field block">
                <span className="a2-t-xs text-(--a2-ink-3)">
                  <span className="a2-mono font-bold text-(--a2-ink-2)">{l}</span> {levelSpecs[l].name}
                </span>
                <input
                  type="number"
                  className="a2-input"
                  min={0}
                  max={GENERATE_MAX}
                  value={counts[l] || 0}
                  disabled={!can}
                  onChange={(e) => {
                    const v = Math.max(0, Math.min(GENERATE_MAX, Math.round(Number(e.target.value) || 0)));
                    setCounts((prev) => ({ ...prev, [l]: v }));
                    setErrors([]);
                  }}
                />
                <span className="a2-hint">{can ? levelSpecs[l].rule : `${talent} 축은 이 단계를 만들 수 없습니다`}</span>
              </label>
            );
          })}
        </div>
      </div>

      <label className="a2-field mt-2 block">
        <span className="a2-label">출제 지시 (선택)</span>
        <textarea
          className="a2-textarea"
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="소재·주의사항을 적으면 문항마다 유의사항에 그대로 남습니다. 예 — 계절 소재는 피할 것"
        />
      </label>

      {/* 나온 문항이 그대로 나가지 않는다는 것을 만들기 전에 적어 둔다. 만든 뒤에 적으면
          이미 스무 개가 목록에 쌓인 다음이라 읽을 이유가 없다 */}
      <p className="a2-note mt-2">
        <span>
          나온 문항은 <b className="text-(--a2-ink)">작성 중</b>으로 들어갑니다. 열어 보고 고친 뒤 제출 전
          체크리스트를 직접 짚어야 검수로 넘어갑니다. 특히 <b className="text-(--a2-ink)">태깅</b>을 봐 주세요 —
          축은 여기서 고르고 문항은 생성되므로 둘이 어긋날 수 있고, 그것을 잡는 자리가 검수 2차 태깅입니다.
        </span>
      </p>

      {errors.length > 0 && (
        <ul className="a2-note mt-2" style={{ borderLeftColor: "var(--a2-danger)" }}>
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <button type="button" className="a2-btn a2-btn-primary" disabled={total === 0} onClick={run}>
          {total > 0 ? `${total}문항 생성` : "생성"}
        </button>
        <button type="button" className="a2-btn" onClick={onCancel}>
          닫기
        </button>
        <span className="a2-t-xs text-(--a2-ink-4)">
          문항 본은 저장소에 미리 써 둔 것에서 꺼냅니다(lib/itemBank.ts). 붙일 때 생성 모델 호출로 갈아 끼웁니다.
        </span>
      </div>
    </div>
  );
}
