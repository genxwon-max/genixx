import { minOf, timeOf, weekday } from "./calendar";
import { personById, type Person } from "./people";

/**
 * 결과 해석 면담을 맡는 전문가 — 보호자가 고르는 상담사.
 *
 * ── 사람을 새로 만들지 않는다 ──
 * 이름·경력은 전부 참여진(lib/people.ts)에서 가져온다. 저기는 이미 **예시 데이터**임을
 * 밝혀 둔 자리이고(peopleDisclaimer), 상담사라고 따로 열 명을 더 지어내면 같은 조직에
 * 서로 모르는 사람이 스무 명 서게 된다. 확정 명단이 오면 저 파일 한 곳만 갈아 끼운다.
 *
 * 여기에 더하는 것은 **면담이라는 일에만 있는 값**이다 — 이 사람과 만나면 무엇을 듣게
 * 되는가(focus), 어떤 방식으로 만나는가(modes), 언제 자리가 있는가(days·from·to).
 * 저 값들은 사람의 이력이 아니라 운영 약속이라 이 파일이 주인이다.
 *
 * ── 면담이 둘이다 ──
 * 여기서 잡는 것은 보호자가 신청하는 **결과 해석 면담**이다. 판정이 갈리는 경계선
 * 사례를 전문가가 불러 확인하는 면담(EXP-06, lib/interviewStore.ts)은 다른 일이고, 그쪽은
 * 우리가 대상을 고르지 보호자가 날짜를 고르지 않는다. 두 자리를 한 저장소에 담지 않는
 * 까닭이 그것이다.
 *
 * ⚠ 사진이 없다. public/people/{id}.* 가 비어 있어 화면은 이름 모노그램으로 대신 그린다
 *   — 지어낸 인물에 실제 사진을 붙일 수 없다. 확정 명단과 함께 사진이 오면 그 폴더에
 *   넣기만 하면 된다(components/site/PersonAvatar.tsx와 같은 규칙).
 */

/** 만나는 방식 — 면담 일정 콘솔(lib/interviewStore.ts)의 InterviewMode와 같은 갈래로 둔다 */
export type CounselMode = "video" | "phone" | "onsite";

export const counselModes: Record<CounselMode, string> = {
  video: "화상",
  phone: "전화",
  onsite: "대면",
};

/**
 * 면담 길이 — 30분과 60분.
 *
 * 눈금도 30분이다. 「10분 남은 자리」가 목록에 서면 보호자는 그 자리를 고를 수 없는데도
 * 왜 못 고르는지 알 수 없다. 60분 면담은 30분 칸 두 개가 잇달아 비어 있을 때만 선다.
 */
export const SPANS = [30, 60] as const;
export type Span = (typeof SPANS)[number];
export const STEP = 30;

export const spanLabel = (s: Span) => (s === 30 ? "30분" : "60분");

/**
 * 면담 값 — 길이로만 정한다.
 *
 * 전문가마다 값을 달리 매기지 않는다. 같은 결과지를 놓고 나누는 자리인데 사람마다 값이
 * 다르면 목록이 곧 「비싼 사람 · 싼 사람」으로 읽히고, 보호자는 값으로 전문성을 어림하게
 * 된다. 이 진단이 등급을 매기지 않기로 한 것과 같은 까닭이다.
 *
 * ⚠ 관리자 상품 관리(PAY-01)에 면담 상품이 서면 그 값을 읽는다. 지금은 여기가 주인이다.
 */
export const counselFee: Record<Span, number> = { 30: 60_000, 60: 100_000 };

export const feeOf = (span: Span) => counselFee[span];

/** 「30분 60,000원」 — 카드와 고르개가 같은 글자를 쓴다 */
export const feeText = (span: Span) =>
  `${spanLabel(span)} ${counselFee[span].toLocaleString("ko-KR")}원`;

/**
 * 무엇을 물으러 오는가 — 목록을 거르는 조건.
 *
 * 전문 분야 꼬리표(person.tags)로 거르지 않는다. 「IRT」·「구인 타당도」는 우리끼리 쓰는
 * 말이라, 보호자가 고르개에서 그 말을 보고 자기 물음을 찾을 수 없다. 물음의 갈래 넷으로
 * 묶고, 전문가마다 그 가운데 맡는 것을 적는다.
 */
export type CounselTopic = "report" | "school" | "career" | "score";

export const counselTopics: Record<CounselTopic, string> = {
  report: "결과지 해석",
  school: "학교생활 · 학습",
  career: "진로 · 심화 과정",
  score: "점수 · 검사 이해",
};

export const topicList = Object.keys(counselTopics) as CounselTopic[];

export type Counselor = {
  /** lib/people.ts의 id를 그대로 쓴다 — 같은 사람을 두 번호로 부르지 않는다 */
  id: string;
  person: Person;
  /** 카드 오른쪽 한 줄 — 이 사람과 만나면 무엇을 듣게 되는가 */
  focus: string;
  /** 어떤 물음을 맡는가 — 목록 고르개가 이것으로 거른다 */
  topics: CounselTopic[];
  /**
   * 이 사람이 받는 면담 길이.
   *
   * 사람마다 다르다. 30분만 받는 이는 정해진 물음에 답하는 자리로 시간을 끊어 두고,
   * 60분만 받는 이는 아이 이야기를 처음부터 듣고 시작해야 하는 자리라 반 시간으로는
   * 끝나지 않는다. 둘 다 받는 이도 있다.
   */
  spans: Span[];
  modes: CounselMode[];
  /** 면담을 받는 요일. 0=일 … 6=토 */
  days: number[];
  /** 하루 중 자리를 여는 구간 */
  from: string;
  to: string;
  /** 비워 두는 구간 [시작, 끝) — 점심·내부 회의 */
  off: [string, string];
};

/**
 * 면담원 일곱. 순서가 목록에 서는 차례다 — 결과지를 처음 받은 집이 가장 먼저 찾는 사람부터.
 *
 * 토요일에도 둘을 연다. 평일 낮만 열어 두면 맞벌이 가정은 고를 수 있는 칸이 하나도 없고,
 * 그런 달력은 「예약할 수 있다」고 말해 놓고 실제로는 전화를 걸게 만든다.
 *
 * ⚠ 확정 명단(한국창의영재교육원 40인)이 오면 이 배열이 수십 줄이 된다. 목록에 고르개와
 *   「더 보기」를 먼저 세워 둔 까닭이 그것이다 — 일곱일 때 필요해서가 아니라, 마흔이
 *   되었을 때 화면을 다시 짜지 않으려고.
 */
const SEED: Omit<Counselor, "person">[] = [
  {
    id: "kim-jiwon",
    focus: "결과지의 여덟 축을 「집에서 무엇을 바꿀지」로 옮겨 드립니다.",
    topics: ["report", "career"],
    spans: [30, 60],
    modes: ["video", "onsite"],
    days: [1, 3, 5],
    from: "10:00",
    to: "17:00",
    off: ["12:30", "13:30"],
  },
  {
    id: "lee-seoyeon",
    focus: "초등 교실에서 실제로 어떻게 보이는지를 교사 말로 짚어 드립니다.",
    topics: ["school", "report"],
    spans: [30],
    modes: ["video", "phone"],
    days: [1, 2, 4, 6],
    from: "13:00",
    to: "19:00",
    off: ["15:30", "16:00"],
  },
  {
    id: "im-doyoon",
    focus: "판정이 경계선에 선 까닭과 다음 회차에 볼 것을 설명드립니다.",
    topics: ["report", "career"],
    spans: [60],
    modes: ["video", "phone", "onsite"],
    days: [2, 4],
    from: "10:00",
    to: "18:00",
    off: ["12:00", "13:00"],
  },
  {
    id: "seo-minjeong",
    focus: "서술형 답안을 함께 읽으며 아이가 무엇을 놓쳤는지 봅니다.",
    topics: ["score", "school"],
    spans: [30, 60],
    modes: ["video", "phone"],
    days: [1, 3, 5, 6],
    from: "14:00",
    to: "20:00",
    off: ["17:00", "17:30"],
  },
  {
    id: "choi-eunbi",
    focus: "아이가 어떤 문제에서 오래 머물렀는지를 문항 쪽에서 읽어 드립니다.",
    topics: ["score", "school"],
    spans: [30, 60],
    modes: ["video", "phone"],
    days: [2, 4, 6],
    from: "10:00",
    to: "16:00",
    off: ["12:30", "13:30"],
  },
  {
    id: "yoon-daehyun",
    focus: "심화 과정을 권할 때와 한 해 더 기다릴 때를 가려 말씀드립니다.",
    topics: ["career"],
    spans: [60],
    modes: ["video", "onsite"],
    days: [1, 4],
    from: "14:00",
    to: "19:00",
    off: ["16:30", "17:00"],
  },
  {
    id: "park-hyunwoo",
    focus: "점수와 백분위를 어디까지 믿고 읽어야 하는지 말씀드립니다.",
    topics: ["score"],
    spans: [30],
    modes: ["video"],
    days: [3, 5],
    from: "09:30",
    to: "15:00",
    off: ["12:00", "13:00"],
  },
];

/**
 * 상담사 목록.
 *
 * 참여진에 없는 번호는 조용히 뺀다 — 저쪽 명단이 바뀌어 이름이 사라졌을 때 화면이
 * undefined.name에서 멈추는 것보다, 그 사람만 목록에 안 서는 편이 낫다.
 */
export const counselors: Counselor[] = SEED.flatMap((c) => {
  const person = personById(c.id);
  return person ? [{ ...c, person }] : [];
});

export const counselorOf = (id: string) => counselors.find((c) => c.id === id) ?? null;

/**
 * 카드에 세우는 짧은 연혁 석 줄 — 학위·주요 경력·지금 하는 일.
 *
 * 따로 적어 두지 않고 참여진의 경력(person.career)에서 고른다. 두 벌로 들면 상세에서
 * 편 경력과 카드의 연혁이 서로 다른 말을 하게 되고, 실제로 한 번 그렇게 갈렸다.
 * 마지막 줄은 늘 지금 맡은 일이라 가운데를 접는다.
 */
export function briefOf(c: Counselor): string[] {
  const career = c.person.career;
  if (career.length <= 3) return career;
  return [career[0], career[1], career[career.length - 1]];
}

/* ───────────────────────── 목록 고르개 ─────────────────────────
   마흔 명이 한 줄로 서면 보호자는 맨 위 셋만 보고 고른다. 무엇을 물으러 왔는지(주제),
   어떻게 만날 수 있는지(방식), 얼마나 이야기할 수 있는지(길이)로 좁힌다.

   날짜는 여기 없다. 날짜는 사람을 고른 **뒤에** 그 사람의 달력에서 고르는 값이라,
   고르개에 넣으면 같은 조건을 두 곳에서 묻게 된다. */

export type CounselQuery = {
  /** 이름 · 직함 · 소개 · 분야 꼬리표에서 찾는다 */
  q: string;
  topic: CounselTopic | "";
  mode: CounselMode | "";
  /** 0이면 길이를 따지지 않는다 */
  span: Span | 0;
};

export const blankQuery = (): CounselQuery => ({ q: "", topic: "", mode: "", span: 0 });

export const isFiltered = (v: CounselQuery) =>
  v.q.trim() !== "" || v.topic !== "" || v.mode !== "" || v.span !== 0;

/** 고르개 한 벌로 목록을 거른다. 차례는 건드리지 않는다 */
export function filterCounselors(list: Counselor[], v: CounselQuery): Counselor[] {
  const needle = v.q.trim().toLowerCase();
  return list.filter((c) => {
    if (v.topic && !c.topics.includes(v.topic)) return false;
    if (v.mode && !c.modes.includes(v.mode)) return false;
    if (v.span && !c.spans.includes(v.span)) return false;
    if (!needle) return true;
    const hay = [c.person.name, c.person.role, c.focus, ...c.person.tags]
      .join(" ")
      .toLowerCase();
    return hay.includes(needle);
  });
}

/** 이 상담사가 그 날 자리를 여는가 — 요일만 본다 */
export const worksOn = (c: Counselor, date: string) => c.days.includes(weekday(date));

/**
 * 그 날 이 상담사의 30분 칸 전부 — 아직 누가 찼는지는 보지 않는다.
 *
 * 비우는 구간(off)에 걸치는 칸은 세우지 않는다. 「12:30에 시작해 13:00에 끝나는 면담」은
 * 점심에 걸리지 않지만 12:30~13:30을 비워 두기로 했으면 그 칸도 없는 것이다.
 */
export function cellsOf(c: Counselor): string[] {
  const cells: string[] = [];
  const [offFrom, offTo] = [minOf(c.off[0]), minOf(c.off[1])];
  for (let m = minOf(c.from); m + STEP <= minOf(c.to); m += STEP) {
    if (m < offTo && m + STEP > offFrom) continue;
    cells.push(timeOf(m));
  }
  return cells;
}

/**
 * 이미 차 있는 칸인가 — **시연용 가짜 일정**.
 *
 * Math.random을 쓰지 않는다. 페이지를 열 때마다 빈자리가 바뀌면 서버가 그린 화면과
 * 브라우저가 그린 화면이 갈리고(hydration), 시연 중에 같은 달력을 두 번 보여 줄 수도
 * 없다. 번호·날짜·시각 세 값을 섞어 늘 같은 답을 내는 해시를 쓴다.
 *
 * 열에 셋쯤 찬다 — 다 비어 있으면 달력이 아니라 표처럼 보이고, 절반이 차면 고를 수 있는
 * 자리를 찾느라 날짜를 여러 번 넘겨야 한다.
 *
 * 붙일 때는 이 함수가 면담 API의 「예약된 시간」 응답으로 통째로 바뀐다.
 */
export function seedBusy(c: Counselor, date: string, start: string): boolean {
  let h = 2166136261;
  const key = `${c.id}|${date}|${start}`;
  for (let i = 0; i < key.length; i += 1) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 10 < 3;
}
