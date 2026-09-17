"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "@/lib/authStore";

export default function SessionBar() {
  const pathname = usePathname();
  const session = useSession();

  // 응시 중에는 이탈 경로를 노출하지 않는다 (오른쪽 위는 남은 시간이 차지한다)
  if (pathname.startsWith("/exam/session")) return null;

  /* 가입하지 않은 사람 — 로그인은 접속코드로 들어오는 학생 로그인, 회원가입은 일반 가입과
     같이 개인 · 기관을 고르는 첫 단계로 보낸다 */
  if (!session) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login/student"
          className="rounded-md border border-exam-line px-4 py-2 text-[13px] font-bold text-exam-text transition-colors hover:bg-exam-raised"
        >
          로그인
        </Link>
        <Link
          href="/signup/type"
          className="rounded-md bg-soft-primary px-4 py-2 text-[13px] font-bold text-white transition-colors hover:bg-soft-primary-dark"
        >
          회원가입
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-[13px] text-exam-muted sm:block">
        <b className="text-exam-text">{session.name}</b> 님
      </span>
      <button
        type="button"
        onClick={signOut}
        className="rounded-md border border-exam-line px-4 py-2 text-[13px] font-bold text-exam-text transition-colors hover:bg-exam-raised"
      >
        로그아웃
      </button>
    </div>
  );
}
