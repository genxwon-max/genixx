"use client";

import { useCallback, useState } from "react";
import { recordAction, useAdminPrefs } from "@/lib/adminStore";
import { useHydrated } from "@/lib/examStore";
import {
  assemble,
  blocksOf,
  changesOf,
  ruleSetDiff,
  ruleSetOf,
  type Kit,
  type RuleSet,
} from "@/lib/reportAssembly";
import { saveRuleSet, useKit, useRuleSetStamp } from "@/lib/reportAssetStore";
import { nowStamp } from "@/lib/reportRelease";
import { useAutoRelease } from "@/lib/reportSendStore";
import { syncWaitingReports, useReports } from "@/lib/reportStore";
import RuleBoard from "@/components/admin2/RuleBoard";
import { PageHead, SeedNote } from "@/components/admin2/ui";

/**
 * ADM-08-4 조립 규칙.
 *
 * 화면은 components/admin2/RuleBoard.tsx가 그린다. 여기서는 값을 읽고 저장한다.
 *
 *   한 벌    씨앗 위에 운영자가 고친 것을 덮은 규칙 · 컷 · 교차 셀 · 문구(lib/reportAssetStore.ts)
 *   저장     컷 · 규칙 · 교차 셀을 한 번에 적고, 발행 전 리포트를 그 자리에서 다시 조립한다
 *
 * ── 저장하면 발행 전 리포트가 함께 바뀐다 ──
 * 규칙을 고친 사람은 기다리던 리포트에도 걸렸다고 믿는다. 그래서 저장하는 자리에서 발행 전
 * 리포트를 새 규칙으로 다시 조립한다(lib/reportStore.ts의 syncWaitingReports). 몇 건이 달라지는지는
 * 저장하기 전에 화면 아래 저장 줄에 적혀 있다. 발행한 리포트는 바뀌지 않는다.
 *
 * 한 번 바꾸면 그 뒤 모든 리포트에 걸리는 값이라, 바꾼 것을 감사 로그에 남긴다.
 */
export default function RulesView() {
  const hydrated = useHydrated();
  const by = useAdminPrefs().staffName || "운영자";

  /* 리포트 승인과 같은 목록을 보고 센다 — 발행 전 리포트를 지금 규칙으로 맞추고, 예정일이 된
     것을 내보낸 뒤의 목록이다. 그래야 저장 줄의 「발행을 기다리는 리포트 몇 건」이 리포트 승인의
     건수와 같고, 「몇 건이 달라지는지」가 이 화면에서 고친 것만 센다 */
  useAutoRelease();
  const kit = useKit();
  const stamp = useRuleSetStamp();
  const reports = useReports();
  const [previewing, setPreviewing] = useState(false);

  const effect = useCallback(
    (next: Kit) => {
      const waiting = reports.filter((d) => d.state !== "published" && d.facts);
      const changed = waiting.filter((d) => {
        const asm = assemble(d.facts!, next);
        return (
          asm.reading.typeName !== d.typeName ||
          asm.reading.typeCode !== d.typeCode ||
          changesOf(d.blocks, blocksOf(asm)).length > 0
        );
      });
      return { waiting: waiting.length, changed: changed.length };
    },
    [reports],
  );

  /* 고친 규칙은 브라우저에만 있다. 하이드레이션 전에 그리면 처음 값으로 한 번 그렸다가 바뀐다 */
  if (!hydrated) return <PageHead title="조립 규칙" />;

  return (
    <RuleBoard
      kit={kit}
      stamp={stamp}
      previewing={previewing}
      onPreview={() => setPreviewing(true)}
      onPreviewClose={() => setPreviewing(false)}
      effect={effect}
      templatesHref="/admin2/reports/templates"
      templateHref={(source) =>
        source.startsWith("cross:") ? null : `/admin2/reports/templates/${source}`
      }
      guarded
      onSave={(next: RuleSet) => {
        const was = ruleSetOf(kit);
        if (!saveRuleSet(next, by)) return false;
        const changed = syncWaitingReports(nowStamp());
        recordAction(
          "조립 규칙",
          "규칙 변경",
          `${ruleSetDiff(was, next)}${changed > 0 ? ` (발행 전 리포트 ${changed}건 변경)` : ""}`,
          by,
        );
        return true;
      }}
    >
      <SeedNote>
        고친 규칙은 이 브라우저에만 저장됩니다(lib/reportAssetStore.ts). 표본은 화면에서 직접 적는
        값이고 실제 회원의 점수가 아닙니다. 회원의 리포트가 어떻게 조립됐는지는 리포트 승인의
        상세에서 볼 수 있습니다.
      </SeedNote>
    </RuleBoard>
  );
}
