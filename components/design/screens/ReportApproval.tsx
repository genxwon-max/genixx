"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { designLinks } from "@/lib/designScreens";
import { sendRowOf, type SendRow } from "@/lib/reportRelease";
import type { ReportDoc } from "@/lib/reportStore";
import ReportBoard, { type BoardTab } from "@/components/admin2/ReportBoard";
import ReportPreview from "@/components/admin2/ReportPreview";
import ReportView from "@/components/admin2/ReportView";
import ConsoleFrame from "../ConsoleFrame";
import {
  ADMIN,
  FIXED_TEXT,
  ID,
  ID_STOP,
  NOW,
  TOP_BLOCK,
  auto,
  docOf,
  docs,
  docsAfter3,
  hajun,
  policy3,
  policy7,
  rowsOf,
  seoyeon,
} from "./reportFlow";

/**
 * 리포트 승인 (실제 주소 /admin2/reports/approval · /admin2/reports/approval/[리포트]) — 디자인.
 *
 * 채점이 끝난 답안지의 리포트가 목록에 오르고, 스케줄러가 정한 날에 저절로 발행된다.
 *
 *   목록     채점이 끝난 리포트. 발행 예정 · 확인 필요 · 발행 완료로 가른다. 목록 위 한 줄에
 *            지금 걸린 스케줄러(「채점 완료 7일 뒤 오전 9시」)가 적혀 있고, 고치는 자리는
 *            시스템 > 스케줄러다(./Schedulers.tsx)
 *   상세     진단 정보 · 발행 · 리포트 · 조립 내역 · 기록. 예정일을 기다리지 않으려면 「지금 발행」.
 *            조립 내역에는 규칙마다 넣은 문단과 본 값, 넣지 않은 규칙과 그 이유가 적혀 있다
 *   창       지금 발행 확인 · 리포트 보기(읽기 · 고치기 · 고치다가 닫으려 할 때 묻는 창)
 *
 * 화면은 실제 조각(components/admin2/ReportBoard.tsx · ReportView.tsx · ReportPreview.tsx)이고,
 * 날짜를 세는 셈도 실제 것(lib/reportRelease.ts)이다. 리포트와 오늘은 스케줄러 · 조립 규칙
 * 디자인과 함께 쓰는 예시다(./reportFlow.ts) — 리포트의 글은 적어 둔 점수를 실제 조립 함수에
 * 넣어 만든 것이다. 창과 탭은 주소로 여닫는다.
 */

const to = designLinks("report-approval");
const AT = "/admin2/reports/approval";

/** 스케줄러를 고치는 화면의 디자인 주소 */
const SCHEDULERS = "/design/admin2/schedulers";

/* ───────────────────────── 화면 ───────────────────────── */

const LIST_STATES = ["", "saved", "check", "done", "all", "empty"];

export default function ReportApproval({ state }: { state: string }) {
  return (
    <ConsoleFrame at={AT}>
      {LIST_STATES.includes(state) ? <List slug={state} /> : <Detail slug={state} />}
    </ConsoleFrame>
  );
}

/* ───────────────────────── 목록 ───────────────────────── */

/** 줄을 누르면 가는 상세 — 예시 한 건씩으로 굳혔다 */
function hrefOf(r: SendRow) {
  if (r.id === ID_STOP) return to(ID_STOP);
  if (r.send === "sent") return to(r.auto ? `${ID}/auto` : `${ID}/published`);
  return to(ID);
}

/** 탭마다의 주소 */
const tabHref: Record<BoardTab, string> = {
  wait: to(),
  check: to("check"),
  sent: to("done"),
  all: to("all"),
};

function List({ slug }: { slug: string }) {
  const router = useRouter();
  /* 스케줄러 화면에서 3일로 줄여 저장한 뒤 — 예정일이 당겨지고, 지난 네 건이 나가 있다 */
  const saved = slug === "saved";
  const policy = saved ? policy3 : policy7;
  const all = rowsOf(saved ? docsAfter3 : docs, policy);
  /* 발행을 기다리는 것이 하나도 없는 날 — 채점이 끝난 답안지가 아직 없거나, 모두 나갔다 */
  const rows = slug === "empty" ? all.filter((r) => r.send === "sent") : all;
  const tab: BoardTab =
    slug === "check" ? "check" : slug === "done" ? "sent" : slug === "all" ? "all" : "wait";

  return (
    <ReportBoard
      rows={rows}
      policy={policy}
      tab={tab}
      onTab={(next) => router.push(tabHref[next])}
      hrefOf={hrefOf}
      schedulerHref={SCHEDULERS}
    />
  );
}

/* ───────────────────────── 상세 ───────────────────────── */

const back = (
  <Link href={to()} className="a2-btn">
    ← 리포트 승인
  </Link>
);

/** 주소의 꼬리 → 그때의 리포트와 오늘, 그리고 열려 있는 창 */
function sceneOf(slug: string): {
  doc: ReportDoc;
  now: string;
  home: string;
  asking?: boolean;
  preview?: "read" | "edit" | "fix" | "leave";
} {
  const base = docOf(hajun);
  const stop = docOf(seoyeon);

  switch (slug) {
    case `${ID}/publish`:
      return { doc: base, now: NOW, home: to(ID), asking: true };
    case `${ID}/published`:
      return {
        doc: docOf({
          ...hajun,
          sent: { at: "2026-10-12 14:06", by: ADMIN, note: "예정일(2026-10-14)보다 먼저 발행" },
        }),
        now: "2026-10-12 14:06",
        home: to(`${ID}/published`),
      };
    /* 아무도 누르지 않았다 — 예정일 아침에 스케줄러가 내보냈다 */
    case `${ID}/auto`:
      return {
        doc: docOf({ ...hajun, sent: auto("2026-10-14 09:00") }),
        now: "2026-10-14 10:20",
        home: to(`${ID}/auto`),
      };
    case `${ID}/preview`:
      return { doc: base, now: NOW, home: to(ID), preview: "read" };
    case `${ID}/preview/edit`:
      return { doc: base, now: NOW, home: to(ID), preview: "edit" };
    /* 고치다가 닫기를 눌렀다 — 고친 것을 버릴지 한 번 묻는다 */
    case `${ID}/preview/edit/leave`:
      return { doc: base, now: NOW, home: to(ID), preview: "leave" };
    case ID_STOP:
      return { doc: stop, now: NOW, home: to(ID_STOP) };
    case `${ID_STOP}/fix`:
      return { doc: stop, now: NOW, home: to(ID_STOP), preview: "fix" };
    /* 막던 문단을 고쳤다 — 예정일은 이미 지났으므로 다음 자동 발행 때 나간다 */
    case `${ID_STOP}/fixed`:
      return {
        doc: {
          ...stop,
          blocks: stop.blocks.map((x) =>
            x.id === TOP_BLOCK
              ? {
                  ...x,
                  override: FIXED_TEXT,
                  overrideBy: ADMIN,
                  overrideAt: "2026-10-12 14:02",
                  overrideWhy: "줄 세우는 표현을 발현 모습으로 바꿈",
                }
              : x,
          ),
          log: [
            ...stop.log,
            {
              at: "2026-10-12 14:02",
              by: ADMIN,
              text: "「수리·논리 축」 문구 수정 — 줄 세우는 표현을 발현 모습으로 바꿈",
            },
          ],
        },
        now: NOW,
        home: to(`${ID_STOP}/fixed`),
      };
    default:
      return { doc: base, now: NOW, home: to(ID) };
  }
}

function Detail({ slug }: { slug: string }) {
  const router = useRouter();
  const scene = sceneOf(slug);
  const row = sendRowOf(scene.doc, policy7, scene.now);
  const mine = row.id === ID_STOP ? ID_STOP : ID;

  return (
    <ReportView
      row={row}
      policy={policy7}
      back={back}
      sheetHref="/design/admin2/grading/members/2026-3-0412/done"
      rulesHref="/design/admin2/reports/rules"
      templatesHref="/design/admin2/reports/templates"
      templateHrefOf={(source) => (source.startsWith("cross:") ? null : "/design/admin2/reports/templates/top-e4-language-L3")}
      asking={!!scene.asking}
      /* 확인 창과 리포트 보기 창은 예시마다 하나씩만 그렸다 — 그 화면에서만 열린다 */
      onAsk={() => {
        if (mine === ID) router.push(to(`${ID}/publish`));
      }}
      onAskClose={() => router.push(scene.home)}
      onPublish={() => router.push(to(`${ID}/published`))}
      onPreview={() => {
        if (row.send === "sent") return;
        router.push(to(mine === ID ? `${ID}/preview` : `${ID_STOP}/fix`));
      }}
    >
      {scene.preview && (
        <ReportPreview
          key={slug}
          row={row}
          sent={row.send === "sent"}
          startEdit={scene.preview !== "read"}
          /* 「고치는 중」 — 한 문단을 다듬고 사유까지 적어, 저장을 누를 수 있는 모습이다.
             「검토 필요」는 막 열었을 때다. 막는 말이 문단 아래에 짚여 있고 저장은 잠겨 있다 */
          startDraft={
            scene.preview === "edit" || scene.preview === "leave"
              ? {
                  [TOP_BLOCK]:
                    "서술형 답마다 그렇게 생각한 이유를 함께 적었습니다. 자료에서 찾은 표현을 자기 말로 바꾸어 쓰는 모습이 세 문항 모두에서 나타납니다.",
                }
              : undefined
          }
          startWhy={
            scene.preview === "edit" || scene.preview === "leave"
              ? "근거가 된 문항 수를 밝혀 적음"
              : ""
          }
          startLeave={scene.preview === "leave"}
          onSave={() => router.push(mine === ID ? to(ID) : to(`${ID_STOP}/fixed`))}
          onRevert={() => {}}
          onClose={() => router.push(scene.home)}
        />
      )}
    </ReportView>
  );
}
