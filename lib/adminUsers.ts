/**
 * 사용자·운영자 디렉터리(ADM-02 / ADM-03)의 예시 데이터.
 *
 * ⚠ 전부 화면 설계를 위한 가짜 데이터입니다. 실존 인물이 아니며, 연락처는 처음부터
 *   가려진 형태로만 만듭니다 — 관리자 화면 설계본에 온전한 연락처 문자열이 남아 있을
 *   이유가 없습니다.
 *
 * 목록을 20명씩 끊어 보고 10·50·100으로 바꿔 보려면 표본이 두 자리로는 모자란다.
 * 그렇다고 수백 줄을 손으로 적을 수도 없어서, **씨앗 고정 난수**로 만든다. 모듈은
 * 서버와 브라우저에서 각각 평가되므로 Math.random을 쓰면 두 결과가 갈려 하이드레이션이
 * 깨진다. 같은 씨앗은 언제나 같은 목록을 낸다.
 *
 * 기관은 lib/admin.ts의 orgs 여섯 곳을 앞에 두고 뒤에 생성분을 잇는다. 운영 화면
 * (/admin/orgs)에서 보던 기관이 디렉터리에서 사라지면 같은 것을 두 곳에서 다르게
 * 말하는 셈이 된다.
 */

import { orgs as seedOrgs, staff as seedStaff, type OrgRow, type StaffRoleId } from "./admin";

/* ───────────────────────── 씨앗 고정 난수 ───────────────────────── */

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const pick = <T>(r: () => number, list: readonly T[]) => list[Math.floor(r() * list.length)];

/* ───────────────────────── 이름·소속 재료 ───────────────────────── */

const FAMILY = [
  "김",
  "이",
  "박",
  "최",
  "정",
  "강",
  "조",
  "윤",
  "장",
  "임",
  "한",
  "오",
  "서",
  "신",
  "권",
  "황",
  "안",
  "송",
  "류",
  "전",
] as const;

const GIVEN = [
  "서준",
  "하윤",
  "도윤",
  "지우",
  "예준",
  "서연",
  "시우",
  "하은",
  "주원",
  "지민",
  "지호",
  "수아",
  "준우",
  "다은",
  "건우",
  "채원",
  "우진",
  "지아",
  "선우",
  "유진",
  "은우",
  "소율",
  "민준",
  "가은",
  "현우",
  "예린",
  "재윤",
  "나윤",
  "태윤",
  "서아",
] as const;

const SCHOOLS = [
  "서울 목동초등학교",
  "서울 상암초등학교",
  "경기 분당중앙초등학교",
  "경기 일산해솔초등학교",
  "인천 청라초등학교",
  "부산 해운대초등학교",
  "대전 둔산초등학교",
  "광주 봉선초등학교",
  "대구 수성초등학교",
  "세종 한솔초등학교",
  "울산 옥동초등학교",
  "충북 청주가경초등학교",
] as const;

const REGIONS = [
  "서울 강서",
  "서울 노원",
  "서울 양천",
  "경기 성남",
  "경기 고양",
  "경기 수원",
  "인천 서구",
  "부산 해운대",
  "대전 서구",
  "대구 수성",
  "광주 남구",
  "세종",
] as const;

const MAILS = ["gmail.com", "naver.com", "daum.net", "kakao.com", "hanmail.net"] as const;

const GRADES = ["초3", "초4", "초5", "초6", "중1"] as const;

/** 아이디 앞 두 글자만 남기고 가린 형태. 실제 이름과 이어지지 않게 따로 뽑는다 */
const MAIL_HEADS = [
  "do",
  "ji",
  "su",
  "mi",
  "ha",
  "yu",
  "se",
  "na",
  "ta",
  "bo",
  "ga",
  "ru",
  "ki",
  "ma",
  "no",
  "sa",
  "un",
  "we",
  "yo",
  "za",
] as const;

/** 연락처는 처음부터 가린 채로 만든다 */
function maskedMail(r: () => number) {
  return `${pick(r, MAIL_HEADS)}****@${pick(r, MAILS)}`;
}

function maskedPhone(r: () => number) {
  return `010-${String(Math.floor(r() * 9000) + 1000).slice(0, 2)}**-****`;
}

/** YYYY-MM-DD. 2025-06-01부터 days일 뒤 */
function dateFrom(days: number) {
  const base = Date.UTC(2025, 5, 1);
  const d = new Date(base + days * 86_400_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/* ───────────────────────── 공통 상태 ───────────────────────── */

export type UserState = "active" | "pending" | "dormant" | "suspended" | "withdrawn";

export const userStateLabel: Record<UserState, { label: string; className: string }> = {
  active: { label: "활성", className: "text-emerald-700" },
  pending: { label: "승인 대기", className: "text-amber-700" },
  dormant: { label: "휴면", className: "text-exam-muted" },
  suspended: { label: "정지", className: "text-rose-600" },
  withdrawn: { label: "탈퇴", className: "text-rose-600" },
};

/** 목록 걸러내기에 쓰는 상태 목록 — 화면마다 다시 적지 않는다 */
export const userStateOptions = (Object.keys(userStateLabel) as UserState[]).map((v) => ({
  value: v,
  label: userStateLabel[v].label,
}));

/* ───────────────────────── 학부모 ───────────────────────── */

export type ParentRow = {
  id: string;
  name: string;
  contact: string;
  phone: string;
  region: string;
  /** 등록한 자녀 수 */
  kids: number;
  state: UserState;
  joinedAt: string;
  lastSeen: string;
};

function makeParents(count: number): ParentRow[] {
  const r = rng(20260817);
  return Array.from({ length: count }, (_, i) => {
    const name = `${pick(r, FAMILY)}${pick(r, GIVEN)}`;
    const roll = r();
    const state: UserState =
      roll > 0.94 ? "withdrawn" : roll > 0.88 ? "dormant" : roll > 0.85 ? "suspended" : "active";
    return {
      id: `M-1${String(100 + i * 7).padStart(5, "0")}`,
      name,
      contact: maskedMail(r),
      phone: maskedPhone(r),
      region: pick(r, REGIONS),
      kids: 1 + Math.floor(r() * 3),
      state,
      joinedAt: dateFrom(Math.floor(r() * 430)),
      lastSeen: dateFrom(320 + Math.floor(r() * 110)),
    };
  });
}

export const parents = makeParents(96);

/* ───────────────────────── 학생 ───────────────────────── */

export type ExamState = "not-started" | "in-progress" | "submitted" | "reported";

export const examStateLabel: Record<ExamState, { label: string; className: string }> = {
  "not-started": { label: "미응시", className: "text-exam-muted" },
  "in-progress": { label: "응시 중", className: "text-brand-700" },
  submitted: { label: "제출 완료", className: "text-amber-700" },
  reported: { label: "리포트 발행", className: "text-emerald-700" },
};

export type StudentRow = {
  id: string;
  name: string;
  /** 8자리 접속코드 */
  code: string;
  school: string;
  grade: string;
  /** 보호자 이름 (학부모 계정) */
  guardian: string;
  guardianId: string;
  exam: ExamState;
  state: UserState;
  joinedAt: string;
};

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeStudents(count: number): StudentRow[] {
  const r = rng(970413);
  return Array.from({ length: count }, (_, i) => {
    const parent = parents[Math.floor(r() * parents.length)];
    const roll = r();
    const exam: ExamState =
      roll > 0.72
        ? "reported"
        : roll > 0.5
          ? "submitted"
          : roll > 0.28
            ? "in-progress"
            : "not-started";
    return {
      id: `S-2${String(400 + i * 3).padStart(5, "0")}`,
      name: `${pick(r, FAMILY)}${pick(r, GIVEN)}`,
      code: Array.from({ length: 8 }, () => CODE_CHARS[Math.floor(r() * CODE_CHARS.length)]).join(
        "",
      ),
      school: pick(r, SCHOOLS),
      grade: pick(r, GRADES),
      guardian: parent.name,
      guardianId: parent.id,
      exam,
      state: r() > 0.95 ? "dormant" : "active",
      joinedAt: dateFrom(Math.floor(r() * 430)),
    };
  });
}

export const students = makeStudents(148);

/* ───────────────────────── 교사 ───────────────────────── */

export type TeacherRow = {
  id: string;
  name: string;
  contact: string;
  school: string;
  region: string;
  /** 담당 학급 수 */
  classes: number;
  /** 설문을 입력해야 하는 학생 수 */
  charge: number;
  state: UserState;
  joinedAt: string;
};

function makeTeachers(count: number): TeacherRow[] {
  const r = rng(551103);
  return Array.from({ length: count }, (_, i) => {
    const name = `${pick(r, FAMILY)}${pick(r, GIVEN)}`;
    const roll = r();
    const state: UserState =
      roll > 0.82 ? "pending" : roll > 0.76 ? "dormant" : roll > 0.73 ? "suspended" : "active";
    return {
      id: `T-3${String(100 + i * 5).padStart(5, "0")}`,
      name,
      contact: maskedMail(r),
      school: pick(r, SCHOOLS),
      region: pick(r, REGIONS),
      classes: 1 + Math.floor(r() * 3),
      charge: 18 + Math.floor(r() * 22),
      state,
      joinedAt: dateFrom(Math.floor(r() * 430)),
    };
  });
}

export const teachers = makeTeachers(52);

/* ───────────────────────── 기관 ───────────────────────── */

const ORG_KINDS = ["학원", "학교", "교육원", "교육청"] as const;
const ORG_HEADS = [
  "에듀",
  "미래",
  "한빛",
  "새싹",
  "다온",
  "예솔",
  "이룸",
  "누리",
  "가온",
  "온새미",
] as const;
const ORG_TAILS = ["학원", "교육원", "영재교육원", "학습센터", "교육지원청"] as const;

function makeOrgs(count: number): OrgRow[] {
  const r = rng(310724);
  return Array.from({ length: count }, (_, i) => {
    const total = (2 + Math.floor(r() * 8)) * 25;
    const used = Math.floor(total * (0.25 + r() * 0.7));
    const roll = r();
    return {
      id: `O-2${String(100 + i * 11).padStart(3, "0")}`,
      name: `${pick(r, REGIONS)} ${pick(r, ORG_HEADS)}${pick(r, ORG_TAILS)}`,
      kind: pick(r, ORG_KINDS),
      region: pick(r, REGIONS),
      manager: `${pick(r, FAMILY)}${pick(r, GIVEN)}`,
      students: 20 + Math.floor(r() * 240),
      seats: [used, total],
      contract: roll > 0.86 ? "expired" : roll > 0.7 ? "trial" : "active",
      until: dateFrom(400 + Math.floor(r() * 400)),
    };
  });
}

/** 운영 화면에서 쓰던 여섯 곳을 앞에 두고 뒤에 생성분을 잇는다 */
export const orgDirectory: OrgRow[] = [...seedOrgs, ...makeOrgs(28)];

/* ───────────────────────── 운영자 (관리자) ───────────────────────── */

export type StaffMember = {
  id: string;
  loginId: string;
  name: string;
  role: StaffRoleId;
  team: string;
  mfa: boolean;
  state: UserState;
  lastSeen: string;
  joinedAt: string;
};

const TEAMS = [
  "운영총괄",
  "평가팀",
  "출제팀",
  "검수팀",
  "기관사업팀",
  "고객지원팀",
  "데이터팀",
] as const;
const ROLE_POOL: StaffRoleId[] = ["super", "author", "reviewer", "master"];

/** 시연용 계정 일곱은 lib/admin.ts의 staff를 그대로 옮겨 온다 */
const seeded: StaffMember[] = seedStaff.map((s, i) => ({
  id: s.id,
  loginId: `${s.role}.${s.name.slice(1)}${i}`,
  name: s.name,
  role: s.role,
  team: s.team,
  mfa: s.mfa,
  state: "active",
  lastSeen: s.lastSeen,
  joinedAt: dateFrom(Math.floor(i * 23)),
}));

function makeStaff(count: number): StaffMember[] {
  const r = rng(880219);
  return Array.from({ length: count }, (_, i) => {
    const role = pick(r, ROLE_POOL);
    const name = `${pick(r, FAMILY)}${pick(r, GIVEN)}`;
    const roll = r();
    return {
      id: `U-${String(20 + i * 2).padStart(2, "0")}`,
      loginId: `${role}.${String.fromCharCode(97 + (i % 26))}${100 + i}`,
      name,
      role,
      team: pick(r, TEAMS),
      mfa: r() > 0.22,
      state: roll > 0.9 ? "suspended" : roll > 0.84 ? "dormant" : "active",
      lastSeen: `${dateFrom(420 + Math.floor(r() * 20))}`,
      joinedAt: dateFrom(Math.floor(r() * 400)),
    };
  });
}

export const staffDirectory: StaffMember[] = [...seeded, ...makeStaff(21)];
