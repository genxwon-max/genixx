"use client";

import Link from "next/link";
import { designLinks } from "@/lib/designScreens";
import type { Tone } from "@/lib/admin2";
import { unreadableReasons } from "@/lib/gradeSheet";
import DataTable, { type Col } from "@/components/admin2/DataTable";
import { Body, DescList, FormRow, PageHead, Panel, Status, Tab, Tag } from "@/components/admin2/ui";
import ConsoleFrame, { ConsoleDialog } from "../ConsoleFrame";
import AnswerPhoto, { type PhotoLook } from "./AnswerPhoto";
import { photoFlow } from "./photoFlow";

/**
 * 운영자 확인 — 채점자가 「알아볼 수 없음」으로 넘긴 사진 답안
 * (실제 주소 /admin2/grading/checks · /admin2/grading/checks/[응답]) — 디자인.
 *
 * 채점 상세에서 사진 답안에 「알아볼 수 없음」을 고르고 저장하면 그 응답은 채점 대기에서 빠져 여기에
 * 쌓인다. 운영자(최상위 관리자)는 사진과 채점자가 넘긴 이유를 보고 둘 중 하나를 한다 —
 *
 *   다시 올려 달라고 요청   보호자에게 알림톡 · 메일 · 앱 알림으로 사진을 올릴 링크를 보낸다. 학생
 *                          대시보드의 「내 진단」에도 요청이 선다. 사진이 올라오면 응답은 운영자를
 *                          거치지 않고 곧바로 채점 대기로 돌아간다.
 *   채점으로 돌려보내기     다시 받지 않고 지금 사진으로 채점하게 한다. 빈 종이 · 문항과 관계없는
 *                          사진처럼 다시 받으면 답을 새로 쓸 수 있게 되는 경우에 쓴다.
 *
 * 요청에는 기한이 있다. 기한이 지나도 올라오지 않으면 「기한 지남」으로 옮겨지고, 운영자가 기한을
 * 늘리거나 지금 사진으로 채점하게 돌려보낸다 — 이 응답 하나 때문에 답안지 채점이 끝나지 않으면
 * 리포트가 조립되지 않기 때문이다.
 *
 * 메뉴는 채점 관리 그룹의 「운영자 확인」이다(디자인 껍데기에만 있다 — ../ConsoleFrame.tsx).
 * 채점자(진단 위원)의 메뉴에는 없다. 예시는 ./photoFlow.ts — 상세 셋 가운데 SC-2610-0164가 그 학생이다.
 */

const to = designLinks("grading-checks");
/** 이 화면의 메뉴 항목 — 디자인 껍데기에만 있는 새 항목이라 디자인 주소다 */
const AT = "/design/admin2/grading/checks";
/** 채점자의 채점 상세 디자인 */
const graderHref = (slug: string) => `/design/admin2/grading/answers/${slug}`;
/** 보호자가 링크로 여는 화면 디자인 */
const guardianHref = "/design/answer/photo";
const noop = () => {};

/* ───────────────────────── 목록 ───────────────────────── */

type CheckState = "waiting" | "requested" | "expired" | "uploaded" | "returned";

type Row = {
  id: string;
  seat: string;
  student: string;
  guardian: string;
  reason: string;
  /** 넘긴 채점자와 넘긴 때 */
  by: string;
  at: string;
  state: CheckState;
  /** 올릴 기한 — 요청한 뒤에만 */
  due?: string;
  /** 보호자가 요청 알림톡을 읽었나 */
  seen?: boolean;
  /** 다시 올라온 때 · 돌려보낸 때 */
  doneAt?: string;
  /** 줄을 누르면 가는 상세 디자인 — 상세를 그려 둔 것은 셋이라 같은 상태의 상세로 보낸다 */
  href: string;
};

const stateLabel: Record<CheckState, string> = {
  waiting: "확인 대기",
  requested: "요청함",
  expired: "기한 지남",
  uploaded: "다시 올라옴",
  returned: "채점으로 돌려보냄",
};
const stateTone: Record<CheckState, Tone> = {
  waiting: "warn",
  requested: "info",
  expired: "danger",
  uploaded: "ok",
  returned: "muted",
};

/** 2026-10-14(수) 13:00의 목록 — SC-2610-0164를 요청하기 전이다 */
const rows: Row[] = [
  { id: "SC-2610-0171", seat: "0433", student: "정유나", guardian: "정수현", reason: "너무 어둡거나 빛이 반사됩니다", by: "김지원", at: "2026-10-14 11:42", state: "waiting", href: to("SC-2610-0164") },
  { id: "SC-2610-0164", seat: "0418", student: "이서준", guardian: "이정민", reason: "사진이 흐립니다", by: "서민정", at: "2026-10-14 10:05", state: "waiting", href: to("SC-2610-0164") },
  { id: "SC-2610-0152", seat: "0452", student: "오지후", guardian: "오승민", reason: "빈 종이입니다", by: "서민정", at: "2026-10-14 09:18", state: "waiting", href: to("SC-2610-0152") },
  { id: "SC-2610-0126", seat: "0391", student: "한서윤", guardian: "한미경", reason: "답의 일부가 잘렸습니다", by: "김지원", at: "2026-10-13 15:40", state: "requested", due: "10.16(금)", seen: true, href: to("SC-2610-0164/requested") },
  { id: "SC-2610-0118", seat: "0402", student: "강민준", guardian: "강태호", reason: "사진이 흐립니다", by: "서민정", at: "2026-10-12 17:05", state: "requested", due: "10.16(금)", seen: false, href: to("SC-2610-0164/requested") },
  { id: "SC-2610-0139", seat: "0377", student: "윤도윤", guardian: "윤혜진", reason: "너무 어둡거나 빛이 반사됩니다", by: "김지원", at: "2026-10-10 11:02", state: "expired", due: "10.13(화)", seen: false, href: to("SC-2610-0139") },
  { id: "SC-2610-0105", seat: "0361", student: "송지아", guardian: "송은주", reason: "답의 일부가 잘렸습니다", by: "김지원", at: "2026-10-11 10:12", state: "uploaded", due: "10.14(수)", seen: true, doneAt: "2026-10-13 08:15", href: to("SC-2610-0164/uploaded") },
  { id: "SC-2610-0097", seat: "0356", student: "임채원", guardian: "임정훈", reason: "사진이 흐립니다", by: "서민정", at: "2026-10-10 16:48", state: "uploaded", due: "10.13(화)", seen: true, doneAt: "2026-10-12 21:30", href: to("SC-2610-0164/uploaded") },
  { id: "SC-2610-0088", seat: "0349", student: "조은우", guardian: "조민석", reason: "문항과 관계없는 사진입니다", by: "김지원", at: "2026-10-10 09:40", state: "returned", doneAt: "2026-10-11 10:30", href: to("SC-2610-0152/returned") },
];

type ListTab = "waiting" | "requested" | "expired" | "done" | "all";

const inTab = (r: Row, tab: ListTab) =>
  tab === "all" ||
  (tab === "done" ? r.state === "uploaded" || r.state === "returned" : r.state === tab);

const tabNames: { id: ListTab; label: string; slug: string }[] = [
  { id: "waiting", label: "확인 대기", slug: "" },
  { id: "requested", label: "다시 올리기 요청함", slug: "requested" },
  { id: "expired", label: "기한 지남", slug: "expired" },
  { id: "done", label: "처리 완료", slug: "done" },
  { id: "all", label: "전체", slug: "" },
];

const dim = (s: string) => <span className="a2-t-xs text-(--a2-ink-4)">{s}</span>;

const baseCols: Col<Row>[] = [
  {
    key: "student",
    head: "학생",
    width: "8.5rem",
    nowrap: true,
    value: (r) => `${r.student} ${r.seat}`,
    /* 줄을 누르면 이 링크가 대신 눌린다 */
    cell: (r) => (
      <span className="inline-flex items-baseline gap-1.5">
        <Link href={r.href} className="font-semibold text-(--a2-ink)">
          {r.student}
        </Link>
        <span className="a2-mono a2-t-xs text-(--a2-ink-4)">{r.seat} · 초4</span>
      </span>
    ),
  },
  {
    key: "guardian",
    head: "보호자",
    width: "5.5rem",
    nowrap: true,
    value: (r) => r.guardian,
    cell: (r) => <span className="a2-t-sm text-(--a2-ink-2)">{r.guardian}</span>,
  },
  {
    key: "question",
    head: "문항",
    width: "5.5rem",
    nowrap: true,
    value: () => photoFlow.question.label,
    cell: () => <span className="a2-t-sm text-(--a2-ink-2)">{photoFlow.question.label}</span>,
  },
  {
    key: "reason",
    head: "알아볼 수 없는 이유",
    width: "100%",
    clip: true,
    value: (r) => r.reason,
    cell: (r) => <span className="a2-t-sm text-(--a2-ink)">{r.reason}</span>,
  },
  {
    key: "by",
    head: "넘긴 채점자",
    width: "9.5rem",
    nowrap: true,
    value: (r) => `${r.by} ${r.at}`,
    sort: (r) => r.at,
    cell: (r) => (
      <span className="inline-flex flex-col">
        <span className="a2-t-sm text-(--a2-ink-2)">{r.by}</span>
        <span className="a2-mono a2-t-xs text-(--a2-ink-4)">{r.at}</span>
      </span>
    ),
  },
];

const stateCol: Col<Row> = {
  key: "state",
  head: "상태",
  width: "9.5rem",
  nowrap: true,
  value: (r) => stateLabel[r.state],
  cell: (r) => (
    <span className="inline-flex flex-col">
      <Status tone={stateTone[r.state]}>{stateLabel[r.state]}</Status>
      {r.state === "requested" && dim(`${r.due}까지`)}
      {r.state === "expired" && dim(`${r.due}까지였음`)}
      {r.doneAt && dim(r.doneAt)}
    </span>
  ),
};

/** 보호자가 요청 알림톡을 읽었나 — 요청한 뒤의 탭에만 세운다 */
const seenCol: Col<Row> = {
  key: "seen",
  head: "알림톡",
  width: "6rem",
  nowrap: true,
  value: (r) => (r.seen == null ? "" : r.seen ? "읽음" : "읽지 않음"),
  cell: (r) =>
    r.seen == null ? (
      dim("—")
    ) : r.seen ? (
      <span className="a2-t-sm text-(--a2-ink-2)">읽음</span>
    ) : (
      <span className="a2-t-sm font-semibold" style={{ color: "var(--a2-danger)" }}>
        읽지 않음
      </span>
    ),
};

/** 조회 조건 탭 — 상태마다 주소가 달라 단추가 아니라 링크로 둔다. 모양은 콘솔의 탭(.a2-tab) 그대로다 */
function TabLink({ href, label, count, active }: { href: string; label: string; count: number; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className="a2-tab"
      style={
        active ? { borderBottomColor: "var(--a2-accent)", color: "var(--a2-accent-2)", fontWeight: 700 } : undefined
      }
    >
      {label}
      <span className="a2-tab-n" style={active ? { color: "var(--a2-accent-2)" } : undefined}>
        {count}
      </span>
    </Link>
  );
}

export default function GradingChecks({ state }: { state: string }) {
  const tab = tabNames.find((t) => t.slug === state && t.id !== "all");
  if (tab || state === "empty") return <List tab={tab?.id ?? "waiting"} empty={state === "empty"} />;
  const view = views[state];
  return view ? <Detail view={view} /> : <List tab="waiting" />;
}

function List({ tab, empty = false }: { tab: ListTab; empty?: boolean }) {
  /* 비어 있는 목록 — 확인할 것도 기다리는 것도 없고 처리한 것만 남았다 */
  const all = empty ? rows.filter((r) => r.state === "uploaded" || r.state === "returned") : rows;
  const shown = all.filter((r) => inTab(r, tab));
  const asked = tab === "requested" || tab === "expired";
  const cols = [...baseCols, ...(asked ? [seenCol] : []), stateCol];

  return (
    <ConsoleFrame at={AT}>
      <PageHead
        title="운영자 확인"
        tabsLabel="처리 상태별 조회 조건"
        tabs={tabNames.map((t) =>
          t.id === "all" ? (
            <Tab key={t.id} label={t.label} count={all.length} active={false} onClick={noop} />
          ) : (
            <TabLink
              key={t.id}
              href={to(empty && t.id === "waiting" ? "empty" : t.slug)}
              label={t.label}
              count={all.filter((r) => inTab(r, t.id)).length}
              active={tab === t.id}
            />
          ),
        )}
      />

      {/* 이 화면이 무엇을 하는 곳인지 한 줄로 — 채점 화면에서 넘어온 것이라 이름만으로는 알기 어렵다 */}
      <div className="border-b border-(--a2-line) bg-(--a2-accent-soft) px-4 py-2.5 a2-t-sm text-(--a2-ink-2)">
        <b className="text-(--a2-ink)">채점자가 「알아볼 수 없음」으로 넘긴 사진 답안을 확인하는 곳입니다.</b>{" "}
        보호자에게 사진을 다시 올려 달라고 요청하거나, 다시 받지 않고 채점으로 돌려보냅니다. 다시 올라온 사진은 채점
        대기로 바로 돌아가 같은 채점자가 이어서 채점합니다.
      </div>

      <DataTable
        key={tab}
        rows={shown}
        cols={cols}
        getKey={(r) => r.id}
        rowLink
        searchHint="학생 · 보호자 · 응시번호 · 응답 ID"
        showCount={false}
        empty={
          tab === "waiting"
            ? "확인할 응답이 없습니다. 채점자가 사진 답안에 「알아볼 수 없음」을 고르면 여기에 표시됩니다."
            : tab === "requested"
              ? "사진이 다시 올라오기를 기다리는 응답이 없습니다."
              : tab === "expired"
                ? "기한이 지난 요청이 없습니다."
                : "처리한 응답이 없습니다."
        }
      />
    </ConsoleFrame>
  );
}

/* ───────────────────────── 상세 ───────────────────────── */

type Case = {
  id: string;
  seat: string;
  student: string;
  /** 「초등 4학년 · 만 14세 미만」 */
  studentNote: string;
  guardian: string;
  phone: string;
  email: string;
  reason: string;
  memo: string;
  /** 넘긴 채점자와 넘긴 때 */
  by: string;
  at: string;
  look: PhotoLook;
  firstAt: string;
  size: string;
  finalizedAt: string;
};

const seojun: Case = {
  id: photoFlow.response,
  seat: photoFlow.diag.seat,
  student: photoFlow.student.name,
  studentNote: `${photoFlow.student.grade} · ${photoFlow.student.age}`,
  guardian: photoFlow.guardian.name,
  phone: photoFlow.guardian.phone,
  email: photoFlow.guardian.email,
  reason: photoFlow.flagged.reason,
  memo: photoFlow.flagged.memo,
  by: photoFlow.flagged.by,
  at: photoFlow.flagged.at,
  look: "blurred",
  firstAt: photoFlow.first.at,
  size: photoFlow.first.size,
  finalizedAt: photoFlow.finalizedAt,
};

const doyun: Case = {
  id: "SC-2610-0139",
  seat: "0377",
  student: "윤도윤",
  studentNote: "초등 4학년 · 만 14세 미만",
  guardian: "윤혜진",
  phone: "010-****-7716",
  email: "hyejin.yoon@example.com",
  reason: "너무 어둡거나 빛이 반사됩니다",
  memo: "형광등 빛이 종이 가운데에 비쳐 식이 보이지 않습니다. 봉지 그림도 가장자리만 보입니다.",
  by: "김지원",
  at: "2026-10-10 11:02",
  look: "glare",
  firstAt: "2026-10-09 15:47",
  size: "1,600 × 1,200 · 296KB",
  finalizedAt: "2026-10-09 16:30",
};

const jihu: Case = {
  id: "SC-2610-0152",
  seat: "0452",
  student: "오지후",
  studentNote: "초등 4학년 · 만 14세 미만",
  guardian: "오승민",
  phone: "010-****-2085",
  email: "seungmin.oh@example.com",
  reason: "빈 종이입니다",
  memo: "공책 면에 아무것도 쓰여 있지 않습니다. 사진은 또렷합니다.",
  by: "서민정",
  at: "2026-10-14 09:18",
  look: "blank",
  firstAt: "2026-10-11 10:03",
  size: "1,600 × 1,200 · 214KB",
  finalizedAt: "2026-10-13 19:40",
};

type Phase = "waiting" | "requested" | "expired" | "uploaded" | "returned";
type Dialog = "request" | "remind" | "extend" | "return";

/** 보호자에게 보낸 요청 */
type Ask = { by: string; at: string; due: string; left: string; message: string };
/** 알림 발송 내역 한 줄 */
type Send = { at: string; to: string; what: string; how: string; result: string; tone?: Tone };
type Log = { at: string; what: string; why: string; by: string };

type View = {
  c: Case;
  phase: Phase;
  dialog?: Dialog;
  /** 이 상태의 주소 꼬리 — 창의 「취소」가 돌아오는 곳 */
  base: string;
  ask?: Ask;
  sends?: Send[];
  log: Log[];
  /** 다시 올라온 사진 */
  again?: { at: string; size: string };
  /** 다시 받지 않고 돌려보낸 것 */
  returned?: { at: string; by: string; why: string };
  /** 채점자의 채점 상세 디자인 꼬리 — 그려 둔 응답만 */
  grader?: string;
};

/* ── 이서준 · 흐린 사진 — 요청하고, 다시 올라온다 ── */

const seojunAsk: Ask = {
  by: photoFlow.request.by,
  at: photoFlow.request.at,
  due: photoFlow.request.due,
  left: "3일 남음",
  message: photoFlow.request.message,
};

const seojunSends: Send[] = [
  { at: "2026-10-14 14:30", to: "보호자 이정민", what: "사진 다시 올리기 요청", how: "알림톡", result: "읽음 14:52", tone: "ok" },
  { at: "2026-10-14 14:30", to: "보호자 이정민", what: "사진 다시 올리기 요청", how: "이메일", result: "보냄" },
  { at: "2026-10-14 14:30", to: "보호자 이정민", what: "사진 다시 올리기 요청", how: "앱 알림", result: "보냄" },
  { at: "2026-10-14 14:30", to: "학생 이서준", what: "사진 다시 올리기 요청", how: "앱 알림", result: "보냄" },
];

const seojunLog: Log[] = [
  { at: photoFlow.first.at, what: "사진 올림", why: "응시 화면에서 올림 · 수학 제출 11:26", by: "학생" },
  { at: photoFlow.finalizedAt, what: "최종 제출", why: "2026 4분기 초4 진단", by: "학생" },
  { at: photoFlow.flagged.at, what: "알아볼 수 없음", why: `${photoFlow.flagged.reason} — ${photoFlow.flagged.memo}`, by: photoFlow.flagged.by },
];

const seojunAsked: Log = {
  at: photoFlow.request.at,
  what: "다시 올려 달라고 요청",
  why: `기한 ${photoFlow.request.due} · 알림톡 · 이메일 · 앱 알림`,
  by: photoFlow.request.by,
};

const seojunWaiting: View = { c: seojun, phase: "waiting", base: "SC-2610-0164", log: seojunLog, grader: "file/unreadable" };

const seojunRequested: View = {
  c: seojun,
  phase: "requested",
  base: "SC-2610-0164/requested",
  ask: seojunAsk,
  sends: [
    ...seojunSends,
    { at: photoFlow.request.remindAt, to: "보호자 이정민", what: "기한 하루 전 안내", how: "알림톡 · 이메일 · 앱 알림", result: "예정 · 그때까지 올라오지 않으면", tone: "muted" },
  ],
  log: [...seojunLog, seojunAsked],
  grader: "file/waiting",
};

const seojunUploaded: View = {
  c: seojun,
  phase: "uploaded",
  base: "SC-2610-0164/uploaded",
  ask: { ...seojunAsk, left: "기한 안에 올라옴" },
  sends: [
    ...seojunSends,
    { at: photoFlow.again.at, to: "보호자 이정민", what: "다시 올린 사진 받음", how: "이메일 · 앱 알림", result: "보냄" },
    { at: photoFlow.request.remindAt, to: "보호자 이정민", what: "기한 하루 전 안내", how: "알림톡 · 이메일 · 앱 알림", result: "보내지 않음 · 사진이 올라옴", tone: "muted" },
  ],
  log: [
    ...seojunLog,
    seojunAsked,
    { at: photoFlow.again.at, what: "사진 다시 올림", why: "보호자가 알림톡의 링크로 올림 · 채점 대기로 돌아감", by: "보호자 이정민" },
  ],
  again: photoFlow.again,
  grader: "file/reuploaded",
};

/* ── 윤도윤 · 빛이 비친 사진 — 기한이 지났다 ── */

const doyunSends: Send[] = [
  { at: "2026-10-10 13:40", to: "보호자 윤혜진", what: "사진 다시 올리기 요청", how: "알림톡", result: "읽지 않음", tone: "danger" },
  { at: "2026-10-10 13:40", to: "보호자 윤혜진", what: "사진 다시 올리기 요청", how: "이메일", result: "보냄" },
  { at: "2026-10-10 13:40", to: "보호자 윤혜진", what: "사진 다시 올리기 요청", how: "앱 알림", result: "보냄" },
  { at: "2026-10-10 13:40", to: "학생 윤도윤", what: "사진 다시 올리기 요청", how: "앱 알림", result: "보냄" },
  { at: "2026-10-12 18:00", to: "보호자 윤혜진", what: "기한 하루 전 안내", how: "알림톡", result: "읽지 않음", tone: "danger" },
  { at: "2026-10-12 18:00", to: "보호자 윤혜진", what: "기한 하루 전 안내", how: "이메일 · 앱 알림", result: "보냄" },
];

const doyunLog: Log[] = [
  { at: "2026-10-09 15:47", what: "사진 올림", why: "응시 화면에서 올림", by: "학생" },
  { at: "2026-10-09 16:30", what: "최종 제출", why: "2026 4분기 초4 진단", by: "학생" },
  { at: "2026-10-10 11:02", what: "알아볼 수 없음", why: `${doyun.reason} — ${doyun.memo}`, by: "김지원" },
  { at: "2026-10-10 13:40", what: "다시 올려 달라고 요청", why: "기한 2026-10-13(화) 23:59 · 알림톡 · 이메일 · 앱 알림", by: "박서준" },
  { at: "2026-10-13 23:59", what: "기한 지남", why: "사진이 올라오지 않음", by: "시스템" },
];

const doyunAsk: Ask = {
  by: "박서준",
  at: "2026-10-10 13:40",
  due: "2026-10-13(화) 23:59",
  left: "하루 지남",
  message: "수학 3번 답으로 올린 사진에 불빛이 비쳐 식을 읽을 수 없습니다. 처음에 쓴 종이를 그림자나 불빛이 비치지 않는 곳에서 다시 찍어 올려 주세요.",
};

const doyunExpired: View = { c: doyun, phase: "expired", base: "SC-2610-0139", ask: doyunAsk, sends: doyunSends, log: doyunLog };

const doyunExtended: View = {
  c: doyun,
  phase: "requested",
  base: "SC-2610-0139/extended",
  ask: { ...doyunAsk, due: "2026-10-17(토) 23:59", left: "3일 남음 · 한 번 늘림" },
  sends: [
    ...doyunSends,
    { at: "2026-10-14 15:10", to: "보호자 윤혜진", what: "기한을 늘렸다는 안내", how: "알림톡", result: "보냄 · 아직 읽지 않음", tone: "muted" },
    { at: "2026-10-14 15:10", to: "보호자 윤혜진", what: "기한을 늘렸다는 안내", how: "이메일 · 앱 알림", result: "보냄" },
    { at: "2026-10-16 18:00", to: "보호자 윤혜진", what: "기한 하루 전 안내", how: "알림톡 · 이메일 · 앱 알림", result: "예정 · 그때까지 올라오지 않으면", tone: "muted" },
  ],
  log: [
    ...doyunLog,
    { at: "2026-10-14 15:10", what: "기한 늘림", why: "2026-10-13(화) → 2026-10-17(토) 23:59 · 보호자에게 알림", by: "박서준" },
  ],
};

/* ── 오지후 · 빈 종이 — 다시 받지 않고 채점으로 돌려보낸다 ── */

const jihuLog: Log[] = [
  { at: "2026-10-11 10:03", what: "사진 올림", why: "응시 화면에서 올림", by: "학생" },
  { at: "2026-10-13 19:40", what: "최종 제출", why: "2026 4분기 초4 진단", by: "학생" },
  { at: "2026-10-14 09:18", what: "알아볼 수 없음", why: `${jihu.reason} — ${jihu.memo}`, by: "서민정" },
];

const jihuWaiting: View = { c: jihu, phase: "waiting", base: "SC-2610-0152", log: jihuLog };

const jihuReturned: View = {
  c: jihu,
  phase: "returned",
  base: "SC-2610-0152/returned",
  log: [
    ...jihuLog,
    { at: "2026-10-14 15:20", what: "채점으로 돌려보냄", why: "빈 종이입니다 · 다시 받지 않음 · 보호자에게 알리지 않음", by: "박서준" },
  ],
  returned: { at: "2026-10-14 15:20", by: "박서준", why: "빈 종이입니다 — 다시 받으면 답을 새로 쓸 수 있게 되어 지금 사진으로 채점합니다." },
};

/** 주소 꼬리 → 상세의 상태 */
const views: Record<string, View> = {
  "SC-2610-0164": seojunWaiting,
  "SC-2610-0164/request": { ...seojunWaiting, dialog: "request" },
  "SC-2610-0164/requested": seojunRequested,
  "SC-2610-0164/remind": { ...seojunRequested, dialog: "remind" },
  "SC-2610-0164/uploaded": seojunUploaded,
  "SC-2610-0139": doyunExpired,
  "SC-2610-0139/extend": { ...doyunExpired, dialog: "extend" },
  "SC-2610-0139/extended": doyunExtended,
  "SC-2610-0152": jihuWaiting,
  "SC-2610-0152/return": { ...jihuWaiting, dialog: "return" },
  "SC-2610-0152/returned": jihuReturned,
};

/**
 * 연락처는 가려서 적는다 — 「jungmin.lee@example.com」 → 「jun***@example.com」.
 * 알림은 시스템이 보내므로 운영자가 번호를 다 볼 일이 없다. 전화로 알려야 하면 회원 상세에서 열람 사유를
 * 적고 연다(감사 로그의 개인정보 열람).
 */
const maskEmail = (email: string) => {
  const [id, domain] = email.split("@");
  return `${id.slice(0, 3)}***@${domain}`;
};

const phaseLabel: Record<Phase, string> = {
  waiting: "확인 대기",
  requested: "다시 올리기를 기다림",
  expired: "기한 지남",
  uploaded: "다시 올라옴",
  returned: "채점으로 돌려보냄",
};
const phaseTone: Record<Phase, Tone> = {
  waiting: "warn",
  requested: "info",
  expired: "danger",
  uploaded: "ok",
  returned: "muted",
};

/** 빈 종이 · 문항과 관계없는 사진 — 다시 받지 않는 편이 맞는 이유 */
const blankish = (reason: string) => reason === "빈 종이입니다" || reason === "문항과 관계없는 사진입니다";

function Detail({ view }: { view: View }) {
  const { c, phase, dialog } = view;
  const back = (
    <Link href={to(phase === "expired" ? "expired" : phase === "requested" ? "requested" : phase === "waiting" ? "" : "done")} className="a2-btn">
      ← 운영자 확인
    </Link>
  );
  const status = (
    <span className="mr-1 flex items-center gap-1.5">
      <span className="a2-t-xs text-(--a2-ink-4)">처리 상태</span>
      <Status tone={phaseTone[phase]}>{phaseLabel[phase]}</Status>
    </span>
  );

  const actions =
    phase === "waiting" ? (
      blankish(c.reason) ? (
        <>
          {status}
          <button type="button" className="a2-btn">
            다시 올려 달라고 요청
          </button>
          <Link href={to(`${view.base}/return`)} className="a2-btn a2-btn-primary">
            채점으로 돌려보내기
          </Link>
        </>
      ) : (
        <>
          {status}
          <button type="button" className="a2-btn">
            채점으로 돌려보내기
          </button>
          <Link href={to(`${view.base}/request`)} className="a2-btn a2-btn-primary">
            다시 올려 달라고 요청
          </Link>
        </>
      )
    ) : phase === "requested" ? (
      <>
        {status}
        <span className="a2-t-xs text-(--a2-ink-4)">
          {view.ask?.due}까지 · {view.ask?.left}
        </span>
        {view.base === "SC-2610-0164/requested" ? (
          <Link href={to("SC-2610-0164/remind")} className="a2-btn">
            다시 알리기
          </Link>
        ) : (
          <button type="button" className="a2-btn">
            다시 알리기
          </button>
        )}
      </>
    ) : phase === "expired" ? (
      <>
        {status}
        <span className="a2-t-xs text-(--a2-ink-4)">
          {view.ask?.due}까지였음 · {view.ask?.left}
        </span>
        <button type="button" className="a2-btn">
          지금 사진으로 채점
        </button>
        <Link href={to(`${view.base}/extend`)} className="a2-btn a2-btn-primary">
          기한 늘리기
        </Link>
      </>
    ) : phase === "uploaded" ? (
      <>
        {status}
        <span className="a2-t-xs text-(--a2-ink-4)">{view.again?.at} · 채점 대기로 돌아감</span>
        {view.grader && (
          <Link href={graderHref(view.grader)} className="a2-btn">
            채점 상세 보기
          </Link>
        )}
      </>
    ) : (
      <>
        {status}
        <span className="a2-t-xs text-(--a2-ink-4)">
          {view.returned?.at} · {view.returned?.by}
        </span>
      </>
    );

  return (
    <ConsoleFrame at={AT}>
      <PageHead title={`${c.student} · ${photoFlow.question.label}`} back={back} actions={actions} />

      <Body>
        <div className="grid gap-3">
          {phase === "waiting" && blankish(c.reason) && (
            <p className="a2-note" style={{ borderLeftColor: "var(--a2-warn)" }}>
              <span>
                <b>빈 종이 · 문항과 관계없는 사진은 다시 받지 않는 편이 좋습니다.</b> 다시 받으면 이미 낸 답을 새로
                풀어 낼 수 있게 되기 때문입니다. 「채점으로 돌려보내기」를 누르면 채점자가 지금 사진으로 채점합니다.
              </span>
            </p>
          )}
          {phase === "expired" && (
            <p className="a2-note" style={{ borderLeftColor: "var(--a2-danger)" }}>
              <span>
                <b>기한까지 사진이 올라오지 않았습니다.</b> 보호자가 알림톡을 두 번 다 읽지 않았습니다. 기한을 늘려 다시
                알리거나, 지금 사진으로 채점하게 돌려보내 주세요. 이 응답의 채점이 끝나야 답안지 채점이 끝나고 리포트가
                조립됩니다.
              </span>
            </p>
          )}

          <Panel title="채점자가 넘긴 내용" meta={`${c.by} · ${c.at}`} flush>
            <div className="a2-form">
              <FormRow label="알아볼 수 없는 이유">
                <span className="a2-t-sm font-semibold text-(--a2-ink)">{c.reason}</span>
              </FormRow>
              <FormRow label="채점자 메모">
                <span className="a2-t-sm text-(--a2-ink-2)">{c.memo}</span>
              </FormRow>
              {view.grader && (
                <FormRow label="채점 화면">
                  <Link href={graderHref(view.grader)} className="a2-t-sm text-(--a2-accent) hover:underline">
                    채점 상세 보기 · {c.seat} · 수학
                  </Link>
                </FormRow>
              )}
            </div>
          </Panel>

          <Photos view={view} />

          {view.ask && (
            <Panel title="요청" meta={`${view.ask.by} · ${view.ask.at}`}>
              <DescList
                rows={[
                  {
                    k: "올릴 기한",
                    v: (
                      <>
                        <span className="a2-mono">{view.ask.due}</span>
                        <span className="ml-2 a2-t-xs" style={{ color: phase === "expired" ? "var(--a2-danger)" : "var(--a2-ink-4)" }}>
                          {view.ask.left}
                        </span>
                      </>
                    ),
                  },
                  { k: "보낸 말", v: view.ask.message },
                  {
                    k: "보호자가 여는 화면",
                    v: (
                      <Link href={guardianHref} className="text-(--a2-accent) hover:underline">
                        사진 다시 올리기 화면 보기
                      </Link>
                    ),
                  },
                ]}
              />
            </Panel>
          )}

          {view.sends && <Sends sends={view.sends} />}

          {view.returned && (
            <Panel title="처리 결과" meta={`${view.returned.at} · ${view.returned.by}`}>
              <DescList
                rows={[
                  { k: "결론", v: <Status tone="muted">채점으로 돌려보냄</Status> },
                  { k: "사유", v: view.returned.why },
                  { k: "보호자", v: "알리지 않았습니다. 결과는 리포트가 발행될 때 함께 봅니다." },
                ]}
              />
            </Panel>
          )}

          <Panel title="문항" meta="2026 4분기 초4 진단 · 수학" flush>
            <div className="a2-form">
              <FormRow label="문항">
                <span className="a2-t-sm font-semibold text-(--a2-ink)">{photoFlow.question.label}</span>
                <Tag accent>사진 올리기</Tag>
              </FormRow>
              <FormRow label="발문">
                <span className="a2-t-sm text-(--a2-ink)">{photoFlow.question.stem}</span>
              </FormRow>
              <FormRow label="응답 ID">
                <span className="a2-mono a2-t-sm text-(--a2-ink-3)">{c.id}</span>
              </FormRow>
              <FormRow label="답안지">
                <span className="a2-t-sm text-(--a2-ink-2)">
                  {phase === "uploaded" || phase === "returned"
                    ? "이 문항이 채점 대기로 돌아갔습니다. 채점이 끝나면 답안지 채점이 끝나고 리포트가 조립됩니다."
                    : "41문항 가운데 이 문항만 채점이 남았습니다. 이 문항의 채점이 끝나야 리포트가 조립됩니다."}
                </span>
              </FormRow>
            </div>
          </Panel>

          <Panel title="학생과 보호자" meta="만 14세 미만이라 요청은 보호자에게 갑니다">
            <DescList
              rows={[
                { k: "학생", v: <><span className="font-semibold">{c.student}</span> · {c.studentNote}</> },
                {
                  k: "응시",
                  v: (
                    <>
                      2026 4분기 초4 진단 · 응시번호 <span className="a2-mono">{c.seat}</span> · 최종 제출{" "}
                      <span className="a2-mono">{c.finalizedAt}</span>
                    </>
                  ),
                },
                {
                  k: "보호자",
                  v: (
                    <>
                      <span className="font-semibold">{c.guardian}</span> · <span className="a2-mono">{c.phone}</span> ·{" "}
                      <span className="a2-mono">{maskEmail(c.email)}</span>
                    </>
                  ),
                },
                { k: "받는 곳", v: "보호자 — 알림톡(받을 수 없는 번호는 문자) · 이메일 · 앱 알림 / 학생 — 앱 알림" },
              ]}
            />
          </Panel>

          <Panel title="기록" meta={`${view.log.length}건`}>
            <ul className="grid gap-1.5">
              {view.log.map((r) => (
                <li
                  key={r.at + r.what}
                  className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b border-(--a2-line) pb-1.5 last:border-b-0 last:pb-0"
                >
                  <span className="a2-mono a2-t-xs text-(--a2-ink-4)">{r.at}</span>
                  <Tag accent>{r.what}</Tag>
                  <span className="a2-t-sm text-(--a2-ink-2)">{r.why}</span>
                  <span className="ml-auto a2-t-xs text-(--a2-ink-4)">{r.by}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </Body>

      {dialog === "request" && <RequestDialog view={view} />}
      {dialog === "remind" && <RemindDialog view={view} />}
      {dialog === "extend" && <ExtendDialog view={view} />}
      {dialog === "return" && <ReturnDialog view={view} />}
    </ConsoleFrame>
  );
}

/** 학생이 올린 사진 — 요청한 뒤에는 다시 올라올 사진의 자리를 나란히 둔다 */
function Photos({ view }: { view: View }) {
  const { c, phase } = view;
  const asked = phase === "requested" || phase === "expired" || phase === "uploaded";

  const first = (
    <figure className="grid content-start gap-1.5">
      <span className="block overflow-hidden rounded-(--a2-radius) border border-(--a2-line) bg-(--a2-raised)">
        <AnswerPhoto look={c.look} />
      </span>
      <figcaption className="a2-t-xs text-(--a2-ink-4)">
        {asked && <b className="mr-1 text-(--a2-ink-2)">처음 올린 사진</b>}
        <span className="a2-mono">{c.firstAt}</span> · <span className="a2-mono">{c.size}</span>
      </figcaption>
    </figure>
  );

  return (
    <Panel title="학생이 올린 사진" meta={view.again ? "사진 2장 · 처음 올린 사진과 다시 올린 사진" : "사진 1장"} flush>
      <div className={`grid gap-3 px-3 py-3 ${asked ? "md:grid-cols-2" : "md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]"}`}>
        {first}
        {view.again ? (
          <figure className="grid content-start gap-1.5">
            <span className="block overflow-hidden rounded-(--a2-radius) border-2 border-(--a2-ok) bg-(--a2-raised)">
              <AnswerPhoto look="clear" />
            </span>
            <figcaption className="a2-t-xs text-(--a2-ink-4)">
              <b className="mr-1" style={{ color: "var(--a2-ok)" }}>
                다시 올린 사진
              </b>
              <span className="a2-mono">{view.again.at}</span> · <span className="a2-mono">{view.again.size}</span> · 보호자가
              알림톡의 링크로 올림
            </figcaption>
          </figure>
        ) : asked ? (
          <div className="grid min-h-40 place-items-center rounded-(--a2-radius) border border-dashed border-(--a2-line-2) bg-(--a2-raised) px-4 text-center">
            <span className="grid gap-1">
              <span className="a2-t-sm font-semibold text-(--a2-ink-2)">
                {phase === "expired" ? "기한까지 올라오지 않았습니다" : "아직 올라오지 않았습니다"}
              </span>
              <span className="a2-t-xs text-(--a2-ink-4)">올라오면 이 자리에 보이고, 응답은 채점 대기로 바로 돌아갑니다.</span>
            </span>
          </div>
        ) : (
          <p className="a2-hint self-start">
            아이가 올린 사진 그대로입니다. 운영자가 보기에도 읽을 수 없으면 보호자에게 다시 올려 달라고 요청하고, 읽을 수
            있으면 채점으로 돌려보냅니다.
          </p>
        )}
      </div>
      {view.again && (
        <p className="border-t border-(--a2-line) px-3 py-2 a2-t-xs text-(--a2-ink-3)">
          채점자가 두 사진을 나란히 보고 같은 종이인지 확인한 뒤 채점합니다.
        </p>
      )}
    </Panel>
  );
}

/** 알림 발송 내역 — 요청 · 다시 알림 · 기한을 늘렸다는 안내가 받는 사람 · 방법마다 한 줄 */
function Sends({ sends }: { sends: Send[] }) {
  return (
    <Panel title="알림 발송 내역" meta={`${sends.length}건`} flush>
      <div className="a2-table-wrap">
        <table className="a2-table">
          <thead>
            <tr>
              <th scope="col" style={{ width: "9.5rem" }}>
                보낸 때
              </th>
              <th scope="col">받는 사람</th>
              <th scope="col">알림</th>
              <th scope="col">방법</th>
              <th scope="col">결과</th>
            </tr>
          </thead>
          <tbody>
            {sends.map((s) => (
              <tr key={s.at + s.to + s.how}>
                <td className="a2-mono a2-nowrap a2-t-sm">{s.at}</td>
                <td className="a2-nowrap a2-td-key">{s.to}</td>
                <td>{s.what}</td>
                <td className="a2-nowrap">{s.how}</td>
                <td className="a2-nowrap">
                  {s.tone ? <Status tone={s.tone}>{s.result}</Status> : <span className="text-(--a2-ink-2)">{s.result}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

/* ───────────────────────── 창 ───────────────────────── */

/** 보낼 곳 — 알림톡 · 이메일 · 앱 알림 */
function Channels({ note }: { note?: string }) {
  return (
    <span className="a2-field block">
      <span className="a2-label">보낼 곳</span>
      <span className="flex flex-wrap gap-x-4 gap-y-1">
        {["알림톡", "이메일", "앱 알림"].map((m) => (
          <label key={m} className="a2-choice">
            <input type="checkbox" defaultChecked />
            {m}
          </label>
        ))}
      </span>
      <span className="a2-hint block">{note ?? "알림톡을 받을 수 없는 번호에는 같은 내용을 문자로 보냅니다."}</span>
    </span>
  );
}

function RequestDialog({ view }: { view: View }) {
  const { c } = view;
  return (
    <ConsoleDialog
      title={`${c.guardian} 님에게 사진을 다시 올려 달라고 요청합니다`}
      wide
      actions={
        <>
          <Link href={to(view.base)} className="a2-btn">
            취소
          </Link>
          <Link href={to("SC-2610-0164/requested")} className="a2-btn a2-btn-primary">
            요청 보내기
          </Link>
        </>
      }
    >
      <ul className="grid gap-0.5">
        <li>보호자에게 사진을 올릴 링크가 갑니다. 로그인하지 않고 휴대전화에서 바로 열 수 있습니다.</li>
        <li>학생 {c.student}의 대시보드 「내 진단」에도 요청이 표시됩니다.</li>
        <li>사진이 올라오면 이 응답은 채점 대기로 돌아가 {c.by} 채점자가 이어서 채점합니다.</li>
      </ul>
      <div className="mt-3 grid gap-2">
        <label className="a2-field block">
          <span className="a2-label">이유</span>
          <select className="a2-select" defaultValue={c.reason}>
            {unreadableReasons.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <label className="a2-field block">
          <span className="a2-label">보호자에게 보낼 말</span>
          <textarea className="a2-textarea" rows={3} defaultValue={photoFlow.request.message} />
          <span className="a2-hint block">
            이유를 고르면 기본 문장이 채워집니다. 답을 고치거나 새로 쓰지 말라는 안내와 다시 찍는 법은 따로 붙어 나갑니다.
          </span>
        </label>
        <label className="a2-field block">
          <span className="a2-label">올릴 기한</span>
          <select className="a2-select" defaultValue="3">
            <option value="3">3일 뒤 · 2026-10-17(토) 23:59까지</option>
            <option value="5">5일 뒤 · 2026-10-19(월) 23:59까지</option>
            <option value="7">7일 뒤 · 2026-10-21(수) 23:59까지</option>
          </select>
        </label>
        <Channels />
      </div>
      <p className="a2-hint mt-2">
        기한 하루 전 18:00까지 올라오지 않으면 같은 곳으로 한 번 더 알립니다. 기한이 지나면 「기한 지남」으로 옮겨집니다.
      </p>
    </ConsoleDialog>
  );
}

function RemindDialog({ view }: { view: View }) {
  const { c } = view;
  return (
    <ConsoleDialog
      title={`${c.guardian} 님에게 한 번 더 알립니다`}
      actions={
        <>
          <Link href={to(view.base)} className="a2-btn">
            취소
          </Link>
          <Link href={to(view.base)} className="a2-btn a2-btn-primary">
            다시 알리기
          </Link>
        </>
      }
    >
      <ul className="grid gap-0.5">
        <li>처음 요청과 같은 내용 · 같은 링크가 갑니다.</li>
        <li>
          기한은 그대로 <b className="text-(--a2-ink)">{view.ask?.due}</b>입니다.
        </li>
        <li>보낸 것은 알림 발송 내역에 한 줄씩 남습니다.</li>
      </ul>
      <div className="mt-3 grid gap-2">
        <Channels />
      </div>
    </ConsoleDialog>
  );
}

function ExtendDialog({ view }: { view: View }) {
  const { c } = view;
  return (
    <ConsoleDialog
      title="올릴 기한을 늘리고 다시 알립니다"
      actions={
        <>
          <Link href={to(view.base)} className="a2-btn">
            취소
          </Link>
          <Link href={to("SC-2610-0139/extended")} className="a2-btn a2-btn-primary">
            기한 늘리기
          </Link>
        </>
      }
    >
      <ul className="grid gap-0.5">
        <li>
          {c.guardian} 님이 받은 링크가 늘린 기한까지 다시 열립니다. 새로 보내는 링크도 같은 화면을 엽니다.
        </li>
        <li>늘린 기한과 링크를 보호자에게 다시 알립니다.</li>
      </ul>
      <div className="mt-3 grid gap-2">
        <label className="a2-field block">
          <span className="a2-label">새 기한</span>
          <select className="a2-select" defaultValue="3">
            <option value="3">오늘부터 3일 · 2026-10-17(토) 23:59까지</option>
            <option value="5">오늘부터 5일 · 2026-10-19(월) 23:59까지</option>
          </select>
        </label>
        <Channels note="보호자가 앞의 알림톡 두 건을 읽지 않았습니다. 받지 못하고 있다면 회원 상세의 연락처로 전화해 알려 주세요." />
      </div>
    </ConsoleDialog>
  );
}

function ReturnDialog({ view }: { view: View }) {
  const { c } = view;
  return (
    <ConsoleDialog
      title="다시 받지 않고 채점으로 돌려보냅니다"
      actions={
        <>
          <Link href={to(view.base)} className="a2-btn">
            취소
          </Link>
          <Link href={to(`${view.base}/returned`)} className="a2-btn a2-btn-primary">
            돌려보내기
          </Link>
        </>
      }
    >
      <ul className="grid gap-0.5">
        <li>
          응답이 채점 대기로 돌아가 {c.by} 채점자가 <b className="text-(--a2-ink)">지금 사진으로</b> 채점합니다.
        </li>
        <li>{blankish(c.reason) ? "빈 종이라 이 문항은 0점이 됩니다." : "글씨를 읽을 수 없으면 이 문항은 0점이 됩니다."}</li>
        <li>돌려보낸 사람과 시각, 사유가 기록에 남습니다.</li>
      </ul>
      <div className="mt-3 grid gap-2">
        <label className="a2-field block">
          <span className="a2-label">사유</span>
          <select className="a2-select" defaultValue={c.reason}>
            {[...unreadableReasons, "기한이 지났습니다", "운영자가 보니 읽을 수 있습니다"].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <label className="a2-choice">
          <input type="checkbox" defaultChecked={!blankish(c.reason)} />
          보호자에게 지금 사진으로 채점한다고 알립니다
        </label>
      </div>
      <p className="a2-hint mt-2">빈 종이 · 문항과 관계없는 사진은 다시 받지 않습니다. 다시 받으면 답을 새로 쓸 수 있게 됩니다.</p>
    </ConsoleDialog>
  );
}
