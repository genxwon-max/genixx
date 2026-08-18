"use client";

import { useState } from "react";
import { can } from "@/lib/admin";
import { useAdminPrefs } from "@/lib/adminStore";
import {
  SAMPLE_MAX,
  SAMPLE_MIN,
  agreeOf,
  confirmCoding,
  openCodes,
  resample,
  useExpert,
  type CodingTask,
  type OpenCode,
} from "@/lib/expertStore";
import { ro } from "@/lib/utils";
import { AnchorSection, Badge, Callout, Foldable, TableCard } from "./Parts";
import * as a from "./ui";

/**
 * 개방형 코딩 워크벤치 (EXP-05).
 *
 * 소개·에피소드 같은 개방형 응답은 점수를 매기는 자리가 아니라 「무엇에 대해 말하고
 * 있는가」를 부호로 붙이는 자리다.
 *
 * 여기는 채점과 검증 방식이 다르다. AI가 전수로 코딩하고, 사람은 **표본만** 본다 —
 * 전수를 사람이 다시 보면 AI를 쓰는 뜻이 없고, 아무도 안 보면 AI가 어디서 틀리는지
 * 영영 모른다. 그래서 표본에서 나온 불일치율이 다음 회차의 표본 비율을 정한다.
 * 검증이 스스로 크기를 조절하는 구조다.
 */
export default function CodingBench() {
  const { coding, sampleRate } = useExpert();
  const { role, staffName } = useAdminPrefs();
  const [openId, setOpenId] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [onlySampled, setOnlySampled] = useState(true);

  const may = can(role, "grade.review");

  const sampled = coding.filter((t) => t.sampled);
  const checked = coding.filter((t) => t.human);
  const disagree = checked.filter((t) => agreeOf(t) === false);
  const rate = checked.length ? disagree.length / checked.length : null;
  const unclear = coding.filter((t) => t.aiCodes.includes("불명"));

  /** 불일치가 잦으면 표본을 늘려야 한다 — 몇 %로 늘릴지까지 적어 둔다 */
  const advice =
    rate === null
      ? null
      : rate > 0.2
        ? { rate: 0.3, why: "불일치가 20%를 넘습니다. 다음 회차 표본을 30%로 올리기를 권합니다." }
        : rate < 0.05
          ? { rate: SAMPLE_MIN, why: "불일치가 5% 아래입니다. 표본을 10%로 줄여도 됩니다." }
          : { rate: sampleRate, why: "지금 비율을 유지해도 됩니다." };

  const rows = onlySampled ? sampled : coding;
  const open = coding.find((t) => t.id === openId) ?? null;

  return (
    <>
      <Callout tone="info" title="AI가 전수로 코딩하고, 사람은 표본을 확인합니다">
        사람이 확인하는 것은 지금 <b>{Math.round(sampleRate * 100)}%</b>입니다. 표본에서 나온
        불일치율이 다음 회차의 비율을 정합니다 — 검증의 크기를 감으로 정하지 않기 위해서입니다.
      </Callout>

      {done && (
        <div className="mt-5">
          <Callout tone="good">{done}</Callout>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <Stat label="전수 코딩" value={`${coding.length}건`} note="AI가 모두 붙였습니다" />
        <Stat label="표본" value={`${sampled.length}건`} note={`${Math.round(sampleRate * 100)}%`} />
        <Stat
          label="사람 확정"
          value={`${checked.length}건`}
          note={`표본의 ${sampled.length ? Math.round((checked.length / sampled.length) * 100) : 0}%`}
        />
        <Stat
          label="불일치율"
          value={rate === null ? "—" : `${Math.round(rate * 100)}%`}
          note="ai_human_agree"
          tone={rate !== null && rate > 0.2 ? "text-rose-700" : undefined}
        />
      </div>

      {/* ── 표본 조정 ── */}
      <div className="mt-10">
        <AnchorSection
          id="EXP-05-1"
          title="표본 비율 조정"
          lead={`기본 범위는 ${Math.round(SAMPLE_MIN * 100)}~${Math.round(SAMPLE_MAX * 100)}%입니다. 불일치가 잦으면 올리고, 잦지 않으면 내립니다.`}
        >
          {advice && (
            <Callout tone={rate !== null && rate > 0.2 ? "warn" : "info"} title="지금 자료가 말하는 것">
              {advice.why}
            </Callout>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {[0.1, 0.15, 0.2, 0.3].map((r) => {
              const on = Math.abs(sampleRate - r) < 0.001;
              return (
                <button
                  key={r}
                  type="button"
                  disabled={!may}
                  onClick={() => {
                    resample(r, staffName);
                    setDone(`표본 비율을 ${Math.round(r * 100)}%로 바꾸고 다시 뽑았습니다.`);
                  }}
                  aria-pressed={on}
                  className={`min-h-[2.75rem] rounded-md border px-4 adm-t-sm font-bold transition-colors ${
                    on
                      ? "border-brand-900 bg-brand-900 text-white"
                      : may
                        ? "border-exam-line bg-white text-exam-text hover:bg-exam-raised"
                        : "cursor-not-allowed border-exam-line bg-exam-raised text-exam-muted"
                  }`}
                >
                  {Math.round(r * 100)}%
                </button>
              );
            })}
            <span className={`${a.hint} ml-2`}>
              이미 사람이 확정한 건은 표본에서 빠지지 않습니다.
            </span>
          </div>

          <div className="mt-4">
            <Foldable title="표본을 무작위로 뽑지 않는 까닭">
              <p className={a.bodyText}>
                표본의 목적은 <b>AI가 어디서 틀리는지 찾는 것</b>입니다. 잘 맞힌 응답을 골라 보는 것은
                자리를 낭비하는 일이라, 확신도가 낮은 쪽부터 채웁니다. 다만 낮은 것만 보면 전체
                불일치율이 실제보다 크게 나오므로, 확신도 높은 건도 3할쯤 섞습니다. 그래서 위 숫자는
                「전체의 불일치율」이 아니라 「이렇게 뽑은 표본에서의 불일치율」입니다.
              </p>
            </Foldable>
          </div>
        </AnchorSection>
      </div>

      {/* ── 코딩 확정 ── */}
      <div className="mt-10">
        <AnchorSection
          id="EXP-05-2"
          title="응답 코딩 확정"
          lead="AI가 붙인 부호를 그대로 두거나 고칩니다. 고친 자리가 그대로 불일치율이 됩니다."
        >
          <div className="mb-4 flex flex-wrap gap-2">
            {(
              [
                { id: true, label: "표본만", n: sampled.length },
                { id: false, label: "전수", n: coding.length },
              ] as const
            ).map((f) => {
              const on = onlySampled === f.id;
              return (
                <button
                  key={String(f.id)}
                  type="button"
                  onClick={() => setOnlySampled(f.id)}
                  aria-pressed={on}
                  className={`min-h-[2.75rem] rounded-md border px-4 adm-t-sm font-bold transition-colors ${
                    on
                      ? "border-brand-900 bg-brand-900 text-white"
                      : "border-exam-line bg-white text-exam-text hover:bg-exam-raised"
                  }`}
                >
                  {f.label}
                  <span className={`ml-2 tabular-nums ${on ? "text-brand-100" : "text-exam-muted"}`}>
                    {f.n}
                  </span>
                </button>
              );
            })}
          </div>

          <TableCard
            title={`응답 ${rows.length}건`}
            caption="표본 밖의 건도 볼 수 있습니다. 다만 확정하면 그 건은 표본에 들어옵니다."
          >
            <table className={a.table}>
              <thead>
                <tr>
                  <th className={a.th}>응시번호</th>
                  <th className={a.th}>문항</th>
                  <th className={a.th}>응답</th>
                  <th className={a.th}>AI 코딩</th>
                  <th className={a.th}>확신도</th>
                  <th className={a.th}>사람 확정</th>
                  <th className={a.th}>일치</th>
                  <th className={a.th}>할 일</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => {
                  const ag = agreeOf(t);
                  return (
                    <tr key={t.id}>
                      <td className={a.tdStrong}>
                        {t.seat}
                        <span className="mt-0.5 block adm-t-sm font-bold text-exam-muted">
                          {t.grade}
                        </span>
                      </td>
                      <td className={a.td}>{t.prompt}</td>
                      <td className={`${a.td} max-w-[22rem]`}>{t.text}</td>
                      <td className={a.td}>{t.aiCodes.join(" · ")}</td>
                      <td className={a.td}>
                        <span className="font-bold tabular-nums text-exam-text">
                          {t.confidence.toFixed(2)}
                        </span>
                      </td>
                      <td className={a.td}>
                        {t.human ? t.human.codes.join(" · ") : <span>아직</span>}
                      </td>
                      <td className={a.td}>
                        {ag === null ? (
                          <span className="text-exam-muted">—</span>
                        ) : ag ? (
                          <span className="text-emerald-700">같음</span>
                        ) : (
                          <span className="font-bold text-rose-700">다름</span>
                        )}
                      </td>
                      <td className={a.td}>
                        <button
                          type="button"
                          onClick={() => setOpenId(openId === t.id ? null : t.id)}
                          className={openId === t.id ? a.btnRow : a.btnRowGhost}
                        >
                          {openId === t.id ? "닫기" : t.human ? "다시 보기" : "코딩하기"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableCard>

          {open && (
            <div className="mt-5">
              <CodePanel
                task={open}
                may={may}
                staffName={staffName}
                onDone={(msg) => {
                  setDone(msg);
                  setOpenId(null);
                }}
              />
            </div>
          )}
        </AnchorSection>
      </div>

      {/* ── 불명 처리 ── */}
      <div className="mt-10">
        <AnchorSection
          id="EXP-05-3"
          title="「불명」으로 남은 응답"
          lead="읽어 낼 축이 잡히지 않은 응답입니다. 억지로 축에 밀어 넣지 않고 면담 대상으로 넘깁니다."
        >
          <Callout tone="warn" title="빈칸을 채우려 들면 판정이 흔들립니다">
            여덟 축 가운데 하나를 억지로 고르면 그 코드는 판정 협진까지 그대로 흘러갑니다. 되돌릴
            자리가 없으므로 <b>「불명」을 그대로 두는 것이 옳은 처리</b>입니다. 대신 면담 워크벤치의
            선발 큐가 이 건들을 4순위로 올립니다.
          </Callout>

          <div className="mt-5">
            <TableCard title={`불명 ${unclear.length}건`}>
              <table className={a.table}>
                <thead>
                  <tr>
                    <th className={a.th}>응시번호</th>
                    <th className={a.th}>문항</th>
                    <th className={a.th}>응답</th>
                    <th className={a.th}>확신도</th>
                    <th className={a.th}>다음</th>
                  </tr>
                </thead>
                <tbody>
                  {unclear.map((t) => (
                    <tr key={t.id}>
                      <td className={a.tdStrong}>{t.seat}</td>
                      <td className={a.td}>{t.prompt}</td>
                      <td className={`${a.td} max-w-[24rem]`}>{t.text}</td>
                      <td className={a.td}>
                        <span className="font-bold tabular-nums text-rose-700">
                          {t.confidence.toFixed(2)}
                        </span>
                      </td>
                      <td className={a.td}>면담 선발 큐 4순위</td>
                    </tr>
                  ))}
                  {unclear.length === 0 && (
                    <tr>
                      <td className={a.td} colSpan={5}>
                        불명으로 남은 응답이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TableCard>
          </div>
        </AnchorSection>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border border-exam-line p-4">
      <p className={a.label}>{label}</p>
      <p className={`${a.metric} mt-1.5 ${tone ?? ""}`}>{value}</p>
      <p className={`${a.hint} mt-1`}>{note}</p>
    </div>
  );
}

function CodePanel({
  task,
  may,
  staffName,
  onDone,
}: {
  task: CodingTask;
  may: boolean;
  staffName: string;
  onDone: (msg: string) => void;
}) {
  const [codes, setCodes] = useState<OpenCode[]>(task.human?.codes ?? task.aiCodes);
  const [note, setNote] = useState(task.human?.note ?? "");
  const same = [...task.aiCodes].sort().join("|") === [...codes].sort().join("|");
  const empty = codes.length === 0;
  const short = note.trim().length < 10;

  const toggle = (c: OpenCode) =>
    setCodes((prev) => {
      /* 「불명」은 다른 부호와 함께 붙지 않는다 — 읽어 냈으면 불명이 아니다 */
      if (c === "불명") return prev.includes("불명") ? [] : ["불명"];
      const next = prev.filter((x) => x !== "불명");
      return next.includes(c) ? next.filter((x) => x !== c) : [...next, c];
    });

  return (
    <section className={`${a.panel} p-6`}>
      <p className="adm-t-sm font-bold text-exam-muted">
        {task.id} · 응시번호 {task.seat} · {task.grade} · {task.prompt}
      </p>
      <h3 className={`${a.cardTitle} mt-1`}>{task.question}</h3>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-exam-line p-5">
          <h4 className={a.label}>아이가 쓴 글</h4>
          <p className="mt-2.5 adm-t-md leading-relaxed whitespace-pre-wrap text-exam-text">
            {task.text}
          </p>
          <div className="mt-5 border-t border-exam-line pt-4">
            <h4 className={a.label}>AI가 붙인 부호</h4>
            <p className={`${a.strongText} mt-1.5`}>{task.aiCodes.join(" · ")}</p>
            <p className={`${a.hint} mt-1`}>확신도 {task.confidence.toFixed(2)}</p>
          </div>
        </div>

        <div className="rounded-lg border border-exam-line p-5">
          <h4 className={a.label}>사람이 붙일 부호 (여러 개 고를 수 있습니다)</h4>
          <div className="mt-3 flex flex-wrap gap-2">
            {openCodes.map((c) => {
              const on = codes.includes(c);
              const ai = task.aiCodes.includes(c);
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
            <label htmlFor="code-note" className={a.label}>
              그렇게 읽은 까닭 {!same && <span className="text-brand-700">(AI와 다릅니다)</span>}
            </label>
            <textarea
              id="code-note"
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={`${a.input} mt-2 resize-none`}
              placeholder="글의 어느 대목을 보고 그 부호를 붙였는지 적어 주세요."
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={!may || empty || short}
              onClick={() => {
                confirmCoding(task.id, codes, staffName, note.trim());
                onDone(`${task.seat} ${task.prompt} 응답을 ${codes.join("·")}${ro(codes[codes.length - 1])} 확정했습니다.`);
              }}
              className={may && !empty && !short ? a.btnPrimary : a.btnDisabled}
            >
              이 부호로 확정
            </button>
          </div>
          {empty && (
            <p className="mt-3 adm-t-sm font-bold text-rose-700">
              부호를 하나 이상 고르세요. 읽어 낼 축이 없으면 「불명」을 고르시면 됩니다.
            </p>
          )}
          {!empty && short && (
            <p className="mt-3 adm-t-sm font-bold text-rose-700">까닭을 10자 이상 적어 주세요.</p>
          )}

          {task.human && (
            <div className="mt-5 border-t border-exam-line pt-4">
              <p className={a.label}>이미 확정된 부호</p>
              <p className={`${a.bodyText} mt-1.5`}>
                {task.human.codes.join(" · ")} · {task.human.by} · {task.human.at}
              </p>
              <p className={`${a.bodyText} mt-1`}>{task.human.note}</p>
              <div className="mt-2">
                <Badge
                  label={agreeOf(task) ? "AI와 같음" : "AI와 다름"}
                  className={agreeOf(task) ? "text-emerald-700" : "text-rose-700"}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
