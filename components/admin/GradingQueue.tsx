"use client";

import { useMemo, useState } from "react";
import {
  can,
  caseStates,
  gradingQueue,
  type CaseState,
  type GradingCase,
} from "@/lib/admin";
import { useAdminPrefs } from "@/lib/adminStore";
import { Badge, TableCard } from "./Parts";
import ReasonDialog from "./ReasonDialog";
import * as a from "./ui";

/** 목록 위 필터. 탭이 아니라 큰 버튼으로 두고 건수를 함께 적는다. */
const filters: { id: CaseState | "all"; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "ai", label: "검토 대기" },
  { id: "review", label: "검토중" },
  { id: "conference", label: "케이스 회의" },
  { id: "confirmed", label: "확정" },
  { id: "published", label: "발행 완료" },
];

/** 세 과목만 측정하므로 나머지 다섯 축은 '미측정'으로 따로 적는다 */
function axisScores(c: GradingCase) {
  const base = Number(c.seat) % 17;
  return [
    { label: "언어", score: 62 + ((base * 3) % 34), subject: "국어" },
    { label: "수리·논리", score: 55 + ((base * 5) % 40), subject: "수학" },
    { label: "자연·탐구", score: 58 + ((base * 7) % 36), subject: "과학" },
  ];
}

export default function GradingQueue() {
  const { role, staffName } = useAdminPrefs();
  const [filter, setFilter] = useState<CaseState | "all">("all");
  /** 사유 입력을 기다리는 대상 */
  const [asking, setAsking] = useState<GradingCase | null>(null);
  /** 사유를 남기고 실제로 연 대상 */
  const [opened, setOpened] = useState<GradingCase | null>(null);
  const [note, setNote] = useState("");
  const [done, setDone] = useState<string | null>(null);

  const mayConfirm = can(role, "grade.confirm");

  const rows = useMemo(
    () => (filter === "all" ? gradingQueue : gradingQueue.filter((c) => c.state === filter)),
    [filter],
  );

  const countOf = (id: CaseState | "all") =>
    id === "all" ? gradingQueue.length : gradingQueue.filter((c) => c.state === id).length;

  return (
    <>
      {/* ── 필터 ── */}
      <div className="mb-5 flex flex-wrap gap-2">
        {filters.map((f) => {
          const on = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={on}
              className={`min-h-[2.75rem] rounded-md border px-4 adm-t-sm font-bold transition-colors ${
                on
                  ? "border-brand-900 bg-brand-900 text-white"
                  : "border-exam-line bg-white text-exam-text hover:bg-exam-raised"
              }`}
            >
              {f.label}
              <span className={`ml-2 tabular-nums ${on ? "text-brand-100" : "text-exam-muted"}`}>
                {countOf(f.id)}
              </span>
            </button>
          );
        })}
      </div>

      {done && (
        <p className="mb-5 rounded-md border border-emerald-300 bg-emerald-50 px-5 py-4 adm-t-md font-bold text-emerald-800">
          {done}
        </p>
      )}

      <TableCard
        title={`응시 ${rows.length}건`}
        caption="목록에서는 이름 대신 응시번호로 표시합니다. 이름과 생년월일은 사유를 남겨야 열립니다."
      >
        <table className={a.table}>
          <thead>
            <tr>
              <th className={a.th}>응시번호</th>
              <th className={a.th}>학년</th>
              <th className={a.th}>소속</th>
              <th className={a.th}>AI 제안 (1차)</th>
              <th className={a.th}>제안 확신도</th>
              <th className={a.th}>설문 수집</th>
              <th className={a.th}>상태</th>
              <th className={a.th}>담당자</th>
              <th className={a.th}>할 일</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const surveyCount = Object.values(c.surveys).filter(Boolean).length;
              const low = c.confidence < 70;
              return (
                <tr key={c.id}>
                  <td className={a.tdStrong}>{c.seat}</td>
                  <td className={a.td}>{c.grade}</td>
                  <td className={a.td}>{c.org}</td>
                  <td className={a.td}>
                    <span className="font-bold text-exam-text">{c.suggested}</span>
                    {c.flag && (
                      <span className="mt-1 block adm-t-sm font-bold text-rose-700">{c.flag}</span>
                    )}
                  </td>
                  <td className={a.td}>
                    {/* 숫자만 두면 높고 낮음이 안 읽혀서 글자 판단을 함께 적는다 */}
                    <span
                      className={`adm-t-md font-black tabular-nums ${
                        low ? "text-rose-700" : "text-exam-text"
                      }`}
                    >
                      {c.confidence}점
                    </span>
                    <span className="mt-0.5 block adm-t-sm font-bold text-exam-muted">
                      {low ? "낮음 · 사람이 꼭 확인" : "높음"}
                    </span>
                  </td>
                  <td className={a.td}>
                    <span className="font-bold text-exam-text tabular-nums">{surveyCount} / 3</span>
                    <span className="mt-0.5 block adm-t-sm">
                      {surveyCount === 0 ? "설문 없음" : surveyCount === 3 ? "모두 수집" : "일부 수집"}
                    </span>
                  </td>
                  <td className={a.td}>
                    <Badge {...caseStates[c.state]} />
                  </td>
                  <td className={a.td}>{c.reviewer ?? "미배정"}</td>
                  <td className={a.td}>
                    <button
                      type="button"
                      onClick={() => setAsking(c)}
                      className={c.state === "published" ? a.btnRowGhost : a.btnRow}
                    >
                      {c.state === "published" ? "결과 다시 보기" : "열어서 검토"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableCard>

      {/* ── 사유 입력 ── */}
      {asking && (
        <ReasonDialog
          target={`응시번호 ${asking.seat} (${asking.grade})`}
          onClose={() => setAsking(null)}
          onConfirm={() => {
            setOpened(asking);
            setNote("");
            setAsking(null);
          }}
        />
      )}

      {/* ── 검토 화면 ── */}
      {opened && (
        <section className={`${a.panel} mt-6 p-6`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="adm-t-sm font-bold text-exam-muted">검토중 · {opened.id}</p>
              <h2 className="mt-1 adm-t-xl font-black text-exam-text">
                응시번호 {opened.seat} · {opened.grade} · {opened.org}
              </h2>
              <p className="mt-1.5 adm-t-sm font-bold text-brand-700">
                {staffName} 님의 열람 기록이 감사 로그에 남았습니다.
              </p>
            </div>
            <button type="button" onClick={() => setOpened(null)} className={a.btnGhost}>
              검토 화면 닫기
            </button>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {/* AI가 낸 것 */}
            <div className="rounded-lg border border-exam-line bg-exam-panel p-5">
              <h3 className={a.cardTitle}>AI가 1차로 낸 값</h3>
              <p className="mt-1.5 adm-t-sm text-exam-muted">
                아래는 제안일 뿐입니다. 확정하기 전까지 보호자에게 보이지 않습니다.
              </p>

              <dl className="mt-4 space-y-3">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className={a.label}>대표 재능 축</dt>
                  <dd className="adm-t-lg font-black text-exam-text">{opened.suggested}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className={a.label}>제안 확신도</dt>
                  <dd className="adm-t-lg font-black tabular-nums text-exam-text">
                    {opened.confidence}점
                  </dd>
                </div>
              </dl>

              <ul className="mt-4 space-y-2.5 border-t border-exam-line pt-4">
                {axisScores(opened).map((x) => (
                  <li key={x.label} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 adm-t-sm font-bold text-exam-text">
                      {x.label}
                    </span>
                    <span className="h-3 flex-1 overflow-hidden rounded-full bg-white">
                      <span
                        className="block h-full rounded-full bg-brand-700"
                        style={{ width: `${x.score}%` }}
                      />
                    </span>
                    <span className="w-16 shrink-0 text-right adm-t-sm font-bold tabular-nums text-exam-text">
                      {x.score}점
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 adm-t-sm text-exam-muted">
                나머지 다섯 축(공간·청각·신체·관계·자기이해)은 이번 회차에서 <b>측정하지 않았습니다</b>.
                점수가 낮은 것이 아니라 아직 보지 않은 영역이므로 그대로 표기합니다.
              </p>
            </div>

            {/* 사람이 확인할 것 */}
            <div className="rounded-lg border border-exam-line p-5">
              <h3 className={a.cardTitle}>사람이 확인할 것</h3>

              <ul className="mt-4 space-y-2.5">
                {[
                  { k: "어머니 설문", v: opened.surveys.mother },
                  { k: "아버지 설문", v: opened.surveys.father },
                  { k: "교사 설문", v: opened.surveys.teacher },
                ].map((s) => (
                  <li key={s.k} className="flex items-center justify-between gap-3">
                    <span className={a.label}>{s.k}</span>
                    <Badge
                      label={s.v ? "제출됨" : "제출 안 됨"}
                      className={
                        s.v
                          ? "text-emerald-700"
                          : "text-exam-muted"
                      }
                    />
                  </li>
                ))}
              </ul>

              {opened.flag && (
                <p className="mt-4 rounded-md border border-rose-300 bg-rose-50 px-4 py-3 adm-t-sm font-bold text-rose-800">
                  확인 필요: {opened.flag}
                  <span className="mt-1 block font-normal">
                    이 경우 바로 확정하지 말고 케이스 회의로 넘기는 것이 원칙입니다.
                  </span>
                </p>
              )}

              <div className="mt-5">
                <label htmlFor="review-note" className={a.label}>
                  검토 의견 (리포트의 전문가 평가에 반영됩니다)
                </label>
                <textarea
                  id="review-note"
                  rows={5}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className={`${a.input} mt-2 resize-none`}
                  placeholder="관찰된 행동을 그대로 적어 주세요. 등급이나 순위 표현은 쓰지 않습니다."
                />
                <p className="mt-1.5 adm-t-sm text-exam-muted">
                  A·B·C 같은 등급 표현은 사용하지 않습니다. 리포트에도 그대로 나가는 문장입니다.
                </p>
              </div>
            </div>
          </div>

          {/* 결정 */}
          <div className="mt-6 border-t border-exam-line pt-5">
            <p className={a.label}>이 응시를 어떻게 처리할까요?</p>
            {!mayConfirm && (
              <p className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 adm-t-sm font-bold text-amber-900">
                지금 역할에는 판정 확정 권한이 없습니다. 의견만 남길 수 있습니다.
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={!mayConfirm || note.trim().length < 10}
                onClick={() => {
                  setDone(`응시번호 ${opened.seat} 판정을 확정했습니다. 리포트 발행 대기로 넘어갑니다.`);
                  setOpened(null);
                }}
                className={mayConfirm && note.trim().length >= 10 ? a.btnPrimary : a.btnDisabled}
              >
                판정 확정하기
              </button>
              <button
                type="button"
                onClick={() => {
                  setDone(`응시번호 ${opened.seat} 을(를) 케이스 회의 안건으로 넘겼습니다.`);
                  setOpened(null);
                }}
                className={a.btnGhost}
              >
                케이스 회의로 넘기기
              </button>
              <button
                type="button"
                onClick={() => {
                  setDone(`응시번호 ${opened.seat} 을(를) 다음 회차 재관찰로 넘겼습니다.`);
                  setOpened(null);
                }}
                className={a.btnDanger}
              >
                확정하지 않고 다음 회차 재관찰
              </button>
            </div>
            {mayConfirm && note.trim().length < 10 && (
              <p className="mt-3 adm-t-sm font-bold text-rose-700">
                확정하려면 검토 의견을 10자 이상 적어야 합니다.
              </p>
            )}
          </div>
        </section>
      )}
    </>
  );
}
