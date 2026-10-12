"use client";

import Link from "next/link";
import { accessReasons } from "@/lib/admin";
import { designLinks } from "@/lib/designScreens";
import DataTable, { type Col, type Filter } from "@/components/admin2/DataTable";
import { Body, DescList, PageHead, Panel, Tab, Tag } from "@/components/admin2/ui";
import ConsoleFrame from "../ConsoleFrame";

/**
 * 감사 로그 · 면담과 전문가 활동 기록 (실제 주소 /admin2/audit · WBS K.1.6 「신규 기능 활동 기록」) — 디자인.
 *
 * 지금의 감사 로그(app/(admin2)/admin2/audit — AuditView · AuditTable)를 값만 적어 넣은 사본으로
 * 옮기고, 새 기능에서 남는 기록을 더했다. 표의 칸과 차례는 그대로다
 * (로그 ID · 시각 · 행위자 · 역할 · 동작 · 대상 · 사유 · IP).
 *
 * ── 더한 것 ──
 *  · 면담 기록 — 상담사 배정 · 자동 배정 · 일정 변경 · 알림 발송 · 결과 기록 제출 · 보완 요청 ·
 *    승인과 종료 · 휴무일 등록 · 면담 설정 변경 · 면담 상품 수정 · 상담일지 열람.
 *  · 전문가 활동 기록 — 가입 승인과 권한 부여 · 권한 수정 · 전문가 로그인 · 문항 출제 · 문항 검수 ·
 *    진단 채점.
 *  · 탭 둘(면담 · 전문가 활동). 한 기록은 「면담 · 전문가 활동 · 그 외」 가운데 한 곳에만 들어가고,
 *    「개인정보 열람」은 지금처럼 사유가 적힌 기록을 세 분류에 걸쳐 모은다. 상담일지 열람은 사유를
 *    받는 기록이라 면담 탭과 개인정보 열람 탭에 함께 표시된다.
 *  · 표 아래 「기록 분류」 판과, 표준 열람 사유 둘(상담일지를 열 때 고르는 값).
 *
 * ── 누가 남기나 ──
 * 콘솔에서 일하는 사람은 최상위 관리자(박서준)와, 전문가로 가입해 권한을 받은 사람들이다.
 * 역할 칸에는 그 동작을 할 때의 권한을 적는다 — 한 사람이 상담사와 진단 위원을 함께 맡으면
 * 동작에 따라 다르게 적힌다. 로그인처럼 권한과 관계없는 동작은 「전문가」, 시스템이 스스로 한 일
 * (자동 배정 · 자동 알림)은 「자동 처리」다.
 *
 * 실제 화면의 「이 브라우저에서 한 동작」 판은 브라우저 저장소를 읽는 것이라 디자인에는 넣지 않았다.
 */

const to = designLinks("audit-interview");
const noop = () => {};

type Role = "최상위 관리자" | "전문가" | "출제자" | "검토자" | "진단 위원" | "상담사" | "자동 처리";
const roleOrder: Role[] = ["최상위 관리자", "전문가", "출제자", "검토자", "진단 위원", "상담사", "자동 처리"];

/** 기록이 들어가는 분류 — 탭 셋(면담 · 전문가 활동 · 그 외)이 이것으로 갈린다 */
type Group = "interview" | "expert" | "rest";

type Row = {
  id: string;
  at: string;
  actor: string;
  role: Role;
  group: Group;
  action: string;
  target: string;
  /** 개인정보를 열 때 입력해야 하는 사유. 사유가 있는 기록이 곧 개인정보 열람 기록이다 */
  reason: string | null;
  ip: string;
};

const ADMIN_IP = "121.134.20.18";
const KIM_IP = "211.36.142.57";
const SEO_IP = "175.209.88.14";
const YOON_IP = "112.169.77.9";

/** 최근 것이 위로. 면담 CS-2610-0012의 기록은 면담 결과 기록 화면(L.2.12)의 시각과 같다 */
const log: Row[] = [
  { id: "L-93142", at: "2026-10-12 15:42:10", actor: "박서준", role: "최상위 관리자", group: "expert", action: "전문가 권한 수정", target: "한지수 (EX-2610-004) · 진단 위원 추가 → 출제자 · 진단 위원 · 상담사", reason: null, ip: ADMIN_IP },
  { id: "L-93141", at: "2026-10-12 15:20:33", actor: "김지원", role: "상담사", group: "interview", action: "상담일지 열람", target: "CS-2610-0031 결과 기록 (2026-10-06 면담)", reason: "면담 준비 — 같은 학생의 다음 면담을 앞두고 지난 상담 내용 확인", ip: KIM_IP },
  { id: "L-93140", at: "2026-10-12 14:55:02", actor: "시스템", role: "자동 처리", group: "interview", action: "상담사 자동 배정", target: "CS-2610-0088 → 서민정 · 분야 일치 · 10.16(금) 16:00 가능 · 이번 주 배정 2건", reason: null, ip: "—" },
  { id: "L-93139", at: "2026-10-12 14:31:49", actor: "시스템", role: "자동 처리", group: "interview", action: "면담 알림 발송", target: "CS-2610-0086 · 상담사 배정 안내 · 보호자(알림톡) · 상담사(앱 알림)", reason: null, ip: "—" },
  { id: "L-93138", at: "2026-10-12 14:31:47", actor: "박서준", role: "최상위 관리자", group: "interview", action: "상담사 배정", target: "CS-2610-0086 → 김지원 · 신청자가 관리자 배정을 요청", reason: null, ip: ADMIN_IP },
  { id: "L-93137", at: "2026-10-12 13:48:15", actor: "서민정", role: "진단 위원", group: "expert", action: "진단 채점", target: "SC-0733-M2 · 초4 수학 서술형 · AI 제안 3점 → 4점으로 확정", reason: null, ip: SEO_IP },
  { id: "L-93136", at: "2026-10-12 13:40:29", actor: "서민정", role: "진단 위원", group: "expert", action: "학생 개인정보 열람", target: "C-2610-0733 (응시번호 0733)", reason: "서술형 응답 해석을 위해 학년·생년월일 확인", ip: SEO_IP },
  { id: "L-93135", at: "2026-10-12 13:36:04", actor: "서민정", role: "전문가", group: "expert", action: "전문가 로그인", target: "seo_mj · 2단계 인증(문자)", reason: null, ip: SEO_IP },
  { id: "L-93134", at: "2026-10-12 11:18:52", actor: "윤대현", role: "검토자", group: "expert", action: "문항 검수 반려", target: "IT-2641 (MAT-4-031) · 정답이 둘 이상이거나 불분명", reason: null, ip: YOON_IP },
  { id: "L-93133", at: "2026-10-12 11:02:37", actor: "윤대현", role: "검토자", group: "expert", action: "문항 검수 승인", target: "IT-2638 (KOR-3-027)", reason: null, ip: YOON_IP },
  { id: "L-93132", at: "2026-10-12 10:47:19", actor: "최은비", role: "출제자", group: "expert", action: "문항 출제", target: "IT-2644 (SCI-4-012) · 검수 요청", reason: null, ip: "58.142.31.206" },
  { id: "L-93131", at: "2026-10-12 10:31:08", actor: "한지수", role: "전문가", group: "expert", action: "전문가 로그인", target: "jisu_han · 가입 승인 뒤 첫 로그인 · 2단계 인증(문자)", reason: null, ip: "220.76.105.33" },
  { id: "L-93130", at: "2026-10-12 10:05:14", actor: "박서준", role: "최상위 관리자", group: "expert", action: "전문가 가입 승인", target: "한지수 (EX-2610-004) · 권한 부여: 출제자 · 상담사", reason: null, ip: ADMIN_IP },
  { id: "L-93129", at: "2026-10-12 09:41:57", actor: "시스템", role: "자동 처리", group: "interview", action: "면담 알림 발송", target: "CS-2610-0047 · 일정 변경 안내 · 보호자(알림톡 · 이메일) · 상담사(앱 알림)", reason: null, ip: "—" },
  { id: "L-93128", at: "2026-10-12 09:41:55", actor: "박서준", role: "최상위 관리자", group: "interview", action: "면담 일정 변경", target: "CS-2610-0047 · 10.14(수) 15:00 → 10.16(금) 10:00 · 상담사 요청", reason: null, ip: ADMIN_IP },
  { id: "L-93127", at: "2026-10-12 09:12:40", actor: "박서준", role: "최상위 관리자", group: "rest", action: "관리자 로그인", target: "admin.park · 2단계 인증(인증 앱)", reason: null, ip: ADMIN_IP },
  { id: "L-93126", at: "2026-10-11 16:02:11", actor: "서민정", role: "상담사", group: "interview", action: "휴무일 등록", target: "서민정 · 2026-10-24(토) 종일 · 그날 잡힌 면담 0건", reason: null, ip: SEO_IP },
  { id: "L-93125", at: "2026-10-11 11:30:12", actor: "박서준", role: "최상위 관리자", group: "interview", action: "면담 알림 발송", target: "CS-2610-0052 · 입장 안내 다시 보내기 · 보호자(문자)", reason: null, ip: ADMIN_IP },
  { id: "L-93124", at: "2026-10-11 09:57:31", actor: "박서준", role: "최상위 관리자", group: "rest", action: "리포트 발행 승인", target: "2026 3분기 초4 진단 · 41건", reason: null, ip: ADMIN_IP },
  { id: "L-93123", at: "2026-10-10 17:20:05", actor: "박서준", role: "최상위 관리자", group: "interview", action: "면담 설정 변경", target: "상담사 자동 배정: 끔 → 켬", reason: null, ip: ADMIN_IP },
  { id: "L-93122", at: "2026-10-10 10:24:36", actor: "박서준", role: "최상위 관리자", group: "interview", action: "결과 기록 보완 요청", target: "CS-2610-0008 · 상담사 서민정 · 권고 사항이 구체적이지 않음", reason: null, ip: ADMIN_IP },
  { id: "L-93121", at: "2026-10-09 11:05:02", actor: "박서준", role: "최상위 관리자", group: "interview", action: "면담 승인 · 종료", target: "CS-2610-0012 · 상담사 김지원", reason: null, ip: ADMIN_IP },
  { id: "L-93120", at: "2026-10-09 11:02:48", actor: "박서준", role: "최상위 관리자", group: "interview", action: "상담일지 열람", target: "CS-2610-0012 결과 기록 (2026-10-08 면담)", reason: "결과 기록 승인 전 확인", ip: ADMIN_IP },
  { id: "L-93119", at: "2026-10-08 16:20:17", actor: "김지원", role: "상담사", group: "interview", action: "결과 기록 제출", target: "CS-2610-0012 · 기한(10.09 15:00) 안에 제출", reason: null, ip: KIM_IP },
  { id: "L-93118", at: "2026-10-08 09:48:21", actor: "박서준", role: "최상위 관리자", group: "rest", action: "문의 답변 발송", target: "IQ-26100709", reason: null, ip: ADMIN_IP },
  { id: "L-93117", at: "2026-10-08 09:44:10", actor: "박서준", role: "최상위 관리자", group: "rest", action: "접속코드 재발급", target: "S-200417 (서울한빛초등학교 3학년)", reason: "보호자 분실 신고 접수 (IQ-26100709)", ip: ADMIN_IP },
  { id: "L-93116", at: "2026-10-07 17:12:36", actor: "박서준", role: "최상위 관리자", group: "rest", action: "개인정보 파기 실행", target: "M-100512 (동의 철회 요청)", reason: "정보주체 파기 요청 — 처리 결과 통지 완료", ip: ADMIN_IP },
  { id: "L-93115", at: "2026-10-02 14:06:28", actor: "박서준", role: "최상위 관리자", group: "interview", action: "면담 상품 수정", target: "CP-03 진로 · 심화 면담 120분 · 노출 → 숨김", reason: null, ip: ADMIN_IP },
];

/** 상담일지를 열 때 고르는 사유 — 지금의 표준 사유 다섯에 더한다 */
const counselReasons = ["면담 준비", "결과 기록 승인 전 확인"];

type TabId = "all" | "pii" | "interview" | "expert" | "rest";

const tabs: { id: TabId; label: string; match: (r: Row) => boolean; empty: string; slug?: string }[] = [
  { id: "all", label: "전체", match: () => true, empty: "조건에 맞는 기록이 없습니다.", slug: "" },
  { id: "pii", label: "개인정보 열람", match: (r) => r.reason !== null, empty: "개인정보 열람 기록이 없습니다." },
  { id: "interview", label: "면담", match: (r) => r.group === "interview", empty: "면담 기록이 없습니다.", slug: "interview" },
  { id: "expert", label: "전문가 활동", match: (r) => r.group === "expert", empty: "전문가 활동 기록이 없습니다.", slug: "expert" },
  { id: "rest", label: "그 외", match: (r) => r.group === "rest", empty: "그 밖의 기록이 없습니다." },
];

/* 칸과 차례는 실제 표(AuditTable) 그대로다. 역할 칸만 이름이 길어져(최상위 관리자) 폭을 넓혔다 */
const cols: Col<Row>[] = [
  {
    key: "id",
    head: "로그 ID",
    width: "5.5rem",
    nowrap: true,
    value: (r) => r.id,
    cell: (r) => <span className="a2-mono">{r.id}</span>,
  },
  {
    key: "at",
    head: "시각",
    width: "9.5rem",
    nowrap: true,
    value: (r) => r.at,
    cell: (r) => <span className="a2-mono a2-t-sm">{r.at}</span>,
  },
  {
    key: "actor",
    head: "행위자",
    width: "5rem",
    nowrap: true,
    value: (r) => r.actor,
    cell: (r) => <span className="font-semibold text-(--a2-ink)">{r.actor}</span>,
  },
  {
    key: "role",
    head: "역할",
    width: "6.5rem",
    nowrap: true,
    hide: "sm",
    cell: (r) => <Tag>{r.role}</Tag>,
  },
  {
    key: "action",
    head: "동작",
    width: "10rem",
    nowrap: true,
    value: (r) => r.action,
    cell: (r) => (
      <span className="text-(--a2-ink)">
        {r.reason && (
          <span
            role="img"
            aria-label="개인정보 열람 — 사유가 기록된 항목"
            title="개인정보 열람 — 사유가 기록된 항목"
            className="a2-dot mr-1.5 inline-block align-middle"
            style={{ color: "var(--a2-warn)" }}
          />
        )}
        {r.action}
      </span>
    ),
  },
  {
    key: "target",
    head: "대상",
    width: "16rem",
    clip: true,
    value: (r) => r.target,
    cell: (r) => (
      <span className="a2-t-sm" title={r.target}>
        {r.target}
      </span>
    ),
  },
  {
    key: "reason",
    head: "사유",
    width: "20rem",
    clip: true,
    value: (r) => r.reason ?? "",
    cell: (r) =>
      r.reason ? (
        <span className="a2-t-sm text-(--a2-ink)" title={r.reason}>
          {r.reason}
        </span>
      ) : (
        <span className="text-(--a2-ink-4)">—</span>
      ),
  },
  {
    key: "ip",
    head: "IP",
    width: "7rem",
    nowrap: true,
    hide: "lg",
    cell: (r) => <span className="a2-mono a2-t-sm text-(--a2-ink-3)">{r.ip}</span>,
  },
];

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

export default function AuditInterview({ state }: { state: string }) {
  const current = tabs.find((t) => t.slug === state) ?? tabs[0];
  const rows = log.filter(current.match);

  /* 역할 조건 — 지금 탭의 기록에 실제로 나온 역할만 낸다. 골라도 0건인 선택지를 두지 않는다 */
  const filters: Filter<Row>[] = [
    {
      id: "role",
      label: "역할",
      options: roleOrder.filter((role) => rows.some((r) => r.role === role)).map((role) => ({ value: role, label: role })),
      match: (r, v) => r.role === v,
    },
  ];

  return (
    <ConsoleFrame at="/admin2/audit">
      <PageHead
        title="감사 로그"
        tabsLabel="기록 종류별 조회 조건"
        tabs={tabs.map((t) => {
          const count = log.filter(t.match).length;
          /* 주소가 있는 탭(전체 · 면담 · 전문가 활동)만 링크다. 나머지 둘은 눌러도 바뀌지 않는다 */
          return t.slug === undefined ? (
            <Tab key={t.id} label={t.label} count={count} active={false} onClick={noop} />
          ) : (
            <TabLink key={t.id} href={to(t.slug)} label={t.label} count={count} active={t.id === current.id} />
          );
        })}
      />

      <DataTable
        key={current.id}
        rows={rows}
        cols={cols}
        filters={filters}
        getKey={(r) => r.id}
        searchHint="행위자 · 동작 · 대상 · 사유"
        empty={current.empty}
        showCount={false}
      />

      <Body>
        <Panel title="기록 분류" meta="탭이 기록을 나누는 기준">
          <DescList
            rows={[
              {
                k: "개인정보 열람",
                v: "사유가 적힌 기록입니다. 학생 개인정보 열람 · 접속코드 재발급 · 개인정보 파기와 함께 면담의 상담일지 열람이 여기에 표시됩니다.",
              },
              {
                k: "면담",
                v: "상담사 배정 · 자동 배정 · 일정 변경 · 알림 발송 · 결과 기록 제출 · 보완 요청 · 승인과 종료 · 휴무일 등록 · 면담 설정 변경 · 면담 상품 수정 · 상담일지 열람",
              },
              {
                k: "전문가 활동",
                v: "전문가 가입 승인과 권한 부여 · 권한 수정 · 전문가 로그인 · 문항 출제 · 문항 검수 · 진단 채점, 그리고 채점하면서 연 학생 개인정보",
              },
              {
                k: "그 외",
                v: "위 두 분류에 들지 않는 기록입니다. 관리자 로그인 · 접속코드 · 문의 · 리포트 발행 · 개인정보 파기가 여기에 표시됩니다.",
              },
            ]}
          />
          <p className="mt-2 a2-t-xs text-(--a2-ink-4)">
            기록 하나는 면담 · 전문가 활동 · 그 외 가운데 한 곳에만 표시됩니다. 개인정보 열람 탭은 세 분류에서
            사유가 적힌 기록만 모아 보여 줍니다.
          </p>
          <p className="mt-1.5 a2-t-xs text-(--a2-ink-4)">
            역할은 그 동작을 할 때의 권한입니다. 한 전문가가 상담사와 진단 위원을 함께 맡고 있으면 동작에 따라
            다르게 적힙니다. 로그인은 「전문가」, 자동 배정처럼 시스템이 처리한 일은 「자동 처리」로 적습니다.
          </p>
        </Panel>

        <Panel title="표준 열람 사유" meta="사유를 적기 전에 고르는 값" className="mt-3">
          {/* 꼬리표가 글자뿐이라 사이를 넉넉히 벌린다 — 붙여 두면 사유 일곱이 한 문장으로 읽힌다 */}
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {[...accessReasons, ...counselReasons].map((r) => (
              <Tag key={r}>{r}</Tag>
            ))}
          </div>
          <p className="mt-2 a2-t-xs text-(--a2-ink-4)">
            학생 개인정보나 상담일지를 열 때 이 중 하나를 고른 뒤 사건별 내용을 덧붙입니다. 사유 없이는 열람
            자체가 진행되지 않으므로, 위 표에 사유가 빈 항목은 개인정보와 관련 없는 동작입니다.
          </p>
          <p className="mt-1.5 a2-t-xs text-(--a2-ink-4)">
            기록은 추가만 됩니다. 이 콘솔에는 로그를 수정하거나 삭제하는 기능이 없습니다.
          </p>
        </Panel>
      </Body>
    </ConsoleFrame>
  );
}
