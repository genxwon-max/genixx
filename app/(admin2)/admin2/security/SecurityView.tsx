"use client";

import { can } from "@/lib/admin";
import { recordAction, useAdminPrefs } from "@/lib/adminStore";
import { patchSecurity, useSecurity, useSecurityLog } from "@/lib/securityStore";
import GuardBoard from "@/components/admin2/GuardBoard";

/**
 * ADM-05-3 응시 화면 보호 — 화면은 components/admin2/GuardBoard.tsx가 그린다. 여기서는 설정과 기록을 읽고,
 * 사유를 받은 변경을 저장소와 감사 로그에 남긴다.
 */
export default function SecurityView() {
  const settings = useSecurity();
  const log = useSecurityLog();
  const prefs = useAdminPrefs();
  const by = prefs.staffName || "운영자";
  return (
    <GuardBoard
      settings={settings}
      log={log}
      may={can(prefs.role, "item.review")}
      onChange={(id, next, what, reason) => {
        patchSecurity({ guards: { ...settings.guards, [id]: next } }, by, what, reason);
        recordAction("응시 화면 보호", what, reason, by);
      }}
    />
  );
}
