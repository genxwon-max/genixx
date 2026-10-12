"use client";

import Link from "next/link";
import { useState } from "react";
import { n } from "@/lib/admin2";
import { recordAction, useAdminPrefs } from "@/lib/adminStore";
import { purge, usePrivacy } from "@/lib/privacyStore";
import { purgeReasonLabel, type PurgeReason } from "@/lib/purgePolicy";
import { canOpen, useScreenAccess, visibleScreens } from "@/lib/screenAccessStore";
import PurgeBoard, { type PurgeRow, type PurgeTab } from "@/components/admin2/PurgeBoard";

/**
 * ADM-10-1 개인정보 파기.
 *
 * 화면은 components/admin2/PurgeBoard.tsx가 그린다. 여기서는 값을 읽고 파기를 실행한다.
 *
 *   파기 대기 · 완료   lib/privacyStore.ts — 철회 요청과 보관기간이 지난 줄
 *   자동 파기 · 보관기간  같은 저장소의 스케줄러 값 — 읽기만 한다. 고치는 자리는 시스템 >
 *                        스케줄러(/admin2/schedulers)다
 *
 * 실행한 파기는 두 군데에 남는다 — 감사 로그에는 이 조작이 한 줄로, 회원 이력에는 사람마다 한
 * 줄로. 물어 오는 쪽은 늘 사람 하나를 짚어서 묻는다.
 */

const SCHEDULERS = "/admin2/schedulers";

const detailHrefOf = (v: PurgeRow) => `/admin2/privacy/${v.id}`;

export default function PurgeView() {
  const { rows, auto, keep } = usePrivacy();
  const prefs = useAdminPrefs();
  const by = prefs.staffName || "운영자";
  const [tab, setTab] = useState<PurgeTab>("queued");
  const [why, setWhy] = useState("");
  /* 접힌 채로 연다 — 되돌릴 수 없는 단추가 표를 훑는 길에 놓이지 않게 한다 */
  const [open, setOpen] = useState(false);

  /* 스케줄러 화면을 열 수 있는 사람에게만 「스케줄러에서 변경」을 보인다 */
  const access = useScreenAccess();
  const screens = visibleScreens(access, { loginId: prefs.loginId, super: prefs.role === "super" });

  const run = (reason: PurgeReason) => {
    const list = rows.filter((v) => v.purge === "queued" && v.purgeReason === reason);
    const note = why.trim();
    /* 사유 없이는 실행하지 않는다 — 단추를 잠가 두었지만 그것만 믿지 않는다 */
    if (list.length === 0 || note.length < 5) return;
    const ok = window.confirm(
      `${n(list.length)}명의 개인정보를 파기합니다.\n\n되돌릴 수 없습니다. 누가 언제 왜 지웠는지는 회원마다 이력에 남고, 처리 결과는 정보주체에게 통지해야 합니다.\n\n실행할까요?`,
    );
    if (!ok) return;
    purge(
      list.map((v) => ({ id: v.id, reason })),
      by,
      note,
    );
    recordAction(
      `개인정보 ${n(list.length)}건 (${purgeReasonLabel[reason]})`,
      "개인정보 파기 실행",
      note,
      by,
    );
    setWhy("");
    /* 지운 줄은 대기에서 빠진다 — 빈 표를 보여 주는 대신 결과가 있는 탭으로 옮겨 준다 */
    setTab("done");
  };

  return (
    <PurgeBoard
      rows={rows}
      auto={auto}
      keep={keep}
      tab={tab}
      onTab={setTab}
      open={open}
      onToggle={() => setOpen((v) => !v)}
      why={why}
      onWhy={setWhy}
      onRun={run}
      back={
        <Link href="/admin2/privacy" className="a2-btn">
          ← 개인정보 관리
        </Link>
      }
      detailHrefOf={detailHrefOf}
      schedulerHref={canOpen(screens, SCHEDULERS) ? SCHEDULERS : undefined}
    />
  );
}
