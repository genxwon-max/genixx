"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { designLinks } from "@/lib/designScreens";
import { seedItems, type ItemDraft } from "@/lib/itemStore";
import { slotsFor, slotsOf, type RoundPlan } from "@/lib/roundPlanStore";
import FormSlot from "@/components/admin2/FormSlot";
import { Body, PageHead, Panel } from "@/components/admin2/ui";
import ConsoleFrame from "../ConsoleFrame";

/**
 * 진단별 문항관리 · 회차 (실제 주소 /admin2/forms/[회차]) — 과목별 평가 시간을 적는 칸을 얹은 시안
 * (/design3, 2026-11-09 사용자 요청 「회차에 들어가서 과목별로 00분 · 10분 · 30분 · 90분처럼 평가 시간을 입력」).
 *
 * 회차 제목 아래, 과목 탭 위에 「과목별 평가 시간」 판을 둔다. 탭은 과목 하나씩 검사지를 짜는 자리라, 시간을
 * 탭 안에 두면 세 과목의 시간을 견주려고 탭을 세 번 눌러야 한다. 시간은 과목끼리 견주며 정하는 값이다.
 *
 *   칸       그 회차에 넣은 과목마다 「□□ 분」. 누르면 자주 쓰는 시간(10 · 20 · 30 · 40 · 45 · 50 · 60 · 90 · 120분)이
 *            고르개로 뜨고, 목록에 없는 값은 그대로 적는다. 5분 ~ 180분
 *   머리     저장된 값과 합계 — 「국어 40분 · 수학 40분 · 과학 40분 · 합계 120분」
 *   단추     「시간 저장」 — 아래 검사지 편집기의 저장 띠에도 「저장」이 있어 이름을 갈랐다. 고친 것이 있으면 「되돌리기」
 *
 * 저장소를 읽지 않는다. 회차(2026 파일럿 4회차)와 시간은 이 파일에 적은 값이고, 「시간 저장」은 저장한 뒤의
 * 상태 주소로 넘어간다. 탭 아래 검사지 편집기는 실제 조각(components/admin2/FormSlot.tsx)에 예시 문항
 * (lib/itemStore.ts seedItems)을 넘긴 것이다.
 */

type Minutes = Record<ItemDraft["subject"], number>;

const SUBJECTS: ItemDraft["subject"][] = ["국어", "수학", "과학"];
const PRESETS = [10, 20, 30, 40, 45, 50, 60, 90, 120];
const RANGE = { min: 5, max: 180, step: 5 };

const BASE: Minutes = { 국어: 40, 수학: 40, 과학: 40 };
const EDITED: Minutes = { 국어: 30, 수학: 40, 과학: 90 };

/** 상태마다 — 저장된 값 · 칸에 적힌 값 · 회차 상태 */
const views: Record<string, { saved: Minutes; draft: Record<string, string>; open?: boolean }> = {
  "": { saved: BASE, draft: text(BASE) },
  edited: { saved: BASE, draft: text(EDITED) },
  saved: { saved: EDITED, draft: text(EDITED) },
  error: { saved: BASE, draft: { 국어: "30", 수학: "200", 과학: "90" } },
  open: { saved: BASE, draft: text(EDITED), open: true },
};

function text(m: Minutes) {
  return Object.fromEntries(SUBJECTS.map((s) => [s, String(m[s])]));
}

const ROUND = { id: "2026-4", label: "2026 파일럿 4회차" };

const plan = (open: boolean): RoundPlan => ({
  round: ROUND.id,
  state: open ? "open" : "draft",
  opensOn: "2026-11-01",
  closesOn: "2026-11-30",
  grade: 3,
  log: [],
});

export default function FormsMinutes({ state }: { state: string }) {
  const view = views[state] ?? views[""];
  const slots = slotsOf(ROUND.id, [], seedItems, slotsFor(plan(!!view.open)));
  const [tab, setTab] = useState(slots[0]?.key);
  const slot = slots.find((s) => s.key === tab) ?? slots[0];

  return (
    <ConsoleFrame at="/admin2/forms">
      <PageHead
        title={ROUND.label}
        actions={
          <>
            <Link href="/admin2/forms" className="a2-btn">
              회차 목록
            </Link>
            <Link href="/admin2/items" className="a2-btn">
              문항 은행
            </Link>
            <Link href={`/admin2/rounds/${ROUND.id}`} className="a2-btn">
              회차 편성 · 개폐
            </Link>
          </>
        }
      />

      <Body className="pb-0">
        <MinutesPanel key={state} state={state} view={view} />
      </Body>

      <div
        role="group"
        aria-label="진단 과목"
        className="flex flex-wrap items-center gap-5 border-b border-(--a2-line) px-3"
      >
        {slots.map((s) => {
          const on = slot?.key === s.key;
          return (
            <button
              key={s.key}
              type="button"
              aria-pressed={on}
              onClick={() => setTab(s.key)}
              className={`-mb-px flex h-9 items-center gap-1.5 border-b-2 a2-t-sm font-bold ${
                on ? "border-(--a2-accent) text-(--a2-ink)" : "border-transparent text-(--a2-ink-3) hover:text-(--a2-ink)"
              }`}
            >
              <span aria-hidden className="a2-dot" style={{ color: "var(--a2-ink-4)" }} />
              {s.subject}
              {/* 탭에도 그 과목의 시간을 적는다 — 검사지를 짜는 동안 몇 분짜리인지가 눈에 남는다 */}
              <span className="a2-tag a2-num">{view.saved[s.subject]}분</span>
            </button>
          );
        })}
      </div>

      <Body>{slot && <FormSlot key={slot.key} roundId={ROUND.id} slot={slot} items={seedItems} by="박서준" />}</Body>
    </ConsoleFrame>
  );
}

function MinutesPanel({
  state,
  view,
}: {
  state: string;
  view: (typeof views)[string];
}) {
  const router = useRouter();
  const to = designLinks("admin-forms-minutes");
  const [draft, setDraft] = useState(view.draft);

  const savedText = Object.fromEntries(SUBJECTS.map((s) => [s, String(view.saved[s])]));
  const dirty = SUBJECTS.some((s) => draft[s] !== savedText[s]);
  const bad = SUBJECTS.filter((s) => {
    const v = Number(draft[s]);
    return !Number.isInteger(v) || v < RANGE.min || v > RANGE.max;
  });
  const total = SUBJECTS.reduce((sum, s) => sum + view.saved[s], 0);

  return (
    <Panel
      title="과목별 평가 시간"
      meta={
        <span className="a2-num">
          {SUBJECTS.map((s) => `${s} ${view.saved[s]}분`).join(" · ")} · 합계 {total}분
        </span>
      }
      actions={
        <>
          {dirty && (
            <button type="button" className="a2-btn" onClick={() => setDraft(savedText)}>
              되돌리기
            </button>
          )}
          <button
            type="button"
            className="a2-btn a2-btn-primary"
            disabled={!dirty || bad.length > 0}
            onClick={() => router.push(to("saved"))}
          >
            시간 저장
          </button>
        </>
      }
    >
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        {SUBJECTS.map((s) => {
          const changed = draft[s] !== savedText[s];
          const wrong = bad.includes(s);
          return (
            <label key={s} className="flex flex-col gap-1">
              <span className="a2-t-sm font-bold text-(--a2-ink-2)">{s}</span>
              <span className="flex items-center gap-1.5">
                <input
                  className="a2-input a2-num"
                  style={{
                    width: "6rem",
                    borderColor: wrong ? "var(--a2-danger)" : changed ? "var(--a2-accent)" : undefined,
                  }}
                  type="number"
                  inputMode="numeric"
                  min={RANGE.min}
                  max={RANGE.max}
                  step={RANGE.step}
                  list="design-minutes-presets"
                  placeholder="00"
                  aria-label={`${s} 평가 시간(분)`}
                  aria-invalid={wrong || undefined}
                  value={draft[s]}
                  onChange={(e) => setDraft((d) => ({ ...d, [s]: e.target.value }))}
                />
                <span className="a2-t-sm text-(--a2-ink-3)">분</span>
              </span>
            </label>
          );
        })}
        <datalist id="design-minutes-presets">
          {PRESETS.map((m) => (
            <option key={m} value={m}>
              {m}분
            </option>
          ))}
        </datalist>
      </div>

      {bad.length > 0 && (
        <p className="a2-note mt-3 w-full" style={{ borderLeftColor: "var(--a2-danger)" }}>
          <span>
            {bad.map((s) => `${s} 평가 시간은 ${RANGE.min}분 이상 ${RANGE.max}분 이하로 적어 주세요.`).join(" · ")}
          </span>
        </p>
      )}
      {bad.length === 0 && dirty && view.open && (
        <p className="a2-note mt-3 w-full" style={{ borderLeftColor: "var(--a2-warn)" }}>
          <span>
            이미 응시 진행중인 회차입니다. 저장하면 이제부터 시작하는 과목에 새 시간이 적용되고, 이미 시작한
            학생의 시간은 그대로입니다.
          </span>
        </p>
      )}
      {state === "saved" && !dirty && (
        <p className="a2-note mt-3 w-full" style={{ borderLeftColor: "var(--a2-ok)" }}>
          <span>평가 시간을 저장했습니다 — 회차 기록에 「국어 40분 → 30분 · 과학 40분 → 90분」으로 남았습니다.</span>
        </p>
      )}
    </Panel>
  );
}
