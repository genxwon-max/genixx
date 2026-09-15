"use client";

import { useSyncExternalStore } from "react";
import type { StaffRoleId } from "./admin";
import {
  LEVELS,
  checkStandardCode,
  levelAllowed,
  levelSpecs,
  SUBJECT_LETTER,
  submitChecklist,
  subskillsOf,
  tagBCoord,
  type GradeBand,
  type Level,
  type TalentId,
} from "./blueprint";
import { pickSample } from "./itemBank";
import type { DetailMode } from "./richText";
import { auditItem, auditRejection } from "./itemAudit";

/**
 * 문항 초안 저장소 — 출제 워크벤치(EXP-02)와 검수 워크벤치(EXP-03)가 함께 쓴다.
 *
 * ── 이름 ──
 * **문항**(Question)은 분류를 지고 채점되는 낱개다. 성취기준·재능 축·인지단계·난이도가
 * 여기 붙는다. **묶음**(ItemDraft)은 그 문항들을 담는 그릇이고, 단일이면 문항 하나,
 * 세트면 보기 하나에 문항 둘 이상을 담는다. 저장소·목록·주소가 다루는 낱개는 묶음이라
 * (IT-2601), 화면에서 「문항 은행」·「문항 상세」라고 부르는 것도 묶음 쪽이다.
 * 아래 주석에서 둘을 갈라야 할 때는 「묶음」이라고 적는다.
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
 * 문항 유형. 채점 방식이 갈리므로 문항을 쓸 때 가장 먼저 정한다.
 *  · 객관식 — 보기 중 하나. AI가 전수 채점한다.
 *  · OX — 맞다·아니다 둘 중 하나. 객관식의 보기가 둘로 고정된 꼴이다.
 *  · 단답형 — 짧은 답. 표기 흔들림을 허용 답안으로 흡수한다.
 *  · 서술형 — 몇 문장. AI 1차 채점 뒤 저신뢰 건을 사람이 본다(EXP-04-2).
 *  · 논술형 — 한 편의 글. 루브릭으로 사람이 채점하고 이중 채점 표본을 둔다.
 *  · 이미지 첨부 — 답을 그림·사진으로 올린다. 손으로 그리고 찍어 올리는 문항이다.
 */
export type ItemType = "choice" | "ox" | "short" | "descriptive" | "essay" | "image";

/* 무엇을 쓰는 유형인지는 위 주석에 적어 두었다. 목록에는 이름만 세운다 — 여섯 개를
   나란히 놓으면 이름이 곧 뜻이고, 줄마다 풀어 쓴 말은 고르는 데 보태는 것이 없었다.
   scoring은 옛 콘솔(components/admin/ItemCard.tsx)의 고르개가 아직 적는다. */
export const itemTypes: {
  id: ItemType;
  label: string;
  /** 문항 ID의 유형 자리에 들어가는 한 글자 (codePrefix) */
  letter: string;
  scoring: string;
}[] = [
  { id: "choice", label: "객관식", letter: "C", scoring: "AI 전수 채점" },
  { id: "ox", label: "OX", letter: "O", scoring: "AI 전수 채점" },
  {
    id: "short",
    label: "단답형",
    letter: "A",
    scoring: "허용 답안 대조 후 불일치만 사람이 확인",
  },
  {
    id: "descriptive",
    label: "서술형",
    letter: "D",
    scoring: "AI 1차 채점 → 신뢰도 0.75 미만은 사람 배정",
  },
  {
    id: "essay",
    label: "논술형",
    letter: "E",
    scoring: "루브릭 기반 사람 채점 + 이중 채점 표본",
  },
  { id: "image", label: "이미지 첨부", letter: "I", scoring: "루브릭 기반 사람 채점" },
];

export const typeLabel = (id: ItemType) => itemTypes.find((t) => t.id === id)?.label ?? id;

/**
 * OX의 보기는 고정이다. 출제자가 「맞다」·「아니다」를 매번 타이핑할 이유가 없다.
 *
 * ⚠ 이 값을 문항(Question.choices)에 **담지 않는다**. 담아 두면 유형을 OX로 옮길 때
 *   적어 둔 보기를 덮어써야 하고, 라디오 묶음은 방향키로 지나가기만 해도 그 덮어쓰기가
 *   돈다 — 서술형을 고르려고 OX를 통과하는 것만으로 보기 넉 줄이 날아갔다.
 *   보기는 그대로 두고, 화면과 채점이 볼 때만 choicesOf가 갈아 끼운다.
 */
export const OX_CHOICES = ["맞다", "아니다"];

/**
 * 새 객관식이 처음 세우는 보기 수 — 5지 선다.
 *
 * 한동안 넉 칸으로 시작했는데, 이 평가의 객관식은 5지 선다라 새 문항마다 「보기 추가」를 한 번씩
 * 눌러야 했다. 이미 쓴 문항의 보기 수는 건드리지 않는다 — 넷으로 쓴 문항에 빈 다섯째 칸을
 * 붙이면 그 문항이 「보기를 덜 쓴 문항」이 된다.
 *
 * 오답 설계 의도는 따로 맞추지 않는다. 그 줄은 보기 수를 따라 선다(QuestionEditor).
 *
 * ⚠ function으로 둔다. 아래 SEED가 fill을 부르는 때에는 이 파일 아래쪽 const가 아직 서지 않는다.
 */
export const CHOICE_COUNT = 5;
export function blankChoices(): string[] {
  return Array.from({ length: CHOICE_COUNT }, () => "");
}

/**
 * 이 문항가 실제로 세우는 보기.
 *
 * OX는 유형이 보기를 정하므로 문항에 담긴 값을 보지 않는다. 객관식으로 되돌아오면
 * 적어 둔 보기가 손대지 않은 채로 다시 선다.
 */
export function choicesOf(q: Pick<Question, "type" | "choices">): string[] {
  return q.type === "ox" ? OX_CHOICES : q.choices;
}

/** 보기를 세우는 유형인가 */
export const hasChoices = (t: ItemType) => t === "choice" || t === "ox";

/** 채점 루브릭이 있어야 하는 유형인가 — 사람이 채점하는 것들 */
export const needsRubric = (t: ItemType) => t === "descriptive" || t === "essay" || t === "image";

/**
 * 묶음 구성 — 단일이냐 세트냐.
 *
 * 세트는 자료 하나를 함께 읽고 그 위에서 두 문항 이상을 묻는 꼴이다. 재능 진단에서
 * 이 구성이 필요한 까닭은, 한 문항으로는 S1(지각)만 재고 끝나는 자료가 문항을 겹쳐
 * 물으면 S1 → S3까지 한 자료 안에서 올라갈 수 있기 때문이다. 자료를 두 번 읽히지
 * 않으므로 아이가 지문 읽기에 쓰는 시간도 준다.
 *
 * ⚠ 세트라도 회차 편성판이 담는 낱개는 **묶음 하나**다. 배점은 안의 문항마다 매기되
 *   묶음 쪽에는 그 합이 선다(summaryOf) — 합이 아니면 검사지 총점이 세트마다 어긋난다.
 */
export type ItemForm = "single" | "set";

/* 단일은 문항 하나(지문은 있어도 되고 없어도 된다), 세트는 보기 하나에 문항 둘 이상.
   화면에는 이름 둘만 세운다 — 두 낱말이 스스로 설명하는 것에 곁들이는 말을 붙이면
   읽을 것만 늘어난다 */
export const itemForms: { id: ItemForm; label: string }[] = [
  { id: "single", label: "단일" },
  { id: "set", label: "세트" },
];

/**
 * 예상 난이도 b — 넷 중에서 고른다.
 *
 * 아무 수나 받던 칸이었다. 그런데 출제자가 손으로 적은 b는 −0.35처럼 정밀해 보이기만
 * 할 뿐 근거가 없고, 사람마다 같은 문항에 다른 눈금을 매겨 회차 사이에 비교가 되지
 * 않았다. 실제로 물어야 하는 것은 「이 학년에게 쉬운가 어려운가」 넷 중 하나다.
 * 진짜 b는 응시 결과로 다시 추정한다(문항반응이론) — 여기 값은 그 전까지 쓰는 어림이다.
 */
/* 눈금의 뜻 — 그 학년이 맞히는 비율로 잡는다.
     -1.5 거의 다 맞힘 · -1 절반을 넘겨 맞힘 · 1 절반이 안 됨 · 1.5 상위권만 맞힘
   화면에는 이름과 b값만 세운다. 넷을 나란히 놓으면 순서가 곧 뜻이라, 줄마다 풀어 쓴
   말은 고르는 데 보태는 것이 없었다. */
export const difficulties: { b: number; label: string }[] = [
  { b: -1.5, label: "아주 쉬움" },
  { b: -1, label: "쉬움" },
  { b: 1, label: "어려움" },
  { b: 1.5, label: "아주 어려움" },
];

/** 사람이 넷 중에서 고른 값인가 */
export const difficultyPicked = (b: number | null) =>
  b !== null && difficulties.some((d) => d.b === b);

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

/**
 * 문항 하나 — 분류를 지고 채점되는 낱개. 단일 묶음이면 이것 하나뿐이다.
 *
 * 발문을 글 한 칸으로만 받지 않는다. 수학·과학 문항은 그림·수식이 발문 안에 들어가야
 * 말이 되고, 디자이너가 짜 준 표를 그대로 붙여야 하는 문항도 있다. 상품 상세와 같은
 * 네 갈래를 그대로 쓴다(lib/richText.ts) — 한 문항은 한 갈래만 쓰고, 마크다운·HTML
 * 안에서 그림을 넣는 길은 열려 있다.
 */
export type Question = {
  /** 세트 안에서만 유일하면 된다 — 지우고 더해도 순서가 뒤집히지 않게 하는 열쇠 */
  id: string;
  type: ItemType;
  /** 발문 본문. stemMode가 images면 쓰지 않는다 */
  stem: string;
  /** 발문을 무엇으로 쓰는가 — 이미지 · 마크다운 · HTML · 일반 텍스트 */
  stemMode: DetailMode;
  /** stemMode가 images일 때 차례대로 이어 붙일 그림 (data URL) */
  stemImages: string[];
  /** 객관식 보기. OX는 OX_CHOICES로 고정한다 */
  choices: string[];
  /** 정답 보기 index */
  answer: number;
  /** 오답마다 어떤 오개념을 잡는가 — 보기와 같은 순서 */
  distractorIntent: string[];
  /** 단답형 허용 답안 (쉼표로 구분) */
  shortAnswers: string;
  /** 채점 기준의 부분점수 — 서술형 · 논술형 · 이미지 첨부는 반드시, 단답형은 있으면 */
  rubric: string;
  /** 모범답안 — 선택형은 정답과 그 까닭, 나머지는 만점 답안 */
  explain: string;

  /* ── 문항 카드의 나머지 칸 ──────────────────────────────────────────────
   *
   * 출제위원이 검수자에게 건네는 칸들이다. 채점에 쓰는 것(rubric · shortAnswers)과 달리
   * 기계가 읽지 않고, 검수자와 채점위원이 문항을 어떻게 읽었는지 맞추는 데 쓴다.
   */
  /** 인정 예 — 글머리표(·)로 시작하거나 빈 줄로 가른다(exampleCount). 선택형은 적어도 문턱에 걸지 않는다 */
  acceptExamples: string;
  /** 불인정 예 — 인정 예와 같게 가르고 사유를 함께 적는다. 선택형은 적어도 문턱에 걸지 않는다 */
  rejectExamples: string;
  /** ⑫ 재능 평가 관점 — 인지 처리 위계 구체 */
  perspectiveHierarchy: string;
  /** ⑫ 재능 평가 관점 — 인지 능력 관련 수준 */
  perspectiveAbility: string;
  /**
   * 오답 설계 의도를 글로 적은 것 — 보기가 없는 형식(OX · 단답 · 서술 · 논술 · 이미지)의 자리.
   * 객관식은 보기마다 적는 distractorIntent를 쓴다. 미리보기가 그것을 보기 밑에 붙인다.
   */
  wrongIntent: string;
  /** ④ Tag A 출제 의도 — 이 성취기준으로 무엇을 확인하려는가 */
  tagAIntent: string;

  /* ── 분류 (발주서 §3 문항 카드 ③④⑤) ──────────────────────────────────────
   *
   * 세트 안에서도 문항마다 다르다. 한 지문을 놓고 「무엇이라고 했나」(S1)를 묻고 이어서
   * 「왜 그런가」(S3)를 물으면, 두 문항은 재는 것도 성취기준도 난이도도 다르다. 그것이
   * 세트를 두는 까닭이기도 하다 — 자료를 두 번 읽히지 않고 단계를 올린다.
   *
   * 그래서 이 여덟 칸은 묶음이 아니라 **문항**에 붙는다. 묶음 쪽의 같은 이름 칸들은
   * 여기서 만든 요약이다(summaryOf · flatten). 단일이면 문항이 하나뿐이라 요약과
   * 원본이 같은 값이다.
   *
   * 과목·학년군·단원·문항 ID는 여기 없다. 그것은 세트가 통째로 공유하는 것이고,
   * 문항마다 다를 수 있는 값이 아니다.
   */
  /** ③ 성취기준 코드 — 없으면 접수 반려(§7.2) */
  standardCode: string;
  /** ③ 성취기준 내용 */
  standardText: string;
  /** ④ Tag A 학습 요소 — 이 문항이 재는 학력을 교과서 단원 › 차시 › 활동으로 */
  tagADetail: string;
  /** ④ Tag B 주태그 — 재능 */
  talent: TalentId;
  /** ④ Tag B 주태그 — 하위요소 코드 (LANG-01 등) */
  subskill: string;
  /** S1 지각 · S2 이해 · S3 생성 · S4 창의 */
  level: Level;
  /**
   * ⑤ 예상 난이도 b — difficulties 넷 중 하나. null이면 **아직 아무도 안 골랐다**.
   *
   * 한동안 단계 앵커값(levelSpecs[level].b)을 기본값으로 넣어 두고 「그 값이 넷 안에
   * 있으면 고른 것」으로 봤다. 그런데 S1의 앵커가 -1.5, S4가 1.5라 고르개 값과 그대로
   * 겹친다 — 두 단계에서는 아무도 손대지 않은 문항이 「아주 쉬움」·「아주 어려움」을
   * 골라 둔 것으로 읽혔고, 제출을 막는 검사도 조용히 통과했다. 값 하나로 「없음」까지
   * 나타내려 한 것이 잘못이라 형을 나눈다.
   */
  b: number | null;
  /**
   * ⑤ 배점 — 사람이 직접 적는다. 0이면 아직 안 적은 것이다.
   *
   * 한동안 인지단계에서 따라오게 했다(§1 단계별 배점). 이제는 새 문항이 단계의 기본 배점
   * (levelSpecs[level].points)으로 시작할 뿐, 단계를 바꿔도 적어 둔 값을 덮지 않는다.
   */
  points: number;
};

/** 문항에도 있고 문항에도 있는 칸 — 문항 쪽은 요약이다 */
export type QuestionTags = Pick<
  Question,
  "standardCode" | "standardText" | "tagADetail" | "talent" | "subskill" | "level" | "b" | "points"
>;

export type ItemDraft = {
  id: string;
  /** 문항 코드 — 사람이 부르는 이름 */
  code: string;
  subject: "국어" | "수학" | "과학";
  grade: string;
  /** 단일이냐 세트냐 */
  form: ItemForm;
  /** 지문·자료 — 세트에서는 「보기」로, 두 문항 이상이 함께 읽는다 */
  passage: string;
  /** 지문을 무엇으로 쓰는가 (lib/richText.ts) */
  passageMode: DetailMode;
  /** passageMode가 images일 때 차례대로 이어 붙일 그림 */
  passageImages: string[];
  /**
   * 문항들 — 단일이면 하나, 세트면 둘 이상.
   *
   * 아래 납작한 칸(stem · choices · answer · explain …)은 **questions[0]의 거울**이다.
   * 지우지 않고 두는 까닭은 옛 콘솔(components/admin/ItemCard.tsx)과 목록 열두 곳이
   * 아직 그 칸을 직접 읽고 쓰기 때문이다. 두 벌을 손으로 맞추면 반드시 어긋나므로
   * 저장으로 나가는 길목 하나(patchItem)에서만 맞춘다 — syncQuestions 주석 참고.
   */
  questions: Question[];
  /* ── 아래 여덟 칸은 questions[0]의 거울이다. 직접 고치지 말고 questions를 고친다 ── */
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
  /** 단원명 — 교과서 단원 목록(lib/curriculumUnits.ts)에서 고른다 */
  unit: string;
  /** 단원 번호 — 고른 단원이 그 학기 교과서의 몇 단원인가 */
  unitNo: string;
  /**
   * 고른 단원의 학년-학기 (「3-1」). 비어 있으면 목록에서 고르기 전에 손으로 적은 단원이다.
   *
   * 단원 이름만으로는 어느 교과서의 것인지 못 가린다 — 「분수」는 3학년에도 4학년에도 있다.
   */
  unitTerm: string;
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
  /** ⑤ 배점 — 문항들의 배점을 더한 요약(summaryOf). 고치는 것은 문항 쪽이다 */
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
  /** 검토 요청 — 출제위원이 검수자에게 특히 봐 달라고 하는 것 */
  reviewRequest: string;
  /** ⑦ 오답마다 어떤 오개념을 잡는가 — 보기와 같은 순서 */
  distractorIntent: string[];
  /** Ⅲ. 제출 전 자가 체크리스트에서 짚은 항목 id (lib/blueprint.ts submitChecklist) */
  checks: string[];
  /**
   * 제출 확인 — 「위 14항을 모두 확인하였음」에 서명한 출제위원.
   *
   * 확인을 풀어도 이름은 남긴다. 다시 확인할 때마다 이름을 새로 치게 할 까닭이 없다.
   */
  signedBy: string;
  /**
   * 제출 확인한 때. 비어 있으면 확인하지 않았다.
   *
   * ⚠ 서명은 **그때의 내용**에 한 것이다. 확인한 뒤 내용을 고치면 문항 상세가 이 값을
   *   비운다 — 체크는 남기고 확인만 다시 받는다(app/(admin2)/admin2/items/[id]/ItemDetail.tsx).
   */
  signedAt: string;
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
  /**
   * 문항을 만든 때.
   *
   * updatedAt과 갈라 둔다. 목록에서 「언제 들어온 문항인가」를 묻는 것과 「마지막으로
   * 손댄 게 언제인가」를 묻는 것은 다른 질문이고, 한 칸으로 합치면 오래전에 만들어 두고
   * 어제 오타 하나 고친 문항이 어제 만든 문항처럼 맨 위에 선다.
   *
   * 옛 저장분과 씨앗에는 이 값이 없다. 채워 넣을 때 updatedAt을 쓴다 — 만든 뒤 한 번도
   * 안 고친 문항에는 정확하고, 고친 문항에는 「그 이전」이라는 뜻으로 읽어도 틀리지 않다.
   */
  createdAt: string;
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
  {
    id: "content",
    label: "내용 오류",
    desc: "교과 내용이 틀렸거나 근거가 약합니다",
  },
  {
    id: "answer",
    label: "정답 불명확",
    desc: "정답이 둘 이상으로 읽히거나 근거가 부족합니다",
  },
  { id: "wording", label: "발문 모호", desc: "묻는 바가 분명하지 않습니다" },
  {
    id: "grade",
    label: "학년 부적합",
    desc: "해당 학년이 읽기에 어렵거나 쉽습니다",
  },
  { id: "bias", label: "편향 우려", desc: "성·지역·문화·SES 편향이 보입니다" },
  {
    id: "tag",
    label: "태깅 불일치",
    desc: "이중태그나 S위계가 문항과 맞지 않습니다",
  },
] as const;

export type RejectCode = (typeof rejectCodes)[number]["id"];

export const rejectLabel = (id: RejectCode) => rejectCodes.find((c) => c.id === id)?.label ?? id;

/** 검수 3단 — 정의서 EXP-03-1~3 */
export const reviewChecks = [
  {
    id: "content",
    label: "1차 내용 검수",
    desc: "교과 정확성 · 발문 명료성 · 정답 유일성 · 학년 이독성",
  },
  {
    /*
     * 2차는 **교차검증**이다 — 한 사람이 태그가 맞나 보는 것이 아니라, 교육과정 전문가와
     * 뇌과학 자문위원이 **서로 모른 채 각자 태깅한 뒤** 그 둘이 같은지를 본다.
     *
     * 한 사람이 보면 출제자가 적어 둔 태그를 읽고 「그럴듯하다」로 끝난다(앵커링). 태그는
     * 리포트의 재능 좌표를 그대로 정하는 값이라, 그럴듯함으로 통과시키면 좌표가 조용히
     * 기운다. 두 사람이 독립으로 붙이고 어긋난 것만 사람이 다시 보는 것이 요점이다.
     */
    id: "tagging",
    label: "2차 태깅 교차검증",
    desc: "교육과정 전문가 + 뇌과학 자문위원 독립 태깅",
  },
  {
    id: "ethics",
    label: "3차 윤리·편향 검수",
    desc: "성·지역·문화·SES 편향 · 아동 정서 적합성 · 특수교육 대상 접근성",
  },
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
      {
        id: "c-p-fact",
        text: "교과 내용이 정확하고 근거가 지문 안에 있습니다",
      },
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
      {
        id: "c-b-distractor",
        text: "오답 보기가 답이 될 수 없을 만큼 뻔하거나 의도가 겹칩니다",
      },
      { id: "c-b-grade", text: "학년에 비해 어휘·문장이 어렵습니다" },
      { id: "c-b-explain", text: "해설이 답만 말하고 까닭을 말하지 않습니다" },
    ],
  },
  tagging: {
    pass: [
      {
        id: "t-p-standard",
        text: "성취기준이 문항이 실제로 묻는 것과 맞습니다",
      },
      {
        id: "t-p-talent",
        text: "재능 축과 세부 기능이 문항이 재는 능력과 맞습니다",
      },
      { id: "t-p-level", text: "S단계가 요구하는 조작 수준과 발문이 맞습니다" },
      { id: "t-p-spec", text: "형식·배점·b모수가 단계 명세대로입니다" },
      { id: "t-p-band", text: "학년군이 지문과 보기 수준에 맞습니다" },
      { id: "t-p-single", text: "두 축이 겹치지 않고 하나로 읽힙니다" },
      {
        id: "t-p-cross",
        text: "교육과정 전문가와 뇌과학 자문위원의 독립 태깅이 일치합니다",
      },
      {
        id: "t-p-resolved",
        text: "두 태깅이 갈렸지만 근거를 맞춰 한 값으로 정리했습니다",
      },
    ],
    block: [
      {
        id: "t-b-standard",
        text: "성취기준이 문항이 실제로 묻는 것과 다릅니다",
      },
      { id: "t-b-talent", text: "재능 축이 문항이 재는 능력과 다릅니다" },
      { id: "t-b-subskill", text: "세부 기능이 더 맞는 것으로 따로 있습니다" },
      { id: "t-b-level", text: "S단계가 발문의 조작 수준과 어긋납니다" },
      { id: "t-b-spec", text: "형식·배점·b모수가 단계 명세와 다릅니다" },
      {
        id: "t-b-mixed",
        text: "한 문항이 두 축을 같이 재고 있어 점수 해석이 안 됩니다",
      },
      {
        id: "t-b-cross",
        text: "두 사람의 독립 태깅이 갈리고 어느 쪽이 맞는지 정하지 못했습니다",
      },
      { id: "t-b-onlyone", text: "독립 태깅이 한 사람 것만 들어왔습니다" },
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
      {
        id: "e-p-a11y",
        text: "특수교육 대상 아동도 풀 수 있습니다 — 그림·색에만 기대지 않고 글로도 읽힙니다",
      },
    ],
    block: [
      {
        id: "e-b-ses",
        text: "가정 형편(SES)이 드러나거나 있어야 풀리는 소재입니다",
      },
      { id: "e-b-gender", text: "성 역할을 고정하는 표현이 있습니다" },
      { id: "e-b-region", text: "특정 지역·문화의 경험이 있어야 풀립니다" },
      { id: "e-b-emotion", text: "아동 정서에 부담이 될 수 있는 소재입니다" },
      { id: "e-b-label", text: "아이의 특성을 규정하는 표현이 있습니다" },
      { id: "e-b-belief", text: "특정 종교·정치색이 드러납니다" },
      {
        id: "e-b-a11y-visual",
        text: "그림·색을 봐야만 풀립니다 — 저시력·색약 아동이 답할 수 없습니다",
      },
      {
        id: "e-b-a11y-read",
        text: "읽기 보조가 필요한 아동에게 발문이 너무 길거나 문장이 겹칩니다",
      },
      {
        id: "e-b-a11y-time",
        text: "손 조작·속도를 요구해 시간 연장으로도 메우기 어렵습니다",
      },
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
        text: "정답 유일성과 학년 이독성 모두 문항 없습니다. 승인합니다.",
      },
    ],
    comments: [
      {
        at: "2026-08-09 11:30",
        by: "이검수",
        role: "reviewer",
        kind: "approve",
        text: "정답 유일성과 학년 이독성 모두 문항 없습니다. 승인합니다.",
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
    retireReason:
      "26A 회차 정답률 96% — 변별이 되지 않아 회차에서 뺍니다. 문항 자체에 오류는 없습니다.",
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
    explain:
      "정답 ②. '고치다'와 '수리하다'는 바꾸어 써도 뜻이 통합니다. ①은 반대말, ③④는 뜻이 다릅니다.",
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
    guidance:
      "까닭까지 함께 고르게 해 관계의 원리를 확인합니다. 오답지는 흔한 오개념으로만 만듭니다.",
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
    guidance:
      "지문은 네 문장을 넘기지 않습니다. 중심 문장이 문단 첫머리에만 오지 않도록 회차마다 자리를 바꿉니다.",
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
  /* ── 수학·과학 승인 문항 (회차 편성용) ──
     회차 편성판은 과목 × 학년군 여섯 칸인데, 승인된 문항이 국어에만 있으면 나머지
     다섯 칸은 「승인 문항 0건」으로 서서 편성이라는 일 자체를 화면에서 해 볼 수 없다.
     수학 S1~S3 · 과학 S1~S4를 승인 상태로 둔다. 수학 S4(3M04-S4-001)와 과학 S1
     (SCI-4-002)은 일부러 검수 대기로 남겨 두었다 — 검수 화면에서 승인을 눌러 보면
     그 문항이 편성 후보에 새로 잡히는 것까지 이어서 볼 수 있다.

     성취기준 코드는 위에 이미 쓰인 것만 다시 쓴다. 새 코드를 지어내면 교육과정에
     없는 코드가 화면에 실적처럼 남는다. */
  {
    id: "IT-2617",
    code: "4M04-S1-002",
    subject: "수학",
    grade: "초등 3~4학년군",
    band: "3-4",
    unit: "분수",
    unitNo: "04",
    standardCode: "[4수01-10]",
    standardText: "양의 등분할을 통하여 분수를 이해하고 읽고 쓸 수 있다.",
    tagADetail: "단위분수 표기 식별",
    talent: "MATH",
    subskill: "MATH-01",
    passage: "",
    stem: "색종이 한 장을 똑같이 셋으로 나누었습니다. 그중 한 조각을 분수로 바르게 나타낸 것은?",
    choices: ["1/3", "3/1", "1/2", "3/3"],
    distractorIntent: [
      "",
      "분모와 분자를 뒤집어 쓰는 오개념",
      "등분한 수를 세지 않고 둘로 나눈 것으로 보는 혼동",
      "전체와 한 조각을 같은 것으로 보는 오개념",
    ],
    answer: 0,
    explain: "정답 ①. 전체를 똑같이 셋으로 나눈 것 중 하나이므로 1/3입니다.",
    guidance:
      "분수 표기를 고르는 것까지만 묻습니다. 크기를 견주게 하거나 계산을 요구하면 S1에서 이탈합니다.",
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
    correctRate: 81,
    reviews: [
      {
        at: "2026-08-12 10:20",
        by: "이검수",
        round: 1,
        verdict: "approve",
        checks: [
          { id: "content", ok: true, reason: "c-p-one", note: "" },
          { id: "tagging", ok: true, reason: "t-p-level", note: "" },
          { id: "ethics", ok: true, reason: "e-p-ses", note: "" },
        ],
        text: "표기만 고르게 하여 S1에 맞고, 오답 셋이 각각 다른 오개념을 잡습니다. 승인합니다.",
      },
    ],
    comments: [],
    updatedAt: "2026-08-12 10:20",
  },
  {
    id: "IT-2618",
    code: "4M04-S2-001",
    subject: "수학",
    grade: "초등 3~4학년군",
    band: "3-4",
    unit: "분수",
    unitNo: "04",
    standardCode: "[4수01-10]",
    standardText: "양의 등분할을 통하여 분수를 이해하고 읽고 쓸 수 있다.",
    tagADetail: "등분할 원리 이해",
    talent: "MATH",
    subskill: "MATH-01",
    passage: "",
    stem: "전체를 똑같이 넷으로 나눈 것 중 하나를 1/4이라고 합니다. 그렇게 말할 수 있는 까닭으로 알맞은 것은?",
    choices: [
      "나눈 조각의 크기가 모두 같고 그중 하나이기 때문",
      "조각이 모두 네 개이기 때문",
      "숫자 4가 아래에 적히기 때문",
      "조각 중에서 가장 작은 것이기 때문",
    ],
    distractorIntent: [
      "",
      "조각 수만 세면 분수가 된다고 보는 오개념",
      "표기 규칙을 뜻으로 바꿔 아는 오개념",
      "분수를 「가장 작은 조각」으로 보는 오개념",
    ],
    answer: 0,
    explain:
      "정답 ①. 분수는 똑같이 나눈 것 중 몇인지를 나타냅니다. 크기가 다르게 나뉘면 조각이 넷이어도 1/4이 아닙니다.",
    guidance: "까닭을 고르게 해 등분할 원리를 확인합니다. 오답지는 흔한 오개념으로만 만듭니다.",
    type: "choice",
    shortAnswers: "",
    rubric: "",
    assets: [],
    version: 1,
    anchor: false,
    level: "S2",
    author: "author.yoon",
    authorName: "윤출제",
    state: "approved",
    correctRate: 63,
    reviews: [
      {
        at: "2026-08-12 10:35",
        by: "이검수",
        round: 1,
        verdict: "approve",
        checks: [
          { id: "content", ok: true, reason: "c-p-explain", note: "" },
          { id: "tagging", ok: true, reason: "t-p-standard", note: "" },
          { id: "ethics", ok: true, reason: "e-p-label", note: "" },
        ],
        text: "「똑같이」가 조건이라는 것을 오답 ②가 정확히 겨냥합니다. 승인합니다.",
      },
    ],
    comments: [],
    updatedAt: "2026-08-12 10:35",
  },
  {
    id: "IT-2619",
    code: "4M04-S3-001",
    subject: "수학",
    grade: "초등 3~4학년군",
    band: "3-4",
    unit: "분수",
    unitNo: "04",
    standardCode: "[4수01-12]",
    standardText: "분모가 같은 분수끼리, 단위분수끼리 크기를 비교할 수 있다.",
    tagADetail: "같은 분모 크기 비교 수행",
    talent: "MATH",
    subskill: "MATH-01",
    passage: "",
    stem: "3/7, 5/7, 2/7을 큰 것부터 차례로 쓰시오.",
    choices: ["", "", "", ""],
    distractorIntent: [],
    answer: 0,
    explain:
      "정답: 5/7, 3/7, 2/7. 분모가 같으므로 분자가 큰 쪽이 큽니다. 부분점수 — 순서가 하나만 어긋나면 1점.",
    guidance:
      "배운 절차를 그대로 수행하게 합니다. 분모가 다른 비교(5~6학년군)는 요구하지 않습니다.",
    type: "short",
    shortAnswers: "5/7, 3/7, 2/7 / 5/7 3/7 2/7 / 5/7>3/7>2/7",
    rubric: "",
    assets: [],
    version: 1,
    anchor: false,
    level: "S3",
    author: "author.yoon",
    authorName: "윤출제",
    state: "approved",
    correctRate: 54,
    reviews: [
      {
        at: "2026-08-12 11:05",
        by: "이검수",
        round: 1,
        verdict: "approve",
        checks: [
          { id: "content", ok: true, reason: "c-p-clear", note: "" },
          { id: "tagging", ok: true, reason: "t-p-spec", note: "" },
          { id: "ethics", ok: true, reason: "e-p-ses", note: "" },
        ],
        text: "허용 답안에 쉼표·부등호 표기를 함께 등록해 자동채점에서 표기 흔들림을 흡수합니다. 승인합니다.",
      },
    ],
    comments: [],
    updatedAt: "2026-08-12 11:05",
  },
  {
    id: "IT-2620",
    code: "4S10-S1-001",
    subject: "과학",
    grade: "초등 3~4학년군",
    band: "3-4",
    unit: "물의 상태 변화",
    unitNo: "10",
    standardCode: "[4과10-01]",
    standardText: "물이 얼거나 끓을 때의 변화를 관찰하여 상태 변화를 설명할 수 있다.",
    tagADetail: "끓는 동안의 변화 관찰",
    talent: "NATU",
    subskill: "NATU-01",
    passage: "",
    stem: "물을 계속 끓이는 동안 관찰할 수 있는 것으로 알맞은 것은?",
    choices: [
      "물속에서 기포가 생겨 위로 올라간다",
      "물의 양이 점점 늘어난다",
      "물의 온도가 끝없이 올라간다",
      "물이 투명한 얼음으로 변한다",
    ],
    distractorIntent: [
      "",
      "끓는 동안 물이 는다고 보는 오개념",
      "끓는 동안에도 온도가 계속 오른다고 보는 오개념",
      "상태 변화의 방향을 뒤집어 보는 오개념",
    ],
    answer: 0,
    explain:
      "정답 ①. 끓는 동안 물속에서 기포가 생겨 올라오고, 물의 양은 줄며 온도는 더 오르지 않습니다.",
    guidance:
      "탐색적 측정 영역입니다 — 점수 비교 대상이 아님을 메타에 유지합니다. 관찰한 것을 고르는 데까지만 묻습니다.",
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
    correctRate: 76,
    reviews: [
      {
        at: "2026-08-13 09:40",
        by: "이검수",
        round: 1,
        verdict: "approve",
        checks: [
          { id: "content", ok: true, reason: "c-p-fact", note: "" },
          { id: "tagging", ok: true, reason: "t-p-talent", note: "" },
          { id: "ethics", ok: true, reason: "e-p-region", note: "" },
        ],
        text: "끓임 실험은 교실에서 함께 하는 활동이라 가정 환경을 전제하지 않습니다. 승인합니다.",
      },
    ],
    comments: [],
    updatedAt: "2026-08-13 09:40",
  },
  {
    id: "IT-2621",
    code: "4S10-S2-001",
    subject: "과학",
    grade: "초등 3~4학년군",
    band: "3-4",
    unit: "물의 상태 변화",
    unitNo: "10",
    standardCode: "[4과10-01]",
    standardText: "물이 얼거나 끓을 때의 변화를 관찰하여 상태 변화를 설명할 수 있다.",
    tagADetail: "언 물의 부피 변화 인과",
    talent: "NATU",
    subskill: "NATU-02",
    passage: "",
    stem: "물을 가득 채운 병을 얼렸더니 뚜껑이 밀려 올라왔습니다. 그 까닭으로 알맞은 것은?",
    choices: [
      "물이 얼면서 부피가 늘었기 때문",
      "물이 얼면서 무게가 늘었기 때문",
      "얼면서 병 속으로 공기가 들어갔기 때문",
      "병이 차가워져 줄어들었기 때문",
    ],
    distractorIntent: [
      "",
      "부피와 무게를 같은 것으로 보는 오개념",
      "상태 변화를 공기가 드는 일로 보는 오개념",
      "원인을 물이 아닌 병 쪽으로 옮기는 오개념",
    ],
    answer: 0,
    explain:
      "정답 ①. 물은 얼면 부피가 늘어납니다. 무게는 그대로이고 병 속으로 드나든 것도 없습니다.",
    guidance:
      "탐색적 측정 영역입니다 — 점수 비교 대상이 아님을 메타에 유지합니다. 오답 ②는 부피와 무게를 가르는 자리라 반드시 남깁니다.",
    type: "choice",
    shortAnswers: "",
    rubric: "",
    assets: [],
    version: 1,
    anchor: false,
    level: "S2",
    author: "author.yoon",
    authorName: "윤출제",
    state: "approved",
    correctRate: 61,
    reviews: [
      {
        at: "2026-08-13 09:55",
        by: "이검수",
        round: 1,
        verdict: "approve",
        checks: [
          { id: "content", ok: true, reason: "c-p-one", note: "" },
          { id: "tagging", ok: true, reason: "t-p-level", note: "" },
          { id: "ethics", ok: true, reason: "e-p-ses", note: "" },
        ],
        text: "까닭을 묻고 오답이 오개념을 겨냥하여 S2에 맞습니다. 승인합니다.",
      },
    ],
    comments: [],
    updatedAt: "2026-08-13 09:55",
  },
  {
    id: "IT-2622",
    code: "4S10-S3-001",
    subject: "과학",
    grade: "초등 3~4학년군",
    band: "3-4",
    unit: "물의 상태 변화",
    unitNo: "10",
    standardCode: "[4과10-01]",
    standardText: "물이 얼거나 끓을 때의 변화를 관찰하여 상태 변화를 설명할 수 있다.",
    tagADetail: "같게 할 조건 산출",
    talent: "NATU",
    subskill: "NATU-02",
    passage:
      "같은 양의 물을 담은 컵 두 개를 하나는 볕이 드는 창가에, 하나는 그늘에 두고 물이 줄어드는 빠르기를 견주려고 합니다.",
    stem: "이 실험에서 두 컵이 반드시 같아야 하는 조건을 두 가지 쓰시오.",
    choices: ["", "", "", ""],
    distractorIntent: [],
    answer: 0,
    explain:
      "다르게 하는 조건은 볕뿐입니다. 물의 양, 컵의 크기와 모양, 물의 처음 온도, 컵 입구의 넓이, 뚜껑을 덮었는지가 같아야 합니다. 부분점수 — 하나만 맞으면 1점.",
    guidance:
      "배운 절차(변인 통제)를 실행하게 하는 자리라 S3입니다. 실험 설계의 잘못을 진단하게 하면 S4로 넘어갑니다. 탐색적 측정 영역임을 메타에 유지합니다.",
    type: "short",
    shortAnswers: "물의 양, 컵의 크기, 컵의 모양, 물의 처음 온도, 컵 입구의 넓이, 뚜껑",
    rubric: "",
    assets: [],
    version: 1,
    anchor: true,
    level: "S3",
    author: "author.yoon",
    authorName: "윤출제",
    state: "approved",
    correctRate: 47,
    reviews: [
      {
        at: "2026-08-13 10:20",
        by: "이검수",
        round: 1,
        verdict: "approve",
        checks: [
          { id: "content", ok: true, reason: "c-p-clear", note: "" },
          { id: "tagging", ok: true, reason: "t-p-level", note: "" },
          { id: "ethics", ok: true, reason: "e-p-emotion", note: "" },
        ],
        text: "허용 답안을 여섯 가지로 넓혀 두어 표현이 달라도 같은 답을 잡습니다. 승인합니다.",
      },
    ],
    comments: [],
    updatedAt: "2026-08-13 10:20",
  },
  {
    id: "IT-2623",
    code: "4S10-S4-001",
    subject: "과학",
    grade: "초등 3~4학년군",
    band: "3-4",
    unit: "물의 상태 변화",
    unitNo: "10",
    standardCode: "[4과10-01]",
    standardText: "물이 얼거나 끓을 때의 변화를 관찰하여 상태 변화를 설명할 수 있다.",
    tagADetail: "보이지 않는 출처 역추론",
    talent: "NATU",
    subskill: "NATU-03",
    passage: "유리컵에 찬물을 담아 책상에 두었더니 잠시 뒤 컵 바깥쪽에 작은 물방울이 맺혔습니다.",
    stem: "(1) 이 물방울이 어디에서 온 것인지 쓰시오. (2) 컵 안의 물이 새어 나온 것이 아님을 확인할 방법을 한 가지 설계하여, 그 방법으로 왜 확인이 되는지 함께 쓰시오.",
    choices: ["", "", "", ""],
    distractorIntent: [],
    answer: 0,
    explain:
      "모범답안 예: (1) 공기 중에 있던 수증기가 차가운 컵에 닿아 물로 변한 것. (2) 컵 겉면을 마른 헝겊으로 닦고 물의 높이를 표시해 둔 뒤 다시 두면, 높이가 그대로인데 겉에 물방울이 다시 맺히므로 새어 나온 것이 아님을 알 수 있음.",
    guidance:
      "자연-생태는 탐색적 측정 영역이라 S4도 정답형으로만 냅니다 — 「어느 쪽이 더 좋은가」 같은 가치 판단은 SJT 소관이므로 넣지 않습니다. 점수 비교 대상이 아님을 메타에 유지합니다.",
    type: "essay",
    shortAnswers: "",
    rubric:
      "출처 설명 1점 + 확인 방법 설계 1점 + 그 방법이 확인이 되는 까닭 1점.\n인정 예: 「겉면을 닦고 물 높이를 표시해 둔 뒤 다시 본다」, 「빈 컵과 찬물 컵을 나란히 두고 견준다」\n불인정 예: 「새지 않는다」(주장만), 「공기 중의 물이다」(확인 방법 없음)",
    assets: [],
    version: 1,
    anchor: false,
    level: "S4",
    author: "author.yoon",
    authorName: "윤출제",
    state: "approved",
    correctRate: 38,
    reviews: [
      {
        at: "2026-08-14 14:10",
        by: "이검수",
        round: 1,
        verdict: "approve",
        checks: [
          { id: "content", ok: true, reason: "c-p-fact", note: "" },
          { id: "tagging", ok: true, reason: "t-p-level", note: "" },
          { id: "ethics", ok: true, reason: "e-p-label", note: "" },
        ],
        text: "결론이 아니라 확인 방법의 성립을 보는 루브릭이라 S4 정답형입니다. 인정·불인정 예가 함께 적혀 있습니다. 승인합니다.",
      },
    ],
    comments: [],
    updatedAt: "2026-08-14 14:10",
  },
];

const SEED: ItemDraft[] = withCodes(SEED_RAW.map(fill));

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
/* ── 납작한 칸 ↔ questions 맞추기 ──────────────────────────────────────────
 *
 * 문항 하나가 문항 여럿을 담게 되면서 발문·보기·정답·해설이 questions로 옮겨 갔다.
 * 그런데 옛 콘솔(components/admin/ItemCard.tsx)과 목록·검수·편성 화면 열두 곳이
 * 아직 item.stem · item.type을 직접 읽는다. 그 화면들을 한꺼번에 갈아엎지 않고
 * 살려 두려면 두 벌이 있어야 하고, 두 벌이 있으면 반드시 어긋난다.
 *
 * 그래서 어긋날 자리를 하나로 모은다 — **저장으로 나가는 길목(patchItem)에서만**
 * 맞춘다. questions를 건드린 patch면 questions가 이기고(→ 납작한 칸을 다시 만든다),
 * 납작한 칸을 건드린 patch면 그쪽이 이긴다(→ 첫 문항에 되붙인다). 한 번의 저장에서
 * 양쪽을 같이 고치는 화면은 없으므로 「어느 쪽이 이기나」로 헷갈릴 일이 없다.
 */

/**
 * questions[0]이 곧 이 값들이다.
 *
 * 세트에서도 첫 문항의 것을 그대로 올린다. 「대표값」이라 부를 만한 것이 달리 없고,
 * 목록에서 문항 한 줄을 볼 때 궁금한 것은 대개 그 세트가 무엇으로 시작하는가이다.
 * 문항마다 다를 수 있다는 것은 목록의 유형 칸이 「세트 3문 · 서술형 · OX」로 알린다.
 */
const MIRRORED = [
  "type",
  "stem",
  "choices",
  "answer",
  "distractorIntent",
  "shortAnswers",
  "rubric",
  "explain",
  "standardCode",
  "standardText",
  "tagADetail",
  "talent",
  "subskill",
] as const;

type Mirrored = Pick<ItemDraft, (typeof MIRRORED)[number]>;

/**
 * 세트를 문항 한 줄로 줄인 값 — 첫 문항를 그대로 올릴 수 없는 셋.
 *
 *   단계   가장 높은 것. 세트는 그 안에서 제일 어려운 문항만큼 요구한다.
 *   b모수  평균. 회차 편성이 난이도를 고르게 섞을 때 보는 값이다.
 *   배점   합. 이것만은 반드시 합이어야 한다 — 첫 문항의 배점을 올리면 검사지
 *          총점이 세트 하나마다 어긋나고, 그 오차는 채점이 끝난 뒤에나 드러난다.
 *
 * 단일 문항은 문항이 하나라 셋 다 그 문항의 값과 같다.
 */
/* 단계 차례는 blueprint의 LEVELS를 그대로 쓴다. 여기서 배열을 하나 더 세우면 안 된다 —
   SEED가 이 파일 위쪽에서 fill()을 부르는데, 그 시점에 아래쪽 const는 아직 서지 않았다
   (TDZ). import은 본문보다 먼저 서므로 안전하다. */
export function summaryOf(qs: Question[]): Pick<ItemDraft, "level" | "b" | "points"> {
  const level = qs.reduce(
    (hi, q) => (LEVELS.indexOf(q.level) > LEVELS.indexOf(hi) ? q.level : hi),
    qs[0].level,
  );
  const points = qs.reduce((sum, q) => sum + q.points, 0);
  /* 고른 것만 평균 낸다. 아무도 안 골랐으면 단계 앵커값을 세운다 — 문항 쪽 b는 목록과
     회차 편성이 숫자로 읽는 칸이라 비울 수가 없다. 「골랐는가」를 물어야 하는 자리는
     묶음이 아니라 문항이고, 그건 difficultyPicked(q.b)가 답한다.
     소수 둘째 자리에서 끊는 것은 셋으로 나눈 평균이 -0.16666…으로 저장되면 목록의
     난이도 칸이 문항마다 자릿수가 달라지기 때문이다 */
  const picked = qs.map((q) => q.b).filter((v): v is number => v !== null);
  const b =
    picked.length > 0
      ? Math.round((picked.reduce((sum, v) => sum + v, 0) / picked.length) * 100) / 100
      : levelSpecs[level].b;
  return { level, b, points };
}

/** 납작한 칸을 문항 하나로 옮긴 것 */
function questionOf(raw: Partial<ItemDraft>, n: number, tags: QuestionTags): Question {
  return {
    id: `q${n + 1}`,
    type: (raw.type ?? "choice") as ItemType,
    stem: raw.stem ?? "",
    stemMode: "text",
    stemImages: [],
    /* OX여도 「맞다·아니다」를 담지 않는다 — OX_CHOICES 주석 참고 */
    choices: raw.choices ?? blankChoices(),
    answer: raw.answer ?? 0,
    distractorIntent: raw.distractorIntent ?? [],
    shortAnswers: raw.shortAnswers ?? "",
    rubric: raw.rubric ?? "",
    explain: raw.explain ?? "",
    acceptExamples: "",
    rejectExamples: "",
    perspectiveHierarchy: "",
    perspectiveAbility: "",
    wrongIntent: "",
    tagAIntent: "",
    ...tags,
  };
}

/**
 * 저장분에 없던 칸을 메운다.
 *
 * 분류가 문항에만 있던 시절의 저장분은 문항에 그 칸이 없다. 그때는 문항이 이고 있던
 * 값을 그대로 물려준다 — 세트라도 그 시절에는 전부 한 벌뿐이었으므로 틀리지 않는다.
 */
function fillQuestion(q: Partial<Question>, n: number, tags: QuestionTags): Question {
  const level = q.level ?? tags.level;
  return {
    id: q.id || `q${n + 1}`,
    type: (q.type ?? "choice") as ItemType,
    stem: q.stem ?? "",
    stemMode: q.stemMode ?? "text",
    stemImages: q.stemImages ?? [],
    choices: q.choices ?? blankChoices(),
    answer: q.answer ?? 0,
    distractorIntent: q.distractorIntent ?? [],
    shortAnswers: q.shortAnswers ?? "",
    rubric: q.rubric ?? "",
    explain: q.explain ?? "",
    /* 문항 카드 칸이 없던 시절의 저장분. 비워 두어 제출 문턱에서 걸리게 한다 */
    acceptExamples: q.acceptExamples ?? "",
    rejectExamples: q.rejectExamples ?? "",
    perspectiveHierarchy: q.perspectiveHierarchy ?? "",
    perspectiveAbility: q.perspectiveAbility ?? "",
    wrongIntent: q.wrongIntent ?? "",
    tagAIntent: q.tagAIntent ?? "",
    standardCode: q.standardCode ?? tags.standardCode,
    standardText: q.standardText ?? tags.standardText,
    tagADetail: q.tagADetail ?? tags.tagADetail,
    talent: q.talent ?? tags.talent,
    subskill: q.subskill ?? tags.subskill,
    level,
    b: q.b ?? tags.b,
    /* 문항에 적힌 배점이 없으면 단계의 기본 배점으로 시작한다. 물려받은 배점을 쓰지 않는
       것은 그것이 세트 전체의 합일 수 있어서다 — 그대로 쓰면 문항 하나가 세트 총점을
       이고 앉는다 */
    points: q.points ?? levelSpecs[level].points,
  };
}

/** 거울에 올릴 칸만 뽑아 낸다. Question과 ItemDraft 양쪽이 다 들어온다 */
function flatten(q: Mirrored): Mirrored {
  return {
    type: q.type,
    stem: q.stem,
    choices: q.choices,
    answer: q.answer,
    distractorIntent: q.distractorIntent,
    shortAnswers: q.shortAnswers,
    rubric: q.rubric,
    explain: q.explain,
    standardCode: q.standardCode,
    standardText: q.standardText,
    tagADetail: q.tagADetail,
    talent: q.talent,
    subskill: q.subskill,
  };
}

/**
 * 저장 직전에 두 벌을 맞춘다.
 *
 * 단일로 되돌리면 2번 이후 문항을 여기서 떨어뜨린다. 화면에서 미리 알려 주고
 * (「저장하면 n개가 사라집니다」) 실제로 지우는 것은 여기 한 곳뿐이다.
 */
/**
 * 문항 쪽 파생값을 문항들에서 다시 만든다 — 거울 · 요약 · 표시용 태그 한 벌.
 *
 * 읽을 때(fill)와 쓸 때(syncQuestions)가 이 함수 하나를 부른다. 한동안 fill이 따로
 * 조립했는데, 그러다 distractorIntent 한 줄이 거울을 덮어써서 첫 문항의 오답 의도가
 * 읽을 때마다 빈 배열로 돌아갔다. 조립하는 자리가 둘이면 반드시 어긋난다.
 */
function derive(item: ItemDraft): ItemDraft {
  const first = item.questions[0];
  const next: ItemDraft = {
    ...item,
    ...flatten(first),
    /* 납작한 보기 칸에는 화면이 실제로 세우는 것을 적는다(OX면 맞다·아니다) */
    choices: choicesOf(first),
    ...summaryOf(item.questions),
  };
  return { ...next, ...syncTags(next) };
}

function syncQuestions(next: ItemDraft, patch: Partial<ItemDraft>): ItemDraft {
  let out = next;

  if (!patch.questions && MIRRORED.some((k) => k in patch)) {
    /* 옛 콘솔이 납작한 칸을 고친 경우. 첫 문항에 되붙인다.
       ⚠ level·b·points는 되붙이지 않는다 — 그 셋은 문항들에서 만든 요약이라, 되돌려
         쓰면 세트 총점이 문항 하나의 배점으로 내려앉는다. 그래서 단계를 바꾸는 길은
         setLevel 하나뿐이고, 그 함수가 문항을 직접 고친다. */
    const [first, ...rest] = out.questions;
    out = { ...out, questions: [{ ...first, ...flatten(out) }, ...rest] };
  }

  /* 단일로 되돌리면 2번 이후를 떨어뜨린다. 요약을 만들기 전에 해야 총점이 맞는다 */
  if (out.form === "single" && out.questions.length > 1) {
    out = { ...out, questions: [out.questions[0]] };
  }

  return derive(out);
}

function fill(raw: Partial<ItemDraft>): ItemDraft {
  const level = (raw.level ?? "S1") as Level;
  const spec = levelSpecs[level];
  const talent = (raw.talent ?? "LANG") as TalentId;
  const band = (raw.band ?? "3-4") as GradeBand;
  /* 분류가 문항에만 있던 시절의 값. 문항에 그 칸이 없으면 이걸 물려준다 */
  const tags: QuestionTags = {
    standardCode: raw.standardCode ?? "",
    standardText: raw.standardText ?? "",
    tagADetail: raw.tagADetail ?? raw.tagA ?? "",
    talent,
    subskill: raw.subskill ?? subskillsOf(talent)[0].code,
    level,
    /* 앵커값을 채워 넣지 않는다 — 아무도 안 고른 것과 「아주 쉬움」을 고른 것이
       같은 값이 되면 제출 검사가 뚫린다(Question.b 주석) */
    b: raw.b ?? null,
    points: spec.points,
  };
  /* 세트가 없던 시절의 문항은 납작한 칸만 갖고 있다. 그 칸들을 문항 하나로 옮긴다 */
  const questions =
    raw.questions && raw.questions.length > 0
      ? raw.questions.map((q, n) => fillQuestion(q, n, tags))
      : [questionOf(raw, 0, tags)];
  return derive({
    ...(raw as ItemDraft),
    form: raw.form ?? (questions.length > 1 ? "set" : "single"),
    passage: raw.passage ?? "",
    passageMode: raw.passageMode ?? "text",
    passageImages: raw.passageImages ?? [],
    questions,
    band,
    unit: raw.unit ?? "",
    unitNo: raw.unitNo ?? "",
    unitTerm: raw.unitTerm ?? "",
    anchor: raw.anchor ?? false,
    guidance: raw.guidance ?? "",
    reviewRequest: raw.reviewRequest ?? "",
    checks: raw.checks ?? [],
    signedBy: raw.signedBy ?? "",
    signedAt: raw.signedAt ?? "",
    comments: raw.comments ?? [],
    origin: raw.origin ?? "human",
    reviews: raw.reviews ?? [],
    assets: raw.assets ?? [],
    correctRate: raw.correctRate ?? null,
    createdAt: raw.createdAt ?? raw.updatedAt ?? "",
  });
}

function read(): ItemDraft[] {
  if (typeof window === "undefined") return SEED;
  const raw = window.localStorage.getItem(KEY);
  if (raw === cacheRaw) return cacheValue;
  cacheRaw = raw;
  try {
    cacheValue = raw
      ? withCodes(mergeSeed((JSON.parse(raw) as Partial<ItemDraft>[]).map(fill)))
      : SEED;
  } catch {
    cacheValue = SEED;
  }
  return cacheValue;
}

/**
 * 저장분에 없는 씨앗을 뒤에 붙인다.
 *
 * 씨앗이 늘어나도 브라우저에 남아 있는 옛 저장분이 그 문항을 빠뜨리지 않게 한다.
 * 회차 편성판이 「수학 승인 문항 0건」으로 서는 것은 대개 은행이 얇아서가 아니라
 * 저장분이 씨앗보다 오래되어서다. 문항을 지우는 길은 이 저장소에 없으므로(사용
 * 중지는 상태만 바꾼다), 저장분에 없는 씨앗은 「지운 것」이 아니라 「모르는 것」이다.
 */
function mergeSeed(stored: ItemDraft[]): ItemDraft[] {
  const have = new Set(stored.map((i) => i.id));
  const missing = SEED.filter((i) => !have.has(i.id));
  return missing.length > 0 ? [...stored, ...missing] : stored;
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

/** 화면에 찍는 시각 — 초 단위까지 갈 필요가 없다. 제출 확인이 초안에 찍는 시각도 이것이다 */
export function now() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function patchItem(id: string, patch: Partial<ItemDraft>) {
  /* 서명은 내용에 붙는다. 제출 확인한 뒤 내용을 고치면 확인을 푼다 — 어느 화면에서 고쳤든.
     한동안 새 콘솔의 문항 상세만 풀었더니, 옛 콘솔에서 발문을 고친 문항이 새 콘솔로 돌아와
     서명을 단 채 제출됐다. 서명한 사람이 본 적 없는 내용에 날짜가 붙는다.
     patch가 스스로 signedAt을 들고 오면 손대지 않는다 — 새 콘솔은 고친 뒤 다시 확인한 초안을
     한 번에 저장한다 */
  const unsign = !("signedAt" in patch) && Object.keys(patch).some((k) => !UNSIGNED_KEYS.has(k));
  /* 코드까지 다시 매겨서 담는다. read()가 어차피 다시 매기므로 화면은 어느 쪽이든 같지만,
     담긴 것과 읽은 것이 다르면 저장소를 직접 열어 본 사람이 「과목은 과학인데 코드는 M」인
     문항을 보게 된다. 붙일 때 서버로 나가는 것도 이 값이다 */
  write(
    withCodes(
      read().map((i) =>
        i.id === id
          ? syncQuestions(
              {
                ...i,
                ...patch,
                ...(unsign && i.signedAt ? { signedAt: "" } : {}),
                updatedAt: now(),
              },
              patch,
            )
          : i,
      ),
    ),
  );
}

/**
 * 고쳐도 제출 확인을 풀지 않는 칸 — 문항 내용이 아닌 것들.
 *
 * 확인에 딸린 것(체크리스트 · 서명 · 출제자 유의 · 검토 요청)과 흐름에 딸린 것(상태 · 검수 ·
 * 메모 · 앵커 · 사용 중지 · 공개 · 정답률). 제출하거나 반려되는 것만으로 서명이 풀리면 반려된
 * 문항을 고치기도 전에 확인이 사라져, 무엇이 바뀌어 다시 확인하는지 알 수 없다.
 *
 * 표시용 태그(tagA · tagB)도 넣는다. 옛 콘솔은 무엇을 고치든 태그를 함께 실어 보내서
 * (components/admin/ItemCard.tsx set), 빼 두면 출제자 유의 한 글자에도 서명이 풀린다. 태그는
 * 내용에서 다시 만드는 값이라, 내용을 고친 patch는 제 칸으로 서명을 푼다.
 */
const UNSIGNED_KEYS = new Set<string>([
  "checks",
  "signedBy",
  "signedAt",
  "guidance",
  "reviewRequest",
  "tagA",
  "tagB",
  "state",
  "reviews",
  "reviewDraft",
  "comments",
  "aiAudit",
  "anchor",
  "retiredAt",
  "retiredBy",
  "retireReason",
  "disclosed",
  "correctRate",
  "updatedAt",
]);

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
    choices: blankChoices(),
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
 *  1) 상태는 draft로 들어간다. 만들자마자 검수로 넘기는 길은 없다. 제출 단추는 문항
 *     상세에만 있어서 누군가 그 문항을 열어야 넘어간다 — 「사람이 한 번도 안 연 문항」이
 *     검수 목록에 쌓이는 것을 여기서 막는다. 거기에 더해 두 콘솔 모두 제출 전 자가
 *     체크리스트를 사람이 직접 짚게 하고(missingFields · missingSubmit), 새 콘솔은 재능 평가
 *     관점과 서명까지 받는다 — AI 초안은 그 칸을 비워 둔 채로 들어간다.
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
  /**
   * 단일이냐 세트냐.
   *
   * 세트면 뽑은 문항을 **보기 하나 아래 묶어** 초안 한 장으로 만든다. 자료를 두 번
   * 읽히지 않고 단계를 올려 묻는 것이 세트를 두는 까닭이라, 단계 차례(S1 → S4)로
   * 안에 세운다.
   */
  form: ItemForm;
  subject: ItemDraft["subject"];
  band: GradeBand;
  /** 예상 난이도 b — difficulties 넷 중 하나. null이면 아직 안 골랐다 */
  b: number | null;
  talent: TalentId;
  subskill: string;
  unit: string;
  unitNo: string;
  standardCode: string;
  /** 단계별 몇 문항을 뽑을지. 단일이면 문항마다 한 장씩, 세트면 모두 한 장에 담는다 */
  counts: Record<Level, number>;
  /** 소재·주의사항 지시문 */
  brief: string;

  /* ── 새 콘솔(app/(admin2)/admin2/authoring/Generator.tsx)만 채우는 칸 ──
     생성 판이 문항 상세와 같은 분류 줄을 받게 되면서 붙었다. 옛 콘솔(components/admin/
     ItemGenerator.tsx)은 이 칸들을 모르므로 전부 비워 둘 수 있게 둔다 — 비었으면 예전처럼
     본에서 꺼낸 값과 단계의 고정 매핑을 쓴다. */
  /**
   * 고른 교과 단원의 학년-학기(「3-1」). 새 콘솔은 교과 단원을 목록에서 골라야 과목이 정해져서
   * 이 칸이 있으면 단원을 필수로 본다(checkSpec).
   */
  unitTerm?: string;
  /** Tag A 성취기준 내용 · 학습 요소 · 출제 의도 — 사람이 적었으면 본의 값보다 앞선다 */
  standardText?: string;
  tagADetail?: string;
  tagAIntent?: string;
  /**
   * 단일의 형식 · 배점. 세트는 단계마다 고정 매핑(typeForLevel · levelSpecs)을 따른다.
   * 비우면 단일도 고정 매핑을 따른다 — 새 콘솔도 단일에서 여러 단계를 한꺼번에 뽑게 되면서
   * 지금은 두 콘솔 모두 넘기지 않는다(Generator.tsx 머리 주석).
   */
  type?: ItemType;
  points?: number;
};

/** 한 번에 뽑을 수 있는 최대 — 초안이 스물을 넘으면 사람이 손볼 수 없다 */
export const GENERATE_MAX = 20;

/**
 * 한 세트에 담을 수 있는 문항 수 — 넘으면 아이가 한 자리에서 다 못 푼다.
 *
 * 문항 상세의 문항 추가 · 단계별 문항 수와 생성 판이 같은 수를 본다. 생성 판만 스물까지 받던
 * 때는 스무 문항짜리 세트가 만들어졌는데, 그 세트는 문항 상세에서 문항을 더할 수도 없고 편성판
 * 한 칸에도 들어가지 않았다.
 */
export const SET_MAX = 8;

export const countOf = (counts: Record<Level, number>) =>
  (Object.values(counts) as number[]).reduce((s, n) => s + (n || 0), 0);

/** 생성 전에 걸러야 할 것 — 화면과 저장소가 같은 규칙을 본다 */
export function checkSpec(spec: GenerateSpec): string[] {
  const bad: string[] = [];
  const total = countOf(spec.counts);

  if (total === 0) bad.push("단계마다 뽑을 문항 수를 한 칸 이상 적어 주세요.");
  if (total > GENERATE_MAX) bad.push(`한 번에 ${GENERATE_MAX}문항까지 뽑을 수 있습니다.`);
  /* 세트는 보기 하나를 함께 읽고 그 위에서 둘 이상을 묻는 꼴이다. 하나짜리 세트는
     단일과 같은 것인데, 그렇게 만들어 두면 편성판이 그것을 세트로 세고 배점 합도
     세트 규칙으로 잡는다 */
  if (spec.form === "set" && total < 2) bad.push("세트는 두 문항 이상이어야 합니다.");
  if (spec.form === "set" && total > SET_MAX) {
    bad.push(`한 세트에 ${SET_MAX}문항까지 담을 수 있습니다.`);
  }
  if (!difficultyPicked(spec.b)) bad.push("난이도를 골라 주세요.");

  /* 새 콘솔은 교과 단원을 골라야 과목이 정해진다. 학년군을 옮겨 목록 밖이 된 단원도 막는다 —
     3학년 단원을 단 5·6학년군 문항이 생긴다 */
  if (spec.unitTerm !== undefined) {
    if (!spec.unitTerm || !spec.unit.trim()) bad.push("교과 단원을 골라 주세요.");
    else {
      const grade = Number(spec.unitTerm.split("-")[0]);
      const grades = spec.band === "3-4" ? [3, 4] : [5, 6];
      if (!grades.includes(grade)) bad.push("고른 교과 단원이 학년군과 맞지 않습니다.");
    }
  }
  if (spec.points !== undefined && !(spec.points > 0)) {
    bad.push("0보다 큰 배점을 적어 주세요.");
  }

  /* 단원과 성취기준 코드는 비워 둘 수 있다 — 생성한 뒤 문항을 보고 붙이는 편이 맞는
     자리가 많다. 다만 **적었으면 맞아야 한다**. 틀린 코드가 붙은 문항은 안 붙은 문항
     보다 나쁘다: 검수에서 맞는 줄 알고 지나간다 */
  if (spec.standardCode.trim()) {
    const code = checkStandardCode(spec.standardCode, spec.band);
    if (!code.ok) bad.push(code.why);
  }

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

  /* 뽑을 것을 단계 차례로 편다. 세트 안에서도 S1 → S4로 서야 한 자료를 놓고 단계를
     올려 물을 수 있다 — 그것이 세트를 두는 까닭이다 */
  const picks: { level: Level; k: number; n: number }[] = [];
  for (const level of LEVELS_ALL) {
    const n = spec.counts[level] ?? 0;
    for (let k = 0; k < n; k += 1) picks.push({ level, k, n });
  }
  if (picks.length === 0) return [];

  /** 출제자가 열었을 때 무엇부터 봐야 하는지 */
  const guidanceOf = (level: Level, k: number, n: number, inSet: boolean) => {
    const s = levelSpecs[level];
    return [
      "AI가 만든 문항입니다. 그대로 두지 말고 아래를 확인하고 고쳐 주세요.",
      `· 태깅 — 고른 축(${spec.talent} · ${spec.subskill})이 이 문항이 실제로 재는 것과 맞는가`,
      spec.standardCode.trim()
        ? `· 성취기준 — ${spec.standardCode.trim()}의 내용과 아래 성취기준 내용이 맞는가`
        : "· 성취기준 — 아직 비어 있습니다. 문항을 보고 코드를 붙여 주세요",
      `· 단계 — ${s.rule}`,
      `· 금지 — ${s.deny}`,
      inSet ? "· 세트입니다. 보기 하나를 함께 읽는 문항인지, 앞 문항의 답이 뒷 문항에 새지 않는지 볼 것" : "",
      !inSet && n > 1 ? `· 이 단계 ${n}개 중 ${k + 1}번째. 소재가 서로 겹치지 않는지 볼 것` : "",
      spec.brief.trim() ? `· 출제 지시 — ${spec.brief.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  };

  /** 뽑은 것 하나를 문항 한 칸으로 */
  const questionOf = (pick: { level: Level; k: number }, order: number) => {
    const s = levelSpecs[pick.level];
    /* 단일에서 사람이 고른 형식 · 배점. 세트는 단계마다 고정 매핑을 따른다 — 한 벌의 형식을
       S1과 S4에 함께 씌우면 어느 한쪽은 반드시 매핑을 벗어난다 */
    const own = spec.form === "single";
    const type = (own && spec.type) || typeForLevel[pick.level];
    /* 본(lib/itemBank.ts)은 단계마다 그 단계의 처음 형식(typeForLevel)으로 쓰여 있다. 단일에서
       다른 형식을 골랐으면 그 형식으로 쓰인 단계의 본을 꺼낸다 — 객관식은 S1, 단답은 S3, 서술 ·
       논술 · 이미지는 채점 기준이 든 S4. 단계의 본을 그대로 쓰던 때는 S1 OX 문항이 네 보기의
       정답 번호(3)를 들고 나와 맞다 · 아니다 어느 쪽도 정답이 아니었고, S3 서술형 문항은 채점
       기준 없이 단답 정답을 숨긴 채 나왔다.
       OX는 본이 없다. 발문 · 정답 · 모범답안을 비워 두고 사람이 쓴다 — 네 보기짜리 발문에 맞다 ·
       아니다를 붙이면 그럴듯한데 틀린 문항이 된다 */
    const ox = type === "ox";
    const sampleLevel: Level =
      ox || type === typeForLevel[pick.level]
        ? pick.level
        : type === "choice"
          ? "S1"
          : type === "short"
            ? "S3"
            : "S4";
    const sample = pickSample(spec.subject, sampleLevel, pick.k);
    return {
      sample,
      q: {
        id: `q${order + 1}`,
        type,
        stem: ox ? "" : sample.stem,
        stemMode: "text" as const,
        stemImages: [],
        choices: ox ? blankChoices() : (sample.choices ?? blankChoices()),
        answer: ox ? 0 : (sample.answer ?? 0),
        explain: ox ? "" : sample.explain,
        shortAnswers: type === "short" ? (sample.shortAnswers ?? "") : "",
        rubric: ox ? "" : (sample.rubric ?? ""),
        distractorIntent: type === "choice" ? (sample.distractorIntent ?? []) : [],
        /* 문항 카드의 나머지 칸은 비워 둔다. AI가 채워 넣으면 사람이 안 읽고도 제출 문턱을
           넘는다 — 재능 평가 관점은 출제위원이 문항을 읽고 밝히는 값이다 */
        acceptExamples: "",
        rejectExamples: "",
        perspectiveHierarchy: "",
        perspectiveAbility: "",
        wrongIntent: "",
        /* 출제 의도는 사람이 생성 판에 적었을 때만 든다. AI가 채우지 않는 까닭은 위와 같다 */
        tagAIntent: spec.tagAIntent?.trim() ?? "",
        standardCode: spec.standardCode.trim(),
        standardText: spec.standardText?.trim() || sample.standardText,
        tagADetail: spec.tagADetail?.trim() || sample.tagADetail,
        talent: spec.talent,
        subskill: spec.subskill,
        level: pick.level,
        /* 사람이 고른 난이도를 그대로 쓴다. 단계 앵커값을 몰래 넣어 두면 「아무도 안
           고른 것」과 구별되지 않는다(Question.b 주석) */
        b: spec.b,
        points: own && spec.points !== undefined ? spec.points : s.points,
      },
    };
  };

  const stamp = Date.now().toString(36).toUpperCase();
  const base = {
    code: "",
    subject: spec.subject,
    band: spec.band,
    grade: spec.band === "3-4" ? "초등 3~4학년군" : "초등 5~6학년군",
    assets: [],
    version: 1,
    unit: spec.unit.trim(),
    unitNo: spec.unitNo.trim(),
    unitTerm: spec.unitTerm ?? "",
    standardCode: spec.standardCode.trim(),
    talent: spec.talent,
    subskill: spec.subskill,
    /* checkSpec이 난이도를 고른 것만 들이므로 null이 여기까지 오지 않는다 */
    b: spec.b ?? 0,
    anchor: false,
    author,
    authorName,
    state: "draft" as const,
    origin: "ai" as const,
    aiBrief: spec.brief.trim(),
    comments: [],
    reviews: [],
    updatedAt: now(),
  };

  let serial = list.filter((i) => i.subject === spec.subject).length;
  const made: ItemDraft[] = [];

  if (spec.form === "set") {
    /* 세트는 한 장이다. 보기는 첫 문항의 지문을 쓴다 — 뒤 문항의 지문은 버리지 않고
       발문 앞에 붙이지도 않는다. 한 자료를 함께 읽는 것이 세트이므로, 자료가 여럿이면
       그것은 세트가 아니라 낱개 여럿이다 */
    const built = picks.map((pick, i) => questionOf(pick, i));
    serial += 1;
    const item = fill({
      ...base,
      id: `IT-AI-${stamp}-${serial}`,
      form: "set",
      passage: built[0].sample.passage ?? "",
      questions: built.map((b) => b.q),
      standardText: built[0].q.standardText,
      tagADetail: built[0].q.tagADetail,
      level: built[0].q.level,
      guidance: guidanceOf(built[0].q.level, 0, built.length, true),
    });
    made.push({ ...item, ...syncTags(item) });
  } else {
    for (const pick of picks) {
      serial += 1;
      const built = questionOf(pick, 0);
      const item = fill({
        ...base,
        id: `IT-AI-${stamp}-${serial}`,
        form: "single",
        passage: built.sample.passage ?? "",
        questions: [built.q],
        standardText: built.q.standardText,
        tagADetail: built.q.tagADetail,
        level: pick.level,
        guidance: guidanceOf(pick.level, pick.k, pick.n, false),
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

/**
 * 인지단계를 바꾼다 — 옛 콘솔(components/admin/ItemCard.tsx)이 부른다.
 *
 * 문항 쪽 level·points는 이제 문항들에서 만드는 요약이라, 거기에 값을 밀어 넣으면
 * 다음 저장에서 그대로 다시 계산되어 사라진다. 그래서 **첫 문항**를 고친다.
 *
 * ⚠ 첫 문항만 고친다. 옛 콘솔에는 세트라는 개념이 없어서 몇 번 문항를 말하는지
 *   가리킬 방법이 없다. 세트의 2번 이후는 새 콘솔의 문항 상세에서 고친다.
 */
export function setLevel(id: string, level: Level) {
  const item = read().find((i) => i.id === id);
  if (!item) return;
  /* 형식만 따라온다. b모수와 배점은 덮지 않는다 — 둘 다 사람이 고르고 적는 값이라, 단계를
     한 번 바꾼 것만으로 앵커값·기본 배점으로 돌아가 있으면 아무 말 없이 고친 것이 사라진다.
     b는 난이도를 넷 중에서 고르게 바꿨을 때, 배점은 새 콘솔에서 직접 적게 바꿨을 때 뺐다 */
  patchItem(id, {
    questions: item.questions.map((q, n) =>
      n === 0 ? { ...q, level, type: typeForLevel[level] } : q,
    ),
  });
}

/* ── 문항 다루기 (화면이 초안 위에서 쓰는 순수 함수들) ──────────────────────
   저장소를 건드리지 않는다. 문항 상세는 저장을 누를 때만 저장하므로, 문항을 더하고
   지우는 것도 저장 전까지는 화면 안의 값이어야 한다. */

/** 세트 안에서 겹치지 않는 다음 열쇠 */
export function nextQuestionId(list: Question[]) {
  let n = list.length + 1;
  const used = new Set(list.map((q) => q.id));
  while (used.has(`q${n}`)) n += 1;
  return `q${n}`;
}

/**
 * 세트에 붙일 새 문항.
 *
 * 분류는 **바로 앞 문항에서 물려받는다**. 세트는 같은 자료를 놓고 묻는 것이라 성취기준과
 * 재능 축이 같은 경우가 대부분이고, 다르면 그 자리에서 고치면 된다. 빈 채로 두면 문항을
 * 더할 때마다 성취기준 코드부터 다시 찾아 적어야 한다.
 *
 * 단계와 난이도까지 물려받는 것은 조금 다른 까닭이다 — 세트로 단계를 올릴 생각이면
 * 앞 문항가 어디였는지가 그 자리에서 보여야 무엇을 올릴지 정할 수 있다.
 */
export function blankQuestion(
  list: Question[],
  type: ItemType = "choice",
  /**
   * level — 단계를 정해 두고 만든다(세트의 단계별 문항 수). 배점은 앞 문항이 아니라 그 단계의
   *   기본 배점으로 시작한다 — S1 문항의 1점을 S4 문항이 물려받으면 매핑을 벗어난 채 선다.
   * from — 분류를 물려받을 문항. 없으면 목록의 마지막 문항이다.
   */
  opts: { level?: Level; from?: Question } = {},
): Question {
  const prev = opts.from ?? list[list.length - 1];
  const level = opts.level ?? prev?.level ?? "S1";
  /* 앞 문항에 적어 둔 배점을 물려받는다. 단계를 물려받는 것과 같은 까닭이고, 앞 문항이
     없거나 비워 두었으면 단계의 기본 배점으로 시작한다.
     ⚠ 문항 쪽에 실어 보낸다. fillQuestion은 태그 쪽 배점을 읽지 않는다 — 옛 납작한 문항을
       풀 때 그 자리에 세트 총점이 들어 있을 수 있어서다 */
  const points =
    !opts.level && prev && prev.points > 0 ? prev.points : levelSpecs[level].points;
  return fillQuestion({ id: nextQuestionId(list), type, points }, list.length, {
    standardCode: prev?.standardCode ?? "",
    standardText: prev?.standardText ?? "",
    tagADetail: "",
    talent: prev?.talent ?? "LANG",
    subskill: prev?.subskill ?? subskillsOf(prev?.talent ?? "LANG")[0].code,
    level,
    b: prev?.b ?? null,
    points,
  });
}

/** 세트 안의 단계별 문항 수 */
export function levelCountsOf(list: Pick<Question, "level">[]): Record<Level, number> {
  const counts: Record<Level, number> = { S1: 0, S2: 0, S3: 0, S4: 0 };
  for (const q of list) counts[q.level] += 1;
  return counts;
}

/**
 * 사람이 적은 것이 있는 문항인가.
 *
 * 성취기준 코드 · 내용 · 재능 축 · 난이도처럼 새 문항이 앞 문항에서 물려받는 값은 세지 않는다 —
 * 세면 방금 +로 만든 빈 문항도 적은 것이 있는 문항이 된다. 학습 요소(tagADetail)는 물려받지
 * 않고 늘 빈 채로 시작하므로(blankQuestion) 센다.
 */
export function questionHasContent(q: Question) {
  const texts = [
    q.tagADetail,
    q.stem,
    q.explain,
    q.rubric,
    q.shortAnswers,
    q.acceptExamples,
    q.rejectExamples,
    q.perspectiveHierarchy,
    q.perspectiveAbility,
    q.wrongIntent,
    q.tagAIntent,
    ...q.choices,
    ...q.distractorIntent,
  ];
  return q.stemImages.length > 0 || texts.some((t) => t.trim() !== "");
}

/**
 * 세트의 한 단계 문항 수를 맞춘다 — 문항 구성에서 「S2 2문항」으로 적은 대로.
 *
 * 늘리면 그 단계의 빈 문항을 **단계 차례 자리**(그 단계 이하 문항들 뒤)에 끼운다. 세트는 한
 * 자료를 놓고 S1 → S4로 올려 묻는 꼴이라, 맨 뒤에 붙이면 S3 뒤에 S1이 선다.
 * 새 문항은 단계의 처음 형식(typeForLevel)과 기본 배점으로 시작하고, 분류는 끼운 자리 바로
 * 앞 문항에서 물려받는다.
 *
 * 줄이면 그 단계의 **뒤에서부터** 뺀다. 어느 문항을 뺄지 고르게 하지 않는 것은 이 칸이 수를
 * 적는 칸이라서다 — 특정 문항을 빼려면 목록에서 그 줄의 지우기를 누른다. 적은 것이 있는 문항이
 * 빠지는지는 화면이 먼저 묻는다(questionHasContent).
 */
export function setLevelCount(list: Question[], level: Level, count: number): Question[] {
  const same = list.filter((q) => q.level === level);
  if (count === same.length) return list;
  if (count < same.length) {
    const drop = new Set(same.slice(Math.max(0, count)).map((q) => q.id));
    return list.filter((q) => !drop.has(q.id));
  }
  const next = [...list];
  for (let k = same.length; k < count; k += 1) {
    const { at, from } = levelInsertAt(next, level);
    next.splice(at + 1, 0, blankQuestion(next, typeForLevel[level], { level, from }));
  }
  return next;
}

/**
 * 그 단계 문항을 하나 더할 때 끼울 자리(at 뒤)와 분류를 물려줄 문항(from).
 *
 * 화면의 + 단추(ItemDetail)가 늘릴 수 있는지를 **이 from의 재능 축**으로 본다. 한동안 단추는 첫
 * 문항의 축을, 저장소는 끼울 자리 앞 문항의 축을 봐서 — 첫 문항은 언어-기호인데 앞 문항이
 * 자기-성찰인 세트에서 +를 누르면 자기-성찰이 다룰 수 없는 S4 문항이 생겼다.
 */
export function levelInsertAt(list: Question[], level: Level) {
  const rank = (l: Level) => LEVELS_ALL.indexOf(l);
  let at = -1;
  list.forEach((q, i) => {
    if (rank(q.level) <= rank(level)) at = i;
  });
  return { at, from: list[at] ?? list[0] };
}

/**
 * 유형을 바꾼다.
 *
 * **적어 둔 글은 하나도 지우지 않는다.** 한동안 OX로 갈 때 보기를 「맞다·아니다」로
 * 갈아 끼우고 돌아올 때 빈 넉 칸으로 되돌렸는데, 유형 고르개가 라디오 묶음이 되고 나서
 * 그것이 그대로 사고가 됐다 — 라디오는 방향키가 지나가는 항목을 실제로 고르므로,
 * 객관식에서 서술형까지 세 칸 내려가는 동안 OX를 통과하면서 보기 넉 줄과 오답 의도가
 * 소리 없이 날아갔다. 되돌아와도 살아나지 않는다.
 *
 * 그래서 보기는 저장해 둔 채로 두고, 화면과 채점이 볼 때만 choicesOf가 갈아 끼운다.
 * 여기서 손대는 것은 정답 자리 하나뿐이다 — OX는 보기가 둘이라 3번을 정답으로 둔 채
 * 넘어가면 없는 보기를 가리키게 된다. 이건 다시 누르면 그만이고, 무엇보다 화면에 보인다.
 */
export function retypeQuestion(q: Question, type: ItemType): Question {
  if (q.type === type) return q;
  return type === "ox" ? { ...q, type, answer: Math.min(q.answer, 1) } : { ...q, type };
}

/** 목록의 유형 칸 — 세트는 안에 든 유형을 모아 적는다 */
export function typeTextOf(i: ItemDraft) {
  const kinds = [...new Set(i.questions.map((q) => q.type))].map(typeLabel).join(" · ");
  return kinds || typeLabel(i.type);
}

/**
 * 목록의 구성 칸 — 단일인가 세트인가, 세트면 몇 문항인가.
 *
 * 한동안 유형 칸에 「세트 3문 · 서술형 · OX」로 함께 적었는데, 그러면 그 칸이 두 가지를
 * 답하느라 어느 쪽도 훑을 수 없다. 세트를 찾을 때는 「세트」만, 형식을 볼 때는 유형만
 * 보면 되도록 칸을 가른다. 문항 수를 함께 적는 것은 그것이 세트에서 가장 먼저 묻는
 * 것이기 때문이다 — 회차에 담을 때 몇 칸을 먹는지가 거기서 정해진다.
 */
export function formTextOf(i: ItemDraft) {
  return i.form === "set" ? `세트 ${i.questions.length}문항` : "단일";
}

/**
 * 표시용 태그를 구조화된 값에서 만든다.
 *
 * 검수 워크벤치와 문항 은행은 tagA·tagB 한 줄만 읽는다. 출제 폼에서 성취기준과
 * Tag B 좌표를 고칠 때마다 그 두 줄을 다시 만들어 둬야 다른 화면이 옛 값을 보지
 * 않는다.
 */
export function syncTags(item: ItemDraft): Pick<ItemDraft, "tagA" | "tagB"> {
  const first = item.questions[0];
  const rest = item.questions.length - 1;

  /* ⚠ 좌표는 **첫 문항의 단계**로 짓는다. 문항 쪽 level은 세트에서 가장 높은 것이라,
       그걸 첫 문항의 축·세부기능과 붙이면 어느 문항도 서 있지 않은 좌표가 나온다.
       자기-성찰 축은 S4를 다루지 않는데, 「자기-성찰 S1 + 언어-기호 S4」 세트가
       「INTRA-01·S4」라는 blueprint가 금지한 좌표로 저장되던 자리다. */
  const coord = tagBCoord(first.talent, first.subskill, first.level);
  const sub =
    item.subTalent && item.subSubskill
      ? ` (부: ${tagBCoord(item.subTalent, item.subSubskill, first.level)})`
      : "";

  /* 세트는 한 줄로 줄일 수 없다. 첫 문항를 적고 몇 문이 더 있는지를 덧붙인다 —
     목록에서 「이 세트가 무엇으로 시작하는가」는 답이 되고, 나머지를 대표한다고
     거짓말하지는 않는다. 온전한 것은 문항 목록이 보여 준다. */
  const tail = rest > 0 ? ` 외 ${rest}문` : "";
  const codes = new Set(item.questions.map((q) => q.standardCode).filter(Boolean));
  const a =
    rest > 0 && codes.size > 1
      ? `${first.standardCode} 외 ${codes.size - 1}개 성취기준`
      : [first.standardCode, first.tagADetail].filter(Boolean).join(" ");

  return { tagA: a, tagB: `${coord}${sub}${tail}` };
}

/* ───────────────────────── 문항 ID ─────────────────────────
 *
 *   연월일 - 학년 - 과목 - 문항 유형 - 단계 - 일련번호
 *   260904 -  34  -  K  -    C    -  S1 -   001
 *
 * 사람이 손으로 적던 칸이었다. 그런데 손으로 적으면 반드시 어긋난다 — 학년군을 5~6으로
 * 옮기고 코드의 앞자리는 그대로 두거나, 같은 번호를 두 문항이 갖거나, 아예 비워 둔 채로
 * 검수까지 올라갔다. 코드에 담긴 것이 전부 문항 안에 이미 있는 값이라, 적게 할 이유가
 * 없다. 읽을 때마다 다시 만든다.
 *
 * ⚠ 그래서 코드는 **변한다**. 학년군이나 단계를 고치면 코드도 따라 바뀐다 — 그게 코드에
 *   그 값들을 넣는 이유다. 변하지 않는 열쇠는 id(IT-2601)이고, 주소와 기록이 쓰는 것도
 *   그쪽이다.
 *
 * ⚠ 세트는 **첫 문항의** 유형과 단계로 짓는다. 문항 쪽 level은 세트에서 가장 높은 것이라
 *   첫 문항의 유형과 짝지으면 어느 문항에도 없는 조합이 된다(syncTags와 같은 까닭).
 */

/**
 * 일련번호를 뺀 앞부분. 이것이 같은 문항끼리 번호를 나눠 가진다.
 *
 * ⚠ 유형 한 글자는 itemTypes에서 꺼낸다. 여기에 Record를 따로 세우면 안 된다 — SEED가
 *   이 파일 위쪽에서 withCodes를 부르는데, 그 시점에 아래쪽 const는 아직 서지 않았다(TDZ).
 *   itemTypes는 파일 맨 앞이라 안전하다.
 */
export function codePrefix(item: ItemDraft): string {
  const first = item.questions[0];
  /* 만든 날. 씨앗과 옛 저장분에는 createdAt이 없어 updatedAt으로 메운다(fill) */
  const day = (item.createdAt || item.updatedAt || "").replace(/\D/g, "").slice(2, 8);
  const grade = item.band.replace("-", "");
  const subject = SUBJECT_LETTER[item.subject] ?? "X";
  const type = itemTypes.find((t) => t.id === first.type)?.letter ?? "X";
  return `${day || "000000"}-${grade}-${subject}-${type}-${first.level}`;
}

/**
 * 목록 전체에 코드를 매긴다.
 *
 * 일련번호는 **앞부분이 같은 것끼리** 1부터 센다. 만든 차례(createdAt, 같으면 id)로
 * 줄을 세워 매기므로, 새 문항이 목록 맨 앞에 꽂혀도 이미 매긴 번호가 밀리지 않는다 —
 * 번호가 밀리면 어제 인쇄한 문항 목록이 오늘 틀린 것이 된다.
 */
function withCodes(list: ItemDraft[]): ItemDraft[] {
  const order = [...list].sort(
    (a, b) => (a.createdAt || "").localeCompare(b.createdAt || "") || a.id.localeCompare(b.id),
  );
  const used = new Map<string, number>();
  const made = new Map<string, string>();
  for (const item of order) {
    const prefix = codePrefix(item);
    const n = (used.get(prefix) ?? 0) + 1;
    used.set(prefix, n);
    made.set(item.id, `${prefix}-${String(n).padStart(3, "0")}`);
  }
  return list.map((item) =>
    item.code === made.get(item.id) ? item : { ...item, code: made.get(item.id)! },
  );
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
    /* 새 판은 새로 고칠 문항이다. 원본에 한 제출 확인을 물려받으면 아무도 확인하지 않은
       내용에 서명이 붙은 채로 제출된다. 체크는 남긴다 — 다시 짚고 확인하면 된다 */
    signedAt: "",
    /* 만든 때를 지금으로 둔다. 원본의 날짜를 물려받으면 코드의 연월일과 일련번호가
       원본과 같아져 두 문항이 같은 이름을 갖는다 */
    createdAt: now(),
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

/**
 * 반려 — 코멘트가 붙어 출제자의 반려함으로 돌아간다.
 *
 * 사유 코드는 없어도 된다. 새 콘솔 검수판은 갈래마다 확인 · 반려만 짚고 반려 내용도 선택으로
 * 받는다 — 어느 갈래에서 반려했는지는 checks에 남는다. 옛 콘솔 검수는 그대로 코드를 넘긴다.
 */
export function rejectItem(
  id: string,
  by: string,
  code: RejectCode | undefined,
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
      {
        at,
        by,
        round: item.reviews.length + 1,
        verdict: "reject",
        checks,
        code,
        text,
        self,
      },
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
      {
        at,
        by,
        round: item.reviews.length + 1,
        verdict: "approve",
        checks,
        text,
        self,
      },
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
export function setAnchor(id: string, on: boolean, by: string, role: StaffRoleId, reason: string) {
  const item = read().find((i) => i.id === id);
  if (!item) return null;
  if (on && (item.state !== "approved" || item.disclosed)) return null;
  patchItem(id, {
    anchor: on,
    comments: [
      ...item.comments,
      {
        at: now(),
        by,
        role,
        kind: "note",
        text: `${on ? "앵커 지정" : "앵커 해제"} — ${reason}`,
      },
    ],
  });
  return item;
}

/**
 * 승인된 문항을 회차에서 뺀다.
 *
 * 지우지 않는다. 상태만 바꾸고 누가 언제 뺐는지를 남긴다 — 이 문항으로 이미 판정한
 * 결과가 있는데 문항이 사라지면 그 판정을 설명할 길이 없어진다. 되돌릴 수도 있어야 해서
 * 코멘트로도 남겨 둔다.
 *
 * 까닭은 받으면 적고, 없어도 뺀다. 옛 콘솔은 까닭을 받는 대화상자를 거치지만, 슈퍼 관리자
 * 콘솔은 문항 상세 머리의 사용 스위치 하나로 켜고 끈다(app/(admin2)/admin2/items/[id]).
 * 되돌리는 것도 같은 스위치 한 번이라, 까닭 칸이 문턱이 되면 스위치가 스위치 노릇을 못 한다.
 */
export function retireItem(id: string, by: string, role: StaffRoleId, reason = "") {
  const item = read().find((i) => i.id === id);
  if (!item || item.state !== "approved") return null;
  patchItem(id, {
    state: "retired",
    retiredAt: now(),
    retiredBy: by,
    retireReason: reason || undefined,
    comments: [
      ...item.comments,
      { at: now(), by, role, kind: "note", text: reason ? `사용 중지 — ${reason}` : "사용 중지" },
    ],
  });
  return item;
}

/** 사용 중지한 문항을 다시 쓴다 */
export function restoreItem(id: string, by: string, role: StaffRoleId, reason = "") {
  const item = read().find((i) => i.id === id);
  if (!item || item.state !== "retired") return null;
  patchItem(id, {
    state: "approved",
    retiredAt: undefined,
    retiredBy: undefined,
    retireReason: undefined,
    comments: [
      ...item.comments,
      { at: now(), by, role, kind: "note", text: reason ? `다시 씀 — ${reason}` : "다시 씀" },
    ],
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
  const out = missingContent(i);

  if (!i.guidance.trim()) out.push("출제자 유의사항");

  const left = checksLeft(i);
  if (left > 0) out.push(`체크리스트 ${left}항목`);

  return out;
}

/** 자가 체크리스트에서 아직 짚지 않은 항목 수 */
export function checksLeft(i: Pick<ItemDraft, "checks">) {
  return submitChecklist.filter((c) => !c.auto && !i.checks.includes(c.id)).length;
}

/**
 * 새 콘솔(app/(admin2)/admin2/items/[id])의 제출 문턱 — 문항 · 문항 카드 · 제출 확인.
 *
 * 한동안 그 콘솔은 체크리스트와 출제자 유의사항 판을 걷고 문항 내용만으로 문턱을 쟀다.
 * 쓰는 사람과 검수하는 사람이 같다고 봤기 때문이다. 그런데 문항을 쓰는 것은 전문가단의
 * 출제위원이고, 검수 · 채점하는 사람이 따로 있다 — 출제위원이 무엇을 짚고 냈는지가 서명과
 * 함께 남아야 검수자가 같은 곳을 두 번 읽지 않는다. 그래서 체크리스트와 서명을 문턱에 되돌린다.
 * 출제자 유의사항은 문턱에 넣지 않는다. 짚어 둘 것이 없는 문항도 있다.
 */
export function missingSubmit(i: ItemDraft) {
  return [...missingContent(i), ...missingCard(i), ...missingAttest(i)];
}

/**
 * 문항 카드의 나머지 칸 — 출제 의도 · 인정/불인정 예 · 재능 평가 관점.
 *
 * missingContent와 가른 것은 옛 콘솔(components/admin/ItemCard.tsx) 때문이다. 그 화면에는
 * 이 칸들이 없어서, 한 함수에 넣으면 옛 콘솔에서 쓴 문항은 영영 제출하지 못한다.
 */
export function missingCard(i: ItemDraft) {
  const out: string[] = [];
  for (const [n, q] of i.questions.entries()) {
    const tag = i.form === "set" ? `${n + 1}번 ` : "";
    if (!q.tagAIntent.trim()) out.push(`${tag}출제 의도`);
    /* 선택형은 정오로 채점해 인정할 답이 보기 하나뿐이다. 칸은 열려 있어 적어도 되지만
       비었다고 막지는 않는다 */
    if (!hasChoices(q.type)) {
      if (!q.acceptExamples.trim()) out.push(`${tag}인정 예`);
      if (!q.rejectExamples.trim()) out.push(`${tag}불인정 예`);
    }
    if (!q.perspectiveHierarchy.trim() || !q.perspectiveAbility.trim()) {
      out.push(`${tag}재능 평가 관점`);
    }
  }
  return out;
}

/** 제출 확인에 모자란 것 — 체크리스트 전 항목과 서명 */
export function missingAttest(i: ItemDraft) {
  const out: string[] = [];
  const left = checksLeft(i);
  if (left > 0) out.push(`자가 체크리스트 ${left}항목`);
  if (!i.signedAt) out.push("제출 확인");
  return out;
}

/**
 * 형식 · 배점이 단계의 고정 매핑과 어긋나는 까닭. 맞으면 빈 글자.
 *
 *   S1 · S2   선택(객관식 · OX) 1점
 *   S3        단답 2점, 또는 서술 · 논술 3점
 *   S4        서술 · 논술 3점
 *   0.5점 단위는 없다
 *
 * 체크리스트 한 줄과 형식 칸의 경고가 같은 것을 본다. 막지는 않는다 — 배점은 사람이 적는
 * 값이고(Question.points), 매핑을 벗어난 까닭을 검토 요청에 적고 낼 수도 있다.
 *
 * ⚠ 이미지 첨부는 매핑에 없다. 손으로 그리거나 써서 찍어 올리는 답이라 서술과 같이 센다.
 */
export function formatIssue(q: Pick<Question, "level" | "type" | "points">): string {
  if (q.points > 0 && !Number.isInteger(q.points)) return "배점에 0.5점 단위를 쓰지 않습니다.";
  const low = q.level === "S1" || q.level === "S2";
  const points = low ? 1 : q.type === "short" ? 2 : 3;
  if (typeFitsLevel(q.level, q.type) && q.points === points) return "";
  const mapping = low ? "선택 1점" : q.level === "S3" ? "단답 2점 또는 서술 · 논술 3점" : "서술 · 논술 3점";
  return `${q.level} 고정 매핑은 ${mapping}입니다.`;
}

/**
 * 그 단계에 낼 수 있는 형식인가 — 배점은 보지 않는다.
 *
 * 형식 칸 · 체크리스트(formatIssue)와 AI 검수(lib/itemAudit.ts)가 이 하나를 본다. 한동안 AI
 * 검수는 단계마다 형식을 하나로 못 박은 typeForLevel(S3 = 단답)과 견주어, 고정 매핑이 허락하는
 * S3 서술형 · S1 OX를 반려했다 — 화면은 맞다고 하고 검수는 틀렸다고 하는 규칙 두 벌이었다.
 * typeForLevel은 새 문항이 처음 받는 형식으로만 남는다.
 *
 * function으로 둔다. 이 파일 위쪽의 SEED가 불리는 때에는 아래쪽 const가 아직 서지 않는다(TDZ).
 */
export function typeFitsLevel(level: Level, type: ItemType) {
  const written = type === "descriptive" || type === "essay" || type === "image";
  if (level === "S1" || level === "S2") return hasChoices(type);
  if (level === "S3") return type === "short" || written;
  return written;
}

/** 단계에 낼 수 있는 형식을 글로 — 「단답형 또는 서술 · 논술형」 */
export function levelTypesText(level: Level) {
  if (level === "S1" || level === "S2") return "선택형(객관식 · OX)";
  return level === "S3" ? "단답형 또는 서술 · 논술형" : "서술 · 논술형";
}

/**
 * 정답 보기가 혼자 가장 긴가 — 발문을 안 읽고 길이로 답을 고르는 단서.
 *
 * 같은 길이의 보기가 있으면 단서가 아니다. 보기를 다 쓰기 전에는 보지 않는다 — 빈 보기를
 * 두고 「정답이 가장 길다」고 하면 쓰는 중인 사람에게 틀린 말을 한다.
 */
export function answerIsLongest(q: Pick<Question, "type" | "choices" | "answer">) {
  if (q.type !== "choice" || !q.choices.every((c) => c.trim())) return false;
  const lens = q.choices.map((c) => c.trim().length);
  return lens.every((l, k) => k === q.answer || l < lens[q.answer]);
}

/**
 * 적은 예가 몇 개인가.
 *
 * 예 하나가 여러 줄에 걸치기도 한다(「·(1) … (2) …」). 그래서 이렇게 센다 —
 *   1. 줄 맨 앞에 글머리표(· • ▪ ■ - *)가 있으면 그 줄 수. 들여 쓴 줄의 글머리표는 세지
 *      않는다 — 불인정 사유를 한 칸 들여 「- 단위 누락」으로 달면 예 하나가 둘로 잡힌다.
 *   2. 글머리표가 없고 빈 줄이 있으면 빈 줄로 가른 덩어리 수.
 *   3. 둘 다 없으면 글이 있는 줄 수 — 짧은 예를 한 줄에 하나씩 적은 것이다.
 */
export function exampleCount(text: string) {
  const lines = text.split("\n");
  const bullets = lines.filter((line) => /^[·•▪■*-]/.test(line)).length;
  if (bullets > 0) return bullets;
  if (/\n\s*\n/.test(text.trim())) {
    return text.split(/\n\s*\n/).filter((block) => block.trim()).length;
  }
  return lines.filter((line) => line.trim()).length;
}

/**
 * 문항 자체에 모자란 것 — 문항 카드의 나머지 칸 · 체크리스트 · 서명을 뺀 나머지.
 *
 * 옛 콘솔은 여기에 출제자 유의사항과 체크리스트를 더해 잰다(missingFields). 새 콘솔은 문항
 * 카드와 제출 확인을 더해 잰다(missingSubmit).
 */
export function missingContent(i: ItemDraft) {
  const out: string[] = [];
  /* 문항 ID는 저장소가 매긴다(withCodes). 사람이 채우는 칸이 아니라 여기서 보지 않는다 */
  if (!i.unit.trim()) out.push("교과 단원");

  /* 세트는 자료와 문항 수가 성립 조건이다. 보기 없는 세트는 문항 둘을 붙여 놓은
     것일 뿐이고, 문항이 하나뿐인 세트는 단일이라고 부르는 게 맞다 */
  if (i.form === "set") {
    if (passageIsEmpty(i)) out.push("세트 보기");
    if (i.questions.length < 2) out.push("세트 문항 2개 이상");
  }

  /* 분류는 문항마다 본다. 세트 안에서 단계가 갈리는 것이 세트를 두는 까닭이라,
     문항 한 벌만 보면 2번 문항의 빈 성취기준을 아무도 못 잡는다 */
  for (const [n, q] of i.questions.entries()) {
    /* 단일이면 「발문」, 세트면 「2번 발문」 — 어느 문항가 비었는지 알아야 고칠 수 있다 */
    const tag = i.form === "set" ? `${n + 1}번 ` : "";
    out.push(...missingInQuestion(q, tag, i.band));
  }

  return out;
}

/** 발문이 비었는가 — 갈래마다 「비었다」의 뜻이 다르다 */
export function stemIsEmpty(q: Question) {
  return q.stemMode === "images" ? q.stemImages.length === 0 : q.stem.trim() === "";
}

/**
 * 목록 한 줄에 세울 발문.
 *
 * 갈래마다 「글」이 있는 자리가 달라서 q.stem만 읽으면 이미지로 쓴 문항이 죄다 빈 줄로
 * 선다. 표기(마크다운 #, HTML 태그)는 걷어 낸다 — 목록에서 `## 다음 중`을 읽어야 할
 * 이유가 없다.
 */
export function stemSummary(q: Question): string {
  if (q.stemMode === "images") {
    return q.stemImages.length > 0 ? `그림 ${q.stemImages.length}장` : "";
  }
  return q.stem
    .replace(/<[^>]*>/g, " ")
    .replace(/[#*`>_[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** 지문이 비었는가 */
export function passageIsEmpty(i: ItemDraft) {
  return i.passageMode === "images" ? i.passageImages.length === 0 : i.passage.trim() === "";
}

/** 문항 하나에 모자란 것 */
function missingInQuestion(q: Question, tag: string, band: GradeBand): string[] {
  const out: string[] = [];

  if (!checkStandardCode(q.standardCode, band).ok) out.push(`${tag}성취기준 코드`);
  if (!q.standardText.trim()) out.push(`${tag}성취기준 내용`);
  if (!q.tagADetail.trim()) out.push(`${tag}학습 요소`);
  if (!levelAllowed(q.talent, q.level)) out.push(`${tag}Tag B 단계 범위`);
  if (!difficultyPicked(q.b)) out.push(`${tag}난이도`);
  /* 배점은 사람이 적는 칸이라 비울 수 있다. 0점 문항은 맞혀도 총점에 아무것도 보태지 않는다 */
  if (!(q.points > 0)) out.push(`${tag}배점`);

  if (stemIsEmpty(q)) out.push(`${tag}발문`);
  if (!q.explain.trim()) out.push(`${tag}모범답안`);

  if (q.type === "choice") {
    if (!q.choices.every((c) => c.trim())) out.push(`${tag}보기`);
    // 오답마다 어떤 오개념을 잡는지 적지 않으면 변별도가 죽는다(§1.1)
    const bad = q.choices.some(
      (c, n) => c.trim() && n !== q.answer && !q.distractorIntent[n]?.trim(),
    );
    if (bad) out.push(`${tag}오답 설계 의도`);
  }
  /* 정답 번호가 보기 안에 있는가. 객관식으로 네 번째를 정답으로 두고 OX로 돌리면 번호가 그대로
     남아(retypeQuestion은 OX로 갈 때만 줄인다) 어느 쪽도 정답이 아닌 문항이 제출을 지나갔다 */
  if (hasChoices(q.type) && (q.answer < 0 || q.answer >= choicesOf(q).length)) {
    out.push(`${tag}정답`);
  }
  /* OX는 오답 의도를 받지 않는다. 틀린 쪽이 하나뿐이라 「어떤 오개념을 잡는가」가
     곧 발문이 묻는 것과 같아진다 — 같은 말을 두 번 적게 하는 칸이 된다 */
  if (q.type === "short" && !q.shortAnswers.trim()) out.push(`${tag}허용 답안`);
  if (needsRubric(q.type) && !q.rubric.trim()) out.push(`${tag}부분점수`);
  return out;
}

export function itemReady(i: ItemDraft) {
  return missingFields(i).length === 0;
}

/** 성취기준 코드 진단 — 폼에서 칸 아래에 그대로 띄운다 */
export function standardIssue(i: ItemDraft) {
  return checkStandardCode(i.standardCode, i.band);
}

/** 문항 하나의 성취기준 코드 진단 — 학년군은 문항이 쥐고 있어 따로 받는다 */
export function questionStandardIssue(q: Question, band: GradeBand) {
  return checkStandardCode(q.standardCode, band);
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
