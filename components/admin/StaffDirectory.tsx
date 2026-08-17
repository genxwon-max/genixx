"use client";

import { useMemo, useState } from "react";
import { roleOf, staffRoles, userActions, type UserActionKind } from "@/lib/admin";
import {
  staffDirectory,
  userStateLabel,
  userStateOptions,
  type StaffMember,
} from "@/lib/adminUsers";
import ActionDialog from "./ActionDialog";
import DataList, { Picker, type Column } from "./DataList";
import { Badge, Callout } from "./Parts";
import * as a from "./ui";

/**
 * 관리자(운영자) 목록 (ADM-03).
 *
 * 사용자 목록(ADM-02)과 같은 껍데기·같은 조치 말을 쓴다. 다른 것은 조회 조건뿐이다 —
 * 여기서는 역할과 2단계 인증 여부가 먼저 걸린다. 판정을 확정하거나 학생 개인정보를
 * 여는 권한을 가진 계정이 2단계 인증 없이 남아 있으면 그것부터 찾아내야 한다.
 */
export default function StaffDirectory() {
  const [rows, setRows] = useState(staffDirectory);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");
  const [state, setState] = useState("all");
  const [mfa, setMfa] = useState("all");
  const [team, setTeam] = useState("all");
  const [acting, setActing] = useState<{ row: StaffMember; kind: UserActionKind } | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const filtering =
    q.trim() !== "" || role !== "all" || state !== "all" || mfa !== "all" || team !== "all";
  const reset = () => {
    setQ("");
    setRole("all");
    setState("all");
    setMfa("all");
    setTeam("all");
  };

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!needle ||
          [r.name, r.id, r.loginId, r.team].some((f) => f.toLowerCase().includes(needle))) &&
        (role === "all" || r.role === role) &&
        (state === "all" || r.state === state) &&
        (team === "all" || r.team === team) &&
        (mfa === "all" || (mfa === "on") === r.mfa),
    );
  }, [rows, q, role, state, team, mfa]);

  /** 2단계 인증 없이 남아 있는 계정 — 조건을 안 걸어도 위에서 한 번 알려 준다 */
  const noMfa = rows.filter((r) => !r.mfa && r.state === "active").length;

  const columns: Column<StaffMember>[] = [
    {
      key: "loginId",
      head: "아이디",
      cell: (r) => (
        <>
          <span className="font-bold tabular-nums text-exam-text">{r.loginId}</span>
          <span className="mt-0.5 block adm-t-sm tabular-nums">{r.id}</span>
        </>
      ),
    },
    {
      key: "name",
      head: "이름",
      cell: (r) => <span className="font-bold text-exam-text">{r.name}</span>,
    },
    {
      key: "role",
      head: "역할",
      cell: (r) => <Badge label={roleOf(r.role).label} className={roleOf(r.role).tone} />,
    },
    { key: "team", head: "팀", hide: "md", cell: (r) => r.team },
    {
      key: "mfa",
      head: "2단계 인증",
      cell: (r) => (
        <span className={`adm-t-sm font-bold ${r.mfa ? "text-emerald-700" : "text-rose-600"}`}>
          {r.mfa ? "✓ 사용 중" : "미설정"}
        </span>
      ),
    },
    { key: "state", head: "상태", cell: (r) => <Badge {...userStateLabel[r.state]} /> },
    { key: "lastSeen", head: "마지막 접속", hide: "xl", cell: (r) => r.lastSeen },
    {
      key: "act",
      head: "할 일",
      cell: (r) => {
        const off = r.state !== "active";
        return (
          <span className="flex flex-wrap gap-2">
            <button type="button" className={a.btnRowGhost}>
              권한 바꾸기
            </button>
            <button
              type="button"
              onClick={() => setActing({ row: r, kind: off ? "restore" : "suspend" })}
              className={a.btnRowGhost}
            >
              {off ? "정지 해제" : "정지"}
            </button>
            <button
              type="button"
              onClick={() => setActing({ row: r, kind: "delete" })}
              className={a.btnRowGhost}
            >
              삭제
            </button>
          </span>
        );
      },
    },
  ];

  return (
    <>
      {noMfa > 0 && (
        <div className="mb-5">
          <Callout tone="warn">
            2단계 인증을 켜지 않은 활성 계정이 {noMfa}개 있습니다. 아래 조회 조건에서 「2단계 인증
            미설정」을 고르면 한 번에 볼 수 있습니다.
          </Callout>
        </div>
      )}

      {done && (
        <div className="mb-5">
          <Callout tone="good">{done}</Callout>
        </div>
      )}

      <DataList
        rows={list}
        totalCount={rows.length}
        columns={columns}
        rowKey={(r) => r.id}
        unit="명"
        searchPlaceholder="아이디 · 이름 · 팀으로 찾기"
        query={q}
        onQuery={setQ}
        filtering={filtering}
        onReset={reset}
        filters={
          <>
            <Picker
              label="역할 전체"
              options={staffRoles.map((r) => ({ value: r.id, label: r.label }))}
              value={role}
              onChange={setRole}
            />
            <Picker
              label="팀 전체"
              options={[...new Set(rows.map((r) => r.team))].sort().map((v) => ({
                value: v,
                label: v,
              }))}
              value={team}
              onChange={setTeam}
              className="w-full sm:w-40"
            />
            <Picker
              label="상태 전체"
              options={userStateOptions}
              value={state}
              onChange={setState}
              className="w-full sm:w-36"
            />
            <Picker
              label="2단계 인증 전체"
              options={[
                { value: "on", label: "사용 중" },
                { value: "off", label: "미설정" },
              ]}
              value={mfa}
              onChange={setMfa}
              className="w-full sm:w-44"
            />
          </>
        }
      />

      {acting && (
        <ActionDialog
          kind={acting.kind}
          target={`운영자 ${acting.row.loginId} · ${acting.row.name}`}
          onClose={() => setActing(null)}
          onDone={(reason) => {
            const { row, kind } = acting;
            setActing(null);
            setRows((prev) =>
              kind === "delete"
                ? prev.filter((r) => r.id !== row.id)
                : prev.map((r) =>
                    r.id === row.id
                      ? { ...r, state: kind === "restore" ? "active" : "suspended" }
                      : r,
                  ),
            );
            setDone(
              `${row.name} · ${row.loginId} 계정을 ${userActions[kind].verb}했습니다 — ${reason}`,
            );
          }}
        />
      )}
    </>
  );
}
