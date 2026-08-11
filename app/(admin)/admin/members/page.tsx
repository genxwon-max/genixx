import { members, memberStateLabel, memberTypeLabel } from "@/lib/admin";
import { PageHead, TableCard, Badge, StatCard } from "@/components/admin/Parts";
import PermissionGate from "@/components/admin/PermissionGate";
import * as a from "@/components/admin/ui";

export const metadata = { title: "회원 · GENIXX 관리자" };

const typeTone: Record<string, string> = {
  parent: "border-brand-300 bg-brand-50 text-brand-700",
  teacher: "border-emerald-300 bg-emerald-50 text-emerald-700",
  org: "border-accent-300 bg-accent-100 text-accent-600",
  student: "border-amber-300 bg-amber-50 text-amber-700",
};

export default function MembersPage() {
  const count = (t: string) => members.filter((m) => m.type === t).length;

  return (
    <>
      <PageHead
        id="ADM-02-1"
        title="회원"
        lead="학부모·교사·기관·학생 본인 계정을 함께 봅니다. 연락처는 가려서 보여 주고, 전체를 보려면 사유를 남겨야 합니다."
        action={
          <>
            <button type="button" className={a.btnGhost}>
              목록 내려받기
            </button>
            <button type="button" className={a.btnPrimary}>
              회원 찾기
            </button>
          </>
        }
      />

      <PermissionGate need="member.read">
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="학부모" value={count("parent")} unit="명" note="자녀를 등록하는 대표 회원" />
          <StatCard label="교사" value={count("teacher")} unit="명" note="승인 후 설문만 입력" />
          <StatCard label="기관" value={count("org")} unit="곳" note="명부·응시권 관리" />
          <StatCard label="학생 본인" value={count("student")} unit="명" note="만 14세 이상 직접 신청" />
        </div>

        <TableCard
          title={`전체 회원 ${members.length}명`}
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
              {members.map((m) => (
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
                    <button type="button" className={a.btnRowGhost}>
                      자세히 보기
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>

        <p className="mt-4 rounded-md border border-exam-line bg-exam-panel px-5 py-4 adm-t-sm text-exam-muted">
          탈퇴 회원의 자료는 관련 법령이 정한 기간이 지나면 자동으로 파기됩니다. 파기 전에 미리
          지워 달라는 요청이 오면 <b className="text-exam-text">개인정보·감사 로그</b> 화면에서
          처리하고 결과를 통지합니다.
        </p>
      </PermissionGate>
    </>
  );
}
