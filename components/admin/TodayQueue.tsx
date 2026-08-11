"use client";

import Link from "next/link";
import { can, pending, roleOf, type PermissionId } from "@/lib/admin";
import { useAdminPrefs } from "@/lib/adminStore";
import * as a from "./ui";

/**
 * 오늘 처리해야 할 큐.
 *
 * 대시보드의 첫 화면은 지표가 아니라 처리할 목록이어야 한다. 다만 목록은 지금 로그인한
 * 역할이 실제로 손댈 수 있는 것만 남긴다 — 출제자에게 「가입 승인 대기 7건」을 보여 주면
 * 눌러 봐야 권한 없음 화면만 나오고, 자기 일이 아닌 숫자가 매일 눈에 밟힌다.
 */
const queue: {
  label: string;
  count: number;
  unit: string;
  href: string;
  urgent: boolean;
  note: string;
  needs: PermissionId;
}[] = [
  {
    label: "AI 분석이 끝나 검토를 기다리는 응시",
    count: pending.grading,
    unit: "건",
    href: "/admin/grading",
    urgent: true,
    note: "이 중 판정 컷 경계 사례는 확정하지 말고 케이스 회의로 넘깁니다.",
    needs: "grade.review",
  },
  {
    label: "케이스 회의에서 합의해야 하는 경계 사례",
    count: pending.cases,
    unit: "건",
    href: "/admin/grading",
    urgent: true,
    note: "오늘 오후 4시 회의 안건입니다.",
    needs: "grade.confirm",
  },
  {
    label: "발행 승인을 기다리는 리포트",
    count: pending.reports,
    unit: "건",
    href: "/admin/report-approval",
    urgent: true,
    note: "승인 전에는 학부모 화면에 결과가 보이지 않습니다.",
    needs: "report.publish",
  },
  {
    label: "검수를 기다리는 제출 문항",
    count: pending.review,
    unit: "건",
    href: "/admin/review",
    urgent: true,
    note: "자기가 쓴 문항은 목록에 뜨지 않습니다.",
    needs: "item.review",
  },
  {
    label: "반려되어 되돌아온 내 문항",
    count: pending.authoring,
    unit: "건",
    href: "/admin/authoring",
    urgent: true,
    note: "사유 코드와 검수 코멘트가 문항에 붙어 있습니다.",
    needs: "item.write",
  },
  {
    label: "소속 확인을 기다리는 교사·기관 가입",
    count: pending.approvals,
    unit: "건",
    href: "/admin/approvals",
    urgent: false,
    note: "승인 전에는 학생 자료를 볼 수 없습니다.",
    needs: "member.approve",
  },
  {
    label: "답변하지 않은 문의",
    count: pending.inquiries,
    unit: "건",
    href: "/admin/inquiries",
    urgent: false,
    note: "24시간이 지난 문의가 1건 있습니다.",
    needs: "inquiry.reply",
  },
];

export default function TodayQueue() {
  const { role } = useAdminPrefs();
  const mine = queue.filter((q) => can(role, q.needs));
  const total = mine.reduce((s, q) => s + q.count, 0);

  if (mine.length === 0) {
    return (
      <section className={`${a.panel} p-6`}>
        <h2 className={a.cardTitle}>지금 처리할 것이 없습니다</h2>
        <p className={`${a.bodyText} mt-2`}>
          {roleOf(role).label} 권한으로 처리할 대기 건이 없습니다. 왼쪽 메뉴에서 담당 화면을 여시면
          됩니다.
        </p>
      </section>
    );
  }

  return (
    <section className={`${a.panel} overflow-hidden`}>
      <h2 className="border-b border-exam-line px-5 py-4 adm-t-lg font-black text-exam-text">
        처리 대기 {total}건
        <span className="ml-2 adm-t-sm font-bold text-exam-muted">
          {roleOf(role).short}가 처리할 수 있는 것만 보입니다
        </span>
      </h2>
      <ul>
        {mine.map((q) => (
          <li key={q.label} className="border-b border-exam-line last:border-b-0">
            <Link
              href={q.href}
              className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4 transition-colors hover:bg-exam-raised"
            >
              <span
                aria-hidden
                className={`${a.dot} ${q.urgent ? "bg-rose-500" : "bg-exam-line"}`}
              />
              <span className="min-w-0 flex-1">
                <span className="block adm-t-md font-bold text-exam-text">{q.label}</span>
                <span className="mt-0.5 block adm-t-sm text-exam-muted">{q.note}</span>
              </span>
              <span
                className={`adm-t-lg font-black tabular-nums ${
                  q.urgent ? "text-rose-700" : "text-exam-text"
                }`}
              >
                {q.count}
                <span className="ml-1 adm-t-sm font-bold text-exam-muted">{q.unit}</span>
              </span>
              <span className="adm-t-sm font-bold text-brand-700">처리하기 →</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
