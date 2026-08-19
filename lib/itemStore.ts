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
import { pickSample } from "./itemBank";
import { auditItem, auditRejection } from "./itemAudit";

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

/**
 * 문항의 상태.
 *
 * retired(사용 중지)는 승인 뒤에만 붙는다. 정답률이 한쪽으로 치우쳐 변별이 되지
 * 않거나 소재가 낡은 문항을 회차에서 빼는 자리인데, 지우지는 않는다 — 그 문항으로
 * 이미 판정한 아이들의 결과를 나중에 설명할 수 있어야 한다.
 */
export type ItemState = "draft" | "submitted" | "rejected" | "approved" | "retired";

export type ItemOrigin = "human" | "ai";

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
  /**
   * 그림을 글로 옮긴 것.
   *
   * 저시력·전맹 학생에게는 이 글이 그림을 대신한다. 없으면 그 학생에게는 문항이
   * 아예 성립하지 않으므로, 파일 이름(IMG_2481.png)으로 때울 수 있는 자리가 아니다.
   * 다만 제출을 막지는 않는다 — 지문 그림이 없는 문항이 대부분이고, 있는 문항은
   * 검수에서 걸러진다.
   */
  alt?: string;
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
  /** 기계가 남긴 말은 ai — 누가 한 말인지가 검수 기록에서 가장 중요한 값이다 */
  role: StaffRoleId | "ai";
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
  /** 지난 회차 정답률(%). 아직 출제되지 않았으면 null */
  correctRate: number | null;
  /** 사용 중지한 시각·사람·까닭. 되돌리면 지운다. */
  retiredAt?: string;
  retiredBy?: string;
  retireReason?: string;
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
  /**
   * 밖으로 공개된 적이 있는가 — 샘플 문항·보도자료·설명회 자료로 나간 것.
   *
   * 공개된 문항은 앵커가 될 수 없다. 앵커는 회차가 달라도 같은 잣대로 재려고 두는
   * 기준인데, 답이 알려진 문항은 그 기준 노릇을 못 한다.
   */
  disclosed?: boolean;
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
  /**
   * 누가 낸 초안인가.
   *
   * 검수자가 이걸 모르면 안 된다. AI가 낸 틀은 사람이 쓴 것과 걸리는 자리가 달라서
   * (형식은 맞는데 학년 어휘가 튀거나, 태깅은 맞는데 소재가 겹치거나) 어디를 먼저
   * 볼지가 바뀐다. 진단 윤리 헌장이 AI 산출물 고지를 요구하기도 한다.
   */
  origin: ItemOrigin;
  /** AI에게 무엇을 시켰는가 — 초안이 이상할 때 지시문부터 본다 */
  aiBrief?: string;
  /** 끝난 검수 이력 — 승인이든 반려든 회차별로 쌓인다 */
  reviews: ReviewRecord[];
  /** 쓰다 만 검수. 승인·반려로 결론이 나면 지운다. */
  reviewDraft?: ReviewDraft;
  /**
   * AI 검수 결과.
   *
   * reviewDraft와 따로 둔다. 한 칸에 같이 담으면 사람이 쓰던 소견을 기계가 덮어쓰거나,
   * 반대로 화면에 뜬 소견을 누가 적은 것인지 알 수 없게 된다. 누가 짚었는지가 검수
   * 기록에서 가장 중요한 값이라 자리를 갈라 둔다.
   */
  aiAudit?: AiAudit;
  updatedAt: string;
};

/**
 * AI 검수가 남긴 것.
 *
 * AI는 검수자다 — 사람 검수자와 같은 자리에 같은 형식으로 결론을 쌓는다.
 *
 *   승인  걸린 것이 하나도 없음. 문항 은행으로 올라간다.
 *   보류  규칙으로는 못 가리는 것(warns)이 남음. 짚어만 두고 사람에게 넘긴다.
 *   반려  규칙을 그대로 어긴 것(blocks)이 있음. 사유 코드와 고칠 곳을 적어 되돌린다.
 */
export type AiAudit = {
  at: string;
  checks: { id: ReviewCheckId; ok: boolean; notes: string[] }[];
  blocks: number;
  warns: number;
  /** approve 승인함 · hold 사람에게 넘김 · reject 반려함 */
  verdict: AiVerdict;
  /** 반려했을 때의 사유 코드 — 사람이 고르는 것과 같은 목록을 쓴다 */
  code?: RejectCode;
  /** 반려 소견문. 반려하지 않았으면 비어 있다. */
  text?: string;
};

export type AiVerdict = "approve" | "hold" | "reject";

/** 검수 기록·코멘트에 찍히는 AI 검수자의 이름 */
export const AI_REVIEWER = "AI 검수";

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

export const rejectLabel = (id: RejectCode) => rejectCodes.find((c) => c.id === id)?.label ?? id;

/** 검수 3단 — 정의서 EXP-03-1~3 */
export const reviewChecks = [
  {
    id: "content",
    label: "1차 내용",
    desc: "교과 정확성 · 발문 명료성 · 정답 유일성 · 학년 이독성",
  },
  { id: "tagging", label: "2차 태깅", desc: "이중태그와 S위계가 문항이 실제로 재는 것과 맞는가" },
  { id: "ethics", label: "3차 윤리·편향", desc: "성·지역·문화·SES 편향, 아동 정서 적합성" },
] as const;

export type ReviewCheckId = (typeof reviewChecks)[number]["id"];

/**
 * 3단마다 자주 나오는 소견 — 번호로 고른다.
 *
 * 소견을 서술로만 받으면 두 가지가 깨진다. 하나는 사람마다 다르게 적어서 같은
 * 지적이 「정답이 두 개」·「답이 둘로 읽힘」·「복수정답」으로 흩어지고, 나중에
 * 「무엇 때문에 많이 걸리는가」를 셀 수 없게 된다. 다른 하나는 바빠지면 아무도
 * 안 적어서 결국 통과 여부만 남는다 — 예전에 체크상자만 켜던 때로 돌아간다.
 *
 * 그래서 고르는 칸을 앞에 두고 서술은 뒤에 선택으로 둔다. 하나만 고르게 하는
 * 것은 「가장 큰 이유」를 대게 하려는 것이다. 나머지는 아래 서술에 적는다.
 *
 * 통과와 걸림의 목록이 다르다. 통과에도 목록을 두는 것은, 무엇을 보고 통과시킨
 * 것인지가 남아야 재검수하는 사람이 같은 곳을 두 번 읽지 않기 때문이다.
 */
export type CheckReason = { id: string; text: string };

export const checkReasons: Record<ReviewCheckId, { pass: CheckReason[]; block: CheckReason[] }> = {
  content: {
    pass: [
      { id: "c-p-fact", text: "교과 내용이 정확하고 근거가 지문 안에 있습니다" },
      { id: "c-p-one", text: "정답이 하나로만 성립합니다" },
      { id: "c-p-clear", text: "발문이 한 가지로만 읽힙니다" },
      { id: "c-p-grade", text: "학년 어휘와 문장 길이가 무리 없습니다" },
      { id: "c-p-explain", text: "해설이 답만이 아니라 까닭까지 짚습니다" },
      { id: "c-p-fixed", text: "지난 회차에 걸렸던 곳이 고쳐졌습니다" },
    ],
    block: [
      { id: "c-b-fact", text: "교과 내용에 사실 오류가 있습니다" },
      { id: "c-b-multi", text: "정답이 둘 이상 성립합니다" },
      { id: "c-b-vague", text: "발문이 두 가지로 읽힙니다" },
      { id: "c-b-distractor", text: "오답 보기가 답이 될 수 없을 만큼 뻔하거나 의도가 겹칩니다" },
      { id: "c-b-grade", text: "학년에 비해 어휘·문장이 어렵습니다" },
      { id: "c-b-explain", text: "해설이 답만 말하고 까닭을 말하지 않습니다" },
    ],
  },
  tagging: {
    pass: [
      { id: "t-p-standard", text: "성취기준이 문항이 실제로 묻는 것과 맞습니다" },
      { id: "t-p-talent", text: "재능 축과 세부 기능이 문항이 재는 능력과 맞습니다" },
      { id: "t-p-level", text: "S단계가 요구하는 조작 수준과 발문이 맞습니다" },
      { id: "t-p-spec", text: "형식·배점·b모수가 단계 명세대로입니다" },
      { id: "t-p-band", text: "학년군이 지문과 보기 수준에 맞습니다" },
      { id: "t-p-single", text: "두 축이 겹치지 않고 하나로 읽힙니다" },
    ],
    block: [
      { id: "t-b-standard", text: "성취기준이 문항이 실제로 묻는 것과 다릅니다" },
      { id: "t-b-talent", text: "재능 축이 문항이 재는 능력과 다릅니다" },
      { id: "t-b-subskill", text: "세부 기능이 더 맞는 것으로 따로 있습니다" },
      { id: "t-b-level", text: "S단계가 발문의 조작 수준과 어긋납니다" },
      { id: "t-b-spec", text: "형식·배점·b모수가 단계 명세와 다릅니다" },
      { id: "t-b-mixed", text: "한 문항이 두 축을 같이 재고 있어 점수 해석이 안 됩니다" },
    ],
  },
  ethics: {
    pass: [
      { id: "e-p-ses", text: "가정 형편이 있어야 풀리는 소재가 없습니다" },
      { id: "e-p-gender", text: "성 역할을 고정하는 표현이 없습니다" },
      { id: "e-p-region", text: "특정 지역·문화의 경험을 전제하지 않습니다" },
      { id: "e-p-emotion", text: "아동 정서에 부담이 되는 소재가 없습니다" },
      { id: "e-p-label", text: "아이를 규정하지 않고 수행만 묻습니다" },
      { id: "e-p-belief", text: "특정 종교·정치색이 드러나지 않습니다" },
    ],
    block: [
      { id: "e-b-ses", text: "가정 형편(SES)이 드러나거나 있어야 풀리는 소재입니다" },
      { id: "e-b-gender", text: "성 역할을 고정하는 표현이 있습니다" },
      { id: "e-b-region", text: "특정 지역·문화의 경험이 있어야 풀립니다" },
      { id: "e-b-emotion", text: "아동 정서에 부담이 될 수 있는 소재입니다" },
      { id: "e-b-label", text: "아이의 특성을 규정하는 표현이 있습니다" },
      { id: "e-b-belief", text: "특정 종교·정치색이 드러납니다" },
    ],
  },
};

/** 고른 소견을 글로 되돌린다. 통과와 걸림의 목록이 다르므로 ok가 있어야 찾을 수 있다. */
export function reasonText(id: ReviewCheckId, ok: boolean | null, reason?: string) {
  if (!reason || ok === null) return "";
  const list = ok ? checkReasons[id].pass : checkReasons[id].block;
  return list.find((r) => r.id === reason)?.text ?? "";
}

/**
 * 3단 각각의 결과와 소견.
 *
 * 예전에는 체크상자를 셋 다 켰는지만 보고 승인 버튼을 열어 주고, 무엇을 보고
 * 통과시켰는지는 어디에도 남기지 않았다. 그러면 반려된 문항이 다시 올라왔을 때
 * 다음 검수자가 지난번에 무엇이 걸렸는지 알 길이 없다. 칸마다 소견을 받아 둔다.
 */
export type ReviewCheckResult = {
  id: ReviewCheckId;
  /** null이면 아직 짚지 않았다. 「걸림」과 「안 봄」은 다른 상태다. */
  ok: boolean | null;
  /**
   * 고른 소견의 id. 통과·걸림 목록이 달라서 ok를 뒤집으면 뜻이 달라지므로,
   * 통과↔걸림을 바꿀 때 반드시 비운다.
   */
  reason?: string;
  note: string;
};

export type ReviewVerdict = "approve" | "reject";

/** 끝난 검수 한 건 */
export type ReviewRecord = {
  at: string;
  by: string;
  /** 몇 회차 검수인가. 반려된 문항이 다시 올라오면 2회차가 된다. */
  round: number;
  verdict: ReviewVerdict;
  checks: ReviewCheckResult[];
  code?: RejectCode;
  text: string;
  /** 기계가 낸 결론인가. 사람 이름과 섞이면 누가 본 것인지 알 수 없어진다. */
  machine?: boolean;
  /** 자기가 쓴 문항을 자기가 본 것인가 (슈퍼 관리자만 가능) */
  self?: boolean;
};

/**
 * 쓰다 만 검수.
 *
 * 검수는 문항 하나에 몇 분씩 걸리고 중간에 다른 문항을 열어 볼 일이 생긴다.
 * 목록으로 나갔다 돌아왔을 때 체크와 소견이 날아가 있으면 처음부터 다시 읽어야
 * 한다. 출제 쪽이 임시저장을 하는 것과 같은 이유다.
 */
export type ReviewDraft = {
  by: string;
  checks: ReviewCheckResult[];
  code?: RejectCode;
  text: string;
  updatedAt: string;
};

/** 아직 아무것도 안 짚은 3단 */
export const blankChecks = (): ReviewCheckResult[] =>
  reviewChecks.map((c) => ({ id: c.id, ok: null, note: "" }));

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
    distractorIntent: [
      "24-6=18을 다시 나눈 혼동",
      "",
      "몫과 나머지 혼동",
      "제수를 몫으로 읽는 혼동",
    ],
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
    anchor: false,
    level: "S1",
    author: "author.kim",
    authorName: "김출제",
    state: "approved",
    correctRate: 88,
    disclosed: true,
    reviews: [
      {
        at: "2026-08-09 11:30",
        by: "이검수",
        round: 1,
        verdict: "approve",
        checks: [
          { id: "content", ok: true, reason: "c-p-one", note: "" },
          { id: "tagging", ok: true, reason: "t-p-standard", note: "" },
          { id: "ethics", ok: true, reason: "e-p-ses", note: "" },
        ],
        text: "정답 유일성과 학년 이독성 모두 문제 없습니다. 승인합니다.",
      },
    ],
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
    distractorIntent: [
      "상하위어를 반대말로 보는 혼동",
      "",
      "나열을 관계로 보는 혼동",
      "상하위어를 반대말로 보는 혼동",
    ],
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
    correctRate: 41,
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
    correctRate: 95,
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
    correctRate: 62,
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
    correctRate: 73,
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
    state: "retired",
    correctRate: 96,
    reviews: [
      {
        at: "2026-06-18 16:20",
        by: "이검수",
        round: 1,
        verdict: "approve",
        checks: [
          { id: "content", ok: true, reason: "c-p-clear", note: "" },
          { id: "tagging", ok: true, reason: "t-p-level", note: "" },
          {
            id: "ethics",
            ok: true,
            reason: "e-p-label",
            note: "그림마다 대체 텍스트가 붙어 있어 색을 못 보아도 등분을 셀 수 있습니다.",
          },
        ],
        text: "S1 지각 단계에 맞고 그림 구별이 색에만 기대지 않습니다. 승인합니다.",
      },
    ],
    retiredAt: "2026-07-30 14:05",
    retiredBy: "송준영",
    retireReason: "26A 회차 정답률 96% — 변별이 되지 않아 회차에서 뺍니다. 문항 자체에 오류는 없습니다.",
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
  {
    id: "IT-2612",
    code: "4K02-S1-002",
    subject: "국어",
    grade: "초등 3~4학년군",
    band: "3-4",
    unit: "낱말의 의미 관계",
    unitNo: "02",
    standardCode: "[4국04-02]",
    standardText: "낱말과 낱말의 의미 관계를 파악한다.",
    tagADetail: "비슷한 말 짝 식별",
    talent: "LANG",
    subskill: "LANG-01",
    passage: "",
    stem: "다음 중 두 낱말의 뜻이 서로 비슷한 것은?",
    choices: ["춥다 — 덥다", "고치다 — 수리하다", "책상 — 의자", "달리다 — 걷다"],
    distractorIntent: [
      "반대말을 비슷한 말로 보는 혼동",
      "",
      "같이 쓰이는 낱말을 비슷한 말로 보는 혼동",
      "같은 무리의 낱말을 비슷한 말로 보는 혼동",
    ],
    answer: 1,
    explain: "정답 ②. '고치다'와 '수리하다'는 바꾸어 써도 뜻이 통합니다. ①은 반대말, ③④는 뜻이 다릅니다.",
    guidance:
      "바꾸어 써도 뜻이 통하는지만 봅니다. 문장 속 쓰임의 차이를 묻기 시작하면 S2로 이탈합니다.",
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
    correctRate: 72,
    comments: [],
    updatedAt: "2026-08-08 10:10",
  },
  {
    id: "IT-2613",
    code: "4K02-S2-002",
    subject: "국어",
    grade: "초등 3~4학년군",
    band: "3-4",
    unit: "낱말의 의미 관계",
    unitNo: "02",
    standardCode: "[4국04-02]",
    standardText: "낱말과 낱말의 의미 관계를 파악한다.",
    tagADetail: "관계가 다른 까닭 판별",
    talent: "LANG",
    subskill: "LANG-01",
    passage: "",
    stem: "'과일 — 사과'와 관계가 같은 짝은 무엇이며, 그렇게 생각한 까닭으로 알맞은 것은?",
    choices: [
      "'옷 — 바지' — 앞의 말이 뒤의 말을 포함하기 때문",
      "'낮 — 밤' — 둘이 짝을 이루기 때문",
      "'가방 — 신발' — 함께 쓰는 물건이기 때문",
      "'먹다 — 마시다' — 둘 다 입으로 하기 때문",
    ],
    distractorIntent: [
      "",
      "포함 관계와 반대 관계를 뒤섞는 오개념",
      "함께 놓이는 것을 관계로 보는 오개념",
      "비슷한 뜻을 포함 관계로 보는 오개념",
    ],
    answer: 0,
    explain:
      "정답 ①. '과일'이 '사과'를 포함하듯 '옷'이 '바지'를 포함합니다. 나머지는 반대·나열·비슷한 말이라 포함이 아닙니다.",
    guidance: "까닭까지 함께 고르게 해 관계의 원리를 확인합니다. 오답지는 흔한 오개념으로만 만듭니다.",
    type: "choice",
    shortAnswers: "",
    rubric: "",
    assets: [],
    version: 1,
    anchor: false,
    level: "S2",
    author: "author.kim",
    authorName: "김출제",
    state: "approved",
    correctRate: 58,
    comments: [],
    updatedAt: "2026-08-08 10:20",
  },
  {
    id: "IT-2614",
    code: "4K03-S2-001",
    subject: "국어",
    grade: "초등 3~4학년군",
    band: "3-4",
    unit: "문단의 짜임",
    unitNo: "03",
    standardCode: "[4국02-01]",
    standardText: "문단과 글의 중심 생각을 파악한다.",
    tagADetail: "중심 문장 판별",
    talent: "LANG",
    subskill: "LANG-02",
    passage:
      "여름에는 물을 자주 마셔야 한다. 날이 더우면 땀이 많이 나서 몸속 물이 빠르게 줄어든다. 물이 모자라면 쉽게 지치고 어지러울 수 있다. 그래서 목이 마르지 않아도 조금씩 자주 마시는 것이 좋다.",
    stem: "이 문단의 중심 문장은 무엇이며, 나머지 문장은 어떤 구실을 합니까?",
    choices: [
      "첫 문장 — 나머지는 그 까닭을 밝힌다",
      "둘째 문장 — 나머지는 예를 든다",
      "셋째 문장 — 나머지는 반대 경우를 든다",
      "마지막 문장 — 나머지는 차례를 알려 준다",
    ],
    distractorIntent: [
      "",
      "설명 문장을 중심 문장으로 보는 오개념",
      "결과 문장을 중심 문장으로 보는 오개념",
      "맺음말을 중심 문장으로 보는 오개념",
    ],
    answer: 0,
    explain: "정답 ①. 첫 문장이 주장이고 나머지 세 문장은 그 까닭을 밝히는 뒷받침 문장입니다.",
    guidance: "지문은 네 문장을 넘기지 않습니다. 중심 문장이 문단 첫머리에만 오지 않도록 회차마다 자리를 바꿉니다.",
    type: "choice",
    shortAnswers: "",
    rubric: "",
    assets: [],
    version: 1,
    anchor: true,
    level: "S2",
    author: "author.han",
    authorName: "한나래",
    state: "approved",
    correctRate: 64,
    comments: [],
    updatedAt: "2026-08-08 10:30",
  },
  {
    id: "IT-2615",
    code: "4K03-S3-001",
    subject: "국어",
    grade: "초등 3~4학년군",
    band: "3-4",
    unit: "문단의 짜임",
    unitNo: "03",
    standardCode: "[4국02-01]",
    standardText: "문단과 글의 중심 생각을 파악한다.",
    tagADetail: "중심 생각 한 문장 산출",
    talent: "LANG",
    subskill: "LANG-03",
    passage:
      "학교 앞 골목은 차가 다니는 길이 좁다. 등교 시간에는 사람과 차가 뒤엉켜 위험하다. 요즘은 아침 시간에만 차를 막고 걸어 다니게 하는 학교가 늘고 있다.",
    stem: "이 글의 중심 생각을 한 문장으로 쓰시오.",
    choices: ["", "", "", ""],
    distractorIntent: [],
    answer: 0,
    explain:
      "'학교 앞 골목이 위험하므로 등교 시간에 차를 막아야 한다'는 뜻이 담기면 정답입니다. 표현은 달라도 됩니다.",
    guidance: "낱말을 그대로 옮겨 적어도 뜻이 맞으면 인정합니다. 맞춤법은 채점하지 않습니다.",
    type: "short",
    shortAnswers:
      "등교 시간에 차를 막아야 한다, 학교 앞 골목이 위험해서 차를 막아야 한다, 아침에 차를 막고 걸어 다니게 해야 한다",
    rubric: "",
    assets: [],
    version: 1,
    anchor: false,
    level: "S3",
    author: "author.han",
    authorName: "한나래",
    state: "approved",
    correctRate: 47,
    comments: [],
    updatedAt: "2026-08-08 10:40",
  },
  {
    id: "IT-2616",
    code: "4K03-S4-001",
    subject: "국어",
    grade: "초등 3~4학년군",
    band: "3-4",
    unit: "문단의 짜임",
    unitNo: "03",
    standardCode: "[4국02-01]",
    standardText: "문단과 글의 중심 생각을 파악한다.",
    tagADetail: "두 글의 관점 비교와 판단",
    talent: "LANG",
    subskill: "LANG-03",
    passage:
      "[가] 쉬는 시간에는 교실에서 조용히 쉬는 것이 좋다. 뛰어놀다 다치는 일이 잦기 때문이다.\n[나] 쉬는 시간에는 밖에 나가 몸을 움직이는 것이 좋다. 앉아만 있으면 다음 시간에 더 졸리기 때문이다.",
    stem: "[가]와 [나] 중 어느 쪽에 더 동의하는지 정하고, 그렇게 생각한 까닭을 두 가지 들어 쓰시오. 반대쪽 글이 든 까닭도 한 가지 짚어 답하시오.",
    choices: ["", "", "", ""],
    distractorIntent: [],
    answer: 0,
    explain:
      "어느 쪽을 골라도 됩니다. 고른 쪽의 까닭 두 가지와 반대쪽 까닭에 대한 응답이 모두 성립하는지를 봅니다.",
    guidance:
      "어느 쪽이 옳은지를 채점하지 않습니다. 아이의 태도가 아니라 근거의 성립만 봅니다(진단 윤리 헌장 7조).",
    type: "essay",
    shortAnswers: "",
    rubric:
      "고른 쪽 밝힘 1점 + 까닭 두 가지 2점(하나면 1점) + 반대쪽 까닭에 대한 응답 1점. 맞춤법·글씨는 감점하지 않습니다.",
    assets: [],
    version: 1,
    anchor: false,
    level: "S4",
    author: "author.han",
    authorName: "한나래",
    state: "approved",
    correctRate: 39,
    comments: [],
    updatedAt: "2026-08-08 10:50",
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
    origin: raw.origin ?? "human",
    reviews: raw.reviews ?? [],
    assets: raw.assets ?? [],
    correctRate: raw.correctRate ?? null,
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

/* ───────────────────────── AI 문항 생성 (EXP-02-2) ─────────────────────────
 *
 * 지문·발문·보기·정답·해설·채점 기준까지 갖춘 문항을 만든다.
 *
 * 처음에는 뼈대만 내고 보기와 정답은 사람이 채우게 했는데, 실제로 써 보니
 * 「초안을 받아서 고친다」가 아니라 「빈칸을 처음부터 채운다」가 되어 AI를 부를
 * 이유가 없었다. 출제자가 하는 일은 빈칸 채우기가 아니라 나온 문항을 읽고 고치거나
 * 버리는 판단이다. 그 판단을 하려면 완성된 문항이 있어야 한다.
 *
 * 대신 두 가지를 지킨다.
 *
 *  1) 상태는 draft로 들어간다. 만들자마자 검수로 넘기는 길은 없다. 출제자가 열어
 *     보고 제출 전 체크리스트(§9)를 직접 짚어야 제출 칸이 열린다 — 「사람이 한 번도
 *     안 읽은 문항」이 검수 목록에 쌓이는 것을 여기서 막는다.
 *  2) origin에 ai를 남긴다. 검수자가 AI 산출물인 줄 알고 봐야 한다.
 *
 * 문항 자체는 lib/itemBank.ts에 미리 써 둔 본에서 꺼낸다. 실제 서비스라면 그 자리에
 * 생성 모델 호출이 들어간다. 화면 설계 단계에서 「그럴듯하지만 답이 두 개인 문항」을
 * 흘리면 검수 화면을 시험해 볼 수가 없어서, 답이 하나로 떨어지는 문항만 담았다.
 *
 * ⚠ 재능 축(Tag B)은 생성 화면에서 사람이 고른 값을 그대로 붙인다. 고른 축과 나온
 *   문항이 실제로 재는 것이 어긋날 수 있고, 그것을 잡는 자리가 검수 2차 태깅이다.
 *   생성된 문항의 유의사항에도 그렇게 적어 둔다.
 */

export type GenerateSpec = {
  subject: ItemDraft["subject"];
  band: GradeBand;
  talent: TalentId;
  subskill: string;
  unit: string;
  unitNo: string;
  standardCode: string;
  /** 단계별 몇 문항을 뽑을지 */
  counts: Record<Level, number>;
  /** 소재·주의사항 지시문 */
  brief: string;
};

/** 한 번에 뽑을 수 있는 최대 — 초안이 스물을 넘으면 사람이 손볼 수 없다 */
export const GENERATE_MAX = 20;

export const countOf = (counts: Record<Level, number>) =>
  (Object.values(counts) as number[]).reduce((s, n) => s + (n || 0), 0);

/** 생성 전에 걸러야 할 것 — 화면과 저장소가 같은 규칙을 본다 */
export function checkSpec(spec: GenerateSpec): string[] {
  const bad: string[] = [];
  const total = countOf(spec.counts);

  if (total === 0) bad.push("생성할 문항 수를 한 단계 이상 적어 주세요.");
  if (total > GENERATE_MAX) bad.push(`한 번에 ${GENERATE_MAX}문항까지 뽑을 수 있습니다.`);
  if (!spec.unit.trim()) bad.push("단원 이름을 적어 주세요.");
  if (!/\d/.test(spec.unitNo)) bad.push("단원 번호를 숫자로 적어 주세요. 문항 ID에 들어갑니다.");

  const code = checkStandardCode(spec.standardCode, spec.band);
  if (!code.ok) bad.push(code.why);

  /* 재능 축마다 다룰 수 있는 단계가 다르다 — 자기-성찰은 S4가 없다 */
  for (const level of LEVELS_ALL) {
    if ((spec.counts[level] ?? 0) > 0 && !levelAllowed(spec.talent, level)) {
      bad.push(`${spec.talent} 축은 ${level} 문항을 만들 수 없습니다.`);
    }
  }
  return bad;
}

const LEVELS_ALL: Level[] = ["S1", "S2", "S3", "S4"];

/**
 * 문항을 만들어 저장소 맨 앞에 넣는다.
 *
 * 전부 draft 상태로 들어간다. 만들자마자 검수로 넘기는 길은 두지 않는다 —
 * 그 길이 있으면 사람이 한 번도 안 읽은 문항이 검수 목록에 쌓인다.
 */
export function generateItems(spec: GenerateSpec, author: string, authorName: string): ItemDraft[] {
  const list = read();
  const made: ItemDraft[] = [];

  let serial = list.filter((i) => i.subject === spec.subject).length;

  for (const level of LEVELS_ALL) {
    const n = spec.counts[level] ?? 0;
    for (let k = 0; k < n; k += 1) {
      serial += 1;
      const s = levelSpecs[level];
      const type = typeForLevel[level];
      const sample = pickSample(spec.subject, level, k);

      const item = fill({
        id: `IT-AI-${Date.now().toString(36).toUpperCase()}-${serial}`,
        code: makeItemCode(spec.band, spec.subject, spec.unitNo, level, serial),
        subject: spec.subject,
        band: spec.band,
        grade: spec.band === "3-4" ? "초등 3~4학년군" : "초등 5~6학년군",
        passage: sample.passage ?? "",
        stem: sample.stem,
        choices: sample.choices ?? ["", "", "", ""],
        answer: sample.answer ?? 0,
        explain: sample.explain,
        type,
        shortAnswers: sample.shortAnswers ?? "",
        rubric: sample.rubric ?? "",
        assets: [],
        version: 1,
        unit: spec.unit.trim(),
        unitNo: spec.unitNo.trim(),
        standardCode: spec.standardCode.trim(),
        standardText: sample.standardText,
        tagADetail: sample.tagADetail,
        talent: spec.talent,
        subskill: spec.subskill,
        points: s.points,
        b: s.b,
        anchor: false,
        /* 출제자가 열었을 때 무엇부터 봐야 하는지. 태깅을 먼저 적는 것은, 축은
           사람이 고르고 문항은 본에서 나오므로 둘이 어긋날 수 있는 자리라서다. */
        guidance: [
          "AI가 만든 문항입니다. 그대로 두지 말고 아래를 확인하고 고쳐 주세요.",
          `· 태깅 — 고른 축(${spec.talent} · ${spec.subskill})이 이 문항이 실제로 재는 것과 맞는가`,
          `· 성취기준 — ${spec.standardCode.trim()}의 내용과 아래 성취기준 내용이 맞는가`,
          `· 단계 — ${s.rule}`,
          `· 금지 — ${s.deny}`,
          n > 1 ? `· 이 단계 ${n}개 중 ${k + 1}번째. 소재가 서로 겹치지 않는지 볼 것` : "",
          spec.brief.trim() ? `· 출제 지시 — ${spec.brief.trim()}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        distractorIntent: sample.distractorIntent ?? [],
        level,
        author,
        authorName,
        state: "draft",
        origin: "ai",
        aiBrief: spec.brief.trim(),
        comments: [],
        reviews: [],
        updatedAt: now(),
      });

      made.push({ ...item, ...syncTags(item) });
    }
  }

  write([...made, ...list]);
  return made;
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

/* ───────────────────────── 검수 ───────────────────────── */

/** 승인할 때 남기는 소견문 — 사람 검수자가 쓰는 것과 같은 자리에 들어간다 */
const APPROVE_TEXT =
  "AI 검수에서 3단을 모두 대조했고 걸린 것이 없어 승인합니다.\n" +
  "· 1차 내용 — 정답 유일성, 보기 중복, 정답 길이 단서\n" +
  "· 2차 태깅 — 단계·형식 매핑, 성취기준 코드, 재능 좌표\n" +
  "· 3차 윤리·편향 — 특정 계층·지역·성별을 가리키는 표현\n" +
  "규칙으로 대조할 수 있는 범위에서 본 결론입니다. 승인 뒤에도 사람이 사용 중지로 되돌릴 수 있습니다.";

/**
 * AI 검수를 돌린다 (EXP-03-2).
 *
 * AI는 사전 점검이 아니라 **검수자**다. 사람 검수자와 같은 자리에 같은 형식으로
 * 결론을 쌓는다 — 3단 소견, 사유 코드, 소견문. 결론은 셋 중 하나다.
 *
 *   승인  걸린 것이 하나도 없다. 문항 은행으로 올라간다.
 *   보류  규칙으로는 가릴 수 없는 것(warns)이 남았다. 짚어만 두고 사람에게 넘긴다.
 *   반려  규칙을 그대로 어겼다(blocks). 사유 코드와 고칠 곳을 적어 되돌린다.
 *
 * ⚠ 승인은 **규칙으로 대조할 수 있는 범위 안에서의 결론**이다. 교과 내용이 실제로
 *   맞는지와 이 학년 아이가 읽을 수 있는지는 규칙으로 가려지지 않는다. 그래서
 *   확인이 필요한 것이 하나라도 남으면 승인하지 않고 사람에게 넘기고, 승인한 것도
 *   검수 기록에 「AI 검수」로 남겨 누가 통과시킨 문항인지 뒤에서 셀 수 있게 한다.
 *
 * 검수 대기가 아닌 문항은 건너뛴다. 이미 결론이 난 것에 소견을 덧붙이면 기록이
 * 어느 시점의 것인지 알 수 없어진다.
 */
export function runAiAudit(ids: string[]): {
  done: number;
  approved: number;
  held: number;
  rejected: number;
} {
  const at = now();
  let done = 0;
  let approved = 0;
  let rejected = 0;

  const next = read().map((item) => {
    if (!ids.includes(item.id) || item.state !== "submitted") return item;
    const result = auditItem(item);
    const rejection = auditRejection(result);
    const verdict: AiVerdict = rejection ? "reject" : result.warns > 0 ? "hold" : "approve";
    done += 1;

    const audit: AiAudit = {
      at,
      checks: result.checks.map((c) => ({
        id: c.id,
        ok: c.ok,
        notes: c.findings.map(
          (f) => `${f.tone === "block" ? "[규칙 위반] " : "[확인 필요] "}${f.text} → ${f.fix}`,
        ),
      })),
      blocks: result.blocks,
      warns: result.warns,
      verdict,
      code: rejection?.code,
      text: rejection ? rejection.text : verdict === "approve" ? APPROVE_TEXT : undefined,
    };

    /* 보류 — 상태를 건드리지 않는다. 규칙 밖의 일이 남았다는 것을 짚어만 두고,
       결론은 이 문항을 열어 보는 사람이 낸다. */
    if (verdict === "hold") return { ...item, aiAudit: audit };

    /* 3단 소견. 반려는 걸린 칸만 「걸림」으로 두고 나머지는 확인 안 함(null)으로
       남긴다 — 한 칸이 걸려 되돌리는 것이라 나머지를 본 것은 아니다. 승인은 셋 다
       「통과」로 채운다. 결론을 낸 것이므로 통과라고 적지 않으면 그 기록으로는
       무엇을 보고 승인했는지 알 수 없다. */
    const checks: ReviewCheckResult[] = result.checks.map((c) => {
      const blocked = c.findings.filter((f) => f.tone === "block");
      return {
        id: c.id,
        ok: verdict === "approve" ? true : blocked.length > 0 ? false : null,
        reason: blocked.find((f) => f.reason)?.reason,
        note: c.findings.map((f) => f.text).join("\n"),
      };
    });

    const text = rejection ? rejection.text : APPROVE_TEXT;
    if (rejection) rejected += 1;
    else approved += 1;

    return {
      ...item,
      state: (rejection ? "rejected" : "approved") as ItemState,
      updatedAt: at,
      aiAudit: audit,
      reviews: [
        ...item.reviews,
        {
          at,
          by: AI_REVIEWER,
          round: item.reviews.length + 1,
          verdict: (rejection ? "reject" : "approve") as ReviewVerdict,
          checks,
          code: rejection?.code,
          text,
          machine: true,
        },
      ],
      reviewDraft: undefined,
      comments: [
        ...item.comments,
        {
          at,
          by: AI_REVIEWER,
          role: "ai" as const,
          kind: (rejection ? "reject" : "approve") as CommentKind,
          code: rejection?.code,
          text,
        },
      ],
    };
  });

  write(next);
  return { done, approved, held: done - approved - rejected, rejected };
}

/** 쓰다 만 검수를 문항에 붙여 둔다. 결론이 나기 전까지 상태는 그대로다. */
export function saveReviewDraft(id: string, draft: Omit<ReviewDraft, "updatedAt">) {
  patchItem(id, { reviewDraft: { ...draft, updatedAt: now() } });
}

export function clearReviewDraft(id: string) {
  patchItem(id, { reviewDraft: undefined });
}

/** 반려 — 사유 코드와 코멘트가 붙어 출제자의 반려함으로 돌아간다 */
export function rejectItem(
  id: string,
  by: string,
  code: RejectCode,
  text: string,
  checks: ReviewCheckResult[] = blankChecks(),
  /** 본인이 출제한 문항을 본인이 본 경우 — 슈퍼 관리자만 열려 있고 기록에 남는다 */
  self = false,
) {
  const item = read().find((i) => i.id === id);
  if (!item) return;
  const at = now();
  patchItem(id, {
    state: "rejected",
    reviews: [
      ...item.reviews,
      { at, by, round: item.reviews.length + 1, verdict: "reject", checks, code, text, self },
    ],
    reviewDraft: undefined,
    comments: [...item.comments, { at, by, role: "reviewer", kind: "reject", code, text }],
  });
}

/** 승인 — 문항 은행에 올라가 검사지 조립 대상이 된다 */
export function approveItem(
  id: string,
  by: string,
  text: string,
  checks: ReviewCheckResult[] = blankChecks(),
  /** 본인이 출제한 문항을 본인이 본 경우 — 슈퍼 관리자만 열려 있고 기록에 남는다 */
  self = false,
) {
  const item = read().find((i) => i.id === id);
  if (!item) return;
  const at = now();
  patchItem(id, {
    state: "approved",
    reviews: [
      ...item.reviews,
      { at, by, round: item.reviews.length + 1, verdict: "approve", checks, text, self },
    ],
    reviewDraft: undefined,
    comments: [...item.comments, { at, by, role: "reviewer", kind: "approve", text }],
  });
}

/**
 * 제출한 지 며칠 지났는가.
 *
 * ⚠ 오늘 날짜를 읽으므로 서버와 브라우저에서 값이 갈린다. 반드시 하이드레이션이
 *   끝난 뒤에만 부른다(useHydrated).
 */
/**
 * 앵커로 삼거나 뺀다.
 *
 * 확정된(승인) 문항만 앵커가 된다. 아직 검수를 안 지난 문항을 등화 기준으로 삼으면
 * 그 회차의 잣대 자체가 검증되지 않은 것이 된다. 공개된 적이 있는 문항도 안 된다.
 */
export function setAnchor(
  id: string,
  on: boolean,
  by: string,
  role: StaffRoleId,
  reason: string,
) {
  const item = read().find((i) => i.id === id);
  if (!item) return null;
  if (on && (item.state !== "approved" || item.disclosed)) return null;
  patchItem(id, {
    anchor: on,
    comments: [
      ...item.comments,
      { at: now(), by, role, kind: "note", text: `${on ? "앵커 지정" : "앵커 해제"} — ${reason}` },
    ],
  });
  return item;
}

/**
 * 승인된 문항을 회차에서 뺀다.
 *
 * 지우지 않는다. 상태만 바꾸고 까닭을 남긴다 — 이 문항으로 이미 판정한 결과가
 * 있는데 문항이 사라지면 그 판정을 설명할 길이 없어진다. 되돌릴 수도 있어야 해서
 * 까닭을 코멘트로도 남겨 둔다.
 */
export function retireItem(id: string, by: string, role: StaffRoleId, reason: string) {
  const item = read().find((i) => i.id === id);
  if (!item || item.state !== "approved") return null;
  patchItem(id, {
    state: "retired",
    retiredAt: now(),
    retiredBy: by,
    retireReason: reason,
    comments: [...item.comments, { at: now(), by, role, kind: "note", text: `사용 중지 — ${reason}` }],
  });
  return item;
}

/** 사용 중지한 문항을 다시 쓴다 */
export function restoreItem(id: string, by: string, role: StaffRoleId, reason: string) {
  const item = read().find((i) => i.id === id);
  if (!item || item.state !== "retired") return null;
  patchItem(id, {
    state: "approved",
    retiredAt: undefined,
    retiredBy: undefined,
    retireReason: undefined,
    comments: [...item.comments, { at: now(), by, role, kind: "note", text: `다시 씀 — ${reason}` }],
  });
  return item;
}

export function daysWaiting(item: ItemDraft) {
  const submitted = Date.parse(item.updatedAt.slice(0, 10));
  if (Number.isNaN(submitted)) return 0;
  const today = new Date();
  const midnight = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(0, Math.round((midnight - submitted) / 86_400_000));
}

/** 파일 붙이기 — 상한을 넘으면 받지 않는다 */
export function attachAsset(id: string, asset: ItemAsset) {
  const item = read().find((i) => i.id === id);
  if (!item) return;
  patchItem(id, { assets: [...item.assets, asset] });
}

/** 붙임 파일 한 건 고치기 — 지금은 대체 텍스트만 고칠 일이 있다 */
export function patchAsset(id: string, assetId: string, patch: Partial<ItemAsset>) {
  const item = read().find((i) => i.id === id);
  if (!item) return;
  patchItem(id, {
    assets: item.assets.map((x) => (x.id === assetId ? { ...x, ...patch } : x)),
  });
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
    const bad = i.choices.some(
      (c, n) => c.trim() && n !== i.answer && !i.distractorIntent[n]?.trim(),
    );
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
  retired: "사용 중지",
};

export const stateTone: Record<ItemState, string> = {
  draft: "text-exam-muted",
  submitted: "text-brand-700",
  rejected: "text-rose-700",
  approved: "text-emerald-700",
  retired: "text-exam-muted",
};
