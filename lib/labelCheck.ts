/**
 * 라벨링 점검 — 진단 윤리 헌장 7조.
 *
 * 아이를 규정하는 말을 리포트에 담지 않는다. 등급·서열·백분위는 아이를 줄 세우는 말이라
 * 문장이 아무리 부드러워도 막는다. 단정·비교 표현은 맥락에 따라 괜찮을 수 있어 짚기만 한다.
 *
 * ── 왜 제 파일로 뗐나 ──
 * 이 점검을 거는 자리가 둘이 되었다. 리포트 승인(EXP-08)은 **아이 하나**의 문구를 막고,
 * 해석 템플릿(ADM-08-1)은 그 문구를 받는 **모든 아이**를 막는다. 둘 다 lib/reportStore.ts에
 * 있던 이 함수를 불렀는데, 템플릿 저장소가 리포트 저장소를 부르고 리포트 조립이 다시
 * 템플릿 저장소를 부르면서 두 파일이 서로를 물었다(순환 import). 점검은 어느 쪽에도
 * 속하지 않는 규칙이므로 가운데로 뺀다.
 */

export type LabelFinding = { tone: "block" | "warn"; word: string; why: string };

const BANNED: { words: string[]; why: string }[] = [
  {
    words: ["상위", "하위", "백분위", "등급", "석차", "순위", "%ile"],
    why: "아이를 줄 세우는 표현입니다. 발현 단계로 바꿔 적어 주세요.",
  },
  {
    words: ["영재", "우수아", "천재", "수재", "저능", "부진아"],
    why: "아이를 규정하는 이름표입니다. 헌장 7조가 막는 표현입니다.",
  },
];

const CAUTION: { words: string[]; why: string }[] = [
  {
    words: ["부족합니다", "떨어집니다", "못합니다", "약점", "결함"],
    why: "능력의 없음으로 읽힙니다. 「아직 보여줄 기회가 적었다」로 적을 수 있는지 보세요.",
  },
  {
    words: ["또래보다", "평균보다", "다른 아이"],
    why: "다른 아이와 견주는 말입니다. 이 아이 안에서의 차이로 적을 수 있는지 보세요.",
  },
  {
    words: ["반드시", "틀림없이", "확실히", "분명히"],
    why: "한 회차 결과에 단정을 붙이고 있습니다.",
  },
];

export function labelCheck(text: string): LabelFinding[] {
  const out: LabelFinding[] = [];
  for (const g of BANNED) {
    for (const w of g.words) if (text.includes(w)) out.push({ tone: "block", word: w, why: g.why });
  }
  for (const g of CAUTION) {
    for (const w of g.words) if (text.includes(w)) out.push({ tone: "warn", word: w, why: g.why });
  }
  return out;
}

