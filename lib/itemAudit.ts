import { checkStandardCode, levelAllowed, levelSpecs, subskillsOf, tagBCoord } from "./blueprint";
import {
  typeForLevel,
  typeLabel,
  type ItemDraft,
  type RejectCode,
  type ReviewCheckId,
} from "./itemStore";

/**
 * AI 사전 검수 — 검수 3단을 기계가 먼저 한 번 훑는다.
 *
 * ⚠ 이건 검수를 대신하는 것이 아니라 앞에 붙이는 것이다. 승인은 절대 하지 않는다.
 *   AI가 낸 문항을 AI가 승인하는 길이 열리면 사람이 한 번도 안 본 문항이 검사지에
 *   들어갈 수 있고, 그 순간 이 서비스가 파는 「사람이 확정한 판정」이 거짓이 된다.
 *
 *   반려는 다르다. 반려는 문항을 출제자에게 되돌릴 뿐이라 검증 안 된 문항이 밖으로
 *   나가지 않는다. 그래서 규칙을 명백히 어긴 것(block)은 기계가 반려까지 하고, 왜
 *   반려했는지를 사람 검수자와 똑같은 자리에 똑같은 형식으로 적는다 — 반려 사유
 *   코드, 3단 소견, 그리고 무엇을 어떻게 고쳐야 하는지를 담은 소견문.
 *
 * 그래서 여기 담은 것은 「판단」이 아니라 「대조」다. 발주서와 blueprint에 이미 적혀
 * 있어서 기계가 확실히 볼 수 있는 것만 본다 — 단계와 형식의 고정 매핑, 성취기준
 * 코드의 학년군 접두, 보기 중복, 정답 길이 단서 같은 것들. 교과 내용이 맞는지,
 * 이 학년 아이가 정말 읽을 수 있는지는 여기서 알 수 없고 사람이 봐야 한다.
 *
 * 걸린 것은 두 갈래로 나눈다.
 *   block  규칙을 어긴 것. 근거가 분명해서 그대로 반려 사유가 된다 — 기계가 반려한다.
 *   warn   그럴 소지가 있는 것. 사람이 보고 아니라고 할 수 있다 — 짚어만 둔다.
 * 낱말 대조로 잡는 편향은 전부 warn이다 — 「아파트」가 들어갔다고 다 편향은 아니다.
 */

export type Finding = {
  tone: "block" | "warn";
  /** 무엇이 걸렸는가 */
  text: string;
  /**
   * 무엇을 어떻게 고쳐야 하는가.
   *
   * 걸린 곳만 적고 돌려보내면 출제자는 「그래서 어쩌라는 것인가」를 다시 물어야 한다.
   * 사람 검수자는 반려할 때 이걸 함께 적으므로, 기계도 같이 적는다.
   */
  fix: string;
  /** 사람이 고르는 것과 같은 반려 사유 코드 — 통계를 한 통에 담으려고 목록을 나누지 않는다 */
  code: RejectCode;
  /** 검수 3단의 「걸림」 소견 id (checkReasons). 딱 맞는 말이 없으면 비운다. */
  reason?: string;
};

export type AuditCheck = {
  id: ReviewCheckId;
  /** 걸린 것이 없으면 true. block이 하나라도 있으면 false. */
  ok: boolean;
  findings: Finding[];
};

export type AuditResult = {
  checks: AuditCheck[];
  blocks: number;
  warns: number;
};

/* ── 편향·정서 낱말 ──
   낱말이 있다고 편향인 것은 아니다. 「우리 아파트 앞 놀이터」는 괜찮고 「몇 평
   아파트에 사는지」는 안 된다. 그래서 잡아서 사람에게 넘길 뿐 막지 않는다. */
const SENSITIVE: { words: string[]; why: string; fix: string; reason: string }[] = [
  {
    words: ["아파트", "평수", "용돈", "학원", "과외", "해외여행", "브랜드"],
    why: "가정 형편(SES)이 드러날 수 있는 소재입니다",
    fix: "형편과 무관하게 누구나 겪는 소재로 바꿔 주세요.",
    reason: "e-b-ses",
  },
  {
    words: ["강남", "서울 사람", "시골", "촌"],
    why: "지역에 대한 선입견을 담을 수 있는 표현입니다",
    fix: "지역을 특정하지 않는 표현으로 바꿔 주세요.",
    reason: "e-b-region",
  },
  {
    words: ["엄마가 요리", "아빠가 회사", "남자는", "여자는", "여자아이", "남자아이"],
    why: "성 역할을 고정하는 표현일 수 있습니다",
    fix: "역할을 성별과 묶지 않는 표현으로 바꿔 주세요.",
    reason: "e-b-gender",
  },
  {
    words: ["뚱뚱", "날씬", "못생", "예쁘장"],
    why: "외모를 평가하는 표현입니다",
    fix: "외모를 평가하지 않는 표현으로 바꿔 주세요.",
    reason: "e-b-label",
  },
  {
    words: ["죽", "때리", "싸움", "혼내"],
    why: "아동 정서에 부담이 될 수 있는 소재입니다",
    fix: "부담이 덜한 소재로 바꿔 주세요.",
    reason: "e-b-emotion",
  },
  {
    words: ["교회", "절에", "성당"],
    why: "특정 종교가 드러나는 소재입니다",
    fix: "종교가 드러나지 않는 소재로 바꿔 주세요.",
    reason: "e-b-belief",
  },
];

/** S1·S2가 요구하면 단계 오류가 되는 말 */
const HIGHER_ORDER = ["까닭을", "왜 그런지", "설명하시오", "근거를", "판단하"];

const has = (text: string, word: string) => text.includes(word);

export function auditItem(item: ItemDraft): AuditResult {
  const spec = levelSpecs[item.level];
  const body = [item.passage, item.stem, ...item.choices, item.explain, item.rubric].join(" ");

  /* ── 1차 내용 ── */
  const content: Finding[] = [];

  if (!item.explain.trim()) {
    content.push({
      tone: "block",
      text: "해설이 없습니다.",
      fix: "정답이 왜 답인지, 오답은 왜 아닌지를 해설에 적어 주세요.",
      code: "content",
      reason: "c-b-explain",
    });
  }

  if (item.type === "choice") {
    const filled = item.choices.map((c) => c.trim()).filter(Boolean);
    const dup = filled.length !== new Set(filled).size;
    if (dup) {
      content.push({
        tone: "block",
        text: "보기 중에 같은 내용이 둘 이상 있습니다.",
        fix: "겹치는 보기를 하나로 합치고, 빈자리는 다른 오개념을 잡는 보기로 채워 주세요.",
        code: "answer",
        reason: "c-b-multi",
      });
    }

    const lens = item.choices.map((c) => c.trim().length);
    const answerLen = lens[item.answer] ?? 0;
    if (answerLen > 0 && answerLen === Math.max(...lens) && answerLen > Math.min(...lens) * 1.6) {
      content.push({
        tone: "warn",
        text: "정답 보기가 가장 깁니다. 내용을 몰라도 길이로 고를 수 있습니다.",
        fix: "보기 길이를 서로 비슷하게 맞춰 주세요.",
        code: "answer",
        reason: "c-b-distractor",
      });
    }

    const missingIntent = item.choices.some(
      (c, n) => c.trim() && n !== item.answer && !item.distractorIntent[n]?.trim(),
    );
    if (missingIntent) {
      content.push({
        tone: "block",
        text: "오답 의도가 적히지 않은 보기가 있습니다.",
        fix: "오답 보기마다 어떤 오개념을 잡으려는 것인지 한 줄씩 적어 주세요.",
        code: "content",
        reason: "c-b-distractor",
      });
    }
  }

  if (item.type === "short") {
    const answers = item.shortAnswers
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (answers.length === 0) {
      content.push({
        tone: "block",
        text: "허용 답안이 없습니다.",
        fix: "정답으로 인정할 표기를 쉼표로 나누어 적어 주세요.",
        code: "answer",
      });
    } else if (answers.length === 1) {
      content.push({
        tone: "warn",
        text: "허용 답안이 하나뿐입니다. 띄어쓰기·단위 표기가 달라도 정답이 되도록 넓혀 주세요.",
        fix: "띄어쓰기·단위·조사가 다른 표기를 함께 넣어 주세요.",
        code: "answer",
      });
    }
  }

  /* 학년 이독성 — 길이로만 본다. 어휘가 어려운지는 기계가 알 수 없다. */
  const longest = item.stem.split(/[.?!]/).reduce((m, s) => Math.max(m, s.trim().length), 0);
  if (longest > 60) {
    content.push({
      tone: "warn",
      text: `발문에 ${longest}자짜리 문장이 있습니다. 초등 학년에는 깁니다.`,
      fix: "한 문장을 두 문장으로 끊어 주세요.",
      code: "grade",
      reason: "c-b-grade",
    });
  }

  if (/않은|아닌|없는|틀린/.test(item.stem) && !/\*\*|「|『/.test(item.stem)) {
    content.push({
      tone: "warn",
      text: "부정 발문인데 강조 표시가 없습니다. 「않은」에 표시를 해 주세요.",
      fix: "「않은」·「아닌」·「없는」에 낫표나 굵은 글씨로 표시를 해 주세요.",
      code: "wording",
      reason: "c-b-vague",
    });
  }

  /* ── 2차 태깅 ── */
  const tagging: Finding[] = [];

  const std = checkStandardCode(item.standardCode, item.band);
  if (!std.ok) {
    tagging.push({
      tone: "block",
      text: std.why,
      fix: `${item.band} 학년군의 성취기준 코드로 고쳐 주세요.`,
      code: "tag",
      reason: "t-b-standard",
    });
  }

  if (item.type !== typeForLevel[item.level]) {
    tagging.push({
      tone: "block",
      text: `${item.level}은 ${typeLabel(typeForLevel[item.level])}이어야 하는데 ${typeLabel(item.type)}입니다.`,
      fix: `형식을 ${typeLabel(typeForLevel[item.level])}으로 바꾸거나, 이 문항이 실제로 재는 단계를 다시 잡아 주세요.`,
      code: "tag",
      reason: "t-b-spec",
    });
  }

  if (!levelAllowed(item.talent, item.level)) {
    tagging.push({
      tone: "block",
      text: `${tagBCoord(item.talent, item.subskill, item.level)} — 이 축은 ${item.level}을 다루지 않습니다.`,
      fix: "이 축이 다루는 단계로 낮추거나, 이 단계를 다루는 다른 축으로 옮겨 주세요.",
      code: "tag",
      reason: "t-b-level",
    });
  }

  if (!subskillsOf(item.talent).some((s) => s.code === item.subskill)) {
    tagging.push({
      tone: "block",
      text: "세부 기능이 재능 축에 속하지 않습니다.",
      fix: "고른 재능 축 아래에 있는 세부 기능으로 다시 골라 주세요.",
      code: "tag",
      reason: "t-b-subskill",
    });
  }

  if (item.points !== spec.points) {
    tagging.push({
      tone: "warn",
      text: `${item.level}의 배점은 ${spec.points}점인데 ${item.points}점입니다.`,
      fix: `배점을 ${spec.points}점으로 맞춰 주세요.`,
      code: "tag",
      reason: "t-b-spec",
    });
  }

  if (!item.standardText.trim()) {
    tagging.push({
      tone: "block",
      text: "성취기준 내용이 비어 있습니다.",
      fix: "코드에 해당하는 성취기준 문장을 그대로 옮겨 적어 주세요.",
      code: "tag",
      reason: "t-b-standard",
    });
  }

  if ((item.level === "S1" || item.level === "S2") && HIGHER_ORDER.some((w) => has(item.stem, w))) {
    tagging.push({
      tone: "warn",
      text: `${item.level} 발문이 까닭·설명을 요구합니다. 한 단계 위 조작이라 단계가 어긋날 수 있습니다.`,
      fix: "단계에 맞는 조작을 묻도록 발문을 고치거나, 단계를 한 칸 올려 주세요.",
      code: "grade",
      reason: "t-b-level",
    });
  }

  /* ── 3차 윤리·편향 ── */
  const ethics: Finding[] = [];

  for (const group of SENSITIVE) {
    const hit = group.words.filter((w) => has(body, w));
    if (hit.length > 0) {
      ethics.push({
        tone: "warn",
        text: `「${hit.join("· ")}」 — ${group.why}`,
        fix: group.fix,
        code: "bias",
        reason: group.reason,
      });
    }
  }

  /* 그림을 못 보는 학생에게는 대체 텍스트가 그림을 대신한다. 없으면 그 학생에게만
     문항이 성립하지 않으므로 공정성 문제다. 다만 장식용 그림도 있어서 warn이다. */
  const naked = item.assets.filter((f) => f.kind === "image" && !f.alt?.trim());
  if (naked.length > 0) {
    ethics.push({
      tone: "warn",
      text: `그림 ${naked.length}건에 대체 텍스트가 없습니다. 이 그림이 있어야 풀리는 문항이면 저시력·전맹 학생에게는 성립하지 않습니다.`,
      fix: "그림이 있어야 풀리는 문항이면 대체 텍스트를 넣고, 장식용이면 그렇다고 표시해 주세요.",
      code: "bias",
    });
  }

  const checks: AuditCheck[] = [
    { id: "content", findings: content, ok: !content.some((f) => f.tone === "block") },
    { id: "tagging", findings: tagging, ok: !tagging.some((f) => f.tone === "block") },
    { id: "ethics", findings: ethics, ok: !ethics.some((f) => f.tone === "block") },
  ];

  const all = [...content, ...tagging, ...ethics];
  return {
    checks,
    blocks: all.filter((f) => f.tone === "block").length,
    warns: all.filter((f) => f.tone === "warn").length,
  };
}

/* ───────────────────────── 기계가 쓰는 반려 소견 ───────────────────────── */

const CHECK_LABEL: Record<ReviewCheckId, string> = {
  content: "1차 내용",
  tagging: "2차 태깅",
  ethics: "3차 윤리·편향",
};

/** 걸린 것 하나를 두 줄로 — 무엇이 걸렸고, 무엇을 고쳐야 하는가 */
const line = (id: ReviewCheckId, f: Finding, n: number) =>
  `${n}. [${CHECK_LABEL[id]}] ${f.text}\n   → ${f.fix}`;

/**
 * 검수 결과를 반려 소견문으로 쓴다.
 *
 * 사람 검수자가 반려할 때 남기는 것과 같은 것을 남긴다 — 사유 코드 하나, 무엇이
 * 걸렸는지, 무엇을 고쳐야 하는지, 그리고 기계가 못 본 것이 무엇인지. 마지막 문단을
 * 빼면 출제자가 「AI가 다 봤다」고 읽게 되는데, 이 검수는 규칙 대조일 뿐이다.
 *
 * block이 없으면 null — 반려하지 않는다.
 */
export function auditRejection(result: AuditResult): { code: RejectCode; text: string } | null {
  const blocks = result.checks.flatMap((c) =>
    c.findings.filter((f) => f.tone === "block").map((f) => ({ id: c.id, f })),
  );
  if (blocks.length === 0) return null;

  /* 사유 코드는 하나만 붙는다 — 사람 검수와 같은 규칙이다. 가장 많이 걸린 것을
     대표로 삼고, 같은 수면 먼저 걸린 것을 쓴다. 나머지는 본문에 다 적히므로 잃는
     것이 없다. */
  const tally = new Map<RejectCode, number>();
  for (const b of blocks) tally.set(b.f.code, (tally.get(b.f.code) ?? 0) + 1);
  const code = blocks.reduce((best, b) =>
    (tally.get(b.f.code) ?? 0) > (tally.get(best.f.code) ?? 0) ? b : best,
  ).f.code;

  const warns = result.checks.flatMap((c) => c.findings.filter((f) => f.tone === "warn"));
  const closing =
    "규칙으로 대조할 수 있는 것만 본 결과라, 교과 내용이 맞는지와 이 학년 아이가 읽을 수 있는지는 고쳐 올리신 뒤 사람 검수에서 다시 봅니다.";

  const text = [
    `AI 사전 검수에서 규칙 위반 ${blocks.length}건이 확인되어 반려합니다.`,
    "",
    ...blocks.map((b, i) => line(b.id, b.f, i + 1)),
    "",
    warns.length > 0
      ? `이 밖에 확인이 필요한 것 ${warns.length}건은 「AI가 짚은 것」에 함께 적어 두었습니다. ${closing}`
      : closing,
  ].join("\n");

  return { code, text };
}
