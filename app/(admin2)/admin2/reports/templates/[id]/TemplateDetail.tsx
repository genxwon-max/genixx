"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAdminPrefs } from "@/lib/adminStore";
import { useHydrated } from "@/lib/examStore";
import { slotOf } from "@/lib/reportAssets";
import { removeSlot, resetTemplate, saveTemplate, useTemplateById } from "@/lib/reportAssetStore";
import { nowStamp } from "@/lib/reportRelease";
import { syncWaitingReports } from "@/lib/reportStore";
import TemplateDesk from "@/components/admin2/TemplateDesk";
import { Body, PageHead, Panel, SeedNote } from "@/components/admin2/ui";

/**
 * 해석 템플릿 한 칸.
 *
 * 화면은 components/admin2/TemplateDesk.tsx가 그린다. 여기서는 주소의 칸을 읽고 저장한다.
 *
 * ── 고친 문구가 걸리는 범위 ──
 * 저장하면 그 뒤에 조립하는 리포트와, 이 칸의 문구를 쓰는 **발행 전 리포트**에 걸린다
 * (lib/reportStore.ts의 syncWaitingReports). 검토하다 문구가 이상해 여기로 와서 고쳤는데 그
 * 리포트는 옛 글 그대로 나가는 일이 없게 한다. 발행한 리포트는 바뀌지 않는다.
 */
export default function TemplateDetail({ id }: { id: string }) {
  const row = useTemplateById(id);
  const hydrated = useHydrated();
  const by = useAdminPrefs().staffName || "운영자";
  const router = useRouter();

  const back = (
    <Link href="/admin2/reports/templates" className="a2-btn">
      ← 해석 템플릿
    </Link>
  );

  if (!row) {
    return (
      <>
        <PageHead title="찾지 못했습니다" back={back} />
        <Body>
          <Panel title="없는 칸">
            <p className="a2-t-sm text-(--a2-ink-2)">
              <span className="a2-mono">{id}</span> 은(는) 격자에 없는 칸입니다.
            </p>
          </Panel>
        </Body>
      </>
    );
  }

  /* 저장분은 브라우저에만 있어 서버에서 그릴 값이 없다. 머리는 먼저 그려 화면이 통째로
     비지 않게 하고, 초안은 하이드레이션 뒤에 잡는다 — useEditDraft가 첫 렌더의 값을
     붙드는데 씨앗 값으로 잡히면 저장분이 들어와도 dirty가 거짓으로 켜진다 */
  if (!hydrated) return <PageHead title={slotOf(row.slot).label} back={back} />;

  return (
    <TemplateDesk
      /* 기본 문구로 되돌리면 판을 새로 세운다 — 초안은 바깥 값이 바뀌어도 따라가지 않아서,
         그대로 두면 되돌린 뒤에도 글 칸에 고친 글이 「저장하지 않은 변경」으로 남는다 */
      key={`${row.id}:${row.edited ? "edited" : "seed"}`}
      row={row}
      back={back}
      guarded
      onSave={(title, text) => {
        if (!saveTemplate(row.id, title, text, by)) return false;
        syncWaitingReports(nowStamp());
        return true;
      }}
      onReset={() => {
        resetTemplate(row.id);
        syncWaitingReports(nowStamp());
      }}
      onRemove={() => {
        if (
          !window.confirm(
            `「${slotOf(row.slot).label}」 항목을 지웁니다.\n학년마다 쓴 문구와 조립 규칙이 함께 사라지고, 발행을 기다리는 리포트에서도 이 항목이 빠집니다. 이미 발행한 리포트는 그대로입니다.\n\n지울까요?`,
          )
        )
          return;
        router.push("/admin2/reports/templates");
        removeSlot(row.slot);
        syncWaitingReports(nowStamp());
      }}
    >
      <SeedNote />
    </TemplateDesk>
  );
}
