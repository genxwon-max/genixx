"use client";

import Link from "next/link";
import { useMemo } from "react";
import { maskName } from "@/lib/adminUsers";
import { interviewTone, toneColor } from "@/lib/admin2";
import { reasonOf, topReason } from "@/lib/expertStore";
import { interviewers, relations } from "@/lib/interviews";
import {
  REQUEST_GOAL_DAYS,
  deskLabel,
  interviewModes,
  isOverdue,
  scheduleText,
  seatOf,
  waitedOf,
  type Interview,
} from "@/lib/interviewStore";
import DataTable, { type Col, type Filter } from "@/components/admin2/DataTable";
import { SeedNote, Status, Tag } from "@/components/admin2/ui";

/**
 * 면담 신청 목록의 표.
 *
 * 상태 탭은 화면 머리(InterviewsView의 PageHead)가 들고, 여기는 고른 묶음을 표 한 장으로
 * 그린다. 탭을 여기 두지 않은 까닭은 이 콘솔의 목록 화면이 모두 머리에 탭을 세우기
 * 때문이다 — 한 화면만 표 위에 탭이 서면 기둥에서 화면을 옮길 때 탭 줄의 높이가 달라진다.
 *
 * ⚠ 상태 거르개를 표에 두지 않는다. 탭이 이미 그 조건이고, 같은 조건을 두 군데서 걸면
 *   서로 부딪친다.
 *
 * ⚠ 개인정보 — Col.value(검색에 쓰는 글자)에는 온전한 이름·전화·메일을 넣고
 *   Col.cell(화면에 보이는 것)에는 가린 이름만 세운다. 전화 뒷자리로 사람을 찾는 일이
 *   실제로 있어서 찾히기는 해야 하지만, 연락처 칸은 만들지 않는다 — 스무 줄에 연락처가
 *   상시로 떠 있게 되고 이 화면은 하루에도 여러 번 여는 자리다. 걸 때는 상세를 연다.
 *
 * ⚠ 학생 실명을 어느 칸에도 세우지 않는다. 응시번호와 학년으로만 부른다 — 목록은
 *   어깨너머로 가장 잘 보이는 화면이다.
 *
 * ⚠ 그 응시번호가 **없는 줄이 있다.** 검사를 치르기 전에 보내온 신청이다. 그때도 실명을
 *   세우지 않는다 — 번호를 안 세우기로 한 까닭이 그대로라, 하필 그 줄만 이름이 서면
 *   가려 둔 뜻이 사라진다. 응시번호 칸에는 「—」를 세우고, 그 줄을 부를 일이 있으면
 *   면담 번호로 부른다(lib/interviewStore.ts의 seatOf).
 *
 * ── 출처 칸을 걷어 냈다 ──
 * 「신청 / 선발」을 꼬리표로 세우던 칸이 있었다. 같은 것을 이미 두 칸이 적고 있다 —
 * 신청자 칸은 선발 건에서 비고(답장할 사람이 없다), 사유 칸은 신청 건에 「신청」이 선다.
 * 세 칸이 같은 말을 하면 표가 넓어지기만 한다. 조회 조건의 출처 거르개는 남겨 두었다 —
 * 거른 결과가 신청자 칸으로 그대로 읽힌다.
 */

/** 화면 머리가 고르고 표가 받는다 — 빈 목록 문구를 여기서 고르려고 종류를 함께 든다 */
export type ListTab = "all" | "applied" | "queued" | "scheduled" | "overdue" | "done";

const EMPTY: Record<ListTab, string> = {
  all: "조건에 맞는 면담이 없습니다.",
  applied: "들어온 신청을 모두 처리했습니다.",
  queued: "날짜를 잡아야 할 면담이 없습니다.",
  scheduled: "앞으로 잡힌 면담이 없습니다.",
  overdue: "날짜가 지났는데 그대로 남은 면담이 없습니다.",
  done: "아직 마친 면담이 없습니다.",
};

const dash = <span className="text-(--a2-ink-4)">—</span>;

export default function InterviewList({
  tab,
  rows,
  now,
}: {
  /** 지금 고른 탭 — 빈 목록 문구와 표를 다시 세우는 열쇠로 쓴다 */
  tab: ListTab;
  /** 그 탭으로 이미 거른 줄 */
  rows: Interview[];
  now: string;
}) {
  const cols: Col<Interview>[] = useMemo(
    () => [
      {
        key: "id",
        head: "번호",
        width: "8.5rem",
        nowrap: true,
        value: (r) => r.id,
        cell: (r) => (
          <Link
            href={`/admin2/interviews/${r.id}`}
            className="a2-mono font-semibold text-(--a2-ink) hover:text-(--a2-accent) hover:underline"
          >
            {r.id}
          </Link>
        ),
      },
      {
        /* 응시번호는 **없을 수 있다** — 검사를 치르기 전에 들어온 신청이다.
           그때는 「—」를 세운다. 면담 번호로 메우지 않는다: 그 값은 바로 왼쪽 칸에 이미
           서 있어서, 같은 값이 두 칸에 적히면 서로 다른 값처럼 읽힌다. 학년은 번호가
           없어도 그대로 둔다 — 그 줄에 남은 유일한 사람 정보다 */
        key: "seat",
        head: "응시번호",
        width: "6.5rem",
        nowrap: true,
        value: (r) => [r.seat, r.grade].filter(Boolean).join(" "),
        /* 번호 없는 줄을 맨 뒤로 — 일정 칸의 「미정」과 같은 수를 쓴다 */
        sort: (r) => r.seat ?? "9999",
        cell: (r) => (
          <>
            {r.seat ? (
              <span className="a2-mono font-semibold text-(--a2-ink)">{r.seat}</span>
            ) : (
              dash
            )}
            <span className="mt-0.5 block a2-t-xs text-(--a2-ink-3)">{r.grade}</span>
          </>
        ),
      },
      {
        key: "who",
        head: "신청자",
        width: "10.5rem",
        clip: true,
        value: (r) =>
          r.request
            ? `${r.request.applicant.name} ${r.request.applicant.phone} ${r.request.applicant.mail}`
            : "",
        cell: (r) =>
          r.request ? (
            <span title={relations[r.request.applicant.relation]}>
              {maskName(r.request.applicant.name)}
              <span className="mt-0.5 block a2-t-xs text-(--a2-ink-3)">
                {relations[r.request.applicant.relation]}
              </span>
            </span>
          ) : (
            dash
          ),
      },
      {
        key: "why",
        head: "사유",
        width: "11rem",
        clip: true,
        value: (r) => r.reasons.map((x) => reasonOf(x).label).join(" "),
        sort: (r) => topReason(r.reasons).rank,
        cell: (r) => {
          const top = topReason(r.reasons);
          return (
            <span title={top.why}>
              {top.rank <= 2 ? <Tag accent>{top.label}</Tag> : <Tag>{top.label}</Tag>}
              {r.reasons.length > 1 && (
                <span className="mt-0.5 block a2-t-xs text-(--a2-ink-3)">
                  +{r.reasons.length - 1}건 더 걸림
                </span>
              )}
            </span>
          );
        },
      },
      {
        key: "state",
        head: "상태",
        width: "7rem",
        nowrap: true,
        value: (r) => deskLabel[r.state],
        cell: (r) => <Status tone={interviewTone[r.state]}>{deskLabel[r.state]}</Status>,
      },
      {
        key: "when",
        head: "일정",
        width: "13rem",
        nowrap: true,
        value: (r) => scheduleText(r),
        /* 미정을 맨 뒤로 보낸다 — 날짜 문자열보다 큰 값이면 무엇이든 된다 */
        sort: (r) => (r.date && r.start ? `${r.date} ${r.start}` : "9999"),
        cell: (r) =>
          r.date && r.start ? (
            <>
              <span className="a2-mono">{scheduleText(r)}</span>
              {isOverdue(r, now) && (
                <span className="ml-1.5">
                  <Status tone="danger">지남</Status>
                </span>
              )}
            </>
          ) : r.rawAt ? (
            /* 옛 콘솔이 자유 문자열로 적어 둔 것. 지우지 않고 그대로 보인다 */
            <span className="text-(--a2-ink-4)" title="전문가 콘솔에 적힌 원문입니다">
              미정 · 「{r.rawAt}」
            </span>
          ) : (
            <span className="text-(--a2-ink-4)">미정</span>
          ),
      },
      {
        key: "who2",
        head: "면담원",
        width: "6rem",
        nowrap: true,
        value: (r) => r.interviewerName ?? "",
        cell: (r) => r.interviewerName ?? <span className="text-(--a2-ink-4)">미정</span>,
      },
      {
        key: "mode",
        head: "방식",
        width: "4.5rem",
        nowrap: true,
        hide: "lg",
        value: (r) => (r.mode ? interviewModes[r.mode] : ""),
        cell: (r) => (r.mode ? <Tag>{interviewModes[r.mode]}</Tag> : dash),
      },
      {
        /* 신청 건만 센다. 선발은 우리가 고른 것이라 「며칠 묵었다」가 뜻이 없다 */
        key: "wait",
        head: "대기",
        width: "5.5rem",
        num: true,
        nowrap: true,
        hide: "md",
        value: (r) => waitedOf(r, now) ?? "",
        sort: (r) => waitedOf(r, now) ?? -1,
        cell: (r) => {
          const d = waitedOf(r, now);
          if (d == null) return dash;
          const late = r.state === "applied" && d > REQUEST_GOAL_DAYS;
          /* 색만으로 구분하지 않는다 — 넘긴 것은 글자로도 「초과」라고 적는다 */
          return late ? (
            <span style={{ color: toneColor.warn }} className="font-semibold">
              {d}일 초과
            </span>
          ) : (
            <span>{d}일</span>
          );
        },
      },
      {
        key: "act",
        head: "",
        width: "6.5rem",
        nowrap: true,
        cell: (r) => {
          const jab = r.state === "applied" || r.state === "queued" || isOverdue(r, now);
          return (
            <Link
              href={`/admin2/interviews/${r.id}`}
              className="a2-btn a2-btn-sm"
              aria-label={`${seatOf(r)} ${jab ? "일정 잡기" : "상세보기"}`}
            >
              {jab ? "일정 잡기" : "상세보기"}
            </Link>
          );
        },
      },
    ],
    [now],
  );

  const filters: Filter<Interview>[] = useMemo(
    () => [
      {
        id: "src",
        label: "출처",
        options: [
          { value: "request", label: "신청" },
          { value: "pick", label: "선발" },
        ],
        match: (r, v) => r.source === v,
      },
      {
        id: "who",
        label: "면담원",
        options: [
          { value: "none", label: "미정" },
          ...interviewers().map((s) => ({ value: s.id, label: s.name })),
        ],
        match: (r, v) => (v === "none" ? !r.interviewerId : r.interviewerId === v),
      },
      {
        id: "mode",
        label: "방식",
        options: [
          ...(Object.keys(interviewModes) as (keyof typeof interviewModes)[]).map((m) => ({
            value: m,
            label: interviewModes[m],
          })),
          { value: "none", label: "미정" },
        ],
        match: (r, v) => (v === "none" ? !r.mode : r.mode === v),
      },
    ],
    [],
  );

  return (
    <>
      <DataTable
        key={tab}
        rows={rows}
        cols={cols}
        getKey={(r) => r.id}
        filters={filters}
        showCount={false}
        searchHint="응시번호 · 신청자 · 면담원 검색"
        empty={EMPTY[tab]}
      />

      <SeedNote>
        면담 신청과 잡은 일정은 이 브라우저에만 저장됩니다(lib/interviews.ts ·
        lib/interviewStore.ts). 면담 케이스와 선발 사유는 전문가 콘솔의 저장소를 그대로
        씁니다(lib/expertStore.ts). 사람 데이터는 전부 화면 설계를 위한 예시입니다.
      </SeedNote>
    </>
  );
}
