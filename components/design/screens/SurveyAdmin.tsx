"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { designLinks } from "@/lib/designScreens";
import {
  diffForms,
  seedSurveyDocs,
  seedSurveyLog,
  sectionsOf,
  surveySlugOf,
  type SurveyDoc,
  type SurveyDocId,
  type SurveyForm,
  type SurveyDocs,
  type SurveyLogEntry,
} from "@/lib/surveyStore";
import SurveyBoard from "@/components/admin2/SurveyBoard";
import SurveyDesk, {
  type SurveyActs,
  type SurveyAsk,
  type SurveyTab,
} from "@/components/admin2/SurveyDesk";
import { LinkSurvey } from "@/components/exam/SurveyForm";
import ConsoleFrame, { type ConsoleMe } from "../ConsoleFrame";
import { flowStudent } from "./studentFlow";

/**
 * 설문 관리 (실제 주소 /admin2/surveys · /admin2/surveys/[갈래-학년대]) — 디자인 (2026-10-28, /design2).
 *
 * 9월 27일 옛 콘솔을 걷어 낼 때 함께 사라졌던 「설문 원본」(ADM-14)을 /admin2에 다시 세운 화면이다.
 * 목록은 사용 중 · 보관한 설문지, 한 벌을 열면 설문 양식 · 상세 설문 · 미리보기 · 파일로 올리기 · 변경 기록
 * 탭과 발행 · 되돌리기 창이 선다. 탭은 응답자 창(/survey/[갈래])의 차례를 따른다(2026-10-28 사용자 요청).
 *
 * 화면은 실제 조각(components/admin2/SurveyBoard.tsx · SurveyDesk.tsx)이고, 값은 처음 판(lib/survey.ts의
 * 설문지 v1.0)에 예시 수정을 얹어 여기 적었다. 탭 · 발행 · 되돌리기 · 버리기는 그 상태의 주소로 가고,
 * 칸에 적는 것은 저장되지 않는다.
 */

const to = designLinks("survey-admin");
const AT = "2026-10-20 15:12";
const ADMIN = "박서준";
const ID: SurveyDocId = "guardian:e34";
const SLUG = surveySlugOf(ID);

/** 검수자 — 고칠 수는 없고 발행만 한다 */
const reviewer: ConsoleMe = { name: "이정민", role: "검수자", loginId: "kr.reviewer" };

/* ── 예시 수정 — 학부모 설문 초3~4에 세 곳 ── */
const seed = seedSurveyDocs[ID];

const editedForm: SurveyForm = {
  ...seed.live,
  desc: `${seed.live.desc} 답하는 데 10분쯤 걸립니다.`,
  items: [
    ...seed.live.items.map((i, n) =>
      n === 0
        ? { ...i, text: "어려운 문제를 만나도 규칙이나 원리를 스스로 찾아내려고 합니다." }
        : i,
    ),
    {
      id: `${ID}-new`,
      no: "P31",
      section: seed.live.items[seed.live.items.length - 1]?.section ?? "",
      group: "",
      text: "아이는 친구와 함께 무언가를 만들 때 자기 몫을 끝까지 해냅니다.",
    },
  ],
};

/** 고치는 중 — 초안에만 세 곳이 달라졌다 */
const edited: SurveyDoc = { ...seed, draft: editedForm, draftAt: AT, draftBy: ADMIN };

/** 그 세 곳을 v2로 발행한 뒤 — 변경 기록과 되돌리기를 그린다 */
const published: SurveyDoc = {
  ...seed,
  live: editedForm,
  draft: editedForm,
  liveVersion: 2,
  publishedAt: AT,
  publishedBy: ADMIN,
  draftAt: AT,
  draftBy: ADMIN,
};

const seedEntry = seedSurveyLog.find((e) => e.docId === ID)!;
const v2Entry: SurveyLogEntry = {
  id: "SV-DESIGN-V2",
  docId: ID,
  at: AT,
  by: ADMIN,
  action: "publish",
  version: 2,
  reason:
    "의뢰인 검토에서 1번 문항이 어렵다는 의견이 있어 쉬운 말로 바꾸고, 협력 문항 하나를 더했습니다",
  lines: diffForms(seed.live, editedForm),
  snapshot: editedForm,
};
const publishedLog = [v2Entry, seedEntry];

/* ── 외부 설문 링크로 받기(2026-10-28) — 구글 설문 주소를 넣은 초안과, 그것을 v2로 발행한 뒤 ── */
/** 예시 주소 — 실제로 열리는 설문이 아니다 */
export const SAMPLE_LINK = "https://forms.gle/AbCdEf123456";
const linkForm: SurveyForm = { ...seed.live, mode: "link", link: SAMPLE_LINK };
const linkDraft: SurveyDoc = { ...seed, draft: linkForm, draftAt: AT, draftBy: ADMIN };
const linkLive: SurveyDoc = {
  ...seed,
  live: linkForm,
  draft: linkForm,
  liveVersion: 2,
  publishedAt: AT,
  publishedBy: ADMIN,
  draftAt: AT,
  draftBy: ADMIN,
};
/** 외부 설문 링크를 고른 채 주소를 아직 넣지 않았다 */
const linkEmpty: SurveyDoc = {
  ...seed,
  draft: { ...linkForm, link: "" },
  draftAt: AT,
  draftBy: ADMIN,
};

/* ── 지난 설문지(2026-10-28 — 설문지를 계속 새로 만들게 되면서) — 2025년에 쓰고 보관해 둔 학부모 설문지 둘 ── */
const OLD_AT = "2025-09-12 14:20";
const oldOf = (id: SurveyDocId, from: SurveyDocId): SurveyDoc => ({
  ...seedSurveyDocs[from],
  id,
  name: "2025 학부모 설문지",
  active: false,
  createdAt: "2025-03-03 10:00",
  createdBy: ADMIN,
  liveVersion: 3,
  publishedAt: OLD_AT,
  publishedBy: ADMIN,
  draftAt: OLD_AT,
  draftBy: ADMIN,
});
const OLD_ID = "SVD-2025-G34";
const old34 = oldOf(OLD_ID, ID);
const old56 = oldOf("SVD-2025-G56", "guardian:e56");
/** 목록에 서는 설문지 — 처음 설문지(2026, 사용 중) 여섯과 보관한 2025 둘 */
const designDocs: SurveyDocs = { ...seedSurveyDocs, [old34.id]: old34, [old56.id]: old56 };
const oldLog: SurveyLogEntry[] = [
  {
    id: "SV-DESIGN-OLD",
    docId: OLD_ID,
    at: "2025-03-03 10:00",
    by: ADMIN,
    action: "create",
    version: 1,
    reason: "빈 설문지로 만들었습니다",
    lines: [],
  },
];

/* ── 빈 양식으로 막 만든 설문지 — 표지 · 안내 · 구역은 2026 설문지와 같고 문항만 비었다 ── */
const NEW_ID = "SVD-2027-G34";
const NEW_AT = "2026-10-28 10:05";
const blankForm: SurveyForm = {
  ...seed.live,
  sections: sectionsOf(seed.live),
  items: [],
  choices: [],
  opens: [],
};
const blankDoc: SurveyDoc = {
  ...seed,
  id: NEW_ID,
  name: "2027 학부모 설문지",
  active: false,
  createdAt: NEW_AT,
  createdBy: ADMIN,
  live: blankForm,
  draft: blankForm,
  liveVersion: 1,
  publishedAt: NEW_AT,
  publishedBy: ADMIN,
  draftAt: NEW_AT,
  draftBy: ADMIN,
};
const blankLog: SurveyLogEntry[] = [
  {
    id: "SV-DESIGN-NEW",
    docId: NEW_ID,
    at: NEW_AT,
    by: ADMIN,
    action: "create",
    version: 1,
    reason: "빈 양식(구역만 있고 문항은 비어 있음)으로 만들었습니다",
    lines: [],
  },
];

/** 상태 → 그릴 벌 · 탭 · 열린 창 */
type View = {
  doc: SurveyDoc;
  log: SurveyLogEntry[];
  tab: SurveyTab;
  ask?: SurveyAsk;
  reviewer?: boolean;
  /** 탭을 화면 안에서만 옮긴다 — 외부 설문 링크 상태는 탭이 둘뿐이라 주소를 나누지 않았다 */
  localTabs?: boolean;
};

const views: Record<string, View> = {
  [SLUG]: { doc: seed, log: [seedEntry], tab: "form" },
  [`${SLUG}/detail`]: { doc: seed, log: [seedEntry], tab: "detail" },
  [`${SLUG}/preview`]: { doc: edited, log: [seedEntry], tab: "preview" },
  [`${SLUG}/edited`]: { doc: edited, log: [seedEntry], tab: "detail" },
  [`${SLUG}/upload`]: { doc: seed, log: [seedEntry], tab: "upload" },
  [`${SLUG}/publish`]: { doc: edited, log: [seedEntry], tab: "detail", ask: { mode: "publish" } },
  [`${SLUG}/log`]: { doc: published, log: publishedLog, tab: "log" },
  [`${SLUG}/revert`]: {
    doc: published,
    log: publishedLog,
    tab: "log",
    ask: { mode: "revert", entryId: seedEntry.id },
  },
  [`${SLUG}/readonly`]: { doc: edited, log: [seedEntry], tab: "detail", reviewer: true },
  [`${SLUG}/link`]: { doc: linkDraft, log: [seedEntry], tab: "form", localTabs: true },
  [`${SLUG}/link/empty`]: { doc: linkEmpty, log: [seedEntry], tab: "form", localTabs: true },
  [`${SLUG}/link/publish`]: {
    doc: linkDraft,
    log: [seedEntry],
    tab: "form",
    ask: { mode: "publish" },
    localTabs: true,
  },
  [`${SLUG}/link/live`]: { doc: linkLive, log: [seedEntry], tab: "form", localTabs: true },
  [`${SLUG}/copy`]: { doc: seed, log: [seedEntry], tab: "form", ask: { mode: "copy" } },
  [OLD_ID]: { doc: old34, log: oldLog, tab: "form", localTabs: true },
  [`${OLD_ID}/use`]: {
    doc: old34,
    log: oldLog,
    tab: "form",
    ask: { mode: "activate" },
    localTabs: true,
  },
  [NEW_ID]: { doc: blankDoc, log: blankLog, tab: "form", localTabs: true },
  [`${NEW_ID}/detail`]: { doc: blankDoc, log: blankLog, tab: "detail", localTabs: true },
};

const tabSlug: Record<SurveyTab, string> = {
  form: SLUG,
  detail: `${SLUG}/detail`,
  preview: `${SLUG}/preview`,
  upload: `${SLUG}/upload`,
  log: `${SLUG}/log`,
};

const noop = () => {};

export default function SurveyAdmin({ state }: { state: string }) {
  const router = useRouter();
  const view = views[state];

  /* ── 목록 ── */
  if (!view) {
    const docs =
      state === "edited"
        ? { ...designDocs, [ID]: edited }
        : state === "linked"
          ? { ...designDocs, [ID]: linkLive }
          : designDocs;
    /* 디자인은 학부모 초3~4(2026 사용 중 · 2025 보관) 두 벌만 상태를 두었다 — 다른 설문지를 눌러도 그리로 간다 */
    return (
      <ConsoleFrame at="/admin2/surveys">
        <SurveyBoard
          key={state}
          docs={docs}
          hrefOf={(id) =>
            to(
              id === OLD_ID || id === old56.id
                ? OLD_ID
                : state === "edited"
                  ? `${SLUG}/edited`
                  : state === "linked"
                    ? `${SLUG}/link/live`
                    : SLUG,
            )
          }
          onCreate={() => {
            router.push(to());
            return null;
          }}
          creating={
            state === "new"
              ? true
              : state === "new/blank"
                ? { key: "guardian", band: "e34", start: "blank", name: "2027 학부모 설문지" }
                : state === "new/copy"
                  ? { key: "guardian", band: "e34", from: ID, name: "2027 학부모 설문지" }
                  : false
          }
        />
      </ConsoleFrame>
    );
  }

  const go = (slug: string) => router.push(to(slug));
  const acts: SurveyActs = {
    /* 응답 방식을 고르면 그 상태로 간다. 그 밖의 칸은 적어도 저장되지 않는다 */
    patch: (p) => {
      if (p.mode === "link") go(`${SLUG}/link`);
      else if (p.mode === "form") go(SLUG);
    },
    patchItem: noop,
    addItem: noop,
    removeItem: noop,
    moveItem: noop,
    patchChoice: noop,
    addChoice: noop,
    removeChoice: noop,
    patchOpen: noop,
    addOpen: noop,
    removeOpen: noop,
    moveEntry: noop,
    addSection: noop,
    patchSection: () => true,
    moveSection: noop,
    removeSection: noop,
    copyToOtherBands: () => 1,
    upload: noop,
    discard: () => go(SLUG),
    publish: () => go(state.startsWith(`${SLUG}/link`) ? `${SLUG}/link/live` : `${SLUG}/log`),
    revert: () => go(`${SLUG}/log`),
    rename: noop,
    /* 사용하기 · 새 설문지는 목록으로 돌아간다 — 디자인은 설문지를 바꾸거나 더하지 않는다 */
    activate: () => go(""),
    create: () => {
      go("");
      return null;
    },
  };

  return (
    <ConsoleFrame at="/admin2/surveys" me={view.reviewer ? reviewer : undefined}>
      <SurveyDesk
        key={state}
        doc={view.doc}
        docs={designDocs}
        log={view.log}
        answered={3}
        mayEdit={!view.reviewer}
        mayPublish
        by={view.reviewer ? reviewer.name : ADMIN}
        back={
          <Link href={to()} className="a2-btn">
            ← 설문지
          </Link>
        }
        acts={acts}
        tab={view.tab}
        ask={view.ask ?? null}
        onTab={view.localTabs ? undefined : (t) => go(tabSlug[t])}
      />
    </ConsoleFrame>
  );
}

/* ───────────────────────── 응답자 창 · 외부 설문 링크 ───────────────────────── */

/**
 * 응답자가 여는 설문 창(실제 주소 /survey/[갈래]) — 관리자가 응답 방식을 「외부 설문 링크」로 발행한 뒤.
 * 문항 대신 그 설문을 여는 단추와 「제출했어요」가 선다(components/exam/SurveyForm.tsx의 LinkSurvey).
 * 학생은 학생 대시보드 디자인의 예시(이서준)와 같다.
 */
export function SurveyLinkPopup() {
  return (
    <div className="min-h-dvh bg-exam-bg text-exam-text">
      <LinkSurvey
        form={linkLive.live}
        version={linkLive.liveVersion}
        studentName={flowStudent.name}
        studentCode={flowStudent.code}
        onDone={noop}
      />
    </div>
  );
}
