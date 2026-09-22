"use client";

import Link from "next/link";
import { useState } from "react";
import { useAdminPrefs } from "@/lib/adminStore";
import { useHydrated } from "@/lib/examStore";
import {
  bandFromScore,
  bandOf,
  condText,
  crossKeyOf,
  templateGrades,
  type CrossKey,
  type Rule,
} from "@/lib/reportAssets";
import {
  saveCross,
  saveCrossCuts,
  saveCuts,
  saveRule,
  useAssemblyPreview,
  useBandCuts,
  useCrossCells,
  useCrossCuts,
  useRules,
  type PreviewInput,
} from "@/lib/reportAssetStore";
import { axes } from "@/lib/result";
import { Body, FormRow, PageHead, Panel, SeedNote, Status, Tag } from "@/components/admin2/ui";

/**
 * ADM-08-4 조립 규칙.
 *
 * 왼쪽에 규칙, 오른쪽에 그 규칙이 만드는 결과. 규칙을 고치는 사람이 알고 싶은 것은
 * 「이걸 끄면 리포트에서 무엇이 빠지나」 하나이므로, 표본을 세워 놓고 그 자리에서 보인다.
 *
 * ── 화면에 설명을 적지 않는다 ──
 * 한동안 칸마다 까닭을 한두 줄씩 달아 두었다. 「이 점수가 무엇인가」·「바뀌면」·「끌 수 없는
 * 규칙입니다」… 읽으면 맞는 말이지만 화면이 글로 덮여, 정작 이 화면이 하는 일(규칙을 켜고
 * 끄고 숫자를 고치는 것)이 그 글 사이에 묻혔다. 까닭은 이 주석과 lib/reportAssets.ts에
 * 남기고 화면에는 값만 세운다 — 매일 여는 자리에서 같은 설명을 매번 읽지 않는다.
 *
 * 판을 셋에서 넷으로 늘리는 대신 규칙을 표 한 장으로 눕혔다. 규칙마다 판을 세우면 일곱
 * 개가 세로로 늘어서 화면 두 장이 되는데, 실제로 견주는 값(차례·조건·켬)은 칸이라 표가 맞다.
 *
 * 「자리」 칸을 뺐다. 일곱 줄 가운데 다섯에서 규칙 이름과 글자까지 같아(「교차 해석 | 교차
 * 해석」) 같은 말이 두 번 서 있었다. 어느 절에 들어가는지는 오른쪽 조립 결과가 차례로 답한다.
 *
 * 잠긴 규칙(R-01·R-09)은 스위치 대신 「고정」으로 세우고 까닭은 마우스를 얹었을 때만 뜬다.
 * 못 하는 일에 붉은 줄을 세워 두면 화면이 늘 경고 상태로 보인다.
 *
 * ⚠ 저장 단추를 두지 않는다. 켜고 끄기·차례·숫자는 값 하나가 곧 한 동작이라 누르는 순간
 *   저장한다. 이 콘솔이 저장 단추를 고집하는 자리는 글을 쓰는 칸인데(EditGuard 주석)
 *   여기에는 그런 칸이 없다.
 */
export default function RulesView() {
  const hydrated = useHydrated();
  const by = useAdminPrefs().staffName || "운영자";

  const rules = useRules();
  const cuts = useBandCuts();

  /* 표본 — 이 값으로 규칙이 걸리는지 본다. 씨앗 리포트의 교차 셀에 걸린 아이를 본떠 둔다 */
  const [sample, setSample] = useState<PreviewInput>({
    grade: "e3",
    topAxis: "nature",
    topScore: 74,
    lowAxis: "logic",
    lowScore: 46,
    subjectScore: 44,
    surveys: 0,
  });

  const blocks = useAssemblyPreview(sample);
  const band = bandFromScore(sample.topScore, cuts);
  const on = rules.filter((r) => r.on).length;
  const crossCuts = useCrossCuts();
  /* 지금 표본이 어느 칸에 떨어지는가 — 격자에서 그 칸을 파랗게 세운다 */
  const hereCell = crossKeyOf(sample.subjectScore, sample.topScore, crossCuts);

  if (!hydrated) return <PageHead title="조립 규칙" />;

  return (
    <>
      <PageHead
        title="조립 규칙"
        actions={
          <Link href="/admin2/reports/templates" className="a2-btn">
            해석 템플릿
          </Link>
        }
      />

      <Body className="grid gap-3 xl:grid-cols-[1fr_21rem]">
        <div className="grid content-start gap-3">
          <Panel title="발현 밴드 컷" flush>
            <div className="a2-form">
              <FormRow label="L3 뚜렷하게 나타남">
                <Cut value={cuts.L3} onSave={(v) => saveCuts({ ...cuts, L3: v }, by)} />
                <span className="a2-t-sm text-(--a2-ink-3)">점 이상</span>
              </FormRow>
              <FormRow label="L2 나타나는 중">
                <Cut value={cuts.L2} onSave={(v) => saveCuts({ ...cuts, L2: v }, by)} />
                <span className="a2-t-sm text-(--a2-ink-3)">점 이상</span>
              </FormRow>
              <FormRow label="L1 덜 나타남">
                <span className="a2-t-sm text-(--a2-ink-3)">나머지</span>
              </FormRow>
            </div>
          </Panel>

          <CrossPanel here={hereCell} by={by} />

          <Panel title="규칙" meta={`${on}/${rules.length} 켜짐`} flush>
            <div className="a2-table-wrap">
              <table className="a2-table">
                <thead>
                  <tr>
                    <th style={{ width: "4.5rem" }}>차례</th>
                    <th style={{ width: "5.5rem" }}>번호</th>
                    <th>규칙</th>
                    <th style={{ width: "17rem" }}>조건</th>
                    <th style={{ width: "6rem" }}>켬</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((r) => (
                    <tr key={r.id} data-on={r.on ? undefined : "false"}>
                      <td>
                        <input
                          type="number"
                          className="a2-input a2-mono"
                          style={{ maxWidth: "3.5rem" }}
                          aria-label={`${r.id} 차례`}
                          value={r.order}
                          onChange={(e) => saveRule(r.id, { order: Number(e.target.value) }, by)}
                        />
                      </td>
                      <td className="a2-mono a2-td-key">{r.id}</td>
                      <td className="a2-td-key">{r.label}</td>
                      <td>
                        <Cond rule={r} by={by} />
                      </td>
                      <td className="a2-nowrap">
                        {r.locked ? (
                          <span title={r.locked}>
                            <Status tone="muted">고정</Status>
                          </span>
                        ) : (
                          <label className="a2-choice">
                            <input
                              type="checkbox"
                              checked={r.on}
                              onChange={(e) => saveRule(r.id, { on: e.target.checked }, by)}
                            />
                            {r.on ? "켬" : "끔"}
                          </label>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <div className="grid content-start gap-3">
          <Panel title="표본" flush>
            <div className="a2-form">
              <FormRow label="학년">
                <select
                  className="a2-select"
                  style={{ maxWidth: "10rem" }}
                  aria-label="학년"
                  value={sample.grade}
                  onChange={(e) =>
                    setSample({ ...sample, grade: e.target.value as PreviewInput["grade"] })
                  }
                >
                  {templateGrades.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </FormRow>
              <FormRow label="가장 높은 축">
                <select
                  className="a2-select"
                  style={{ maxWidth: "7.5rem" }}
                  aria-label="가장 높은 축"
                  value={sample.topAxis}
                  onChange={(e) =>
                    setSample({ ...sample, topAxis: e.target.value as PreviewInput["topAxis"] })
                  }
                >
                  {axes
                    .filter((a) => a.subject)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label}
                      </option>
                    ))}
                </select>
                <input
                  type="number"
                  className="a2-input a2-mono"
                  style={{ maxWidth: "4.5rem" }}
                  aria-label="가장 높은 축 점수"
                  value={sample.topScore}
                  onChange={(e) => setSample({ ...sample, topScore: Number(e.target.value) })}
                />
                <Tag accent>{bandOf(band).label}</Tag>
              </FormRow>
              <FormRow label="가장 낮은 축">
                <select
                  className="a2-select"
                  style={{ maxWidth: "7.5rem" }}
                  aria-label="가장 낮은 축"
                  value={sample.lowAxis ?? ""}
                  onChange={(e) =>
                    setSample({
                      ...sample,
                      lowAxis: (e.target.value || null) as PreviewInput["lowAxis"],
                    })
                  }
                >
                  <option value="">없음</option>
                  {axes
                    .filter((a) => a.subject)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label}
                      </option>
                    ))}
                </select>
              </FormRow>
              <FormRow label="과목 점수">
                <input
                  type="number"
                  className="a2-input a2-mono"
                  style={{ maxWidth: "4.5rem" }}
                  aria-label="과목 점수"
                  value={sample.subjectScore}
                  onChange={(e) => setSample({ ...sample, subjectScore: Number(e.target.value) })}
                />
              </FormRow>
              <FormRow label="관찰 설문">
                <select
                  className="a2-select"
                  style={{ maxWidth: "6rem" }}
                  aria-label="관찰 설문 건수"
                  value={sample.surveys}
                  onChange={(e) => setSample({ ...sample, surveys: Number(e.target.value) })}
                >
                  {[0, 1, 2, 3].map((k) => (
                    <option key={k} value={k}>
                      {k}건
                    </option>
                  ))}
                </select>
              </FormRow>
            </div>
          </Panel>

          <Panel title="조립 결과" meta={`블록 ${blocks.length}개`} flush>
            {blocks.length === 0 ? (
              <p className="p-3 a2-t-sm text-(--a2-ink-3)">걸리는 규칙이 없습니다.</p>
            ) : (
              <ul className="divide-y divide-(--a2-line)">
                {blocks.map((b) => (
                  <li key={b.rule.id} className="p-3">
                    <p className="flex flex-wrap items-center gap-1.5">
                      <span className="a2-mono a2-t-xs text-(--a2-ink-4)">{b.rule.id}</span>
                      <span className="a2-t-sm font-semibold text-(--a2-ink)">{b.title}</span>
                      {b.band && <Tag>{b.band}</Tag>}
                      {b.fellBack && <Status tone="warn">기본 문구</Status>}
                    </p>
                    <p className="mt-1 a2-t-sm leading-[1.7] text-(--a2-ink-2)">
                      {b.text || <span className="text-(--a2-ink-4)">문구 없음</span>}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </Body>

      <SeedNote />
    </>
  );
}

/**
 * 컷 한 칸.
 *
 * 치는 동안 저장하지 않는다 — 「75」를 지우고 「8」을 치는 순간 L3가 8점이 되어 그 사이에
 * 모든 아이가 L3가 된다. 칸을 떠날 때 한 번만 저장하고, 값이 어긋나면(L3 ≤ L2) 저장소가
 * 거절하므로 앞 값으로 되돌아온다.
 */
function Cut({ value, onSave }: { value: number; onSave: (v: number) => boolean }) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      type="number"
      className="a2-input a2-mono"
      style={{ maxWidth: "5rem" }}
      value={draft ?? value}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== null) onSave(Number(draft));
        setDraft(null);
      }}
    />
  );
}

/** 조건 — 숫자만 고친다. 갈래는 바꾸지 못한다 */
function Cond({ rule, by }: { rule: Rule; by: string }) {
  const c = rule.cond;

  if (c.kind === "sourcesBelow") {
    return (
      <span className="flex items-center gap-1.5 a2-nowrap a2-t-sm">
        <span>관찰 설문</span>
        <input
          type="number"
          className="a2-input a2-mono"
          style={{ maxWidth: "3.5rem" }}
          aria-label={`${rule.id} 설문 건수`}
          value={c.n}
          onChange={(e) => saveRule(rule.id, { cond: { ...c, n: Number(e.target.value) } }, by)}
        />
        <span>건 미만</span>
      </span>
    );
  }

  return <span className="a2-t-sm text-(--a2-ink-3)">{condText(c)}</span>;
}

/**
 * 교차 셀 — 학력 × 재능 2×2 격자.
 *
 * 사이트맵 ADM-08-4가 이 화면에 요구한 것이 이 격자다. 「학력 부진 × 재능 강세」 같은 조합에
 * 어떤 말이 붙는지를 여기서 고친다.
 *
 * ── 왜 표가 아니라 격자인가 ──
 * 네 칸을 목록으로 눕히면 「학력 우수 × 재능 강세」·「학력 부진 × 재능 강세」… 네 줄이 되는데,
 * 그러면 **두 축이 있다는 사실 자체가 안 보인다.** 이 화면에서 사람이 확인하는 것은 칸 하나의
 * 문구가 아니라 「네 칸이 서로 다른 말을 하고 있는가」이고, 그것은 나란히 놓아야 보인다.
 *
 * 배제영역 둘은 2×2 밖이라 아래에 따로 눕힌다. 이번 회차에는 걸리지 않지만(재지 않은 축이라
 * 조립 시점에 신호가 없다) 자리를 비워 두지 않는다 — 빼 두면 그 자리가 있다는 것을 아무도
 * 모른다. 꺼진 채로 서 있어 지금 안 나간다는 것이 격자에서 읽힌다.
 *
 * ⚠ 지금 표본이 떨어지는 칸을 파랗게 세운다. 오른쪽 표본의 점수를 바꾸면 이 칸이 따라 옮겨
 *   가므로, 「내가 지금 고치는 칸이 그 아이에게 가는 칸인가」를 눈으로 맞출 수 있다.
 */
function CrossPanel({ here, by }: { here: CrossKey; by: string }) {
  const cells = useCrossCells();
  const cuts = useCrossCuts();
  const [open, setOpen] = useState<CrossKey | null>(null);

  const at = (paper: "high" | "low", talent: "high" | "low") =>
    cells.find((c) => c.paper === paper && c.talent === talent)!;
  const spare = cells.filter((c) => c.paper === null);
  const cell = cells.find((c) => c.id === open) ?? null;

  const box = (c: (typeof cells)[number]) => (
    <button
      key={c.id}
      type="button"
      className="grid content-start gap-1 border border-(--a2-line) bg-(--a2-panel) p-2.5 text-left"
      style={
        c.id === here
          ? { background: "var(--a2-accent-soft)", borderColor: "var(--a2-accent-line)" }
          : undefined
      }
      aria-pressed={open === c.id}
      onClick={() => setOpen(open === c.id ? null : c.id)}
    >
      <span className="flex flex-wrap items-center gap-1.5">
        <span className="a2-t-sm font-semibold text-(--a2-ink)">{c.label}</span>
        {c.id === here && <Tag accent>표본</Tag>}
        {!c.on && <Status tone="muted">끔</Status>}
      </span>
      <span className="a2-t-xs text-(--a2-ink-3)">{c.desc}</span>
    </button>
  );

  return (
    <Panel
      title="교차 셀"
      meta={`${cells.filter((c) => c.on).length}/${cells.length} 켜짐`}
      flush
    >
      <div className="a2-form">
        <FormRow label="학력 컷">
          <Cut value={cuts.paper} onSave={(v) => saveCrossCuts({ ...cuts, paper: v })} />
          <span className="a2-t-sm text-(--a2-ink-3)">점 미만이면 부진</span>
        </FormRow>
        <FormRow label="재능 컷">
          <Cut value={cuts.talent} onSave={(v) => saveCrossCuts({ ...cuts, talent: v })} />
          <span className="a2-t-sm text-(--a2-ink-3)">점 이상이면 강세</span>
        </FormRow>
      </div>

      <div className="p-3">
        {/* 2×2 — 세로가 학력, 가로가 재능 */}
        <div className="grid grid-cols-[5.5rem_1fr_1fr] gap-1.5">
          <span aria-hidden />
          <span className="a2-label text-center">재능 강세</span>
          <span className="a2-label text-center">재능 약세</span>

          <span className="a2-label flex items-center">학력 우수</span>
          {box(at("high", "high"))}
          {box(at("high", "low"))}

          <span className="a2-label flex items-center">학력 부진</span>
          {box(at("low", "high"))}
          {box(at("low", "low"))}

          <span className="a2-label flex items-center">배제영역</span>
          {spare.map((c) => box(c))}
        </div>

        {/* ⚠ key를 셀 번호로 준다. 없으면 다른 칸을 눌러도 아래 CellText가 그대로 살아남아,
            앞 칸에서 치다 만 초안이 새 칸의 문구인 것처럼 보인다 — 그 상태로 칸을 떠나면
            앞 칸의 글이 새 칸에 저장된다 */}
        {cell && (
          <div key={cell.id} className="mt-3 border-t border-(--a2-line) pt-3">
            <div className="a2-form">
              <FormRow label="붙는 조합">
                <Tag accent>{cell.desc}</Tag>
                <label className="a2-choice">
                  <input
                    type="checkbox"
                    checked={cell.on}
                    onChange={(e) => saveCross(cell.id, { on: e.target.checked }, by)}
                  />
                  {cell.on ? "켬" : "끔"}
                </label>
              </FormRow>
              <FormRow label="리포트 문구">
                <CellText
                  value={cell.text}
                  onSave={(v) => saveCross(cell.id, { text: v }, by)}
                  rows={4}
                />
              </FormRow>
              <FormRow label="다음 단계">
                <CellText
                  value={cell.next}
                  onSave={(v) => saveCross(cell.id, { next: v }, by)}
                  rows={2}
                />
              </FormRow>
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}

/** 셀 안의 글 한 칸 — 칸을 떠날 때 저장한다 */
function CellText({
  value,
  onSave,
  rows,
}: {
  value: string;
  onSave: (v: string) => void;
  rows: number;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <textarea
      className="a2-textarea"
      rows={rows}
      value={draft ?? value}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== null && draft.trim() && draft !== value) onSave(draft.trim());
        setDraft(null);
      }}
    />
  );
}
