import { can, staffRoles, type PermissionId } from "@/lib/admin";
import { PageHead, TableCard, Badge } from "@/components/admin/Parts";
import PermissionGate from "@/components/admin/PermissionGate";
import StaffIssue from "@/components/admin/StaffIssue";
import * as a from "@/components/admin/ui";

export const metadata = { title: "운영자·권한 · GENIXX 관리자" };

/** 권한 표에 쓰는 사람 말 라벨 */
const permissionRows: { id: PermissionId; label: string; note: string }[] = [
  { id: "member.approve", label: "가입 승인", note: "교사·기관 계정을 열어 줍니다" },
  { id: "student.pii", label: "학생 개인정보 열람", note: "사유 입력이 강제됩니다" },
  { id: "student.code", label: "접속코드 발급·회수", note: "분실 신고 처리" },
  { id: "grade.review", label: "채점 검토", note: "AI 제안값에 의견을 답니다" },
  { id: "grade.confirm", label: "판정 확정", note: "리포트가 보호자에게 나갑니다" },
  { id: "item.write", label: "문항 작성", note: "" },
  { id: "item.review", label: "문항 검수", note: "작성자 본인은 불가" },
  { id: "report.publish", label: "리포트 발행 승인", note: "승인 전 결과 미노출" },
  { id: "psychometrics.read", label: "심리측정 분석", note: "" },
  { id: "system.manage", label: "시스템 설정", note: "연동 키·기능 플래그" },
  { id: "org.manage", label: "기관·응시권", note: "" },
  { id: "billing.read", label: "결제·정산 열람", note: "" },
  { id: "content.publish", label: "콘텐츠 발행", note: "" },
  { id: "inquiry.reply", label: "문의 답변", note: "" },
  { id: "audit.read", label: "감사 로그 열람", note: "" },
  { id: "staff.manage", label: "운영자·권한 관리", note: "총괄만 가능" },
];

export default function StaffPage() {
  return (
    <>
      <PageHead
        id="ADM-03"
        title="운영자 · 권한"
        lead="아이디를 만들고 역할을 붙이면 그 역할이 곧 권한입니다. 출제자는 자기 문항을 스스로 승인할 수 없고, 검수자는 문항을 쓸 수 없습니다."
      />

      <PermissionGate need="staff.manage">
        <StaffIssue />

        <div className="mt-8 mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {staffRoles.map((r) => (
            <section key={r.id} className={`${a.panel} p-5`}>
              <Badge label={r.label} className={r.tone} />
              <p className="mt-3 adm-t-md text-exam-muted">{r.desc}</p>
              <p className="mt-3 adm-t-sm font-bold text-exam-text">
                가진 권한 {r.permissions.length}개
              </p>
            </section>
          ))}
        </div>

        <TableCard
          title="역할별 권한"
          caption="✓ 표시가 있는 것만 할 수 있습니다. 권한을 바꾸면 감사 로그에 남습니다."
        >
          <table className={a.table}>
            <thead>
              <tr>
                <th className={`${a.th} sticky left-0 z-10 bg-exam-panel`}>할 수 있는 일</th>
                {staffRoles.map((r) => (
                  <th key={r.id} className={`${a.th} text-center`}>
                    {r.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissionRows.map((p) => (
                <tr key={p.id}>
                  <td className={`${a.tdStrong} sticky left-0 z-10 bg-white`}>
                    {p.label}
                    {p.note && (
                      <span className="mt-0.5 block adm-t-sm font-normal text-exam-muted">
                        {p.note}
                      </span>
                    )}
                  </td>
                  {staffRoles.map((r) => {
                    const ok = can(r.id, p.id);
                    return (
                      <td key={r.id} className={`${a.td} text-center`}>
                        {/* 기호만 두면 못 읽는 사람이 생겨 글자를 함께 적는다 */}
                        <span
                          className={`inline-flex min-h-[2rem] items-center justify-center gap-1 rounded-md px-2.5 adm-t-xs font-bold ${
                            ok
                              ? "bg-emerald-50 text-emerald-800"
                              : "bg-exam-raised text-exam-muted"
                          }`}
                        >
                          {ok ? "✓ 가능" : "불가"}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>

      </PermissionGate>
    </>
  );
}
