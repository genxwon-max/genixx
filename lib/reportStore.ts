"use client";

import { useSyncExternalStore } from "react";
import type { ExamRecord } from "./examStore";
import { confidenceOf, decideType, expertNotes, scoreAxes } from "./result";

/**
 * 리포트 승인 (EXP-08).
 *
 * 이 서비스가 파는 것은 「사람이 확정한 판정」이다. 그 약속이 코드로 서 있는 자리가
 * 여기다 — **발행 전에는 보호자 화면에 결과가 보이지 않는다.** 조립은 규칙이 하고,
 * 내보내는 것은 사람이 한다.
 *
 * 그래서 리포트는 문구 덩어리가 아니라 블록의 묶음으로 든다. 블록마다 「어떤 규칙으로
 * 뽑혔고 근거 수치가 무엇인지」를 함께 담는다. 근거 없이 문장만 보여 주면 검토자는
 * 읽기 좋은 글인지만 보게 되고, 정작 이 아이 자료에서 나온 말인지는 확인할 수 없다.
 *
 * 문구를 고치면 원문을 지우지 않고 덮어 쓴다. 무엇을 왜 고쳤는지가 남아야, 같은
 * 템플릿이 다음 아이에게도 같은 문제를 일으키는지 알 수 있다.
 */

export type ReportState = "review" | "hold" | "published";

export const reportStateLabel: Record<ReportState, string> = {
  review: "검토 대기",
  hold: "보류",
  published: "발행됨",
};

export const reportStateTone: Record<ReportState, string> = {
  review: "text-amber-700",
  hold: "text-rose-700",
  published: "text-emerald-700",
};

export type ReportBlock = {
  id: string;
  /** 리포트의 어느 절에 들어가는가 */
  section: string;
  title: string;
  /** 조립 규칙 — 왜 이 블록이 뽑혔는가 */
  rule: string;
  /** 그 규칙이 본 수치 */
  evidence: string;
  /** 템플릿이 만든 원문. 고쳐도 지우지 않는다. */
  text: string;
  /** 사람이 고친 문구. 있으면 이것이 나간다. */
  override?: string;
  overrideBy?: string;
  overrideAt?: string;
  overrideWhy?: string;
};

/** 지금 나갈 문구 */
export const blockText = (b: ReportBlock) => b.override ?? b.text;

export type ReportLogEntry = {
  at: string;
  by: string;
  text: string;
};

export type ReportDoc = {
  id: string;
  studentId: string;
  student: string;
  grade: string;
  round: string;
  typeCode: string;
  typeName: string;
  confidence: string;
  assembledAt: string;
  blocks: ReportBlock[];
  state: ReportState;
  publishedAt?: string;
  publishedBy?: string;
  holdReason?: string;
  log: ReportLogEntry[];
};

/* ───────────────────────── 라벨링 점검 ─────────────────────────
   진단 윤리 헌장 7조 — 아이를 규정하는 말을 리포트에 담지 않는다.
   등급·서열·백분위는 아이를 줄 세우는 말이라 문장이 아무리 부드러워도 막는다.
   단정·비교 표현은 맥락에 따라 괜찮을 수 있어 짚기만 한다. */

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

/** 리포트 한 벌 전체를 훑는다 */
export function reportCheck(doc: ReportDoc) {
  return doc.blocks.flatMap((b) =>
    labelCheck(blockText(b)).map((f) => ({ ...f, block: b.id, title: b.title })),
  );
}

/* ───────────────────────── 씨앗 ───────────────────────── */

const b = (
  id: string,
  section: string,
  title: string,
  rule: string,
  evidence: string,
  text: string,
): ReportBlock => ({ id, section, title, rule, evidence, text });

const SEED: ReportDoc[] = [
  {
    id: "RP-2026-0311",
    studentId: "demo-0311",
    student: "김하준",
    grade: "초등 4학년",
    round: "2026 파일럿 3회차",
    typeCode: "LMN형",
    typeName: "이야기 탐험가형",
    confidence: "높음",
    assembledAt: "2026-08-16 09:20",
    state: "review",
    log: [{ at: "2026-08-16 09:20", by: "조립 규칙", text: "리포트를 조립했습니다 (블록 5)" }],
    blocks: [
      b(
        "t1",
        "재능 유형",
        "유형 판정",
        "R-01 · 측정된 축 가운데 상위 두 축의 조합으로 유형을 정한다",
        "언어 78 · 수리·논리 71 · 자연·탐구 64",
        "글에서 필요한 정보를 골라내고, 그것을 자기 문장으로 바꾸어 설명하는 데서 힘이 드러납니다. 읽기 자체보다 '읽고 나서 무엇을 하느냐'에서 차이가 납니다.",
      ),
      b(
        "t2",
        "강하게 나타난 축",
        "언어 축",
        "R-04 · 최상위 축에 붙는 해석 블록 (밴드 L3)",
        "언어 78 · 서술형 3문항 모두 근거 문장 포함",
        "서술형 답에서 답만 쓰지 않고 그렇게 생각한 까닭을 함께 적었습니다. 자료에서 찾은 표현을 자기 말로 바꾸어 쓰는 모습이 반복해서 나타납니다.",
      ),
      b(
        "t3",
        "지금은 낮게 나온 축",
        "자연·탐구 축",
        "R-05 · 최하위 축에 붙는 해석 블록. 능력 부족으로 서술하지 않는다",
        "자연·탐구 64 · 관찰 문항 2문항 무응답",
        "자연·탐구 영역은 이번 회차에서 낮게 측정되었습니다. 다만 이는 능력이 없다는 뜻이 아니라, 이 영역을 보여줄 기회가 적었을 가능성을 함께 봅니다.",
      ),
      b(
        "t4",
        "미측정 축",
        "다섯 축 안내",
        "R-09 · 1단계 진단에서 재지 않은 축에 늘 붙는 고정 블록",
        "공간·청각·신체·사회관계·자기이해",
        "다섯 축은 지필로 재기 어려워 2027 심화진단에서 측정합니다. 이번 결과의 빈 축은 '없음'이 아니라 '아직 재지 않음'입니다.",
      ),
      b(
        "t5",
        "집에서 해 볼 것",
        "활동 제안",
        "R-12 · 최상위 축 × 학년군으로 활동 모듈을 뽑는다",
        "언어 × 초등 3~4학년군",
        "책이나 기사를 읽고 '한 줄 요약 → 내 생각 한 줄' 형식으로 적어 보게 하세요. 분량보다 매일 하는 것이 중요합니다.",
      ),
    ],
  },
  {
    id: "RP-2026-0312",
    studentId: "demo-0312",
    student: "이서연",
    grade: "초등 4학년",
    round: "2026 파일럿 3회차",
    typeCode: "MLN형",
    typeName: "규칙 발견가형",
    confidence: "높음",
    assembledAt: "2026-08-16 09:21",
    state: "review",
    log: [{ at: "2026-08-16 09:21", by: "조립 규칙", text: "리포트를 조립했습니다 (블록 3)" }],
    blocks: [
      b(
        "t1",
        "재능 유형",
        "유형 판정",
        "R-01 · 측정된 축 가운데 상위 두 축의 조합으로 유형을 정한다",
        "수리·논리 84 · 언어 76",
        "수와 자료를 보면 먼저 규칙을 찾으려 합니다. 계산 속도보다 '왜 그렇게 되는지'를 설명하려는 태도에서 강점이 드러납니다.",
      ),
      /* 일부러 걸리게 둔 블록 — 점검이 무엇을 잡는지 화면에서 보여야 한다 */
      b(
        "t2",
        "강하게 나타난 축",
        "수리·논리 축",
        "R-04 · 최상위 축에 붙는 해석 블록 (밴드 L3)",
        "수리·논리 84",
        "같은 학년 상위 5% 수준의 수리 능력을 보이는 영재입니다. 또래보다 뛰어난 계산력을 갖추고 있습니다.",
      ),
      b(
        "t3",
        "집에서 해 볼 것",
        "활동 제안",
        "R-12 · 최상위 축 × 학년군으로 활동 모듈을 뽑는다",
        "수리·논리 × 초등 3~4학년군",
        "버스 시간표, 영수증, 게임 점수처럼 실제 자료에서 규칙을 찾아보는 활동이 잘 맞습니다.",
      ),
    ],
  },
  {
    id: "RP-2026-0313",
    studentId: "demo-0313",
    student: "박지우",
    grade: "초등 3학년",
    round: "2026 파일럿 3회차",
    typeCode: "NL형",
    typeName: "관찰 탐구가형",
    confidence: "참고",
    assembledAt: "2026-08-16 09:23",
    state: "review",
    log: [
      { at: "2026-08-16 09:23", by: "조립 규칙", text: "리포트를 조립했습니다 (블록 3)" },
      {
        at: "2026-08-16 09:23",
        by: "조립 규칙",
        text: "설문이 한 건도 들어오지 않아 신뢰도를 「참고」로 표시했습니다",
      },
    ],
    blocks: [
      b(
        "t1",
        "재능 유형",
        "유형 판정",
        "R-01 · 측정된 축 가운데 상위 두 축의 조합으로 유형을 정한다",
        "자연·탐구 69 · 언어 61 · 응답 시간 12분(제한 40분)",
        "관찰한 사실과 자기 생각을 구분할 줄 알고, 조건이 달라지면 결과가 어떻게 달라지는지를 연결해 봅니다.",
      ),
      b(
        "t2",
        "정보원 구성",
        "신뢰도",
        "R-20 · 관찰 설문 수로 신뢰도 표기를 정한다",
        "학생 응답만 · 보호자 0건 · 교사 0건",
        "이번 판정은 학생 응답만으로 이루어졌습니다. 보호자·교사 관찰이 더해지면 발현 조건에 대한 해석의 폭이 넓어집니다.",
      ),
      b(
        "t3",
        "미측정 축",
        "다섯 축 안내",
        "R-09 · 1단계 진단에서 재지 않은 축에 늘 붙는 고정 블록",
        "공간·청각·신체·사회관계·자기이해",
        "다섯 축은 지필로 재기 어려워 2027 심화진단에서 측정합니다. 이번 결과의 빈 축은 '없음'이 아니라 '아직 재지 않음'입니다.",
      ),
    ],
  },
  {
    id: "RP-2026-0314",
    studentId: "demo-0314",
    student: "최민준",
    grade: "초등 4학년",
    round: "2026 파일럿 3회차",
    typeCode: "NML형",
    typeName: "관찰 탐구가형",
    confidence: "보통",
    assembledAt: "2026-08-16 09:25",
    state: "review",
    log: [
      { at: "2026-08-16 09:25", by: "조립 규칙", text: "리포트를 조립했습니다 (블록 3)" },
      {
        at: "2026-08-16 09:25",
        by: "조립 규칙",
        text: "학력 부진 × 재능 강세 교차 셀에 걸려 R-31 블록을 넣었습니다",
      },
    ],
    blocks: [
      b(
        "t1",
        "재능 유형",
        "유형 판정",
        "R-01 · 측정된 축 가운데 상위 두 축의 조합으로 유형을 정한다",
        "자연·탐구 74 · 수리·논리 66",
        "본 것에서 원인을 되짚는 힘이 두드러집니다. 조건을 바꾸면 결과가 어떻게 달라지는지 스스로 물어보는 모습이 나타납니다.",
      ),
      b(
        "t2",
        "교차 해석",
        "학력과 재능이 어긋난 자리",
        "R-31 · 학력 점수는 낮은데 재능 축이 높을 때 붙는 교차 셀 블록",
        "과목 점수 하위 구간 · 자연·탐구 축 74",
        "과목 점수만 보면 낮게 보이지만, 관찰과 추론을 요구한 문항에서는 다른 모습이 나타났습니다. 지금 필요한 것은 더 많은 문제 풀이가 아니라, 이 아이가 잘 다루는 방식으로 배울 기회입니다.",
      ),
      b(
        "t3",
        "집에서 해 볼 것",
        "활동 제안",
        "R-12 · 최상위 축 × 학년군으로 활동 모듈을 뽑는다",
        "자연·탐구 × 초등 3~4학년군",
        "집에서 하는 간단한 관찰에서도 '한 번에 하나만 바꾸기'를 지키면 실험 설계 감각이 생깁니다.",
      ),
    ],
  },
];

const KEY = "genixx.reports";
const EVENT = "genixx:reports-change";

let cacheRaw: string | null = null;
let cacheValue: ReportDoc[] = SEED;

function read(): ReportDoc[] {
  if (typeof window === "undefined") return SEED;
  const raw = window.localStorage.getItem(KEY);
  if (raw === cacheRaw) return cacheValue;
  cacheRaw = raw;
  try {
    cacheValue = raw ? (JSON.parse(raw) as ReportDoc[]) : SEED;
  } catch {
    cacheValue = SEED;
  }
  return cacheValue;
}

function write(next: ReportDoc[]) {
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

export function useReports(): ReportDoc[] {
  return useSyncExternalStore(subscribe, read, () => SEED);
}

/** 이 학생의 리포트 — 없으면 아직 조립되지 않은 것이다 */
export function useReportOf(studentId: string): ReportDoc | null {
  return useReports().find((r) => r.studentId === studentId) ?? null;
}

function now() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function patch(id: string, change: Partial<ReportDoc>, entry?: Omit<ReportLogEntry, "at">) {
  write(
    read().map((r) =>
      r.id === id
        ? { ...r, ...change, log: entry ? [...r.log, { ...entry, at: now() }] : r.log }
        : r,
    ),
  );
}

/**
 * 문구를 고친다.
 *
 * 원문은 지우지 않는다. 같은 템플릿이 다음 아이에게도 같은 문제를 일으키는지는
 * 「무엇을 무엇으로 고쳤나」가 남아 있어야 알 수 있다.
 */
export function overrideBlock(
  id: string,
  blockId: string,
  text: string,
  by: string,
  why: string,
) {
  const doc = read().find((r) => r.id === id);
  if (!doc || doc.state === "published") return;
  patch(
    id,
    {
      blocks: doc.blocks.map((b2) =>
        b2.id === blockId
          ? { ...b2, override: text, overrideBy: by, overrideAt: now(), overrideWhy: why }
          : b2,
      ),
    },
    { by, text: `「${doc.blocks.find((x) => x.id === blockId)?.title}」 문구 수정 — ${why}` },
  );
}

/** 고친 것을 물리고 템플릿 원문으로 되돌린다 */
export function clearOverride(id: string, blockId: string, by: string) {
  const doc = read().find((r) => r.id === id);
  if (!doc || doc.state === "published") return;
  patch(
    id,
    {
      blocks: doc.blocks.map((b2) =>
        b2.id === blockId
          ? { ...b2, override: undefined, overrideBy: undefined, overrideAt: undefined, overrideWhy: undefined }
          : b2,
      ),
    },
    { by, text: `「${doc.blocks.find((x) => x.id === blockId)?.title}」 수정을 물리고 원문으로 되돌림` },
  );
}

/**
 * 발행 — HITL 게이트.
 * 이 버튼을 누르기 전에는 보호자 화면에 결과가 보이지 않는다.
 */
export function publishReport(id: string, by: string, note: string) {
  const doc = read().find((r) => r.id === id);
  if (!doc) return null;
  if (reportCheck(doc).some((f) => f.tone === "block")) return null;
  patch(
    id,
    { state: "published", publishedAt: now(), publishedBy: by, holdReason: undefined },
    { by, text: `발행 — ${note}` },
  );
  return doc;
}

/** 보류 — 판정을 다시 봐야 할 때. 보호자 화면은 그대로 닫혀 있다. */
export function holdReport(id: string, by: string, reason: string) {
  patch(id, { state: "hold", holdReason: reason }, { by, text: `보류 — ${reason}` });
}

export function reopenReport(id: string, by: string) {
  patch(id, { state: "review", holdReason: undefined }, { by, text: "다시 검토 대기로 되돌림" });
}

/**
 * 응시가 끝나면 리포트를 조립한다.
 *
 * 조립까지는 규칙이 한다. 여기서 만들어지는 것은 「검토 대기」이지 결과가 아니다 —
 * 사람이 발행을 누르기 전까지 보호자 화면은 닫혀 있다.
 */
export function ensureReport(
  studentId: string,
  student: string,
  grade: string,
  round: string,
  record: ExamRecord,
) {
  const list = read();
  if (list.some((r) => r.studentId === studentId)) return;

  const scores = scoreAxes(record);
  const type = decideType(scores);
  const notes = expertNotes(scores, record);
  const conf = confidenceOf(record);
  const measured = scores.filter((s) => s.measured && s.score !== null);
  const evidence = measured
    .map((s) => `${s.axis.label} ${s.score}`)
    .join(" · ");

  const blocks: ReportBlock[] = [];
  if (type) {
    blocks.push(
      b(
        "t1",
        "재능 유형",
        `유형 판정 ${type.code}`,
        "R-01 · 측정된 축 가운데 상위 두 축의 조합으로 유형을 정한다",
        evidence || "측정값 없음",
        type.summary,
      ),
    );
  }
  notes.forEach((n, i) =>
    blocks.push(
      b(
        `n${i + 1}`,
        n.title,
        n.title,
        "R-04 · 축 순위와 정보원 수에 따라 붙는 해석 블록",
        evidence || "측정값 없음",
        n.body,
      ),
    ),
  );
  (type?.directions ?? []).slice(0, 2).forEach((d, i) =>
    blocks.push(
      b(
        `a${i + 1}`,
        "집에서 해 볼 것",
        d.t,
        "R-12 · 최상위 축 × 학년군으로 활동 모듈을 뽑는다",
        evidence || "측정값 없음",
        d.d,
      ),
    ),
  );

  const doc: ReportDoc = {
    id: `RP-${Date.now().toString(36).toUpperCase()}`,
    studentId,
    student,
    grade,
    round,
    typeCode: type?.code ?? "미판정",
    typeName: type?.name ?? "판정 보류",
    confidence: conf.label,
    assembledAt: now(),
    blocks,
    state: "review",
    log: [
      { at: now(), by: "조립 규칙", text: `리포트를 조립했습니다 (블록 ${blocks.length})` },
      { at: now(), by: "조립 규칙", text: `신뢰도 「${conf.label}」 — ${conf.desc}` },
    ],
  };
  write([doc, ...list]);
  return doc;
}
