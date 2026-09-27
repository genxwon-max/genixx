"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  counselModes,
  counselTopics,
  spanLabel,
  SPANS,
  type CounselFees,
  type Span,
} from "@/lib/counselors";
import {
  nameOf,
  roleOf,
  setCounselorShown,
  setCounselFees,
  useCounselFees,
  useCounselorRows,
  type CounselorRow,
} from "@/lib/counselorStore";
import { won } from "@/lib/productStore";
import { WEEK_KO } from "@/lib/calendar";
import DataTable, { type Col, type Filter } from "@/components/admin2/DataTable";
import { SaveBar, useEditDraft } from "@/components/admin2/EditGuard";
import { Body, FormRow, PageHead, Panel, Status, Switch } from "@/components/admin2/ui";

/**
 * EXP-06-2 상담사 관리 — 결과 해석 면담을 맡는 사람의 목록.
 *
 * 여태 이 명단은 코드에 박혀 있었다(lib/counselors.ts). 상담사가 요일 하나를 바꾸거나
 * 값이 오를 때마다 배포를 해야 했고, 무엇보다 **운영자가 손댈 수 있는 값이 아니었다.**
 * 회차 공지도 상품 값도 이미 콘솔에서 고치는데 면담만 코드에 있는 것은 앞뒤가 안 맞는다.
 *
 * ── 판이 둘인 까닭 ──
 * 위는 **길이별 기본 값**이고 아래는 **사람**이다. 값을 길이로 정하는 것이 이 면담의
 * 규칙이라(lib/counselors.ts의 feeFor 주석) 그 값은 명단 밖에 선다 — 사람 줄 안에 두면
 * 서른 줄에 같은 값을 서른 번 적게 된다.
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
  const fees = useCounselFees();

  /* 기본 값 두 칸. 누르는 즉시 걸지 않고 저장을 거치는 까닭은, 30분을 고치는 동안 60분이
     아직 옛값이어도 그 사이에 결제가 지나가면 두 값이 다른 회차의 값으로 섞인다 */
  const draft = useEditDraft({ fee30: fees[30], fee60: fees[60] });
  const v = draft.value;
  const badFee = !Number.isFinite(v.fee30) || !Number.isFinite(v.fee60) || v.fee30 < 0 || v.fee60 < 0;

  const cols: Col<CounselorRow>[] = useMemo(
    () => [
      {
        key: "name",
        head: "이름",
        width: "9rem",
        nowrap: true,
        value: (r) => nameOf(r) || r.id,
        cell: (r) => (
          <Link
            href={`/admin2/counselors/${r.id}`}
            className="font-semibold text-(--a2-ink) hover:text-(--a2-accent) hover:underline"
          >
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
        head: "맡는 물음",
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
        head: "길이 · 값",
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
        head: "방식",
        width: "8rem",
        nowrap: true,
        hide: "md",
        value: (r) => r.modes.map((m) => counselModes[m]).join(" · "),
        cell: (r) => <span className="a2-t-sm">{r.modes.map((m) => counselModes[m]).join(" · ")}</span>,
      },
      {
        key: "days",
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
        value: (r) => (r.shown ? "노출" : "내림"),
        cell: (r) => (
          <span className="flex items-center gap-2">
            <Switch
              on={r.shown}
              label={`${nameOf(r) || r.id} 노출`}
              onChange={(on) => setCounselorShown(r.id, on)}
            />
            <Status tone={r.shown ? "ok" : "muted"}>{r.shown ? "노출" : "내림"}</Status>
          </span>
        ),
      },
      {
        key: "act",
        head: "관리",
        width: "5.5rem",
        nowrap: true,
        cell: (r) => (
          <Link
            href={`/admin2/counselors/${r.id}`}
            className="a2-btn a2-btn-sm"
            aria-label={`${nameOf(r) || r.id} 수정하기`}
          >
            수정하기
          </Link>
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
          { value: "n", label: "내림" },
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
        label: "물음",
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
      <Body className="flex flex-col gap-3">
        {/* ① 길이별 기본 값 — 사람 줄에 적지 않는 값 */}
        <Panel
          title="면담 기본 값"
          meta="사람마다 따로 매기지 않은 면담은 이 값으로 팝니다"
          flush
        >
          <div className="a2-form">
            {SPANS.map((s) => (
              <FormRow
                key={s}
                label={`${spanLabel(s)} 면담`}
                req
                hint={
                  s === 30
                    ? "결과지에서 궁금한 대목을 짚어 묻는 자리입니다."
                    : "아이 이야기를 처음부터 듣고 결과지 전체를 함께 읽는 자리입니다."
                }
              >
                <input
                  className="a2-input a2-num"
                  style={{ maxWidth: "11rem" }}
                  inputMode="numeric"
                  aria-label={`${spanLabel(s)} 면담 값`}
                  value={(s === 30 ? v.fee30 : v.fee60).toLocaleString("ko-KR")}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/[^0-9]/g, "");
                    draft.set(s === 30 ? "fee30" : "fee60", digits ? Number(digits) : 0);
                  }}
                />
                <span className="a2-t-sm text-(--a2-ink-3)">원</span>
              </FormRow>
            ))}
          </div>
          <div className="px-3 pb-3">
            <SaveBar
              dirty={draft.dirty}
              disabled={badFee}
              onSave={() => {
                if (badFee) return;
                const next: CounselFees = { 30: v.fee30, 60: v.fee60 };
                setCounselFees(next);
              }}
              onCancel={draft.reset}
              note={
                draft.dirty
                  ? "저장하면 따로 값을 매기지 않은 상담사 전부에 걸립니다."
                  : "값을 따로 매긴 상담사는 이 값을 받지 않습니다."
              }
            />
          </div>
        </Panel>

        {/* ② 사람 */}
        <Panel title="상담사" meta={`${rows.length}명 · 노출 ${shown}명`} flush>
          <DataTable
            rows={rows}
            cols={cols}
            filters={filters}
            getKey={(r) => r.id}
            searchHint="이름 · 직함"
            showCount={false}
            empty="아직 등록한 상담사가 없습니다."
          />
        </Panel>
      </Body>
    </>
  );
}
