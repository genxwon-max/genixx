"use client";

import { useMemo, useState } from "react";
import { can } from "@/lib/admin";
import { useAdminPrefs } from "@/lib/adminStore";
import {
  ICC_TARGET,
  ROUTE_CUT,
  assignScore,
  confirmScore,
  icc,
  isRouted,
  routeLowConfidence,
  rubric,
  scoreDone,
  secondScore,
  useExpert,
  type RubricLevel,
  type ScoreTask,
} from "@/lib/expertStore";
import { ro } from "@/lib/utils";
import { AnchorSection, Badge, Callout, Foldable, TableCard, Tabs } from "./Parts";
import * as a from "./ui";

/**
 * 채점 워크벤치 (EXP-04).
 *
 * 서술형은 AI가 전수로 1차 채점하고, 사람이 확정한다. 그래서 이 화면의 단위는
 * 「학생」이 아니라 「응답 하나」다 — 한 아이의 국어는 확신도 0.9인데 수학은 0.5일 수
 * 있고, 사람이 봐야 하는 것은 뒤의 것뿐이다.
 *
 * AI 값은 지우지 않는다. 사람이 바꾼 자리가 어디인지가 남아야 다음 회차에 무엇을
 * 고쳐야 하는지 알 수 있다. 화면에서도 AI 값과 사람 값을 나란히 둔다.
 */
/** 정의서의 하위 화면 넷. 한 번에 하나만 연다. */
type View = "queue" | "rubric" | "routed" | "icc";

export default function ScoringBench() {
  const { scores } = useExpert();
  const { role, staffName } = useAdminPrefs();
  const [filter, setFilter] = useState<"all" | "wait" | "routed" | "done">("wait");
  const [openId, setOpenId] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [view, setView] = useState<View>("queue");

  const may = can(role, "grade.review");

  const routed = scores.filter((t) => isRouted(t) && !scoreDone(t));
  const waiting = scores.filter((t) => !scoreDone(t));
  const finished = scores.filter(scoreDone);

  const rows = useMemo(() => {
    if (filter === "wait") return waiting;
    if (filter === "routed") return routed;
    if (filter === "done") return finished;
    return scores;
  }, [filter, scores, waiting, routed, finished]);

  const open = scores.find((t) => t.id === openId) ?? null;

  return (
    <>
      {/* 정의서의 하위 화면 넷을 세로로 잇지 않는다. 이어 붙였더니 화면 대여섯 장이
          되어, 아래쪽 「이중 채점·ICC」는 있는 줄도 모르는 자리가 되었다. */}
      <Tabs
        label="채점 워크벤치 구역"
        value={view}
        onChange={setView}
        items={[
          { id: "queue", label: "검토 큐", n: waiting.length },
          { id: "rubric", label: "루브릭 채점" },
          { id: "routed", label: "저신뢰 라우팅", n: routed.length },
          { id: "icc", label: "이중 채점 · ICC" },
        ]}
      />

      {/* 「AI가 매긴 값은 확정이 아니다」를 판으로 세워 두지 않는다. 매일 같은
          자리에 같은 문구가 떠 있으면 곧 배경처럼 읽히고, 그 말이 정작 필요한
          자리는 여기가 아니라 값을 고르는 루브릭 옆이다. */}
      {done && (
        <div className="mt-6">
          <Callout tone="good">{done}</Callout>
        </div>
      )}

      {/* ── EXP-04-1 검토 큐 ── */}
      <div className={view === "queue" ? "mt-6" : "hidden"}>
        <AnchorSection
          id="EXP-04-1"
          title="AI 채점 결과 검토 큐"
          lead="서술형 응답에 AI가 매긴 1차 값입니다. 확신도를 함께 적어 어떤 것부터 봐야 하는지 드러냅니다."
        >
          <div className="mb-4 flex flex-wrap gap-2">
            {(
              [
                { id: "wait", label: "확정 대기", n: waiting.length },
                { id: "routed", label: `저신뢰 (${ROUTE_CUT} 미만)`, n: routed.length },
                { id: "done", label: "확정됨", n: finished.length },
                { id: "all", label: "전체", n: scores.length },
              ] as const
            ).map((f) => {
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
                    {f.n}
                  </span>
                </button>
              );
            })}
          </div>

          <TableCard
            title={`응답 ${rows.length}건`}
            caption="목록에서는 이름 대신 응시번호로 표시합니다."
          >
            <table className={a.table}>
              <thead>
                <tr>
                  <th className={a.th}>응시번호</th>
                  <th className={a.th}>과목</th>
                  <th className={a.th}>발문</th>
                  <th className={a.th}>AI 1차</th>
                  <th className={a.th}>확신도</th>
                  <th className={a.th}>사람 확정</th>
                  <th className={a.th}>담당</th>
                  <th className={a.th}>할 일</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => {
                  const low = isRouted(t);
                  const changed = t.human && t.human.level !== t.aiLevel;
                  return (
                    <tr key={t.id}>
                      <td className={a.tdStrong}>
                        {t.seat}
                        <span className="mt-0.5 block adm-t-sm font-bold text-exam-muted">
                          {t.grade}
                        </span>
                      </td>
                      <td className={a.tdTight}>{t.subject}</td>
                      <td className={`${a.td} max-w-[20rem]`}>{t.stem}</td>
                      <td className={a.td}>
                        <Badge label={rubric[t.aiLevel].label} className={rubric[t.aiLevel].tone} />
                      </td>
                      <td className={a.td}>
                        <span
                          className={`adm-t-md font-black tabular-nums ${
                            low ? "text-rose-700" : "text-exam-text"
                          }`}
                        >
                          {t.confidence.toFixed(2)}
                        </span>
                        <span className="mt-0.5 block adm-t-sm font-bold text-exam-muted">
                          {low ? "낮음 · 사람 배정" : "높음"}
                        </span>
                      </td>
                      <td className={a.td}>
                        {t.human ? (
                          <>
                            <Badge
                              label={rubric[t.human.level].label}
                              className={rubric[t.human.level].tone}
                            />
                            {changed && (
                              <span className="mt-0.5 block adm-t-sm font-bold text-brand-700">
                                AI와 다름
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-exam-muted">아직</span>
                        )}
                      </td>
                      <td className={a.tdTight}>{t.assignee ?? "미배정"}</td>
                      <td className={a.td}>
                        {/* 큐와 루브릭이 다른 구역이 되었으므로, 고르는 순간 그
                            구역으로 함께 옮겨 준다. 안 그러면 눌러도 아무 일이
                            일어나지 않는 것처럼 보인다. */}
                        <button
                          type="button"
                          onClick={() => {
                            setOpenId(t.id);
                            setView("rubric");
                          }}
                          className={a.btnRowGhost}
                        >
                          {t.human ? "다시 보기" : "채점하기"}
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

      {/* ── EXP-04-3 루브릭 채점 ── */}
      <div className={view === "rubric" ? "mt-6" : "hidden"}>
        <AnchorSection
          id="EXP-04-3"
          title="루브릭 채점"
          lead="완전정답·부분정답·오답 세 단으로 매깁니다. 기준 문장을 화면에 함께 두어, 사람마다 다른 잣대를 쓰지 않게 합니다."
        >
          {open ? (
            <RubricPanel
              task={open}
              may={may}
              staffName={staffName}
              onDone={(msg) => {
                setDone(msg);
                setOpenId(null);
              }}
            />
          ) : (
            <div className="border-l-4 border-exam-line pl-4">
              <p className="adm-t-md font-bold text-exam-text">채점할 응답을 고르세요</p>
              <p className={`${a.bodyText} mt-1`}>
                「검토 큐」에서 「채점하기」를 누르면 아이가 쓴 답과 루브릭 기준이 이 자리에
                펼쳐집니다.
              </p>
              <button
                type="button"
                onClick={() => setView("queue")}
                className={`${a.btnGhost} mt-3`}
              >
                검토 큐로 가기
              </button>
            </div>
          )}
        </AnchorSection>
      </div>

      {/* ── EXP-04-2 저신뢰 자동 라우팅 ── */}
      <div className={view === "routed" ? "mt-6" : "hidden"}>
        <AnchorSection
          id="EXP-04-2"
          title="저신뢰 자동 라우팅"
          lead={`AI가 스스로 매긴 확신도가 ${ROUTE_CUT} 미만이면 자동으로 사람에게 넘깁니다.`}
        >
          <Callout tone="warn" title="초등 저학년 서술형은 특히 위험합니다">
            3학년 서술은 문법이 아직 완성되지 않은 것이 보통입니다. 맞춤법이 흐트러졌다는 이유로
            내용까지 낮게 매겨지면, 아이는 <b>쓸 줄 몰라서가 아니라 아직 쓰는 법을 배우는 중이라</b>{" "}
            낮은 점수를 받게 됩니다. 이 구간을 기계에 맡기지 않는 까닭입니다.
          </Callout>

          <div className="mt-5">
            <TableCard
              title={`자동 배정 대상 ${routed.length}건`}
              caption={`규칙: confidence < ${ROUTE_CUT}. 배정만 자동이고 채점은 사람이 합니다.`}
              action={
                may && routed.some((t) => !t.assignee) ? (
                  <button
                    type="button"
                    onClick={() => {
                      const n = routeLowConfidence(staffName, staffName);
                      setDone(`저신뢰 ${n}건을 ${staffName} 님에게 배정했습니다.`);
                    }}
                    className={a.btnRow}
                  >
                    미배정분 내게 배정
                  </button>
                ) : undefined
              }
            >
              <table className={a.table}>
                <thead>
                  <tr>
                    <th className={a.th}>응답</th>
                    <th className={a.th}>학년</th>
                    <th className={a.th}>확신도</th>
                    <th className={a.th}>AI가 흔들린 까닭</th>
                    <th className={a.th}>담당</th>
                  </tr>
                </thead>
                <tbody>
                  {routed.map((t) => (
                    <tr key={t.id}>
                      <td className={a.tdStrong}>
                        {t.seat} · {t.subject}
                      </td>
                      <td className={a.tdTight}>{t.grade}</td>
                      <td className={a.td}>
                        <span className="adm-t-md font-black tabular-nums text-rose-700">
                          {t.confidence.toFixed(2)}
                        </span>
                      </td>
                      <td className={a.td}>{t.aiWhy}</td>
                      <td className={a.td}>
                        {t.assignee ? (
                          t.assignee
                        ) : may ? (
                          <button
                            type="button"
                            onClick={() => {
                              assignScore(t.id, staffName, staffName);
                              setDone(`${t.seat} ${t.subject} 응답을 ${staffName} 님에게 배정했습니다.`);
                            }}
                            className={a.btnRowGhost}
                          >
                            내가 맡기
                          </button>
                        ) : (
                          "미배정"
                        )}
                      </td>
                    </tr>
                  ))}
                  {routed.length === 0 && (
                    <tr>
                      <td className={a.td} colSpan={5}>
                        지금 자동 배정 대상이 없습니다. 확신도가 낮은 응답이 들어오면 여기에 쌓입니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TableCard>
          </div>
        </AnchorSection>
      </div>

      {/* ── EXP-04-4 이중 채점·ICC ── */}
      <div className={view === "icc" ? "mt-6" : "hidden"}>
        <IccPanel may={may} staffName={staffName} onDone={setDone} />
      </div>
    </>
  );
}

/* ───────────────────────── 루브릭 ───────────────────────── */

function RubricPanel({
  task,
  may,
  staffName,
  onDone,
}: {
  task: ScoreTask;
  may: boolean;
  staffName: string;
  onDone: (msg: string) => void;
}) {
  const [level, setLevel] = useState<RubricLevel>(task.human?.level ?? task.aiLevel);
  const [note, setNote] = useState(task.human?.note ?? "");
  const changed = level !== task.aiLevel;
  const short = note.trim().length < 10;

  return (
    <section className={`${a.panel} p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="adm-t-sm font-bold text-exam-muted">
            {task.id} · 응시번호 {task.seat} · {task.grade} · {task.subject}
          </p>
          <h3 className={`${a.cardTitle} mt-1`}>{task.stem}</h3>
        </div>
        <Badge label={`AI ${rubric[task.aiLevel].label}`} className={rubric[task.aiLevel].tone} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-exam-line p-5">
          <h4 className={a.label}>아이가 쓴 답</h4>
          <p className="mt-2.5 adm-t-md leading-relaxed whitespace-pre-wrap text-exam-text">
            {task.answer}
          </p>
          <p className={`${a.hint} mt-3`}>
            맞춤법을 고치지 않고 그대로 싣습니다. 고쳐 놓으면 채점자가 무엇을 보고 판단했는지
            나중에 확인할 수 없습니다.
          </p>

          <div className="mt-5 border-t border-exam-line pt-4">
            <h4 className={a.label}>AI가 이렇게 본 까닭</h4>
            <p className={`${a.bodyText} mt-1.5`}>{task.aiWhy}</p>
            <p className="mt-1.5 adm-t-sm font-bold text-exam-muted">
              확신도 {task.confidence.toFixed(2)}
              {isRouted(task) && " · 기준 미만이라 사람에게 배정된 건입니다"}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-exam-line p-5">
          <h4 className={a.label}>루브릭 — 어느 단인가</h4>
          <div className="mt-3 space-y-2">
            {(Object.keys(rubric) as RubricLevel[]).map((k) => {
              const on = level === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setLevel(k)}
                  aria-pressed={on}
                  className={`w-full rounded-md border p-4 text-left transition-colors ${
                    on
                      ? "border-brand-900 bg-brand-50"
                      : "border-exam-line bg-white hover:bg-exam-raised"
                  }`}
                >
                  <span className="flex items-baseline gap-2">
                    <span className={`adm-t-md font-black ${rubric[k].tone}`}>
                      {rubric[k].label}
                    </span>
                    <span className="adm-t-sm font-bold text-exam-muted tabular-nums">
                      {rubric[k].point}점
                    </span>
                    {k === task.aiLevel && (
                      <span className="ml-auto adm-t-sm font-bold text-brand-700">AI 제안</span>
                    )}
                  </span>
                  <span className="mt-1 block adm-t-sm text-exam-muted">{rubric[k].guide}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-5">
            <label htmlFor="score-note" className={a.label}>
              채점 근거 {changed && <span className="text-brand-700">(AI와 다르게 매겼습니다)</span>}
            </label>
            <textarea
              id="score-note"
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={`${a.input} mt-2 resize-none`}
              placeholder="답의 어느 부분을 보고 그렇게 매겼는지 적어 주세요."
            />
            <p className={`${a.hint} mt-1.5`}>
              AI 값과 다르게 매긴 건은 문항 개선 자료로 모입니다. 무엇을 보고 달리 봤는지가 그 자료의
              본체입니다.
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={!may || short}
              onClick={() => {
                confirmScore(task.id, level, staffName, note.trim());
                onDone(
                  `${task.seat} ${task.subject} 응답을 ${rubric[level].label}${ro(rubric[level].label)} 확정했습니다.`,
                );
              }}
              className={may && !short ? a.btnPrimary : a.btnDisabled}
            >
              이 값으로 확정
            </button>
          </div>
          {!may && (
            <p className="mt-3 adm-t-sm font-bold text-rose-700">
              지금 역할에는 채점 확정 권한이 없습니다.
            </p>
          )}
          {may && short && (
            <p className="mt-3 adm-t-sm font-bold text-rose-700">
              채점 근거를 10자 이상 적어야 확정할 수 있습니다.
            </p>
          )}

          {task.human && (
            <div className="mt-5 border-t border-exam-line pt-4">
              <p className={a.label}>이미 확정된 값</p>
              <p className={`${a.bodyText} mt-1.5`}>
                {rubric[task.human.level].label} · {task.human.by} · {task.human.at}
              </p>
              <p className={`${a.bodyText} mt-1`}>{task.human.note}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── 이중 채점·ICC ───────────────────────── */

function IccPanel({
  may,
  staffName,
  onDone,
}: {
  may: boolean;
  staffName: string;
  onDone: (msg: string) => void;
}) {
  const { scores } = useExpert();
  const sample = scores.filter((t) => t.double);

  /** AI-사람 쌍 — 사람이 확정한 것만 견준다 */
  const aiPairs = scores
    .filter((t) => t.human)
    .map((t) => [rubric[t.aiLevel].point, rubric[t.human!.level].point] as [number, number]);

  /** 사람-사람 쌍 — 이중 채점 표본 */
  const humanPairs = sample
    .filter((t) => t.human && t.second)
    .map((t) => [rubric[t.human!.level].point, rubric[t.second!.level].point] as [number, number]);

  const aiIcc = icc(aiPairs);
  const humanIcc = icc(humanPairs);
  const exact = aiPairs.length
    ? Math.round((aiPairs.filter(([x, y]) => x === y).length / aiPairs.length) * 100)
    : null;

  return (
    <AnchorSection
      id="EXP-04-4"
      title="이중 채점 · ICC 모니터"
      lead="표본 응답을 두 사람이 서로 모르게 매깁니다. AI-사람, 사람-사람 일치도를 함께 봅니다."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <IccStat
          label="AI ↔ 사람 (ICC)"
          value={aiIcc}
          n={aiPairs.length}
          note={`목표 ${ICC_TARGET.toFixed(2)} 이상`}
        />
        <IccStat
          label="사람 ↔ 사람 (ICC)"
          value={humanIcc}
          n={humanPairs.length}
          note="채점자 사이의 잣대 차이"
        />
        <div className="rounded-lg border border-exam-line p-4">
          <p className={a.label}>AI ↔ 사람 완전일치</p>
          <p className={`${a.metric} mt-1.5`}>{exact === null ? "—" : `${exact}%`}</p>
          <p className={`${a.hint} mt-1`}>같은 단으로 매긴 비율</p>
        </div>
      </div>

      <div className="mt-4">
        <Foldable title="ICC 하나만 보지 않는 까닭">
          <p className={a.bodyText}>
            완전일치율만 보면 「셋 다 완전정답」처럼 쏠린 표본에서 90%가 넘게 나옵니다. 정작 갈리는
            것은 애매한 응답인데, 그 구간이 표본에서 몇 건 안 되기 때문입니다. ICC는 값이 흩어진
            정도를 함께 보므로 이 쏠림에 덜 속습니다. 다만 <b>표본이 적으면 크게 흔들리므로</b> 위에
            표본 수를 함께 적어 두었습니다 — 건수를 보지 않고 숫자만 읽으면 안 됩니다.
          </p>
        </Foldable>
      </div>

      <div className="mt-5">
        <TableCard
          title={`이중 채점 표본 ${sample.length}건`}
          caption="두 번째 채점자는 앞사람 값을 보지 않고 매깁니다. 아래 표에서 앞사람 값은 두 번째 값을 넣은 뒤에 드러납니다."
        >
          <table className={a.table}>
            <thead>
              <tr>
                <th className={a.th}>응답</th>
                <th className={a.th}>AI</th>
                <th className={a.th}>첫 번째 채점</th>
                <th className={a.th}>두 번째 채점</th>
                <th className={a.th}>갈림</th>
              </tr>
            </thead>
            <tbody>
              {sample.map((t) => {
                const first = t.human;
                const split = first && t.second && first.level !== t.second.level;
                return (
                  <tr key={t.id}>
                    <td className={a.tdStrong}>
                      {t.seat} · {t.subject}
                      <span className="mt-0.5 block adm-t-sm font-bold text-exam-muted">
                        {t.grade}
                      </span>
                    </td>
                    <td className={a.td}>
                      <Badge label={rubric[t.aiLevel].short} className={rubric[t.aiLevel].tone} />
                    </td>
                    <td className={a.td}>
                      {first ? (
                        <>
                          <Badge
                            label={rubric[first.level].short}
                            className={rubric[first.level].tone}
                          />
                          <span className="mt-0.5 block adm-t-sm text-exam-muted">{first.by}</span>
                        </>
                      ) : (
                        <span className="text-exam-muted">아직</span>
                      )}
                    </td>
                    <td className={a.td}>
                      {t.second ? (
                        <>
                          <Badge
                            label={rubric[t.second.level].short}
                            className={rubric[t.second.level].tone}
                          />
                          <span className="mt-0.5 block adm-t-sm text-exam-muted">{t.second.by}</span>
                        </>
                      ) : may ? (
                        <div className="flex flex-wrap gap-1.5">
                          {(Object.keys(rubric) as RubricLevel[]).map((k) => (
                            <button
                              key={k}
                              type="button"
                              onClick={() => {
                                secondScore(t.id, k, staffName);
                                onDone(`${t.seat} ${t.subject} 이중 채점을 넣었습니다.`);
                              }}
                              className={a.btnRowGhost}
                            >
                              {rubric[k].short}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="text-exam-muted">아직</span>
                      )}
                    </td>
                    <td className={a.td}>
                      {split ? (
                        <span className="font-bold text-rose-700">갈림 · 조정 필요</span>
                      ) : first && t.second ? (
                        <span className="text-emerald-700">같음</span>
                      ) : (
                        <span className="text-exam-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableCard>
      </div>
    </AnchorSection>
  );
}

function IccStat({
  label,
  value,
  n,
  note,
}: {
  label: string;
  value: number | null;
  n: number;
  note: string;
}) {
  const short = n < 5;
  const met = value !== null && value >= ICC_TARGET;
  return (
    <div className="rounded-lg border border-exam-line p-4">
      <p className={a.label}>{label}</p>
      <p className={`${a.metric} mt-1.5 ${value === null ? "" : met ? "text-emerald-700" : "text-amber-700"}`}>
        {value === null ? "—" : value.toFixed(2)}
      </p>
      <p className={`${a.hint} mt-1`}>
        표본 {n}건 · {note}
      </p>
      {short && (
        <p className="mt-1 adm-t-sm font-bold text-amber-700">
          표본이 적어 값이 크게 흔들립니다
        </p>
      )}
    </div>
  );
}
