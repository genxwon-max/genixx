"use client";

import Link from "next/link";
import { permissionIds, permissionLabel, roleOf, type StaffRoleId } from "@/lib/admin";
import { WEEK_KO } from "@/lib/calendar";
import { counselModes, counselTopics, counselors, spanLabel } from "@/lib/counselors";
import { designLinks } from "@/lib/designScreens";
import { dutyLabel, expertDuties, type ExpertDuty } from "@/lib/expertAccounts";
import DataTable, { type Col, type Filter } from "@/components/admin2/DataTable";
import { Body, DescList, FormRow, PageHead, Panel, Status, Tab, Tag } from "@/components/admin2/ui";
import ConsoleFrame from "../ConsoleFrame";

/**
 * 운영자·권한 — 연결된 상담사 프로필
 * (실제 주소 /admin2/staff · /admin2/staff/[id] · WBS L.2.16) — 디자인.
 *
 * 콘솔에 들어오는 사람은 최상위 관리자 한 명과, 사이트에서 전문가로 가입해 가입 승인에서 권한을 받은
 * 전문가 회원이다. 운영자를 따로 등록하는 화면은 없다. 그래서 목록의 한 줄은 전문가 계정이고,
 * 「역할」 칸에는 가입 승인에서 받은 권한(출제자 · 검토자 · 진단 위원 · 상담사)을 적는다.
 *
 * 더한 것은 둘이다.
 *  · 목록 — 「상담사 프로필」 칸. 상담사 권한을 받은 계정과, 그 프로필이 노출 중인지가 표에서 보인다.
 *  · 상세 — 「연결된 상담사 프로필」 판. 상담사 권한을 받으면 상담사 관리의 프로필이 이 계정에 연결된다.
 *    사진 · 이름 · 직함 · 담당 상담 주제 · 공개 여부 · 이번 주 배정 · 가능 시간을 요약하고 상담사 상세로
 *    보낸다. 프로필이 숨김이면 왜 보이지 않는지와 무엇을 채워야 보이는지를 적는다.
 *
 * 나머지는 실제 화면 그대로다. 달라진 것은 상세의 「역할」 한 줄뿐이다 — 넷 가운데 하나를 고르던 칸을
 * 받은 권한을 읽기만 하는 줄로 바꾸고, 수정은 가입 승인으로 보낸다. 권한 열여덟 칸의 기본값은 실제
 * 콘솔이 전문가를 들일 때 쓰는 역할 짝(lib/expertConsole.ts)을 따른다.
 */

const to = designLinks("staff-counselor");
const AT = "/admin2/staff";
const APPROVALS = "/design/admin2/approvals/approved";
const COUNSELOR = "/design/admin2/counselors/kim-jiwon";
const noop = () => {};
const dash = <span className="a2-t-sm text-(--a2-ink-4)">—</span>;

type Row = {
  id: string;
  name: string;
  /** 콘솔 로그인 아이디 — 간편가입 계정은 아이디가 없어 가입 수단을 적는다 */
  login: string;
  social?: boolean;
  /** 가입 승인에서 받은 권한. 빈 배열은 최상위 관리자다 */
  duties: ExpertDuty[];
  /** 연결된 상담사 프로필이 보호자에게 보이는가 — 상담사 권한이 없으면 null */
  profile: "shown" | "hidden" | null;
  lastSeen: string;
};

const rows: Row[] = [
  { id: "U-01", name: "박서준", login: "admin.park", duties: [], profile: null, lastSeen: "방금" },
  { id: "EX-2610-004", name: "한지수", login: "ex.jisu_han", duties: ["author", "counselor"], profile: "hidden", lastSeen: "18분 전" },
  { id: "EX-2609-004", name: "서민정", login: "ex.seo_mj", duties: ["grader", "counselor"], profile: "shown", lastSeen: "1시간 전" },
  { id: "EX-2609-003", name: "윤대현", login: "ex.yoon_dh", duties: ["reviewer"], profile: null, lastSeen: "어제" },
  { id: "EX-2609-002", name: "최은비", login: "구글 간편가입", social: true, duties: ["author"], profile: null, lastSeen: "3시간 전" },
  { id: "EX-2609-001", name: "김지원", login: "ex.expert_kim", duties: ["grader", "counselor"], profile: "shown", lastSeen: "12분 전" },
  { id: "EX-2608-003", name: "임도윤", login: "ex.im_dy", duties: ["grader", "counselor"], profile: "shown", lastSeen: "어제" },
  { id: "EX-2608-002", name: "이서연", login: "ex.lee_sy", duties: ["reviewer", "counselor"], profile: "shown", lastSeen: "2026-10-08" },
  { id: "EX-2608-001", name: "박현우", login: "네이버 간편가입", social: true, duties: ["counselor"], profile: "shown", lastSeen: "2026-10-09" },
];

const SUPER = "최상위 관리자";
const profileLabel = { shown: "노출 중", hidden: "숨김" } as const;

/** 받은 권한 → 콘솔 역할. 진단 위원과 상담사는 마스터의 권한으로 들어온다 */
const roleOfDuty: Record<ExpertDuty, StaffRoleId> = {
  author: "author",
  reviewer: "reviewer",
  grader: "master",
  counselor: "master",
};

/** 이 계정의 권한 열여덟 칸 가운데 켜진 것 — 최상위 관리자는 전부다 */
const permsOf = (duties: ExpertDuty[]) =>
  duties.length === 0
    ? permissionIds
    : permissionIds.filter((p) => duties.some((d) => roleOf(roleOfDuty[d]).permissions.includes(p)));

/** 목록에서 누르면 가는 곳 — 예시 계정 둘로 굳혔다. 최상위 관리자는 「내 정보」에서 스스로 관리한다 */
const hrefOf = (r: Row) =>
  r.duties.length === 0
    ? "/design/admin2/me"
    : r.profile === "hidden"
      ? to("EX-2609-001/hidden")
      : r.profile
        ? to("EX-2609-001")
        : to("EX-2609-002");

const cols: Col<Row>[] = [
  {
    key: "id",
    detail: true,
    head: "계정 ID",
    value: (r) => r.id,
    cell: (r) => <span className="a2-mono">{r.id}</span>,
  },
  {
    key: "login",
    head: "로그인 아이디",
    width: "10rem",
    nowrap: true,
    value: (r) => r.login,
    cell: (r) =>
      r.social ? (
        <span className="a2-t-sm text-(--a2-ink-3)">{r.login}</span>
      ) : (
        <span className="a2-mono a2-t-sm">{r.login}</span>
      ),
  },
  {
    key: "name",
    head: "이름",
    width: "5.5rem",
    nowrap: true,
    value: (r) => r.name,
    /* 표의 한 줄 어디를 눌러도 이 링크가 대신 눌린다(DataTable의 rowLink) */
    cell: (r) => (
      <Link href={hrefOf(r)} className="font-semibold text-(--a2-ink)">
        {r.name}
      </Link>
    ),
  },
  {
    /* 실제 화면처럼 역할 옆에 지금 켜진 권한 수를 적는다 */
    key: "role",
    head: "역할",
    nowrap: true,
    value: (r) => (r.duties.length ? r.duties.map(dutyLabel).join(" ") : SUPER),
    cell: (r) => (
      <span className="inline-flex items-center gap-2">
        {r.duties.length ? r.duties.map((d) => <Tag key={d}>{dutyLabel(d)}</Tag>) : <Tag accent>{SUPER}</Tag>}
        <span className="a2-num a2-t-xs text-(--a2-ink-4)">{permsOf(r.duties).length}</span>
      </span>
    ),
  },
  {
    key: "profile",
    head: "상담사 프로필",
    width: "8rem",
    nowrap: true,
    value: (r) => (r.profile ? profileLabel[r.profile] : ""),
    cell: (r) =>
      r.profile ? <Status tone={r.profile === "shown" ? "ok" : "warn"}>{profileLabel[r.profile]}</Status> : dash,
  },
  {
    key: "state",
    head: "상태",
    width: "5.5rem",
    nowrap: true,
    value: () => "활성",
    cell: () => <Status tone="ok">활성</Status>,
  },
  {
    key: "lastSeen",
    head: "최근 접속",
    width: "6.5rem",
    nowrap: true,
    cell: (r) => <span className="a2-mono a2-t-sm">{r.lastSeen}</span>,
  },
];

const filters: Filter<Row>[] = [
  {
    id: "role",
    label: "역할",
    options: [{ value: "super", label: SUPER }, ...expertDuties.map((d) => ({ value: d.id, label: d.label }))],
    match: (r, v) => (v === "super" ? r.duties.length === 0 : r.duties.includes(v as ExpertDuty)),
  },
];

export default function StaffCounselor({ state }: { state: string }) {
  return state === "" ? <List /> : <Detail slug={state} />;
}

/* ───────────────────────── 목록 ───────────────────────── */

function List() {
  return (
    <ConsoleFrame at={AT}>
      <PageHead
        title="운영자·권한"
        tabsLabel="계정 상태별 조회 조건"
        tabs={
          <>
            <Tab label="전체" count={rows.length} active onClick={noop} />
            <Tab label="활성" count={rows.length} active={false} onClick={noop} />
            <Tab label="정지·휴면" count={0} active={false} onClick={noop} />
            <Tab label="2단계 미설정" count={0} active={false} onClick={noop} />
          </>
        }
        actions={
          <>
            <Link href="/admin2/staff/roles" className="a2-btn a2-btn-primary">
              화면 권한
            </Link>
            <Link href="/design/admin2/audit" className="a2-btn">
              감사 로그
            </Link>
          </>
        }
      />
      <DataTable
        rows={rows}
        cols={cols}
        filters={filters}
        getKey={(r) => r.id}
        rowLink
        pageSize={50}
        searchHint="이름 · 계정 ID · 로그인 아이디"
        empty="조건에 맞는 운영자가 없습니다."
        showCount={false}
      />
    </ConsoleFrame>
  );
}

/* ───────────────────────── 상세 ───────────────────────── */

type Account = {
  id: string;
  name: string;
  /** 콘솔 로그인 아이디 — 간편가입 계정은 없다 */
  login: string | null;
  via: string;
  org: string;
  lastSeen: string;
  approved: string;
  duties: ExpertDuty[];
  /** 받은 권한으로 열리는 콘솔 화면 수 */
  screens: number;
};

const kim: Account = {
  id: "EX-2609-001",
  name: "김지원",
  login: "ex.expert_kim",
  via: "아이디 가입",
  org: "GENIXX 재능연구소",
  lastSeen: "12분 전",
  approved: "2026-09-19 09:30",
  duties: ["grader", "counselor"],
  screens: 4,
};

const choi: Account = {
  id: "EX-2609-002",
  name: "최은비",
  login: null,
  via: "구글 간편가입",
  org: "GENIXX 문항개발팀",
  lastSeen: "3시간 전",
  approved: "2026-09-19 09:34",
  duties: ["author"],
  screens: 2,
};

/** 화면 권한 그룹 — 전문가 계정에는 받은 권한의 이름으로 된 그룹이 붙는다 */
const groups = ["전문가 · 출제자 · 화면 2개", "전문가 · 검토자 · 화면 2개", "전문가 · 진단 위원 · 상담사 · 화면 4개"];

/** 연결된 상담사 프로필 — 상담사 명단(lib/counselors.ts)의 김지원 줄 */
const linked = counselors.find((c) => c.id === "kim-jiwon")!;

/** 프로필이 보호자에게 보이려면 채워야 하는 것 — 숨김 상태에서 하나씩 짚는다 */
const needs = [
  { k: "이름 · 직함", ok: true, v: "본인이 「내 정보」에 입력했습니다." },
  { k: "면담 길이 · 방식", ok: true, v: "30분 · 화상 — 프로필이 만들어질 때 들어가는 기본값입니다." },
  { k: "담당 상담 주제", ok: false, v: "하나 이상 골라야 합니다. 상담사 상세의 「면담」에서 고릅니다." },
  {
    k: "근무 요일 · 시간",
    ok: false,
    v: "아직 정하지 않았습니다. 상담사 본인이 「내 상담 일정」에서, 또는 운영자가 상담사 상세의 「근무」에서 정합니다.",
  },
  { k: "노출", ok: false, v: "꺼져 있습니다. 위 항목을 채운 뒤 상담사 상세의 「면담」에서 켭니다." },
];

function Detail({ slug }: { slug: string }) {
  const a = slug === "EX-2609-002" ? choi : kim;
  const hidden = slug === "EX-2609-001/hidden";
  const perms = permsOf(a.duties);
  const group = groups.find((g) => g.startsWith(`전문가 · ${a.duties.map(dutyLabel).join(" · ")} ·`));

  return (
    <ConsoleFrame at={AT}>
      <PageHead
        title={a.name}
        back={
          <Link href={to()} className="a2-btn">
            ← 운영자·권한
          </Link>
        }
        actions={
          <>
            <Status tone="ok">활성</Status>
            <Link href="/design/admin2/audit" className="a2-btn">
              감사 로그
            </Link>
          </>
        }
      />

      <Body className="grid gap-3">
        <Panel title="계정" meta={a.id} flush>
          <div className="px-3 py-2.5">
            <DescList
              rows={[
                {
                  k: "로그인 아이디",
                  v: a.login ? (
                    <>
                      <span className="a2-mono">{a.login}</span> · {a.via}
                    </>
                  ) : (
                    `${a.via} · 아이디를 쓰지 않습니다`
                  ),
                },
                { k: "소속", v: a.org },
                { k: "최근 접속", v: <span className="a2-mono">{a.lastSeen}</span> },
                {
                  k: "가입 승인",
                  v: (
                    <>
                      <span className="a2-mono">{a.approved}</span> · 박서준
                    </>
                  ),
                },
              ]}
            />
          </div>
        </Panel>

        {/* ── 연결된 상담사 프로필 — 새로 더한 판 ── */}
        {a.duties.includes("counselor") ? (
          <Panel
            title="연결된 상담사 프로필"
            meta={linked.id}
            actions={
              <Link href={COUNSELOR} className={`a2-btn a2-btn-sm ${hidden ? "a2-btn-primary" : ""}`}>
                상담사 상세 열기
              </Link>
            }
          >
            {hidden && (
              <p className="a2-note mb-3" style={{ borderLeftColor: "var(--a2-warn)" }}>
                <span>
                  <b className="text-(--a2-ink)">이 상담사는 지금 보호자에게 보이지 않습니다.</b> 공개 사이트의 상담
                  전문가 소개와 면담 신청 화면에 표시되지 않고, 추천 목록과 자동 배정에서도 빠집니다. 아래에서
                  「필요」로 표시된 항목을 채우고 노출을 켜면 표시됩니다.
                </span>
              </p>
            )}
            <div className="flex flex-wrap items-start gap-3">
              {/* 사진 자리 — 본인이 「내 정보」에서 올린 사진이 들어온다. 없으면 이름 첫 글자 */}
              <span
                role="img"
                aria-label="프로필 사진 없음"
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-(--a2-radius) border border-(--a2-line) bg-(--a2-bg) a2-t-sm font-bold text-(--a2-ink-3)"
              >
                {a.name.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <DescList
                  rows={[
                    {
                      k: "이름 · 직함",
                      v: (
                        <>
                          <b>{linked.person.name}</b> · {linked.person.role}
                        </>
                      ),
                    },
                    {
                      k: "담당 상담 주제",
                      v: hidden ? (
                        <span className="text-(--a2-ink-4)">아직 고르지 않았습니다</span>
                      ) : (
                        linked.topics.map((t) => counselTopics[t]).join(", ")
                      ),
                    },
                    {
                      k: "공개 여부",
                      v: (
                        <span className="flex flex-wrap items-baseline gap-x-2">
                          <Status tone={hidden ? "warn" : "ok"}>{hidden ? "숨김" : "노출 중"}</Status>
                          <span className="text-(--a2-ink-3)">
                            상담 전문가 소개와 면담 신청 화면에 {hidden ? "표시되지 않습니다" : "표시됩니다"}
                          </span>
                        </span>
                      ),
                    },
                    {
                      k: "이번 주 배정",
                      v: hidden ? (
                        <span className="text-(--a2-ink-4)">0건 — 숨김 상태에서는 배정되지 않습니다</span>
                      ) : (
                        <>
                          <span className="a2-num">3</span>건 · 남은 가능 시간 21시간 30분{" "}
                          <span className="a2-mono a2-t-xs text-(--a2-ink-4)">10.11 – 10.17</span>
                        </>
                      ),
                    },
                    {
                      k: "가능 시간",
                      v: hidden ? (
                        <span className="text-(--a2-ink-4)">아직 정하지 않았습니다</span>
                      ) : (
                        <>
                          {linked.days.map((d) => WEEK_KO[d]).join(" · ")}{" "}
                          <span className="a2-mono">
                            {linked.from}–{linked.to}
                          </span>{" "}
                          <span className="text-(--a2-ink-3)">
                            (상담 제외 {linked.off[0]}–{linked.off[1]}) · {linked.spans.map(spanLabel).join(" · ")} ·{" "}
                            {linked.modes.map((m) => counselModes[m]).join(" · ")}
                          </span>
                        </>
                      ),
                    },
                  ]}
                />
              </div>
            </div>

            {hidden && (
              <ul className="mt-3 grid gap-1.5 border-t border-(--a2-line) pt-3">
                {needs.map((n) => (
                  <li key={n.k} className="grid grid-cols-[2.5rem_8rem_1fr] items-baseline gap-x-2">
                    <Status tone={n.ok ? "ok" : "warn"}>{n.ok ? "완료" : "필요"}</Status>
                    <b className="a2-t-sm text-(--a2-ink)">{n.k}</b>
                    <span className="a2-t-sm text-(--a2-ink-2)">{n.v}</span>
                  </li>
                ))}
              </ul>
            )}

            <p className="a2-hint mt-2">
              상담사 권한을 받으면 상담사 프로필이 숨김 상태로 만들어져 이 계정에 연결됩니다. 사진 · 직함 · 소개는
              본인이 「내 정보」에서 수정하고, 담당 상담 주제 · 면담 비용 · 근무 · 휴무일 · 노출은 상담사 상세에서
              수정합니다.
            </p>
          </Panel>
        ) : (
          <Panel title="연결된 상담사 프로필">
            <p className="a2-t-sm text-(--a2-ink-2)">
              이 계정에는 <b className="text-(--a2-ink)">상담사 권한이 없어</b> 연결된 상담사 프로필이 없습니다.
            </p>
            <p className="a2-hint">
              상담사 권한은 가입 승인에서 줍니다. 권한을 주면 상담사 프로필이 숨김 상태로 만들어져 이 계정에
              연결되고, 프로필을 채워 노출을 켜면 보호자의 면담 신청 화면에 표시됩니다.
            </p>
            <div className="mt-3">
              <Link href={APPROVALS} className="a2-btn">
                가입 승인 열기
              </Link>
            </div>
          </Panel>
        )}

        {/* ── 아래 둘과 저장 줄은 실제 화면 그대로. 「역할」 줄만 읽기로 바뀌었다 ── */}
        <Panel
          title="역할·권한"
          lead
          actions={
            <button type="button" className="a2-btn a2-btn-sm" disabled>
              역할 기본값으로
            </button>
          }
          flush
        >
          <div className="a2-form">
            <FormRow
              label="역할"
              hint="전문가 계정의 역할은 가입 승인에서 받은 권한입니다. 승인한 뒤에도 가입 승인에서 수정합니다."
            >
              <span className="inline-flex items-center gap-2">
                {a.duties.map((d) => (
                  <Tag key={d}>{dutyLabel(d)}</Tag>
                ))}
              </span>
              <Link href={APPROVALS} className="a2-btn a2-btn-sm">
                가입 승인에서 수정
              </Link>
            </FormRow>
            <FormRow label="권한">
              <div className="grid w-full gap-x-6 lg:grid-cols-2">
                {permissionIds.map((p) => {
                  const on = perms.includes(p);
                  return (
                    <label
                      key={p}
                      className="flex min-w-0 items-center gap-2 border-b border-(--a2-line) py-1.5"
                      title={p}
                    >
                      <input type="checkbox" defaultChecked={on} />
                      <span
                        className={`truncate a2-t-sm ${on ? "font-semibold text-(--a2-ink)" : "text-(--a2-ink-4)"}`}
                      >
                        {permissionLabel[p]}
                      </span>
                      <span className="a2-mono truncate a2-t-xs text-(--a2-ink-4) max-sm:hidden">{p}</span>
                    </label>
                  );
                })}
              </div>
            </FormRow>
          </div>
        </Panel>

        <Panel
          title="콘솔 화면 권한"
          actions={
            <Link href="/admin2/staff/roles" className="a2-btn a2-btn-sm">
              화면 권한 관리
            </Link>
          }
          flush
        >
          <div className="a2-form">
            <FormRow label="화면 권한 그룹" hint={`고른 화면 ${a.screens}개만 콘솔 메뉴에 보입니다.`}>
              <select aria-label="화면 권한 그룹" className="a2-select" defaultValue={group}>
                <option value="">없음</option>
                {groups.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </FormRow>
          </div>
        </Panel>

        {/* 저장 줄 — 권한 칸을 손대면 켜진다 */}
        <div className="sticky bottom-0 z-10 -mx-3 mt-3 border-t border-(--a2-line) bg-(--a2-panel)/95 px-3 py-2.5 backdrop-blur">
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <button type="button" className="a2-btn" disabled>
              취소
            </button>
            <button type="button" className="a2-btn a2-btn-primary" disabled>
              저장
            </button>
          </div>
        </div>
      </Body>
    </ConsoleFrame>
  );
}
