"use client";

import { ANCHOR_RATIO } from "./blueprint";
import {
  BORDER,
  ICC_TARGET,
  ROUTE_CUT,
  SAMPLE_MAX,
  SAMPLE_MIN,
  rubric,
} from "./expertStore";
import { GENERATE_MAX } from "./itemStore";

/**
 * 프롬프트에 박히는 상수 — 실제로 걸려 있는 값에서 뽑는다 (ADM-13-1).
 *
 * 씨앗 글에 0.75를 손으로 적어 두면 lib/expertStore.ts의 ROUTE_CUT을 고친 날 두 가지가
 * 함께 어긋난다. 화면이 옛 숫자를 말하고, **모델도 옛 숫자로 돈다.** 설정 화면이 조용히
 * 거짓말하는 고장의 한 단 더 나쁜 판이라, 씨앗에는 자리표만 적고 값은 여기서 채운다.
 *
 * ── 왜 파일을 따로 뗐나 ──
 * 임계값이 사는 파일 가운데 둘(lib/expertStore.ts · lib/itemStore.ts)이 "use client"다.
 * 씨앗(lib/aiPrompts.ts)은 지시자 없는 파일이라 서버 조각도 읽을 수 있어야 하는데, 저기서
 * 저 둘을 가져오면 그 순간 씨앗이 클라이언트에 묶인다. 값을 채우는 일만 이 파일로 떼면
 * 씨앗은 자리표만 알고, 값은 화면(클라이언트)에서 붙는다 —
 * app/(admin2)/admin2/settings/QualityPanel.tsx가 판 하나를 경계 너머로 보낸 것과 같은 수다.
 *
 * ⚠ 여기서 숫자를 새로 적지 않는다. 전부 import한 값에서 만든다. 한 자리라도 손으로 적으면
 *   이 파일을 만든 까닭이 없어진다.
 */
export const promptConsts: Record<string, string> = {
  "{{상수.저신뢰선}}": ROUTE_CUT.toFixed(2),
  "{{상수.일치도목표}}": ICC_TARGET.toFixed(2),
  "{{상수.표본}}": `${Math.round(SAMPLE_MIN * 100)}~${Math.round(SAMPLE_MAX * 100)}%`,
  "{{상수.경계선}}": `±${BORDER.toFixed(2)}`,
  "{{상수.한번에}}": `${GENERATE_MAX}문항`,
  "{{상수.앵커비율}}": `${Math.round(ANCHOR_RATIO * 100)}%`,
  "{{상수.루브릭점수}}":
    `${rubric.full.label} ${rubric.full.point}점 · ` +
    `${rubric.partial.label} ${rubric.partial.point}점 · ` +
    `${rubric.none.label} ${rubric.none.point}점`,
};
