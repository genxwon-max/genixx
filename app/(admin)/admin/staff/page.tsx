import { can, staff, staffRoles, type PermissionId } from "@/lib/admin";
import { PageHead, TableCard, Badge } from "@/components/admin/Parts";
import PermissionGate from "@/components/admin/PermissionGate";
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
        id="ADM-12"
        title="운영자 · 권한"
        lead="역할마다 할 수 있는 일을 나눠 둡니다. 출제위원은 학생 개인정보를 볼 수 없고, 고객지원은 판정을 확정할 수 없습니다."
        action={
          <button type="button" className={a.btnPrimary}>
            운영자 추가하기
          </button>
        }
      />

      <PermissionGate need="staff.manage">
        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {staffRoles.map((r) => (
            <section key={r.id} className={`${a.panel} p-5`}>
              <Badge label={r.label} className={r.tone} />
              <p className="mt-3 adm-t-md text-exam-muted">{r.desc}</p>
              <p className="mt-3 adm-t-sm font-bold text-exam-text">
                가진 권한 {r.permissions.length}개 · 이 역할 {staff.filter((s) => s.role === r.id).length}명
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

        <div className="mt-6">
          <TableCard title={`운영자 ${staff.length}명`} caption="2단계 인증을 켜지 않은 계정은 붉게 표시됩니다.">
            <table className={a.table}>
              <thead>
                <tr>
                  <th className={a.th}>사번</th>
                  <th className={a.th}>이름</th>
                  <th className={a.th}>역할</th>
                  <th className={a.th}>소속 팀</th>
                  <th className={a.th}>2단계 인증</th>
                  <th className={a.th}>마지막 접속</th>
                  <th className={a.th}>할 일</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.id}>
                    <td className={a.td}>{s.id}</td>
                    <td className={a.tdStrong}>{s.name}</td>
                    <td className={a.td}>
                      <Badge
                        label={staffRoles.find((r) => r.id === s.role)!.label}
                        className={staffRoles.find((r) => r.id === s.role)!.tone}
                      />
                    </td>
                    <td className={a.td}>{s.team}</td>
                    <td className={a.td}>
                      <Badge
                        label={s.mfa ? "켜짐" : "꺼짐 — 확인 필요"}
                        className={
                          s.mfa
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                            : "border-rose-300 bg-rose-50 text-rose-700"
                        }
                      />
                    </td>
                    <td className={a.td}>{s.lastSeen}</td>
                    <td className={a.td}>
                      <button type="button" className={a.btnRowGhost}>
                        권한 바꾸기
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>
        </div>
      </PermissionGate>
    </>
  );
}
