"use client";

import { useState } from "react";
import { can } from "@/lib/admin";
import { recordAction, useAdminPrefs } from "@/lib/adminStore";
import { subjects } from "@/lib/exam";
import {
  LIMITS,
  configErrors,
  configWarnings,
  diffConfig,
  revertConfig,
  saveConfig,
  useRound,
  type ExamConfig,
} from "@/lib/roundStore";
import { AnchorSection, Callout, Foldable, TableCard } from "./Parts";
import * as a from "./ui";

/**
 * 회차 시험 설정 (ADM-05-1).
 *
 * 제한 시간이 코드에 박혀 있으면 바꾸는 데 배포가 필요하고, 무엇보다 **언제 왜
 * 바꿨는지가 남지 않는다.** 재는 도구가 회차마다 달랐다는 사실을 모르면 회차 간
 * 비교는 그 순간 의미를 잃는다. 그래서 값과 함께 판 번호·사유·변경 줄을 든다.
 *
 * 화면에서 지키는 것 셋 —
 *  1) 바꾸기 전에 무엇이 어떻게 달라지는지 사람 말로 먼저 보여 준다.
 *  2) 이미 응시가 시작된 회차면 그 사실을 숫자와 함께 짚는다. 막지는 않는다 —
 *     운영 중에 고쳐야 할 진짜 사정이 있고, 막으면 사람들은 기록이 남지 않는
 *     다른 길을 찾는다.
 *  3) 사유 없이 저장할 수 없다.
 */
export default function RoundSettings({ started }: { started: number }) {
  const { config, log } = useRound();
  const { role, staffName } = useAdminPrefs();
  const [draft, setDraft] = useState<ExamConfig | null>(null);
  const [ask, setAsk] = useState<{ kind: "save" } | { kind: "revert"; version: number } | null>(
    null,
  );
  const [done, setDone] = useState<string | null>(null);

  const may = can(role, "round.manage");
  const edit = draft ?? config;
  const errors = configErrors(edit);
  const lines = diffConfig(config, edit);
  const warnings = configWarnings(config, edit, started);
  const dirty = lines.length > 0;

  const set = (patch: Partial<ExamConfig>) => setDraft({ ...edit, ...patch });
  const setLimit = (id: string, v: number) => set({ limits: { ...edit.limits, [id]: v } });

  return (
    <>
      <AnchorSection
        id="ADM-05-1"
        title="시험 설정"
        lead="제한 시간과 응시 기간, 이번 회차에 보는 과목을 정합니다. 바꾸면 판 번호가 올라가고 사유가 함께 남습니다."
      >
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className={a.label}>지금 판</span>
          <span className={a.metric}>v{config.version}</span>
          <span className={a.hint}>
            {config.updatedAt} · {config.updatedBy}
          </span>
        </div>

        {done && (
          <div className="mt-5">
            <Callout tone="good">{done}</Callout>
          </div>
        )}

        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          {/* ── 과목별 제한 시간 ── */}
          <div className={`${a.panel} p-6`}>
            <h3 className={a.cardTitle}>과목별 제한 시간</h3>
            <p className={`${a.bodyText} mt-1.5`}>
              과목은 한 번에 몰아 보지 않고 따로 응시하므로 시간도 과목마다 정합니다.
            </p>

            <ul className="mt-5 space-y-4">
              {subjects.map((s) => {
                const on = edit.enabled[s.id];
                return (
                  <li key={s.id} className="border-t border-exam-line pt-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <label htmlFor={`limit-${s.id}`} className={a.label}>
                        {s.name}
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={on}
                          disabled={!may}
                          onChange={(e) => set({ enabled: { ...edit.enabled, [s.id]: e.target.checked } })}
                          className="h-5 w-5 rounded border-exam-line"
                        />
                        <span className="adm-t-sm font-bold text-exam-text">
                          {on ? "이번 회차에 봅니다" : "이번 회차에서 뺍니다"}
                        </span>
                      </label>
                    </div>

                    <div className="mt-2.5 flex items-center gap-3">
                      <input
                        id={`limit-${s.id}`}
                        type="number"
                        inputMode="numeric"
                        min={LIMITS.minMinutes}
                        max={LIMITS.maxMinutes}
                        value={edit.limits[s.id]}
                        disabled={!may || !on}
                        onChange={(e) => setLimit(s.id, Number(e.target.value))}
                        className={`${a.input} w-28 text-right tabular-nums`}
                      />
                      <span className="adm-t-md font-bold text-exam-text">분</span>
                      {config.limits[s.id] !== edit.limits[s.id] && (
                        <span className="adm-t-sm font-bold text-brand-700">
                          지금 {config.limits[s.id]}분
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            <p className={`${a.hint} mt-5 border-t border-exam-line pt-4`}>
              문항 수는 여기서 정하지 않습니다. 한 검사지에 몇 문항이 들어가는지는{" "}
              <b>검사지 조립</b>에서 정해지고, 이 화면은 그 검사지를 푸는 조건만 다룹니다.
            </p>
          </div>

          {/* ── 시간이 다 되면 · 회차 ── */}
          <div className="space-y-5">
            <div className={`${a.panel} p-6`}>
              <h3 className={a.cardTitle}>시간이 다 되면</h3>

              <div className="mt-4 space-y-2">
                {[
                  {
                    on: true,
                    t: "자동으로 제출합니다",
                    d: "쓰던 답 그대로 넘어갑니다. 제한 시간이 실제로 제한이 되는 쪽입니다.",
                  },
                  {
                    on: false,
                    t: "그대로 두고 계속 쓰게 합니다",
                    d: "걸린 시간은 기록에 남지만 끊지 않습니다. 「제한 시간」은 안내 문구로만 남습니다.",
                  },
                ].map((o) => {
                  const picked = edit.autoSubmit === o.on;
                  return (
                    <button
                      key={o.t}
                      type="button"
                      disabled={!may}
                      onClick={() => set({ autoSubmit: o.on })}
                      aria-pressed={picked}
                      className={`w-full rounded-md border p-4 text-left transition-colors ${
                        picked
                          ? "border-brand-900 bg-brand-50"
                          : "border-exam-line bg-white hover:bg-exam-raised"
                      }`}
                    >
                      <span className="adm-t-md font-black text-exam-text">{o.t}</span>
                      <span className="mt-1 block adm-t-sm text-exam-muted">{o.d}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="grace" className={a.label}>
                    마무리 시간 (분)
                  </label>
                  <input
                    id="grace"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={LIMITS.maxGrace}
                    value={edit.graceMin}
                    disabled={!may || !edit.autoSubmit}
                    onChange={(e) => set({ graceMin: Number(e.target.value) })}
                    className={`${a.input} mt-2 w-full text-right tabular-nums`}
                  />
                  <p className={`${a.hint} mt-1.5`}>
                    서술형을 쓰던 중에 문장 한가운데서 잘리면 채점자가 읽을 수 없습니다.
                  </p>
                </div>
                <div>
                  <label htmlFor="warn" className={a.label}>
                    남은 시간 경고 (분 전)
                  </label>
                  <input
                    id="warn"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={LIMITS.maxWarn}
                    value={edit.warnMin}
                    disabled={!may}
                    onChange={(e) => set({ warnMin: Number(e.target.value) })}
                    className={`${a.input} mt-2 w-full text-right tabular-nums`}
                  />
                  <p className={`${a.hint} mt-1.5`}>
                    이 시점부터 응시 화면의 시계가 붉게 바뀝니다.
                  </p>
                </div>
              </div>
            </div>

            <div className={`${a.panel} p-6`}>
              <h3 className={a.cardTitle}>회차</h3>
              <div className="mt-4">
                <label htmlFor="round-label" className={a.label}>
                  회차 이름
                </label>
                <input
                  id="round-label"
                  value={edit.roundLabel}
                  disabled={!may}
                  onChange={(e) => set({ roundLabel: e.target.value })}
                  className={`${a.input} mt-2 w-full`}
                />
                <p className={`${a.hint} mt-1.5`}>
                  보호자가 보는 결과 리포트와 응시 현황에 그대로 실립니다.
                </p>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="opens" className={a.label}>
                    응시 시작
                  </label>
                  <input
                    id="opens"
                    type="date"
                    value={edit.opensAt}
                    disabled={!may}
                    onChange={(e) => set({ opensAt: e.target.value })}
                    className={`${a.input} mt-2 w-full`}
                  />
                </div>
                <div>
                  <label htmlFor="closes" className={a.label}>
                    응시 마감
                  </label>
                  <input
                    id="closes"
                    type="date"
                    value={edit.closesAt}
                    disabled={!may}
                    onChange={(e) => set({ closesAt: e.target.value })}
                    className={`${a.input} mt-2 w-full`}
                  />
                  <p className={`${a.hint} mt-1.5`}>보호자 화면의 D-day가 이 날짜를 셉니다.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 바꾸기 전에 보여 주는 것 ── */}
        {dirty && (
          <div className="mt-6 space-y-4">
            <Callout tone="info" title="이렇게 바뀝니다">
              <ul className="space-y-1">
                {lines.map((l) => (
                  <li key={l}>· {l}</li>
                ))}
              </ul>
            </Callout>

            {warnings.length > 0 && (
              <Callout tone="warn" title="짚어 둘 것">
                <ul className="space-y-1">
                  {warnings.map((w) => (
                    <li key={w}>· {w}</li>
                  ))}
                </ul>
              </Callout>
            )}

            {errors.length > 0 && (
              <Callout tone="warn" title="이대로는 저장할 수 없습니다">
                <ul className="space-y-1">
                  {errors.map((e) => (
                    <li key={e}>· {e}</li>
                  ))}
                </ul>
              </Callout>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!may || !dirty || errors.length > 0}
            onClick={() => setAsk({ kind: "save" })}
            className={may && dirty && errors.length === 0 ? a.btnPrimary : a.btnDisabled}
          >
            새 판으로 저장
          </button>
          {dirty && (
            <button type="button" onClick={() => setDraft(null)} className={a.btnGhost}>
              고친 것 버리기
            </button>
          )}
        </div>
        {!may && (
          <p className="mt-3 adm-t-sm font-bold text-rose-700">
            지금 역할에는 회차를 다룰 권한이 없습니다. 값은 볼 수 있습니다.
          </p>
        )}

        <div className="mt-6">
          <Foldable title="바꾼 시간이 지금 응시 중인 아이에게 미치는 영향">
            <p className={a.bodyText}>
              적용되지 않습니다. 응시를 <b>시작한 시점의 제한 시간</b>이 그 아이의 기록에 박혀 있고,
              화면의 시계는 그 값을 봅니다. 여기서 40분을 30분으로 줄여도 지금 풀고 있는 아이의 남은
              시간은 줄지 않습니다 — 푸는 중에 시계가 갑자기 깎이면, 그 아이는 자기가 무엇을 잘못했는지
              알 수 없습니다. 새 값은 <b>다음에 시작하는 응시</b>부터 적용됩니다.
            </p>
          </Foldable>
        </div>
      </AnchorSection>

      {/* ── 변경 기록 ── */}
      <div className="mt-10">
        <AnchorSection
          id="ADM-05-2"
          title="설정 변경 기록"
          lead="언제 누가 무엇을 왜 바꿨는지 남깁니다. 회차 간 결과를 견줄 때 이 표를 함께 봐야 합니다."
        >
          <TableCard
            title={`판 ${log.length}건`}
            caption="판 번호는 앞으로만 갑니다. 되돌려도 번호는 새로 매깁니다."
          >
            <table className={a.table}>
              <thead>
                <tr>
                  <th className={a.th}>판</th>
                  <th className={a.th}>시각</th>
                  <th className={a.th}>바꾼 사람</th>
                  <th className={a.th}>무엇이 바뀌었나</th>
                  <th className={a.th}>왜</th>
                  <th className={a.th}>할 일</th>
                </tr>
              </thead>
              <tbody>
                {log.map((l) => (
                  <tr key={`${l.version}-${l.at}`}>
                    <td className={a.tdStrong}>v{l.version}</td>
                    <td className={a.tdTight}>{l.at}</td>
                    <td className={a.tdTight}>{l.by}</td>
                    <td className={a.td}>
                      {l.lines.length === 0 ? (
                        <span>첫 판</span>
                      ) : (
                        <ul className="space-y-0.5">
                          {l.lines.map((x) => (
                            <li key={x}>· {x}</li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className={a.td}>{l.reason}</td>
                    <td className={a.td}>
                      {l.version === config.version ? (
                        <span className="font-bold text-emerald-700">지금 판</span>
                      ) : may ? (
                        <button
                          type="button"
                          onClick={() => setAsk({ kind: "revert", version: l.version })}
                          className={a.btnRowGhost}
                        >
                          이 판으로 되돌리기
                        </button>
                      ) : (
                        <span className="text-exam-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>
        </AnchorSection>
      </div>

      {ask && (
        <ReasonBox
          kind={ask.kind}
          started={started}
          lines={ask.kind === "save" ? lines : []}
          onClose={() => setAsk(null)}
          onConfirm={(reason) => {
            if (ask.kind === "save") {
              const v = saveConfig(edit, staffName, reason);
              if (v) {
                recordAction(config.roundLabel, "회차 시험 설정 변경", reason, staffName);
                setDraft(null);
                setDone(`v${v}로 저장했습니다. 다음에 시작하는 응시부터 적용됩니다.`);
              }
            } else {
              const v = revertConfig(ask.version, staffName, reason);
              if (v) {
                recordAction(config.roundLabel, `회차 설정 v${ask.version}로 되돌림`, reason, staffName);
                setDraft(null);
                setDone(`v${ask.version}의 값으로 되돌리고 v${v}로 저장했습니다.`);
              } else {
                setDone("되돌릴 수 없는 기록입니다. 값을 직접 고쳐 저장해 주세요.");
              }
            }
            setAsk(null);
          }}
        />
      )}
    </>
  );
}

/** 저장 전에 사유를 받는다 — 재는 도구를 바꾸는 일이라 값만 남기면 안 된다 */
function ReasonBox({
  kind,
  started,
  lines,
  onClose,
  onConfirm,
}: {
  kind: "save" | "revert";
  started: number;
  lines: string[];
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [text, setText] = useState("");
  const short = text.trim().length < 10;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="round-ask-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-exam-line bg-white p-6 sm:p-8">
        <h2 id="round-ask-title" className={a.pageTitle}>
          {kind === "save" ? "시험 설정을 새 판으로 저장합니다" : "옛 판의 값으로 되돌립니다"}
        </h2>
        <p className={`${a.bodyText} mt-2.5`}>
          {kind === "save"
            ? "다음에 시작하는 응시부터 적용됩니다. 이미 시작한 아이의 시계는 바뀌지 않습니다."
            : "값만 되돌리고 판 번호는 새로 매깁니다. 지난 기록은 그대로 남습니다."}
        </p>

        {lines.length > 0 && (
          <div className="mt-5">
            <Callout tone="info" title="바뀌는 것">
              <ul className="space-y-1">
                {lines.map((l) => (
                  <li key={l}>· {l}</li>
                ))}
              </ul>
            </Callout>
          </div>
        )}

        {started > 0 && (
          <div className="mt-5">
            <Callout tone="warn" title={`이번 회차에 이미 ${started}명이 응시했습니다`}>
              먼저 본 아이와 나중에 볼 아이의 조건이 달라집니다. 두 자료를 함께 놓고 볼 때 이 사실을
              알아야 하므로, 아래에 적는 사유가 그대로 회차 기록에 남습니다.
            </Callout>
          </div>
        )}

        <div className="mt-6">
          <label htmlFor="round-reason" className={a.label}>
            왜 바꾸는지 적어 주세요
          </label>
          <textarea
            id="round-reason"
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className={`${a.input} mt-2 resize-none`}
            placeholder="예: 3학년 서술형에서 시간이 모자란다는 현장 의견이 반복되어 45분으로 늘립니다."
          />
          {short && (
            <p className="mt-2 adm-t-sm font-bold text-rose-700">10자 이상 적어 주세요.</p>
          )}
        </div>

        <div className="mt-7 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={short}
            onClick={() => onConfirm(text.trim())}
            className={short ? a.btnDisabled : a.btnPrimary}
          >
            {kind === "save" ? "저장하기" : "되돌리기"}
          </button>
          <button type="button" onClick={onClose} className={a.btnGhost}>
            그만두기
          </button>
        </div>
      </div>
    </div>
  );
}
