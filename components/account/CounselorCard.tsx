"use client";

import { useEffect, useRef } from "react";
import { briefOf, counselModes, type Counselor } from "@/lib/counselors";
import { peopleDisclaimer } from "@/lib/people";
import { WEEK_KO } from "@/lib/calendar";

/**
 * 상담사 한 사람 — 왼쪽 사진, 오른쪽 이름·전문 분야·연혁.
 *
 * 카드에는 **고르는 데 필요한 것만** 둔다. 이름과 직함, 이 사람과 만나면 무엇을 듣게
 * 되는지 한 줄, 그렇게 말할 수 있는 근거인 연혁 세 줄. 그 이상은 상세로 내린다 —
 * 빈 시각 하나에 다섯 사람이 서는 자리라 카드가 길어지면 견줄 수가 없다.
 *
 * ⚠ 사진 자리는 이름 모노그램으로 대신 그린다. 참여진이 아직 예시 인물이라 실제 사진을
 *   붙일 수 없다(lib/counselors.ts). public/people/{id}.png가 들어오면 여기만 고친다.
 */

/** 사진 자리 — 사진이 없는 동안은 성을 뗀 이름 모노그램 */
function Photo({ c, size = 72 }: { c: Counselor; size?: number }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.round(size * 0.3) }}
      className="flex shrink-0 items-center justify-center rounded-[14px] bg-soft-primary-soft font-bold text-soft-primary"
    >
      {c.person.name.slice(1)}
    </span>
  );
}

export default function CounselorCard({
  c,
  selected,
  onSelect,
  onDetail,
}: {
  c: Counselor;
  selected: boolean;
  onSelect: () => void;
  onDetail: () => void;
}) {
  return (
    <label
      className={`flex cursor-pointer gap-4 rounded-[14px] border p-4 transition-all sm:p-5 ${
        selected
          ? "border-2 border-soft-primary bg-soft-primary-soft shadow-[0_2px_10px_rgba(54,94,239,0.14)]"
          : "border border-soft-line bg-white hover:border-soft-primary"
      }`}
    >
      <input
        type="radio"
        name="counselor"
        checked={selected}
        onChange={onSelect}
        className="sr-only"
      />
      <Photo c={c} />

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-[15.5px] font-bold text-soft-ink">{c.person.name}</span>
          <span className="text-[12.5px] text-soft-muted">{c.person.role}</span>
        </span>

        <span className="mt-1.5 block text-[13.5px] leading-[1.7] text-soft-ink">{c.focus}</span>

        <span className="mt-2 block text-[12.5px] leading-[1.75] text-soft-muted">
          {briefOf(c).map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </span>

        <span className="mt-2.5 flex flex-wrap items-center gap-2">
          {c.modes.map((m) => (
            <span
              key={m}
              className="rounded-full border border-soft-line bg-white px-2.5 py-0.5 text-[11.5px] font-semibold text-soft-muted"
            >
              {counselModes[m]}
            </span>
          ))}
          {/* 상세는 카드 안의 버튼이다. 라벨 안이라 클릭이 선택으로 번지지 않게 막는다 */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDetail();
            }}
            className="text-[12.5px] font-semibold text-soft-primary hover:underline"
          >
            상세보기
          </button>
        </span>
      </span>
    </label>
  );
}

/** 상세 — 카드에서 접어 둔 소개·경력·맡은 일을 편다 */
export function CounselorDetail({ c, onClose }: { c: Counselor; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="counselor-detail-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-soft-ink/40 p-0 sm:items-center sm:p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[88vh] w-full max-w-[34rem] overflow-y-auto rounded-t-[20px] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.25)] sm:rounded-[18px] sm:p-7">
        <div className="flex gap-4">
          <Photo c={c} size={84} />
          <div className="min-w-0 flex-1">
            <h2 id="counselor-detail-title" className="text-[20px] font-bold text-soft-ink">
              {c.person.name}
            </h2>
            <p className="mt-1 text-[13px] text-soft-muted">
              {c.person.role} · {c.person.org}
            </p>
            <p className="mt-2.5 flex flex-wrap gap-1.5">
              {c.person.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-soft-primary-soft px-2.5 py-0.5 text-[11.5px] font-semibold text-soft-primary"
                >
                  {tag}
                </span>
              ))}
            </p>
          </div>
        </div>

        <p className="mt-5 rounded-[12px] bg-slate-50 px-4 py-3.5 text-[13.5px] leading-[1.8] text-soft-ink">
          {c.person.headline}
        </p>

        <p className="mt-4 text-[13.5px] leading-[1.85] text-soft-muted">{c.person.bio}</p>

        <Block title="연혁">
          {c.person.career.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </Block>

        <Block title="GENIXX에서 맡는 일">
          {c.person.duty.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </Block>

        <Block title="면담 안내">
          <li>
            방식 — {c.modes.map((m) => counselModes[m]).join(" · ")}
          </li>
          <li>
            요일 — 매주 {c.days.map((d) => WEEK_KO[d]).join(" · ")}요일 {c.from}–{c.to}
          </li>
          <li>{c.focus}</li>
        </Block>

        <p className="mt-5 text-[11.5px] leading-[1.7] text-soft-muted">{peopleDisclaimer}</p>

        <div className="mt-5 flex justify-end">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[2.875rem] items-center justify-center rounded-full border border-soft-line bg-white px-7 text-[15px] font-semibold text-soft-ink transition-colors hover:bg-slate-50"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="text-[14px] font-bold text-soft-ink">{title}</h3>
      <ul className="mt-2 space-y-1.5 text-[13px] leading-[1.75] text-soft-muted">{children}</ul>
    </section>
  );
}
