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
 * ── 학년 칸에 학년 하나 ──
 * 초1부터 중3까지 아홉, **학년마다 따로 열린다.** 처음에는 셋(초3-4 · 초5-6 · 중1-2)으로
 * 묶어 두었는데, 묶음으로 열면 3학년과 4학년이 같은 검사지를 받는다. 한 해 차이로 배우는
 * 것이 갈리는 시기라, 묶어 놓으면 아래 학년은 못 푼 문항이 많고 위 학년은 쉬운 문항이
 * 많아 둘 다 자기 자리를 못 본다. 문항 은행이 이미 학년마다 성취기준을 갈라 들고 있고
 * (lib/blueprint.ts의 GradeNo), 해설 템플릿도 초1~중3 학년마다 따로 쓴다.
 *
 * 그래도 이 칸을 문항 은행의 학년과 한 타입으로 묶지 않는다. 저쪽은 성취기준 코드가
 * 갈리는 자리에서 끊은 값이고, 이쪽은 학생이 「내 시험」을 찾는 칸이다 — 한 타입으로 묶으면
 * 카드 사진을 바꾸는 일에 문항 은행이 함께 흔들린다.
 *
 * ── 고등학교는 없다 ──
 * trackFromGrade가 고등학교를 null로 돌려준다. 진단 대상이 초·중이라, 고1 학생이 명부에
 * 오르면 「대상 학년이 아닙니다」로 서야지 가까운 칸에 붙어서는 안 된다.
 *
 * ⚠ 카드 사진은 넷을 아홉이 나눠 쓴다. 학년마다 사진을 새로 찍기 전까지는 학년대로 묶어
 *   같은 사진을 쓴다 — 아홉 칸에 같은 사진 하나를 깔면 카드가 구별되지 않는다.
 */

export type TrackId = "e1" | "e2" | "e3" | "e4" | "e5" | "e6" | "m1" | "m2" | "m3";

export type Track = {
  id: TrackId;
  level: "초등학교" | "중학교";
  /** 카드 머리의 학년 — 「4학년」 */
  grades: string;
  /** 한 줄로 부를 때 — 「초등 4학년」 */
  short: string;
  /** 좁은 자리에 넣는 이름 — 「초4」. 평가 이름과 가로 고르개가 쓴다 */
  tag: string;
  image: string;
  alt: string;
};

/* 사진 넷을 학년대로 나눠 쓴다 */
const PHOTO = {
  make: {
    image: "/promo-trace-make.webp",
    alt: "블록과 색종이로 구조물을 만드는 초등학생의 손",
  },
  write: {
    image: "/promo-trace-write.webp",
    alt: "공책에 연필로 글을 쓰는 초등학생",
  },
  observe: {
    image: "/promo-trace-observe.webp",
    alt: "탁자에 둘러앉아 함께 과제를 푸는 학생들과 선생님",
  },
  speak: {
    image: "/promo-trace-speak.webp",
    alt: "노트북 앞에서 두 손을 벌려 설명하고 있는 학생",
  },
} as const;

const elementary = (n: number, photo: { image: string; alt: string }): Track => ({
  id: `e${n}` as TrackId,
  level: "초등학교",
  grades: `${n}학년`,
  short: `초등 ${n}학년`,
  tag: `초${n}`,
  ...photo,
});

const middle = (n: number, photo: { image: string; alt: string }): Track => ({
  id: `m${n}` as TrackId,
  level: "중학교",
  grades: `${n}학년`,
  short: `중등 ${n}학년`,
  tag: `중${n}`,
  ...photo,
});

export const tracks: Track[] = [
  elementary(1, PHOTO.make),
  elementary(2, PHOTO.make),
  elementary(3, PHOTO.write),
  elementary(4, PHOTO.write),
  elementary(5, PHOTO.observe),
  elementary(6, PHOTO.observe),
  middle(1, PHOTO.speak),
  middle(2, PHOTO.speak),
  middle(3, PHOTO.speak),
];

export const schoolLevels = ["초등학교", "중학교"] as const;

export const isTrackId = (v: string): v is TrackId => tracks.some((t) => t.id === v);

export const trackOf = (id: TrackId) => tracks.find((t) => t.id === id)!;

/**
 * 명부의 학년 글자에서 내 학년 칸을 찾는다.
 *
 * 명부 칸은 「초등 4학년」·「중등 2학년」처럼 들어온다(자녀 등록 화면). 첫 숫자와 학교급
 * 글자만 본다 — 「초등학교 4학년」·「초4」·「중3」 어느 꼴로 들어와도 같은 칸에 닿는다.
 *
 * 고등학교와 범위를 벗어난 숫자는 null이다. 억지로 가까운 칸에 붙이면 아이가 제 학년이
 * 아닌 시험을 내 것으로 안다.
 */
export function trackFromGrade(grade?: string): TrackId | null {
  const t = (grade ?? "").trim();
  const n = Number(t.match(/\d/)?.[0] ?? "");
  if (!n) return null;
  if (t.includes("고")) return null;
  if (t.includes("중")) return n >= 1 && n <= 3 ? (`m${n}` as TrackId) : null;
  return n >= 1 && n <= 6 ? (`e${n}` as TrackId) : null;
}

/**
 * 학생 화면에서 부르는 평가 이름 — 「2026 3분기 초4 평가」.
 *
 * 앞에는 언제(해 · 분기), 뒤에는 누구 것(학년)이 온다. 예전에는 「2026 3-1 평가」처럼
 * 시기 번호에 학년 차례를 붙여 불렀는데, 학년이 아홉이 되면서 뒷번호가 무엇을 가리키는지
 * 읽히지 않게 되었다 — 「3-7」을 보고 중1을 떠올릴 사람은 없다.
 *
 * 「회차」라는 말은 학생 화면에서 쓰지 않는다. 해마다 분기가 넷씩 쌓이므로 연도와 분기로
 * 부르는 편이 짧고, 관리자가 부르는 회차 번호(2026-3)와도 한눈에 이어진다.
 *
 * 시기 번호 꼴(YYYY-N)이 아닌 것(관리자가 만든 회차)은 넘겨받은 이름에 학년을 붙인다.
 */
export function evalName(roundId: string, track: TrackId, fallback = roundId) {
  const m = /^(\d{4})-([1-4])$/.exec(roundId);
  const tag = trackOf(track).tag;
  return m ? `${m[1]} ${m[2]}분기 ${tag} 평가` : `${fallback} ${tag} 평가`;
}

/**
 * 평가가 열린 **해와 분기** — 「2026년 3분기」.
 *
 * 평가는 해마다 네 시기(2 · 5 · 8 · 11월)로 열린다. 시기 번호는 회차 번호에 이미 들어
 * 있지만(2026-3), 관리자가 손으로 만든 회차는 그 꼴이 아닐 수 있어 **접수 시작 달**에서도
 * 뽑을 수 있게 해 둔다. 둘 다 없는 회차는 없다 — 기간은 모든 회차가 들고 있다.
 *
 * 목록을 해 · 분기로 접는 화면(보호자 결제 · 접수하기)이 저마다 이 셈을 두면, 어느 날
 * 한쪽만 고쳐져 같은 평가가 다른 분기에 선다.
 */
export function seasonOf(round: { id: string; opensOn: string }): { year: string; quarter: number } {
  const m = /^(\d{4})-([1-4])$/.exec(round.id);
  if (m) return { year: m[1], quarter: Number(m[2]) };
  const month = Number(round.opensOn.slice(5, 7)) || 1;
  return { year: round.opensOn.slice(0, 4), quarter: Math.floor((month - 1) / 3) + 1 };
}

export const QUARTERS = [1, 2, 3, 4] as const;

/** 「3분기」 */
export const quarterLabel = (q: number) => `${q}분기`;

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
