"use client";

import { useMemo } from "react";
import DataTable, { type Col, type Filter } from "@/components/admin2/DataTable";
import { Status } from "@/components/admin2/ui";
import type { Tone } from "@/lib/admin2";
import {
  examStateLabel,
  userStateLabel,
  type ExamState,
  type StudentRow,
  type UserState,
} from "@/lib/adminUsers";

/*
 * ADM-02-1의 표. DataTable이 함수 prop(cell·value·match)을 받으므로 클라이언트다.
 *
 * ── 칸 순서를 이렇게 정한 이유 ──
 * 왼쪽 넷(ID · 이름 · 접속코드 · 학교)은 「이 학생이 맞나」를 확인하는 칸이고,
 * 오른쪽 넷(응시 상태 · 계정 상태 · 등록일 · 동작)은 「무엇을 해 줘야 하나」를 정하는
 * 칸이다. 접속코드를 이름 바로 옆에 붙인 것은 전화로 오는 문의가 대부분
 * 「코드가 안 먹는다」이고, 그때 운영자가 눈으로 잇는 것이 이름↔코드 두 값이기 때문이다.
 *
 * ── 일부러 뺀 것 ──
 * · 생년월일 — 목록에 두지 않기로 한 값(page.tsx 머리 주석).
 * · 보호자 연락처 — 데이터에 가려진 형태로 있지만, 학생 목록에서 보호자에게 전화할
 *   일은 코드 재발급뿐이고 그것은 보호자 계정(ADM-02)에서 한다. 여기 두면 148줄에
 *   연락처가 상시로 떠 있게 된다.
 * · 꼬리표(Tag) — 학년은 분류값이지만 148줄에 상자를 세우면 표 한 장이 상자밭이 된다.
 *   글자로만 적고 정렬·거르개로 다룬다.
 */

/** 진행 순서 — 정렬을 가나다순이 아니라 응시가 진행된 순서로 세우려고 둔다 */
const EXAM_ORDER: ExamState[] = ["not-started", "in-progress", "submitted", "reported"];

const examTone: Record<ExamState, Tone> = {
  reported: "ok",
  submitted: "warn",
  "in-progress": "info",
  "not-started": "muted",
};

/* 계정 상태는 학생 목록에 활성·휴면만 나오지만, 표는 나머지 값이 들어와도 색이
   비지 않게 다섯을 모두 적어 둔다. 정지·탈퇴는 곧 시험을 막는 값이라 danger. */
const stateTone: Record<UserState, Tone> = {
  active: "ok",
  pending: "warn",
  dormant: "muted",
  suspended: "danger",
  withdrawn: "danger",
};

/** 초3 → 중1 순. 「중」이 「초」보다 앞서는 가나다순으로는 학년이 뒤집힌다 */
const gradeRank = (g: string) => (g.startsWith("초") ? 0 : 10) + Number(g.replace(/\D/g, ""));



const cols: Col<StudentRow>[] = [
  {
    key: "id",
    head: "학생 ID",
    width: "6rem",
    nowrap: true,
    value: (s) => s.id,
    cell: (s) => <span className="a2-mono">{s.id}</span>,
  },
  {
    key: "name",
    head: "이름",
    width: "5rem",
    nowrap: true,
    value: (s) => s.name,
    cell: (s) => <span className="font-semibold text-(--a2-ink)">{s.name}</span>,
  },
  {
    // 코드는 자릿수가 어긋나면 대조가 안 된다 — 여덟 자리를 고정폭으로 세운다
    key: "code",
    head: "접속코드",
    width: "6.5rem",
    nowrap: true,
    value: (s) => s.code,
    cell: (s) => <span className="a2-mono text-(--a2-ink)">{s.code}</span>,
  },
  {
    key: "school",
    head: "학교",
    width: "11rem",
    clip: true,
    hide: "lg",
    value: (s) => s.school,
    cell: (s) => s.school,
  },
  {
    key: "grade",
    head: "학년",
    width: "4rem",
    nowrap: true,
    // 검색은 보이는 글자로, 순서는 학교급 자리로 — 둘을 한 값에 담으면 한쪽이 깨진다
    value: (s) => s.grade,
    sort: (s) => gradeRank(s.grade),
    cell: (s) => s.grade,
  },
  {
    // 보호자는 이름만으로 동명이인이 갈리지 않아 계정 ID를 뒤에 붙인다.
    // 두 줄로 쌓지 않는다 — 표 한 줄은 32px이고, 쌓는 순간 148줄이 두 배로 길어진다.
    key: "guardian",
    head: "보호자",
    width: "10rem",
    nowrap: true,
    hide: "lg",
    value: (s) => `${s.guardian} ${s.guardianId}`,
    cell: (s) => (
      <span className="inline-flex items-baseline gap-1.5">
        <span className="text-(--a2-ink)">{s.guardian}</span>
        <span className="a2-mono a2-t-xs text-(--a2-ink-4)">{s.guardianId}</span>
      </span>
    ),
  },
  {
    key: "exam",
    head: "응시 상태",
    width: "6.5rem",
    nowrap: true,
    value: (s) => examStateLabel[s.exam].label,
    sort: (s) => EXAM_ORDER.indexOf(s.exam),
    cell: (s) => <Status tone={examTone[s.exam]}>{examStateLabel[s.exam].label}</Status>,
  },
  {
    key: "state",
    head: "계정 상태",
    width: "5.5rem",
    nowrap: true,
    value: (s) => userStateLabel[s.state].label,
    cell: (s) => <Status tone={stateTone[s.state]}>{userStateLabel[s.state].label}</Status>,
  },
  {
    key: "joinedAt",
    head: "등록일",
    width: "6rem",
    nowrap: true,
    hide: "md",
    value: (s) => s.joinedAt,
    cell: (s) => <span className="a2-mono a2-t-sm">{s.joinedAt}</span>,
  },
  {
    // hover에서만 나타나는 동작을 두지 않는다(admin2.css 규칙) — 오른쪽 끝에 늘 세워 둔다.
    // 지금은 자리만이라 value를 주지 않는다: 정렬 화살표가 서면 눌리는 칸으로 읽힌다.
    key: "act",
    head: "동작",
    width: "5.5rem",
    nowrap: true,
    cell: () => (
      <button type="button" className="a2-btn a2-btn-sm">
        코드 재발급
      </button>
    ),
  },
];

export default function StudentsTable({ rows }: { rows: StudentRow[] }) {
  /* 거르개 값은 데이터에서 뽑는다 — userStateLabel의 다섯 상태를 그대로 세우면
     학생에게는 없는 「승인 대기·정지·탈퇴」가 골라도 늘 0줄인 선택지로 남는다. */
  const filters = useMemo<Filter<StudentRow>[]>(() => {
    const grades = [...new Set(rows.map((r) => r.grade))].sort((a, b) => gradeRank(a) - gradeRank(b));
    const states = [...new Set(rows.map((r) => r.state))];

    return [
      {
        id: "exam",
        label: "응시",
        options: EXAM_ORDER.map((v) => ({ value: v, label: examStateLabel[v].label })),
        match: (r, v) => r.exam === v,
      },
      {
        id: "grade",
        label: "학년",
        options: grades.map((v) => ({ value: v, label: v })),
        match: (r, v) => r.grade === v,
      },
      {
        id: "state",
        label: "계정",
        options: states.map((v) => ({ value: v, label: userStateLabel[v].label })),
        match: (r, v) => r.state === v,
      },
    ];
  }, [rows]);

  return (
    <DataTable
      rows={rows}
      cols={cols}
      getKey={(s) => s.id}
      filters={filters}
      searchHint="이름 · 접속코드 · 학교 · 보호자"
      empty="조건에 맞는 학생이 없습니다."
    />
  );
}
