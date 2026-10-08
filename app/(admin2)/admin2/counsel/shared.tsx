"use client";

import Link from "next/link";
import { useAdminPrefs } from "@/lib/adminStore";
import type { Tone } from "@/lib/admin2";
import type { CaseStatus } from "@/lib/counselCaseStore";
import type { ExpertAccount } from "@/lib/expertAccounts";
import { useExpertAccounts } from "@/lib/expertAccountStore";
import { consoleLoginOf, isExpertConsoleLogin } from "@/lib/expertConsole";
import { Body, PageHead, Panel } from "@/components/admin2/ui";

/**
 * 「내 상담」 두 화면(EXP-06-3 · EXP-06-4)이 함께 쓰는 것.
 *
 * 콘솔 로그인은 아이디 한 줄뿐이라, 그 아이디로 전문가 계정을 다시 찾는다(lib/expertConsole.ts).
 * 자료와 규칙은 전문가 자리(/expert)의 상담 화면과 같은 저장소를 쓴다 — 여기는 그것을 콘솔의
 * 모양으로 다시 그린 자리다.
 */

/** 콘솔에 들어와 있는 상담사 계정. 상담사가 아니면 null */
export function useConsoleCounselor(): ExpertAccount | null {
  const prefs = useAdminPrefs();
  const experts = useExpertAccounts();
  if (!isExpertConsoleLogin(prefs.loginId)) return null;
  const hit = experts.find((a) => consoleLoginOf(a) === prefs.loginId) ?? null;
  return hit && hit.state === "approved" && hit.duties.includes("counselor") ? hit : null;
}

/** 상태 색 — 콘솔의 네 가지 색 안에서 고른다 */
export const caseTone: Record<CaseStatus, Tone> = {
  requested: "warn",
  confirmed: "info",
  ongoing: "ok",
  done: "muted",
  declined: "muted",
  canceled: "muted",
};

/** 상담사 계정이 아닐 때 대신 세우는 판 */
export function NotCounselor({ title }: { title: string }) {
  return (
    <>
      <PageHead title={title} />
      <Body>
        <Panel title="상담사 계정 전용 화면입니다">
          <p className="a2-t-sm text-(--a2-ink-2)">
            이 화면은 상담사 권한을 받은 전문가가 자기에게 들어온 상담을 보는 곳입니다. 운영자는{" "}
            <Link href="/admin2/counselors" className="underline">
              상담사 관리
            </Link>
            에서 상담사별 근무와 비용을 정합니다.
          </p>
        </Panel>
      </Body>
    </>
  );
}
