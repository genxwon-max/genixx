"use client";

import { useState } from "react";
import { can } from "@/lib/admin";
import { recordAction, useAdminPrefs } from "@/lib/adminStore";
import {
  BORDER,
  addComment,
  basisOf,
  cellNow,
  cellOf,
  crossCells,
  holdCase,
  isBorder,
  levelOf,
  reopenCase,
  rubric,
  scoreDone,
  setCell,
  signCase,
  signIntact,
  topReason,
  useExpert,
  type ConferenceCase,
  type CrossCell,
} from "@/lib/expertStore";
import { ro } from "@/lib/utils";
import { AnchorSection, Badge, Callout, Foldable, TableCard } from "./Parts";
import ReasonDialog from "./ReasonDialog";
import * as a from "./ui";

/**
 * 판정 협진 (EXP-07).
 *
 * 의사 협진 모델을 그대로 옮긴 화면이다. 판정을 한 사람이 혼자 내리지 않는다.
 *
 * 여기서 지키는 것 넷 —
 *  1) 네 정보원(지필·설문·관찰·면담)을 나란히 편다. 하나만 크게 띄우면 나머지는
 *     읽히지 않고, 결국 지필 점수 하나로 판정이 굳는다.
 *  2) 크로스 6셀에서 AI가 고른 칸을 사람이 바꿀 수 있다. 바꾼 까닭이 남는다.
 *  3) 컷 ±0.25 안이면 확정 버튼이 열리지 않는다. 경계선은 유보가 원칙이다.
 *  4) 이견은 지우지 않는다. 합의되지 않은 코멘트가 그대로 남아야, 나중에 이 판정을
 *     다시 볼 때 무엇이 걸렸는지 알 수 있다.
 */
export default function ConferencePanel() {
  const { conference, scores, interviews } = useExpert();
  const { role, staffName } = useAdminPrefs();
  const [asking, setAsking] = useState<ConferenceCase | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const mayConfirm = can(role, "grade.confirm");
  const open = conference.find((c) => c.id === openId) ?? null;

  const openCases = conference.filter((c) => c.state === "open");
  const held = conference.filter((c) => c.state === "held");
  const signed = conference.filter((c) => c.state === "signed");
  const border = openCases.filter(isBorder);

  return (
    <>
      <Callout tone="info" title="네 정보원을 나란히 놓고 함께 봅니다">
        지필 하나로 판정을 굳히지 않기 위한 화면입니다. AI가 고른 칸은 제안일 뿐이고, 확정은 사람이
        이름을 걸고 합니다.
      </Callout>

      {done && (
        <div className="mt-5">
          <Callout tone="good">{done}</Callout>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <Stat label="협진 대기" value={`${openCases.length}건`} note="아직 확정되지 않음" />
        <Stat
          label="경계선"
          value={`${border.length}건`}
          note={`컷 ±${BORDER} 안 · 확정 막힘`}
          tone={border.length ? "text-rose-700" : undefined}
        />
        <Stat label="유보" value={`${held.length}건`} note="다음 회차 재관찰" />
        <Stat label="확정·서명" value={`${signed.length}건`} note="리포트 조립으로 넘어감" />
      </div>

      <div className="mt-5">
        <TableCard
          title={`케이스 ${conference.length}건`}
          caption="목록에서는 이름 대신 응시번호로 표시합니다. 케이스를 열려면 사유를 남겨야 합니다."
        >
          <table className={a.table}>
            <thead>
              <tr>
                <th className={a.th}>응시번호</th>
                <th className={a.th}>학년 · 소속</th>
                <th className={a.th}>AI 제안 셀</th>
                <th className={a.th}>확신도</th>
                <th className={a.th}>컷과의 거리</th>
                <th className={a.th}>정보원</th>
                <th className={a.th}>상태</th>
                <th className={a.th}>할 일</th>
              </tr>
            </thead>
            <tbody>
              {conference.map((c) => {
                const cell = cellOf(cellNow(c));
                const itv = interviews.find((v) => v.id === c.interviewId);
                const sources = [
                  c.paper.length > 0,
                  c.survey.mother || c.survey.father || c.survey.teacher,
                  !!c.observation,
                  itv?.state === "coded",
                ].filter(Boolean).length;
                return (
                  <tr key={c.id}>
                    <td className={a.tdStrongTight}>{c.seat}</td>
                    <td className={a.td}>
                      {c.grade}
                      <span className="mt-0.5 block adm-t-sm">{c.org}</span>
                    </td>
                    <td className={a.td}>
                      <span className={`font-bold ${cell.tone}`}>{cell.label}</span>
                      {c.cell && (
                        <span className="mt-0.5 block adm-t-sm font-bold text-brand-700">
                          사람이 조정함
                        </span>
                      )}
                    </td>
                    <td className={a.td}>
                      <span
                        className={`font-black tabular-nums ${
                          c.aiConfidence < 0.75 ? "text-rose-700" : "text-exam-text"
                        }`}
                      >
                        {c.aiConfidence.toFixed(2)}
                      </span>
                    </td>
                    <td className={a.td}>
                      <span
                        className={`font-black tabular-nums ${
                          isBorder(c) ? "text-rose-700" : "text-exam-text"
                        }`}
                      >
                        {c.margin > 0 ? "+" : ""}
                        {c.margin.toFixed(2)}
                      </span>
                      {isBorder(c) && (
                        <span className="mt-0.5 block adm-t-sm font-bold text-rose-700">경계선</span>
                      )}
                    </td>
                    <td className={a.td}>
                      <span className="font-bold tabular-nums text-exam-text">{sources} / 4</span>
                    </td>
                    <td className={a.td}>
                      {c.state === "signed" ? (
                        <Badge label="확정·서명" className="text-emerald-700" />
                      ) : c.state === "held" ? (
                        <Badge label="유보" className="text-amber-700" />
                      ) : (
                        <Badge label="협진 중" className="text-brand-700" />
                      )}
                    </td>
                    <td className={a.td}>
                      <button
                        type="button"
                        onClick={() =>
                          openId === c.id ? setOpenId(null) : setAsking(c)
                        }
                        className={openId === c.id ? a.btnRow : a.btnRowGhost}
                      >
                        {openId === c.id ? "닫기" : "케이스 열기"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableCard>
      </div>

      {asking && (
        <ReasonDialog
          target={`응시번호 ${asking.seat} 판정 협진 (${asking.grade})`}
          onClose={() => setAsking(null)}
          onConfirm={() => {
            setOpenId(asking.id);
            setAsking(null);
          }}
        />
      )}

      {open ? (
        <CaseView
          key={open.id}
          c={open}
          mayConfirm={mayConfirm}
          staffName={staffName}
          onDone={setDone}
        />
      ) : (
        <div className="mt-10 border-l-4 border-exam-line pl-4">
          <p className="adm-t-md font-bold text-exam-text">케이스를 열면 아래가 채워집니다</p>
          <p className={`${a.bodyText} mt-1`}>
            케이스 카드 · 크로스 6셀 · 경계선 유보 · 코멘트 · 최종 확정이 한 아이를 기준으로
            이어집니다.
          </p>
        </div>
      )}

      {/* 채점이 끝나지 않은 케이스가 있으면 알린다 — 협진의 지필 칸이 비어 있는 셈이다 */}
      {scores.some((t) => !scoreDone(t)) && (
        <div className="mt-8">
          <Callout tone="warn" title="아직 확정되지 않은 서술형 응답이 있습니다">
            채점 워크벤치에 확정 대기 {scores.filter((t) => !scoreDone(t)).length}건이 남아 있습니다.
            지필 칸이 확정되기 전에 판정을 굳히면, 나중에 점수가 바뀌어도 판정은 그대로 남습니다.
          </Callout>
        </div>
      )}
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

/* ───────────────────────── 케이스 한 벌 ───────────────────────── */

function CaseView({
  c,
  mayConfirm,
  staffName,
  onDone,
}: {
  c: ConferenceCase;
  mayConfirm: boolean;
  staffName: string;
  onDone: (msg: string) => void;
}) {
  const { scores, interviews } = useExpert();
  const itv = interviews.find((v) => v.id === c.interviewId) ?? null;
  const mine = scores.filter((t) => t.seat === c.seat);
  const locked = c.state === "signed";

  return (
    <>
      {/* ── EXP-07-1 케이스 카드 ── */}
      <div className="mt-10">
        <AnchorSection
          id="EXP-07-1"
          title="케이스 카드"
          lead="지필 · 설문 · 관찰 · 면담을 한 화면에 나란히 폅니다. 어느 하나를 크게 띄우지 않습니다."
        >
          <div className="mb-4 flex flex-wrap items-baseline gap-x-3">
            <h3 className={a.cardTitle}>
              응시번호 {c.seat} · {c.grade} · {c.org}
            </h3>
            <span className="adm-t-sm font-bold text-brand-700">
              {staffName} 님의 열람 기록이 감사 로그에 남았습니다.
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            {/* 지필 */}
            <div className="rounded-lg border border-exam-line p-5">
              <p className={a.label}>① 지필</p>
              <ul className="mt-3 space-y-2.5">
                {c.paper.map((p) => (
                  <li key={p.axis} className="flex items-center gap-2.5">
                    <span className="w-20 shrink-0 adm-t-sm font-bold text-exam-text">{p.axis}</span>
                    <span className="h-3 flex-1 overflow-hidden rounded-full bg-exam-raised">
                      <span
                        className="block h-full rounded-full bg-brand-700"
                        style={{ width: `${p.score}%` }}
                      />
                    </span>
                    <span className="w-11 shrink-0 text-right adm-t-sm font-bold tabular-nums text-exam-text">
                      {p.score}
                    </span>
                  </li>
                ))}
              </ul>
              {mine.length > 0 && (
                <div className="mt-4 border-t border-exam-line pt-3">
                  <p className={a.hint}>서술형 채점</p>
                  <ul className="mt-1.5 space-y-1">
                    {mine.map((t) => (
                      <li key={t.id} className="adm-t-sm text-exam-text">
                        · {t.subject} {rubric[levelOf(t)].label}
                        <span className="text-exam-muted">
                          {" "}
                          {scoreDone(t) ? `· ${t.human!.by} 확정` : "· 아직 AI 값"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className={`${a.hint} mt-3`}>
                재지 않은 다섯 축은 빈칸입니다. 낮은 점수가 아니라 아직 보지 않은 영역입니다.
              </p>
            </div>

            {/* 설문 */}
            <div className="rounded-lg border border-exam-line p-5">
              <p className={a.label}>② 설문</p>
              <ul className="mt-3 space-y-2">
                {[
                  { k: "어머니", v: c.survey.mother },
                  { k: "아버지", v: c.survey.father },
                  { k: "지도교사", v: c.survey.teacher },
                ].map((s) => (
                  <li key={s.k} className="flex items-center justify-between gap-3">
                    <span className={a.label}>{s.k}</span>
                    <Badge
                      label={s.v ? "제출됨" : "제출 안 됨"}
                      className={s.v ? "text-emerald-700" : "text-exam-muted"}
                    />
                  </li>
                ))}
              </ul>
              {!c.survey.mother && !c.survey.father && !c.survey.teacher && (
                <p className="mt-3 adm-t-sm font-bold text-rose-700">
                  설문이 한 건도 없습니다. 지필 하나로 확증까지 가지 않는 것이 원칙입니다.
                </p>
              )}
            </div>

            {/* 관찰 */}
            <div className="rounded-lg border border-exam-line p-5">
              <p className={a.label}>③ 관찰</p>
              {c.observation ? (
                <p className="mt-2.5 adm-t-md leading-relaxed text-exam-text">{c.observation}</p>
              ) : (
                <p className={`${a.bodyText} mt-2.5`}>
                  교사 관찰 기록이 없습니다. 개인 신청이거나 교사 설문이 들어오지 않은 경우입니다.
                </p>
              )}
            </div>

            {/* 면담 */}
            <div className="rounded-lg border border-exam-line p-5">
              <p className={a.label}>④ 면담</p>
              {itv?.coded ? (
                <>
                  <p className={`${a.strongText} mt-2.5`}>{itv.coded.codes.join(" · ")}</p>
                  <p className="mt-1.5 adm-t-md leading-relaxed text-exam-text">
                    {itv.coded.summary}
                  </p>
                  <p className={`${a.hint} mt-2`}>
                    {itv.coded.by} · {itv.coded.at}
                  </p>
                </>
              ) : itv ? (
                <p className={`${a.bodyText} mt-2.5`}>
                  {topReason(itv.reasons).label}
                  {ro(topReason(itv.reasons).label)} 선발되었으나 아직 코딩이 확정되지 않았습니다.
                  확정 전에는 여기에 올라오지 않습니다.
                </p>
              ) : (
                <p className={`${a.bodyText} mt-2.5`}>면담 대상이 아닙니다.</p>
              )}
            </div>
          </div>
        </AnchorSection>
      </div>

      {/* ── EXP-07-2 크로스 6셀 ── */}
      <div className="mt-10">
        <CrossPanel c={c} locked={locked} staffName={staffName} onDone={onDone} />
      </div>

      {/* ── EXP-07-3 경계선 유보 ── */}
      <div className="mt-10">
        <HoldPanel c={c} mayConfirm={mayConfirm} staffName={staffName} onDone={onDone} />
      </div>

      {/* ── EXP-07-4 코멘트 ── */}
      <div className="mt-10">
        <CommentPanel c={c} staffName={staffName} onDone={onDone} />
      </div>

      {/* ── EXP-07-5 확정·서명 ── */}
      <div className="mt-10">
        <SignPanel c={c} mayConfirm={mayConfirm} staffName={staffName} onDone={onDone} />
      </div>
    </>
  );
}

/* ───────────────────────── 크로스 6셀 ───────────────────────── */

function CrossPanel({
  c,
  locked,
  staffName,
  onDone,
}: {
  c: ConferenceCase;
  locked: boolean;
  staffName: string;
  onDone: (msg: string) => void;
}) {
  const [pick, setPick] = useState<CrossCell>(cellNow(c));
  const [why, setWhy] = useState("");
  const changed = pick !== cellNow(c);
  const short = why.trim().length < 10;

  return (
    <AnchorSection
      id="EXP-07-2"
      title="크로스 판정 6셀 확인"
      lead="학력(지필)과 재능(설문·관찰·면담)이 만나는 칸을 여섯으로 나눕니다. AI가 고른 칸을 사람이 승인하거나 조정합니다."
    >
      <Callout tone="info" title={`AI 제안 — ${cellOf(c.aiCell).label}`}>
        {c.aiWhy}
        <p className={`${a.hint} mt-1.5`}>제안 확신도 {c.aiConfidence.toFixed(2)}</p>
      </Callout>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {crossCells.map((cell) => {
          const on = pick === cell.id;
          const ai = c.aiCell === cell.id;
          return (
            <button
              key={cell.id}
              type="button"
              disabled={locked}
              onClick={() => setPick(cell.id)}
              aria-pressed={on}
              className={`rounded-lg border p-4 text-left transition-colors ${
                on
                  ? "border-brand-900 bg-brand-50"
                  : locked
                    ? "cursor-not-allowed border-exam-line bg-exam-raised"
                    : "border-exam-line bg-white hover:bg-exam-raised"
              }`}
            >
              <span className="flex items-baseline gap-2">
                <span className={`adm-t-md font-black ${cell.tone}`}>{cell.label}</span>
                {ai && <span className="ml-auto adm-t-sm font-bold text-brand-700">AI 제안</span>}
              </span>
              <span className="mt-1.5 block adm-t-sm text-exam-text">{cell.desc}</span>
              <span className="mt-1.5 block adm-t-sm text-exam-muted">→ {cell.next}</span>
            </button>
          );
        })}
      </div>

      {c.cell && (
        <div className="mt-5">
          <Callout tone="good" title={`사람이 조정한 칸 — ${cellOf(c.cell).label}`}>
            {c.cellBy} · {c.cellWhy}
          </Callout>
        </div>
      )}

      {!locked && (
        <div className="mt-5 max-w-2xl">
          <label htmlFor="cell-why" className={a.label}>
            {changed ? "AI 제안과 다른 칸을 고른 까닭" : "이 칸이 맞다고 본 까닭"}
          </label>
          <textarea
            id="cell-why"
            rows={3}
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            className={`${a.input} mt-2 resize-none`}
            placeholder="네 정보원 가운데 무엇을 근거로 삼았는지 적어 주세요."
          />
          <button
            type="button"
            disabled={short}
            onClick={() => {
              setCell(c.id, pick, staffName, why.trim());
              setWhy("");
              onDone(`${c.seat} 크로스 셀을 ${cellOf(pick).label}${ro(cellOf(pick).label)} 두었습니다.`);
            }}
            className={`${short ? a.btnDisabled : a.btnPrimary} mt-3`}
          >
            이 칸으로 두기
          </button>
          {short && (
            <p className="mt-2 adm-t-sm font-bold text-rose-700">까닭을 10자 이상 적어 주세요.</p>
          )}
        </div>
      )}
    </AnchorSection>
  );
}

/* ───────────────────────── 경계선 유보 ───────────────────────── */

function HoldPanel({
  c,
  mayConfirm,
  staffName,
  onDone,
}: {
  c: ConferenceCase;
  mayConfirm: boolean;
  staffName: string;
  onDone: (msg: string) => void;
}) {
  const [reason, setReason] = useState("");
  const short = reason.trim().length < 10;
  const border = isBorder(c);

  return (
    <AnchorSection
      id="EXP-07-3"
      title="경계선 유보 처리"
      lead={`판정 컷에서 ±${BORDER} 안에 있는 사례는 확정하지 않고 다음 회차 재관찰로 넘깁니다.`}
    >
      <div className="rounded-lg border border-exam-line p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className={a.label}>컷과의 거리 (θ)</p>
          <p className={`${a.metric} ${border ? "text-rose-700" : "text-exam-text"}`}>
            {c.margin > 0 ? "+" : ""}
            {c.margin.toFixed(2)}
          </p>
        </div>

        {/* 컷을 가운데 두고 ±0.25 띠를 그린다 — 숫자만으로는 「가깝다」가 안 읽힌다 */}
        <div className="relative mt-4 h-8 overflow-hidden rounded-md bg-exam-raised">
          <span
            className="absolute inset-y-0 bg-rose-100"
            style={{ left: `${50 - BORDER * 25}%`, width: `${BORDER * 50}%` }}
          />
          <span className="absolute inset-y-0 left-1/2 w-px bg-exam-muted" />
          <span
            className="absolute top-1 bottom-1 w-1 rounded-full bg-brand-900"
            style={{
              left: `calc(${Math.max(2, Math.min(98, 50 + c.margin * 25))}% - 2px)`,
            }}
          />
        </div>
        <div className="mt-1.5 flex justify-between adm-t-sm text-exam-muted">
          <span>−2.0</span>
          <span>컷</span>
          <span>+2.0</span>
        </div>

        {border ? (
          <div className="mt-5">
            <Callout tone="warn" title="경계선입니다 — 확정 버튼이 열리지 않습니다">
              컷 바로 옆의 0.1 차이는 이 아이가 다르다는 뜻이 아니라 이번 회차에 그렇게 나왔다는
              뜻입니다. 한 번 확정하면 그 값이 리포트로 나가므로, 여기서는 <b>유보가 기본</b>입니다.
            </Callout>
          </div>
        ) : (
          <p className={`${a.bodyText} mt-5`}>
            경계선 밖입니다. 그래도 네 정보원이 서로 어긋난다면 유보할 수 있습니다.
          </p>
        )}

        {c.hold ? (
          <div className="mt-5 border-t border-exam-line pt-4">
            <p className={a.label}>유보됨</p>
            <p className={`${a.bodyText} mt-1.5`}>
              {c.hold.by} · {c.hold.at} · {c.hold.nextRound} 재관찰
            </p>
            <p className={`${a.bodyText} mt-1`}>{c.hold.reason}</p>
            {mayConfirm && (
              <button
                type="button"
                onClick={() => {
                  reopenCase(c.id, staffName);
                  onDone(`${c.seat} 유보를 풀었습니다.`);
                }}
                className={`${a.btnGhost} mt-3`}
              >
                유보 풀고 다시 협진
              </button>
            )}
          </div>
        ) : (
          c.state !== "signed" && (
            <div className="mt-5 max-w-2xl border-t border-exam-line pt-4">
              <label htmlFor="hold-why" className={a.label}>
                무엇을 다시 봐야 하는지
              </label>
              <textarea
                id="hold-why"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={`${a.input} mt-2 resize-none`}
                placeholder="다음 회차에 무엇을 확인해야 하는지 적어 주세요. 그대로 다음 담당자에게 넘어갑니다."
              />
              <button
                type="button"
                disabled={!mayConfirm || short}
                onClick={() => {
                  holdCase(c.id, staffName, reason.trim(), "2026 파일럿 4회차");
                  recordAction(
                    `응시번호 ${c.seat}`,
                    "판정 유보",
                    reason.trim(),
                    staffName,
                  );
                  setReason("");
                  onDone(`${c.seat} 판정을 유보하고 다음 회차 재관찰로 넘겼습니다.`);
                }}
                className={`${mayConfirm && !short ? a.btnDanger : a.btnDisabled} mt-3`}
              >
                확정하지 않고 다음 회차 재관찰
              </button>
              {!mayConfirm && (
                <p className="mt-2 adm-t-sm font-bold text-rose-700">
                  지금 역할에는 판정 확정 권한이 없습니다. 코멘트만 남길 수 있습니다.
                </p>
              )}
            </div>
          )
        )}
      </div>
    </AnchorSection>
  );
}

/* ───────────────────────── 코멘트 ───────────────────────── */

function CommentPanel({
  c,
  staffName,
  onDone,
}: {
  c: ConferenceCase;
  staffName: string;
  onDone: (msg: string) => void;
}) {
  const [field, setField] = useState("");
  const [text, setText] = useState("");
  const [dissent, setDissent] = useState(false);
  const short = text.trim().length < 10 || field.trim().length === 0;
  const dissents = c.comments.filter((m) => m.dissent);

  return (
    <AnchorSection
      id="EXP-07-4"
      title="다분야 전문가 코멘트"
      lead="교과별 전문가가 각자 자기 자리에서 봅니다. 합의되지 않은 이견도 지우지 않고 남깁니다."
    >
      {dissents.length > 0 && (
        <Callout tone="warn" title={`합의되지 않은 이견 ${dissents.length}건`}>
          이견이 남은 채로도 확정할 수 있습니다. 다만 그 사실이 판정 이력에 함께 남습니다 — 나중에
          이 판정을 다시 볼 때 무엇이 걸렸는지 알아야 하기 때문입니다.
        </Callout>
      )}

      <ul className="mt-5 border-b border-exam-line">
        {c.comments.map((m) => (
          <li key={m.id} className="border-t border-exam-line py-4">
            <div className="flex flex-wrap items-baseline gap-x-2.5">
              <span className="adm-t-md font-bold text-exam-text">{m.by}</span>
              <span className="adm-t-sm font-bold text-exam-muted">{m.field}</span>
              {m.dissent && <Badge label="이견" className="text-rose-700" />}
              <span className={`${a.hint} ml-auto`}>{m.at}</span>
            </div>
            <p className="mt-1.5 adm-t-md leading-relaxed text-exam-text">{m.text}</p>
          </li>
        ))}
        {c.comments.length === 0 && (
          <li className="border-t border-exam-line py-4">
            <p className={a.bodyText}>아직 코멘트가 없습니다.</p>
          </li>
        )}
      </ul>

      <div className="mt-5 max-w-2xl">
        <label htmlFor="cm-field" className={a.label}>
          내 전문 분야
        </label>
        <input
          id="cm-field"
          value={field}
          onChange={(e) => setField(e.target.value)}
          className={`${a.input} mt-2`}
          placeholder="예: 국어교육 · 교육심리 · 뇌과학"
        />
        <label htmlFor="cm-text" className={`${a.label} mt-4 block`}>
          코멘트
        </label>
        <textarea
          id="cm-text"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className={`${a.input} mt-2 resize-none`}
          placeholder="관찰된 것과 그것을 어떻게 읽었는지를 나누어 적어 주세요."
        />
        <label className="mt-3 flex items-center gap-2.5">
          <input
            type="checkbox"
            checked={dissent}
            onChange={(e) => setDissent(e.target.checked)}
            className="h-5 w-5 rounded border-exam-line"
          />
          <span className={a.label}>지금 제안된 판정에 동의하지 않습니다 (이견으로 남깁니다)</span>
        </label>
        <button
          type="button"
          disabled={short}
          onClick={() => {
            addComment(c.id, staffName, field.trim(), text.trim(), dissent);
            setText("");
            setDissent(false);
            onDone(`${c.seat} 케이스에 코멘트를 남겼습니다.`);
          }}
          className={`${short ? a.btnDisabled : a.btnPrimary} mt-3`}
        >
          코멘트 남기기
        </button>
        {short && (
          <p className="mt-2 adm-t-sm font-bold text-rose-700">
            분야를 적고 코멘트를 10자 이상 써 주세요.
          </p>
        )}
      </div>
    </AnchorSection>
  );
}

/* ───────────────────────── 확정·서명 ───────────────────────── */

function SignPanel({
  c,
  mayConfirm,
  staffName,
  onDone,
}: {
  c: ConferenceCase;
  mayConfirm: boolean;
  staffName: string;
  onDone: (msg: string) => void;
}) {
  const { scores } = useExpert();
  const [ask, setAsk] = useState(false);
  const border = isBorder(c);
  const held = c.state === "held";
  const signed = c.state === "signed";
  const intact = signIntact(c, scores);
  const blocked = border || held;

  return (
    <AnchorSection
      id="EXP-07-5"
      title="최종 확정 · 전자서명"
      lead="확정한 사람과 시각, 그리고 그때 본 근거를 한 줄로 굳혀 남깁니다."
    >
      {signed ? (
        <div className="rounded-lg border border-exam-line p-5">
          <p className={a.label}>확정됨</p>
          <p className={`${a.strongText} mt-1.5`}>
            {c.sign!.by} · {c.sign!.at}
          </p>
          <div className="mt-4 border-t border-exam-line pt-4">
            <p className={a.label}>근거 해시</p>
            <p className="mt-1.5 font-mono adm-t-md font-bold break-all text-exam-text">
              {c.sign!.hash}
            </p>
            <p className={`${a.hint} mt-2`}>확정 시점의 근거</p>
            <p className="mt-1 font-mono adm-t-sm break-all text-exam-muted">{c.sign!.basis}</p>
          </div>
          <div className="mt-4 border-t border-exam-line pt-4">
            {intact ? (
              <Callout tone="good" title="근거가 그대로입니다">
                지금 값으로 해시를 다시 계산해도 같습니다. 확정 뒤에 자료가 움직이지 않았습니다.
              </Callout>
            ) : (
              <Callout tone="warn" title="확정 뒤에 근거가 바뀌었습니다">
                지금 값으로 계산한 해시가 다릅니다. 지금 근거 —
                <span className="mt-1 block font-mono adm-t-sm break-all">{basisOf(c, scores)}</span>
                판정을 다시 볼지 결정해 주세요.
              </Callout>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-exam-line p-5">
          <p className={a.label}>확정하면 이렇게 굳습니다</p>
          <p className="mt-2 font-mono adm-t-sm break-all text-exam-muted">{basisOf(c, scores)}</p>
          <p className={`${a.hint} mt-2`}>
            이 한 줄을 해시로 만들어 서명에 붙입니다. 뒤에 점수나 셀이 바뀌면 다시 계산한 해시가
            달라지므로, 「확정 뒤에 무엇이 움직였다」는 사실이 드러납니다.
          </p>

          {blocked && (
            <div className="mt-5">
              <Callout tone="warn" title={held ? "유보된 케이스입니다" : "경계선이라 확정할 수 없습니다"}>
                {held
                  ? "먼저 위에서 유보를 풀어야 확정할 수 있습니다."
                  : `컷에서 ±${BORDER} 안입니다. 유보하고 다음 회차에 다시 보는 것이 원칙입니다.`}
              </Callout>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={!mayConfirm || blocked}
              onClick={() => setAsk(true)}
              className={mayConfirm && !blocked ? a.btnPrimary : a.btnDisabled}
            >
              최종 확정 · 전자서명
            </button>
          </div>
          {!mayConfirm && (
            <p className="mt-3 adm-t-sm font-bold text-rose-700">
              지금 역할에는 판정 확정 권한이 없습니다.
            </p>
          )}

          <div className="mt-5">
            <Foldable title="확정 뒤에는 무엇이 일어나나">
              <p className={a.bodyText}>
                확정된 케이스만 리포트 조립으로 넘어갑니다. 조립된 리포트도 바로 나가지 않고
                <b> 리포트 승인</b>에서 사람이 한 번 더 봅니다. 여기서 확정했다고 보호자
                화면이 열리는 것은 아닙니다.
              </p>
            </Foldable>
          </div>
        </div>
      )}

      {ask && (
        <SignDialog
          c={c}
          staffName={staffName}
          onClose={() => setAsk(false)}
          onSigned={(hash) => {
            setAsk(false);
            onDone(`${c.seat} 판정을 확정했습니다. 서명 ${hash.slice(0, 8)}`);
          }}
        />
      )}
    </AnchorSection>
  );
}

function SignDialog({
  c,
  staffName,
  onClose,
  onSigned,
}: {
  c: ConferenceCase;
  staffName: string;
  onClose: () => void;
  onSigned: (hash: string) => void;
}) {
  const [name, setName] = useState("");
  /* 이름을 그대로 받아 적게 한다. 버튼 하나로 서명이 되면 「눌렀다」가 「확인했다」로
     기록되는데, 그 둘은 같지 않다. */
  const ok = name.trim() === staffName;
  const dissents = c.comments.filter((m) => m.dissent);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sign-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-exam-line bg-white p-6 sm:p-8">
        <h2 id="sign-title" className={a.pageTitle}>
          응시번호 {c.seat} 판정을 확정합니다
        </h2>
        <p className={`${a.bodyText} mt-2.5`}>
          확정하면 <b>{cellOf(cellNow(c)).label}</b>으로 굳고 리포트 조립으로 넘어갑니다. 확정한
          사람의 이름이 판정 이력에 남습니다.
        </p>

        {dissents.length > 0 && (
          <div className="mt-5">
            <Callout tone="warn" title={`합의되지 않은 이견 ${dissents.length}건이 남아 있습니다`}>
              <ul className="space-y-1">
                {dissents.map((m) => (
                  <li key={m.id}>
                    · {m.by} ({m.field}) — {m.text}
                  </li>
                ))}
              </ul>
              <p className={`${a.hint} mt-2`}>
                막지는 않습니다. 다만 이견이 남은 채로 확정했다는 사실이 함께 기록됩니다.
              </p>
            </Callout>
          </div>
        )}

        <div className="mt-6">
          <label htmlFor="sign-name" className={a.label}>
            확인했다는 뜻으로 본인 이름을 적어 주세요 ({staffName})
          </label>
          <input
            id="sign-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`${a.input} mt-2`}
            placeholder={staffName}
            autoComplete="off"
          />
          <p className={`${a.hint} mt-1.5`}>
            버튼 하나로 서명이 되면 「눌렀다」가 「확인했다」로 기록됩니다. 그 둘은 같지 않습니다.
          </p>
        </div>

        <div className="mt-7 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!ok}
            onClick={() => {
              const hash = signCase(c.id, staffName);
              recordAction(
                `응시번호 ${c.seat}`,
                "판정 확정 · 전자서명",
                `${cellOf(cellNow(c)).label}${dissents.length ? ` (이견 ${dissents.length}건 남음)` : ""}`,
                staffName,
              );
              if (hash) onSigned(hash);
            }}
            className={ok ? a.btnPrimary : a.btnDisabled}
          >
            확정하고 서명
          </button>
          <button type="button" onClick={onClose} className={a.btnGhost}>
            그만두기
          </button>
        </div>
      </div>
    </div>
  );
}
