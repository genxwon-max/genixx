"use client";

import { auditLog, roleOf } from "@/lib/admin";
import { useLocalAudit } from "@/lib/adminStore";
import { TableCard, CountRows } from "./Parts";
import * as a from "./ui";

/**
 * 감사 로그 (ADM-11).
 *
 * 이 화면 자체가 제품의 약속이다 — "누가 언제 무엇을 봤는지 전건이 남고,
 * 보호자가 요청하면 그대로 보여 준다." 그래서 필터로 감추는 기능을 두지 않고,
 * 이 브라우저에서 방금 연 기록(맨 위)과 서버 기록을 한 줄기로 이어 붙인다.
 */
export default function AuditLog() {
  const local = useLocalAudit();

  const piiCount = auditLog.filter((r) => r.reason).length + local.length;

  return (
    <>
      <div className="mb-6">
        <CountRows
          rows={[
            {
              label: "오늘 개인정보 열람",
              value: piiCount,
              unit: "건",
              note: "모두 사유가 함께 기록되어 있습니다",
            },
            { label: "처리 대기 중인 파기 요청", value: 1, unit: "건", note: "접수 후 31시간" },
            {
              label: "사유 없이 열린 기록",
              value: 0,
              unit: "건",
              note: "사유 입력을 건너뛸 수 없습니다",
            },
          ]}
        />
      </div>

      {local.length > 0 && (
        <div className="mb-6">
          <TableCard
            title={`이 브라우저에서 방금 남긴 기록 ${local.length}건`}
            caption="개인정보를 열거나 계정을 정지·삭제할 때마다 즉시 쌓입니다."
          >
            <table className={a.table}>
              <thead>
                <tr>
                  <th className={a.th}>기록번호</th>
                  <th className={a.th}>시각</th>
                  <th className={a.th}>한 사람</th>
                  <th className={a.th}>한 일</th>
                  <th className={a.th}>대상</th>
                  <th className={a.th}>사유</th>
                </tr>
              </thead>
              <tbody>
                {local.map((r) => (
                  <tr key={r.id}>
                    <td className={a.tdTight}>{r.id}</td>
                    <td className={a.tdTight}>
                      <span className="tabular-nums">{r.at}</span>
                    </td>
                    <td className={a.tdStrongTight}>{r.actor}</td>
                    <td className={a.tdTight}>{r.action ?? "개인정보 열람"}</td>
                    <td className={`${a.td} text-left`}>{r.target}</td>
                    <td className={`${a.td} min-w-[20rem] text-left`}>{r.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>
        </div>
      )}

      <TableCard
        title="전체 기록"
        caption="개인정보를 연 기록에는 사유가 반드시 붙습니다. 사유 칸이 비어 있는 줄은 개인정보 열람이 아닌 작업입니다."
      >
        <table className={a.table}>
          <thead>
            <tr>
              <th className={a.th}>기록번호</th>
              <th className={a.th}>시각</th>
              <th className={a.th}>한 사람</th>
              <th className={a.th}>역할</th>
              <th className={a.th}>한 일</th>
              <th className={a.th}>대상</th>
              <th className={a.th}>사유</th>
              <th className={a.th}>접속 위치</th>
            </tr>
          </thead>
          <tbody>
            {auditLog.map((r) => (
              <tr key={r.id}>
                <td className={a.tdTight}>{r.id}</td>
                <td className={a.tdTight}>
                  <span className="tabular-nums">{r.at}</span>
                </td>
                <td className={a.tdStrongTight}>{r.actor}</td>
                <td className={a.tdTight}>{roleOf(r.role).label}</td>
                <td className={a.tdTight}>{r.action}</td>
                <td className={`${a.td} text-left`}>{r.target}</td>
                <td className={`${a.td} min-w-[18rem] text-left`}>
                  {r.reason ?? <span className="text-exam-muted">— (개인정보 열람 아님)</span>}
                </td>
                <td className={a.tdTight}>
                  <span className="tabular-nums">{r.ip}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
    </>
  );
}
