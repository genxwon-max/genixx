/**
 * 사용자·운영자 디렉터리(ADM-02 / ADM-03)의 예시 데이터.
 *
 * ⚠ 전부 화면 설계를 위한 가짜 데이터입니다. 실존 인물이 아닙니다.
 *
 * 연락처는 **온전한 값으로 만들고, 가리는 일은 그리는 쪽에서** 한다. 한동안 가려진
 * 형태로만 만들었는데(관리자 설계본에 온전한 연락처가 남아 있을 이유가 없다는 이유였다),
 * 그러면 상세 화면에서 관리자가 전화를 걸 수도 메일을 보낼 수도 없다. 목록은 여러
 * 사람을 한꺼번에 펴 보는 자리라 계속 가리고, 상세는 한 사람을 붙들고 일하는 자리라
 * 편다 — maskMail·maskPhone이 그 경계다.
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

/** 지역 열둘. 목록의 거르개는 「등장한 지역」만 쓰지만, 상세의 지역 고르개는 이 전부를
    쓴다 — 아무도 없는 지역으로 이사한 회원을 옮길 자리가 없으면 그 칸은 못 고치는 칸이다 */
export const REGIONS = [
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

/** 학년 다섯. 목록의 거르개는 「등장한 학년」만 쓰지만, 상세의 학년 고르개는 이 전부를
    쓴다 — 아무도 없는 학년으로 진급한 학생을 옮길 자리가 없으면 그 칸은 못 고치는 칸이다 */
export const GRADES = ["초3", "초4", "초5", "초6", "중1"] as const;

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

/** 아이디 뒷마디. 앞 두 글자와 짝을 이뤄 그럴듯한 아이디를 만든다 */
const MAIL_TAILS = [
  "min",
  "young",
  "hee",
  "jun",
  "seo",
  "won",
  "kyung",
  "ha",
  "rin",
  "bin",
  "sol",
  "eun",
  "gyu",
  "chan",
  "yeon",
  "hyun",
  "na",
  "joo",
  "tae",
  "wook",
] as const;

/* 난수는 예전과 **같은 횟수만** 뽑는다. 한 번이라도 더 뽑으면 씨앗이 뒤로 밀려 이름·
   지역·날짜가 통째로 다른 명부가 되고, 화면을 대조하던 사람이 전부 다시 봐야 한다.
   그래서 뒷마디와 번호는 앞에서 뽑은 자리(i)에서 만들어 낸다. */
function fullMail(r: () => number) {
  const i = Math.floor(r() * MAIL_HEADS.length);
  const domain = pick(r, MAILS);
  return `${MAIL_HEADS[i]}${MAIL_TAILS[i]}${10 + i * 3}@${domain}`;
}

function fullPhone(r: () => number) {
  const head = Math.floor(r() * 9000) + 1000;
  return `010-${head}-${String((head * 7919) % 10000).padStart(4, "0")}`;
}

/**
 * 목록에서 쓰는 가림. 성만 남긴다 — 김○○.
 *
 * components/admin/StudentTable.tsx 안에 갇혀 있던 것을 올렸다. 가림 함수 셋이 한 자리에
 * 있어야 「목록은 가리고 상세는 편다」가 규약으로 지켜진다 — 화면마다 제 것을 지으면
 * 어느 화면은 성만 남기고 어느 화면은 가운데만 가리는 상태가 된다.
 */
export function maskName(v: string) {
  return v.length < 2 ? v : `${v[0]}${"○".repeat(v.length - 1)}`;
}

/** 목록에서 쓰는 가림. 아이디 앞 두 글자만 남긴다 */
export function maskMail(v: string) {
  const at = v.indexOf("@");
  if (at < 1) return v;
  return `${v.slice(0, 2)}****${v.slice(at)}`;
}

/** 목록에서 쓰는 가림. 국번 앞 두 자리만 남긴다 */
export function maskPhone(v: string) {
  const p = v.split("-");
  if (p.length !== 3) return v;
  return `${p[0]}-${p[1].slice(0, 2)}**-****`;
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
  /**
   * 이 계정으로 등록된 학생 수.
   *
   * 따로 굴린 난수(1~3)로 두었더니 「자녀 2」인 학부모의 상세 화면에 연결된 학생이
   * 하나도 없었다. 학생 명부에서 센다 — 같은 것을 두 곳에서 다르게 말하지 않는다.
   * 0이 나오는 계정이 있는데, 가입만 하고 아직 아이를 등록하지 않은 상태다.
   */
  kids: number;
  state: UserState;
  joinedAt: string;
  lastSeen: string;
};

/** 자녀 수를 아직 못 세는 단계의 학부모 — 학생 명부가 이 목록을 보고 만들어진다 */
function makeParents(count: number): Omit<ParentRow, "kids">[] {
  const r = rng(20260817);
  return Array.from({ length: count }, (_, i) => {
    const name = `${pick(r, FAMILY)}${pick(r, GIVEN)}`;
    const roll = r();
    const state: UserState =
      roll > 0.94 ? "withdrawn" : roll > 0.88 ? "dormant" : roll > 0.85 ? "suspended" : "active";
    return {
      id: `M-1${String(100 + i * 7).padStart(5, "0")}`,
      name,
      contact: fullMail(r),
      phone: fullPhone(r),
      region: pick(r, REGIONS),
      state,
      joinedAt: dateFrom(Math.floor(r() * 430)),
      lastSeen: dateFrom(320 + Math.floor(r() * 110)),
    };
  });
}

/* 학부모 → 학생 → 자녀 수 순서로 만든다. 학생이 학부모를 골라 붙는 구조라 순서를
   되돌릴 수 없고, 그래서 자녀 수는 학생 명부가 선 뒤에야 셀 수 있다. */
const parentBase = makeParents(96);

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
  /**
   * 응시 누적 횟수 — 이 접속코드로 지금까지 응시를 시작한 회차 수(지금 보는 중인 회차 포함).
   *
   * 「코드가 안 먹는다」는 문의의 절반은 이미 응시를 마친 코드로 다시 들어오려는 경우라,
   * 목록에서 코드 옆에 이 수가 서 있어야 전화로 바로 가린다. 미응시면 0.
   */
  attempts: number;
  state: UserState;
  joinedAt: string;
};

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/* 학부모 목록을 인자로 받는다. 모듈 바깥의 parents를 보게 두면 그 상수가 이 함수보다
   먼저 서 있어야 하는데, 자녀 수를 세려면 반대로 학생이 먼저 서야 한다 */
function makeStudents(count: number, from: readonly Omit<ParentRow, "kids">[]): StudentRow[] {
  const r = rng(970413);
  return Array.from({ length: count }, (_, i) => {
    const parent = from[Math.floor(r() * from.length)];
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
      /* 난수를 따로 굴린다 — 명부의 r()를 한 번 더 부르면 그 뒤 학생의 이름 · 코드가 전부 밀린다 */
      attempts: exam === "not-started" ? 0 : 1 + Math.floor(rng(5150 + i)() * 3),
      state: r() > 0.95 ? "dormant" : "active",
      joinedAt: dateFrom(Math.floor(r() * 430)),
    };
  });
}

export const students = makeStudents(148, parentBase);

/** 학생 명부에서 센 자녀 수를 얹어 학부모 명부를 완성한다 */
export const parents: ParentRow[] = parentBase.map((p) => ({
  ...p,
  kids: students.filter((s) => s.guardianId === p.id).length,
}));

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
      contact: fullMail(r),
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

/* ───────────────────────── 회원 찾기 ─────────────────────────
   회원 상세(ADM-02-3)는 주소의 번호 하나만 들고 온다. 그 번호가 학부모인지 교사인지는
   두 명부를 다 뒤져 봐야 알고, 그 판단을 화면마다 다시 적으면 「M-으로 시작하면 학부모」
   같은 규칙이 번호 짓는 방식에 몰래 기대게 된다. 여기서 한 번만 찾는다.

   ⚠ 이 함수는 지시자 없는 이 파일에 둔다. lib/directoryStore.ts는 "use client" 파일이라
     서버 컴포넌트가 그쪽 export를 부르면 값이 아니라 클라이언트 참조가 넘어온다. */

export type MemberKind = "parent" | "teacher";

export const memberKindLabel: Record<MemberKind, string> = {
  parent: "학부모",
  teacher: "교사",
};

export type FoundMember =
  | { kind: "parent"; row: ParentRow }
  | { kind: "teacher"; row: TeacherRow };

export function findMember(id: string): FoundMember | null {
  const p = parents.find((r) => r.id === id);
  if (p) return { kind: "parent", row: p };
  const t = teachers.find((r) => r.id === id);
  if (t) return { kind: "teacher", row: t };
  return null;
}

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

/** 학생 상세(ADM-02-1-1)·기관 상세(ORG-02-1)가 주소의 번호로 한 줄을 찾는다.
    회원 찾기(findMember)와 같은 까닭으로 지시자 없는 이 파일에 둔다 —
    lib/directoryStore.ts는 "use client" 파일이라 서버 컴포넌트가 부르지 못한다 */
export const findStudent = (id: string) => students.find((s) => s.id === id) ?? null;
export const findOrg = (id: string) => orgDirectory.find((o) => o.id === id) ?? null;

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
