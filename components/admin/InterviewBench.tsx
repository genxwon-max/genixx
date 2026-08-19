"use client";

import { useMemo, useState } from "react";
import { can } from "@/lib/admin";
import { useAdminPrefs } from "@/lib/adminStore";
import {
  confirmInterview,
  finishRecording,
  interviewStateLabel,
  openCodes,
  pickReasons,
  protocol,
  scheduleInterview,
  setInterviewNote,
  topReason,
  useExpert,
  type InterviewCase,
  type OpenCode,
} from "@/lib/expertStore";
import { ro } from "@/lib/utils";
import { AnchorSection, Badge, Callout, Foldable, TableCard, Tabs } from "./Parts";
import * as a from "./ui";

/**
 * 면담 워크벤치 (EXP-06).
 *
 * 지필로 재지 못한 것을 사람이 직접 묻는 자리다. 세 가지가 이 화면의 뼈대다 —
 *
 *  1) 순서를 사람이 정하지 않는다. 신청 순으로 두면 목소리 큰 신청이 먼저 올라가고,
 *     정작 신청하지 않았지만 꼭 봐야 하는 아이가 뒤로 밀린다.
 *  2) 질문을 고정한다. 면담원마다 다른 것을 물으면, 아이가 달라서 생긴 차이인지
 *     묻는 사람이 달라서 생긴 차이인지 가릴 수 없다.
 *  3) 전사는 AI가 하고 코딩은 사람이 확정한다. 확정 전까지 면담 내용은 판정 협진
 *     화면에 올라가지 않는다.
 */
/** 정의서의 하위 화면 셋. 한 번에 하나만 연다. */
type View = "queue" | "protocol" | "coding";

export default function InterviewBench() {
  const { interviews } = useExpert();
  const { role, staffName } = useAdminPrefs();
  const [openId, setOpenId] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const may = can(role, "grade.review");

  /** 우선순위 자동 정렬 — 걸린 사유 가운데 가장 앞선 것이 그 케이스의 순위다 */
  const sorted = useMemo(
    () =>
      [...interviews].sort((x, y) => {
        const rx = topReason(x.reasons).rank;
        const ry = topReason(y.reasons).rank;
        if (rx !== ry) return rx - ry;
        return y.reasons.length - x.reasons.length;
      }),
    [interviews],
  );

  const open = interviews.find((v) => v.id === openId) ?? null;
  const coded = interviews.filter((v) => v.state === "coded").length;
  const [view, setView] = useState<View>("queue");

  return (
    <>
      {/* 「면담은 점수를 매기는 자리가 아니다」를 판으로 세워 두지 않는다. 그 말이
          정작 필요한 자리는 부호를 확정하는 「전사·코딩」 구역이고 거기에 적혀 있다. */}
      <Tabs
        label="면담 워크벤치 구역"
        value={view}
        onChange={setView}
        items={[
          { id: "queue", label: "선발 큐", n: interviews.length },
          { id: "protocol", label: "프로토콜 · 기록" },
          { id: "coding", label: "전사 · 코딩 확정", n: coded },
        ]}
      />

      {done && (
        <div className="mt-6">
          <Callout tone="good">{done}</Callout>
        </div>
      )}

      {/* ── EXP-06-1 선발 큐 ── */}
      <div className={view === "queue" ? "mt-6" : "hidden"}>
        <AnchorSection
          id="EXP-06-1"
          title="면담 대상 선발 큐"
          lead="아래 다섯 사유로 자동 정렬합니다. 사람이 순서를 바꾸지 않습니다."
        >
          <ol className="mb-5 border-b border-exam-line">
            {pickReasons.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-t border-exam-line py-3"
              >
                <span aria-hidden className="adm-t-sm font-bold tabular-nums text-exam-muted">
                  {r.rank}
                </span>
                <span className="adm-t-md font-bold text-exam-text">{r.label}</span>
                <span className="adm-t-sm text-exam-muted">{r.why}</span>
                <span className="ml-auto adm-t-md font-bold tabular-nums text-exam-text">
                  {interviews.filter((v) => v.reasons.includes(r.id)).length}건
                </span>
              </li>
            ))}
          </ol>

          <TableCard
            title={`선발 ${interviews.length}건 · 코딩 확정 ${coded}건`}
            caption="같은 아이가 여러 사유에 걸릴 수 있습니다. 그때는 가장 앞선 사유가 순위가 됩니다."
          >
            <table className={a.table}>
              <thead>
                <tr>
                  <th className={a.th}>순위</th>
                  <th className={a.th}>응시번호</th>
                  <th className={a.th}>선발 사유</th>
                  <th className={a.th}>상태</th>
                  <th className={a.th}>일정 · 면담원</th>
                  <th className={a.th}>할 일</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((v) => {
                  const top = topReason(v.reasons);
                  const s = interviewStateLabel[v.state];
                  return (
                    <tr key={v.id}>
                      <td className={a.tdStrongTight}>{top.rank}</td>
                      <td className={a.td}>
                        <span className="font-bold text-exam-text">{v.seat}</span>
                        <span className="mt-0.5 block adm-t-sm font-bold text-exam-muted">
                          {v.grade}
                        </span>
                      </td>
                      <td className={a.td}>
                        <span className="font-bold text-exam-text">{top.label}</span>
                        {v.reasons.length > 1 && (
                          <span className="mt-0.5 block adm-t-sm">
                            {`${v.reasons
                              .filter((r) => r !== top.id)
                              .map((r) => pickReasons.find((p) => p.id === r)!.label)
                              .join(" · ")}도 함께 걸림`}
                          </span>
                        )}
                      </td>
                      <td className={a.td}>
                        <Badge label={s.label} className={s.tone} />
                      </td>
                      <td className={a.td}>
                        {v.scheduledAt ? (
                          <>
                            {v.scheduledAt}
                            <span className="mt-0.5 block adm-t-sm">{v.interviewer}</span>
                          </>
                        ) : may ? (
                          <button
                            type="button"
                            onClick={() => {
                              scheduleInterview(v.id, "일정 조율 중", staffName, staffName);
                              setDone(`${v.seat} 면담을 ${staffName} 님이 맡았습니다.`);
                            }}
                            className={a.btnRowGhost}
                          >
                            내가 맡기
                          </button>
                        ) : (
                          "미배정"
                        )}
                      </td>
                      <td className={a.td}>
                        {/* 고르는 순간 프로토콜 구역으로 함께 옮겨 준다 —
                            안 그러면 눌러도 아무 일이 없는 것처럼 보인다. */}
                        <button
                          type="button"
                          onClick={() => {
                            setOpenId(v.id);
                            setView("protocol");
                          }}
                          className={a.btnRowGhost}
                        >
                          면담 열기
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableCard>
        </AnchorSection>
      </div>

      {/* ── EXP-06-2 프로토콜·기록 ── */}
      <div className={view === "protocol" ? "mt-6" : "hidden"}>
        <AnchorSection
          id="EXP-06-2"
          title="구조화 프로토콜 · 기록"
          lead="질문 스크립트를 고정합니다. 면담원이 바뀌어도 같은 것을 묻고 같은 자리에 적습니다."
        >
          {open ? (
            <ProtocolPanel
              itv={open}
              may={may}
              staffName={staffName}
              onDone={(msg) => setDone(msg)}
            />
          ) : (
            <div className="border-l-4 border-exam-line pl-4">
              <p className="adm-t-md font-bold text-exam-text">면담을 하나 고르세요</p>
              <p className={`${a.bodyText} mt-1`}>
                위 큐에서 「면담 열기」를 누르면 질문 스크립트와 기록 칸이 이 자리에 펼쳐집니다.
              </p>
            </div>
          )}

          <div className="mt-5">
            <Foldable title="질문을 고정하는 까닭">
              <p className={a.bodyText}>
                면담원이 저마다 편한 질문을 하면 기록은 쌓이지만 견줄 수가 없습니다. 어떤 아이는
                「좋아하는 것」을 물어 본 기록이 있고 어떤 아이는 없는데, 그것이 아이의 차이인지
                면담원의 차이인지 나중에는 아무도 알 수 없습니다. 판정 근거로 쓰려면 묻는 쪽이
                고정되어 있어야 합니다. 대신 마지막 질문을 열어 두어, 묻지 않아 놓친 것을 아이가
                스스로 채울 자리를 남깁니다.
              </p>
            </Foldable>
          </div>
        </AnchorSection>
      </div>

      {/* ── EXP-06-3 전사·코딩 확정 ── */}
      <div className={view === "coding" ? "mt-6" : "hidden"}>
        <AnchorSection
          id="EXP-06-3"
          title="전사 · 코딩 확정"
          lead="AI가 전사하고 1차 코딩을 붙입니다. 사람이 확정하면 interview.coded 이벤트가 쌓입니다."
        >
          {open ? (
            <CodingPanel
              itv={open}
              may={may}
              staffName={staffName}
              onDone={(msg) => setDone(msg)}
            />
          ) : (
            <div className="border-l-4 border-exam-line pl-4">
              <p className="adm-t-md font-bold text-exam-text">
                기록이 끝난 면담을 고르면 여기서 확정합니다
              </p>
              <p className={`${a.bodyText} mt-1`}>
                확정하기 전까지 면담 내용은 판정 협진 화면에 올라가지 않습니다.
              </p>
            </div>
          )}
        </AnchorSection>
      </div>
    </>
  );
}

/* ───────────────────────── 프로토콜 ───────────────────────── */

function ProtocolPanel({
  itv,
  may,
  staffName,
  onDone,
}: {
  itv: InterviewCase;
  may: boolean;
  staffName: string;
  onDone: (msg: string) => void;
}) {
  const filled = protocol.filter((p) => (itv.notes[p.id] ?? "").trim().length > 0).length;
  const sections = [...new Set(protocol.map((p) => p.section))];
  const locked = itv.state === "coded";

  return (
    <section className={`${a.panel} p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="adm-t-sm font-bold text-exam-muted">
            {itv.id} · 응시번호 {itv.seat} · {itv.grade}
          </p>
          <h3 className={`${a.cardTitle} mt-1`}>
            {topReason(itv.reasons).label}
            {ro(topReason(itv.reasons).label)} 선발된 면담
          </h3>
          <p className={`${a.bodyText} mt-1.5`}>{topReason(itv.reasons).why}</p>
        </div>
        <div className="text-right">
          <p className={a.label}>기록한 문항</p>
          <p className={`${a.metric} mt-1`}>
            {filled} / {protocol.length}
          </p>
        </div>
      </div>

      {sections.map((s) => (
        <div key={s} className="mt-6">
          <p className={a.label}>{s}</p>
          <div className="mt-3 space-y-4">
            {protocol
              .filter((p) => p.section === s)
              .map((p) => (
                <div key={p.id} className="rounded-lg border border-exam-line p-4">
                  <p className="adm-t-md font-bold text-exam-text">{p.q}</p>
                  <p className={`${a.hint} mt-1`}>{p.why}</p>
                  <textarea
                    rows={2}
                    aria-label={p.q}
                    value={itv.notes[p.id] ?? ""}
                    disabled={locked || !may}
                    onChange={(e) => setInterviewNote(itv.id, p.id, e.target.value)}
                    className={`${a.input} mt-2.5 resize-none`}
                    placeholder="들은 것을 그대로 적어 주세요. 해석은 아래 코딩 자리에서 합니다."
                  />
                </div>
              ))}
          </div>
        </div>
      ))}

      <div className="mt-6 border-t border-exam-line pt-5">
        <button
          type="button"
          disabled={!may || locked || filled === 0}
          onClick={() => {
            finishRecording(itv.id, staffName);
            onDone(`${itv.seat} 면담 기록을 마쳤습니다. 아래에서 코딩을 확정하세요.`);
          }}
          className={may && !locked && filled > 0 ? a.btnPrimary : a.btnDisabled}
        >
          기록 마치기
        </button>
        {filled < protocol.length && !locked && (
          <p className="mt-3 adm-t-sm text-exam-muted">
            빈 칸이 있어도 마칠 수 있습니다. 묻지 못한 질문을 억지로 채우는 것보다, 빈 채로 남겨 두는
            편이 나중에 읽는 사람에게 정확합니다.
          </p>
        )}
      </div>
    </section>
  );
}

/* ───────────────────────── 전사·코딩 ───────────────────────── */

function CodingPanel({
  itv,
  may,
  staffName,
  onDone,
}: {
  itv: InterviewCase;
  may: boolean;
  staffName: string;
  onDone: (msg: string) => void;
}) {
  const [codes, setCodes] = useState<OpenCode[]>(itv.coded?.codes ?? itv.aiCodes ?? []);
  const [summary, setSummary] = useState(itv.coded?.summary ?? "");
  const short = summary.trim().length < 10;
  const empty = codes.length === 0;
  const ready = itv.state === "recorded" || itv.state === "coded";

  const toggle = (c: OpenCode) =>
    setCodes((prev) => {
      if (c === "불명") return prev.includes("불명") ? [] : ["불명"];
      const next = prev.filter((x) => x !== "불명");
      return next.includes(c) ? next.filter((x) => x !== c) : [...next, c];
    });

  if (!ready) {
    return (
      <Callout tone="warn" title="아직 기록이 끝나지 않았습니다">
        면담 기록을 먼저 마쳐 주세요. 기록 없이 코드만 붙이면 그 코드가 어디서 나왔는지 확인할 수
        없습니다.
      </Callout>
    );
  }

  return (
    <section className={`${a.panel} p-6`}>
      <p className="adm-t-sm font-bold text-exam-muted">
        {itv.id} · 응시번호 {itv.seat} · 면담원 {itv.interviewer}
      </p>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-exam-line p-5">
          <h4 className={a.label}>AI 전사</h4>
          <p className="mt-2.5 adm-t-md leading-relaxed whitespace-pre-wrap text-exam-text">
            {itv.transcript ?? "전사가 아직 없습니다."}
          </p>
          <p className={`${a.hint} mt-3`}>
            전사는 자동으로 만들고, 사람이 기록한 요지와 함께 봅니다. 침묵과 머뭇거림도 그대로
            남깁니다 — 지운 자리에 무엇이 있었는지는 나중에 알 수 없습니다.
          </p>

          <div className="mt-5 border-t border-exam-line pt-4">
            <h4 className={a.label}>면담원 기록</h4>
            <ul className="mt-2 space-y-1.5">
              {protocol
                .filter((p) => (itv.notes[p.id] ?? "").trim())
                .map((p) => (
                  <li key={p.id} className="adm-t-sm text-exam-text">
                    · {itv.notes[p.id]}
                  </li>
                ))}
            </ul>
          </div>
        </div>

        <div className="rounded-lg border border-exam-line p-5">
          <h4 className={a.label}>AI 1차 코딩</h4>
          <p className={`${a.strongText} mt-1.5`}>{(itv.aiCodes ?? []).join(" · ") || "없음"}</p>

          <h4 className={`${a.label} mt-5`}>사람이 확정할 부호</h4>
          <div className="mt-3 flex flex-wrap gap-2">
            {openCodes.map((c) => {
              const on = codes.includes(c);
              const ai = (itv.aiCodes ?? []).includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggle(c)}
                  aria-pressed={on}
                  className={`min-h-[2.75rem] rounded-md border px-3.5 adm-t-sm font-bold transition-colors ${
                    on
                      ? "border-brand-900 bg-brand-900 text-white"
                      : "border-exam-line bg-white text-exam-text hover:bg-exam-raised"
                  }`}
                >
                  {c}
                  {ai && (
                    <span className={`ml-1.5 ${on ? "text-brand-100" : "text-brand-700"}`}>AI</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-5">
            <label htmlFor="itv-summary" className={a.label}>
              판정 협진에 올릴 요지
            </label>
            <textarea
              id="itv-summary"
              rows={4}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className={`${a.input} mt-2 resize-none`}
              placeholder="협진 화면의 면담 칸에 그대로 실립니다. 등급이나 순위 표현은 쓰지 않습니다."
            />
          </div>

          <div className="mt-5">
            <button
              type="button"
              disabled={!may || empty || short}
              onClick={() => {
                confirmInterview(itv.id, codes, summary.trim(), staffName);
                onDone(`${itv.seat} 면담 코딩을 확정했습니다 (interview.coded).`);
              }}
              className={may && !empty && !short ? a.btnPrimary : a.btnDisabled}
            >
              코딩 확정 · 협진으로 올리기
            </button>
          </div>
          {empty && (
            <p className="mt-3 adm-t-sm font-bold text-rose-700">
              부호를 하나 이상 고르세요. 읽어 낼 축이 없으면 「불명」을 고르시면 됩니다.
            </p>
          )}
          {!empty && short && (
            <p className="mt-3 adm-t-sm font-bold text-rose-700">요지를 10자 이상 적어 주세요.</p>
          )}

          {itv.coded && (
            <div className="mt-5 border-t border-exam-line pt-4">
              <p className={a.label}>확정된 코딩</p>
              <p className={`${a.bodyText} mt-1.5`}>
                {itv.coded.codes.join(" · ")} · {itv.coded.by} · {itv.coded.at}
              </p>
              <p className={`${a.bodyText} mt-1`}>{itv.coded.summary}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
