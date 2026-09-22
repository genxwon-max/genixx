"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import DataTable, { type Col, type Filter } from "@/components/admin2/DataTable";
import { Status } from "@/components/admin2/ui";
import { accountTone, n } from "@/lib/admin2";
import {
  maskMail,
  maskPhone,
  userStateLabel,
  userStateOptions,
  type ParentRow,
  type TeacherRow,
  type UserState,
} from "@/lib/adminUsers";
import { useParents, useTeachers } from "@/lib/directoryStore";

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
 * ── 줄과 상세 ──
 * 줄은 씨앗 명부가 아니라 lib/directoryStore.ts가 「씨앗 + 고친 것」으로 낸 것을 받는다.
 * 상세(ADM-02-3)에서 정지해 놓고 돌아왔을 때 그 줄이 아직 「활성」으로 서 있으면,
 * 눌러서 고친 것을 화면이 안 돌려주는 셈이 되어 고친 것 자체를 못 믿게 된다.
 * 그래서 거르개 선택지도 고친 값이 섞인 줄에서 뽑는다 — 씨앗에서만 뽑으면 교사를
 * 탈퇴 처리한 뒤 「탈퇴」로 거를 수가 없다(씨앗 교사에는 탈퇴가 없다).
 *
 * ── 개인정보 ──
 * 원본 데이터가 이미 가려진 채로 온다(gm****@naver.com · 010-12**-****). 그 이상은
 * 이 화면에서 풀지 않고, 생년월일·주소처럼 가려지지 않은 값은 칸 자체를 만들지 않는다.
 */

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

/* 표 오른쪽 끝의 관리 칸 — 두 명부가 같은 자리에 같은 말로 세운다.
   hover에서만 나타나게 두지 않는다(admin2.css 규칙): 96줄을 훑다가 「이 줄에서 뭘 할 수
   있더라」를 묻게 되는 순간 목록이 아니라 수수께끼가 된다.
   정렬·검색을 달지 않는다 — value가 없으면 머리 행이 눌리는 단추가 되지 않는다. */
function editCol<T extends { id: string; name: string }>(): Col<T> {
  return {
    key: "act",
    head: "관리",
    width: "5.5rem",
    nowrap: true,
    cell: (r) => (
      <Link href={`/admin2/members/${r.id}`} className="a2-btn a2-btn-sm" aria-label={`${r.name} 수정하기`}>
        수정하기
      </Link>
    ),
  };
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
    /* 목록은 여러 사람을 한꺼번에 펴 보는 자리라 가린다. 온전한 값은 상세에서 본다.
       검색(value)은 온전한 값으로 걸린다 — 메일 주소로 사람을 찾는 일이 실제로 있다 */
    cell: (r) => <span className="a2-mono a2-t-sm">{maskMail(r.contact)}</span>,
  },
  {
    key: "phone",
    head: "전화",
    width: "8rem",
    nowrap: true,
    hide: "lg",
    value: (r) => r.phone,
    cell: (r) => <span className="a2-mono a2-t-sm">{maskPhone(r.phone)}</span>,
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
  // 자녀수는 학생 명부에서 센 값이다(lib/adminUsers.ts). 0인 계정은 가입만 하고
  // 아직 아이를 등록하지 않은 것이라, 0을 흐리게 눌러 「없음」으로 읽히게 둔다
  {
    key: "kids",
    head: "자녀수",
    width: "4.5rem",
    num: true,
    value: (r) => r.kids,
    cell: (r) => (r.kids ? r.kids : <span className="text-(--a2-ink-4)">0</span>),
  },
  {
    key: "state",
    head: "상태",
    width: "6rem",
    nowrap: true,
    value: (r) => userStateLabel[r.state].label,
    cell: (r) => <Status tone={accountTone[r.state]}>{userStateLabel[r.state].label}</Status>,
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
  editCol<ParentRow>(),
];

function parentFilters(rows: ParentRow[]): Filter<ParentRow>[] {
  return [
    { id: "state", label: "상태", options: stateOptions(rows), match: (r, v) => r.state === v },
    { id: "region", label: "지역", options: regionOptions(rows), match: (r, v) => r.region === v },
  ];
}

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
    cell: (r) => <span className="a2-mono a2-t-sm">{maskMail(r.contact)}</span>,
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
    cell: (r) => <Status tone={accountTone[r.state]}>{userStateLabel[r.state].label}</Status>,
  },
  {
    key: "joinedAt",
    head: "가입일",
    width: "6.5rem",
    nowrap: true,
    value: (r) => r.joinedAt,
    cell: (r) => <span className="a2-mono a2-t-sm text-(--a2-ink-3)">{r.joinedAt}</span>,
  },
  editCol<TeacherRow>(),
];

function teacherFilters(rows: TeacherRow[]): Filter<TeacherRow>[] {
  return [
    { id: "state", label: "상태", options: stateOptions(rows), match: (r, v) => r.state === v },
    { id: "region", label: "지역", options: regionOptions(rows), match: (r, v) => r.region === v },
  ];
}

export default function MembersTable() {
  const [tab, setTab] = useState<"parents" | "teachers">("parents");
  const parents = useParents();
  const teachers = useTeachers();

  /* DataTable의 걸러내기가 이 배열을 의존값으로 본다. 렌더마다 새로 만들면 96줄을
     매번 다시 거르게 되므로 줄이 바뀔 때만 새로 만든다 */
  const pFilters = useMemo(() => parentFilters(parents), [parents]);
  const tFilters = useMemo(() => teacherFilters(teachers), [teachers]);

  const TABS = [
    { id: "parents" as const, label: "학부모", count: parents.length },
    { id: "teachers" as const, label: "교사", count: teachers.length },
  ];

  return (
    <>
      {/* 밑줄 탭 — 판 머리처럼 면을 칠하지 않고 선 하나로 가른다.
          role="tab"을 붙이지 않았다. 진짜 탭 묶음은 화살표 키로 옮겨 다니는 초점 관리까지
          있어야 약속을 지키는 것이고, 그 없이 이름만 tab을 달면 화살표를 눌러도 안 움직이는
          탭이 된다. 여기서는 누름 상태를 가진 단추 둘(aria-pressed)로 정직하게 적는다 */}
      <div
        role="group"
        aria-label="회원 종류"
        className="flex items-center gap-5 border-b border-(--a2-line) px-3"
      >
        {TABS.map((t) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={on}
              onClick={() => setTab(t.id)}
              /* 밑줄은 2px 그대로 두고 이름과 줄 수만 색으로 가른다. 고른 탭의 줄 수는
                 파란 알약으로 세운다 — 둘 다 회색이면 어느 명부를 보고 있는지가 2px
                 밑줄 하나에만 걸린다 */
              className={`-mb-px flex h-9 items-center gap-1.5 border-b-2 a2-t-sm font-bold ${
                on
                  ? "border-(--a2-accent) text-(--a2-ink)"
                  : "border-transparent text-(--a2-ink-3) hover:text-(--a2-ink)"
              }`}
            >
              {t.label}
              <span className={`a2-tag a2-num ${on ? "a2-tag-accent" : ""}`}>{n(t.count)}</span>
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
          filters={pFilters}
          getKey={(r) => r.id}
          searchHint="이름 · ID · 연락처"
          csv={{ name: "회원정보_학부모" }}
          empty="조건에 맞는 학부모가 없습니다."
        />
      ) : (
        <DataTable
          key="teachers"
          rows={teachers}
          cols={teacherCols}
          filters={tFilters}
          getKey={(r) => r.id}
          searchHint="이름 · ID · 연락처"
          csv={{ name: "회원정보_교사" }}
          empty="조건에 맞는 교사가 없습니다."
        />
      )}
    </>
  );
}
