"use client";

import { useSyncExternalStore } from "react";
import {
  currentRegOf,
  legacyOwnerOf,
  observerKeys,
  regId,
  type ExamRecord,
  type RegRef,
} from "./examStore";
import { seedGraded, seedMarksOf, subjectsOfSheet } from "./gradedSeed";
import { labelCheck } from "./labelCheck";
import { assembleFrom } from "./reportAssetStore";
import {
  assemble,
  blocksOf,
  changeText,
  changesOf,
  sameFacts,
  scoreLine,
  seedKit,
  skippedOf,
  type AssembledBlock,
  type Assembly,
  type Facts,
  type Skipped,
} from "./reportAssembly";
import { AUTO_BY, addDays, resolveDoc } from "./reportRelease";
import { scoreAxes } from "./result";
import { factsOfSheet, gradeFacts, gradeLong } from "./sheetFacts";

/**
 * 리포트 승인 (EXP-08).
 *
 * 이 서비스가 파는 것은 「사람이 확정한 판정」이다. 그 약속이 코드로 서 있는 자리가
 * 여기다 — **발행 전에는 보호자 화면에 결과가 보이지 않는다.**
 *
 * ── 리포트는 채점이 끝나야 만들어진다 ──
 * 채점자가 답안지 한 장을 끝까지 확인하면(회원 채점 EXP-04-1) 그 점수로 규칙이 리포트를 조립해
 * 목록에 올린다(lib/reportAssembly.ts). 그 뒤로는 스케줄러가 정한 날에 저절로 발행되고, 그 전에
 * 내보내려면 사람이 리포트에 들어가 발행한다(lib/reportRelease.ts). 사람이 확정하는 자리는
 * 채점이다 — 채점이 끝나지 않은 답안지에서는 리포트가 나오지 않는다.
 *
 * ── 발행 전까지는 지금 규칙을 따른다 ──
 * 리포트는 문단의 묶음이고, 문단마다 「어떤 규칙이 무엇을 보고 골랐는지」를 함께 든다. 발행하기
 * 전의 리포트는 굳은 글이 아니다 —
 *
 *   채점을 고치면            새 점수로 다시 조립한다(syncSheetReport)
 *   규칙 · 문구를 고치면     지금 규칙으로 다시 조립한다(syncWaitingReports)
 *
 * 문구가 이상해 해석 템플릿을 고쳤는데 기다리던 리포트는 옛 글 그대로 나가면, 고친 사람은
 * 고쳤다고 믿는 채로 틀린 글이 나간다. 발행하는 순간에야 글이 굳고, 그 뒤로는 무엇을 고쳐도
 * 바뀌지 않는다 — 보호자가 이미 읽은 글이 뒤에서 소리 없이 달라지면 안 된다.
 *
 * 사람이 고친 문단은 원문을 지우지 않고 덮어 쓴다. 무엇을 왜 고쳤는지가 남아야, 같은 템플릿이
 * 다음 아이에게도 같은 문제를 일으키는지 알 수 있다. 다시 조립해도 그 문단이 같은 문구에서
 * 나온 것이면 고친 글을 그대로 둔다.
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
  /**
   * 아래 셋은 조립 규칙이 만든 문단에만 있다(lib/reportAssembly.ts의 AssembledBlock).
   * 규칙 번호와 문구가 온 칸을 들고 있어야, 다시 조립할 때 「같은 문단인가」를 가릴 수 있다.
   */
  ruleId?: AssembledBlock["ruleId"];
  source?: AssembledBlock["source"];
  fellBack?: AssembledBlock["fellBack"];
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
  /**
   * 어느 평가의 리포트인가 — 「2026-3/e4」. 평가마다 한 벌이다.
   * 없는 것은 평가마다 나누기 전에 만든 리포트(씨앗 포함)로, 그 아이가 가장 먼저 접수한
   * 평가의 것으로 읽는다(lib/examStore.ts의 legacyOwnerOf).
   */
  reg?: string;
  /**
   * 어느 답안지의 리포트인가 — 회원 채점의 답안지 주소(「2026-3-0467」).
   * 이 브라우저에서 학생이 직접 응시해 낸 진단에는 없다(아래 ensureReport).
   */
  sheet?: string;
  /** 채점이 끝난 시각 — 리포트는 이때 만들어져 목록에 오르고, 발행 예정일을 여기서부터 센다 */
  gradedAt?: string;
  /**
   * 씨앗 전용 — 며칠 전에 채점이 끝났나.
   * 채점이 한창인 회차의 씨앗은 날짜 대신 이 값을 든다(lib/gradedSeed.ts). 화면이 열 때마다
   * 오늘에서 거꾸로 세고(lib/reportRelease.ts의 resolveDoc), 발행하는 순간 날짜로 굳는다.
   * 이 값이 있는 동안 assembledAt과 기록의 시각은 비어 있다.
   */
  gradedAgo?: number;
  typeCode: string;
  typeName: string;
  confidence: string;
  assembledAt: string;
  /**
   * 조립이 읽은 값 — 과목(축) 점수 · 학년 · 관찰 설문 건수.
   * 발행 전 리포트를 다시 조립할 때 이 값으로 다시 센다. 이 값이 생기기 전에 만든 리포트에는 없다.
   */
  facts?: Facts;
  blocks: ReportBlock[];
  /** 붙지 않은 규칙과 그 까닭 — 「이 문단은 왜 없나」에 답한다 */
  skipped?: Skipped[];
  state: ReportState;
  publishedAt?: string;
  publishedBy?: string;
  holdReason?: string;
  log: ReportLogEntry[];
};

/* 라벨링 점검은 lib/labelCheck.ts로 뗐다 — 해석 템플릿 저장소도 같은 점검을 걸어야 하는데
   서로 물면 순환 import가 된다. 여기서 다시 내보내 기존에 부르던 자리는 그대로 둔다 */
export { labelCheck, type LabelFinding } from "./labelCheck";

/** 리포트 한 벌 전체를 훑는다 */
export function reportCheck(doc: ReportDoc) {
  return doc.blocks.flatMap((b) =>
    labelCheck(blockText(b)).map((f) => ({ ...f, block: b.id, title: b.title })),
  );
}

/* ───────────────────────── 답안지에서 리포트로 ───────────────────────── */

/** 리포트가 답안지에서 읽는 것 — lib/expertStore.ts의 Sheet를 그대로 넘기면 된다 */
export type SheetRef = {
  key: string;
  round: string;
  seat: string;
  grade: string;
};

/** 리포트 번호 — 답안지 하나에 리포트 하나라 답안지 주소를 그대로 쓴다 */
export const reportIdOf = (sheetKey: string) => `RP-${sheetKey}`;

/** 회차 id(2026-3)를 진단 이름(2026 파일럿 3회차)으로 — 회원 채점 목록에 서는 이름과 같다 */
const roundNameOf = (round: string) => {
  const [year, no] = round.split("-");
  return `${year} 파일럿 ${no}회차`;
};

/** 조립을 대신 적는 이름 — 기록의 「누가」 칸에 선다 */
const ASSEMBLER = "조립 규칙";

/**
 * 조립하며 남기는 기록 — 시각은 채점이 끝난 때다. 비워 두면 화면이 채워 넣는다(resolveDoc).
 *
 * 문단 수만 적지 않고 읽은 점수를 함께 적는다. 기록만 보고도 「무엇을 보고 조립했나」를 알 수
 * 있어야, 뒤에 점수가 바뀌어 다시 조립한 줄과 견줄 수 있다.
 */
function assembleLog(asm: Assembly, facts: Facts, at: string, head: string): ReportLogEntry[] {
  const scores = scoreLine(asm.reading.ranked) || "측정한 축 없음";
  return [
    {
      at,
      by: ASSEMBLER,
      text: `${head} — ${scores} · 문단 ${blocksOf(asm).length}개`,
    },
    {
      at,
      by: ASSEMBLER,
      text: `관찰 설문 ${facts.surveys}건 · 리포트 신뢰도 「${asm.reading.confidence}」`,
    },
    ...asm.notes.map((text) => ({ at, by: ASSEMBLER, text })),
  ];
}

/** 조립 결과를 리포트의 칸으로 */
const assembled = (asm: Assembly) => ({
  typeCode: asm.reading.typeCode,
  typeName: asm.reading.typeName,
  confidence: asm.reading.confidence as string,
  blocks: blocksOf(asm) as ReportBlock[],
  skipped: skippedOf(asm),
});

/** 답안지 한 장의 리포트 — 채점이 끝난 때(at)에 조립된 「검토 대기」 */
function docOf(sheet: SheetRef, student: string, facts: Facts, asm: Assembly, at: string): ReportDoc {
  return {
    id: reportIdOf(sheet.key),
    studentId: `demo-${sheet.key}`,
    sheet: sheet.key,
    student,
    grade: gradeLong(sheet.grade),
    round: roundNameOf(sheet.round),
    assembledAt: at,
    facts,
    ...assembled(asm),
    state: "review",
    log: assembleLog(asm, facts, at, "채점이 끝나 리포트를 조립했습니다"),
  };
}

/**
 * 다시 조립한다 — 점수나 규칙 · 문구가 바뀐 발행 전 리포트.
 *
 * 사람이 고친 글은 그 문단이 **같은 규칙이 같은 칸에서 고른 문구**일 때만 남긴다. 가장 높은 축이
 * 언어에서 수리·논리로 바뀌었는데 언어 문단을 고친 글이 그대로 붙어 있으면, 다른 축의 이야기가
 * 나간다. 그럴 때는 고친 글을 걷고 기록에 남긴다.
 *
 * 회원이 읽는 것(문단 · 제목 · 문구 · 유형)이 그대로면 기록을 남기지 않는다. 컷을 옮겨 근거
 * 줄의 숫자만 달라진 것까지 적으면 기록이 그 줄로 덮인다.
 */
function reassemble(doc: ReportDoc, facts: Facts, asm: Assembly, at: string, why: string): ReportDoc {
  const next = assembled(asm);
  const dropped: string[] = [];
  const blocks = next.blocks.map((b) => {
    const was = doc.blocks.find((x) => (x.ruleId ?? x.id) === b.ruleId);
    if (!was?.override) return b;
    if (was.source !== b.source) {
      dropped.push(was.title);
      return b;
    }
    return {
      ...b,
      override: was.override,
      overrideBy: was.overrideBy,
      overrideAt: was.overrideAt,
      overrideWhy: was.overrideWhy,
    };
  });
  /* 문단째 빠졌으면 거기 고쳐 둔 글도 함께 사라진다 */
  for (const was of doc.blocks) {
    if (was.override && !blocks.some((b) => b.ruleId === (was.ruleId ?? was.id))) {
      dropped.push(was.title);
    }
  }

  const changes = changesOf(doc.blocks, blocks);
  const retyped = doc.typeCode !== next.typeCode || doc.typeName !== next.typeName;
  const scored = !sameFacts(doc.facts, facts);
  const quiet =
    !scored &&
    !retyped &&
    changes.length === 0 &&
    dropped.length === 0 &&
    doc.confidence === next.confidence;

  const same =
    quiet &&
    JSON.stringify(doc.blocks) === JSON.stringify(blocks) &&
    JSON.stringify(doc.skipped ?? []) === JSON.stringify(next.skipped);
  if (same) return doc;

  const told = [
    scored ? scoreLine(asm.reading.ranked) : "",
    retyped ? `유형 ${doc.typeName} → ${next.typeName}` : "",
    changes.length > 0 ? `달라진 문단: ${changeText(changes)}` : "",
  ].filter(Boolean);

  return {
    ...doc,
    ...next,
    facts,
    blocks,
    log: quiet
      ? doc.log
      : [
          ...doc.log,
          {
            at,
            by: ASSEMBLER,
            text: `${why} 다시 조립했습니다${told.length > 0 ? ` — ${told.join(" · ")}` : ""}`,
          },
          ...dropped.map((title) => ({
            at,
            by: ASSEMBLER,
            text: `「${title}」 문단이 달라져, 고쳐 둔 글을 지웠습니다`,
          })),
        ],
  };
}

/* ───────────────────────── 씨앗 ───────────────────────── */

/**
 * 이름을 정해 둔 넷 — 답안지 주소 → 회원 이름. 디자인 보기와 문서가 이 넷을 이름으로 가리킨다.
 * 나머지 답안지의 이름은 답안지 주소에서 지어낸다.
 */
const NAMED: Record<string, string> = {
  "2026-3-0474": "김하준",
  "2026-3-0467": "이서연",
  "2026-3-0453": "박지우",
  "2026-3-0483": "최민준",
};

/**
 * 일부러 걸리게 둔 리포트 — 라벨링 점검이 무엇을 잡는지 화면에서 보여야 한다.
 *
 * 규칙이 고른 문구에는 검토가 필요한 표현이 들어갈 수 없다(해석 템플릿과 교차 셀이 저장할 때
 * 막는다). 그래서 이 예시는 사람이 고쳐 쓴 글에 그런 표현이 남은 경우로 둔다 — 지금은 고치는
 * 화면도 저장을 막지만, 점검이 생기기 전에 쓴 글이나 다른 경로로 들어온 글이 남아 있을 수 있다.
 * 발행 직전에 한 번 더 보는 까닭이 그것이다(아래 releaseReports).
 */
const STOP_KEY = "2026-3-0467";
const STOP_TEXT =
  "같은 학년 상위 5% 수준의 능력을 보이는 영재입니다. 또래보다 뛰어난 수행을 보입니다.";
const STOP_BY = "정태호";
const STOP_WHY = "강점을 더 분명하게 적음";

function withStopExample(doc: ReportDoc): ReportDoc {
  const hit = doc.blocks.find((b) => b.ruleId === "R-04") ?? doc.blocks[0];
  if (!hit) return doc;
  return {
    ...doc,
    blocks: doc.blocks.map((b) =>
      b.id === hit.id
        ? { ...b, override: STOP_TEXT, overrideBy: STOP_BY, overrideAt: "", overrideWhy: STOP_WHY }
        : b,
    ),
    log: [...doc.log, { at: "", by: STOP_BY, text: `「${hit.title}」 문구 수정 — ${STOP_WHY}` }],
  };
}

const FAMILY = ["김", "이", "박", "정", "최", "강", "조", "윤", "장", "임", "한", "오"];
const GIVEN = ["서준", "하윤", "도윤", "지우", "시우", "예린", "수아", "지호", "채원", "민준", "하은", "유진"];

/** 답안지 주소를 씨앗으로 한 난수 — 같은 답안지는 언제 지어도 같은 이름이 된다 */
function rngOf(text: string) {
  let s = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    s ^= text.charCodeAt(i);
    s = Math.imul(s, 16777619);
  }
  s = s >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

/**
 * 이 답안지의 회원 이름 — 정해 둔 이름이 있으면 그것, 없으면 지어낸다.
 *
 * ⚠ 지어낸 값이다. 콘솔의 답안지는 응시번호뿐이다(채점하는 사람이 누구 답인지 알면 안 된다).
 *   붙일 때는 리포트가 회원 명부에서 이름을 읽는다.
 */
function studentOf(sheetKey: string, taken: Set<string>) {
  const named = NAMED[sheetKey];
  if (named) return named;
  const r = rngOf(sheetKey);
  const pick = <T,>(list: readonly T[]) => list[Math.floor(r() * list.length)];
  /* 같은 이름이 목록에 둘 서면 줄을 가릴 수 없다 — 이미 쓴 이름은 다시 뽑는다 */
  let student = `${pick(FAMILY)}${pick(GIVEN)}`;
  for (let k = 0; taken.has(student) && k < 20; k += 1) student = `${pick(FAMILY)}${pick(GIVEN)}`;
  return student;
}

/** 지난 회차의 스케줄러 — 그때도 채점 완료 7일 뒤였다 */
const PAST_DAYS = 7;

/**
 * 씨앗 — 채점이 끝난 답안지마다 리포트 한 건(lib/gradedSeed.ts).
 *
 * 리포트의 글은 **그 답안지의 채점 결과로 조립한 것**이다. 회원 채점의 정오표에 보이는 점수가
 * 그대로 과목 점수가 되고, 규칙이 그 점수로 문단을 고른다. 처음 값의 규칙과 문구(seedKit)로
 * 조립해 두고, 운영자가 규칙을 고쳤으면 화면이 열린 뒤에 발행 전 리포트만 다시 조립한다.
 *
 *   지난 회차  날짜가 박혀 있고 이미 발행됐다. 대개 스케줄러가 예정일 아침에 내보냈고, 다섯에
 *              하나쯤은 사람이 그보다 먼저 발행했다
 *   3회차      「며칠 전」만 든다. 발행됐는지는 화면이 오늘을 읽고 나서 정해진다
 *
 * ⚠ 시계도 저장소도 읽지 않는다. 서버와 브라우저가 같은 목록으로 시작해야 한다.
 */
function seedReports(): ReportDoc[] {
  /* 정해 둔 이름과, 콘솔에서 일하는 사람의 이름은 지어내는 이름에 쓰지 않는다 — 발행한 사람과
     리포트의 주인이 같은 이름이면 「박서준 님이 박서준 리포트를 발행」이 된다 */
  const taken = new Set([...Object.values(NAMED), "박서준", "정태호", "강수아", "노아름"]);
  let past = 0;

  return seedGraded.map((g) => {
    const facts = factsOfSheet(g.sheet, subjectsOfSheet(g.sheet), seedMarksOf(g));
    const student = studentOf(g.sheet.key, taken);
    taken.add(student);
    const base = docOf(g.sheet, student, facts, assemble(facts, seedKit), g.at ?? "");
    const doc = g.sheet.key === STOP_KEY ? withStopExample(base) : base;

    if (g.at === undefined) return { ...doc, gradedAgo: g.ago ?? 0 };

    const sendOn = addDays(g.at.slice(0, 10), PAST_DAYS);
    const early = past % 5 === 3;
    past += 1;
    const publishedAt = early ? `${addDays(g.at.slice(0, 10), 3)} 14:20` : `${sendOn} 09:00`;
    const publishedBy = early ? "박서준" : AUTO_BY;
    return {
      ...doc,
      gradedAt: g.at,
      state: "published" as ReportState,
      publishedAt,
      publishedBy,
      log: [
        ...doc.log,
        {
          at: publishedAt,
          by: publishedBy,
          text: early
            ? `발행 — 예정일(${sendOn})보다 먼저 발행`
            : `발행 — 채점 완료 ${PAST_DAYS}일 뒤 자동 발행`,
        },
      ],
    };
  });
}

const SEED: ReportDoc[] = seedReports();

const KEY = "genixx.reports";
const EVENT = "genixx:reports-change";

let cacheRaw: string | null = null;
let cacheValue: ReportDoc[] = SEED;

/**
 * 버리는 옛 리포트 — 저장소에 남아 있으면 지금 목록과 맞지 않는 줄이 선다.
 *
 *   응시번호 네 자리만으로 번호를 매긴 것(demo-0311)   답안지와 이어지지 않은 옛 씨앗
 *   답안지는 있는데 조립이 읽은 값(facts)이 없는 것     규칙을 거치지 않고 지어낸 글이던 때의 것
 *
 * 버린 자리는 씨앗이 다시 채운다. 학생이 이 브라우저에서 직접 낸 진단의 리포트(답안지가 없다)는
 * 버리지 않는다.
 */
const isStale = (d: ReportDoc) => /^demo-\d{4}$/.test(d.studentId) || (!!d.sheet && !d.facts);

function read(): ReportDoc[] {
  if (typeof window === "undefined") return SEED;
  const raw = window.localStorage.getItem(KEY);
  if (raw === cacheRaw) return cacheValue;
  cacheRaw = raw;
  try {
    if (!raw) {
      cacheValue = SEED;
    } else {
      /* 저장한 것 뒤에 아직 손대지 않은 씨앗을 잇는다. 저장소가 씨앗을 통째로 덮으면
         한 건만 발행해도 그때의 목록에 굳어, 뒤에 늘어난 씨앗이 보이지 않는다 */
      const stored = (JSON.parse(raw) as ReportDoc[]).filter((d) => !isStale(d));
      const have = new Set(stored.map((d) => d.id));
      cacheValue = [...stored, ...SEED.filter((d) => !have.has(d.id))];
    }
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

/**
 * 한 평가의 리포트를 목록에서 찾는다 — 없으면 아직 조립되지 않은 것이다.
 *
 * 평가를 넘기지 않으면 아이가 지금 보고 있는 평가, 접수가 하나도 없으면 평가 표시가 없는
 * 리포트를 찾는다.
 */
export function reportFor(
  list: ReportDoc[],
  studentId: string,
  reg?: RegRef | null,
): ReportDoc | null {
  const at = reg === undefined ? currentRegOf(studentId) : reg;
  const mine = list.filter((r) => r.studentId === studentId);
  if (!at) return mine.find((r) => !r.reg) ?? null;
  const own = mine.find((r) => r.reg === regId(at));
  if (own) return own;
  /* 평가 표시가 없는 옛 리포트는 가장 먼저 접수한 평가의 것이다 */
  const owner = legacyOwnerOf(studentId);
  return owner && regId(owner) === regId(at) ? (mine.find((r) => !r.reg) ?? null) : null;
}

/** 이 학생의 리포트 — reg를 주면 그 평가, 없으면 지금 보고 있는 평가 */
export function useReportOf(studentId: string, reg?: RegRef | null): ReportDoc | null {
  return reportFor(useReports(), studentId, reg);
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
    { by, text: `「${doc.blocks.find((x) => x.id === blockId)?.title}」 수정을 취소하고 원문으로 되돌림` },
  );
}

/**
 * 발행 — 이 순간부터 보호자 화면에 결과가 보인다. 여러 건을 한 번에 적는다.
 *
 * 스케줄러가 예정일이 된 것을 한꺼번에 내보낼 때도, 사람이 한 건을 「지금 발행」할 때도 이
 * 함수 하나를 지난다(lib/reportSendStore.ts). 발행한 시각(at)은 부르는 쪽이 정한다 —
 * 스케줄러가 내보낸 것은 예정된 시각이고, 사람이 누른 것은 누른 시각이다.
 *
 * 발행하면 글이 굳는다. 그 뒤로는 채점을 고쳐도, 규칙이나 문구를 고쳐도 이 리포트는 바뀌지 않는다.
 *
 * ⚠ 라벨링 점검에 막는 말이 있는 리포트는 건너뛴다(헌장 7조). 그런 리포트는 스케줄러의
 *   날짜가 지나도 나가지 않고, 사람이 고쳐야 나간다. 실제로 발행한 번호만 돌려준다.
 *
 * ⚠ 씨앗의 「며칠 전」(gradedAgo)은 여기서 날짜로 굳힌다. 나간 리포트의 채점 완료일이
 *   날마다 하루씩 밀리면 안 된다. today는 그 날짜를 세는 기준이다.
 */
export function releaseReports(
  items: { id: string; at: string; note: string }[],
  by: string,
  today: string,
): string[] {
  const want = new Map(items.map((i) => [i.id, i]));
  const done: string[] = [];
  const next = read().map((r) => {
    const hit = want.get(r.id);
    if (!hit || r.state === "published") return r;
    if (reportCheck(r).some((f) => f.tone === "block")) return r;
    const doc = resolveDoc(r, today);
    done.push(r.id);
    return {
      ...doc,
      state: "published" as ReportState,
      publishedAt: hit.at,
      publishedBy: by,
      holdReason: undefined,
      log: [...doc.log, { at: hit.at, by, text: `발행 — ${hit.note}` }],
    };
  });
  if (done.length > 0) write(next);
  return done;
}

/** 지금 저장소에 있는 리포트 — 훅 밖(스케줄러가 예정일이 된 것을 고를 때)에서 읽는다 */
export const getReports = () => read();

/** 보류 — 판정을 다시 봐야 할 때. 보호자 화면은 그대로 닫혀 있다. */
export function holdReport(id: string, by: string, reason: string) {
  patch(id, { state: "hold", holdReason: reason }, { by, text: `보류 — ${reason}` });
}

export function reopenReport(id: string, by: string) {
  patch(id, { state: "review", holdReason: undefined }, { by, text: "다시 검토 대기로 되돌림" });
}

/* ───────────────────────── 조립 ───────────────────────── */

/**
 * 채점이 끝난 답안지의 리포트를 맞춘다 — 회원 채점에서 마지막 문항까지 확인했을 때, 그리고 그
 * 뒤에 점수를 고쳤을 때 부른다(app/(admin2)/admin2/grading/members/[key]/SheetView.tsx).
 *
 *   리포트가 없다            지금 점수로 조립해 리포트 승인 목록에 올린다. 스케줄러는 발행
 *                            예정일을 이 시각에서부터 센다
 *   있고, 아직 발행 전이다    점수가 달라졌으면 새 점수로 다시 조립한다. 채점 완료 시각은 처음
 *                            것 그대로다 — 점수를 다시 고쳤다고 예정일이 뒤로 밀리면, 고칠
 *                            때마다 발행이 늦어진다
 *   이미 발행했다            그대로 둔다. 보호자가 읽은 글은 바꾸지 않는다
 *
 * ⚠ 회원 이름은 지어낸 것이다(위 studentOf). 붙일 때는 회원 명부에서 읽는다.
 */
export function syncSheetReport(sheet: SheetRef, facts: Facts) {
  const list = read();
  const id = reportIdOf(sheet.key);
  const was = list.find((r) => r.id === id);
  const at = now();

  if (!was) {
    const taken = new Set(list.map((r) => r.student));
    const doc = docOf(sheet, studentOf(sheet.key, taken), facts, assembleFrom(facts), at);
    write([{ ...doc, gradedAt: at }, ...list]);
    return;
  }
  if (was.state === "published" || sameFacts(was.facts, facts)) return;
  const next = reassemble(was, facts, assembleFrom(facts), at, "채점이 바뀌어");
  if (next !== was) write(list.map((r) => (r.id === id ? next : r)));
}

/**
 * 발행 전 리포트를 지금 규칙으로 다시 조립한다 — 조립 규칙 · 해석 템플릿을 고친 것이 기다리던
 * 리포트에 걸리는 자리다. **회원이 읽는 내용이 달라진** 리포트 수를 돌려준다 — 컷을 옮겨 근거
 * 줄의 숫자만 바뀐 것은 세지 않는다(조립 규칙 화면이 저장하기 전에 세어 보인 수와 같은 셈이다).
 *
 * 리포트를 읽는 화면이 열릴 때 부른다(lib/reportSendStore.ts의 releaseDue가 발행하기 전에 먼저
 * 부른다). 규칙을 고친 화면이 리포트를 직접 건드리지 않아도, 리포트가 나가기 전에는 반드시 지금
 * 규칙을 한 번 지난다.
 *
 * ⚠ 서버가 할 일을 시안에서 대신하는 것이다. 붙일 때는 규칙이나 문구를 저장하는 요청이 발행 전
 *   리포트의 재조립을 함께 건다.
 */
export function syncWaitingReports(at: string): number {
  if (typeof window === "undefined") return 0;
  const list = read();
  let touched = 0;
  let changed = 0;
  const next = list.map((d) => {
    if (d.state === "published" || !d.facts) return d;
    const fresh = reassemble(d, d.facts, assembleFrom(d.facts), at, "조립 규칙이나 문구가 바뀌어");
    if (fresh !== d) touched += 1;
    /* 내용이 달라진 리포트에는 기록이 한 줄 이상 늘어 있다 */
    if (fresh.log.length !== d.log.length) changed += 1;
    return fresh;
  });
  if (touched > 0) write(next);
  return changed;
}

/**
 * 학생이 이 브라우저에서 최종 제출하면 리포트를 조립한다.
 *
 * 조립까지는 규칙이 한다. 여기서 만들어지는 것은 「검토 대기」이지 결과가 아니다 —
 * 발행되기 전까지 보호자 화면은 닫혀 있다.
 *
 * ⚠ 이 길은 회원 채점을 거치지 않는다. 콘솔의 답안지는 응시번호로 지어낸 것이라, 학생이
 *   이 브라우저에서 실제로 낸 답안이 채점 목록에 오르지 않는다. 그래서 **최종 제출한 때를
 *   채점이 끝난 때로 적어** 곧바로 리포트 승인 목록에 올린다. 붙일 때는 응시 기록이 회원
 *   채점으로 가고, 채점이 끝난 뒤에 조립이 불린다(위 syncSheetReport의 자리).
 *
 * 조립하는 셈은 답안지에서 오는 리포트와 같다(lib/reportAssembly.ts). 읽는 값만 응시 기록에서
 * 낸다 — 과목 점수는 lib/result.ts의 scoreAxes, 관찰 설문은 제출된 학부모 · 지도교사 설문 수다.
 */
export function ensureReport(
  studentId: string,
  student: string,
  grade: string,
  round: string,
  record: ExamRecord,
  /** 어느 평가의 리포트인가 — 평가마다 한 벌이라, 없으면 지금 보고 있는 평가로 본다 */
  reg?: RegRef | null,
) {
  const list = read();
  const at = reg === undefined ? currentRegOf(studentId) : reg;
  if (reportFor(list, studentId, at)) return;

  const facts: Facts = {
    ...gradeFacts(grade),
    scores: scoreAxes(record).flatMap((s) =>
      s.measured && s.score !== null ? [{ axis: s.axis.id, score: s.score }] : [],
    ),
    surveys: observerKeys.filter((k) => record.surveys[k] === "done").length,
  };
  const asm = assembleFrom(facts);
  const stamp = now();

  const doc: ReportDoc = {
    id: `RP-${Date.now().toString(36).toUpperCase()}`,
    studentId,
    student,
    grade,
    round,
    ...(at ? { reg: regId(at) } : {}),
    gradedAt: stamp,
    assembledAt: stamp,
    facts,
    ...assembled(asm),
    state: "review",
    log: assembleLog(asm, facts, stamp, "리포트를 조립했습니다"),
  };
  write([doc, ...list]);
  return doc;
}
