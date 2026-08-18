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
 * EXP-02-2 AI 문항 생성.
 *
 * 무엇을 출제할지 정하는 화면이다. 「몇 문항」을 총량 하나로 받지 않고 단계별로
 * 받는다 — 발주서가 검사지를 S1~S4 구성비로 짜기 때문에, 총 12문항이 아니라
 * S1 3 · S2 4 · S3 3 · S4 2가 실제로 필요한 값이다.
 *
 * 나온 문항이 어디로 가는지를 폼보다 먼저 적는다. 완성된 문항이 나오면 그대로
 * 제출해도 되는 줄 알기 쉬운데, 여기서는 작성 중으로 들어가 출제자가 고치고
 * 체크리스트를 짚어야 제출 칸이 열린다(lib/itemStore.ts generateItems 주석).
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
        title="AI 문항 생성"
        lead="조건을 정하면 그 조건에 맞는 문항을 한 번에 출제합니다. 지문·보기·정답·해설·채점 기준까지 채워져 나옵니다."
      />

      <div className="mb-6">
        <Callout title="나온 문항은 그대로 나가지 않습니다">
          <p>
            만들어진 문항은 <b className="font-bold">「작성 중」</b>으로 들어갑니다. 출제자가 열어
            보고 고친 뒤 제출 전 체크리스트를 직접 짚어야 제출 칸이 열리고, 제출한 뒤에는 다른
            사람이 내용·태깅·윤리 3단 검수를 합니다.
          </p>
          <p className="mt-1.5">
            특히 <b className="font-bold">태깅</b>을 확인해 주세요. 재능 축은 여기서 고르고 문항은
            생성되므로 둘이 어긋날 수 있습니다. 문항마다 유의사항에 무엇을 볼지 적어 둡니다.
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
            {/*
              폭은 칸으로 나누고 입력에는 손대지 않는다.

              처음에는 flex에 두고 번호 쪽에 w-28을 덧붙였는데, a.input이 이미 w-full을
              달고 있어서 한 요소에 w-full과 w-28이 같이 붙었다. 둘은 특이도가 같아
              class 문자열 순서가 아니라 스타일시트 순서로 이기고 지는데, 여기서는
              w-full이 이겨서 번호 칸이 403px, 이름 칸이 34px가 됐다.
              grid로 자리를 정하면 둘 다 자기 칸에서 w-full이면 된다.
            */}
            <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-2">
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="예: 낱말의 의미 관계"
                aria-label="단원 이름"
                className={a.input}
              />
              <input
                value={unitNo}
                onChange={(e) => setUnitNo(e.target.value)}
                placeholder="번호 04"
                inputMode="numeric"
                aria-label="단원 번호"
                className={a.input}
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
                      {/* 폭은 감싼 칸이 정한다 — a.input의 w-full과 다투지 않게 */}
                      <span className="block w-20 shrink-0">
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
                          className={`${a.input} text-right`}
                        />
                      </span>
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
          {total > 0 ? `${total}문항 ` : ""}출제하기
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
