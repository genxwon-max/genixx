import { checkStandardCode, levelAllowed, levelSpecs, subskillsOf, tagBCoord } from "./blueprint";
import { typeForLevel, typeLabel, type ItemDraft, type ReviewCheckId } from "./itemStore";

/**
 * AI 사전 검수 — 검수 3단을 기계가 먼저 한 번 훑는다.
 *
 * ⚠ 이건 검수를 대신하는 것이 아니라 앞에 붙이는 것이다. 결과는 문항 상태를 바꾸지
 *   않고 검수자 화면에 「짚어 둔 것」으로만 뜬다. 승인·반려는 언제나 사람이 누른다.
 *   AI가 낸 문항을 AI가 승인하는 길이 열리면 사람이 한 번도 안 본 문항이 검사지에
 *   들어갈 수 있고, 그 순간 이 서비스가 파는 「사람이 확정한 판정」이 거짓이 된다.
 *
 * 그래서 여기 담은 것은 「판단」이 아니라 「대조」다. 발주서와 blueprint에 이미 적혀
 * 있어서 기계가 확실히 볼 수 있는 것만 본다 — 단계와 형식의 고정 매핑, 성취기준
 * 코드의 학년군 접두, 보기 중복, 정답 길이 단서 같은 것들. 교과 내용이 맞는지,
 * 이 학년 아이가 정말 읽을 수 있는지는 여기서 알 수 없고 사람이 봐야 한다.
 *
 * 걸린 것은 두 갈래로 나눈다.
 *   block  규칙을 어긴 것. 근거가 분명해서 그대로 반려 사유가 된다.
 *   warn   그럴 소지가 있는 것. 사람이 보고 아니라고 할 수 있다.
 * 낱말 대조로 잡는 편향은 전부 warn이다 — 「아파트」가 들어갔다고 다 편향은 아니다.
 */

export type Finding = {
  tone: "block" | "warn";
  text: string;
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
const SENSITIVE: { words: string[]; why: string }[] = [
  {
    words: ["아파트", "평수", "용돈", "학원", "과외", "해외여행", "브랜드"],
    why: "가정 형편(SES)이 드러날 수 있는 소재입니다",
  },
  {
    words: ["강남", "서울 사람", "시골", "촌"],
    why: "지역에 대한 선입견을 담을 수 있는 표현입니다",
  },
  {
    words: ["엄마가 요리", "아빠가 회사", "남자는", "여자는", "여자아이", "남자아이"],
    why: "성 역할을 고정하는 표현일 수 있습니다",
  },
  {
    words: ["뚱뚱", "날씬", "못생", "예쁘장"],
    why: "외모를 평가하는 표현입니다",
  },
  {
    words: ["죽", "때리", "싸움", "혼내"],
    why: "아동 정서에 부담이 될 수 있는 소재입니다",
  },
  {
    words: ["교회", "절에", "성당"],
    why: "특정 종교가 드러나는 소재입니다",
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
    content.push({ tone: "block", text: "해설이 없습니다." });
  }

  if (item.type === "choice") {
    const filled = item.choices.map((c) => c.trim()).filter(Boolean);
    const dup = filled.length !== new Set(filled).size;
    if (dup) content.push({ tone: "block", text: "보기 중에 같은 내용이 둘 이상 있습니다." });

    const lens = item.choices.map((c) => c.trim().length);
    const answerLen = lens[item.answer] ?? 0;
    if (answerLen > 0 && answerLen === Math.max(...lens) && answerLen > Math.min(...lens) * 1.6) {
      content.push({
        tone: "warn",
        text: "정답 보기가 가장 깁니다. 내용을 몰라도 길이로 고를 수 있습니다.",
      });
    }

    const missingIntent = item.choices.some(
      (c, n) => c.trim() && n !== item.answer && !item.distractorIntent[n]?.trim(),
    );
    if (missingIntent) {
      content.push({ tone: "block", text: "오답 의도가 적히지 않은 보기가 있습니다." });
    }
  }

  if (item.type === "short") {
    const answers = item.shortAnswers
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (answers.length === 0) {
      content.push({ tone: "block", text: "허용 답안이 없습니다." });
    } else if (answers.length === 1) {
      content.push({
        tone: "warn",
        text: "허용 답안이 하나뿐입니다. 띄어쓰기·단위 표기가 달라도 정답이 되도록 넓혀 주세요.",
      });
    }
  }

  /* 학년 이독성 — 길이로만 본다. 어휘가 어려운지는 기계가 알 수 없다. */
  const longest = item.stem.split(/[.?!]/).reduce((m, s) => Math.max(m, s.trim().length), 0);
  if (longest > 60) {
    content.push({
      tone: "warn",
      text: `발문에 ${longest}자짜리 문장이 있습니다. 초등 학년에는 깁니다.`,
    });
  }

  if (/않은|아닌|없는|틀린/.test(item.stem) && !/\*\*|「|『/.test(item.stem)) {
    content.push({
      tone: "warn",
      text: "부정 발문인데 강조 표시가 없습니다. 「않은」에 표시를 해 주세요.",
    });
  }

  /* ── 2차 태깅 ── */
  const tagging: Finding[] = [];

  const std = checkStandardCode(item.standardCode, item.band);
  if (!std.ok) tagging.push({ tone: "block", text: std.why });

  if (item.type !== typeForLevel[item.level]) {
    tagging.push({
      tone: "block",
      text: `${item.level}은 ${typeLabel(typeForLevel[item.level])}이어야 하는데 ${typeLabel(item.type)}입니다.`,
    });
  }

  if (!levelAllowed(item.talent, item.level)) {
    tagging.push({
      tone: "block",
      text: `${tagBCoord(item.talent, item.subskill, item.level)} — 이 축은 ${item.level}을 다루지 않습니다.`,
    });
  }

  if (!subskillsOf(item.talent).some((s) => s.code === item.subskill)) {
    tagging.push({ tone: "block", text: "세부 기능이 재능 축에 속하지 않습니다." });
  }

  if (item.points !== spec.points) {
    tagging.push({
      tone: "warn",
      text: `${item.level}의 배점은 ${spec.points}점인데 ${item.points}점입니다.`,
    });
  }

  if (!item.standardText.trim()) {
    tagging.push({ tone: "block", text: "성취기준 내용이 비어 있습니다." });
  }

  if ((item.level === "S1" || item.level === "S2") && HIGHER_ORDER.some((w) => has(item.stem, w))) {
    tagging.push({
      tone: "warn",
      text: `${item.level} 발문이 까닭·설명을 요구합니다. 한 단계 위 조작이라 단계가 어긋날 수 있습니다.`,
    });
  }

  /* ── 3차 윤리·편향 ── */
  const ethics: Finding[] = [];

  for (const group of SENSITIVE) {
    const hit = group.words.filter((w) => has(body, w));
    if (hit.length > 0) {
      ethics.push({ tone: "warn", text: `「${hit.join("· ")}」 — ${group.why}` });
    }
  }

  /* 그림을 못 보는 학생에게는 대체 텍스트가 그림을 대신한다. 없으면 그 학생에게만
     문항이 성립하지 않으므로 공정성 문제다. 다만 장식용 그림도 있어서 warn이다. */
  const naked = item.assets.filter((f) => f.kind === "image" && !f.alt?.trim());
  if (naked.length > 0) {
    ethics.push({
      tone: "warn",
      text: `그림 ${naked.length}건에 대체 텍스트가 없습니다. 이 그림이 있어야 풀리는 문항이면 저시력·전맹 학생에게는 성립하지 않습니다.`,
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
