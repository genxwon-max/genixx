import {
  checkStandardCode,
  gradeText,
  levelAllowed,
  levelSpecs,
  subskillsOf,
  tagBCoord,
  talentOf,
} from "./blueprint";
import { questionsIn, type Block } from "./content";
import { SENSITIVE } from "./itemAudit";
import {
  contentFor,
  difficulties,
  difficultyPicked,
  exampleCount,
  hasChoices,
  levelTypesText,
  needsRubric,
  typeFitsLevel,
  typeLabel,
  type ItemDraft,
  type Question,
  type RejectCode,
  type ReviewCheckId,
} from "./itemStore";

/**
 * AI 검수 보고서 — 문항 카드 항목마다 「잘 적혔는가」를 적는다 (2026-09-22 요청).
 *
 * 한동안 AI 검수는 1차 내용 · 2차 태깅 · 3차 윤리 세 갈래로 소견을 나눠 달고, 검수자는 갈래마다
 * 확인 · 반려를 눌렀다. 그런데 출제위원이 쓰는 것은 문항 카드이고, 반려를 받으면 고치는 것도 카드의
 * 칸이다. 갈래로 나눈 소견은 「그래서 어느 칸을 고치라는 건가」를 한 번 더 옮겨야 했다. 이제 보고서는
 * 카드의 차례 그대로 선다 — 분류 → 지문 → (문항마다) 인지단계 · Tag A · 출제 의도 · Tag B · 형식 · 배점 ·
 * 난이도 · 발문 · 보기 · 정답 · 오답 설계 의도 · 정답 및 채점기준 · 인정 예 · 재능 평가 관점 → 윤리 · 편향.
 *
 * 항목마다 판정 셋 중 하나 —
 *   적합       카드에 적힌 것이 규칙에 맞는다
 *   확인 필요  그럴 소지가 있다. 검수자가 보고 아니라고 할 수 있다(낱말로 잡은 편향, 긴 문장 …)
 *   보완 필요  비었거나 규칙을 그대로 어겼다. 이대로 승인하면 안 된다
 *
 * ⚠ 이것은 규칙 대조다. 교과 내용이 맞는지, 이 학년 아이가 정말 읽을 수 있는지는 기계가 알 수 없다 —
 *   보고서는 검수자가 무엇을 먼저 볼지를 알려 줄 뿐이고, 승인 · 반려는 검수자가 한다.
 *
 * 제출된 문항은 잠겨 있어 고칠 수 없다. 그래서 보고서는 저장하지 않고 볼 때마다 문항에서 다시 만든다 —
 * AI 검수를 돌린 때의 문항과 지금 문항이 같다.
 */

export type ReportStatus = "ok" | "warn" | "fail";

export const reportStatusLabel: Record<ReportStatus, string> = {
  ok: "적합",
  warn: "확인 필요",
  fail: "보완 필요",
};

export type ReportFinding = { text: string; fix: string };

export type ReportSection = {
  /** 반려할 부분을 고를 때 쓰는 열쇠 — 세트면 문항 번호가 붙는다(「q2:stem」) */
  key: string;
  /** 카드 항목 이름 — 「발문」 */
  label: string;
  /** 세트면 몇 번 문항의 것인가. 문항 묶음 전체의 것이면 없다 */
  question?: number;
  /** 옛 검수 3단 — 기록(reviews[].checks)과 옛 콘솔이 이 갈래로 읽는다 */
  tier: ReviewCheckId;
  status: ReportStatus;
  /** 카드에 적힌 것 한 줄 — 무엇을 보고 판정했는지 */
  written: string;
  findings: ReportFinding[];
};

export type CardReport = {
  sections: ReportSection[];
  fails: number;
  warns: number;
};

const clip = (s: string, n = 90) => {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
};

const HIGHER_ORDER = ["까닭을", "왜 그런지", "설명하시오", "근거를", "판단하"];

function blockImages(blocks: Block[] = []) {
  return blocks.flatMap((b) => (b.kind === "images" ? b.images : []));
}

function section(
  base: Omit<ReportSection, "status" | "findings">,
  fails: ReportFinding[],
  warns: ReportFinding[],
): ReportSection {
  return {
    ...base,
    status: fails.length ? "fail" : warns.length ? "warn" : "ok",
    findings: [...fails, ...warns],
  };
}

export function buildCardReport(item: ItemDraft): CardReport {
  const content = contentFor(item);
  const set = item.form === "set";
  const out: ReportSection[] = [];

  /* ── 분류 (묶음 전체) ── */
  {
    const f: ReportFinding[] = [];
    const w: ReportFinding[] = [];
    if (!item.unit.trim()) {
      f.push({ text: "교과 단원이 비어 있습니다.", fix: "교과서 단원 목록에서 단원을 골라 주세요." });
    } else if (item.unitTerm && Number(item.unitTerm.split("-")[0]) !== item.gradeNo) {
      w.push({
        text: `고른 단원은 ${item.unitTerm.split("-")[0]}학년 교과서인데 문항은 ${gradeText(item.gradeNo)}입니다.`,
        fix: "학년이나 교과 단원을 맞춰 주세요.",
      });
    }
    out.push(
      section(
        {
          key: "class",
          label: "분류 (학년 · 교과 단원)",
          tier: "tagging",
          written: `${item.subject} · ${gradeText(item.gradeNo)} · ${item.unit || "단원 없음"}`,
        },
        f,
        w,
      ),
    );
  }

  /* ── 지문 ── */
  {
    const f: ReportFinding[] = [];
    const w: ReportFinding[] = [];
    const blocks = content.material.blocks;
    if (set && blocks.length === 0) {
      f.push({ text: "세트인데 함께 읽을 보기 · 지문이 없습니다.", fix: "문항들이 함께 읽는 자료를 지문 칸에 넣어 주세요." });
    }
    const naked = blockImages(blocks).filter((fig) => !fig.alt.trim()).length;
    if (naked > 0) {
      w.push({
        text: `지문 그림 ${naked}건에 대체 글이 없습니다. 저시력 · 전맹 학생에게는 그림 없이 풀어야 합니다.`,
        fix: "그림이 있어야 풀리면 대체 글을 넣어 주세요.",
      });
    }
    const text = blocks
      .flatMap((b) => (b.kind === "text" ? [b.text] : b.kind === "box" ? [b.text] : []))
      .join(" ");
    out.push(
      section(
        {
          key: "passage",
          label: set ? "보기 · 지문" : "지문",
          tier: "content",
          written: blocks.length
            ? `${content.material.lead ? `[${content.material.lead}] ` : ""}${clip(text || `${blocks.length}개 자료`)}`
            : "없음",
        },
        f,
        w,
      ),
    );
  }

  /* ── 문항마다 ── */
  const cqs = questionsIn(content);
  item.questions.forEach((q, n) => {
    const at = (id: string) => (set ? `q${n + 1}:${id}` : id);
    const qn = set ? n + 1 : undefined;
    const cq = cqs.find((c) => c.id === q.id);
    out.push(...questionSections(item, q, cq?.blocks, cq?.sampleAnswer, at, qn));
  });

  /* ── 윤리 · 편향 (묶음 전체) ── */
  {
    const body = [
      item.passage,
      ...content.material.blocks.flatMap((b) => ("text" in b && typeof b.text === "string" ? [b.text] : [])),
      ...item.questions.flatMap((q) => [q.stem, ...q.choices, q.explain, q.rubric]),
    ].join(" ");
    const w: ReportFinding[] = SENSITIVE.flatMap((g) => {
      const hit = g.words.filter((x) => body.includes(x));
      return hit.length ? [{ text: `「${hit.join(" · ")}」 — ${g.why}`, fix: g.fix }] : [];
    });
    out.push(
      section(
        {
          key: "ethics",
          label: "윤리 · 편향",
          tier: "ethics",
          written: w.length ? `걸린 낱말 ${w.length}갈래` : "성 · 지역 · 문화 · 가정 형편 편향 낱말 없음",
        },
        [],
        w,
      ),
    );
  }

  return {
    sections: out,
    fails: out.filter((s) => s.status === "fail").length,
    warns: out.filter((s) => s.status === "warn").length,
  };
}

function questionSections(
  item: ItemDraft,
  q: Question,
  extra: Block[] | undefined,
  sample: string[] | undefined,
  at: (id: string) => string,
  question: number | undefined,
): ReportSection[] {
  const out: ReportSection[] = [];
  const add = (
    id: string,
    label: string,
    tier: ReviewCheckId,
    written: string,
    f: ReportFinding[],
    w: ReportFinding[] = [],
  ) => out.push(section({ key: at(id), label, question, tier, written }, f, w));

  const choice = q.type === "choice";

  /* 인지단계 */
  {
    const f: ReportFinding[] = [];
    const w: ReportFinding[] = [];
    if (!levelAllowed(q.talent, q.level)) {
      f.push({
        text: `${talentOf(q.talent).name} 축은 ${q.level}을 다루지 않습니다.`,
        fix: "이 축이 다루는 단계로 낮추거나 다른 축으로 옮겨 주세요.",
      });
    }
    if ((q.level === "S1" || q.level === "S2") && HIGHER_ORDER.some((x) => q.stem.includes(x))) {
      w.push({
        text: `${q.level} 발문이 까닭 · 설명을 요구합니다. 한 단계 위의 조작입니다.`,
        fix: "단계에 맞는 조작을 묻도록 발문을 고치거나 단계를 한 칸 올려 주세요.",
      });
    }
    add("level", "인지단계", "tagging", `${q.level} ${levelSpecs[q.level].name}`, f, w);
  }

  /* Tag A */
  {
    const f: ReportFinding[] = [];
    const w: ReportFinding[] = [];
    const std = checkStandardCode(q.standardCode, item.band);
    if (!std.ok) f.push({ text: std.why, fix: `${gradeText(item.gradeNo)}에 맞는 2022 개정 성취기준 코드로 고쳐 주세요.` });
    if (!q.standardText.trim()) f.push({ text: "성취기준 내용이 비어 있습니다.", fix: "코드에 해당하는 성취기준 문장을 옮겨 적어 주세요." });
    if (!q.tagADetail.trim()) w.push({ text: "학습 요소가 비어 있습니다.", fix: "이 문항이 재는 학력을 한 줄로 적어 주세요." });
    add(
      "tagA",
      "Tag A (학력)",
      "tagging",
      `${q.standardCode || "코드 없음"} ${clip(q.standardText, 50)}${q.tagADetail ? ` · ${q.tagADetail}` : ""}`,
      f,
      w,
    );
  }

  /* 출제 의도 */
  add(
    "intent",
    "출제 의도",
    "content",
    q.tagAIntent.trim() ? clip(q.tagAIntent) : "없음",
    q.tagAIntent.trim() ? [] : [{ text: "출제 의도가 비어 있습니다.", fix: "이 성취기준으로 무엇을 확인하려는지 적어 주세요." }],
  );

  /* Tag B */
  add(
    "tagB",
    "Tag B (재능)",
    "tagging",
    tagBCoord(q.talent, q.subskill, q.level),
    subskillsOf(q.talent).some((sk) => sk.code === q.subskill)
      ? []
      : [{ text: "하위요소가 고른 재능 축에 속하지 않습니다.", fix: "재능 축 아래의 하위요소로 다시 골라 주세요." }],
  );

  /* 형식 · 배점 */
  {
    const f: ReportFinding[] = [];
    if (!typeFitsLevel(q.level, q.type)) {
      f.push({
        text: `${q.level}은 ${levelTypesText(q.level)}이어야 하는데 ${typeLabel(q.type)}입니다.`,
        fix: `형식을 ${levelTypesText(q.level)}으로 바꾸거나 단계를 다시 잡아 주세요.`,
      });
    }
    if (!(q.points > 0)) f.push({ text: "배점이 0입니다.", fix: "0보다 큰 배점을 적어 주세요." });
    add("format", "형식 · 배점", "tagging", `${typeLabel(q.type)} · ${q.points}점`, f);
  }

  /* 난이도 */
  add(
    "difficulty",
    "난이도",
    "tagging",
    difficultyPicked(q.b) ? `${difficulties.find((d) => d.b === q.b)?.label} (b ${q.b})` : "고르지 않음",
    difficultyPicked(q.b) ? [] : [{ text: "예상 난이도를 고르지 않았습니다.", fix: "난이도 넷 중 하나를 골라 주세요." }],
  );

  /* 발문 */
  {
    const f: ReportFinding[] = [];
    const w: ReportFinding[] = [];
    const stem = q.stemMode === "images" ? "" : q.stem;
    if (!stem.trim() && q.stemImages.length === 0) f.push({ text: "발문이 비어 있습니다.", fix: "학생에게 묻는 문장을 적어 주세요." });
    const longest = stem.split(/[.?!]/).reduce((m, x) => Math.max(m, x.trim().length), 0);
    if (longest > 60) {
      w.push({ text: `발문에 ${longest}자짜리 문장이 있습니다. 초등 학년에는 깁니다.`, fix: "한 문장을 두 문장으로 끊어 주세요." });
    }
    if (/않은|아닌|없는|틀린/.test(stem) && !/\*\*|「|『|<u>|<strong>/.test(stem)) {
      w.push({
        text: "부정 발문인데 강조 표시가 없습니다.",
        fix: "「않은」 · 「아닌」 · 「없는」에 밑줄이나 굵은 글씨로 표시해 주세요.",
      });
    }
    const naked = blockImages(extra).filter((fig) => !fig.alt.trim()).length;
    if (naked > 0) {
      w.push({ text: `발문 아래 그림 ${naked}건에 대체 글이 없습니다.`, fix: "그림이 있어야 풀리면 대체 글을 넣어 주세요." });
    }
    add("stem", "발문", "content", stem.trim() ? clip(stem) : q.stemImages.length ? `그림 ${q.stemImages.length}장` : "없음", f, w);
  }

  /* 보기 · 정답 */
  {
    const f: ReportFinding[] = [];
    const w: ReportFinding[] = [];
    let written = "";
    if (choice) {
      const filled = q.choices.map((c) => c.trim()).filter(Boolean);
      written = `보기 ${filled.length}개 · 정답 ${q.answer + 1}번`;
      if (filled.length < 2) f.push({ text: "보기가 둘보다 적습니다.", fix: "보기를 넷 이상 적어 주세요." });
      if (filled.length !== new Set(filled).size) {
        f.push({ text: "같은 내용의 보기가 둘 이상 있습니다.", fix: "겹치는 보기를 다른 오개념을 잡는 보기로 바꿔 주세요." });
      }
      if (!q.choices[q.answer]?.trim()) f.push({ text: "정답으로 고른 보기가 비어 있습니다.", fix: "정답을 다시 골라 주세요." });
      const lens = q.choices.map((c) => c.trim().length);
      const a = lens[q.answer] ?? 0;
      if (a > 0 && a === Math.max(...lens) && a > Math.min(...lens) * 1.6) {
        w.push({ text: "정답 보기가 가장 깁니다. 내용을 몰라도 길이로 고를 수 있습니다.", fix: "보기 길이를 서로 비슷하게 맞춰 주세요." });
      }
    } else if (q.type === "ox") {
      written = `정답 ${q.answer === 0 ? "O" : "X"}`;
    } else {
      const answers = (sample ?? []).filter((s) => s.trim());
      const short = q.shortAnswers.split(",").map((x) => x.trim()).filter(Boolean);
      written = answers.length ? `칸마다 정답 ${answers.length}개` : short.length ? `허용 답안 ${short.length}개` : "정답 없음";
      if (q.type === "short" && answers.length === 0 && short.length === 0) {
        f.push({ text: "허용 답안이 없습니다.", fix: "정답으로 인정할 표기를 적어 주세요." });
      } else if (q.type === "short" && answers.length === 0 && short.length === 1) {
        w.push({ text: "허용 답안이 하나뿐입니다.", fix: "띄어쓰기 · 단위 · 조사가 다른 표기를 함께 넣어 주세요." });
      }
    }
    add("answer", "보기 · 정답", "content", written, f, w);
  }

  /* 오답 설계 의도 */
  {
    const f: ReportFinding[] = [];
    const w: ReportFinding[] = [];
    let written = "";
    if (choice) {
      const need = q.choices.filter((c, k) => c.trim() && k !== q.answer).length;
      const got = q.choices.filter((c, k) => c.trim() && k !== q.answer && q.distractorIntent[k]?.trim()).length;
      written = `오답 ${need}개 중 ${got}개 적음`;
      if (got < need) f.push({ text: "오답 의도가 적히지 않은 보기가 있습니다.", fix: "오답 보기마다 잡으려는 오개념을 한 줄씩 적어 주세요." });
    } else if (!hasChoices(q.type)) {
      written = q.wrongIntent.trim() ? clip(q.wrongIntent) : "없음";
      if (!q.wrongIntent.trim()) w.push({ text: "예상 오답을 적지 않았습니다.", fix: "학생이 흔히 틀리는 답과 그 까닭을 적어 주세요." });
    } else {
      written = "OX — 해당 없음";
    }
    add("distractor", "오답 설계 의도", "content", written, f, w);
  }

  /* 정답 및 채점기준 */
  {
    const f: ReportFinding[] = [];
    if (!q.explain.trim()) f.push({ text: "모범답안(해설)이 없습니다.", fix: "정답이 왜 답인지, 오답은 왜 아닌지 적어 주세요." });
    if (needsRubric(q.type) && !q.rubric.trim()) {
      f.push({ text: "서술 · 논술형인데 부분점수/루브릭이 없습니다.", fix: "요소마다 몇 점을 주는지 적어 주세요." });
    }
    add("scoring", "정답 및 채점기준", "content", q.explain.trim() ? clip(q.explain) : "없음", f);
  }

  /* 인정 예 — 선택형은 정오로 채점해 묻지 않는다 */
  if (!hasChoices(q.type)) {
    const n = exampleCount(q.acceptExamples);
    add(
      "accept",
      "인정 예",
      "content",
      n ? `${n}개` : "없음",
      n === 0 ? [{ text: "인정 예가 없습니다.", fix: "정답으로 인정하는 답의 예를 두 개 이상 적어 주세요." }] : [],
      n === 1 ? [{ text: "인정 예가 하나뿐입니다.", fix: "두 개 이상 적어 주세요." }] : [],
    );
  }

  /* 재능 평가 관점 */
  {
    const f: ReportFinding[] = [];
    if (!q.perspectiveHierarchy.trim()) f.push({ text: "인지 처리 위계 구체가 비어 있습니다.", fix: "풀 때 일어나는 처리를 단계로 적어 주세요." });
    if (!q.perspectiveAbility.trim()) f.push({ text: "인지 능력 관련 수준이 비어 있습니다.", fix: "해내면 어떤 수준으로 읽는지 적어 주세요." });
    add(
      "perspective",
      "재능 평가 관점",
      "tagging",
      q.perspectiveHierarchy.trim() ? clip(q.perspectiveHierarchy, 60) : "없음",
      f,
    );
  }

  return out;
}

/** 보고서로 AI 검수의 권고 · 대표 사유를 낸다 — 기록(aiAudit)과 옛 콘솔이 읽는 꼴 */
export function reportVerdict(r: CardReport): {
  verdict: "approve" | "hold" | "reject";
  code?: RejectCode;
  text?: string;
} {
  const failed = r.sections.filter((s) => s.status === "fail");
  if (failed.length) {
    const tier = failed[0].tier;
    return {
      verdict: "reject",
      code: tier === "tagging" ? "tag" : tier === "ethics" ? "bias" : "content",
      text: failed
        .map((s) => `${s.question ? `${s.question}번 ` : ""}${s.label} — ${s.findings.map((x) => x.text).join(" ")}`)
        .join("\n"),
    };
  }
  return { verdict: r.warns ? "hold" : "approve" };
}

/** 보고서 항목 이름 — 세트면 「2번 · 발문」 */
export const sectionName = (s: ReportSection) => (s.question ? `${s.question}번 · ${s.label}` : s.label);
