"use client";

import Link from "next/link";
import { useMemo } from "react";
import { counselModes, counselTopics, spanLabel, SPANS, type Span } from "@/lib/counselors";
import {
  nameOf,
  roleOf,
  setCounselorShown,
  useCounselFees,
  useCounselorRows,
  type CounselorRow,
} from "@/lib/counselorStore";
import { won } from "@/lib/productStore";
import { WEEK_KO } from "@/lib/calendar";
import DataTable, { type Col, type Filter } from "@/components/admin2/DataTable";
import { Body, PageHead, Panel, Status, Switch } from "@/components/admin2/ui";

/**
 * EXP-06-2 상담사 관리 — 결과 해석 면담을 맡는 사람의 목록.
 *
 * 여태 이 명단은 코드에 박혀 있었다(lib/counselors.ts). 상담사가 요일 하나를 바꾸거나
 * 값이 오를 때마다 배포를 해야 했고, 무엇보다 **운영자가 손댈 수 있는 값이 아니었다.**
 * 회차 공지도 상품 값도 이미 콘솔에서 고치는데 면담만 코드에 있는 것은 앞뒤가 안 맞는다.
 *
 * ── 값은 사람 줄에 있다 ──
 * 길이별 기본 값을 고치는 판을 목록 위에 세웠다가 걷어 냈다. 이 화면이 답하는 것은
 * 「누가 면담을 맡는가」 하나이고, 값은 그 사람의 한 칸이다. 비워 둔 사람은 코드의
 * 기본값을 그대로 받는다(lib/counselors.ts의 counselFee).
 *
 * ── 여기서 지우지 않는다 ──
 * 목록에서 누르는 것은 노출 스위치까지다. 지우는 것은 상세에서만 되고, 거기서도 한 번
 * 묻는다 — 지운 상담사에게 잡혀 있던 면담은 이름을 잃는다.
 */

const dash = <span className="text-(--a2-ink-4)">—</span>;

/** 「월 · 수 · 금 10:00–17:00」 */
const scheduleText = (r: CounselorRow) =>
  r.days.length === 0
    ? "요일 없음"
    : `${r.days.map((d) => WEEK_KO[d]).join(" · ")} ${r.from}–${r.to}`;

export default function CounselorsView() {
  const rows = useCounselorRows();
  /* 따로 값을 매기지 않은 사람의 줄에 적을 기본값 */
  const fees = useCounselFees();

  const cols: Col<CounselorRow>[] = useMemo(
    () => [
      {
        key: "name",
        head: "이름",
        width: "9rem",
        nowrap: true,
        value: (r) => nameOf(r) || r.id,
        /* 줄을 누르면 이 링크가 대신 눌린다(DataTable의 rowLink) — 「수정하기」 단추는 걷었다.
           노출 스위치는 그대로 제 일만 한다: 줄 안의 단추는 줄을 누른 것으로 치지 않는다 */
        cell: (r) => (
          <Link href={`/admin2/counselors/${r.id}`} className="font-semibold text-(--a2-ink)">
            {nameOf(r) || <span className="text-(--a2-ink-4)">이름 없음</span>}
          </Link>
        ),
      },
      {
        key: "role",
        head: "직함",
        width: "100%",
        clip: true,
        value: (r) => roleOf(r),
        cell: (r) => <span className="a2-t-sm text-(--a2-ink-2)">{roleOf(r) || dash}</span>,
      },
      {
        key: "topics",
        head: "담당 상담 주제",
        width: "13rem",
        clip: true,
        value: (r) => r.topics.map((t) => counselTopics[t]).join(" · "),
        cell: (r) =>
          r.topics.length === 0 ? (
            dash
          ) : (
            <span className="a2-t-sm">{r.topics.map((t) => counselTopics[t]).join(" · ")}</span>
          ),
      },
      {
        /* 길이와 값을 한 칸에 둔다 — 「30분만 받는데 얼마인가」가 늘 한 물음이다.
           따로 매긴 값이 없으면 기본값을 그대로 적는다(괄호 없이) — 어느 쪽이 기본값인지는
           위 판에 이미 서 있고, 줄마다 「기본」을 붙이면 표가 그 글자로 덮인다 */
        key: "fee",
        detail: true,
        head: "길이 · 비용",
        width: "13rem",
        nowrap: true,
        value: (r) => r.spans.map((s) => r.fees?.[s] ?? fees[s]).join(" "),
        cell: (r) => (
          <span className="a2-t-sm">
            {r.spans.map((s) => (
              <span key={s} className="mr-2 inline-block">
                {spanLabel(s)}{" "}
                <b className={r.fees?.[s] == null ? "a2-num text-(--a2-ink-3)" : "a2-num text-(--a2-ink)"}>
                  {won(r.fees?.[s] ?? fees[s])}
                </b>
              </span>
            ))}
          </span>
        ),
      },
      {
        key: "modes",
        detail: true,
        head: "방식",
        width: "8rem",
        nowrap: true,
        hide: "md",
        value: (r) => r.modes.map((m) => counselModes[m]).join(" · "),
        cell: (r) => <span className="a2-t-sm">{r.modes.map((m) => counselModes[m]).join(" · ")}</span>,
      },
      {
        key: "days",
        detail: true,
        head: "근무",
        width: "13rem",
        nowrap: true,
        hide: "lg",
        value: (r) => scheduleText(r),
        cell: (r) => <span className="a2-t-sm text-(--a2-ink-2)">{scheduleText(r)}</span>,
      },
      {
        /* 노출은 목록에서 바로 누른다 — 오늘 자리를 닫아야 하는 상담사가 생기면 상세까지
           들어가 저장을 거치는 사이에 예약이 한 건 더 들어온다 */
        key: "shown",
        head: "노출",
        width: "7rem",
        nowrap: true,
        value: (r) => (r.shown ? "노출" : "숨김"),
        cell: (r) => (
          <span className="flex items-center gap-2">
            <Switch
              on={r.shown}
              label={`${nameOf(r) || r.id} 노출`}
              onChange={(on) => setCounselorShown(r.id, on)}
            />
            <Status tone={r.shown ? "ok" : "muted"}>{r.shown ? "노출" : "숨김"}</Status>
          </span>
        ),
      },
    ],
    [fees],
  );

  const filters: Filter<CounselorRow>[] = useMemo(
    () => [
      {
        id: "shown",
        label: "노출",
        options: [
          { value: "y", label: "노출" },
          { value: "n", label: "숨김" },
        ],
        match: (r, val) => (val === "y" ? r.shown : !r.shown),
      },
      {
        id: "span",
        label: "길이",
        options: SPANS.map((s) => ({ value: String(s), label: spanLabel(s) })),
        match: (r, val) => r.spans.includes(Number(val) as Span),
      },
      {
        id: "topic",
        label: "상담 주제",
        options: (Object.keys(counselTopics) as (keyof typeof counselTopics)[]).map((t) => ({
          value: t,
          label: counselTopics[t],
        })),
        match: (r, val) => r.topics.includes(val as keyof typeof counselTopics),
      },
    ],
    [],
  );

  const shown = rows.filter((r) => r.shown).length;

  return (
    <>
      <PageHead
        title="상담사 관리"
        actions={
          <Link href="/admin2/counselors/new" className="a2-btn a2-btn-primary">
            새 상담사
          </Link>
        }
      />
      <Body>
        <Panel title="상담사" meta={`${rows.length}명 · 노출 ${shown}명`} flush>
          <DataTable
            rows={rows}
            cols={cols}
            filters={filters}
            getKey={(r) => r.id}
            rowLink
            searchHint="이름 · 직함"
            showCount={false}
            empty="아직 등록한 상담사가 없습니다."
          />
        </Panel>
      </Body>
    </>
  );
}
