import {
  assemble,
  blocksOf,
  scoreLine,
  seedKit,
  skippedOf,
  type Facts,
} from "@/lib/reportAssembly";
import { templateGradeFrom } from "@/lib/reportAssets";
import {
  AUTO_BY,
  sendRowOf,
  sortSendRows,
  type SendPolicy,
} from "@/lib/reportRelease";
import type { ReportBlock, ReportDoc } from "@/lib/reportStore";
import { subjectScores } from "@/lib/sheetFacts";
import { flowFacts, flowMarks, flowSeat, flowSheet, flowStudent } from "./studentFlow";

/**
 * 리포트 승인 · 스케줄러 · 조립 규칙 디자인이 함께 쓰는 예시 값 — 리포트 열두 건과 오늘.
 *
 * 세 화면이 같은 리포트를 말해야 한다. 스케줄러에서 「3일로 줄이면 네 건이 바로 나간다」고
 * 적었으면 리포트 목록에서도 그 네 건이 발행 완료로 넘어가 있어야 하고, 조립 규칙에서 「컷을
 * 옮기면 두 건이 달라진다」고 적었으면 그 두 건이 이 목록의 리포트여야 한다. 화면마다 예시를
 * 따로 지으면 그 수가 어긋난다.
 *
 * 저장소를 읽지 않는다. 리포트의 글은 적어 둔 점수(Seed.scores)를 **실제 조립 함수**
 * (lib/reportAssembly.ts)에 처음 값의 규칙과 문구(seedKit)로 넣어 만든다 — 디자인에 보이는
 * 문단과 근거가 실제 화면이 만드는 것과 한 글자도 다르지 않다. 날짜를 세는 셈도 실제 것
 * (lib/reportRelease.ts)이다.
 *
 *   오늘     2026년 10월 12일 오후 2시 5분
 *   스케줄러  채점 완료 7일 뒤 오전 9시
 *
 * 맨 아래 줄의 이서준은 학생 대시보드 디자인의 그 학생이다(./studentFlow.ts). 9월 25일에
 * 채점이 끝나 10월 2일 아침에 자동으로 발행됐다 — 학생 화면에 적힌 「결과 발행 10.02」와
 * 「NLM형 · 관찰 탐구가형」이 여기서 나온 값이다. 이 리포트의 점수만은 적어 둔 값이 아니라
 * **회원 채점 디자인의 그 답안지(응시번호 0412)를 채점한 결과**에서 낸다(seojunScores) — 채점
 * 화면의 점수, 리포트의 근거, 학생이 받는 결과지가 같은 숫자를 말한다.
 */

/** 오늘 — 이 디자인의 모든 「며칠 뒤」를 여기서 센다 */
export const NOW = "2026-10-12 14:05";
export const ADMIN = "박서준";
const ROUND = flowFacts.q3.name;
const GRADE = flowStudent.grade;

/** 상세 화면의 예시 둘 — 가만히 두면 나가는 것과, 자동 발행에서 빠진 것 */
export const ID = "RP-2026-3-0474";
export const ID_STOP = "RP-2026-3-0467";

/** 지금 걸려 있는 스케줄러와, 3일로 줄여 저장한 뒤의 스케줄러 */
export const policy7: SendPolicy = { days: 7, hour: 9, at: "2026-09-22 10:30", by: ADMIN };
export const policy3: SendPolicy = { days: 3, hour: 9, at: NOW, by: ADMIN };

/* ───────────────────────── 리포트 ───────────────────────── */

/** 사람이 고쳐 둔 문단 — 어느 규칙의 문단을 무엇으로 */
type Edit = { ruleId: string; text: string; by: string; at: string; why: string };

type Seed = {
  seat: string;
  student: string;
  gradedAt: string;
  /** 국어(언어) · 수학(수리·논리) · 과학(자연·탐구) 점수. 응시하지 않은 과목은 적지 않는다 */
  scores: { language?: number; logic?: number; nature?: number };
  /** 들어온 관찰 설문 건수 */
  surveys: number;
  edits?: Edit[];
  /** 발행한 시각과 사람 — 없으면 아직 나가지 않았다 */
  sent?: { at: string; by: string; note: string };
};

const AXES = ["language", "logic", "nature"] as const;

/** 예시의 점수를 조립이 읽는 값으로 */
export const factsOf = (s: Pick<Seed, "scores" | "surveys">): Facts => ({
  grade: templateGradeFrom(GRADE),
  scores: AXES.flatMap((axis) => {
    const score = s.scores[axis];
    return score === undefined ? [] : [{ axis, score }];
  }),
  surveys: s.surveys,
});

export const docOf = (s: Seed): ReportDoc => {
  const facts = factsOf(s);
  const asm = assemble(facts, seedKit);
  const blocks: ReportBlock[] = blocksOf(asm).map((b) => {
    const e = s.edits?.find((x) => x.ruleId === b.ruleId);
    return e
      ? { ...b, override: e.text, overrideBy: e.by, overrideAt: e.at, overrideWhy: e.why }
      : b;
  });
  return {
    id: `RP-2026-3-${s.seat}`,
    studentId: `demo-2026-3-${s.seat}`,
    sheet: `2026-3-${s.seat}`,
    student: s.student,
    grade: GRADE,
    round: ROUND,
    typeCode: asm.reading.typeCode,
    typeName: asm.reading.typeName,
    confidence: asm.reading.confidence,
    gradedAt: s.gradedAt,
    assembledAt: s.gradedAt,
    facts,
    blocks,
    skipped: skippedOf(asm),
    state: s.sent ? "published" : "review",
    ...(s.sent ? { publishedAt: s.sent.at, publishedBy: s.sent.by } : {}),
    log: [
      {
        at: s.gradedAt,
        by: "조립 규칙",
        text: `채점이 끝나 리포트를 조립했습니다 — ${scoreLine(asm.reading.ranked)} · 문단 ${blocks.length}개`,
      },
      {
        at: s.gradedAt,
        by: "조립 규칙",
        text: `관찰 설문 ${facts.surveys}건 · 리포트 신뢰도 「${asm.reading.confidence}」`,
      },
      ...(s.edits ?? []).map((e) => ({
        at: e.at,
        by: e.by,
        text: `「${blocks.find((b) => b.ruleId === e.ruleId)?.title ?? ""}」 문구 수정 — ${e.why}`,
      })),
      ...(s.sent ? [{ at: s.sent.at, by: s.sent.by, text: `발행 — ${s.sent.note}` }] : []),
    ],
  };
};

/** 「강하게 나타난 축」 문단 — 상세 화면의 예시가 이 문단을 고친다 */
export const TOP_BLOCK = "b-R-04";

/**
 * 가만히 두면 10월 14일 아침에 나가는 리포트 — 상세 화면의 예시.
 * 언어 78 · 수리·논리 71 · 자연·탐구 64, 관찰 설문 2건. 규칙 일곱 가운데 여섯이 문단을 넣는다
 * (관찰 설문이 들어와 「정보원 구성」은 붙지 않는다).
 */
export const hajun: Seed = {
  seat: "0474",
  student: "김하준",
  gradedAt: "2026-10-07 13:47",
  scores: { language: 78, logic: 71, nature: 64 },
  surveys: 2,
};

/** 검토가 필요한 표현이 든 글 — 「상위」「영재」가 막는 말이다(lib/labelCheck.ts) */
const STOP_TEXT =
  "같은 학년 상위 5% 수준의 수리 능력을 보이는 영재입니다. 또래보다 뛰어난 계산력을 갖추고 있습니다.";
/** 그 문단을 고친 글 */
export const FIXED_TEXT =
  "수와 자료에서 규칙을 찾아 설명하는 모습이 이 학년에 기대하는 수준보다 안정적으로 나타났습니다. 계산을 마친 뒤 그 과정을 말로 풀어 쓰는 힘이 돋보입니다.";

/**
 * 예정일(10월 10일)을 넘기고도 나가지 않은 리포트 — 자동 발행에서 빠졌다.
 * 규칙이 고른 문구에는 막는 표현이 들어갈 수 없다. 사람이 고쳐 쓴 문단에 그런 표현이 남은 경우다.
 */
export const seoyeon: Seed = {
  seat: "0467",
  student: "이서연",
  gradedAt: "2026-10-03 12:42",
  scores: { language: 76, logic: 84, nature: 70 },
  surveys: 1,
  edits: [
    {
      ruleId: "R-04",
      text: STOP_TEXT,
      by: "정태호",
      at: "2026-10-03 16:20",
      why: "강점을 더 분명하게 적음",
    },
  ],
};

/**
 * 이서준의 과목 점수 — 채점이 끝난 답안지에서 받은 점수 ÷ 만점 × 100.
 * 실제 화면이 리포트를 조립할 때 읽는 값과 같은 셈이다(lib/sheetFacts.ts).
 */
export const seojunScores = subjectScores(flowSheet, flowMarks.done);
const seojunScore = (subject: "korean" | "math" | "science") =>
  seojunScores.find((s) => s.subject === subject)?.score ?? 0;

export const auto = (at: string) => ({
  at,
  by: AUTO_BY,
  note: "채점 완료 7일 뒤 오전 9시 자동 발행",
});

/** 목록의 열두 건 — 곧 나갈 여섯 · 자동 발행에서 빠진 하나 · 이미 나간 다섯 */
const seeds: Seed[] = [
  { seat: "0451", student: "오서준", gradedAt: "2026-10-06 16:10", scores: { language: 81, logic: 63, nature: 70 }, surveys: 1 },
  hajun,
  { seat: "0449", student: "강하은", gradedAt: "2026-10-08 11:20", scores: { language: 68, logic: 77, nature: 59 }, surveys: 0 },
  /* 「또래보다」는 짚기만 하는 말이다 — 검토중으로 표시되고 자동 발행은 그대로 나간다 */
  {
    seat: "0447",
    student: "정시우",
    gradedAt: "2026-10-09 15:45",
    scores: { language: 66, logic: 61, nature: 73 },
    surveys: 1,
    edits: [
      {
        ruleId: "R-04",
        text: "관찰한 것을 적는 데 익숙하고, 또래보다 관찰 기록이 꼼꼼합니다. 원인을 되짚는 문항에서는 답이 짧아져, 그 연결을 소리 내어 해 볼 기회가 더 필요해 보입니다.",
        by: ADMIN,
        at: "2026-10-10 10:12",
        why: "채점자의 관찰 메모를 반영함",
      },
    ],
  },
  /* 국어와 과학만 응시했고 관찰 설문이 없다 — 「정보원 구성」이 붙는다 */
  { seat: "0453", student: "박지우", gradedAt: "2026-10-10 10:05", scores: { language: 61, nature: 69 }, surveys: 0 },
  { seat: "0442", student: "윤채원", gradedAt: "2026-10-12 09:30", scores: { language: 88, logic: 74, nature: 80 }, surveys: 2 },
  seoyeon,
  { seat: "0454", student: "임수아", gradedAt: "2026-10-05 11:13", scores: { language: 70, logic: 82, nature: 66 }, surveys: 2, sent: auto("2026-10-12 09:00") },
  /* 전체 점수는 낮은데 한 축만 높다 — 교차 해석이 「학력 부진 × 재능 강세」 칸의 문구를 넣었다 */
  { seat: "0483", student: "최민준", gradedAt: "2026-10-04 17:15", scores: { language: 30, logic: 38, nature: 74 }, surveys: 0, sent: auto("2026-10-11 09:00") },
  { seat: "0444", student: "조예린", gradedAt: "2026-10-02 10:12", scores: { language: 79, logic: 60, nature: 72 }, surveys: 1, sent: { at: "2026-10-06 14:20", by: ADMIN, note: "예정일(2026-10-09)보다 먼저 발행" } },
  { seat: "0456", student: "장지호", gradedAt: "2026-09-30 13:15", scores: { language: 64, logic: 70, nature: 52 }, surveys: 1, sent: auto("2026-10-07 09:00") },
  {
    seat: flowSeat.seat,
    student: flowStudent.name,
    gradedAt: "2026-09-25 15:40",
    scores: {
      language: seojunScore("korean"),
      logic: seojunScore("math"),
      nature: seojunScore("science"),
    },
    surveys: 2,
    sent: auto("2026-10-02 09:00"),
  },
];

export const docs = seeds.map(docOf);

/** 스케줄러를 3일로 줄여 저장한 뒤 — 새 예정일이 이미 지난 넷이 그 자리에서 나갔다 */
export const docsAfter3 = seeds.map((s) => {
  const early = ["0451", "0474", "0449", "0447"].includes(s.seat);
  return docOf(
    early ? { ...s, sent: { at: NOW, by: AUTO_BY, note: "채점 완료 3일 뒤 오전 9시 자동 발행" } } : s,
  );
});

export const rowsOf = (list: ReportDoc[], policy: SendPolicy, now = NOW) =>
  sortSendRows(list.map((d) => sendRowOf(d, policy, now)));
