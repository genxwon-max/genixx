"use client";

import { useRouter } from "next/navigation";
import { designLinks } from "@/lib/designScreens";
import type { PurgePolicy } from "@/lib/purgePolicy";
import type { SendPolicy } from "@/lib/reportRelease";
import SchedulerBoard, {
  type PurgeCount,
  type ReportDraft,
} from "@/components/admin2/SchedulerBoard";
import ConsoleFrame from "../ConsoleFrame";
import { purgeCount, purgePolicy, purgeSetAt, purgeSetBy } from "./purgeFlow";
import { ADMIN, NOW, docs, docsAfter3, policy3, policy7, rowsOf } from "./reportFlow";

/**
 * 스케줄러 (실제 주소 /admin2/schedulers) — 디자인.
 *
 * 정해 둔 때에 저절로 일어나는 일을 한곳에서 정한다. 화면마다 흩어져 있던 스케줄러를 시스템
 * 아래로 모았다 — 리포트 승인과 개인정보 파기에는 값만 남고, 고치는 자리는 여기 하나다.
 *
 *   리포트 스케줄러    발행하는 날(채점 완료 며칠 뒤) · 발행 시각
 *   개인정보 스케줄러  자동 파기(파기 대기에 올릴지) · 보관기간
 *
 * 판마다 따로 저장한다. 고치면 판 아래에 무엇이 달라지는지가 적힌다 — 리포트는 날을 당기면
 * 예정 시각이 지난 것이 저장하는 순간 나가므로, 그 건수를 먼저 보인다.
 *
 * 화면은 실제 조각(components/admin2/SchedulerBoard.tsx)이고 셈도 실제 것이다. 리포트는
 * 리포트 승인 디자인과 같은 열두 건(./reportFlow.ts), 개인정보는 개인정보 파기 디자인과 같은
 * 줄(./purgeFlow.ts)이다. 차림표는 실제처럼 눌리고, 저장 · 취소는 다음 상태의 주소로 간다.
 */

const to = designLinks("schedulers");
const AT = "/admin2/schedulers";

/** 일하는 화면의 디자인 주소 */
const REPORTS = "/design/admin2/reports/approval";
const PURGE = "/design/admin2/privacy/purge";

type Scene = {
  policy: SendPolicy;
  /** 스케줄러를 3일로 줄여 저장한 뒤인가 — 리포트 목록이 그만큼 나가 있다 */
  after3?: boolean;
  reportDraft?: ReportDraft;
  purge: PurgePolicy;
  purgeDraft?: PurgePolicy;
  /** 개인정보 스케줄러를 마지막으로 고친 때 */
  purgeAt: string;
};

const base: Scene = { policy: policy7, purge: purgePolicy, purgeAt: purgeSetAt };

/** 주소의 꼬리 → 그때 걸려 있는 값과, 골라 놓고 아직 저장하지 않은 값 */
const scenes: Record<string, Scene> = {
  "": base,
  /* 7일 → 3일. 새 예정 시각이 이미 지난 네 건이 저장하는 순간 나간다 */
  "report/edit": { ...base, reportDraft: { days: 3, hour: 9 } },
  /* 발행 시각만 오전 9시 → 오후 2시. 지난 것이 없어 경고는 없다 */
  "report/time": { ...base, reportDraft: { days: 7, hour: 14 } },
  /* 「채점이 끝나는 대로」 — 시각 칸이 잠기고, 기다리던 여섯 건이 모두 나간다 */
  "report/now": { ...base, reportDraft: { days: 0, hour: 9 } },
  "report/saved": { ...base, policy: policy3, after3: true },
  /* 탈퇴한 회원의 보관기간을 30일 → 14일. 파기 대기에 오르는 줄이 늘어난다 */
  "privacy/edit": { ...base, purgeDraft: { ...purgePolicy, leftDays: 14 } },
  "privacy/saved": {
    ...base,
    purge: { ...purgePolicy, leftDays: 14 },
    purgeAt: NOW,
  },
  /* 자동 파기를 꺼 둔 상태 — 보관기간이 지나도 대기에 오르지 않고, 철회 요청만 남는다 */
  "privacy/off": { ...base, purge: { ...purgePolicy, auto: false }, purgeAt: NOW },
};

export default function Schedulers({ state }: { state: string }) {
  const router = useRouter();
  const scene = scenes[state] ?? base;
  const rows = rowsOf(scene.after3 ? docsAfter3 : docs, scene.policy);
  const queued: PurgeCount = purgeCount(scene.purge);

  return (
    <ConsoleFrame at={AT}>
      <SchedulerBoard
        key={state}
        report={{
          policy: scene.policy,
          rows,
          now: NOW,
          href: REPORTS,
          draft: scene.reportDraft,
          onSave: () => router.push(to("report/saved")),
          onCancel: () => router.push(to()),
        }}
        privacy={{
          policy: scene.purge,
          setAt: scene.purgeAt,
          setBy: scene.purgeAt === NOW ? ADMIN : purgeSetBy,
          queued,
          preview: purgeCount,
          href: PURGE,
          draft: scene.purgeDraft,
          onSave: () => router.push(to("privacy/saved")),
          onCancel: () => router.push(to()),
        }}
      />
    </ConsoleFrame>
  );
}
