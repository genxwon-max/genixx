"use client";

import Link from "next/link";
import { can } from "@/lib/admin";
import { recordAction, useAdminPrefs } from "@/lib/adminStore";
import { surveyDoneCount, useHydrated } from "@/lib/examStore";
import { surveyBandOf } from "@/lib/surveyBands";
import {
  addDraftChoice,
  addDraftItem,
  addDraftOpen,
  copyItemsToOtherBands,
  discardDraft,
  moveDraftEntry,
  moveDraftItem,
  patchDraft,
  patchDraftChoice,
  patchDraftItem,
  patchDraftOpen,
  publishDraft,
  removeDraftChoice,
  removeDraftItem,
  removeDraftOpen,
  revertTo,
  surveyDocIdOf,
  uploadDraftItems,
  useSurveyDocs,
  useSurveyLog,
} from "@/lib/surveyStore";
import SurveyDesk from "@/components/admin2/SurveyDesk";
import { Body, PageHead, Panel } from "@/components/admin2/ui";

/**
 * ADM-14 설문 한 벌. 화면은 components/admin2/SurveyDesk.tsx가 그리고, 여기서는 주소의 벌을 읽고
 * 손잡이를 저장소에 잇는다. 발행 · 되돌리기는 감사 로그에도 남긴다.
 */
export default function SurveyDetail({ slug }: { slug: string }) {
  const id = surveyDocIdOf(slug);
  const docs = useSurveyDocs();
  const log = useSurveyLog();
  const hydrated = useHydrated();
  const prefs = useAdminPrefs();
  const by = prefs.staffName || "운영자";

  const back = (
    <Link href="/admin2/surveys" className="a2-btn">
      ← 설문지
    </Link>
  );

  if (!id) {
    return (
      <>
        <PageHead title="찾지 못했습니다" back={back} />
        <Body>
          <Panel title="없는 설문">
            <p className="a2-t-sm text-(--a2-ink-2)">
              <span className="a2-mono">{slug}</span> 은(는) 없는 설문입니다.
            </p>
          </Panel>
        </Body>
      </>
    );
  }

  const doc = docs[id];
  const band = surveyBandOf(doc.band).label;
  /* 저장분은 브라우저에만 있다 — 하이드레이션 전에는 머리만 그려, 처음 판이 잠깐 섰다 바뀌지 않게 한다 */
  if (!hydrated) return <PageHead title={`${band} ${doc.live.title}`} back={back} />;

  return (
    <SurveyDesk
      doc={doc}
      log={log.filter((e) => e.docId === id)}
      answered={surveyDoneCount(doc.key)}
      mayEdit={can(prefs.role, "item.write")}
      mayPublish={can(prefs.role, "item.review")}
      by={by}
      back={back}
      acts={{
        patch: (p) => patchDraft(id, p, by),
        patchItem: (itemId, p) => patchDraftItem(id, itemId, p, by),
        addItem: () => addDraftItem(id, by),
        removeItem: (itemId) => removeDraftItem(id, itemId, by),
        moveItem: (itemId, dir) => moveDraftItem(id, itemId, dir, by),
        patchChoice: (cid, p) => patchDraftChoice(id, cid, p, by),
        addChoice: () => addDraftChoice(id, by),
        removeChoice: (cid) => removeDraftChoice(id, cid, by),
        patchOpen: (oid, p) => patchDraftOpen(id, oid, p, by),
        addOpen: () => addDraftOpen(id, by),
        removeOpen: (oid) => removeDraftOpen(id, oid, by),
        moveEntry: (list, eid, dir) => moveDraftEntry(id, list, eid, dir, by),
        copyToOtherBands: () => copyItemsToOtherBands(id, by),
        upload: (texts, mode, fileName) => uploadDraftItems(id, texts, mode, fileName, by),
        discard: () => discardDraft(id, by),
        publish: (reason) => {
          const entry = publishDraft(id, by, reason);
          recordAction(`${band} ${doc.live.title} v${entry.version}`, "설문 발행", reason, by);
        },
        revert: (entryId, reason) => {
          const entry = revertTo(id, entryId, by, reason);
          if (entry)
            recordAction(
              `${band} ${doc.live.title} v${entry.version}`,
              "설문 되돌리기",
              reason,
              by,
            );
        },
      }}
    />
  );
}
