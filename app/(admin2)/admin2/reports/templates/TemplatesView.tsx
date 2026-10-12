"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAdminPrefs } from "@/lib/adminStore";
import { useHydrated } from "@/lib/examStore";
import { keyOf, measuredAxes } from "@/lib/reportAssets";
import { addSlot, useCustomSlots, useEveryTemplate, type TemplateRow } from "@/lib/reportAssetStore";
import TemplateBoard, { AddSlotDialog } from "@/components/admin2/TemplateBoard";
import { SeedNote } from "@/components/admin2/ui";

/**
 * ADM-08-1 해석 템플릿 — 목록.
 *
 * 화면은 components/admin2/TemplateBoard.tsx가 그린다. 여기서는 칸을 읽고, 「템플릿 추가」로
 * 새 항목을 만든다.
 *
 * ⚠ 고치는 자리는 제 주소로 간다(/admin2/reports/templates/[id]). 한동안 목록 아래에 판으로
 *   폈다 — 문구가 한두 문장이라 그 편이 가볍다고 보았는데, 주소가 없어 「이 칸 좀 봐 달라」고
 *   링크를 건넬 수가 없었다.
 */

const hrefOf = (r: TemplateRow) => `/admin2/reports/templates/${r.id}`;

export default function TemplatesView() {
  const router = useRouter();
  const by = useAdminPrefs().staffName || "운영자";
  const [adding, setAdding] = useState(false);
  const hydrated = useHydrated();
  const custom = useCustomSlots();
  const customIds = useMemo(() => custom.map((c) => c.id), [custom]);
  const rows = useEveryTemplate();

  return (
    <TemplateBoard
      rows={rows}
      customSlots={customIds}
      ready={hydrated}
      hrefOf={hrefOf}
      onAdd={() => setAdding(true)}
    >
      {adding && (
        <AddSlotDialog
          onClose={() => setAdding(false)}
          onSubmit={(spec) => {
            const id = addSlot(spec, by);
            if (!id) {
              return spec.label.trim() ? "같은 이름의 항목이 이미 있습니다." : "항목 이름을 적어 주세요.";
            }
            /* 만든 자리의 첫 칸(초등 3학년 — 빈 칸이 물러서는 학년)으로 바로 들어가 문구를 쓴다 */
            router.push(
              `/admin2/reports/templates/${keyOf(
                id,
                "e3",
                spec.byAxis ? measuredAxes[0].id : null,
                spec.byBand ? "L3" : null,
              )}`,
            );
            return null;
          }}
        />
      )}

      <SeedNote>
        고친 문구는 이 브라우저에만 저장됩니다(lib/reportAssetStore.ts). 기본 문구는
        lib/reportAssets.ts의 기본값입니다. 고친 문구는 발행을 기다리는 리포트와 앞으로 조립하는
        리포트에 들어가고, 이미 발행한 리포트는 바뀌지 않습니다.
      </SeedNote>
    </TemplateBoard>
  );
}
