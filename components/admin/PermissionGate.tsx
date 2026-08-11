"use client";

import { can, roleOf, type PermissionId } from "@/lib/admin";
import { useAdminPrefs } from "@/lib/adminStore";
import { NoPermission } from "./Parts";

const permissionLabel: Record<PermissionId, string> = {
  "member.read": "회원 열람",
  "member.approve": "가입 승인",
  "student.pii": "학생 개인정보 열람",
  "student.code": "접속코드 관리",
  "round.manage": "회차 관리",
  "item.write": "문항 작성",
  "item.review": "문항 검수",
  "grade.review": "채점 검토",
  "grade.confirm": "판정 확정",
  "org.manage": "기관 관리",
  "billing.read": "정산 열람",
  "content.publish": "콘텐츠 발행",
  "inquiry.reply": "문의 답변",
  "audit.read": "감사 로그 열람",
  "staff.manage": "운영자 관리",
  "report.publish": "리포트 발행 승인",
  "psychometrics.read": "심리측정 분석",
  "system.manage": "시스템 설정",
};

/**
 * 권한이 없는 화면은 메뉴에서 숨기지 않고 열되, 내용 대신 이유를 보여 준다.
 * 메뉴가 사람마다 달라지면 "내 화면에는 그게 없다"는 문의가 늘어나기 때문이다.
 */
export default function PermissionGate({
  need,
  children,
}: {
  need: PermissionId;
  children: React.ReactNode;
}) {
  const { role } = useAdminPrefs();
  if (can(role, need)) return <>{children}</>;
  return <NoPermission need={permissionLabel[need]} role={roleOf(role).label} />;
}
