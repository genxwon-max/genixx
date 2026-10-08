"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { signIn } from "@/lib/authStore";
import { expertPreviews, type ExpertPreview } from "@/lib/expertAccounts";
import { getExpertAccounts } from "@/lib/expertAccountStore";
import { Head, cardBox } from "@/components/student/self";

/**
 * 권한별로 보기 (/expert/as · /expert/as/author …) — 디자인 확인용 입구.
 *
 * 전문가 화면은 받은 권한에 따라 메뉴와 홈이 달라진다. 그것을 보려고 권한마다 가입 · 승인 ·
 * 로그인을 되풀이하지 않도록, 주소 하나가 그 권한만 받은 시연 계정으로 들여보낸다.
 * /expert/as 는 그 주소들을 한 장에 세운 목록이다.
 *
 * ⚠ 시연용이다. 실제 서비스에서는 이 주소를 두지 않는다 — 로그인 없이 계정에 들어가는 문이다.
 */

/** 주소가 가리키는 시연 계정으로 들어가 전문가 홈으로 옮긴다 */
export function ExpertAsEnter({ who }: { who: ExpertPreview }) {
  const router = useRouter();
  const hit = expertPreviews.find((p) => p.id === who)!;

  useEffect(() => {
    const account = getExpertAccounts().find((a) => a.id === hit.accountId);
    if (!account) return;
    signIn({
      role: "expert",
      name: account.profile.name,
      provider: account.provider,
      email: account.email || undefined,
      loginId: account.loginId || undefined,
      expertId: account.id,
      approved: account.state === "approved",
      mfaPassed: true,
    });
    router.replace("/expert");
  }, [hit, router]);

  return (
    <>
      <Head title={`${hit.label} 화면`} />
      <p className={`${cardBox} mt-7 p-12 text-center text-[13px] text-soft-muted`}>
        {hit.label} 시연 계정으로 들어가는 중입니다…
      </p>
    </>
  );
}

/** 권한별 주소 목록 */
export default function ExpertAsIndex() {
  return (
    <>
      <Head
        title="전문가 화면 — 권한별로 보기"
        lead="권한마다 메뉴와 홈이 다릅니다. 항목을 누르면 그 권한만 받은 시연 계정으로 들어갑니다."
      />
      <ul className={`${cardBox} mt-7 divide-y divide-slate-100 overflow-hidden`}>
        {expertPreviews.map((p) => (
          <li key={p.id}>
            <Link
              href={`/expert/as/${p.id}`}
              className="grid grid-cols-[minmax(0,1fr)_1rem] items-center gap-x-3 px-5 py-4 transition-colors hover:bg-slate-50 sm:px-6"
            >
              <span className="min-w-0">
                <span className="block text-[15.5px] font-bold text-soft-ink">{p.label}</span>
                <span className="mt-1 block text-[13px] text-soft-muted">{p.note}</span>
                <span className="mt-1 block text-[12.5px] tabular-nums text-slate-400">
                  /expert/as/{p.id}
                </span>
              </span>
              <span aria-hidden className="text-[20px] leading-none text-slate-300">
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
