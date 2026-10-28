"use client";

import { useEffect, useRef, useState } from "react";
import { surveyKeys, type SurveyKey } from "@/lib/examStore";
import { surveyBandOf, surveyBands, type SurveyBand } from "@/lib/surveyBands";
import { surveys } from "@/lib/survey";
import { surveyKeyShort, type NewSurvey, type SurveyDocs } from "@/lib/surveyStore";

/**
 * 새 설문지 (ADM-14, 2026-10-28) — 이름 · 응답자 · 학년대를 정하고, 기본 양식 · 빈 양식 · 있는 설문지 복사
 * 가운데 하나로 시작한다. 「2025 학부모 설문지」를 그대로 두고 「2026 학부모 설문지」를 만드는 자리다.
 *
 * 처음에는 「빈 설문지」(제목 · 안내만 있고 문항도 구역도 없음)가 첫 값이었다. 그렇게 만든 설문지는 응답자
 * 창의 모양(표지 → 응답 방법 → 구역마다 문항)을 갖추지 못해 어떤 설문이 될지 알 수 없었다(같은 날 사용자
 * 지적). 그래서 그 응답자의 재능진단 설문지 v1.0을 그대로 여는 「기본 양식」을 첫 값으로 두고, 빈 것도
 * 구역은 남긴 「빈 양식」으로 바꿨다.
 *
 * 만든 설문지는 보관 상태로 시작해 응답자에게 바로 나가지 않는다 — 문항을 채운 뒤 상세의 「이 설문지
 * 사용하기」로 내보낸다. 그 사실을 창 아래 한 줄로 적는다.
 *
 * 목록의 「새 설문지」와 상세의 「복사해 새로 만들기」가 함께 쓴다. 복사는 start.from이 그 설문지로 정해진 채
 * 열린다.
 */
const BASE = "@base";
const BLANK = "@blank";

export default function SurveyCreateDialog({
  docs,
  start,
  onClose,
  onCreate,
}: {
  docs: SurveyDocs;
  start?: Partial<NewSurvey>;
  onClose: () => void;
  /** 만들기 — 만들지 못했으면 까닭을 돌려준다 */
  onCreate: (spec: NewSurvey) => string | null;
}) {
  const year = new Date().getFullYear() + 1;
  const [key, setKey] = useState<SurveyKey>(start?.key ?? "guardian");
  const [band, setBand] = useState<SurveyBand>(start?.band ?? "e34");
  /* 고른 시작 — 설문지 열쇠이거나 BASE · BLANK */
  const [from, setFrom] = useState<string>(start?.from ?? (start?.start === "blank" ? BLANK : BASE));
  const [name, setName] = useState(
    start?.name ?? `${year} ${surveyKeyShort[start?.key ?? "guardian"]} 설문지`,
  );
  const [named, setNamed] = useState(Boolean(start?.name));
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLInputElement>(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    box.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* 복사할 수 있는 설문지 — 같은 응답자의 것이 위로 */
  const sources = Object.values(docs).sort(
    (a, b) =>
      Number(b.key === key) - Number(a.key === key) || b.createdAt.localeCompare(a.createdAt),
  );

  const pickKey = (k: SurveyKey) => {
    setKey(k);
    /* 이름을 손대지 않았으면 응답자를 따라 바꾼다 */
    if (!named) setName(`${year} ${surveyKeyShort[k]} 설문지`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="survey-new-title"
        className="a2-panel w-full max-w-xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="survey-new-title" className="a2-title">
          새 설문지
        </h2>
        <p className="mt-2 a2-t-sm text-(--a2-ink-2)">
          지난 설문지는 그대로 남습니다. 만든 설문지는 보관 상태로 시작하고, 문항을 채운 뒤 「이
          설문지 사용하기」를 눌러야 응답자에게 나갑니다.
        </p>

        <div className="mt-4 grid gap-3">
          <label className="grid gap-1">
            <span className="a2-label">설문지 이름 — 관리용</span>
            <input
              ref={box}
              className="a2-input"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNamed(true);
                setError(null);
              }}
              placeholder="예) 2027 학부모 설문지"
            />
          </label>

          <div className="grid gap-1">
            <span className="a2-label">응답자</span>
            <div role="radiogroup" className="flex flex-wrap gap-x-5 gap-y-1">
              {surveyKeys.map((k) => (
                <label key={k} className="a2-choice">
                  <input
                    type="radio"
                    name="sv-new-key"
                    checked={key === k}
                    onChange={() => pickKey(k)}
                  />
                  {surveyKeyShort[k]}
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-1">
            <span className="a2-label">학년대</span>
            <div role="radiogroup" className="flex flex-wrap gap-x-5 gap-y-1">
              {surveyBands.map((b) => (
                <label key={b.id} className="a2-choice">
                  <input
                    type="radio"
                    name="sv-new-band"
                    checked={band === b.id}
                    onChange={() => setBand(b.id)}
                  />
                  {b.label}
                </label>
              ))}
            </div>
          </div>

          <label className="grid gap-1">
            <span className="a2-label">어디서 시작할까요</span>
            <select className="a2-select" value={from} onChange={(e) => setFrom(e.target.value)}>
              <option value={BASE}>
                기본 양식 — {surveys[key].title} v1.0 그대로(구역 · 문항까지)
              </option>
              <option value={BLANK}>빈 양식 — 표지 · 안내 · 구역은 같고 문항만 비어 있음</option>
              {sources.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} · {surveyBandOf(d.band).short} 복사{d.active ? " (사용 중)" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && <p className="mt-3 a2-t-sm font-bold text-(--a2-danger)">{error}</p>}

        <div className="mt-5 flex justify-end gap-1.5">
          <button type="button" className="a2-btn" onClick={onClose}>
            그만두기
          </button>
          <button
            type="button"
            className="a2-btn a2-btn-primary"
            disabled={!name.trim()}
            onClick={() =>
              setError(
                onCreate({
                  name,
                  key,
                  band,
                  from: from === BASE || from === BLANK ? null : from,
                  start: from === BLANK ? "blank" : "base",
                }),
              )
            }
          >
            만들기
          </button>
        </div>
      </div>
    </div>
  );
}
