"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, type Role } from "@/lib/authStore";

const tabsByRole: Record<Role, { label: string; href: string }[]> = {
  director: [
    { label: "학원생 명부", href: "/exam/roster" },
    { label: "응시 현황", href: "/exam" },
  ],
  parent: [
    { label: "자녀 관리", href: "/my/children" },
    { label: "응시 현황", href: "/exam" },
  ],
  student: [
    { label: "응시 현황", href: "/exam" },
    { label: "결과 리포트", href: "/exam/result" },
  ],
  // 교사·전문가·운영관리자는 응시 존을 쓰지 않는다. 각자의 콘솔로 안내만 한다.
  teacher: [{ label: "관찰 설문", href: "/survey/teacher" }],
  expert: [],
  admin: [{ label: "관리자 콘솔", href: "/admin" }],
};

export default function ExamTabs() {
  const pathname = usePathname();
  const session = useSession();

  // 실제 응시 화면과 미로그인 상태에서는 이동 링크를 감춘다
  if (pathname.startsWith("/exam/session") || !session) return null;

  const tabs = tabsByRole[session.role] ?? tabsByRole.student;

  return (
    <nav className="hidden items-center gap-1 sm:flex" aria-label="응시 메뉴">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-3.5 py-2 text-[13px] font-bold transition-colors ${
              active
                ? "bg-exam-raised text-exam-text"
                : "text-exam-muted hover:bg-exam-raised/60 hover:text-exam-text"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
