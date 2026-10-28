"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { can } from "@/lib/admin";
import { recordAction, useAdminPrefs } from "@/lib/adminStore";
import { surveyDoneCount, useHydrated } from "@/lib/examStore";
import { surveyBandOf } from "@/lib/surveyBands";
import {
  activateSurvey,
  addDraftChoice,
  addDraftItem,
  addDraftOpen,
  addDraftSection,
  copyItemsToOtherBands,
  createSurvey,
  discardDraft,
  moveDraftEntry,
  moveDraftItem,
  moveDraftSection,
  patchDraft,
  patchDraftChoice,
  patchDraftItem,
  patchDraftOpen,
  patchDraftSection,
  publishDraft,
  removeDraftChoice,
  removeDraftItem,
  removeDraftOpen,
  removeDraftSection,
  renameSurvey,
  revertTo,
  surveyDocIdOf,
  surveySlugOf,
  uploadDraftItems,
  useSurveyDocs,
  useSurveyLog,
} from "@/lib/surveyStore";
import SurveyDesk from "@/components/admin2/SurveyDesk";
import { Body, PageHead, Panel } from "@/components/admin2/ui";

/**
 * ADM-14 설문지 한 벌. 화면은 components/admin2/SurveyDesk.tsx가 그리고, 여기서는 주소의 설문지를 읽고
 * 손잡이를 저장소에 잇는다. 발행 · 되돌리기 · 사용 시작 · 새 설문지는 감사 로그에도 남긴다.
 */
export default function SurveyDetail({ slug }: { slug: string }) {
  const docs = useSurveyDocs();
  const log = useSurveyLog();
  const hydrated = useHydrated();
  const prefs = useAdminPrefs();
  const router = useRouter();
  const by = prefs.staffName || "운영자";

  const back = (
    <Link href="/admin2/surveys" className="a2-btn">
      ← 설문지
    </Link>
  );

  /* 만든 설문지는 브라우저 저장소에만 있다 — 읽기 전에는 머리만 그린다(없는 설문지로 잘못 그리지 않게) */
  if (!hydrated) return <PageHead title="설문지" back={back} />;

  const id = surveyDocIdOf(slug, docs);
  if (!id) {
    return (
      <>
        <PageHead title="찾지 못했습니다" back={back} />
        <Body>
          <Panel title="없는 설문지">
            <p className="a2-t-sm text-(--a2-ink-2)">
              <span className="a2-mono">{slug}</span> 은(는) 없는 설문지입니다.
            </p>
          </Panel>
        </Body>
      </>
    );
  }

  const doc = docs[id];
  const band = surveyBandOf(doc.band).label;

  return (
    <SurveyDesk
      doc={doc}
      docs={docs}
      log={log.filter((e) => e.docId === id)}
      answered={surveyDoneCount(doc.key)}
      mayEdit={can(prefs.role, "item.write")}
      mayPublish={can(prefs.role, "item.review")}
      by={by}
      back={back}
      acts={{
        patch: (p) => patchDraft(id, p, by),
        patchItem: (itemId, p) => patchDraftItem(id, itemId, p, by),
        addItem: (section) => addDraftItem(id, by, section),
        removeItem: (itemId) => removeDraftItem(id, itemId, by),
        moveItem: (itemId, dir) => moveDraftItem(id, itemId, dir, by),
        patchChoice: (cid, p) => patchDraftChoice(id, cid, p, by),
        addChoice: (section) => addDraftChoice(id, by, section),
        removeChoice: (cid) => removeDraftChoice(id, cid, by),
        patchOpen: (oid, p) => patchDraftOpen(id, oid, p, by),
        addOpen: (section) => addDraftOpen(id, by, section),
        removeOpen: (oid) => removeDraftOpen(id, oid, by),
        moveEntry: (list, eid, dir) => moveDraftEntry(id, list, eid, dir, by),
        addSection: (kind) => addDraftSection(id, kind, by),
        patchSection: (sid, p) => patchDraftSection(id, sid, p, by),
        moveSection: (sid, dir) => moveDraftSection(id, sid, dir, by),
        removeSection: (sid) => removeDraftSection(id, sid, by),
        copyToOtherBands: () => copyItemsToOtherBands(id, by),
        upload: (texts, mode, fileName) => uploadDraftItems(id, texts, mode, fileName, by),
        discard: () => discardDraft(id, by),
        publish: (reason) => {
          const entry = publishDraft(id, by, reason);
          recordAction(`${doc.name} · ${band} v${entry.version}`, "설문 발행", reason, by);
        },
        revert: (entryId, reason) => {
          const entry = revertTo(id, entryId, by, reason);
          if (entry)
            recordAction(`${doc.name} · ${band} v${entry.version}`, "설문 되돌리기", reason, by);
        },
        rename: (name) => renameSurvey(id, name),
        activate: (reason) => {
          activateSurvey(id, by, reason);
          recordAction(`${doc.name} · ${band}`, "설문지 사용 시작", reason, by);
        },
        create: (spec) => {
          const made = createSurvey(spec, by);
          if (!made) return "설문지 이름을 적어 주세요.";
          recordAction(spec.name, "새 설문지", `「${doc.name}」을 복사해 만듦`, by);
          router.push(`/admin2/surveys/${surveySlugOf(made)}`);
          return null;
        },
      }}
    />
  );
}
