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

export type Counselor = {
  /** lib/people.ts의 id를 그대로 쓴다 — 같은 사람을 두 번호로 부르지 않는다 */
  id: string;
  person: Person;
  /** 카드 오른쪽 한 줄 — 이 사람과 만나면 무엇을 듣게 되는가 */
  focus: string;
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
 * 면담원 다섯. 순서가 목록에 서는 차례다 — 결과지를 처음 받은 집이 가장 먼저 찾는 사람부터.
 *
 * 토요일에도 둘을 연다. 평일 낮만 열어 두면 맞벌이 가정은 고를 수 있는 칸이 하나도 없고,
 * 그런 달력은 「예약할 수 있다」고 말해 놓고 실제로는 전화를 걸게 만든다.
 */
const SEED: Omit<Counselor, "person">[] = [
  {
    id: "kim-jiwon",
    focus: "결과지의 여덟 축을 「집에서 무엇을 바꿀지」로 옮겨 드립니다.",
    modes: ["video", "onsite"],
    days: [1, 3, 5],
    from: "10:00",
    to: "17:00",
    off: ["12:30", "13:30"],
  },
  {
    id: "lee-seoyeon",
    focus: "초등 교실에서 실제로 어떻게 보이는지를 교사 말로 짚어 드립니다.",
    modes: ["video", "phone"],
    days: [1, 2, 4, 6],
    from: "13:00",
    to: "19:00",
    off: ["15:30", "16:00"],
  },
  {
    id: "im-doyoon",
    focus: "판정이 경계선에 선 까닭과 다음 회차에 볼 것을 설명드립니다.",
    modes: ["video", "phone", "onsite"],
    days: [2, 4],
    from: "10:00",
    to: "18:00",
    off: ["12:00", "13:00"],
  },
  {
    id: "seo-minjeong",
    focus: "서술형 답안을 함께 읽으며 아이가 무엇을 놓쳤는지 봅니다.",
    modes: ["video", "phone"],
    days: [1, 3, 5, 6],
    from: "14:00",
    to: "20:00",
    off: ["17:00", "17:30"],
  },
  {
    id: "park-hyunwoo",
    focus: "점수와 백분위를 어디까지 믿고 읽어야 하는지 말씀드립니다.",
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
