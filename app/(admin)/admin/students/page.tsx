import { PageHead } from "@/components/admin/Parts";
import PermissionGate from "@/components/admin/PermissionGate";
import StudentTable from "@/components/admin/StudentTable";

export const metadata = { title: "학생·접속코드 · GENIXX 관리자" };

export default function StudentsPage() {
  return (
    <>
      {/* 설명 줄을 두지 않는다. 무엇을 하는 화면인지는 아래 요약 줄과 표가
          이미 말한다. */}
      <PageHead title="학생 · 접속코드" />
      <PermissionGate need="student.code">
        <StudentTable />
      </PermissionGate>
    </>
  );
}
