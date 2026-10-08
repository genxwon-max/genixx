"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { adminSignIn } from "@/lib/adminStore";
import { signIn } from "@/lib/authStore";
import { expertPreviews } from "@/lib/expertAccounts";
import { getExpertAccounts } from "@/lib/expertAccountStore";
import { enterExpertConsole, worksOf } from "@/lib/expertConsole";

/**
 * 콘솔을 권한별로 보기 (/admin2/as/author · reviewer · grader · admin, 뒤에 /me를 붙이면 내 정보).
 *
 * 디자인 확인용 입구다. 주소 하나가 그 권한만 받은 시연 계정으로 콘솔에 들여보낸다 —
 * 전문가 자리의 /expert/as/… 와 짝이다. 콘솔 문(ConsoleGate)보다 먼저 서야 하므로 껍데기
 * (components/admin2/Shell.tsx)가 이 주소만은 로그인 없이 그린다.
 *
 * ⚠ 시연용이다. 실제 서비스에서는 두지 않는다 — 로그인 없이 계정에 들어가는 문이다.
 */
export type ConsoleAsId = "admin" | "author" | "reviewer" | "grader" | "counselor";

export default function ConsoleAs({ who, me }: { who: ConsoleAsId; me: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (who === "admin") {
      adminSignIn({ loginId: "admin.park", staffName: "박서준", role: "super", temp: false });
      router.replace(me ? "/admin2/me" : "/admin2");
      return;
    }
    const hit = expertPreviews.find((p) => p.id === who);
    const account = getExpertAccounts().find((a) => a.id === hit?.accountId);
    if (!account) return;
    /* 회원 자리에도 같은 사람으로 들인다 — 상단 바의 「전문가 홈」이 그 사람의 홈으로 가도록 */
    signIn({
      role: "expert",
      name: account.profile.name,
      provider: account.provider,
      loginId: account.loginId || undefined,
      expertId: account.id,
      approved: true,
      mfaPassed: true,
    });
    const href = enterExpertConsole(account, worksOf(account)[0]);
    if (href) router.replace(me ? "/admin2/me" : href);
  }, [who, me, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-(--a2-bg) a2-t-sm text-(--a2-ink-3)">
      시연 계정으로 들어가는 중입니다…
    </div>
  );
}
