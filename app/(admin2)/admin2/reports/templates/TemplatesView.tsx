"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAdminPrefs } from "@/lib/adminStore";
import { n } from "@/lib/admin2";
import { useHydrated } from "@/lib/examStore";
import {
  bandOf,
  isCustomSlot,
  keyOf,
  measuredAxes,
  slotOf,
  slotOrder,
  templateGrades,
  type SlotId,
  type TemplateGrade,
} from "@/lib/reportAssets";
import { addSlot, useCustomSlots, useEveryTemplate, type TemplateRow } from "@/lib/reportAssetStore";
import { axes } from "@/lib/result";
import DataTable, { type Col, type Filter } from "@/components/admin2/DataTable";
import { Body, FormRow, PageHead, SeedNote, Status, Tag } from "@/components/admin2/ui";

/**
 * ADM-08-1 해석 템플릿 — 목록.
 *
 * 학년은 탭이 아니라 조회 조건 「학년」이다(2026-09-22 요청). 문구를 초1 ~ 중3 학년마다 따로 쓰게
 * 되면서 탭이 아홉이 되어 한 줄에 서지 않았다. 「학년마다 채운 칸 / 전체」는 표 위 한 줄에 모아
 * 어느 학년이 비었는지를 먼저 보게 한다 — 그것이 이 화면의 첫 물음이다.
 *
 * ── 격자가 아니라 표인 까닭 ──
 * 「축 × 밴드」 격자를 먼저 짜 보았다. 그런데 자리(slot)마다 붙는 차원이 다르다 — 유형
 * 판정은 축만, 강하게 나타난 축은 축과 밴드 둘 다, 미측정 안내는 어느 것도 안 붙는다.
 * 네모난 격자에 넣으려면 안 쓰는 칸을 회색으로 막아 두어야 하고, 그러면 「빈 칸」과
 * 「없는 칸」이 같은 회색으로 서서 둘을 못 가린다. 표로 두면 있는 칸만 줄로 서고, 상태
 * 칸이 「빈 칸」을 제 글자로 말한다.
 *
 * 표로 두어 얻은 것이 하나 더 있다 — 검색·거르개·정렬이 딸려 온다(DataTable). 문구를
 * 고치러 오는 사람은 대개 「그 말이 어느 칸에 있더라」를 들고 오는데, 그 물음은 검색으로만
 * 풀린다.
 *
 * ⚠ 고치는 자리는 제 주소로 간다(/admin2/reports/templates/[id]). 한동안 목록 아래에 판으로
 *   폈다 — 문구가 한두 문장이라 그 편이 가볍다고 보았는데, 주소가 없어 「이 칸 좀 봐 달라」고
 *   링크를 건넬 수가 없었다. 문구는 여럿이 함께 다듬는 글이라 그 왕복이 잦다. 공지를 상세로
 *   뺀 것과 같은 까닭이고, 이 콘솔의 다른 목록도 전부 그렇게 간다.
 */

export default function TemplatesView() {
  const [adding, setAdding] = useState(false);
  const hydrated = useHydrated();
  const custom = useCustomSlots();

  const rows = useEveryTemplate();

  /* 학년마다 「채운 칸 / 전체」 — 표 위 한 줄에 모아 어느 학년이 비었는지를 먼저 본다 */
  const byGrade = useMemo(
    () =>
      templateGrades.map((g) => {
        const mine = rows.filter((r) => r.grade === g.id);
        return { ...g, filled: mine.filter((r) => !r.empty).length, total: mine.length };
      }),
    [rows],
  );

  const cols: Col<TemplateRow>[] = useMemo(
    () => [
      {
        key: "grade",
        head: "학년",
        width: "5rem",
        nowrap: true,
        value: (r) => gradeShort(r.grade),
        sort: (r) => GRADE_RANK(r.grade),
        cell: (r) => <span className="a2-t-sm font-semibold text-(--a2-ink-2)">{gradeShort(r.grade)}</span>,
      },
      {
        key: "slot",
        head: "자리",
        width: "9rem",
        nowrap: true,
        value: (r) => slotOf(r.slot).label,
        sort: (r) => SLOT_RANK(r.slot),
        cell: (r) => (
          <span title={slotOf(r.slot).guide} className="inline-flex flex-col">
            <span className="font-semibold text-(--a2-ink)">{slotOf(r.slot).label}</span>
            {/* 운영자가 더한 자리 — 씨앗 자리와 갈라 보여야 지울 수 있는 자리인지 안다 */}
            {isCustomSlot(r.slot) && <span className="a2-t-xs text-(--a2-accent)">추가한 자리</span>}
          </span>
        ),
      },
      {
        key: "axis",
        head: "재능 축",
        width: "7rem",
        nowrap: true,
        value: (r) => (r.axis ? axisLabel(r.axis) : ""),
        cell: (r) =>
          r.axis ? <Tag>{axisLabel(r.axis)}</Tag> : <span className="text-(--a2-ink-4)">전 축</span>,
      },
      {
        key: "band",
        head: "발현 밴드",
        width: "8.5rem",
        nowrap: true,
        value: (r) => (r.band ? `${r.band} ${bandOf(r.band).label}` : ""),
        cell: (r) =>
          r.band ? (
            <span title={bandOf(r.band).desc}>
              <span className="a2-mono a2-t-xs text-(--a2-ink-3)">{r.band}</span>{" "}
              <span className="a2-t-sm">{bandOf(r.band).label}</span>
            </span>
          ) : (
            <span className="text-(--a2-ink-4)">밴드 없음</span>
          ),
      },
      {
        /* a2-clip(max-width:0)을 주지 않는다. 말줄임 칸이 둘이면 width:100%인 쪽이 자리를
           다 먹고 이쪽은 59px까지 눌려 「이…」만 남는다 — 제목은 열세 자 안쪽이라
           줄이지 않고 폭을 지키는 편이 낫다 */
        key: "title",
        head: "제목",
        width: "10rem",
        nowrap: true,
        value: (r) => r.title,
        cell: (r) => (
          <Link
            href={`/admin2/reports/templates/${r.id}`}
            className="font-semibold text-(--a2-ink) hover:text-(--a2-accent) hover:underline"
          >
            {r.title || <span className="text-(--a2-ink-4)">제목 없음</span>}
          </Link>
        ),
      },
      {
        key: "text",
        head: "문구",
        width: "100%",
        clip: true,
        value: (r) => r.text,
        cell: (r) =>
          r.text ? (
            <span title={r.text} className="a2-t-sm text-(--a2-ink-2)">
              {r.text}
            </span>
          ) : (
            <span className="a2-t-sm text-(--a2-ink-4)">아직 아무도 쓰지 않았습니다.</span>
          ),
      },
      {
        key: "state",
        head: "상태",
        width: "6.5rem",
        nowrap: true,
        value: (r) => (r.empty ? "빈 칸" : r.edited ? "고침" : "씨앗"),
        cell: (r) =>
          r.empty ? (
            <Status tone="warn">빈 칸</Status>
          ) : r.edited ? (
            <span title={`${r.editedAt} · ${r.editedBy}`}>
              <Status tone="info">{isCustomSlot(r.slot) ? "작성" : "고침"}</Status>
            </span>
          ) : (
            <Status tone="muted">기본 문구</Status>
          ),
      },
      {
        key: "act",
        head: "",
        width: "5.5rem",
        nowrap: true,
        cell: (r) => (
          <Link
            href={`/admin2/reports/templates/${r.id}`}
            className="a2-btn a2-btn-sm"
            aria-label={`${slotOf(r.slot).label} 문구 ${r.empty ? "쓰기" : "고치기"}`}
          >
            {r.empty ? "쓰기" : "고치기"}
          </Link>
        ),
      },
    ],
    [],
  );

  const filters: Filter<TemplateRow>[] = useMemo(
    () => [
      {
        id: "grade",
        label: "학년",
        options: templateGrades.map((g) => ({ value: g.id, label: g.label })),
        match: (r, v) => r.grade === v,
      },
      {
        id: "state",
        label: "상태",
        options: [
          { value: "empty", label: "빈 칸" },
          { value: "edited", label: "고친 것" },
          { value: "seed", label: "기본 문구" },
        ],
        match: (r, v) =>
          v === "empty" ? r.empty : v === "edited" ? r.edited : !r.empty && !r.edited,
      },
      {
        id: "slot",
        label: "자리",
        options: [...slotOrder, ...custom.map((c) => c.id)].map((s) => ({ value: s, label: slotOf(s).label })),
        match: (r, v) => r.slot === v,
      },
      {
        id: "axis",
        label: "재능 축",
        options: axes
          .filter((a) => a.subject)
          .map((a) => ({ value: a.id, label: a.label })),
        match: (r, v) => r.axis === v,
      },
    ],
    [custom],
  );

  return (
    <>
      <PageHead
        title="해석 템플릿"
        actions={
          <button type="button" className="a2-btn a2-btn-primary" onClick={() => setAdding(true)}>
            템플릿 추가
          </button>
        }
      />

      {/* 학년마다 채운 칸 — 빈 학년이 먼저 눈에 걸린다. 빈 칸은 조립할 때 같은 학년대의 다른 학년,
          그다음 초등 3학년 문구로 물러선다(물러선 사실은 조립 규칙 화면의 미리보기에 적힌다) */}
      {hydrated && (
        <Body className="pb-0">
          <p className="a2-note flex-wrap" style={{ borderLeftColor: "var(--a2-info)" }}>
            <span className="font-semibold">학년마다 채운 칸</span>
            {byGrade.map((g) => (
              <span key={g.id} className="a2-t-sm">
                {g.short}{" "}
                <span
                  className="a2-num font-bold"
                  style={{ color: g.filled < g.total ? "var(--a2-warn)" : "var(--a2-ok)" }}
                >
                  {n(g.filled)}/{n(g.total)}
                </span>
              </span>
            ))}
            <span className="a2-t-xs text-(--a2-ink-4)">
              빈 칸은 같은 학년대의 다른 학년, 그다음 초등 3학년 문구로 물러섭니다.
            </span>
          </p>
        </Body>
      )}

      <DataTable
        rows={rows}
        cols={cols}
        getKey={(r) => r.id}
        filters={filters}
        showCount={false}
        searchHint="문구 · 제목 · 축 검색"
        empty="조건에 맞는 칸이 없습니다."
      />

      {adding && <AddSlotDialog onClose={() => setAdding(false)} />}

      <SeedNote>
        고친 문구는 이 브라우저에만 저장됩니다(lib/reportAssetStore.ts). 기본 문구는
        lib/reportAssets.ts의 씨앗입니다. 여기서 무엇을 고쳐도 이미 발행된 리포트는 그대로
        두고 다음 조립부터 적용됩니다.
      </SeedNote>
    </>
  );
}


const GRADE_RANK = (g: TemplateGrade) => templateGrades.findIndex((x) => x.id === g);
const gradeShort = (g: TemplateGrade) => templateGrades.find((x) => x.id === g)?.short ?? g;

/** 표의 기본 순서 — 리포트에 서는 차례 그대로. 더한 자리는 맨 뒤 */
const SLOT_RANK = (id: SlotId) => (slotOrder.includes(id) ? slotOrder.indexOf(id) : 100);

/**
 * 템플릿 추가 — 리포트에 새 자리(절)를 더한다 (2026-09-22 요청).
 *
 * 씨앗 자리 여섯은 칸이 이미 다 깔려 있어(자리 × 학년대 × 축 × 밴드) 「쓰기」로 채운다. 그 밖의 절
 * (「선생님 한마디」 · 「다음 진단 안내」 …)을 리포트에 붙이고 싶을 때 여기서 자리를 만든다. 만들면
 * 학년대마다 빈 칸이 목록에 서고, 조립 규칙에도 한 줄이 따라 서서(맨 끝 차례) 문구를 채우는 순간부터
 * 다음 조립에 붙는다. 채우지 않은 학년대는 다른 칸처럼 초등 3~4학년 문구로 물러선다.
 *
 * 축마다 · 밴드마다 다른 글인지를 여기서 정한다. 만든 뒤에는 바꾸지 않는다 — 바꾸면 이미 쓴 칸의
 * 열쇠가 달라져 쓴 문구가 격자에서 떨어져 나간다. 잘못 만들었으면 지우고 다시 만든다(상세 화면).
 */
function AddSlotDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const by = useAdminPrefs().staffName || "운영자";
  const [label, setLabel] = useState("");
  const [section, setSection] = useState("");
  const [guide, setGuide] = useState("");
  const [byAxis, setByAxis] = useState(false);
  const [byBand, setByBand] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cells = (byAxis ? measuredAxes.length : 1) * (byBand ? 3 : 1);

  const submit = () => {
    const id = addSlot({ label, section, guide, byAxis, byBand }, by);
    if (!id) {
      setError(label.trim() ? "같은 이름의 자리가 이미 있습니다." : "자리 이름을 적어 주세요.");
      return;
    }
    /* 만든 자리의 첫 칸(초등 3학년 — 빈 칸이 물러서는 학년)으로 바로 들어가 문구를 쓴다 */
    router.push(
      `/admin2/reports/templates/${keyOf(
        id,
        "e3",
        byAxis ? measuredAxes[0].id : null,
        byBand ? "L3" : null,
      )}`,
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="a2-add-slot"
        className="a2-panel w-full max-w-[34rem]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-(--a2-line) px-5 py-3.5">
          <h2 id="a2-add-slot" className="a2-h">
            템플릿 추가
          </h2>
          <p className="mt-1 a2-t-sm text-(--a2-ink-3)">
            리포트에 새 절을 더합니다. 만들면 학년마다 빈 칸이 생기고, 문구를 채우면 다음 조립부터 붙습니다.
          </p>
        </div>
        <div className="a2-form">
          <FormRow label="자리 이름" req>
            <input
              className="a2-input"
              value={label}
              autoFocus
              placeholder="예) 선생님 한마디"
              onChange={(e) => {
                setLabel(e.target.value);
                setError(null);
              }}
            />
          </FormRow>
          <FormRow label="리포트 절 제목" hint="비우면 자리 이름을 씁니다.">
            <input
              className="a2-input"
              value={section}
              placeholder={label.trim() || "리포트에 서는 절 이름"}
              onChange={(e) => setSection(e.target.value)}
            />
          </FormRow>
          <FormRow label="쓰는 안내" hint="이 자리의 글이 무엇을 말해야 하는지 — 문구를 쓰는 화면에 그대로 섭니다.">
            <textarea
              className="a2-textarea"
              rows={2}
              value={guide}
              placeholder="예) 담당 전문가가 이번 진단에서 가장 눈여겨본 점을 한두 문장으로 적습니다."
              onChange={(e) => setGuide(e.target.value)}
            />
          </FormRow>
          <FormRow label="나눠 쓰기" hint={`학년마다 ${cells}칸 · 모두 ${cells * templateGrades.length}칸이 생깁니다.`}>
            <span className="flex flex-wrap items-center gap-x-5 gap-y-1">
              <label className="a2-choice">
                <input type="checkbox" checked={byAxis} onChange={(e) => setByAxis(e.target.checked)} />
                재능 축마다 다른 글
              </label>
              <label className="a2-choice">
                <input type="checkbox" checked={byBand} onChange={(e) => setByBand(e.target.checked)} />
                발현 밴드마다 다른 글
              </label>
            </span>
          </FormRow>
        </div>
        {error && (
          <p className="a2-note mx-5 mt-3" style={{ borderLeftColor: "var(--a2-danger)" }}>
            <span>{error}</span>
          </p>
        )}
        <div className="flex justify-end gap-1.5 px-5 py-3.5">
          <button type="button" className="a2-btn" onClick={onClose}>
            그만두기
          </button>
          <button type="button" className="a2-btn a2-btn-primary" disabled={!label.trim()} onClick={submit}>
            추가하고 문구 쓰기
          </button>
        </div>
      </div>
    </div>
  );
}

const axisLabel = (id: string) => axes.find((a) => a.id === id)?.label ?? id;
