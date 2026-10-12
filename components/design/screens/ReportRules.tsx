"use client";

import { useRouter } from "next/navigation";
import { designLinks } from "@/lib/designScreens";
import {
  assemble,
  blocksOf,
  changesOf,
  ruleSetOf,
  seedKit,
  withRuleSet,
  type Kit,
  type RuleSet,
} from "@/lib/reportAssembly";
import type { CrossKey } from "@/lib/reportAssets";
import { LeaveDialog } from "@/components/admin2/EditGuard";
import RuleBoard, { samplePresets, type Sample } from "@/components/admin2/RuleBoard";
import ConsoleFrame from "../ConsoleFrame";
import { ADMIN, NOW, docs } from "./reportFlow";

/**
 * 조립 규칙 (실제 주소 /admin2/reports/rules) — 디자인.
 *
 * 리포트의 글은 써 둔 문구를 규칙이 골라 세운 것이다. 이 화면은 그 고르는 기준을 고치고, 표본
 * 하나로 결과를 그 자리에서 본다.
 *
 *   기준     발현 밴드 컷 · 교차 셀(학력 × 재능) · 규칙(차례 · 넣는 조건 · 넣는 문구 · 사용) · 점검
 *   결과     표본(학년 · 과목 점수 · 관찰 설문) → 읽은 값 → 규칙마다 붙었는지와 근거
 *   창       「리포트 미리 보기」 — 표본을 지금 규칙으로 조립하면 회원이 받는 모습
 *            고친 채로 다른 화면으로 가려 하면 뜨는 확인 창(…/edit/leave)
 *
 * 화면은 실제 조각(components/admin2/RuleBoard.tsx)이고, 조립하는 셈도 실제 것
 * (lib/reportAssembly.ts)이다. 규칙과 문구는 처음 값 그대로이고, 저장 줄의 「몇 건이 달라지는지」는
 * 리포트 승인 디자인과 같은 열두 건(./reportFlow.ts)에서 센다. 창은 주소로 여닫는다.
 */

const to = designLinks("report-rules");
const AT = "/admin2/reports/rules";

const base = ruleSetOf(seedKit);
const preset = (id: string): Sample => samplePresets.find((p) => p.id === id)!.sample;

/** L3 컷을 75점에서 80점으로 — 78점인 표본의 축이 L3에서 L2로 내려가 다른 문구를 받는다 */
const cut80: RuleSet = { ...base, cuts: { ...base.cuts, L3: 80 } };

/** 「지금은 낮게 나온 축」의 점수 차를 20점으로 올리고, 「집에서 해 볼 것」을 쓰지 않는다 */
const ruleEdit: RuleSet = {
  ...base,
  rules: base.rules.map((r) =>
    r.id === "R-05"
      ? { ...r, cond: { kind: "lowAxis", gap: 20 } }
      : r.id === "R-12"
        ? { ...r, on: false }
        : r,
  ),
};

/** 「학력 부진 × 재능 강세」 칸의 문구를 고치는 중 */
const cellEdit: RuleSet = {
  ...base,
  cross: base.cross.map((c) =>
    c.id === "gap"
      ? {
          ...c,
          text: "과목 점수만 보면 낮게 보이지만, 관찰과 추론을 요구한 문항에서는 다른 모습이 나타났습니다. 문제를 더 푸는 것보다, 이 아이가 잘 다루는 방식으로 배울 기회를 먼저 마련해 주세요.",
        }
      : c,
  ),
};

/** L2 컷이 L3 컷보다 높다 — 저장할 수 없는 값 */
const invalid: RuleSet = { ...base, cuts: { L3: 75, L2: 80 } };

type Scene = {
  kit: Kit;
  sample: Sample;
  draft?: RuleSet;
  openCell?: CrossKey;
  previewing?: boolean;
  stamp?: { at: string; by: string };
  /** 고친 채로 나가려다 붙잡힌 모습 — 저장하지 않은 변경이 있다는 창이 떠 있다 */
  leaving?: boolean;
};

/** 주소의 꼬리 → 그때의 규칙과 표본, 그리고 열려 있는 것 */
function sceneOf(slug: string): Scene {
  const clear = preset("clear");
  switch (slug) {
    case "sample/gap":
      return { kit: seedKit, sample: preset("gap") };
    case "sample/even":
      return { kit: seedKit, sample: preset("even") };
    case "sample/low":
      return { kit: seedKit, sample: preset("low") };
    case "sample/single":
      return { kit: seedKit, sample: preset("single") };
    case "preview":
      return { kit: seedKit, sample: clear, previewing: true };
    case "edit/cut":
      return { kit: seedKit, sample: clear, draft: cut80 };
    case "edit/rule":
      return { kit: seedKit, sample: clear, draft: ruleEdit };
    case "edit/cell":
      return { kit: seedKit, sample: preset("gap"), draft: cellEdit, openCell: "gap" };
    case "edit/invalid":
      return { kit: seedKit, sample: clear, draft: invalid };
    /* 컷을 고친 채로 왼쪽 메뉴의 다른 화면을 눌렀다 */
    case "edit/leave":
      return { kit: seedKit, sample: clear, draft: cut80, leaving: true };
    /* 컷을 80점으로 저장한 뒤 — 마지막 변경이 적히고, 표본의 문단이 새 컷을 따른다 */
    case "saved":
      return {
        kit: withRuleSet(seedKit, cut80),
        sample: clear,
        stamp: { at: NOW, by: ADMIN },
      };
    default:
      return { kit: seedKit, sample: clear };
  }
}

/** 이렇게 바꾸면 발행을 기다리는 리포트 가운데 몇 건의 내용이 달라지는가 — 실제 화면과 같은 셈 */
function effect(next: Kit) {
  const waiting = docs.filter((d) => d.state !== "published" && d.facts);
  const changed = waiting.filter((d) => {
    const asm = assemble(d.facts!, next);
    return (
      asm.reading.typeName !== d.typeName ||
      asm.reading.typeCode !== d.typeCode ||
      changesOf(d.blocks, blocksOf(asm)).length > 0
    );
  });
  return { waiting: waiting.length, changed: changed.length };
}

export default function ReportRules({ state }: { state: string }) {
  const router = useRouter();
  const scene = sceneOf(state);

  return (
    <ConsoleFrame at={AT}>
      <RuleBoard
        /* 상태마다 처음 값이 다르다 — 주소를 옮기면 판을 새로 세운다 */
        key={state}
        kit={scene.kit}
        stamp={scene.stamp}
        draft={scene.draft}
        sample={scene.sample}
        openCell={scene.openCell}
        previewing={!!scene.previewing}
        onPreview={() => router.push(to("preview"))}
        onPreviewClose={() => router.push(to())}
        effect={effect}
        templatesHref="/design/admin2/reports/templates"
        /* 문구 칸은 예시 한 칸만 그려 두었다 — 교차 셀의 문구는 이 화면에서 고친다 */
        templateHref={(source) => (source.startsWith("cross:") ? null : "/design/admin2/reports/templates/top-e4-language-L3")}
        onSave={() => router.push(to("saved"))}
      >
        {scene.leaving && (
          <LeaveDialog
            guard={{
              pending: true,
              kind: "link",
              stay: () => router.push(to("edit/cut")),
              discard: () => router.push(to()),
              saveAndGo: () => router.push(to("saved")),
              ask: (run) => run(),
            }}
          />
        )}
      </RuleBoard>
    </ConsoleFrame>
  );
}
