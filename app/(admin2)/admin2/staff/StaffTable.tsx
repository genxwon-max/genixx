"use client";

import Link from "next/link";
import DataTable, { type Col, type Filter } from "@/components/admin2/DataTable";
import { Status, Tag } from "@/components/admin2/ui";
import { accountTone } from "@/lib/admin2";
import { roleOf, staffRoles } from "@/lib/admin";
import { userStateLabel } from "@/lib/adminUsers";
import { type StaffRow } from "@/lib/staffPermStore";

/*
 * ADM-03 운영자 목록.
 *
 * ── 칸을 이 순서로 놓은 까닭 ──
 * 계정 ID와 로그인 아이디를 붙여 맨 앞에 둔다. 이 화면에 오는 이유는 거의 언제나 다른
 * 화면에서 값을 하나 들고 오는 것인데, 감사 로그는 U-04로 부르고 로그인 실패 알림은
 * login.id로 부른다. 둘이 떨어져 있으면 어느 쪽을 들고 왔든 한 번은 가로로 훑어야 한다.
 * 이름은 그 둘을 사람으로 바꿔 읽는 칸이라 셋째다.
 *
 * 가운데는 「무엇을 할 수 있는가」 — 역할·팀. 역할이 곧 권한이므로 팀보다 앞이다.
 * 팀은 사람을 찾는 데는 쓰지만 권한과는 상관이 없어 정렬만 남기고 색을 죽였다.
 *
 * 그 뒤가 「지금 안전한가」 — 2단계 인증·상태. 이 화면이 운영 화면과 갈리는 지점이다.
 * 회원 명부에서는 상태가 마지막 판단이지만, 운영자 명부에서 먼저 묻는 것은 「최고권한을
 * 든 계정이 2단계 없이 열려 있지 않은가」다. 그래서 MFA를 상태 앞에 세웠다.
 *
 * ── 일부러 뺀 것 ──
 * · 최근 접속에 정렬(=검색)을 달지 않았다. 예시 데이터가 시연용 일곱 줄은 「12분 전」으로,
 *   생성분은 「2026-08-14」로 들고 있어 문자열 정렬이 두 무리를 갈라 놓기만 한다.
 *   여기서 상대 시각을 날짜로 바꿔 적으면 없는 값을 지어내는 셈이라 그냥 두었다.
 * · 연락처·부서 전화 칸이 없다. 원본에 없고, 빈 칸을 세워 두면 「아직 안 들어온 값」으로
 *   읽혀 채우라는 요구가 따라온다.
 * · 비밀번호 마지막 변경·접속 IP 칸도 없다. 있으면 좋을 칸이지만 데이터가 없다.
 */

const cols: Col<StaffRow>[] = [
  {
    key: "id",
    head: "계정 ID",
    width: "5.5rem",
    nowrap: true,
    value: (r) => r.id,
    cell: (r) => <span className="a2-mono">{r.id}</span>,
  },
  {
    key: "loginId",
    head: "로그인 아이디",
    width: "9rem",
    nowrap: true,
    value: (r) => r.loginId,
    cell: (r) => <span className="a2-mono a2-t-sm">{r.loginId}</span>,
  },
  {
    key: "name",
    head: "이름",
    width: "5.5rem",
    nowrap: true,
    value: (r) => r.name,
    cell: (r) => (
      <Link
        href={`/admin2/staff/${r.id}`}
        className="font-semibold text-(--a2-ink) hover:text-(--a2-accent) hover:underline"
      >
        {r.name}
      </Link>
    ),
  },
  /* 역할: 값이 넷뿐인 분류라 꼬리표로 적는다. 최고권한(super)에만 강조를 준다 —
     스물여덟 줄에서 눈이 먼저 세어야 하는 것이 그 줄이기 때문이다. 역할 데이터에 붙은
     tone은 기존 /admin의 팔레트 클래스(text-emerald-700 …)라 이 콘솔에서는 쓰지 않는다.

     역할 옆에 지금 든 권한 수를 늘 세워 둔다. 상세에서 칸을 몇 개 더하고 빼면 역할
     이름만으로는 그 계정이 무엇을 할 수 있는지 알 수 없게 되기 때문이다 — 숫자가
     역할 기본값과 어긋나면 「고침」이 함께 선다 */
  {
    key: "role",
    head: "역할",
    width: "7.5rem",
    nowrap: true,
    value: (r) => roleOf(r.role).short,
    cell: (r) => (
      <span className="inline-flex items-center gap-1.5">
        <Tag accent={r.role === "super"}>{roleOf(r.role).short}</Tag>
        <span className="a2-num a2-t-xs text-(--a2-ink-4)">{r.perms.length}</span>
        {r.edited && (
          <span className="a2-t-xs font-bold" style={{ color: "var(--a2-warn)" }}>
            고침
          </span>
        )}
      </span>
    ),
  },
  {
    key: "team",
    head: "팀",
    width: "6.5rem",
    nowrap: true,
    hide: "md",
    value: (r) => r.team,
    cell: (r) => <span className="a2-t-sm text-(--a2-ink-2)">{r.team}</span>,
  },
  /* 2단계 인증: 켬에는 점을 찍지 않는다. 스물여덟 줄 가운데 스물넷이 정상인데 정상 쪽에
     초록 점을 세우면 점이 배경이 되고, 정작 봐야 하는 다섯 줄이 그 안에 묻힌다.
     끈 계정만 경고 점을 들고 서 있게 둔다 */
  {
    key: "mfa",
    head: "2단계 인증",
    width: "6rem",
    nowrap: true,
    value: (r) => (r.mfa ? "켬" : "끔"),
    cell: (r) =>
      r.mfa ? (
        <span className="a2-t-sm text-(--a2-ink-4)">켬</span>
      ) : (
        <Status tone="warn">끔</Status>
      ),
  },
  {
    key: "state",
    head: "상태",
    width: "5.5rem",
    nowrap: true,
    value: (r) => userStateLabel[r.state].label,
    cell: (r) => <Status tone={accountTone[r.state]}>{userStateLabel[r.state].label}</Status>,
  },
  // 최근 접속: 정렬을 달지 않은 까닭은 파일 머리에 적었다. 값 자체는 휴면 판단에 바로
  // 쓰이므로 본문 색으로 두고, 가입일은 대조용이라 한 단계 흐리게 둔다
  {
    key: "lastSeen",
    head: "최근 접속",
    width: "6rem",
    nowrap: true,
    cell: (r) => <span className="a2-mono a2-t-sm">{r.lastSeen}</span>,
  },
  {
    key: "joinedAt",
    head: "가입일",
    width: "6rem",
    nowrap: true,
    hide: "lg",
    value: (r) => r.joinedAt,
    cell: (r) => <span className="a2-mono a2-t-sm text-(--a2-ink-3)">{r.joinedAt}</span>,
  },
  /* 동작: 이 줄의 상세로 가는 문 하나. 예전에는 화면 아래 「역할 × 권한」 대조표로
     뛰기만 했다. 대조표는 「출제자는 무엇을 할 수 있나」에 답하는 자리라 「이 사람에게
     감사 로그를 열어 주자」로 이어지지 못하고 늘 거기서 끝났고, 상세가 그 일까지
     맡으면서 대조표는 걷어 냈다. 정지·MFA 초기화가 붙을 자리도 상세다 */
  {
    key: "act",
    head: "동작",
    width: "5.5rem",
    nowrap: true,
    cell: (r) => (
      <Link
        href={`/admin2/staff/${r.id}`}
        className="a2-btn a2-btn-sm"
        title={`${r.name}의 역할과 권한을 봅니다`}
      >
        권한 보기
      </Link>
    ),
  },
];

/* 거르개 셋. 「2단계 인증」은 켬/끔 두 갈래가 아니라 끈 계정만 남기는 한 갈래로 둔다 —
   켠 계정만 모아 보는 일은 없고, 이 거르개를 여는 이유는 언제나 하나이기 때문이다 */
/* 계정 상태와 2단계 인증은 머리의 탭이 맡는다(StaffView). 같은 조건을 두 군데서 걸면
   탭에서 「2단계 미설정」을 고른 채 거르개에서 「켠 계정」을 골라 0줄이 나온다.
   역할은 넷이라 탭으로 올리지 않고 여기 그대로 둔다 */
const filters: Filter<StaffRow>[] = [
  {
    id: "role",
    label: "역할",
    options: staffRoles.map((r) => ({ value: r.id, label: r.short })),
    match: (r, v) => r.role === v,
  },
];

export default function StaffTable({ rows, empty }: { rows: StaffRow[]; empty: string }) {
  return (
    <DataTable
      rows={rows}
      cols={cols}
      filters={filters}
      getKey={(r) => r.id}
      // 스물여덟 줄뿐이라 기본 25로 두면 두 쪽으로 잘린다. 「지금 운영자가 몇인가」를
      // 세는 화면에서 마지막 세 줄이 다음 쪽에 숨는 것은 이득이 없다
      pageSize={50}
      searchHint="이름 · 계정 ID · 로그인 아이디"
      empty={empty}
      // 줄 수는 끈다 — 탭의 개수 알약과 쪽 넘김 줄이 이미 같은 수를 적는다
      showCount={false}
    />
  );
}
