"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { designLinks } from "@/lib/designScreens";
import type { PurgePolicy } from "@/lib/purgePolicy";
import PurgeBoard, { type PurgeRow, type PurgeTab } from "@/components/admin2/PurgeBoard";
import ConsoleFrame from "../ConsoleFrame";
import { purgePolicy, purgeRows } from "./purgeFlow";

/**
 * 개인정보 파기 (실제 주소 /admin2/privacy/purge) — 디자인.
 *
 * 파기 대기에 오른 개인정보를 지우는 화면이다. 예전 이름은 「파기 스케줄러」였다 — 언제 대기에
 * 올릴지(자동 파기 · 보관기간)를 시스템 > 스케줄러로 옮긴 뒤로, 이 화면에 남은 일은 지우는 것
 * 하나다(./Schedulers.tsx).
 *
 *   목록       파기 대기(철회 요청 · 보관기간 도래)와 파기 완료
 *   파기 실행  접어 둔 판. 펴면 지금 걸린 자동 파기 값(읽기 전용) · 사유 · 실행 단추가 보인다
 *
 * 화면은 실제 조각(components/admin2/PurgeBoard.tsx)이다. 줄은 스케줄러 디자인과 같은
 * 회원들(./purgeFlow.ts)이고, 탭과 판은 주소로 여닫는다.
 *
 * 실제 화면은 실행 단추를 누르면 브라우저의 확인 창으로 한 번 더 묻는다(「n명의 개인정보를
 * 파기합니다. 되돌릴 수 없습니다 …」). 브라우저가 그리는 창이라 디자인에는 따로 두지 않았다.
 */

const to = designLinks("privacy-purge");
const AT = "/admin2/privacy/purge";
const SCHEDULERS = "/design/admin2/schedulers";

type Scene = {
  policy: PurgePolicy;
  tab: PurgeTab;
  open: boolean;
  why: string;
  /** 대기에 있던 것을 방금 지웠는가 — 지운 줄이 파기 완료로 넘어가 있다 */
  ran?: boolean;
};

const scenes: Record<string, Scene> = {
  "": { policy: purgePolicy, tab: "queued", open: false, why: "" },
  /* 판을 펴고 사유까지 적었다 — 실행 단추가 눌린다 */
  run: {
    policy: purgePolicy,
    tab: "queued",
    open: true,
    why: "10월 정기 파기 — 철회 3건 통지 완료, 보관기간 도래 3건",
  },
  /* 방금 지웠다 — 화면이 파기 완료 탭으로 옮겨 준다 */
  done: { policy: purgePolicy, tab: "done", open: false, why: "", ran: true },
  /* 스케줄러에서 자동 파기를 꺼 두었다 — 보관기간이 지난 줄은 대기에 없고 철회 요청만 있다 */
  off: { policy: { ...purgePolicy, auto: false }, tab: "queued", open: true, why: "" },
};

const RAN_AT = "2026-10-12 14:20";
const RAN_WHY = "10월 정기 파기 — 철회 3건 통지 완료, 보관기간 도래 3건";

/** 줄을 누르면 가는 곳 — 그 회원의 동의 이력. 파기 대기 한 건과 파기 완료 한 건을 그려 두었다 */
const detailHrefOf = (v: PurgeRow) =>
  `/design/admin2/privacy/${v.purge === "done" ? "M-20391" : "M-20633"}`;

export default function PrivacyPurge({ state }: { state: string }) {
  const router = useRouter();
  const scene = scenes[state] ?? scenes[""];
  const list = purgeRows(scene.policy);
  const rows: PurgeRow[] = scene.ran
    ? list.map((v) =>
        v.purge === "queued"
          ? { ...v, purge: "done", purgedAt: RAN_AT, purgedBy: "박서준", purgedWhy: RAN_WHY }
          : v,
      )
    : list;

  return (
    <ConsoleFrame at={AT}>
      <PurgeBoard
        key={state}
        rows={rows}
        auto={scene.policy.auto}
        keep={scene.policy}
        tab={scene.tab}
        onTab={(tab) => router.push(tab === "done" ? to("done") : to())}
        open={scene.open}
        onToggle={() => router.push(scene.open ? to() : to("run"))}
        why={scene.why}
        onWhy={() => {}}
        onRun={() => router.push(to("done"))}
        back={
          <Link href="/design/admin2/privacy" className="a2-btn">
            ← 개인정보 관리
          </Link>
        }
        detailHrefOf={detailHrefOf}
        schedulerHref={SCHEDULERS}
      />
    </ConsoleFrame>
  );
}
