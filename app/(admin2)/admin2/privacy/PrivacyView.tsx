"use client";

import { useState } from "react";
import { today, usePrivacy, type PrivacyRow } from "@/lib/privacyStore";
import PrivacyBoard, { type PrivacyTab } from "@/components/admin2/PrivacyBoard";

/**
 * ADM-10 개인정보 관리 — 누가 무엇에 동의했고, 무엇을 언제 지우는가.
 *
 * 화면은 components/admin2/PrivacyBoard.tsx가 그린다. 여기서는 회원과 오늘을 읽어 넘긴다.
 *
 * ── 지우는 일은 여기 없다 ──
 * 파기는 제 화면(ADM-10-1 개인정보 파기)으로 나갔다. 여기는 명부라 회원을 찾으러 매일 열고,
 * 저기는 되돌릴 수 없는 단추가 있어 지울 때만 연다.
 */

const hrefOf = (v: PrivacyRow) => `/admin2/privacy/${v.id}`;

export default function PrivacyView() {
  const { rows } = usePrivacy();
  const [tab, setTab] = useState<PrivacyTab>("all");

  return (
    <PrivacyBoard
      rows={rows}
      now={today()}
      tab={tab}
      onTab={setTab}
      hrefOf={hrefOf}
      purgeHref="/admin2/privacy/purge"
    />
  );
}
