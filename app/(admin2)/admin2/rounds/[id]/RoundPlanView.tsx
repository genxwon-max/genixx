"use client";

import Link from "next/link";
import { useState } from "react";
import { roundStates } from "@/lib/admin";
import { formTone, n } from "@/lib/admin2";
import { useAdminPrefs, recordAction } from "@/lib/adminStore";
import { useForms } from "@/lib/formStore";
import { useItems } from "@/lib/itemStore";
import {
  checkPeriod,
  closeRound,
  finishRound,
  openChecks,
  openRound,
  planActions,
  planOf,
  reopenRound,
  setPeriod,
  slotsFor,
  slotsOf,
  usePlans,
  useRounds,
  type PlanGateAction,
} from "@/lib/roundPlanStore";
import { Body, DescList, PageHead, Panel, SeedNote, Status, Tag } from "@/components/admin2/ui";
import TableBox from "@/components/admin2/TableBox";
/* 검사지를 짜는 조각은 공용으로 옮겼다 — 평가별 문항관리 상세(ADM-04-3)의 과목 탭도
   같은 것을 그린다. 담는 자리가 둘이면 같은 검사지를 두 화면이 다르게 그린다 */
import FormSlot from "@/components/admin2/FormSlot";
import RoundNotes from "./RoundNotes";
import SlotPicker from "./SlotPicker";

/**
 * ADM-05-4 회차 편성 — 이 회차에 무엇이 나가고, 언제 열리고, 지금 열어도 되는가.
 *
 * 회차 목록(ADM-05)은 「어디까지 왔나」를 보는 자리고 여기는 「무엇을 내보낼까」를
 * 정하는 자리다. 셋을 한 화면에 둔 까닭은 셋이 한 물음의 앞뒤여서다 —
 *
 *   ① 편성   과목 × 학년군 여섯 칸. 한 칸이 검사지 한 벌이고 칸마다 짜거나 비운다.
 *   ② 기간   언제부터 언제까지 여는가. 회차 목록의 값을 받아 여기서 고친다.
 *   ③ 개폐   준비중 → 응시 진행중 → 채점중 → 마감. 여는 것은 사람이 누르되
 *            **확정하지 않은 검사지가 하나라도 남아 있으면 막는다.**
 *
 * 편성을 표가 아니라 여섯 줄 고정 표로 두는 것은, 여기서 세는 것이 「있는 줄」이 아니라
 * 「빈 칸이 어디인가」이기 때문이다. 없는 칸을 안 그리면 짜야 할 칸이 남았다는 사실을
 * 회차를 열려다가 처음 알게 된다.
 */
export default function RoundPlanView({ id }: { id: string }) {
  const forms = useForms();
  const items = useItems();
  const plans = usePlans();
  const allRounds = useRounds();
  const prefs = useAdminPrefs();

  const [openKey, setOpenKey] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ opensOn: string; closesOn: string } | null>(null);
  const [periodWhy, setPeriodWhy] = useState("");
  const [gateWhy, setGateWhy] = useState("");

  const round = allRounds.find((r) => r.id === id);

  if (!round) {
    return (
      <>
        <PageHead
          title="회차를 찾지 못했습니다"
          actions={
            <Link href="/admin2/rounds" className="a2-btn">
              회차 목록
            </Link>
          }
        />
        <Body>
          <Panel title="없는 회차">
            <p className="a2-t-sm text-(--a2-ink-2)">
              <span className="a2-mono">{id}</span> 회차가 목록에 없습니다(lib/admin.ts).
            </p>
          </Panel>
        </Body>
      </>
    );
  }

  const plan = planOf(plans, round.id);
  const slots = slotsOf(round.id, forms, items, slotsFor(plan));
  const checks = openChecks(round.id, slots, plans);
  const blocks = checks.filter((c) => c.tone === "block");
  const warns = checks.filter((c) => c.tone === "warn");

  const by = prefs.staffName || "운영자";
  const built = slots.filter((s) => s.form);
  const confirmed = slots.filter((s) => s.form?.state === "confirmed");
  const slot = slots.find((s) => s.key === openKey) ?? null;

  /* ── 기간 ──
     고치는 동안만 로컬 값을 들고, 저장하거나 되돌리면 저장소 값으로 돌아간다.
     늘 로컬 상태로 들고 있으면 다른 탭에서 바꾼 기간이 이 화면에 안 들어온다. */
  const shown = edit ?? { opensOn: plan.opensOn, closesOn: plan.closesOn };
  const periodBad = checkPeriod(shown.opensOn, shown.closesOn);
  const periodDirty = shown.opensOn !== plan.opensOn || shown.closesOn !== plan.closesOn;

  /* ── 차례 ──
     지금 어디까지 왔는지. 세 걸음을 숫자로 세워 두지 않으면 이 화면을 처음 여는
     사람은 어디부터 눌러야 하는지 알 수 없다. */
  const steps = [
    { name: "검사지 짜기", note: built.length > 0 ? `${built.length}벌` : "아직 없음", done: built.length > 0 },
    {
      name: "확정",
      note: built.length === 0 ? "검사지를 짠 뒤에" : `${confirmed.length} / ${built.length}벌`,
      done: built.length > 0 && confirmed.length === built.length,
    },
    {
      name: "회차 열기",
      note:
        plan.state === "draft"
          ? blocks.length === 0
            ? "이제 열 수 있습니다"
            : `막는 것 ${blocks.length}건`
          : (plan.openedAt ?? roundStates[plan.state].label),
      done: plan.state !== "draft",
    },
  ];

  /* 지금 상태에서 누를 수 있는 것만 낸다. 넷을 늘 세워 두고 흐리게 하면 무엇이
     지금 되는 것인지 매번 읽어야 한다. */
  const gates: { action: PlanGateAction; label: string; body: string; danger?: boolean; blocked?: boolean }[] =
    plan.state === "draft"
      ? [
          {
            action: "open",
            label: "회차 열기",
            body: "확정한 검사지가 이 회차의 응시 문항이 됩니다. 담긴 순서 그대로 나가고, 비워 둔 칸의 과목·학년군은 이번 회차에 응시하지 않습니다.",
            blocked: blocks.length > 0,
          },
        ]
      : plan.state === "open"
        ? [
            {
              action: "close",
              label: "응시 마감",
              body: "이 회차로는 더 응시를 시작할 수 없게 됩니다. 회차가 채점중으로 넘어가고 채점과 판정은 그대로 이어집니다.",
            },
          ]
        : plan.state === "grading"
          ? [
              {
                action: "finish",
                label: "회차 종료",
                body: "채점과 리포트 발행이 끝났다는 뜻입니다. 종료한 회차의 자료는 읽기만 합니다.",
              },
              {
                action: "reopen",
                label: "응시 다시 열기",
                body: "마감 뒤에 들어온 응시와 그 전 응시가 한 회차에 섞입니다. 채점 중이던 자료는 그대로 두고 응시만 다시 열립니다.",
                danger: true,
              },
            ]
          : [];

  const run = (action: PlanGateAction, text: string) => {
    const fn = { open: openRound, close: closeRound, finish: finishRound, reopen: reopenRound }[action];
    fn(round.id, by, text);
    recordAction(round.label, planActions[action], text, by);
    setGateWhy("");
  };

  return (
      <>
        <PageHead
          title={round.label}
          actions={
            <>
              <Link href="/admin2/items" className="a2-btn">
                문항 은행
              </Link>
              <Link href="/admin2/rounds" className="a2-btn">
                회차 목록
              </Link>
            </>
          }
        />
        <Body>

          {/* 차례 세 걸음 */}
          <ol className="a2-panel mb-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 px-2.5 py-2">
            {steps.map((s, k) => (
              <li key={s.name} className="flex items-baseline gap-1.5">
                <span
                  className="a2-mono a2-t-xs font-bold"
                  style={{ color: s.done ? "var(--a2-ok)" : "var(--a2-ink-4)" }}
                >
                  {s.done ? "✓" : `0${k + 1}`}
                </span>
                <span className="a2-t-sm font-bold text-(--a2-ink)">{s.name}</span>
                <span className="a2-t-xs text-(--a2-ink-3)">{s.note}</span>
              </li>
            ))}
          </ol>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
            <div className="grid content-start gap-3">
              {/* ① 편성판 — 여섯 칸을 빠짐없이 낸다 */}
              <Panel title="편성판" meta={`이 회차가 보는 ${slots.length}칸`} flush>
                <TableBox>
                  <table className="a2-table">
                    <thead>
                      <tr>
                        <th scope="col" style={{ width: "12rem" }}>
                          칸
                        </th>
                        <th scope="col" style={{ width: "6rem" }}>
                          검사지
                        </th>
                        <th scope="col" className="a2-th-num" style={{ width: "4rem" }}>
                          문항
                        </th>
                        <th scope="col" style={{ width: "9rem" }}>
                          단계 배분
                        </th>
                        <th scope="col" className="a2-th-num" style={{ width: "4rem" }}>
                          배점
                        </th>
                        <th scope="col" className="a2-th-num" style={{ width: "4rem" }}>
                          앵커
                        </th>
                        <th scope="col" className="a2-th-num" style={{ width: "6rem" }}>
                          남은 승인
                        </th>
                        <th scope="col" style={{ width: "6rem" }}>
                          <span className="sr-only">동작</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {slots.map((s) => {
                        const counts = ["S1", "S2", "S3", "S4"].map(
                          (l) => s.picked.filter((i) => i.level === l).length,
                        );
                        return (
                          <tr key={s.key}>
                            <td className="a2-td-key a2-nowrap">{s.label}</td>
                            <td className="a2-nowrap">
                              {s.form ? (
                                <Status tone={formTone[s.form.state]}>
                                  {s.form.state === "confirmed" ? "확정" : "초안"}
                                </Status>
                              ) : (
                                <span className="a2-t-sm text-(--a2-ink-4)">비어 있음</span>
                              )}
                            </td>
                            <td className="a2-td-num">
                              {s.form ? s.picked.length : <span className="text-(--a2-ink-4)">—</span>}
                            </td>
                            <td className="a2-mono a2-nowrap a2-t-sm">
                              {s.form ? (
                                counts.map((c, k) => (
                                  <span key={k} style={{ color: c === 0 ? "var(--a2-danger)" : undefined }}>
                                    {c}
                                    {k < 3 ? " · " : ""}
                                  </span>
                                ))
                              ) : (
                                <span className="text-(--a2-ink-4)">—</span>
                              )}
                            </td>
                            <td className="a2-td-num">
                              {s.form ? (
                                s.picked.reduce((sum, i) => sum + i.points, 0)
                              ) : (
                                <span className="text-(--a2-ink-4)">—</span>
                              )}
                            </td>
                            <td className="a2-td-num">
                              {s.form ? (
                                s.picked.filter((i) => i.anchor).length
                              ) : (
                                <span className="text-(--a2-ink-4)">—</span>
                              )}
                            </td>
                            <td className="a2-td-num">
                              <span style={{ color: s.pool === 0 ? "var(--a2-ink-4)" : undefined }}>{s.pool}</span>
                            </td>
                            <td className="a2-nowrap">
                              <button
                                type="button"
                                className="a2-btn a2-btn-sm"
                                aria-pressed={openKey === s.key}
                                onClick={() => setOpenKey(openKey === s.key ? null : s.key)}
                              >
                                {s.form ? "열기" : "짜기"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </TableBox>
                <p className="border-t border-(--a2-line) px-2.5 py-1.5 a2-t-xs text-(--a2-ink-4)">
                  단계 배분은 S1 · S2 · S3 · S4 차례. 0인 단계는 그 층을 이 검사지로 재지 못한다는 뜻입니다. 남은 승인은
                  아직 담지 않은, 담을 수 있는 문항 수입니다.
                </p>
              </Panel>

              {/* 이 회차가 볼 칸을 다시 정한다. 편성판 바로 아래에 두는 까닭은,
                  「비어 있는 칸이 셋이나 남았다」를 본 다음에 드는 물음이 대개 「그 칸을
                  이번엔 안 보면 안 되나」라서다 */}
              <SlotPicker plan={plan} locked={plan.state !== "draft"} />

              {/* 공지는 편성 칸 다음에 둔다. 무엇을 낼지 정한 다음에 나오는 물음이
                  「이번엔 무슨 말을 함께 낼까」라서다 */}
              <RoundNotes plan={plan} locked={plan.state === "closed"} />

              {/* key를 칸 열쇠로 준다. 없으면 국어 칸에서 체크해 둔 문항 목록을 든 채로 수학
                  칸이 열려, 담기를 누르면 다른 과목 문항이 들어간다(확정 대조에서 걸리기는
                  하지만 그 전에 담기는 것 자체를 막는 편이 낫다). */}
              {slot && (
                <FormSlot
                  key={slot.key}
                  roundId={round.id}
                  slot={slot}
                  items={items}
                  by={by}
                  onClose={() => setOpenKey(null)}
                />
              )}
            </div>

            <div className="grid content-start gap-3">
              {/* ② 응시 기간 */}
              <Panel title="응시 기간" meta="회차마다 정합니다">
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="a2-field">
                    <span className="a2-label">시작일</span>
                    <input
                      type="date"
                      className="a2-input a2-mono"
                      value={shown.opensOn}
                      onChange={(e) => setEdit({ ...shown, opensOn: e.target.value })}
                    />
                  </label>
                  <label className="a2-field">
                    <span className="a2-label">마감일</span>
                    <input
                      type="date"
                      className="a2-input a2-mono"
                      value={shown.closesOn}
                      onChange={(e) => setEdit({ ...shown, closesOn: e.target.value })}
                    />
                  </label>
                </div>

                {periodBad.length > 0 && (
                  <p className="a2-note mt-2" style={{ borderLeftColor: "var(--a2-danger)" }}>
                    {periodBad.join(" · ")}
                  </p>
                )}
                {plan.state !== "draft" && periodDirty && (
                  <p className="a2-note mt-2" style={{ borderLeftColor: "var(--a2-warn)" }}>
                    이미 {roundStates[plan.state].label}인 회차입니다. 마감일을 미루는 것(연장)은 흔한 일이지만, 시작일을
                    바꾸면 이미 응시한 기록과 기간이 어긋납니다.
                  </p>
                )}

                <label className="a2-field mt-2">
                  <span className="a2-label">바꾸는 까닭 — 기록에 남습니다</span>
                  <textarea
                    className="a2-textarea"
                    rows={2}
                    value={periodWhy}
                    onChange={(e) => setPeriodWhy(e.target.value)}
                    placeholder="예: 기관 두 곳이 접속 장애로 응시하지 못해 사흘 늘립니다"
                  />
                </label>

                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    className="a2-btn a2-btn-primary"
                    disabled={!periodDirty || periodBad.length > 0 || periodWhy.trim().length < 5}
                    onClick={() => {
                      setPeriod(round.id, shown.opensOn, shown.closesOn, by, periodWhy.trim());
                      recordAction(round.label, planActions.period, periodWhy.trim(), by);
                      setEdit(null);
                      setPeriodWhy("");
                    }}
                  >
                    기간 저장
                  </button>
                  {periodDirty && (
                    <button
                      type="button"
                      className="a2-btn"
                      onClick={() => {
                        setEdit(null);
                        setPeriodWhy("");
                      }}
                    >
                      되돌리기
                    </button>
                  )}
                </div>

                <div className="mt-2 border-t border-(--a2-line) pt-2">
                  <DescList
                    rows={[
                      { k: "회차 ID", v: <span className="a2-mono">{round.id}</span> },
                      { k: "목록 표기", v: <span className="a2-mono">{round.period}</span> },
                      {
                        k: "응시 대상",
                        v: round.target ? `${n(round.target)}명` : <span className="text-(--a2-ink-4)">아직 없음</span>,
                      },
                    ]}
                  />
                  <p className="a2-hint">
                    목록 표기는 회차 목록에 박아 둔 문자열입니다(lib/admin.ts). 여기서 고친 기간과 다르면 붙일 때 한쪽으로
                    맞춰야 합니다.
                  </p>
                </div>
              </Panel>

              {/* ③ 여는 관문 */}
              <Panel title="여는 관문" meta={`막음 ${blocks.length} · 확인 ${warns.length}`}>
                {checks.length === 0 ? (
                  <p className="a2-t-sm text-(--a2-ink-2)">걸리는 것이 없습니다.</p>
                ) : (
                  <ul className="grid gap-1">
                    {checks.map((c) => (
                      <li
                        key={c.text}
                        className="a2-note"
                        style={{ borderLeftColor: c.tone === "block" ? "var(--a2-danger)" : "var(--a2-warn)" }}
                      >
                        <span
                          className="a2-t-xs font-bold"
                          style={{ color: c.tone === "block" ? "var(--a2-danger)" : "var(--a2-warn)" }}
                        >
                          {c.tone === "block" ? "막음" : "확인"}
                        </span>
                        <span>{c.text}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {gates.length === 0 ? (
                  <p className="mt-2 a2-t-sm text-(--a2-ink-4)">마감된 회차입니다. 더 옮길 상태가 없습니다.</p>
                ) : (
                  <div className="mt-2 grid gap-1.5 border-t border-(--a2-line) pt-2">
                    <label className="a2-field">
                      <span className="a2-label">까닭 — 누가 왜 눌렀는지가 기록에 남습니다</span>
                      <textarea
                        className="a2-textarea"
                        rows={2}
                        value={gateWhy}
                        onChange={(e) => setGateWhy(e.target.value)}
                        placeholder="예: 국어 검사지 확정 확인함. 과학은 문항이 모자라 이번 회차에 보지 않기로 함"
                      />
                    </label>
                    {gates.map((g) => (
                      <div key={g.action}>
                        <p className="a2-hint mb-1">{g.body}</p>
                        <button
                          type="button"
                          className={`a2-btn ${g.danger ? "a2-btn-danger" : "a2-btn-primary"}`}
                          disabled={g.blocked || gateWhy.trim().length < 10}
                          title={g.blocked ? "막는 것이 남아 있습니다" : undefined}
                          onClick={() => run(g.action, gateWhy.trim())}
                        >
                          {g.label}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>

              {/* 기록 */}
              <Panel title="회차 기록" meta={`${plan.log.length}건`} flush>
                {plan.log.length === 0 ? (
                  <p className="p-3 a2-t-sm text-(--a2-ink-4)">아직 열고 닫은 기록이 없습니다.</p>
                ) : (
                  <ul className="divide-y divide-(--a2-line)">
                    {plan.log.map((l, k) => (
                      <li key={`${l.at}-${k}`} className="px-2.5 py-1.5">
                        <p className="flex flex-wrap items-center gap-x-2 a2-t-xs">
                          <span className="a2-mono text-(--a2-ink-4)">{l.at}</span>
                          <span className="font-bold text-(--a2-ink-2)">{l.by}</span>
                          <Tag>{planActions[l.action]}</Tag>
                        </p>
                        <p className="a2-t-sm text-(--a2-ink-2)">{l.text}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
          </div>

        </Body>
      <SeedNote>
        회차 상태 · 기간 · 편성은 이 브라우저에만 저장됩니다(lib/roundPlanStore.ts · lib/formStore.ts). 회차 목록의
        상태와 기간은 그 값을 시작값으로 받은 것이고, 응시 대상 · 제출 수는 화면 설계를 위한 예시입니다.
      </SeedNote>
    </>
  );
}
