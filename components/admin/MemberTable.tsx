"use client";

import { useState } from "react";
import {
  members,
  memberStateLabel,
  memberTypeLabel,
  userActions,
  type MemberRow,
  type UserActionKind,
} from "@/lib/admin";
import ActionDialog from "./ActionDialog";
import { Badge, Callout, CountRows, TableCard } from "./Parts";
import * as a from "./ui";

/**
 * 회원 목록 (ADM-02).
 *
 * 슈퍼 관리자가 계정을 정지하거나 지우는 자리다. 두 동작을 나란히 두되 같은 무게로
 * 두지 않는다 — 정지는 되돌릴 수 있고 삭제는 아니다. 그래서 삭제는 확인 창에서 무슨
 * 일이 일어나는지 문장으로 먼저 적고, 「잠시 막아 두려는 것이라면 정지를 쓰세요」를
 * 함께 보여 준다.
 *
 * 운영자 계정(ADM-03)과 같은 말을 쓴다 — 정지·정지 해제·삭제. 같은 콘솔에서 같은
 * 일을 두 이름으로 부르면 헷갈린다.
 *
 * 사유는 강제하지 않는다. 기본 사유가 눌려 있어 그대로 넘어가도 되고, 다르면
 * 고르거나 덧붙이면 된다 — lib/admin.ts의 userActions 참조.
 *
 * 이 화면은 목록 상태를 브라우저 안에서만 바꾼다. 서버가 없는 설계본이라 그렇고,
 * 실제 구현에서는 여기가 API 호출과 감사 로그 기록이 되는 자리다.
 */
const typeTone: Record<MemberRow["type"], string> = {
  parent: "text-brand-700",
  teacher: "text-emerald-700",
  org: "text-accent-600",
  student: "text-amber-700",
};

export default function MemberTable() {
  const [rows, setRows] = useState<MemberRow[]>(members);
  const [acting, setActing] = useState<{ row: MemberRow; kind: UserActionKind } | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const count = (t: MemberRow["type"]) => rows.filter((m) => m.type === t).length;

  return (
    <>
      <div className="mb-6">
        <CountRows
          rows={[
            {
              label: "학부모",
              value: count("parent"),
              unit: "명",
              note: "자녀를 등록하는 대표 회원",
            },
            { label: "교사", value: count("teacher"), unit: "명", note: "승인 후 설문만 입력" },
            { label: "기관", value: count("org"), unit: "곳", note: "명부·응시권 관리" },
            {
              label: "학생 본인",
              value: count("student"),
              unit: "명",
              note: "만 14세 이상 직접 신청",
            },
          ]}
        />
      </div>

      {done && (
        <div className="mb-5">
          <Callout tone="good">{done}</Callout>
        </div>
      )}

      <TableCard
        title={`전체 회원 ${rows.length}명`}
        caption="학생은 독립 가입 경로가 없습니다. 여기 '학생 본인'은 만 14세 이상 직접 신청자입니다."
      >
        <table className={a.table}>
          <thead>
            <tr>
              <th className={a.th}>회원번호</th>
              <th className={a.th}>이름 · 기관명</th>
              <th className={a.th}>유형</th>
              <th className={a.th}>연락처</th>
              <th className={a.th}>소속</th>
              <th className={a.th}>등록 학생</th>
              <th className={a.th}>상태</th>
              <th className={a.th}>가입일</th>
              <th className={a.th}>할 일</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => {
              const off = m.state === "dormant" || m.state === "withdrawn";
              return (
                <tr key={m.id}>
                  <td className={a.td}>{m.id}</td>
                  <td className={a.tdStrong}>{m.name}</td>
                  <td className={a.td}>
                    <Badge label={memberTypeLabel[m.type]} className={typeTone[m.type]} />
                  </td>
                  <td className={a.td}>
                    <span className="tabular-nums">{m.contact}</span>
                    <span className="mt-0.5 block adm-t-sm">일부 가림</span>
                  </td>
                  <td className={a.td}>{m.belong}</td>
                  <td className={a.tdNum}>{m.children ? `${m.children}명` : "—"}</td>
                  <td className={a.td}>
                    <Badge {...memberStateLabel[m.state]} />
                  </td>
                  <td className={a.td}>{m.joinedAt}</td>
                  <td className={a.td}>
                    <span className="flex flex-wrap gap-2">
                      <button type="button" className={a.btnRowGhost}>
                        자세히 보기
                      </button>
                      <button
                        type="button"
                        onClick={() => setActing({ row: m, kind: off ? "restore" : "suspend" })}
                        className={a.btnRowGhost}
                      >
                        {off ? "정지 해제" : "정지"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActing({ row: m, kind: "delete" })}
                        className={a.btnRowGhost}
                      >
                        삭제
                      </button>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableCard>

      <p className="mt-4 adm-t-sm leading-relaxed text-exam-muted">
        탈퇴 회원의 자료는 관련 법령이 정한 기간이 지나면 자동으로 파기됩니다. 파기 전에 미리 지워
        달라는 요청이 오면 <b className="text-exam-text">개인정보·감사 로그</b> 화면에서 처리하고
        결과를 통지합니다.
      </p>

      {acting && (
        <ActionDialog
          kind={acting.kind}
          target={`회원 ${acting.row.id} · ${acting.row.name}`}
          onClose={() => setActing(null)}
          onDone={(reason) => {
            const { row, kind } = acting;
            setActing(null);
            setRows((prev) =>
              kind === "delete"
                ? prev.filter((m) => m.id !== row.id)
                : prev.map((m) =>
                    m.id === row.id
                      ? { ...m, state: kind === "restore" ? "active" : "dormant" }
                      : m,
                  ),
            );
            setDone(`${row.name} · ${row.id} 계정을 ${userActions[kind].verb}했습니다 — ${reason}`);
          }}
        />
      )}
    </>
  );
}
