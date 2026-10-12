import { autoGraded, unanswered } from "./exam";
import { paperOf } from "./examSheet";
import { seedSheets, type Sheet } from "./expertStore";
import type { GradeLine, GradeSubject } from "./gradeSheet";
import { addDays } from "./reportRelease";

/**
 * 씨앗에서 **채점이 끝난 답안지**.
 *
 * 회원 채점(EXP-04-1)과 리포트 승인(EXP-08)이 함께 읽는다. 리포트는 채점이 끝난 답안지에서만
 * 만들어지므로, 두 화면이 서로 다른 목록을 들고 있으면 「채점 완료 0건」인데 리포트는 열여덟
 * 건이 서 있게 된다. 한곳에서 정하고 양쪽이 가져다 쓴다.
 *
 *   회원 채점    여기 든 답안지는 모든 문항이 확인된 것으로 깔린다(lib/sheetMarkStore.ts)
 *   리포트 승인  여기 든 답안지마다 리포트 한 건이 목록에 오른다(lib/reportStore.ts)
 *
 * 채점자가 확인한 점수(seedMarksOf)도 여기서 정한다. 리포트는 그 점수로 조립하므로, 회원 채점의
 * 정오표에 보이는 점수와 리포트의 근거에 적힌 점수가 같은 값이어야 한다.
 *
 * 회차 현황(lib/admin.ts rounds)과 어긋나지 않게 잡는다 — 1회차는 끝났고, 2회차는 막바지라
 * 두 장이 남았고, 3회차는 한창이라 서른세 장 가운데 열두 장만 끝났다.
 *
 * ── 3회차는 날짜가 아니라 「며칠 전」으로 든다 ──
 * 날짜로 박아 두면 한 주만 지나도 열두 건이 모두 예정일을 넘겨, 이 화면이 하는 일(곧 나갈
 * 리포트를 미리 본다)이 화면에서 사라진다. 열 때마다 오늘에서 거꾸로 세어, 언제 열어도 「곧
 * 나갈 것 · 오늘 나간 것 · 지난주에 나간 것」이 함께 보이게 한다.
 *
 * ⚠ 지어낸 값이다. 붙일 때는 채점 API가 답안지의 상태를 돌려주고 이 파일은 통째로 빠진다.
 */

export type SeedGraded = {
  sheet: Sheet;
  /** 채점이 끝난 시각 — 지난 회차는 못 박은 날이다 */
  at?: string;
  /** 며칠 전에 끝났나 — 채점이 한창인 회차는 열 때마다 오늘에서 센다 */
  ago?: number;
  /** 마지막 문항을 확인한 채점자 — 채점 자료(lib/expertStore.ts)에 서는 이름과 같게 둔다 */
  by: string;
};

const GRADERS = ["이서연", "정태호", "강수아", "노아름"];

/** 지난 회차 — 채점을 시작한 날과, 아직 남은 답안지 수 */
const PAST: Record<string, { from: string; left: number }> = {
  "2026-1": { from: "2026-03-05", left: 0 },
  "2026-2": { from: "2026-06-09", left: 2 },
};

/**
 * 3회차에서 채점이 끝난 답안지 — 응시번호 → 며칠 전에 끝났나.
 *
 * 스케줄러의 기본값(7일)에서 세 갈래가 모두 보이게 흩었다 — 여섯 날 안쪽은 「발행 예정」,
 * 이레는 오늘 아침에 나가고, 그보다 오래된 것은 이미 나갔다. 0467은 리포트에 검토가 필요한
 * 표현이 들어 있어(lib/reportStore.ts) 예정일을 넘기고도 「확인 필요」에 남는다.
 */
const RECENT: Record<string, number> = {
  "0442": 0,
  "0443": 1,
  "0453": 2,
  "0447": 3,
  "0449": 4,
  "0474": 5,
  "0451": 6,
  "0454": 7,
  "0483": 8,
  "0467": 9,
  "0444": 10,
  "0456": 12,
};

const pad = (n: number) => String(n).padStart(2, "0");

function build(): SeedGraded[] {
  const out: SeedGraded[] = [];

  seedSheets
    .filter((s) => s.round === "2026-3" && s.seat in RECENT)
    .forEach((sheet, i) => {
      out.push({ sheet, ago: RECENT[sheet.seat], by: GRADERS[i % GRADERS.length] });
    });

  for (const [round, seed] of Object.entries(PAST)) {
    const list = seedSheets.filter((s) => s.round === round);
    list.slice(0, list.length - seed.left).forEach((sheet, i) => {
      /* 하루에 서너 장씩 — 한날에 몰아 두면 발행일도 한날이 되어 목록이 한 줄처럼 읽힌다 */
      const day = addDays(seed.from, 1 + Math.floor(i / 3));
      const at = `${day} ${pad(10 + (i % 3) * 2)}:${pad(10 + ((i * 7) % 50))}`;
      out.push({ sheet, at, by: GRADERS[i % GRADERS.length] });
    });
  }

  return out;
}

export const seedGraded: SeedGraded[] = build();

const byKey = new Map(seedGraded.map((g) => [g.sheet.key, g]));

/** 이 답안지가 씨앗에서 채점이 끝난 것인가 */
export const seedGradedOf = (sheetKey: string) => byKey.get(sheetKey) ?? null;

/* ───────────────────────── 씨앗 채점 ─────────────────────────
   채점이 끝난 답안지의 문항에는 채점자가 AI의 점수를 하나씩 확인한 표시가 있어야 한다. 없으면
   반년 전에 끝난 회차까지 「채점 중 0 / 20」으로 선다.

   저장소(lib/sheetMarkStore.ts)가 이 값을 저장한 값 아래에 깔고, 리포트 저장소
   (lib/reportStore.ts)가 같은 값으로 과목 점수를 낸다. */

/** 이 답안지의 시험지 — 세 과목 전부(lib/examSheet.ts의 paperOf) */
export const subjectsOfSheet = (sheet: Pick<Sheet, "seat">): GradeSubject[] => paperOf(sheet.seat);

/** 글자를 섞어 만든 수 — 같은 문항은 언제 열어도 같은 값이다 */
function hashOf(text: string) {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

/** 채점자가 확인한 점수 — 대개 AI의 점수 그대로이고, 글로 쓴 답은 가끔 반 점을 고친다 */
function seedPoint(sheetKey: string, line: GradeLine) {
  /* 사진으로 낸 답은 AI가 채점하지 않는다. 채점자가 사진을 보고 매긴 점수다 */
  if (line.ai === null) return Math.max(0, line.max - 1);
  /* 기계로 채점한 문항과 답을 내지 않은 문항은 AI의 점수 그대로다 — 빈 답에 반 점이 붙지 않는다 */
  if (autoGraded(line.q) || unanswered(line.q, line.value)) return line.ai;
  if (hashOf(`${sheetKey}/${line.q.id}`) % 5 !== 0) return line.ai;
  return line.ai >= line.max ? line.ai - 0.5 : line.ai + 0.5;
}

export type SeedMark = { points: number; at: string; by: string };

const markCache = new Map<string, Record<string, SeedMark>>();

/** 씨앗에서 채점이 끝난 답안지의 채점 — 문항 ID → 채점자가 확인한 점수 */
export function seedMarksOf(g: SeedGraded): Record<string, SeedMark> {
  const hit = markCache.get(g.sheet.key);
  if (hit) return hit;
  const out: Record<string, SeedMark> = {};
  for (const s of subjectsOfSheet(g.sheet)) {
    for (const line of s.lines) {
      out[line.q.id] = { points: seedPoint(g.sheet.key, line), at: g.at ?? "", by: g.by };
    }
  }
  markCache.set(g.sheet.key, out);
  return out;
}
