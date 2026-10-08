"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { enterExpertConsole, expertWorks, type ExpertWork as Work } from "@/lib/expertConsole";
import { Head, btnGo, cardBox } from "@/components/student/self";
import { ExpertGate, useExpertMe } from "./me";

/**
 * 전문가 → 운영 콘솔의 작업 화면으로 건너가는 다리 (/expert/work/authoring · review · grading).
 *
 * 레일의 「문항 출제 · 문항 검토 · 진단 채점」이 여기로 온다. 권한을 확인한 뒤 콘솔에 그
 * 권한으로 들여보내고(lib/expertConsole.ts) 곧바로 그 화면으로 옮긴다. 권한이 없으면
 * 옮기지 않고 왜 못 가는지를 적는다.
 */
export default function ExpertWork({ work }: { work: Work }) {
  const me = useExpertMe();
  const router = useRouter();
  const w = expertWorks[work];
  const ok = me.hydrated && me.has(w.duty);
  const account = me.account;

  useEffect(() => {
    if (!ok || !account) return;
    const href = enterExpertConsole(account, work);
    if (href) router.replace(href);
  }, [ok, account, work, router]);

  const gate = ExpertGate({ title: w.label, me });
  if (gate) return gate;

  return (
    <>
      <Head title={w.label} />
      <div className={`${cardBox} mt-7 p-10 text-center`}>
        {ok ? (
          <p className="text-[13.5px] text-soft-muted">{w.label} 화면으로 이동하는 중입니다…</p>
        ) : (
          <>
            <p className="text-[15px] font-bold text-soft-ink">
              {me.approved ? "이 작업의 권한이 없습니다" : "아직 가입 승인 전입니다"}
            </p>
            <p className="mx-auto mt-2.5 max-w-[34rem] text-[13px] leading-[1.8] text-soft-muted">
              {w.label} 화면은 해당 권한을 받은 전문가에게만 열립니다. 권한은 운영진이 가입
              승인에서 정합니다.
            </p>
            <Link href="/expert" className={`${btnGo} mt-6`}>
              전문가 홈으로
            </Link>
          </>
        )}
      </div>
    </>
  );
}
