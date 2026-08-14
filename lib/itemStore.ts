"use client";

import { useSyncExternalStore } from "react";
import type { StaffRoleId } from "./admin";
import {
  checkStandardCode,
  levelAllowed,
  levelSpecs,
  makeItemCode,
  submitChecklist,
  subskillsOf,
  tagBCoord,
  type GradeBand,
  type Level,
  type TalentId,
} from "./blueprint";

/**
 * 문항 초안 저장소 — 출제 워크벤치(EXP-02)와 검수 워크벤치(EXP-03)가 함께 쓴다.
 *
 * 두 화면이 같은 목록을 보고 서로의 결과를 받는다는 것이 이 콘솔의 요점이라, 상태를
 * 한곳에 두고 양쪽에서 고친다. 출제자가 제출하면 검수 목록에 뜨고, 검수자가 반려하면
 * 사유와 코멘트가 붙어 출제자의 반려함으로 돌아간다.
 *
 * 상태는 넷뿐이다 —
 *   draft(작성 중) → submitted(검수 대기) → approved(승인) 또는 rejected(반려)
 *   rejected는 고쳐서 다시 submitted로 간다.
 */

export type ItemState = "draft" | "submitted" | "rejected" | "approved";

/**
 * 문제 유형. 채점 방식이 갈리므로 문항을 쓸 때 가장 먼저 정한다.
 *  · 객관식 — 보기 중 하나. AI가 전수 채점한다.
 *  · 단답형 — 짧은 답. 표기 흔들림을 허용 답안으로 흡수한다.
 *  · 서술형 — 몇 문장. AI 1차 채점 뒤 저신뢰 건을 사람이 본다(EXP-04-2).
 *  · 논술형 — 한 편의 글. 루브릭으로 사람이 채점하고 이중 채점 표본을 둔다.
 */
export type ItemType = "choice" | "short" | "descriptive" | "essay";

export const itemTypes: { id: ItemType; label: string; desc: string; scoring: string }[] = [
  {
    id: "choice",
    label: "객관식",
    desc: "보기 중 하나를 고릅니다",
    scoring: "AI 전수 채점",
  },
  {
    id: "short",
    label: "단답형",
    desc: "낱말이나 수를 씁니다",
    scoring: "허용 답안 대조 후 불일치만 사람이 확인",
  },
  {
    id: "descriptive",
    label: "서술형",
    desc: "두세 문장으로 씁니다",
    scoring: "AI 1차 채점 → 신뢰도 0.75 미만은 사람 배정",
  },
  {
    id: "essay",
    label: "논술형",
    desc: "한 편의 글로 씁니다",
    scoring: "루브릭 기반 사람 채점 + 이중 채점 표본",
  },
];

export const typeLabel = (id: ItemType) => itemTypes.find((t) => t.id === id)?.label ?? id;

/**
 * 문항에 딸린 파일.
 *
 * 브라우저에만 두는 화면 설계용이라 data URL로 담는다. 실제 구현에서는 파일 저장소에
 * 올리고 키만 문항에 남긴다 — 문항 하나가 수 MB를 이고 다니면 목록 조회가 느려진다.
 * 그래서 여기서도 크기 상한을 두고, 넘으면 받지 않는다.
 */
export type ItemAsset = {
  id: string;
  name: string;
  /** image | pdf | sheet */
  kind: "image" | "pdf" | "sheet";
  size: number;
  /** 이미지일 때만 미리보기에 쓴다 */
  dataUrl?: string;
  at: string;
};

/** 한 파일 상한 (화면 설계용 — 실제 저장소는 더 크게 잡는다) */
export const MAX_ASSET_BYTES = 2 * 1024 * 1024;

export function assetKindOf(file: File): ItemAsset["kind"] | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type === "application/pdf") return "pdf";
  if (/sheet|excel|csv/.test(file.type) || /\.(xlsx?|csv)$/i.test(file.name)) return "sheet";
  return null;
}

/**
 * 코멘트 한 줄.
 *
 * 반려할 때만 말을 남길 수 있으면, 「반려까지는 아닌데 짚고 넘어갈 것」을 적을 자리가
 * 없어 검수자가 반려를 남발하게 된다. 그래서 종류를 나눈다 —
 *   note   검수 중 메모·질의 (상태를 바꾸지 않는다)
 *   reject 반려 (사유 코드가 붙는다)
 *   approve 승인 소견
 * 출제자도 note를 달 수 있다. 반려 사유에 대한 답을 적는 자리다.
 */
export type CommentKind = "note" | "reject" | "approve";

export type ItemComment = {
  at: string;
  by: string;
  role: StaffRoleId;
  kind: CommentKind;
  /** 반려 사유 코드. kind가 reject일 때만 있다. */
  code?: RejectCode;
  text: string;
};

export type ItemDraft = {
  id: string;
  /** 문항 코드 — 사람이 부르는 이름 */
  code: string;
  subject: "국어" | "수학" | "과학";
  grade: string;
  /** 지문·자료 (없을 수 있다) */
  passage: string;
  /** 발문 */
  stem: string;
  choices: string[];
  /** 정답 보기 index */
  answer: number;
  explain: string;
  type: ItemType;
  /** 단답형 허용 답안 (쉼표로 구분해 입력받는다) */
  shortAnswers: string;
  /** 서술형·논술형 채점 기준 */
  rubric: string;
  /** 지문·보기에 딸린 파일 */
  assets: ItemAsset[];
  /** 승인본을 고칠 때 만든 새 버전이면, 원본 번호 */
  revisionOf?: string;
  version: number;
  /* ── 발주서 Ver.4.1 문항 카드 (lib/blueprint.ts) ── */
  /** 학년군 — 성취기준 코드의 접두를 결정한다 */
  band: GradeBand;
  /** 단원명 */
  unit: string;
  /** 단원 번호 — 문항 ID의 가운데 두 자리 */
  unitNo: string;
  /** ③ 성취기준 코드 — 없으면 접수 반려(§7.2) */
  standardCode: string;
  /** ③ 성취기준 내용 */
  standardText: string;
  /** ④ Tag A 세부 — 이 문항이 재는 학력을 한 줄로 */
  tagADetail: string;
  /** ④ Tag B 주태그 — 재능 */
  talent: TalentId;
  /** ④ Tag B 주태그 — 하위요소 코드 (LANG-01 등) */
  subskill: string;
  /** ④ Tag B 부태그 — 두 영역을 불가피하게 걸칠 때만. 점수는 주태그에만 귀속(§6 운용규칙②) */
  subTalent?: TalentId;
  subSubskill?: string;
  /** ⑤ 배점 — 단계에서 자동으로 따라온다 */
  points: number;
  /** ⑤ 예상 난이도 b 모수 — 단계 앵커값에서 시작해 출제자가 조정 */
  b: number;
  /** 앵커 문항(장기 재사용·미공개). 전체의 30%(§7.1) */
  anchor: boolean;
  /** ⑦ 출제자 유의사항 */
  guidance: string;
  /** ⑦ 오답마다 어떤 오개념을 잡는가 — 보기와 같은 순서 */
  distractorIntent: string[];
  /** 제출 전 체크리스트에서 확인한 항목 id (§9) */
  checks: string[];
  /** Tag A 표시용 — 저장할 때 성취기준에서 만든다 */
  tagA: string;
  /** Tag B 표시용 — 3원 좌표(재능·하위요소·S단계) */
  tagB: string;
  /** S1 지각 · S2 이해 · S3 생성 · S4 창의 */
  level: Level;
  /** 출제자 아이디 */
  author: string;
  authorName: string;
  state: ItemState;
  comments: ItemComment[];
  updatedAt: string;
};

/** 반려 사유 — 코드로 고르게 해서 출제자가 무엇을 고쳐야 하는지 바로 알게 한다 */
export const rejectCodes = [
  { id: "content", label: "내용 오류", desc: "교과 내용이 틀렸거나 근거가 약합니다" },
  { id: "answer", label: "정답 불명확", desc: "정답이 둘 이상으로 읽히거나 근거가 부족합니다" },
  { id: "wording", label: "발문 모호", desc: "묻는 바가 분명하지 않습니다" },
  { id: "grade", label: "학년 부적합", desc: "해당 학년이 읽기에 어렵거나 쉽습니다" },
  { id: "bias", label: "편향 우려", desc: "성·지역·문화·SES 편향이 보입니다" },
  { id: "tag", label: "태깅 불일치", desc: "이중태그나 S위계가 문항과 맞지 않습니다" },
] as const;

export type RejectCode = (typeof rejectCodes)[number]["id"];

export const rejectLabel = (id: RejectCode) =>
  rejectCodes.find((c) => c.id === id)?.label ?? id;

/** 검수 3단 — 정의서 EXP-03-1~3 */
export const reviewChecks = [
  { id: "content", label: "1차 내용", desc: "교과 정확성 · 발문 명료성 · 정답 유일성 · 학년 이독성" },
  { id: "tagging", label: "2차 태깅", desc: "이중태그와 S위계가 문항이 실제로 재는 것과 맞는가" },
  { id: "ethics", label: "3차 윤리·편향", desc: "성·지역·문화·SES 편향, 아동 정서 적합성" },
] as const;

export type ReviewCheckId = (typeof reviewChecks)[number]["id"];

/**
 * 예시 문항.
 *
 * 뒤쪽 여섯 개(4K02-S1~S4 · 3M04-S1 · 3M04-S4)는 발주서 §4·§5의 예시 문항을 그대로
 * 옮긴 것이다. 「이 형식을 표준으로 삼아 주십시오」라고 적힌 세트라, 출제자가 새
 * 문항을 쓸 때 열어 보고 베낄 수 있는 자리에 둔다.
 *
 * ⚠ 앞쪽 다섯 개는 화면 설계를 위해 지어낸 예시입니다.
 */
const SEED_RAW: Partial<ItemDraft>[] = [
  {
    id: "IT-2601",
    code: "KOR-3-014",
    subject: "국어",
    grade: "초등 3학년",
    band: "3-4",
    unit: "읽기 — 인물의 마음",
    unitNo: "02",
    standardCode: "[4국02-02]",
    standardText: "글에서 인물의 마음이나 생각을 짐작한다.",
    tagADetail: "상황에서 가장 먼저 할 일 판단",
    talent: "LANG",
    subskill: "LANG-03",
    passage:
      "민수는 학교에서 돌아오는 길에 길 잃은 강아지를 보았습니다. 강아지는 목줄을 하고 있었지만 이름표는 없었습니다.",
    stem: "민수가 가장 먼저 해야 할 일로 알맞은 것은 무엇입니까?",
    choices: [
      "강아지를 집으로 데려간다",
      "주변에 주인을 찾는 사람이 있는지 살펴본다",
      "강아지를 그냥 두고 지나간다",
      "강아지에게 먹이를 준다",
    ],
    distractorIntent: [
      "돌봄 충동을 우선하는 오개념",
      "",
      "회피가 무행동으로 정당화되는 오개념",
      "필요보다 즉각 보상을 앞세우는 오개념",
    ],
    answer: 1,
    explain: "글에 드러난 상황에서 가장 먼저 확인해야 할 것을 고르는 문항입니다.",
    guidance: "글에 적힌 단서(목줄·이름표 없음)만으로 풀리게 하고, 배경지식을 요구하지 않습니다.",
    type: "choice",
    shortAnswers: "",
    rubric: "",
    assets: [],
    version: 1,
    level: "S2",
    author: "author.kim",
    authorName: "김출제",
    state: "submitted",
    comments: [],
    updatedAt: "2026-08-10 14:20",
  },
  {
    id: "IT-2602",
    code: "MAT-3-008",
    subject: "수학",
    grade: "초등 3학년",
    band: "3-4",
    unit: "나눗셈",
    unitNo: "01",
    standardCode: "[4수01-05]",
    standardText: "나눗셈이 이루어지는 실생활 상황을 통하여 나눗셈의 의미를 알 수 있다.",
    tagADetail: "등분제 상황의 나눗셈 수행",
    talent: "MATH",
    subskill: "MATH-01",
    passage: "",
    stem: "사과 24개를 한 상자에 6개씩 담으려고 합니다. 상자는 몇 개가 필요합니까?",
    choices: ["3개", "4개", "5개", "6개"],
    distractorIntent: ["24-6=18을 다시 나눈 혼동", "", "몫과 나머지 혼동", "제수를 몫으로 읽는 혼동"],
    answer: 1,
    explain: "24 ÷ 6 = 4. 나눗셈의 등분제 상황입니다.",
    guidance: "",
    type: "choice",
    shortAnswers: "",
    rubric: "",
    assets: [],
    version: 1,
    level: "S1",
    author: "author.kim",
    authorName: "김출제",
    state: "rejected",
    comments: [
      {
        at: "2026-08-10 16:05",
        by: "이검수",
        role: "reviewer",
        kind: "reject",
        code: "grade",
        text: "초등 3학년 1학기에는 나눗셈이 아직 나오지 않습니다. 곱셈 상황으로 바꾸거나 학년을 4학년으로 올려 주세요.",
      },
      {
        at: "2026-08-10 16:07",
        by: "이검수",
        role: "reviewer",
        kind: "note",
        text: "단계도 함께 보십시오. 연산이 필요하므로 S1이 아니라 S3입니다(§1.2 금지 조작).",
      },
    ],
    updatedAt: "2026-08-10 16:07",
  },
  {
    id: "IT-2603",
    code: "SCI-4-002",
    subject: "과학",
    grade: "초등 4학년",
    band: "3-4",
    unit: "물의 상태 변화",
    unitNo: "10",
    standardCode: "[4과10-01]",
    standardText: "물이 얼거나 끓을 때의 변화를 관찰하여 상태 변화를 설명할 수 있다.",
    tagADetail: "언 물의 부피 변화 확인",
    talent: "NATU",
    subskill: "NATU-01",
    passage: "",
    stem: "물이 얼면 부피는 어떻게 됩니까?",
    choices: ["늘어난다", "줄어든다", "변하지 않는다", "알 수 없다"],
    distractorIntent: [],
    answer: 0,
    explain: "물은 얼면 부피가 늘어납니다.",
    guidance: "탐색적 측정 영역입니다. 점수 비교 대상이 아님을 메타에 유지합니다.",
    type: "short",
    shortAnswers: "늘어난다, 커진다, 증가한다",
    rubric: "",
    assets: [],
    version: 1,
    level: "S1",
    author: "author.yoon",
    authorName: "윤출제",
    state: "submitted",
    comments: [],
    updatedAt: "2026-08-11 09:02",
  },
  {
    id: "IT-2604",
    code: "KOR-4-021",
    subject: "국어",
    grade: "초등 4학년",
    band: "3-4",
    unit: "낱말의 의미 관계",
    unitNo: "04",
    standardCode: "[4국04-02]",
    standardText: "낱말과 낱말의 의미 관계를 파악한다.",
    tagADetail: "감정 낱말의 범주 식별",
    talent: "LANG",
    subskill: "LANG-01",
    passage: "",
    stem: "다음 중 낱말의 뜻이 나머지와 다른 하나는 무엇입니까?",
    choices: ["기쁘다", "즐겁다", "슬프다", "행복하다"],
    distractorIntent: ["", "", "", ""],
    answer: 2,
    explain: "나머지는 긍정적 감정, '슬프다'만 부정적 감정입니다.",
    guidance: "보기 낱말은 3·4학년 학습 어휘 내에서 고릅니다. 생소어 금지.",
    type: "choice",
    shortAnswers: "",
    rubric: "",
    assets: [],
    version: 1,
    anchor: true,
    level: "S1",
    author: "author.kim",
    authorName: "김출제",
    state: "approved",
    comments: [
      {
        at: "2026-08-09 11:30",
        by: "이검수",
        role: "reviewer",
        kind: "approve",
        text: "정답 유일성과 학년 이독성 모두 문제 없습니다. 승인합니다.",
      },
    ],
    updatedAt: "2026-08-09 11:30",
  },
  {
    id: "IT-2605",
    code: "",
    subject: "수학",
    grade: "초등 4학년",
    band: "3-4",
    unit: "",
    unitNo: "",
    standardCode: "",
    standardText: "",
    tagADetail: "",
    talent: "MATH",
    subskill: "MATH-02",
    passage: "",
    stem: "",
    choices: ["", "", "", ""],
    distractorIntent: [],
    answer: 0,
    explain: "",
    guidance: "",
    type: "descriptive",
    shortAnswers: "",
    rubric: "",
    assets: [],
    version: 1,
    level: "S2",
    author: "author.kim",
    authorName: "김출제",
    state: "draft",
    comments: [],
    updatedAt: "2026-08-11 10:15",
  },

  /* ── 발주서 §4 예시 문항 A — 국어(언어-기호) S1~S4 완전 세트 ── */
  {
    id: "IT-2606",
    code: "4K02-S1-001",
    subject: "국어",
    grade: "초등 3~4학년군",
    band: "3-4",
    unit: "낱말의 의미 관계",
    unitNo: "02",
    standardCode: "[4국04-02]",
    standardText: "낱말과 낱말의 의미 관계를 파악한다.",
    tagADetail: "반대말 짝 식별",
    talent: "LANG",
    subskill: "LANG-01",
    passage: "",
    stem: "다음 중 두 낱말의 관계가 '크다 — 작다'와 같은 것은?",
    choices: ["새 — 참새", "빠르다 — 느리다", "책 — 공책", "나무 — 소나무"],
    distractorIntent: ["상하위어를 반대말로 보는 혼동", "", "나열을 관계로 보는 혼동", "상하위어를 반대말로 보는 혼동"],
    answer: 1,
    explain: "정답 ②(반대말 관계). ①④는 상하위어, ③은 나열입니다.",
    guidance:
      "낱말 짝의 '관계 모양'을 보고 식별만 합니다. 뜻풀이·활용을 요구하면 S2로 이탈합니다. 보기 낱말은 3·4학년 학습 어휘 내에서 고르고 생소어는 금지합니다.",
    type: "choice",
    shortAnswers: "",
    rubric: "",
    assets: [],
    version: 1,
    anchor: true,
    level: "S1",
    author: "author.kim",
    authorName: "김출제",
    state: "approved",
    comments: [],
    updatedAt: "2026-08-08 10:00",
  },
  {
    id: "IT-2607",
    code: "4K02-S2-001",
    subject: "국어",
    grade: "초등 3~4학년군",
    band: "3-4",
    unit: "낱말의 의미 관계",
    unitNo: "02",
    standardCode: "[4국04-02]",
    standardText: "낱말과 낱말의 의미 관계를 파악한다.",
    tagADetail: "낱말 의미 관계 이해",
    talent: "LANG",
    subskill: "LANG-01",
    passage: "",
    stem: "왼쪽 낱말 관계와 오른쪽 설명을 바르게 연결하시오. (비슷한 말 / 반대말 / 상하위어)",
    choices: [
      "비슷한 말 — 뜻이 서로 비슷한 낱말",
      "반대말 — 뜻이 서로 반대인 낱말",
      "상하위어 — 한 낱말이 다른 낱말을 포함하는 관계",
      "",
    ],
    distractorIntent: [],
    answer: 0,
    explain: "셋 다 맞아야 1점입니다.",
    guidance:
      "낱말 '관계의 원리'를 이해하는지 봅니다. 선연결은 추측확률이 있으므로 3:3으로 구성합니다. '왜 그 관계인지'까지 넘어가면 S3입니다.",
    type: "choice",
    shortAnswers: "",
    rubric: "",
    assets: [],
    version: 1,
    level: "S2",
    author: "author.kim",
    authorName: "김출제",
    state: "approved",
    comments: [],
    updatedAt: "2026-08-08 10:05",
  },
  {
    id: "IT-2608",
    code: "4K02-S3-001",
    subject: "국어",
    grade: "초등 3~4학년군",
    band: "3-4",
    unit: "낱말의 의미 관계",
    unitNo: "02",
    standardCode: "[4국04-02]",
    standardText: "낱말과 낱말의 의미 관계를 파악한다.",
    tagADetail: "의미 관계 낱말 생성 · 적용",
    talent: "LANG",
    subskill: "LANG-03",
    passage: "",
    stem: "'무겁다'의 반대말을 한 낱말로 쓰고, 그 반대말을 넣어 짧은 문장을 하나 만드시오.",
    choices: ["", "", "", ""],
    distractorIntent: [],
    answer: 0,
    explain: "정답 예: 가볍다 / '가방이 가볍다.' 반대말 정확 1점 + 문장 적절 1점.",
    guidance:
      "복수 정답을 허용합니다('가볍다' 외 문맥상 반대말). 채점 키에 인정 답안 목록을 등록하고, 문장은 낱말을 올바른 뜻으로 썼는지만 봅니다. 맞춤법 감점은 별도 기준입니다.",
    type: "short",
    shortAnswers: "가볍다, 가벼워, 가벼운",
    rubric: "",
    assets: [],
    version: 1,
    level: "S3",
    author: "author.kim",
    authorName: "김출제",
    state: "approved",
    comments: [],
    updatedAt: "2026-08-08 10:10",
  },
  {
    id: "IT-2609",
    code: "4K02-S4-001",
    subject: "국어",
    grade: "초등 3~4학년군",
    band: "3-4",
    unit: "낱말의 의미 관계 · 읽기",
    unitNo: "02",
    standardCode: "[4국02-03]",
    standardText: "글에서 낱말의 의미나 생략된 내용을 짐작한다.",
    tagADetail: "문맥 속 낱말 관계 판단",
    talent: "LANG",
    subskill: "LANG-01",
    passage: "",
    stem: "어떤 친구가 “'밝다'의 반대말은 언제나 '어둡다' 하나뿐이다”라고 말했다. 이 말이 맞는지 판단하고, 그렇게 생각한 까닭을 예를 들어 설명하시오. (힌트: '표정이 밝다', '방이 밝다'처럼 쓰임을 떠올려 보시오.)",
    choices: ["", "", "", ""],
    distractorIntent: [],
    answer: 0,
    explain:
      "모범답안 예: 항상 하나는 아님. '방이 밝다 ↔ 어둡다'지만 '표정이 밝다 ↔ 어둡다/우울하다'처럼 문맥에 따라 반대말이 달라질 수 있음.",
    rubric:
      "판단(항상 아님) 1점 + 문맥 예시 제시 1점 + 까닭 설명 1점.\n인정 예: '쓰임에 따라 달라진다', '표정일 때는 우울하다도 된다'\n불인정 예: '어둡다 하나뿐이다', 예시 없이 판단만 쓴 답",
    guidance:
      "정답형 S4입니다 — 문맥에 따라 반대말이 달라진다는 '언어적으로 참인' 결론이 존재하며 가치판단이 아닙니다. 채점 일치도 ICC≥0.75를 위해 AI 1차 채점 후 휴먼 2인이 검증합니다. 저학년이므로 힌트로 스캐폴딩하되 예시 생성은 학생이 하도록 유지합니다.",
    type: "essay",
    shortAnswers: "",
    assets: [],
    version: 1,
    level: "S4",
    author: "author.kim",
    authorName: "김출제",
    state: "approved",
    comments: [],
    updatedAt: "2026-08-08 10:20",
  },

  /* ── 발주서 §5 예시 문항 B — 수학(수리-논리) ── */
  {
    id: "IT-2610",
    code: "3M04-S1-001",
    subject: "수학",
    grade: "초등 3~4학년군",
    band: "3-4",
    unit: "분수",
    unitNo: "04",
    standardCode: "[4수01-10]",
    standardText: "양의 등분할을 통하여 분수를 이해하고 읽고 쓸 수 있다.",
    tagADetail: "분수만큼 색칠 식별",
    talent: "MATH",
    subskill: "MATH-01",
    passage: "",
    stem: "전체를 똑같이 나눈 그림 중에서 색칠한 부분이 1/2인 것은? (원·사각형 등분 색칠 그림 ①~④ 제시)",
    choices: ["2등분 1칸 색칠", "3등분 1칸 색칠", "4등분 1칸 색칠", "4등분 3칸 색칠"],
    distractorIntent: ["", "등분 수 혼동(1/3)", "등분 수 혼동(1/4)", "색칠 칸 수만 세는 혼동"],
    answer: 0,
    explain: "정답: 2등분 1칸 색칠(또는 4등분 2칸 등 1/2과 같은 양).",
    guidance:
      "색칠된 '양'을 보고 1/2인지 식별만 합니다. 분수 계산·기약 변환 요구는 금지입니다. 색이 아닌 빗금·형태로도 구별되게 해 색맹 학생이 풀 수 있게 합니다.",
    type: "choice",
    shortAnswers: "",
    rubric: "",
    assets: [],
    version: 1,
    anchor: true,
    level: "S1",
    author: "author.yoon",
    authorName: "윤출제",
    state: "approved",
    comments: [],
    updatedAt: "2026-08-08 11:00",
  },
  {
    id: "IT-2611",
    code: "3M04-S4-001",
    subject: "수학",
    grade: "초등 3~4학년군",
    band: "3-4",
    unit: "분수",
    unitNo: "04",
    standardCode: "[4수01-12]",
    standardText: "분모가 같은 분수끼리, 단위분수끼리 크기를 비교할 수 있다.",
    tagADetail: "같은 분모 일반화",
    talent: "MATH",
    subskill: "MATH-03",
    passage: "",
    stem: "지호는 “분모가 8인 분수는 분자가 클수록 더 크다”고 말했다. (1) 분모가 8인 분수를 빈칸에 두 개 만들고(□/8과 □/8), 어느 것이 더 큰지 설명하시오. (2) 분모가 8로 같을 때 지호의 말이 항상 맞는지 까닭을 들어 쓰시오.",
    choices: ["", "", "", ""],
    distractorIntent: [],
    answer: 0,
    explain:
      "모범답안 예: (1) 5/8 > 3/8, 색칠 칸이 많아 더 큼. (2) 항상 맞음 — 한 칸(1/8) 크기가 같으므로 분자가 1 커지면 1/8씩 커짐.",
    rubric:
      "예 생성·비교 1점 + 근거(단위분수) 1점 + 일반화 정당화 1점.\n인정 예: '한 칸 크기가 같아서', '1/8씩 커지니까'\n불인정 예: '분자가 크니까 크다'(재진술만)",
    guidance:
      "정답형 S4 + 학년군 범위 준수 — '분모가 다른 비교'(5~6학년군 [6수01-07])는 요구 금지, 같은 분모 내로 한정합니다. □/8 빈칸으로 저학년을 스캐폴딩하되 생성 본질은 유지합니다.",
    type: "essay",
    shortAnswers: "",
    assets: [],
    version: 1,
    level: "S4",
    author: "author.yoon",
    authorName: "윤출제",
    state: "submitted",
    comments: [],
    updatedAt: "2026-08-11 15:40",
  },
];

const SEED: ItemDraft[] = SEED_RAW.map(fill);

const KEY = "genixx.items";
const EVENT = "genixx:items-change";

let cacheRaw: string | null = null;
let cacheValue: ItemDraft[] = SEED;

/**
 * 발주서 항목이 없던 시절의 문항을 메운다.
 *
 * 브라우저에 남아 있는 초안과 아래 SEED는 band·성취기준·Tag B 좌표를 갖고 있지
 * 않다. 없는 채로 화면에 흘리면 폼이 빈 값으로 터지므로 읽을 때 한 번 채운다.
 * 채워 넣는 값은 기본값일 뿐 「작성됨」이 아니다 — 성취기준 코드는 비워 두어
 * 체크리스트에서 걸리게 한다.
 */
function fill(raw: Partial<ItemDraft>): ItemDraft {
  const level = (raw.level ?? "S1") as Level;
  const spec = levelSpecs[level];
  const talent = (raw.talent ?? "LANG") as TalentId;
  const band = (raw.band ?? "3-4") as GradeBand;
  return {
    ...(raw as ItemDraft),
    band,
    unit: raw.unit ?? "",
    unitNo: raw.unitNo ?? "",
    standardCode: raw.standardCode ?? "",
    standardText: raw.standardText ?? "",
    tagADetail: raw.tagADetail ?? raw.tagA ?? "",
    talent,
    subskill: raw.subskill ?? subskillsOf(talent)[0].code,
    points: raw.points ?? spec.points,
    b: raw.b ?? spec.b,
    anchor: raw.anchor ?? false,
    guidance: raw.guidance ?? "",
    distractorIntent: raw.distractorIntent ?? [],
    checks: raw.checks ?? [],
    tagA: raw.tagA ?? "",
    tagB: raw.tagB ?? "",
    comments: raw.comments ?? [],
    assets: raw.assets ?? [],
  };
}

function read(): ItemDraft[] {
  if (typeof window === "undefined") return SEED;
  const raw = window.localStorage.getItem(KEY);
  if (raw === cacheRaw) return cacheValue;
  cacheRaw = raw;
  try {
    cacheValue = raw ? (JSON.parse(raw) as Partial<ItemDraft>[]).map(fill) : SEED;
  } catch {
    cacheValue = SEED;
  }
  return cacheValue;
}

function write(next: ItemDraft[]) {
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

export function useItems(): ItemDraft[] {
  return useSyncExternalStore(subscribe, read, () => SEED);
}

/** 화면에 찍는 시각 — 초 단위까지 갈 필요가 없다 */
function now() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function patchItem(id: string, patch: Partial<ItemDraft>) {
  write(read().map((i) => (i.id === id ? { ...i, ...patch, updatedAt: now() } : i)));
}

export function addItem(author: string, authorName: string): ItemDraft {
  const list = read();
  const item: ItemDraft = fill({
    id: `IT-${2600 + list.length + 1}`,
    code: "",
    subject: "국어",
    grade: "초등 3~4학년군",
    band: "3-4",
    passage: "",
    stem: "",
    choices: ["", "", "", ""],
    answer: 0,
    explain: "",
    type: "choice",
    shortAnswers: "",
    rubric: "",
    assets: [],
    version: 1,
    level: "S1",
    author,
    authorName,
    state: "draft",
    comments: [],
    updatedAt: now(),
  });
  write([item, ...list]);
  return item;
}

/**
 * 단계가 바뀌면 형식·배점·b모수가 따라온다 (§1 고정 매핑).
 *
 * 출제자가 단계만 고르면 나머지가 정해지도록 한 자리다. 발주서가 「판별 → 형식」
 * 순서를 못 박았기 때문에, 형식을 먼저 고르고 단계를 끼워 맞추는 길을 열어 두지
 * 않는다. b모수는 앵커값에서 시작하되 예비검사 뒤 조정할 수 있으므로 덮어쓴다.
 */
export const typeForLevel: Record<Level, ItemType> = {
  S1: "choice",
  S2: "choice",
  S3: "short",
  S4: "essay",
};

export function setLevel(id: string, level: Level) {
  const spec = levelSpecs[level];
  patchItem(id, {
    level,
    type: typeForLevel[level],
    points: spec.points,
    b: spec.b,
  });
}

/**
 * 표시용 태그를 구조화된 값에서 만든다.
 *
 * 검수 워크벤치와 문항 은행은 tagA·tagB 한 줄만 읽는다. 출제 폼에서 성취기준과
 * Tag B 좌표를 고칠 때마다 그 두 줄을 다시 만들어 둬야 다른 화면이 옛 값을 보지
 * 않는다.
 */
export function syncTags(item: ItemDraft): Pick<ItemDraft, "tagA" | "tagB"> {
  const a = [item.standardCode, item.tagADetail].filter(Boolean).join(" ");
  const b = tagBCoord(item.talent, item.subskill, item.level);
  const sub =
    item.subTalent && item.subSubskill
      ? ` (부: ${tagBCoord(item.subTalent, item.subSubskill, item.level)})`
      : "";
  return { tagA: a, tagB: `${b}${sub}` };
}

/** 문항 ID를 지금 값으로 다시 매긴다 — 학년군·교과·단원·단계가 바뀌면 코드도 바뀐다 */
export function suggestCode(item: ItemDraft, serial: number) {
  return makeItemCode(item.band, item.subject, item.unitNo, item.level, serial);
}

/** 제출 — 검수 목록으로 넘어간다. 제출 후에는 출제자가 고칠 수 없다(EXP-02-5). */
export function submitItem(id: string) {
  patchItem(id, { state: "submitted" });
}

/** 제출 회수 — 검수자가 아직 손대지 않았을 때 되돌려 고친다 */
export function withdrawItem(id: string) {
  patchItem(id, { state: "draft" });
}

/**
 * 승인본 고치기 — 원본을 건드리지 않고 새 버전을 뜬다.
 * 이미 검사지에 들어간 문항의 내용이 바뀌면 앞 회차 응답과 대조가 어긋나기 때문이다.
 */
export function reviseApproved(id: string): ItemDraft | null {
  const list = read();
  const origin = list.find((i) => i.id === id);
  if (!origin) return null;
  const copy: ItemDraft = {
    ...origin,
    id: `IT-${2600 + list.length + 1}`,
    state: "draft",
    version: origin.version + 1,
    revisionOf: origin.code || origin.id,
    comments: [],
    updatedAt: now(),
  };
  write([copy, ...list]);
  return copy;
}

/** 코멘트만 남긴다 — 상태는 그대로. 반려까지는 아닌데 짚고 넘어갈 것을 적는 자리다. */
export function addComment(id: string, by: string, role: StaffRoleId, text: string) {
  const item = read().find((i) => i.id === id);
  if (!item) return;
  patchItem(id, {
    comments: [...item.comments, { at: now(), by, role, kind: "note", text }],
  });
}

/** 반려 — 사유 코드와 코멘트가 붙어 출제자의 반려함으로 돌아간다 */
export function rejectItem(id: string, by: string, code: RejectCode, text: string) {
  const item = read().find((i) => i.id === id);
  if (!item) return;
  patchItem(id, {
    state: "rejected",
    comments: [...item.comments, { at: now(), by, role: "reviewer", kind: "reject", code, text }],
  });
}

/** 승인 — 문항 은행에 올라가 검사지 조립 대상이 된다 */
export function approveItem(id: string, by: string, text: string) {
  const item = read().find((i) => i.id === id);
  if (!item) return;
  patchItem(id, {
    state: "approved",
    comments: [...item.comments, { at: now(), by, role: "reviewer", kind: "approve", text }],
  });
}

/** 파일 붙이기 — 상한을 넘으면 받지 않는다 */
export function attachAsset(id: string, asset: ItemAsset) {
  const item = read().find((i) => i.id === id);
  if (!item) return;
  patchItem(id, { assets: [...item.assets, asset] });
}

export function removeAsset(id: string, assetId: string) {
  const item = read().find((i) => i.id === id);
  if (!item) return;
  patchItem(id, { assets: item.assets.filter((x) => x.id !== assetId) });
}

/**
 * 채워야 할 칸이 다 찼는지 — 제출 버튼을 열지 말지 정한다.
 * 유형마다 필요한 칸이 다르다. 객관식에 루브릭을 요구하거나 논술형에 보기를 요구하면
 * 쓰지 않을 칸을 채우게 된다.
 */
/**
 * 제출 전에 무엇이 모자란지 — 발주서 §3 문항 카드 7항목과 §9 체크리스트 기준.
 *
 * 「나중에 채우겠다」로 넘어간 칸이 3중 검토에서 반려로 돌아온다. 그래서 무엇이
 * 비었는지를 버튼 옆에 이름으로 적어 둔다. 성취기준 코드는 없으면 접수 자체가
 * 반려되므로(§7.2) 학년군 범위까지 함께 본다.
 */
export function missingFields(i: ItemDraft) {
  const out: string[] = [];
  if (!i.code.trim()) out.push("문항 ID");
  if (!i.unit.trim()) out.push("단원");

  const std = checkStandardCode(i.standardCode, i.band);
  if (!std.ok) out.push("성취기준 코드");
  if (!i.standardText.trim()) out.push("성취기준 내용");
  if (!i.tagADetail.trim()) out.push("Tag A 세부");

  if (!levelAllowed(i.talent, i.level)) out.push("Tag B 단계 범위");

  if (!i.stem.trim()) out.push("발문");
  if (!i.explain.trim()) out.push("정답 · 채점");
  if (!i.guidance.trim()) out.push("출제자 유의사항");

  if (i.type === "choice") {
    if (!i.choices.every((c) => c.trim())) out.push("보기");
    // 오답마다 어떤 오개념을 잡는지 적지 않으면 변별도가 죽는다(§1.1)
    const bad = i.choices.some((c, n) => c.trim() && n !== i.answer && !i.distractorIntent[n]?.trim());
    if (bad) out.push("오답 의도");
  }
  if (i.type === "short" && !i.shortAnswers.trim()) out.push("허용 답안");
  if ((i.type === "descriptive" || i.type === "essay") && !i.rubric.trim()) out.push("루브릭");

  const left = submitChecklist.filter((c) => !c.auto && !i.checks.includes(c.id)).length;
  if (left > 0) out.push(`체크리스트 ${left}항목`);

  return out;
}

export function itemReady(i: ItemDraft) {
  return missingFields(i).length === 0;
}

/** 성취기준 코드 진단 — 폼에서 칸 아래에 그대로 띄운다 */
export function standardIssue(i: ItemDraft) {
  return checkStandardCode(i.standardCode, i.band);
}

export const stateLabel: Record<ItemState, string> = {
  draft: "작성 중",
  submitted: "검수 대기",
  rejected: "반려됨",
  approved: "승인됨",
};

export const stateTone: Record<ItemState, string> = {
  draft: "text-exam-muted",
  submitted: "text-brand-700",
  rejected: "text-rose-700",
  approved: "text-emerald-700",
};
