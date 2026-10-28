"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { designLinks } from "@/lib/designScreens";
import {
  diffForms,
  seedSurveyDocs,
  seedSurveyLog,
  surveySlugOf,
  type SurveyDoc,
  type SurveyDocId,
  type SurveyForm,
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
 * 목록은 갈래 × 학년대 여섯 벌, 한 벌을 열면 척도 · 고르기 · 서술 문항 · 안내 문구 · 파일로 올리기 ·
 * 변경 기록 탭과 발행 · 되돌리기 창이 선다.
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
  [SLUG]: { doc: seed, log: [seedEntry], tab: "items" },
  [`${SLUG}/edited`]: { doc: edited, log: [seedEntry], tab: "items" },
  [`${SLUG}/choices`]: { doc: seed, log: [seedEntry], tab: "choices" },
  [`${SLUG}/opens`]: { doc: seed, log: [seedEntry], tab: "opens" },
  [`${SLUG}/texts`]: { doc: edited, log: [seedEntry], tab: "texts" },
  [`${SLUG}/upload`]: { doc: seed, log: [seedEntry], tab: "upload" },
  [`${SLUG}/publish`]: { doc: edited, log: [seedEntry], tab: "items", ask: { mode: "publish" } },
  [`${SLUG}/log`]: { doc: published, log: publishedLog, tab: "log" },
  [`${SLUG}/revert`]: {
    doc: published,
    log: publishedLog,
    tab: "log",
    ask: { mode: "revert", entryId: seedEntry.id },
  },
  [`${SLUG}/readonly`]: { doc: edited, log: [seedEntry], tab: "items", reviewer: true },
  [`${SLUG}/link`]: { doc: linkDraft, log: [seedEntry], tab: "texts", localTabs: true },
  [`${SLUG}/link/empty`]: { doc: linkEmpty, log: [seedEntry], tab: "texts", localTabs: true },
  [`${SLUG}/link/publish`]: {
    doc: linkDraft,
    log: [seedEntry],
    tab: "texts",
    ask: { mode: "publish" },
    localTabs: true,
  },
  [`${SLUG}/link/live`]: { doc: linkLive, log: [seedEntry], tab: "texts", localTabs: true },
};

const tabSlug: Record<SurveyTab, string> = {
  items: SLUG,
  choices: `${SLUG}/choices`,
  opens: `${SLUG}/opens`,
  texts: `${SLUG}/texts`,
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
        ? { ...seedSurveyDocs, [ID]: edited }
        : state === "linked"
          ? { ...seedSurveyDocs, [ID]: linkLive }
          : seedSurveyDocs;
    /* 디자인은 학부모 초3~4 한 벌만 상태를 두었다 — 다른 벌을 눌러도 그 벌로 간다 */
    return (
      <ConsoleFrame at="/admin2/surveys">
        <SurveyBoard
          docs={docs}
          hrefOf={() =>
            to(
              state === "edited"
                ? `${SLUG}/edited`
                : state === "linked"
                  ? `${SLUG}/link/live`
                  : SLUG,
            )
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
    copyToOtherBands: () => 1,
    upload: noop,
    discard: () => go(SLUG),
    publish: () => go(state.startsWith(`${SLUG}/link`) ? `${SLUG}/link/live` : `${SLUG}/log`),
    revert: () => go(`${SLUG}/log`),
  };

  return (
    <ConsoleFrame at="/admin2/surveys" me={view.reviewer ? reviewer : undefined}>
      <SurveyDesk
        key={state}
        doc={view.doc}
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
        doc={linkLive}
        studentName={flowStudent.name}
        studentCode={flowStudent.code}
        onDone={noop}
      />
    </div>
  );
}
