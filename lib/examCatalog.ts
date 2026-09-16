import type { RoundState } from "./admin";

/**
 * 학생이 고르는 평가 차림표 — **회차 × 학년**.
 *
 * 접수하기 탭(/exam/apply)에서 회차를 먼저 고르고, 그 안에서 학년 카드를 골라 접수한다.
 * 접수한 평가는 응시하기 탭(/exam)에 올라와 과목별로 응시한다.
 * 회차가 몇 개 있는지·언제 열리는지는 관리자 회차 편성(lib/roundPlanStore.ts)이 들고
 * 있는 것을 그대로 읽고, 여기에는 학생 화면에만 필요한 것 — 학년 칸과 카드 사진,
 * 회차를 부르는 이름 — 만 둔다.
 *
 * ── 학년 칸이 셋인 까닭 ──
 * 초등학교 3-4학년 · 5-6학년, 중학교 1-2학년. 문항 은행의 학년군(lib/blueprint.ts의
 * 3-4 · 5-6)이나 설문 학년대(lib/surveyBands.ts의 넷)와 일부러 따로 둔다. 저쪽은
 * 성취기준 코드와 설문 문항이 갈리는 자리에서 끊은 값이고, 이쪽은 학생이 「내 시험」을
 * 찾는 칸이다. 한 타입으로 묶으면 칸 하나를 바꿀 때 문항 은행이 함께 흔들린다.
 *
 * ⚠ 회차를 먼저 고를지 학년을 먼저 고를지는 아직 정하지 않았다. 차림표를 이 모양
 *   (회차 × 학년 곱)으로 두면 어느 쪽을 바깥에 두든 화면만 바꾸면 된다.
 */

export type TrackId = "e34" | "e56" | "m12";

export type Track = {
  id: TrackId;
  level: "초등학교" | "중학교";
  /** 카드 머리의 학년 — 「3-4학년」 */
  grades: string;
  /** 한 줄로 부를 때 — 「초등 3-4학년」 */
  short: string;
  image: string;
  alt: string;
};

export const tracks: Track[] = [
  {
    id: "e34",
    level: "초등학교",
    grades: "3-4학년",
    short: "초등 3-4학년",
    image: "/promo-trace-make.webp",
    alt: "블록과 색종이로 구조물을 만드는 초등학생의 손",
  },
  {
    id: "e56",
    level: "초등학교",
    grades: "5-6학년",
    short: "초등 5-6학년",
    image: "/promo-trace-write.webp",
    alt: "공책에 연필로 글을 쓰는 초등학생",
  },
  {
    id: "m12",
    level: "중학교",
    grades: "1-2학년",
    short: "중등 1-2학년",
    image: "/promo-trace-observe.webp",
    alt: "탁자에 둘러앉아 함께 과제를 푸는 학생들과 선생님",
  },
];

export const schoolLevels = ["초등학교", "중학교"] as const;

export const isTrackId = (v: string): v is TrackId => tracks.some((t) => t.id === v);

export const trackOf = (id: TrackId) => tracks.find((t) => t.id === id)!;

/**
 * 명부의 학년 글자에서 내 학년 칸을 찾는다 — 카드에 「내 학년」 표시를 붙이는 데만 쓴다.
 *
 * 명부 칸은 「초등 4학년」·「중등 2학년」처럼 들어온다(자녀 등록 화면). 칸이 없는 학년
 * (중3 등)은 null — 억지로 가까운 칸에 붙이면 아이가 제 학년이 아닌 시험을 내 것으로 안다.
 */
export function trackFromGrade(grade?: string): TrackId | null {
  const t = (grade ?? "").trim();
  const n = Number(t.match(/\d/)?.[0] ?? "");
  if (!n) return null;
  if (t.includes("중")) return n === 1 || n === 2 ? "m12" : null;
  if (t.includes("고")) return null;
  if (n === 3 || n === 4) return "e34";
  if (n === 5 || n === 6) return "e56";
  return null;
}

/**
 * 학생 화면에서 부르는 평가 이름 — 「2026 3-1 평가」.
 *
 * 「3-1」은 그 해 세 번째 시기에 열리는 평가 가운데 첫 번째라는 뜻이다. 학생 화면에서는
 * 「회차」라는 말을 쓰지 않고 연도와 이 번호로만 부른다 — 해마다 시기가 넷씩 쌓이고 한
 * 시기에 평가가 여럿이라, 「2026-평가-3회차 초등 3-4학년」처럼 늘여 부르면 목록에서 읽히지
 * 않는다.
 *
 * 뒷번호는 학년군 차례(초3-4 → 초5-6 → 중1-2)를 따른다. 지금 시연 데이터의 약속이다 —
 * 평가 API가 붙으면 평가마다 번호와 학년군을 따로 받는다.
 *
 * 시기 번호 꼴(YYYY-N)이 아닌 것(관리자가 만든 회차)은 넘겨받은 이름에 학년군을 붙인다.
 */
export function evalName(roundId: string, track: TrackId, fallback = roundId) {
  const m = /^(\d{4})-(\d+)$/.exec(roundId);
  const seq = tracks.findIndex((t) => t.id === track) + 1;
  return m ? `${m[1]} ${m[2]}-${seq} 평가` : `${fallback} ${trackOf(track).short} 평가`;
}

/** 「초등학교 3-4학년」 */
export const trackLabel = (id: TrackId) => `${trackOf(id).level} ${trackOf(id).grades}`;

/**
 * 지난 해 평가 — 접수하기 목록이 해를 넘겨 쌓이는 모양을 보려고 둔 **시연용 씨앗**.
 *
 * 관리자 회차 목록(lib/admin.ts rounds)은 2026 파일럿부터 시작해 그 앞 해가 없다. 그 배열을
 * 여러 관리자 화면(지표·채점·면담)이 함께 읽고 있어, 거기에 지난 해를 넣으면 운영 숫자가
 * 통째로 바뀐다. 그래서 학생 화면에서만 덧붙인다 — 모두 마감되어 접수는 막힌다.
 *
 * 해마다 네 시기(2 · 5 · 8 · 11월)로 세 해치를 둔다. 목록이 페이지를 넘기는 모양이 보일
 * 만큼이면 된다.
 *
 * ⚠ 평가 API를 붙이면 이 배열은 빠진다. 지난 평가도 같은 목록에서 내려온다.
 */
const PAST_YEARS = [2025, 2024, 2023];
const SEASONS = [
  ["02-01", "02-28"],
  ["05-01", "05-31"],
  ["08-01", "08-31"],
  ["11-01", "11-30"],
] as const;

export const archivedRounds: { id: string; opensOn: string; closesOn: string }[] =
  PAST_YEARS.flatMap((y) =>
    SEASONS.map(([open, close], i) => ({
      id: `${y}-${i + 1}`,
      opensOn: `${y}-${open}`,
      closesOn: `${y}-${close}`,
    })),
  );

/** 학생에게는 셋으로만 말한다 — 볼 수 있다 · 아직 · 끝났다 */
export type Availability = "open" | "soon" | "ended";

export function availabilityOf(state: RoundState): Availability {
  if (state === "open") return "open";
  if (state === "draft") return "soon";
  return "ended";
}

/** 접수하기 목록이 부르는 상태 */
export const availabilityLabel: Record<Availability, string> = {
  open: "접수 중",
  soon: "접수 예정",
  ended: "접수 마감",
};

/** 「2026-08-01」 → 「2026.08.01」 */
export const dotDate = (d: string) => d.replace(/-/g, ".");

/** 응시하기 탭에서 접수한 평가를 누른 뒤 과목을 하나씩 보는 자리 */
export const roomHref = (roundId: string, track: TrackId) => `/exam/${roundId}/${track}`;
