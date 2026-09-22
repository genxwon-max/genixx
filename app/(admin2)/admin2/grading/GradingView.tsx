"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { rounds } from "@/lib/admin";
import { n } from "@/lib/admin2";
import { useAdminPrefs } from "@/lib/adminStore";
import {
  ICC_TARGET,
  ROUTE_CUT,
  icc,
  isRouted,
  routeLowConfidence,
  rubric,
  scoreDone,
  useExpert,
  type RubricLevel,
  type ScoreTask,
} from "@/lib/expertStore";
import DataTable, { type Col, type Filter } from "@/components/admin2/DataTable";
import { Body, FormRow, PageHead, Panel, Tab } from "@/components/admin2/ui";

/**
 * EXP-04 평가 채점 — AI가 매긴 것을 사람이 확정한다.
 *
 * 이 화면의 단위는 「학생」이 아니라 **응답 하나**다. 한 아이의 국어는 확신도 0.92인데
 * 수학은 0.51일 수 있고, 사람이 봐야 하는 것은 뒤의 것뿐이다. 학생으로 묶으면 볼 필요
 * 없는 응답까지 딸려 와서, 사람이 하루에 처리하는 건수가 그만큼 준다.
 *
 * ── AI 값은 지우지 않는다 ──
 * 사람이 바꾼 자리가 어디인지 남아야 다음 회차에 무엇을 고칠지 알 수 있다. 그래서
 * 확정해도 AI 판정은 그대로 두고 사람 값을 옆에 붙인다. 두 값이 얼마나 어긋나는지가
 * 곧 이 화면 머리의 일치도(ICC)다.
 *
 * ── AI 결과 검토와 루브릭 채점을 한 화면에 둔다 ──
 * 둘은 같은 일의 앞뒤다. 「AI가 부분정답이라 했는데 맞나」를 보는 순간이 곧 루브릭을
 * 대는 순간이라, 화면을 가르면 같은 응답을 두 자리에서 두 번 연다.
 *
 * ── 회원 채점(EXP-04-1)과 무엇이 다른가 ──
 * 같은 자료를 사람으로 묶어 보는 화면이 따로 있다. 저쪽은 답안지 한 장을 펴 놓고
 * 배점을 손보고 해설을 붙이는 자리이고, 여기는 「지금 봐야 하는 응답」을 고르는
 * 자리다. 점수를 **처음 정하는 곳은 여기 하나뿐**이다 — 두 화면에서 다 확정할 수
 * 있으면 어느 쪽 값이 맞는지 알 수 없게 된다.
 */

const dash = <span className="text-(--a2-ink-4)">—</span>;

/** 표에서는 「3회차」로 줄여 적는다 — 「2026 파일럿 3회차」를 줄마다 세우면 칸이 안 남는다 */
const shortRound = (id: string) => `${id.split("-")[1] ?? id}회차`;
const roundLabel = (id: string) => rounds.find((r) => r.id === id)?.label ?? id;

/** 루브릭 값 한 칸 — 색과 글자를 함께 적는다(색만으로 가르지 않는다) */
function Level({ level, faint = false }: { level: RubricLevel; faint?: boolean }) {
  const tone =
    level === "full" ? "var(--a2-ok)" : level === "partial" ? "var(--a2-warn)" : "var(--a2-danger)";
  return (
    <span
      className="a2-t-xs font-semibold"
      style={{ color: faint ? "var(--a2-ink-3)" : tone }}
    >
      {rubric[level].label}
    </span>
  );
}

type TabId = "wait" | "routed" | "double" | "done" | "all";

export default function GradingView() {
  const { scores } = useExpert();
  const prefs = useAdminPrefs();
  const by = prefs.staffName || "운영자";
  const [tab, setTab] = useState<TabId>("wait");

  /* 2차가 필요한 건 — 표본으로 뽑혔고 1차는 끝났는데 두 번째 사람이 아직 안 매긴 것 */
  const needSecond = (t: ScoreTask) => t.double && !!t.human && !t.second;

  const tabs = useMemo(
    () => [
      {
        id: "wait" as TabId,
        label: "검토 대기",
        rows: scores.filter((t) => !scoreDone(t)),
        empty: "확정할 응답이 없습니다.",
      },
      {
        id: "routed" as TabId,
        label: "저신뢰",
        rows: scores.filter((t) => isRouted(t) && !scoreDone(t)),
        empty: `확신도 ${ROUTE_CUT} 미만인 응답이 없습니다.`,
      },
      {
        id: "double" as TabId,
        label: "이중 채점",
        rows: scores.filter(needSecond),
        empty: "2차 채점을 기다리는 응답이 없습니다.",
      },
      {
        id: "done" as TabId,
        label: "확정",
        rows: scores.filter(scoreDone),
        empty: "아직 확정한 응답이 없습니다.",
      },
      { id: "all" as TabId, label: "전체", rows: scores, empty: "채점할 응답이 없습니다." },
    ],
    [scores],
  );

  const current = tabs.find((t) => t.id === tab) ?? tabs[0];

  /* 일치도는 **두 사람이 따로 매긴 것**에서만 낸다. AI와 사람을 견주면 AI가 전수라
     표본이 늘 크고, 정작 알고 싶은 「어려운 응답에서 사람끼리 갈리는가」가 안 나온다 */
  const pairs = useMemo(
    () =>
      scores
        .filter((t) => t.human && t.second)
        .map((t) => [rubric[t.human!.level].point, rubric[t.second!.level].point] as [number, number]),
    [scores],
  );
  const agree = icc(pairs);

  /* 사람에게 넘겨야 하는데 아직 아무도 안 받은 것 */
  const unassigned = scores.filter((t) => isRouted(t) && !scoreDone(t) && !t.assignee);

  const cols = useMemo<Col<ScoreTask>[]>(
    () => [
      {
        key: "seat",
        head: "응시번호",
        width: "7.5rem",
        nowrap: true,
        value: (t) => `${t.seat} ${t.grade}`,
        cell: (t) => (
          <span className="inline-flex items-center gap-1.5">
            {/* 목록에 이름을 적지 않는다 — 채점하는 사람이 누구 답인지 알면 안 된다 */}
            <Link
              href={`/admin2/grading/${t.id}`}
              className="a2-mono font-semibold text-(--a2-ink) hover:text-(--a2-accent) hover:underline"
            >
              {t.seat}
            </Link>
            <span className="a2-t-xs text-(--a2-ink-4)">{t.grade}</span>
          </span>
        ),
      },
      {
        key: "round",
        head: "회차",
        width: "5.5rem",
        nowrap: true,
        value: (t) => roundLabel(t.round),
        sort: (t) => t.round,
        cell: (t) => <span className="a2-t-sm text-(--a2-ink-2)">{shortRound(t.round)}</span>,
      },
      {
        key: "subject",
        head: "과목",
        width: "5rem",
        nowrap: true,
        value: (t) => t.subject,
        cell: (t) => <span className="a2-t-sm text-(--a2-ink-2)">{t.subject}</span>,
      },
      {
        key: "stem",
        head: "발문",
        width: "100%",
        clip: true,
        value: (t) => t.stem,
        cell: (t) => <span className="a2-t-sm text-(--a2-ink-2)">{t.stem}</span>,
      },
      /* 「AI 판정 · 확신도」 칸은 걷었다(2026-09-21 협의). 목록에서 AI 값과 확신도가 먼저
         보이면 채점자가 그 값을 기준 삼아 확인만 하고 넘어가게 된다 — 목록은 사람이 매긴 값과
         누가 매겼는지만 세운다. AI 값은 채점 화면(ScoreBench)에서 근거와 함께 본다 */
      {
        key: "human",
        head: "사람 확정",
        width: "8.5rem",
        nowrap: true,
        value: (t) => (t.human ? rubric[t.human.level].label : "대기"),
        cell: (t) =>
          t.human ? (
            <Level level={t.human.level} />
          ) : (
            <span className="a2-t-xs font-semibold" style={{ color: "var(--a2-warn)" }}>
              대기
            </span>
          ),
      },
      {
        key: "who",
        head: "채점자",
        width: "7rem",
        nowrap: true,
        value: (t) => t.human?.by ?? t.assignee ?? "",
        cell: (t) => (
          <span className="inline-flex flex-col">
            <span className="a2-t-sm text-(--a2-ink-2)">{t.human?.by ?? t.assignee ?? dash}</span>
            {/* 1차도 안 끝난 건에 「이중 대기」를 적으면 2차가 밀린 것처럼 읽힌다 —
                뽑혔다는 사실과 밀렸다는 사실을 가른다 */}
            {t.double && (
              <span className="a2-t-xs text-(--a2-ink-4)">
                {t.second ? "이중 완료" : t.human ? "2차 대기" : "이중 표본"}
              </span>
            )}
          </span>
        ),
      },
      {
        key: "act",
        head: "관리",
        width: "5.5rem",
        nowrap: true,
        cell: (t) => (
          <Link
            href={`/admin2/grading/${t.id}`}
            className="a2-btn a2-btn-sm"
            aria-label={`${t.seat} ${t.subject} 채점`}
          >
            {scoreDone(t) ? "보기" : "채점"}
          </Link>
        ),
      },
    ],
    [],
  );

  const filters = useMemo<Filter<ScoreTask>[]>(
    () => [
      {
        /* 거르개는 실제로 줄이 있는 회차만 세운다 — 열지도 않은 4회차를 골라 놓고
           빈 표를 보는 일이 없도록 */
        id: "round",
        label: "회차",
        options: rounds
          .filter((r) => scores.some((t) => t.round === r.id))
          .map((r) => ({ value: r.id, label: r.label })),
        match: (t, x) => t.round === x,
      },
      {
        id: "subject",
        label: "과목",
        options: [...new Set(scores.map((t) => t.subject))].map((v) => ({ value: v, label: v })),
        match: (t, x) => t.subject === x,
      },
    ],
    [scores],
  );

  return (
    <>
      <PageHead
        title="평가 채점"
        tabsLabel="조회 조건"
        tabs={tabs.map((t) => (
          <Tab
            key={t.id}
            label={t.label}
            count={n(t.rows.length)}
            active={tab === t.id}
            onClick={() => setTab(t.id)}
          />
        ))}
      />

      <Body>
        <Panel title="AI 채점" flush>
          <div className="a2-form">
            <FormRow label="사람 사이 일치도">
              {agree == null ? (
                <span className="a2-t-sm text-(--a2-ink-4)">
                  이중 채점이 두 건 넘게 쌓여야 냅니다.
                </span>
              ) : (
                <>
                  <span
                    className="a2-num a2-t-md font-bold"
                    style={{ color: agree >= ICC_TARGET ? "var(--a2-ok)" : "var(--a2-danger)" }}
                  >
                    {agree.toFixed(2)}
                  </span>
                  <span className="a2-t-sm text-(--a2-ink-3)">
                    목표 {ICC_TARGET.toFixed(2)} · 표본 {n(pairs.length)}건
                  </span>
                </>
              )}
              {/* 표본 수를 값 옆에 붙여 둔다 — 적은 표본에서 나온 0.9는 0.9가 아니다 */}
            </FormRow>

            <FormRow label="저신뢰 배정">
              <span className="a2-num a2-t-md font-bold text-(--a2-ink)">{n(unassigned.length)}</span>
              <span className="a2-t-sm text-(--a2-ink-3)">
                건 · 확신도 {ROUTE_CUT} 미만이라 사람이 봐야 합니다
              </span>
              <button
                type="button"
                className="a2-btn a2-btn-sm"
                disabled={unassigned.length === 0}
                onClick={() => routeLowConfidence(by, by)}
              >
                나에게 배정
              </button>
            </FormRow>
          </div>
        </Panel>
      </Body>

      <DataTable
        key={tab}
        rows={current.rows}
        cols={cols}
        filters={filters}
        getKey={(t) => t.id}
        pageSize={25}
        searchHint="응시번호 · 발문"
        empty={current.empty}
        showCount={false}
      />
    </>
  );
}
