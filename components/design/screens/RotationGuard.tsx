"use client";

import { useRouter } from "next/navigation";
import { rounds } from "@/lib/admin";
import { designLinks } from "@/lib/designScreens";
import { seedForms } from "@/lib/formStore";
import { seedItems } from "@/lib/itemStore";
import { DEFAULTS, type SecurityLogEntry, type SecuritySettings } from "@/lib/securityStore";
import GuardBoard from "@/components/admin2/GuardBoard";
import RotationBoard from "@/components/admin2/RotationBoard";
import ConsoleFrame, { type ConsoleMe } from "../ConsoleFrame";

/**
 * 문항 회전 · 앵커(/admin2/rotation)와 응시 화면 보호(/admin2/security) — 디자인 (2026-10-28, /design2).
 *
 * 9월 27일 옛 콘솔을 걷어 낼 때 설문 관리와 함께 사라졌던 두 화면을 /admin2에 다시 세운 모습이다. 화면은
 * 실제 조각(components/admin2/RotationBoard.tsx · GuardBoard.tsx)이고, 값은 저장소를 읽지 않고 처음 값
 * (문항 은행 · 검사지 · 보호 설정의 기본값)을 넘긴다.
 */

const rotationTo = designLinks("item-rotation");
const guardTo = designLinks("screen-guard");
const roundLabel = (id: string) => rounds.find((r) => r.id === id)?.label ?? id;

export function ItemRotation() {
  return (
    <ConsoleFrame at="/admin2/rotation">
      <RotationBoard
        items={seedItems}
        forms={seedForms}
        maxRuns={DEFAULTS.maxRuns}
        roundLabel={roundLabel}
        /* 문항 한 건의 디자인은 /design에 IT-2629 하나뿐이라 줄은 그리로 간다 */
        itemHref={() => "/design/admin2/items/IT-2629"}
        guardHref={guardTo()}
      />
    </ConsoleFrame>
  );
}

/** 출제자 — 회차는 다루지만 보호 장치는 켜고 끄지 못한다 */
const author: ConsoleMe = { name: "최윤비", role: "출제자", loginId: "ms.expert_author" };

const AT = "2026-10-21 10:04";
/** 응시자 표시 겹치기를 켠 뒤 */
const afterOn: SecuritySettings = {
  ...DEFAULTS,
  guards: { ...DEFAULTS.guards, watermark: true },
  updatedAt: AT,
  updatedBy: "박서준",
};
const afterLog: SecurityLogEntry[] = [
  {
    id: "SEC-DESIGN-1",
    at: AT,
    by: "박서준",
    text: "응시자 표시 겹치기 켬",
    reason: "4분기 회차부터 응시 화면 사진이 돌아다닌 일이 있어, 누구 화면인지 드러나게 합니다",
  },
];

export function ScreenGuard({ state }: { state: string }) {
  const router = useRouter();
  const after = state === "after";
  return (
    <ConsoleFrame at="/admin2/security" me={state === "readonly" ? author : undefined}>
      <GuardBoard
        key={state}
        settings={after ? afterOn : DEFAULTS}
        log={after ? afterLog : []}
        may={state !== "readonly"}
        ask={state === "ask" ? { id: "watermark", next: true } : null}
        onChange={() => router.push(guardTo("after"))}
        rotationHref={rotationTo()}
      />
    </ConsoleFrame>
  );
}
