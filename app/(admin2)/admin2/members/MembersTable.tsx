"use client";

import { useState } from "react";
import DataTable, { type Col, type Filter } from "@/components/admin2/DataTable";
import { Status } from "@/components/admin2/ui";
import { n, type Tone } from "@/lib/admin2";
import {
  parents,
  teachers,
  userStateLabel,
  userStateOptions,
  type ParentRow,
  type TeacherRow,
  type UserState,
} from "@/lib/adminUsers";

/*
 * ADM-02 회원 — 학부모 명부와 교사 명부.
 *
 * ── 판 둘로 쌓지 않고 탭으로 가른 이유 ──
 * 두 명부는 칸이 다르다(학부모는 자녀수·최근 접속, 교사는 학교·학급수·담당 학생).
 * 세로로 쌓으면 DataTable이 각각 제 세로 스크롤 상자(max-h)를 들고 서므로, 아래쪽
 * 표는 머리 행이 화면 밖에 붙은 채로 열리고 도구 줄도 두 벌이 된다. 게다가 이 화면에
 * 오는 이유는 거의 언제나 「한 사람을 찾는 것」이라 두 명부를 나란히 견줄 일이 없다.
 * 대신 탭 이름 옆에 전체 줄 수를 늘 세워 둔다 — 탭을 눌러 봐야 몇 명인지 아는 구조는
 * 안 만든다.
 *
 * ── 검색이 걸리는 범위 ──
 * DataTable은 칸의 value를 이어 붙인 한 줄에서 찾는다. 그래서 정렬을 붙인 칸은 검색에도
 * 걸린다. 지역은 거르개가 따로 있으므로 value를 일부러 빼 두었다 — 지역명이 검색어에
 * 걸리기 시작하면 「강서」로 사람을 찾는 동작이 지역 전체를 끌고 온다.
 *
 * ── 개인정보 ──
 * 원본 데이터가 이미 가려진 채로 온다(gm****@naver.com · 010-12**-****). 그 이상은
 * 이 화면에서 풀지 않고, 생년월일·주소처럼 가려지지 않은 값은 칸 자체를 만들지 않는다.
 */

const stateTone: Record<UserState, Tone> = {
  active: "ok",
  pending: "warn",
  dormant: "muted",
  suspended: "danger",
  withdrawn: "muted",
};

/* 지역 거르개 목록은 실제로 등장한 지역에서만 뽑는다. 상수 REGIONS를 그대로 쓰면
   아무도 없는 지역이 선택지에 남아 0줄을 보여 준다 */
function regionOptions(list: readonly { region: string }[]) {
  return [...new Set(list.map((r) => r.region))]
    .sort((a, b) => a.localeCompare(b, "ko-KR"))
    .map((v) => ({ value: v, label: v }));
}

/* 상태도 같은 이유로 걸러 낸다 — 학부모에는 「승인 대기」가, 교사에는 「탈퇴」가 없다.
   골라도 0줄이 나오는 선택지가 하나라도 있으면 거르개 전체를 못 믿게 된다 */
function stateOptions(list: readonly { state: UserState }[]) {
  const present = new Set(list.map((r) => r.state));
  return userStateOptions.filter((o) => present.has(o.value));
}

/* ───────────────────────── 학부모 ─────────────────────────
   칸 순서는 「누구인지 → 어떻게 닿는지 → 무엇을 들고 있는지 → 지금 어떤지 → 언제」.
   ID를 맨 앞에 두는 것은 문의·감사 로그·결제 내역이 전부 M-1xxxxx로 사람을 부르기
   때문이다. 이름부터 찾는 일보다 다른 화면에서 들고 온 ID를 맞춰 보는 일이 잦다.
   상태를 날짜 앞에 세운 것은 정지·탈퇴가 곧 「이 줄을 더 볼 필요가 있나」의 답이라서다. */
const parentCols: Col<ParentRow>[] = [
  {
    key: "id",
    head: "ID",
    width: "6rem",
    nowrap: true,
    value: (r) => r.id,
    cell: (r) => <span className="a2-mono">{r.id}</span>,
  },
  {
    key: "name",
    head: "이름",
    width: "5.5rem",
    nowrap: true,
    value: (r) => r.name,
    cell: (r) => <span className="font-semibold text-(--a2-ink)">{r.name}</span>,
  },
  {
    key: "contact",
    head: "연락처",
    width: "10rem",
    nowrap: true,
    hide: "md",
    value: (r) => r.contact,
    cell: (r) => <span className="a2-mono a2-t-sm">{r.contact}</span>,
  },
  {
    key: "phone",
    head: "전화",
    width: "8rem",
    nowrap: true,
    hide: "lg",
    value: (r) => r.phone,
    cell: (r) => <span className="a2-mono a2-t-sm">{r.phone}</span>,
  },
  // 지역: 거르개로 좁히는 칸이라 정렬(=검색)을 달지 않는다
  {
    key: "region",
    head: "지역",
    width: "6.5rem",
    nowrap: true,
    hide: "sm",
    cell: (r) => <span className="a2-t-sm text-(--a2-ink-2)">{r.region}</span>,
  },
  {
    key: "kids",
    head: "자녀수",
    width: "4.5rem",
    num: true,
    value: (r) => r.kids,
    cell: (r) => r.kids,
  },
  {
    key: "state",
    head: "상태",
    width: "6rem",
    nowrap: true,
    value: (r) => userStateLabel[r.state].label,
    cell: (r) => <Status tone={stateTone[r.state]}>{userStateLabel[r.state].label}</Status>,
  },
  {
    key: "joinedAt",
    head: "가입일",
    width: "6.5rem",
    nowrap: true,
    value: (r) => r.joinedAt,
    // 가입일은 대조용이라 한 단계 흐리게, 최근 접속은 휴면 판단에 바로 쓰이므로 본문 색으로
    cell: (r) => <span className="a2-mono a2-t-sm text-(--a2-ink-3)">{r.joinedAt}</span>,
  },
  {
    key: "lastSeen",
    head: "최근 접속",
    width: "6.5rem",
    nowrap: true,
    value: (r) => r.lastSeen,
    cell: (r) => <span className="a2-mono a2-t-sm">{r.lastSeen}</span>,
  },
];

const parentFilters: Filter<ParentRow>[] = [
  { id: "state", label: "상태", options: stateOptions(parents), match: (r, v) => r.state === v },
  { id: "region", label: "지역", options: regionOptions(parents), match: (r, v) => r.region === v },
];

/* ───────────────────────── 교사 ─────────────────────────
   학부모와 앞뒤(ID·이름·연락처 / 상태·가입일)를 일부러 같은 자리에 둔다. 탭을 오갈 때
   눈이 칸을 다시 찾지 않게 하려는 것이고, 가운데 세 칸(학교·학급수·담당 학생)만 갈린다.
   전화 칸은 두지 않았다 — 원본에 교사 전화가 아예 없다. 빈 칸을 세워 두면 「아직 안
   들어온 값」으로 읽히고, 그러면 채우라는 요구가 따라온다. */
const teacherCols: Col<TeacherRow>[] = [
  {
    key: "id",
    head: "ID",
    width: "6rem",
    nowrap: true,
    value: (r) => r.id,
    cell: (r) => <span className="a2-mono">{r.id}</span>,
  },
  {
    key: "name",
    head: "이름",
    width: "5.5rem",
    nowrap: true,
    value: (r) => r.name,
    cell: (r) => <span className="font-semibold text-(--a2-ink)">{r.name}</span>,
  },
  {
    key: "contact",
    head: "연락처",
    width: "10rem",
    nowrap: true,
    hide: "md",
    value: (r) => r.contact,
    cell: (r) => <span className="a2-mono a2-t-sm">{r.contact}</span>,
  },
  // 학교는 정렬을 남겨 둔다 — 같은 학교 교사가 몇인지 묶어 보는 일이 실제로 있다
  {
    key: "school",
    head: "학교",
    width: "11.5rem",
    nowrap: true,
    value: (r) => r.school,
    cell: (r) => <span className="a2-t-sm text-(--a2-ink-2)">{r.school}</span>,
  },
  {
    key: "region",
    head: "지역",
    width: "6.5rem",
    nowrap: true,
    hide: "sm",
    cell: (r) => <span className="a2-t-sm text-(--a2-ink-2)">{r.region}</span>,
  },
  {
    key: "classes",
    head: "학급수",
    width: "4.5rem",
    num: true,
    value: (r) => r.classes,
    cell: (r) => r.classes,
  },
  {
    key: "charge",
    head: "담당 학생",
    width: "5.5rem",
    num: true,
    value: (r) => r.charge,
    cell: (r) => r.charge,
  },
  {
    key: "state",
    head: "상태",
    width: "6rem",
    nowrap: true,
    value: (r) => userStateLabel[r.state].label,
    cell: (r) => <Status tone={stateTone[r.state]}>{userStateLabel[r.state].label}</Status>,
  },
  {
    key: "joinedAt",
    head: "가입일",
    width: "6.5rem",
    nowrap: true,
    value: (r) => r.joinedAt,
    cell: (r) => <span className="a2-mono a2-t-sm text-(--a2-ink-3)">{r.joinedAt}</span>,
  },
];

const teacherFilters: Filter<TeacherRow>[] = [
  { id: "state", label: "상태", options: stateOptions(teachers), match: (r, v) => r.state === v },
  { id: "region", label: "지역", options: regionOptions(teachers), match: (r, v) => r.region === v },
];

const TABS = [
  { id: "parents" as const, label: "학부모", count: parents.length },
  { id: "teachers" as const, label: "교사", count: teachers.length },
];

export default function MembersTable() {
  const [tab, setTab] = useState<"parents" | "teachers">("parents");

  return (
    <>
      {/* 밑줄 탭 — 판 머리처럼 면을 칠하지 않고 선 하나로 가른다.
          role="tab"을 붙이지 않았다. 진짜 탭 묶음은 화살표 키로 옮겨 다니는 초점 관리까지
          있어야 약속을 지키는 것이고, 그 없이 이름만 tab을 달면 화살표를 눌러도 안 움직이는
          탭이 된다. 여기서는 누름 상태를 가진 단추 둘(aria-pressed)로 정직하게 적는다 */}
      <div role="group" aria-label="회원 종류" className="mb-2 flex items-center gap-4 border-b border-(--a2-line)">
        {TABS.map((t) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={on}
              onClick={() => setTab(t.id)}
              className={`-mb-px flex h-8 items-center gap-1.5 border-b-2 a2-t-sm font-bold ${
                on
                  ? "border-(--a2-accent) text-(--a2-ink)"
                  : "border-transparent text-(--a2-ink-3) hover:text-(--a2-ink)"
              }`}
            >
              {t.label}
              <span className="a2-num a2-t-xs text-(--a2-ink-4)">{n(t.count)}</span>
            </button>
          );
        })}
      </div>

      {/* key를 달아 탭이 바뀌면 표가 새로 선다. 두 명부는 거르개 선택지가 다르므로
          학부모에서 고른 지역이 교사 쪽 select에 남으면 값이 목록에 없어 빈칸이 된다 */}
      {tab === "parents" ? (
        <DataTable
          key="parents"
          rows={parents}
          cols={parentCols}
          filters={parentFilters}
          getKey={(r) => r.id}
          searchHint="이름 · ID · 연락처"
          empty="조건에 맞는 학부모가 없습니다."
        />
      ) : (
        <DataTable
          key="teachers"
          rows={teachers}
          cols={teacherCols}
          filters={teacherFilters}
          getKey={(r) => r.id}
          searchHint="이름 · ID · 연락처"
          empty="조건에 맞는 교사가 없습니다."
        />
      )}
    </>
  );
}
