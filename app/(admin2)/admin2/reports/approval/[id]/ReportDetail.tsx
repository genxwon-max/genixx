"use client";

import Link from "next/link";
import { useState } from "react";
import { useAdminPrefs } from "@/lib/adminStore";
import { useHydrated } from "@/lib/examStore";
import { nowStamp } from "@/lib/reportRelease";
import { sendNow, useAutoRelease, useSendPolicy, useSendRow } from "@/lib/reportSendStore";
import { clearOverride, overrideBlock } from "@/lib/reportStore";
import ReportPreview from "@/components/admin2/ReportPreview";
import ReportView from "@/components/admin2/ReportView";
import { Body, PageHead, Panel, SeedNote } from "@/components/admin2/ui";

/**
 * EXP-08 리포트 상세 — 이 회원의 리포트를 읽고, 고치고, 먼저 내보낸다.
 *
 * 화면은 components/admin2/ReportView.tsx와 ReportPreview.tsx가 그린다. 여기서는 값을 읽고
 * 저장한다 — 발행(lib/reportSendStore.ts의 sendNow)과 문구 수정(lib/reportStore.ts).
 *
 * ⚠ 여기서 고치는 것은 **이 아이 하나뿐이다.** 문구가 아니라 템플릿이 잘못됐으면 해석
 *   템플릿(ADM-08-1)을 고쳐야 같은 문제가 다음 아이에게 안 간다. 「조립 내역」의 「문구 보기」가
 *   그 문단의 문구가 든 칸으로 간다.
 */
export default function ReportDetail({ id }: { id: string }) {
  const hydrated = useHydrated();
  const now = hydrated ? nowStamp() : "";
  useAutoRelease();
  const row = useSendRow(id, now);
  const policy = useSendPolicy();
  const by = useAdminPrefs().staffName || "운영자";

  const [ask, setAsk] = useState(false);
  const [preview, setPreview] = useState(false);

  const back = (
    <Link href="/admin2/reports/approval" className="a2-btn">
      ← 리포트 승인
    </Link>
  );

  if (!hydrated) return <PageHead title="리포트" back={back} />;

  if (!row) {
    return (
      <>
        <PageHead title="찾지 못했습니다" back={back} />
        <Body>
          <Panel title="없는 리포트">
            <p className="a2-t-sm text-(--a2-ink-2)">
              <span className="a2-mono">{id}</span> 리포트가 목록에 없습니다. 채점이 끝나지 않은
              답안지에는 리포트가 없습니다.
            </p>
          </Panel>
        </Body>
      </>
    );
  }

  return (
    <ReportView
      row={row}
      policy={policy}
      back={back}
      sheetHref={row.sheet ? `/admin2/grading/members/${row.sheet}` : undefined}
      rulesHref="/admin2/reports/rules"
      templateHrefOf={(source) =>
        source.startsWith("cross:") ? "/admin2/reports/rules" : `/admin2/reports/templates/${source}`
      }
      asking={ask}
      onAsk={() => setAsk(true)}
      onAskClose={() => setAsk(false)}
      onPublish={() => {
        sendNow(row, by);
        setAsk(false);
      }}
      onPreview={() => setPreview(true)}
    >
      {preview && (
        <ReportPreview
          row={row}
          sent={row.send === "sent"}
          onSave={(changes, why) => {
            for (const c of changes) overrideBlock(row.id, c.blockId, c.text, by, why);
          }}
          onRevert={(blockId) => clearOverride(row.id, blockId, by)}
          onClose={() => setPreview(false)}
        />
      )}
      <SeedNote />
    </ReportView>
  );
}
