"use client";

import { useMemo, useState } from "react";
import { contractLabel, userActions, type OrgRow, type UserActionKind } from "@/lib/admin";
import {
  examStateLabel,
  orgDirectory,
  parents,
  students,
  teachers,
  userStateLabel,
  userStateOptions,
  type ParentRow,
  type StudentRow,
  type TeacherRow,
  type UserState,
} from "@/lib/adminUsers";
import ActionDialog from "./ActionDialog";
import DataList, { Picker, type Column } from "./DataList";
import { Badge, Callout } from "./Parts";
import * as a from "./ui";

/**
 * 사용자 관리 (ADM-02) — 학부모 · 학생 · 교사 · 기관.
 *
 * 넷을 한 표에 섞지 않는다. 학부모에게는 자녀 수가, 학생에게는 접속코드와 응시
 * 상태가, 교사에게는 승인 여부가, 기관에는 응시권 잔량이 제일 먼저 보여야 하는데
 * 한 표로 합치면 그 넷을 다 담느라 열이 열두 개가 되고 무엇도 눈에 안 들어온다.
 * 그래서 탭으로 가르고 갈래마다 조회 조건과 열을 따로 준다.
 *
 * 연락처는 처음부터 가려서 보여 준다. 전체를 보려면 사유를 남기고 여는 별도 흐름
 * (student.pii)을 거쳐야 하며, 그 기록은 감사 로그에 남는다.
 *
 * 정지·해제·삭제는 회원 목록과 운영자 목록이 같은 말과 같은 확인 창을 쓴다. 같은
 * 콘솔에서 같은 일을 두 이름으로 부르면 헷갈린다.
 */

type TabId = "parent" | "student" | "teacher" | "org";

const tabs: { id: TabId; label: string; unit: string; count: number }[] = [
  { id: "parent", label: "학부모", unit: "명", count: parents.length },
  { id: "student", label: "학생", unit: "명", count: students.length },
  { id: "teacher", label: "교사", unit: "명", count: teachers.length },
  { id: "org", label: "기관", unit: "곳", count: orgDirectory.length },
];

/** 지역 선택지 — 실제 목록에 있는 값만 뽑는다. 없는 지역을 걸어 두면 늘 0건이 나온다 */
function regionOptions(list: { region: string }[]) {
  return [...new Set(list.map((r) => r.region))].sort().map((v) => ({ value: v, label: v }));
}

const has = (needle: string, ...fields: (string | number)[]) =>
  fields.some((f) => String(f).toLowerCase().includes(needle));

export default function UserDirectory() {
  const [tab, setTab] = useState<TabId>("parent");
  const [done, setDone] = useState<string | null>(null);

  return (
    <>
      {/* ── 갈래 ── */}
      <div role="tablist" aria-label="사용자 갈래" className="mb-5 flex flex-wrap gap-2">
        {tabs.map((t) => {
          const on = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => {
                setTab(t.id);
                setDone(null);
              }}
              // 선택 상태를 색 하나로만 알리지 않는다 — 면·글자 굵기·아래 막대를 겹친다
              className={`inline-flex min-h-[3rem] items-center gap-2 rounded-md border px-5 adm-t-md transition-colors ${
                on
                  ? "border-brand-900 bg-brand-900 font-black text-white"
                  : "border-exam-line bg-white font-bold text-exam-text hover:bg-exam-raised"
              }`}
            >
              {t.label}
              <span
                className={`adm-t-sm tabular-nums ${on ? "text-brand-200" : "text-exam-muted"}`}
              >
                {t.count.toLocaleString("ko-KR")}
                {t.unit}
              </span>
            </button>
          );
        })}
      </div>

      {done && (
        <div className="mb-5">
          <Callout tone="good">{done}</Callout>
        </div>
      )}

      {tab === "parent" && <ParentList onDone={setDone} />}
      {tab === "student" && <StudentList />}
      {tab === "teacher" && <TeacherList onDone={setDone} />}
      {tab === "org" && <OrgList />}
    </>
  );
}

/* ───────────────────────── 학부모 ───────────────────────── */

function ParentList({ onDone }: { onDone: (m: string) => void }) {
  const [rows, setRows] = useState(parents);
  const [q, setQ] = useState("");
  const [state, setState] = useState("all");
  const [region, setRegion] = useState("all");
  const [kids, setKids] = useState("all");
  const [acting, setActing] = useState<{ row: ParentRow; kind: UserActionKind } | null>(null);

  const filtering = q.trim() !== "" || state !== "all" || region !== "all" || kids !== "all";
  const reset = () => {
    setQ("");
    setState("all");
    setRegion("all");
    setKids("all");
  };

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!needle || has(needle, r.name, r.id, r.contact, r.phone, r.region)) &&
        (state === "all" || r.state === state) &&
        (region === "all" || r.region === region) &&
        (kids === "all" || (kids === "3" ? r.kids >= 3 : String(r.kids) === kids)),
    );
  }, [rows, q, state, region, kids]);

  const columns: Column<ParentRow>[] = [
    { key: "id", head: "회원번호", cell: (r) => <span className="tabular-nums">{r.id}</span> },
    {
      key: "name",
      head: "이름",
      cell: (r) => <span className="font-bold text-exam-text">{r.name}</span>,
    },
    {
      key: "contact",
      head: "연락처",
      hide: "md",
      cell: (r) => (
        <>
          <span className="tabular-nums">{r.contact}</span>
          <span className="mt-0.5 block adm-t-sm">{r.phone} · 일부 가림</span>
        </>
      ),
    },
    { key: "region", head: "지역", hide: "lg", cell: (r) => r.region },
    { key: "kids", head: "자녀", align: "right", cell: (r) => `${r.kids}명` },
    { key: "state", head: "상태", cell: (r) => <Badge {...userStateLabel[r.state]} /> },
    { key: "joined", head: "가입일", hide: "xl", cell: (r) => r.joinedAt },
    {
      key: "act",
      head: "할 일",
      cell: (r) => <RowActions state={r.state} onAct={(kind) => setActing({ row: r, kind })} />,
    },
  ];

  return (
    <>
      <DataList
        rows={list}
        totalCount={rows.length}
        columns={columns}
        rowKey={(r) => r.id}
        unit="명"
        searchPlaceholder="이름 · 회원번호 · 연락처 · 지역으로 찾기"
        query={q}
        onQuery={setQ}
        filtering={filtering}
        onReset={reset}
        filters={
          <>
            <Picker
              label="상태 전체"
              options={userStateOptions}
              value={state}
              onChange={setState}
            />
            <Picker
              label="지역 전체"
              options={regionOptions(rows)}
              value={region}
              onChange={setRegion}
            />
            <Picker
              label="자녀 수 전체"
              options={[
                { value: "1", label: "1명" },
                { value: "2", label: "2명" },
                { value: "3", label: "3명 이상" },
              ]}
              value={kids}
              onChange={setKids}
            />
          </>
        }
      />

      {acting && (
        <ActionDialog
          kind={acting.kind}
          target={`학부모 ${acting.row.id} · ${acting.row.name}`}
          onClose={() => setActing(null)}
          onDone={(reason) => {
            const { row, kind } = acting;
            setActing(null);
            setRows((prev) => applyAction(prev, row.id, kind));
            onDone(`${row.name} · ${row.id} 계정을 ${userActions[kind].verb}했습니다 — ${reason}`);
          }}
        />
      )}
    </>
  );
}

/* ───────────────────────── 학생 ───────────────────────── */

function StudentList() {
  const [q, setQ] = useState("");
  const [grade, setGrade] = useState("all");
  const [exam, setExam] = useState("all");
  const [school, setSchool] = useState("all");

  const filtering = q.trim() !== "" || grade !== "all" || exam !== "all" || school !== "all";
  const reset = () => {
    setQ("");
    setGrade("all");
    setExam("all");
    setSchool("all");
  };

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return students.filter(
      (r) =>
        (!needle || has(needle, r.name, r.id, r.code, r.school, r.guardian)) &&
        (grade === "all" || r.grade === grade) &&
        (exam === "all" || r.exam === exam) &&
        (school === "all" || r.school === school),
    );
  }, [q, grade, exam, school]);

  const columns: Column<StudentRow>[] = [
    { key: "id", head: "학생번호", cell: (r) => <span className="tabular-nums">{r.id}</span> },
    {
      key: "name",
      head: "이름",
      cell: (r) => (
        <>
          <span className="font-bold text-exam-text">{r.name}</span>
          <span className="mt-0.5 block adm-t-sm">{r.grade}</span>
        </>
      ),
    },
    {
      key: "code",
      head: "접속코드",
      cell: (r) => <span className="font-bold tabular-nums text-exam-text">{r.code}</span>,
    },
    { key: "school", head: "학교", hide: "md", cell: (r) => r.school },
    {
      key: "guardian",
      head: "보호자",
      hide: "lg",
      cell: (r) => (
        <>
          {r.guardian}
          <span className="mt-0.5 block adm-t-sm tabular-nums">{r.guardianId}</span>
        </>
      ),
    },
    { key: "exam", head: "응시", cell: (r) => <Badge {...examStateLabel[r.exam]} /> },
    { key: "state", head: "상태", hide: "xl", cell: (r) => <Badge {...userStateLabel[r.state]} /> },
    {
      key: "act",
      head: "할 일",
      cell: () => (
        <span className="flex flex-wrap gap-2">
          <button type="button" className={a.btnRowGhost}>
            자세히 보기
          </button>
          <button type="button" className={a.btnRowGhost}>
            코드 재발급
          </button>
        </span>
      ),
    },
  ];

  return (
    <>
      <DataList
        rows={list}
        totalCount={students.length}
        columns={columns}
        rowKey={(r) => r.id}
        unit="명"
        searchPlaceholder="이름 · 학생번호 · 접속코드 · 학교 · 보호자로 찾기"
        query={q}
        onQuery={setQ}
        filtering={filtering}
        onReset={reset}
        filters={
          <>
            <Picker
              label="학년 전체"
              options={[...new Set(students.map((s) => s.grade))].map((v) => ({
                value: v,
                label: v,
              }))}
              value={grade}
              onChange={setGrade}
              className="w-full sm:w-32"
            />
            <Picker
              label="응시 전체"
              options={(Object.keys(examStateLabel) as (keyof typeof examStateLabel)[]).map(
                (k) => ({
                  value: k,
                  label: examStateLabel[k].label,
                }),
              )}
              value={exam}
              onChange={setExam}
            />
            <Picker
              label="학교 전체"
              options={[...new Set(students.map((s) => s.school))].sort().map((v) => ({
                value: v,
                label: v,
              }))}
              value={school}
              onChange={setSchool}
              className="w-full sm:w-56"
            />
          </>
        }
      />

      <p className="mt-4 adm-t-md leading-relaxed text-exam-muted">
        학생은 따로 가입하지 않습니다. 보호자 계정 안의 프로필로 등록되고, 여기 접속코드와
        생년월일로 응시 화면에 들어갑니다. 생년월일은 이 목록에 싣지 않습니다 —{" "}
        <b className="text-exam-text">사유를 남기고 여는 개인정보 열람</b>에서만 보입니다.
      </p>
    </>
  );
}

/* ───────────────────────── 교사 ───────────────────────── */

function TeacherList({ onDone }: { onDone: (m: string) => void }) {
  const [rows, setRows] = useState(teachers);
  const [q, setQ] = useState("");
  const [state, setState] = useState("all");
  const [region, setRegion] = useState("all");
  const [acting, setActing] = useState<{ row: TeacherRow; kind: UserActionKind } | null>(null);

  const filtering = q.trim() !== "" || state !== "all" || region !== "all";
  const reset = () => {
    setQ("");
    setState("all");
    setRegion("all");
  };

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!needle || has(needle, r.name, r.id, r.contact, r.school, r.region)) &&
        (state === "all" || r.state === state) &&
        (region === "all" || r.region === region),
    );
  }, [rows, q, state, region]);

  const columns: Column<TeacherRow>[] = [
    { key: "id", head: "회원번호", cell: (r) => <span className="tabular-nums">{r.id}</span> },
    {
      key: "name",
      head: "이름",
      cell: (r) => <span className="font-bold text-exam-text">{r.name}</span>,
    },
    { key: "school", head: "소속 학교", cell: (r) => r.school },
    { key: "contact", head: "연락처", hide: "lg", cell: (r) => r.contact },
    { key: "classes", head: "학급", align: "right", hide: "md", cell: (r) => `${r.classes}반` },
    { key: "charge", head: "담당 학생", align: "right", cell: (r) => `${r.charge}명` },
    { key: "state", head: "상태", cell: (r) => <Badge {...userStateLabel[r.state]} /> },
    {
      key: "act",
      head: "할 일",
      cell: (r) => (
        <span className="flex flex-wrap gap-2">
          {r.state === "pending" ? (
            <button type="button" className={a.btnRow}>
              가입 승인
            </button>
          ) : null}
          <RowActions state={r.state} onAct={(kind) => setActing({ row: r, kind })} />
        </span>
      ),
    },
  ];

  return (
    <>
      <DataList
        rows={list}
        totalCount={rows.length}
        columns={columns}
        rowKey={(r) => r.id}
        unit="명"
        searchPlaceholder="이름 · 회원번호 · 소속 학교 · 지역으로 찾기"
        query={q}
        onQuery={setQ}
        filtering={filtering}
        onReset={reset}
        filters={
          <>
            <Picker
              label="상태 전체"
              options={userStateOptions}
              value={state}
              onChange={setState}
            />
            <Picker
              label="지역 전체"
              options={regionOptions(rows)}
              value={region}
              onChange={setRegion}
            />
          </>
        }
      />

      <p className="mt-4 adm-t-md leading-relaxed text-exam-muted">
        교사 계정은 소속 기관 관리자의 승인 뒤에 열립니다. 승인 전에는 학생 자료에 닿지 못합니다.
      </p>

      {acting && (
        <ActionDialog
          kind={acting.kind}
          target={`교사 ${acting.row.id} · ${acting.row.name}`}
          onClose={() => setActing(null)}
          onDone={(reason) => {
            const { row, kind } = acting;
            setActing(null);
            setRows((prev) => applyAction(prev, row.id, kind));
            onDone(`${row.name} · ${row.id} 계정을 ${userActions[kind].verb}했습니다 — ${reason}`);
          }}
        />
      )}
    </>
  );
}

/* ───────────────────────── 기관 ───────────────────────── */

function OrgList() {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("all");
  const [contract, setContract] = useState("all");
  const [region, setRegion] = useState("all");

  const filtering = q.trim() !== "" || kind !== "all" || contract !== "all" || region !== "all";
  const reset = () => {
    setQ("");
    setKind("all");
    setContract("all");
    setRegion("all");
  };

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return orgDirectory.filter(
      (r) =>
        (!needle || has(needle, r.name, r.id, r.manager, r.region)) &&
        (kind === "all" || r.kind === kind) &&
        (contract === "all" || r.contract === contract) &&
        (region === "all" || r.region === region),
    );
  }, [q, kind, contract, region]);

  const columns: Column<OrgRow>[] = [
    { key: "id", head: "기관번호", cell: (r) => <span className="tabular-nums">{r.id}</span> },
    {
      key: "name",
      head: "기관명",
      cell: (r) => (
        <>
          <span className="font-bold text-exam-text">{r.name}</span>
          <span className="mt-0.5 block adm-t-sm">{r.kind}</span>
        </>
      ),
    },
    { key: "region", head: "지역", hide: "md", cell: (r) => r.region },
    { key: "manager", head: "담당자", hide: "lg", cell: (r) => r.manager },
    { key: "students", head: "학생", align: "right", cell: (r) => `${r.students}명` },
    {
      key: "seats",
      head: "응시권",
      align: "right",
      cell: (r) => (
        <>
          <span className="font-bold text-exam-text">
            {r.seats[0]} / {r.seats[1]}
          </span>
          <span className="mt-0.5 block adm-t-sm">남음 {r.seats[1] - r.seats[0]}</span>
        </>
      ),
    },
    { key: "contract", head: "계약", cell: (r) => <Badge {...contractLabel[r.contract]} /> },
    { key: "until", head: "만료일", hide: "xl", cell: (r) => r.until },
    {
      key: "act",
      head: "할 일",
      cell: () => (
        <span className="flex flex-wrap gap-2">
          <button type="button" className={a.btnRowGhost}>
            자세히 보기
          </button>
          <button type="button" className={a.btnRowGhost}>
            응시권 배정
          </button>
        </span>
      ),
    },
  ];

  return (
    <DataList
      rows={list}
      totalCount={orgDirectory.length}
      columns={columns}
      rowKey={(r) => r.id}
      unit="곳"
      searchPlaceholder="기관명 · 기관번호 · 담당자 · 지역으로 찾기"
      query={q}
      onQuery={setQ}
      filtering={filtering}
      onReset={reset}
      filters={
        <>
          <Picker
            label="유형 전체"
            options={["학원", "학교", "교육원", "교육청"].map((v) => ({ value: v, label: v }))}
            value={kind}
            onChange={setKind}
            className="w-full sm:w-36"
          />
          <Picker
            label="계약 전체"
            options={(Object.keys(contractLabel) as (keyof typeof contractLabel)[]).map((k) => ({
              value: k,
              label: contractLabel[k].label,
            }))}
            value={contract}
            onChange={setContract}
            className="w-full sm:w-36"
          />
          <Picker
            label="지역 전체"
            options={regionOptions(orgDirectory)}
            value={region}
            onChange={setRegion}
          />
        </>
      }
    />
  );
}

/* ───────────────────────── 조각 ───────────────────────── */

/** 정지·해제·삭제 — 목록마다 같은 말, 같은 순서로 세운다 */
function RowActions({ state, onAct }: { state: UserState; onAct: (kind: UserActionKind) => void }) {
  const off = state === "dormant" || state === "suspended" || state === "withdrawn";
  return (
    <span className="flex flex-wrap gap-2">
      <button type="button" className={a.btnRowGhost}>
        자세히 보기
      </button>
      <button
        type="button"
        onClick={() => onAct(off ? "restore" : "suspend")}
        className={a.btnRowGhost}
      >
        {off ? "정지 해제" : "정지"}
      </button>
      <button type="button" onClick={() => onAct("delete")} className={a.btnRowGhost}>
        삭제
      </button>
    </span>
  );
}

/** 삭제는 목록에서 빼고, 정지·해제는 상태만 바꾼다 */
function applyAction<T extends { id: string; state: UserState }>(
  rows: T[],
  id: string,
  kind: UserActionKind,
) {
  if (kind === "delete") return rows.filter((r) => r.id !== id);
  return rows.map((r) =>
    r.id === id ? { ...r, state: kind === "restore" ? "active" : "suspended" } : r,
  );
}
