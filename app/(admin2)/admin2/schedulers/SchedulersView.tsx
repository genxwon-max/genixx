"use client";

import { useMemo } from "react";
import { recordAction, useAdminPrefs } from "@/lib/adminStore";
import { useHydrated } from "@/lib/examStore";
import {
  countPrivacy,
  previewPurge,
  savePurgePolicy,
  usePrivacy,
} from "@/lib/privacyStore";
import { keepText, type PurgePolicy } from "@/lib/purgePolicy";
import { nowStamp, policyFullText } from "@/lib/reportRelease";
import {
  savePolicy,
  useAutoRelease,
  useSendPolicy,
  useSendRows,
} from "@/lib/reportSendStore";
import SchedulerBoard from "@/components/admin2/SchedulerBoard";
import { PageHead, SeedNote } from "@/components/admin2/ui";

/**
 * ADM-13-2 스케줄러.
 *
 * 화면은 components/admin2/SchedulerBoard.tsx가 그린다. 여기서는 값을 읽고 저장한다.
 *
 *   리포트 스케줄러    lib/reportSendStore.ts — 저장하면 예정 시각이 지난 리포트가 그 자리에서 나간다
 *   개인정보 스케줄러  lib/privacyStore.ts — 저장하면 파기 대기에 오르는 줄이 달라진다
 *
 * 둘 다 한 번 바꾸면 그 뒤 모든 리포트 · 모든 회원에 걸리는 값이라, 바꾼 것을 감사 로그에 남긴다.
 */

/** 자동 파기와 보관기간을 한마디로 — 감사 로그에 「무엇에서 무엇으로」를 적는 데 쓴다 */
const purgeText = (p: PurgePolicy) => `자동 파기 ${p.auto ? "켜짐" : "꺼짐"} · ${keepText(p)}`;

export default function SchedulersView() {
  const hydrated = useHydrated();
  const now = hydrated ? nowStamp() : "";
  const by = useAdminPrefs().staffName || "운영자";

  useAutoRelease();
  const rows = useSendRows(now);
  const policy = useSendPolicy();

  const privacy = usePrivacy();
  const counts = useMemo(() => countPrivacy(privacy.rows), [privacy.rows]);
  const purgePolicy: PurgePolicy = { auto: privacy.auto, ...privacy.keep };

  /* 오늘을 읽기 전에는 그리지 않는다 — 기다리는 리포트 수도 파기 대기 수도 오늘에서 세는 값이다 */
  if (!hydrated) return <PageHead title="스케줄러" />;

  return (
    <SchedulerBoard
      report={{
        policy,
        rows,
        now,
        href: "/admin2/reports/approval",
        onSave: (next) => {
          const was = policyFullText(policy);
          if (!savePolicy(next, by)) return;
          recordAction("리포트 스케줄러", "스케줄러 변경", `${was} → ${policyFullText(next)}`, by);
        },
      }}
      privacy={{
        policy: purgePolicy,
        setAt: privacy.setAt,
        setBy: privacy.setBy,
        queued: { expired: counts.queuedExpired, withdrawn: counts.queuedWithdrawn },
        preview: previewPurge,
        href: "/admin2/privacy/purge",
        onSave: (next) => {
          const was = purgeText(purgePolicy);
          if (!savePurgePolicy(next, by)) return;
          recordAction("개인정보 스케줄러", "스케줄러 변경", `${was} → ${purgeText(next)}`, by);
        },
      }}
    >
      <SeedNote>
        스케줄러의 값은 이 브라우저에만 저장됩니다(lib/reportSendStore.ts · lib/privacyStore.ts).
        시안에는 서버가 없어, 리포트는 화면을 열 때 예정 시각이 지난 것을 발행으로 적습니다 —
        붙일 때는 서버의 예약 작업이 정해 둔 시각에 실행합니다. 건수는 화면 설계를 위한
        예시입니다.
      </SeedNote>
    </SchedulerBoard>
  );
}
