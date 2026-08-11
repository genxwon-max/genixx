import { PageHead } from "@/components/admin/Parts";
import PermissionGate from "@/components/admin/PermissionGate";
import StudentTable from "@/components/admin/StudentTable";

export const metadata = { title: "학생·접속코드 · GENIXX 관리자" };

export default function StudentsPage() {
  return (
    <>
      <PageHead
        id="ADM-03"
        title="학생 · 접속코드"
        lead="기관과 학부모가 등록한 학생을 한곳에서 봅니다. 코드 분실 신고가 오면 여기서 다시 발급합니다."
      />
      <PermissionGate need="student.code">
        <StudentTable />
      </PermissionGate>
    </>
  );
}
