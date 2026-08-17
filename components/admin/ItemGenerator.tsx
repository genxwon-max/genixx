"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAdminPrefs } from "@/lib/adminStore";
import { useHydrated } from "@/lib/examStore";
import {
  GENERATE_MAX,
  checkSpec,
  countOf,
  generateItems,
  typeForLevel,
  typeLabel,
  type GenerateSpec,
} from "@/lib/itemStore";
import {
  LEVELS,
  codeSamples,
  gradeBands,
  levelAllowed,
  levelSpecs,
  subskillsOf,
  talents,
  type GradeBand,
  type Level,
  type TalentId,
} from "@/lib/blueprint";
import { PageHead, Callout } from "./Parts";
import * as a from "./ui";

/**
 * EXP-02-2 AI 문항 초안 생성.
 *
 * 무엇을 뽑을지 정하는 화면이다. 「몇 문항」을 총량 하나로 받지 않고 단계별로
 * 받는다 — 발주서가 검사지를 S1~S4 구성비로 짜기 때문에, 총 12문항이 아니라
 * S1 3 · S2 4 · S3 3 · S4 2가 실제로 필요한 값이다.
 *
 * AI가 어디까지 하는지는 lib/itemStore.ts generateItems 주석에 적어 두었고,
 * 화면에서도 숨기지 않고 먼저 적는다. 보기와 정답이 비어 있는 것을 결함으로
 * 읽으면 안 되기 때문이다 — 사람이 채워야 제출 칸이 열린다.
 */

const EMPTY_COUNTS: Record<Level, number> = { S1: 0, S2: 0, S3: 0, S4: 0 };

export default function ItemGenerator() {
  const router = useRouter();
  const prefs = useAdminPrefs();
  const hydrated = useHydrated();

  const [subject, setSubject] = useState<GenerateSpec["subject"]>("국어");
  const [band, setBand] = useState<GradeBand>("3-4");
  const [talent, setTalent] = useState<TalentId>("LANG");
  const [subskill, setSubskill] = useState(subskillsOf("LANG")[0].code);
  const [unit, setUnit] = useState("");
  const [unitNo, setUnitNo] = useState("");
  const [standardCode, setStandardCode] = useState("");
  const [counts, setCounts] = useState<Record<Level, number>>(EMPTY_COUNTS);
  const [brief, setBrief] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const subskills = subskillsOf(talent);
  const total = countOf(counts);

  const pickTalent = (id: TalentId) => {
    setTalent(id);
    setSubskill(subskillsOf(id)[0].code);
    /* 축을 바꾸면 못 다루는 단계의 수를 비운다 — 남겨 두면 생성에서 막힌다 */
    setCounts((prev) => {
      const next = { ...prev };
      for (const l of LEVELS) if (!levelAllowed(id, l)) next[l] = 0;
      return next;
    });
    setErrors([]);
  };

  const spec: GenerateSpec = {
    subject,
    band,
    talent,
    subskill,
    unit,
    unitNo,
    standardCode,
    counts,
    brief,
  };

  const run = () => {
    const bad = checkSpec(spec);
    if (bad.length > 0) return setErrors(bad);
    generateItems(spec, prefs.loginId ?? "", prefs.staffName || "출제자");
    router.push("/admin/authoring");
  };

  if (!hydrated) {
    return <p className="py-16 text-center adm-t-sm text-exam-muted">확인 중입니다…</p>;
  }

  return (
    <>
      <Link
        href="/admin/authoring"
        className="mb-4 inline-flex items-center gap-1.5 adm-t-sm font-bold text-brand-700 hover:underline"
      >
        ← 출제 워크벤치
      </Link>

      <PageHead
        id="EXP-02-2"
        title="AI 문항 초안 생성"
        lead="조건을 정하면 그 조건에 맞는 문항 초안을 한 번에 만듭니다. 전부 「작성 중」으로 들어가고, 사람이 채워야 제출할 수 있습니다."
      />

      <div className="mb-6">
        <Callout title="AI가 하는 일과 사람이 하는 일">
          <p>
            <b className="font-bold">AI가 냅니다</b> — 문항 ID · 형식 · 배점 · b모수 · 이중태그,
            단계에 맞는 발문 뼈대, 오답을 어떤 의도로 깔지, 채점 기준 골격.
          </p>
          <p className="mt-1.5">
            <b className="font-bold">사람이 씁니다</b> — 지문 · 보기 넷 · 정답 · 허용 답안 · 해설.
            이 칸이 비어 있는 것은 결함이 아니라 일부러 둔 것입니다. 채워야 제출 칸이 열리고, 제출한
            뒤에는 다른 사람이 3단 검수를 합니다.
          </p>
        </Callout>
      </div>

      <div className="grid gap-x-10 gap-y-8 lg:grid-cols-2">
        {/* ── 무엇을 재는 문항인가 ── */}
        <section className="space-y-5">
          <h2 className={a.cardTitle}>무엇을 재는 문항인가</h2>

          <Field label="교과">
            <Radios
              name="subject"
              value={subject}
              options={["국어", "수학", "과학"].map((v) => ({ value: v, label: v }))}
              onChange={(v) => setSubject(v as GenerateSpec["subject"])}
            />
          </Field>

          <Field label="학년군">
            <Radios
              name="band"
              value={band}
              options={gradeBands.map((g) => ({ value: g.id, label: g.label }))}
              onChange={(v) => setBand(v as GradeBand)}
            />
            <p className={`${a.hint} mt-2`}>{gradeBands.find((g) => g.id === band)!.note}</p>
          </Field>

          <Field label="재능 축 (Tag B)">
            <select
              value={talent}
              onChange={(e) => pickTalent(e.target.value as TalentId)}
              className={a.select}
            >
              {talents.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {t.scope.join("~")}
                </option>
              ))}
            </select>
          </Field>

          <Field label="세부 기능">
            <select
              value={subskill}
              onChange={(e) => setSubskill(e.target.value)}
              className={a.select}
            >
              {subskills.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.code} {s.name}
                </option>
              ))}
            </select>
            <p className={`${a.hint} mt-2`}>{subskills.find((s) => s.code === subskill)?.define}</p>
          </Field>

          <Field label="단원">
            <div className="flex gap-2">
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="예: 낱말의 의미 관계"
                className={a.input}
              />
              <input
                value={unitNo}
                onChange={(e) => setUnitNo(e.target.value)}
                placeholder="번호 04"
                inputMode="numeric"
                aria-label="단원 번호"
                className={`${a.input} w-28 shrink-0`}
              />
            </div>
            <p className={`${a.hint} mt-2`}>단원 번호는 문항 ID에 두 자리로 들어갑니다.</p>
          </Field>

          <Field label="성취기준 코드">
            <input
              value={standardCode}
              onChange={(e) => setStandardCode(e.target.value)}
              placeholder={codeSamples[band][0]}
              className={a.input}
            />
            <p className={`${a.hint} mt-2`}>
              {band === "3-4" ? "[4XX]" : "[6XX]"}로 시작해야 합니다. 예:{" "}
              {codeSamples[band].join(" · ")}
            </p>
          </Field>
        </section>

        {/* ── 몇 문항을 어떤 단계로 ── */}
        <section className="space-y-5">
          <h2 className={a.cardTitle}>몇 문항을 어떤 단계로</h2>

          <p className={a.bodyText}>
            단계를 고르면 형식·배점·b모수가 따라옵니다. 형식을 먼저 고르고 단계를 끼워 맞추는 길은
            두지 않았습니다.
          </p>

          <ul className="border-t border-exam-line">
            {LEVELS.map((l) => {
              const s = levelSpecs[l];
              const ok = levelAllowed(talent, l);
              return (
                <li
                  key={l}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-exam-line py-3"
                >
                  <span className="w-full sm:w-auto sm:flex-1">
                    <span className={a.strongText}>
                      {l} {s.name}
                    </span>
                    <span className={`${a.hint} mt-0.5 block`}>
                      {typeLabel(typeForLevel[l])} · {s.points}점 · b {s.b}
                    </span>
                  </span>

                  {ok ? (
                    <span className="flex items-center gap-2">
                      <label className="sr-only" htmlFor={`n-${l}`}>
                        {l} 문항 수
                      </label>
                      <input
                        id={`n-${l}`}
                        type="number"
                        min={0}
                        max={GENERATE_MAX}
                        value={counts[l] || ""}
                        onChange={(e) => {
                          const v = Math.max(
                            0,
                            Math.min(GENERATE_MAX, Number(e.target.value) || 0),
                          );
                          setCounts((p) => ({ ...p, [l]: v }));
                          setErrors([]);
                        }}
                        className={`${a.input} w-24 text-right`}
                      />
                      <span className={a.hint}>문항</span>
                    </span>
                  ) : (
                    <span className={`${a.hint} font-bold`}>이 축에는 없는 단계</span>
                  )}
                </li>
              );
            })}
          </ul>

          <p className={a.bodyText}>
            모두 <b className="font-bold text-exam-text">{total}문항</b> · 한 번에 {GENERATE_MAX}
            문항까지
          </p>

          <Field label="출제 지시 (선택)">
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              rows={4}
              placeholder="예: 학교 급식과 텃밭을 소재로. 특정 지역·가정 형편이 드러나는 표현은 피할 것."
              className={a.input}
            />
            <p className={`${a.hint} mt-2`}>
              초안에 함께 저장되어, 결과가 이상할 때 무엇을 시켰는지 되짚을 수 있습니다.
            </p>
          </Field>
        </section>
      </div>

      {errors.length > 0 && (
        <div className="mt-6" role="alert">
          <Callout tone="warn" title="이대로는 만들 수 없습니다">
            <ul className="list-disc space-y-1 pl-5">
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </Callout>
        </div>
      )}

      <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-exam-line pt-6">
        <button type="button" onClick={run} className={total > 0 ? a.btnPrimary : a.btnDisabled}>
          초안 {total > 0 ? `${total}문항 ` : ""}만들기
        </button>
        <Link href="/admin/authoring" className={a.btnGhost}>
          취소
        </Link>
        <p className={a.hint}>
          만든 초안은 「작성 중」으로 들어갑니다. 바로 검수로 넘어가지 않습니다.
        </p>
      </div>
    </>
  );
}

/* ───────────────────────── 조각 ───────────────────────── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className={a.label}>{label}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

/** 셋 이하 선택지는 펼쳐 둔다 — 선택 상자를 열어야 무엇이 있는지 아는 것보다 낫다 */
function Radios({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <label
          key={o.value}
          className={`flex min-h-[2.75rem] cursor-pointer items-center gap-2 rounded-md border px-4 adm-t-md font-bold transition-colors ${
            value === o.value
              ? "border-brand-700 bg-surface-blue text-brand-800"
              : "border-exam-line bg-white text-exam-text hover:bg-exam-raised"
          }`}
        >
          <input
            type="radio"
            name={name}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            className="h-4 w-4"
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}
