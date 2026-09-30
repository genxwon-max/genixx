"use client";

import { useSyncExternalStore } from "react";
import {
  ageFromBirth,
  canSit as canSitWith,
  CONSENT_AGE,
  guardianConsentInfo,
  type GuardianConsentStatus,
} from "./account";

/**
 * 학생 명부 + 접속코드 발급.
 *
 * 학생이 명부에 오르는 길은 세 가지다 —
 *   · 기관(학원장·교사)이 등록      → owner "director"
 *   · 학부모·법정대리인이 등록      → owner "parent"
 *   · 만 14세 이상 학생이 직접 가입 → owner "self"
 *
 * 명부에 올랐다고 바로 응시할 수 있는 것은 아니다. **보호자 동의 상태**가 따로 있고,
 * 만 14세 미만 학생은 법정대리인 동의가 확인되어야(consent "granted") 응시가 열린다.
 * 기관은 동의 요청을 보내고 상태를 볼 수 있을 뿐, 대신 동의할 수 없다.
 */

export type Owner = "director" | "parent" | "self";

export type Student = {
  id: string;
  /** 접속코드 — 명부 전체에서 유일 */
  code: string;
  name: string;
  /** YYYYMMDD */
  birth: string;
  /** 다니는 학교 이름 (선택) */
  school?: string;
  /** 학년 (선택) */
  grade?: string;
  /** 반·학급 (학원장 등록 시) */
  klass?: string;
  /**
   * 학생 본인 휴대전화. 아이가 자기 전화를 가지고 있을 때만 받는다 — 접속코드를
   * 보호자를 거치지 않고 바로 보낼 수 있는 곳이라, 없으면 없는 대로 둔다.
   */
  phone?: string;
  /** 법정대리인 연락처 */
  guardianPhone?: string;
  /** 법정대리인 성명 — 동의를 받기 위한 최소정보 */
  guardianName?: string;
  /** 보호자가 등록할 때 적은 선택 항목 (학부모 등록 시) */
  profile?: ChildProfile;
  /**
   * 설문 링크를 문자로 보낸 기록 — 키는 lib/examStore.ts의 SurveyKey.
   *
   * 학부모와 교사는 서로 다른 사람이라 연락처가 따로다. 보호자 연락처
   * (guardianPhone) 한 칸으로는 담기지 않아 따로 둔다. 다음에 같은 설문을 다시 보낼 때
   * 번호를 또 치지 않도록 마지막으로 보낸 번호를 기억한다.
   *
   * 저장소 타입이 examStore를 물지 않도록 키는 문자열로 둔다.
   */
  surveySends?: Record<string, { phone: string; at: string }>;
  /**
   * 보호자 동의 상태. 만 14세 미만은 "temp"에서 출발해 동의가 확인되면 "granted"가
   * 되고, 만 14세 이상 학생이 본인 가입한 경우에는 "self"로 둔다.
   */
  consent: GuardianConsentStatus;
  /** 동의 요청 발송·동의 확정 등 상태가 마지막으로 바뀐 시각 */
  consentAt?: string;
  /** 동의를 확인한 방법 (휴대전화 본인인증·서면 등) */
  consentVia?: string;
  /**
   * 결과를 보호자에게 공유할지. 만 14세 이상 학생이 직접 정한다.
   * 기관 평가처럼 별도의 처리 근거가 있는 경우는 그 범위를 따르고, 일반 개인 회원
   * 서비스에서는 학생이 공유 범위를 정하는 쪽이 가장 명확하다.
   */
  shareWithGuardian?: boolean;
  owner: Owner;
  /** 등록한 기관·보호자 이름 */
  ownerName: string;
  createdAt: string;
};

/**
 * 결과를 더 잘 읽기 위해 받는 선택 항목. 비어 있어도 등록과 응시에는 지장이 없다.
 * 학교명·학년은 명부 칸(school·grade)에 그대로 두고, 여기에는 그 밖의 값만 담는다.
 */
export type ChildProfile = {
  gender?: string;
  /**
   * 시·도 — 「서울」 「경기」. 주소를 고르면 거기서 딴다.
   *
   * 주소 전체를 두고도 따로 들고 있는 까닭은, 지역별로 세거나 묶어 보는 자리가 이 한
   * 칸만 읽으면 되게 하기 위해서다. 주소 문자열을 매번 앞에서 잘라 쓰면 자르는 규칙이
   * 화면마다 조금씩 달라진다.
   *
   * 예전 저장분에는 골라 넣은 권역(「충청·대전·세종」 같은 묶음)이 들어 있다. 그대로 둔다 —
   * 보호자가 그때 고른 값이고, 지금 꼴로 고쳐 쓸 근거가 없다.
   */
  region?: string;
  /** 시·군·구 — 「강남구」 */
  district?: string;
  /** 우편번호 5자리 */
  zonecode?: string;
  /** 도로명(또는 지번) 주소 */
  address?: string;
  /** 동·호수 — 보호자가 직접 적는 나머지 */
  addressDetail?: string;
  interests?: string[];
  /** 보호자가 관찰한 자녀 특성 — 진단 결과를 해석할 때만 쓴다 */
  observation?: string;
  schoolType?: string;
  /** 가정에서 주로 쓰는 언어 — 국어 지필 해석 보정 */
  language?: string;
  devices?: string[];
  screenTime?: string;
  learning?: string[];
  learningNote?: string;
};

/**
 * 생년월일만 보고 처음 놓일 상태를 고른다. 만 14세 이상은 동의 대기가 없다.
 * 학부모가 올린 아이도 동의 대기가 없다 — 법정대리인 동의는 학부모 회원가입 때
 * 본인인증과 함께 이미 받았다. 대기는 기관이 올린 만 14세 미만 아이에게만 선다.
 */
export function initialConsent(birth: string, owner: Owner): GuardianConsentStatus {
  if (owner === "parent") return "granted";
  const age = ageFromBirth(birth);
  if (age !== null && age >= CONSENT_AGE) return owner === "self" ? "self" : "granted";
  return "temp";
}

/** 이 학생이 지금 응시할 수 있는가 */
export function canSitStudent(s: Student) {
  return canSitWith(s.consent);
}

/** 만 14세 미만인가 — 명부 화면의 「연령 구분」 칸 */
export function isUnderConsentAge(s: Student) {
  const age = ageFromBirth(s.birth);
  return age !== null && age < CONSENT_AGE;
}

/**
 * 예전 명부에는 consent 칸이 없었다. 읽을 때 한 번 채워 넣는다.
 * 만 14세 이상이면 본인 동의로 갈음되므로 바로 열어 두고, 미만이면 임시등록에서 시작한다.
 */
function normalize(rows: Partial<Student>[]): Student[] {
  return rows.map((r) => ({
    ...(r as Student),
    consent: r.consent ?? initialConsent(r.birth ?? "", (r.owner as Owner) ?? "director"),
  }));
}

/**
 * 혼동하기 쉬운 문자(0·O, 1·I·L, U)를 뺀 30자 알파벳.
 * 8자리 = 30^8 ≈ 6,561억 조합. 5,000명은 물론 수백만 명 규모에서도
 * 무작위 발급 후 중복 검사만으로 충분히 유일성을 보장할 수 있다.
 */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
const CODE_LEN = 8;

export function formatCode(code: string) {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export function normalizeCode(input: string) {
  return input.toUpperCase().replace(/[^0-9A-Z]/g, "");
}

function randomCode() {
  const buf = new Uint32Array(CODE_LEN);
  crypto.getRandomValues(buf);
  let out = "";
  for (let i = 0; i < CODE_LEN; i += 1) out += ALPHABET[buf[i] % ALPHABET.length];
  return out;
}

/** 기존 코드와 겹치지 않는 새 코드를 만든다. */
export function issueCode(taken: Set<string>) {
  for (let i = 0; i < 50; i += 1) {
    const code = randomCode();
    if (!taken.has(code)) return code;
  }
  // 사실상 도달하지 않지만, 최후에는 시각을 섞어 충돌을 끊는다
  return `${randomCode().slice(0, 5)}${Date.now().toString(36).slice(-3).toUpperCase()}`;
}

/* ───────────────────────── 저장소 ───────────────────────── */

const KEY = "genixx.roster";
const EVENT = "genixx:roster-change";

let cacheRaw: string | null = null;
let cacheValue: Student[] = [];

function read(): Student[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(KEY);
  if (raw === cacheRaw) return cacheValue;
  cacheRaw = raw;
  try {
    cacheValue = raw ? normalize(JSON.parse(raw) as Partial<Student>[]) : [];
  } catch {
    cacheValue = [];
  }
  return cacheValue;
}

function write(next: Student[]) {
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

/** 서버 스냅샷은 매번 같은 참조를 돌려줘야 한다 (새 배열이면 무한 루프 경고) */
const EMPTY: Student[] = [];

export function useRoster(): Student[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function getRoster() {
  return read();
}

export type NewStudent = {
  name: string;
  birth: string;
  school?: string;
  grade?: string;
  klass?: string;
  phone?: string;
  guardianPhone?: string;
  guardianName?: string;
  profile?: ChildProfile;
};

/** 여러 명을 한 번에 등록하고 각각 유일한 코드를 발급한다. */
export function addStudents(rows: NewStudent[], owner: Owner, ownerName: string) {
  const current = read();
  const taken = new Set(current.map((s) => s.code));
  const created: Student[] = [];

  for (const row of rows) {
    const code = issueCode(taken);
    taken.add(code);
    created.push({
      id: `${Date.now().toString(36)}-${code}`,
      code,
      name: row.name.trim(),
      birth: row.birth.replace(/\D/g, "").slice(0, 8),
      school: row.school?.trim() || undefined,
      grade: row.grade?.trim() || undefined,
      klass: row.klass?.trim() || undefined,
      phone: row.phone?.trim() || undefined,
      guardianPhone: row.guardianPhone?.trim() || undefined,
      guardianName: row.guardianName?.trim() || undefined,
      profile: row.profile,
      consent: initialConsent(row.birth, owner),
      owner,
      ownerName,
      createdAt: new Date().toISOString(),
    });
  }

  write([...current, ...created]);
  return created;
}

export function removeStudent(id: string) {
  write(read().filter((s) => s.id !== id));
}

/* ───────────────────────── 보호자 동의 상태 전이 ─────────────────────────

   기관·학부모 화면에서 부를 수 있는 것은 **요청을 보내는 일**과 **결과를 반영하는
   일**뿐이다. 「대신 동의」에 해당하는 함수는 두지 않는다. grantGuardianConsent는
   법정대리인이 동의 화면에서 본인확인을 마쳤을 때에만 호출된다. */

function patchStudent(id: string, patch: Partial<Student>) {
  write(read().map((s) => (s.id === id ? { ...s, ...patch } : s)));
}

/** 법정대리인에게 동의 링크를 보낸다 (재발송도 같은 함수) */
export function requestGuardianConsent(
  id: string,
  guardian: { name?: string; phone?: string } = {},
) {
  patchStudent(id, {
    consent: "waiting",
    consentAt: new Date().toISOString(),
    ...(guardian.name ? { guardianName: guardian.name.trim() } : {}),
    ...(guardian.phone ? { guardianPhone: guardian.phone.trim() } : {}),
  });
}

/** 법정대리인이 본인확인을 거쳐 동의했다 — 법정대리인 동의 화면에서만 부른다 */
export function grantGuardianConsent(id: string, via = "휴대전화 본인인증") {
  patchStudent(id, { consent: "granted", consentAt: new Date().toISOString(), consentVia: via });
}

/** 법정대리인이 거절했다 */
export function declineGuardianConsent(id: string) {
  patchStudent(id, { consent: "declined", consentAt: new Date().toISOString() });
}

/** 받아 둔 동의를 철회한다. 응시와 결과 접근이 곧바로 멈춘다 */
export function revokeGuardianConsent(id: string) {
  patchStudent(id, { consent: "revoked", consentAt: new Date().toISOString() });
}

/** 기한 안에 처리되지 않은 요청을 만료로 돌린다 */
export function expireGuardianConsent(id: string) {
  patchStudent(id, { consent: "expired", consentAt: new Date().toISOString() });
}

/**
 * 설문 링크를 문자로 보냈다 — 보낸 번호를 그 설문 자리에 적어 둔다.
 *
 * ⚠ 실제 발송은 여기서 일어나지 않는다. 화면이 발송 API를 부른 뒤 그 결과를 이 함수로
 *   남긴다. 붙일 때 순서가 뒤집히지 않도록 「보냈다고 적는 일」만 맡긴다.
 */
export function recordSurveySend(id: string, key: string, phone: string) {
  const student = findById(id);
  if (!student) return;
  patchStudent(id, {
    surveySends: {
      ...student.surveySends,
      [key]: { phone: phone.replace(/\D/g, ""), at: new Date().toISOString() },
    },
  });
}

/** 결과를 보호자에게 공유할지 — 학생 본인이 정한다 */
export function setResultSharing(id: string, on: boolean) {
  patchStudent(id, { shareWithGuardian: on });
}

/** 학생이 기관·평가 코드를 넣어 소속을 잇는다 */
export function linkToOrg(id: string, orgName: string) {
  patchStudent(id, { ownerName: orgName });
}

/** 코드를 다시 발급한다 (분실·유출 시) */
export function reissueCode(id: string) {
  const current = read();
  const taken = new Set(current.map((s) => s.code));
  write(current.map((s) => (s.id === id ? { ...s, code: issueCode(taken) } : s)));
}

export function clearRoster() {
  write([]);
}

/** 접속코드 + 생년월일로 학생을 찾는다. 둘 다 맞아야 통과. */
export function findByCode(code: string, birth: string) {
  const c = normalizeCode(code);
  const b = birth.replace(/\D/g, "");
  return read().find((s) => s.code === c && s.birth === b) ?? null;
}

export function findById(id: string) {
  return read().find((s) => s.id === id) ?? null;
}

/* ───────────────────────── 일괄 입력 파싱 ───────────────────────── */

/**
 * 일괄 등록 열.
 *
 * 한 명씩 등록(ChildNew)과 같은 항목을 같은 필수·선택 구분으로 받는다 — 필수는 이름 ·
 * 생년월일 · 학교급 · 학년 · 아이 휴대전화(없으면 「없음」), 나머지는 선택이다. 예전에는
 * 이름·생년월일 둘만 받고 나머지를 학교·학년·반 정도로 두어, 여럿을 올린 아이는 프로필이
 * 비어 있었다. 학부모의 일괄 등록 화면(BulkRegister)은 이 열로 명단 파일을 읽어 들인다
 * (lib/bulkRegister.ts).
 *
 * 기관은 반과 법정대리인 연락처·성명을 더 받는다(만 14세 미만 동의 요청에 쓴다).
 *
 * 머리글 행이 있으면 머리글 이름으로 열을 찾으므로 열 순서가 달라도 된다. 없으면 이 순서대로
 * 읽는다. 엑셀에서 복사하면 탭으로 갈리는데, 그때는 탭으로만 자른다 — 관찰 특성 같은 글에
 * 쉼표가 들어 있어도 칸이 밀리지 않게.
 */
export type BulkKey =
  | "name"
  | "birth"
  | "level"
  | "grade"
  | "phone"
  | "gender"
  | "region"
  | "school"
  | "interests"
  | "learning"
  | "observation"
  | "klass"
  | "guardianPhone"
  | "guardianName";

export type BulkColumn = {
  key: BulkKey;
  label: string;
  required: boolean;
  /** 적는 법 — 「8자리」「초등·중등·고등」 */
  hint?: string;
  example: string;
  /** 머리글로 알아볼 다른 이름 */
  aliases?: string[];
  /** 기관만 받는 열 */
  orgOnly?: boolean;
};

export const bulkColumns: BulkColumn[] = [
  { key: "name", label: "이름", required: true, example: "김하늘", aliases: ["성명", "name"] },
  { key: "birth", label: "생년월일", required: true, hint: "8자리", example: "20160312", aliases: ["생일"] },
  { key: "level", label: "학교급", required: true, hint: "초등·중등·고등", example: "초등" },
  { key: "grade", label: "학년", required: true, hint: "숫자", example: "4" },
  {
    key: "phone",
    label: "아이 휴대전화",
    required: true,
    hint: "없으면 「없음」",
    example: "01012345678",
    aliases: ["휴대전화", "학생 휴대전화", "연락처"],
  },
  { key: "gender", label: "성별", required: false, hint: "남자·여자", example: "여자" },
  {
    key: "region",
    label: "거주지",
    required: false,
    hint: "시·도",
    example: "서울",
    aliases: ["거주 지역", "시·도", "주소", "거주지 주소"],
  },
  { key: "school", label: "학교명", required: false, example: "목동초등학교", aliases: ["학교"] },
  {
    key: "interests",
    label: "관심 분야",
    required: false,
    hint: "/로 구분",
    example: "수학·논리/과학·자연 탐구",
  },
  { key: "learning", label: "학습 경험", required: false, hint: "/로 구분", example: "영재교육원·영재학급" },
  {
    key: "observation",
    label: "관찰 특성",
    required: false,
    example: "궁금한 게 생기면 답을 찾을 때까지 물어봐요",
    aliases: ["보호자 관찰 특성", "관찰"],
  },
  { key: "klass", label: "반", required: false, example: "A반", orgOnly: true },
  {
    key: "guardianPhone",
    label: "법정대리인 연락처",
    required: false,
    example: "01098765432",
    orgOnly: true,
    aliases: ["보호자 연락처"],
  },
  { key: "guardianName", label: "법정대리인 성명", required: false, example: "김보호", orgOnly: true, aliases: ["보호자 성명"] },
];

export const bulkColumnsFor = (org: boolean) => bulkColumns.filter((c) => org || !c.orgOnly);

/** 예시 표 — 머리글 한 줄 + 예시 두 줄. 탭으로 잇는다(엑셀에 그대로 붙는다) */
export function bulkSample(org: boolean) {
  const cols = bulkColumnsFor(org);
  const second: Partial<Record<BulkKey, string>> = {
    name: "박서준",
    birth: "20170925",
    level: "초등",
    grade: "3",
    phone: "",
    gender: "",
    region: "",
    school: "",
    interests: "",
    learning: "",
    observation: "",
    klass: "B반",
    guardianPhone: "01011112222",
    guardianName: "박보호",
  };
  return [
    cols.map((c) => c.label).join("\t"),
    cols.map((c) => c.example).join("\t"),
    cols.map((c) => second[c.key] ?? "").join("\t"),
  ].join("\n");
}

export type ParseResult = {
  rows: NewStudent[];
  errors: { line: number; text: string; reason: string }[];
};

const MAX_GRADE: Record<string, number> = { 초등: 6, 중등: 3, 고등: 3 };

/** 「초등학교」「중학교」「고」 같은 적기를 초등·중등·고등으로 */
function levelOf(v: string) {
  if (/초/.test(v)) return "초등";
  if (/중/.test(v)) return "중등";
  if (/고/.test(v)) return "고등";
  return "";
}

const multi = (v: string) =>
  v
    .split("/")
    .map((x) => x.trim())
    .filter(Boolean);

/**
 * CSV·TSV·엑셀 복사 붙여넣기를 모두 받는다. 열은 bulkColumns를 따른다.
 */
export function parseRoster(text: string, org = false): ParseResult {
  const rows: NewStudent[] = [];
  const errors: ParseResult["errors"] = [];
  const cols = bulkColumnsFor(org);

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const split = (line: string) =>
    (line.includes("\t") ? line.split("\t") : line.split(/,|;/)).map((c) => c.trim());

  /* 머리글이 있으면 머리글 이름으로 열을 찾는다 */
  let index: Partial<Record<BulkKey, number>> = Object.fromEntries(cols.map((c, i) => [c.key, i]));
  const head = lines[0] ? split(lines[0]) : [];
  const isHead = head.some((h) => /^(이름|성명|name)$/i.test(h));
  if (isHead) {
    index = {};
    head.forEach((h, i) => {
      const col = cols.find((c) => c.label === h || c.aliases?.includes(h));
      if (col && index[col.key] === undefined) index[col.key] = i;
    });
  }

  lines.forEach((line, i) => {
    if (i === 0 && isHead) return;
    const cells = split(line);
    const get = (k: BulkKey) => {
      const at = index[k];
      return at === undefined ? "" : (cells[at] ?? "").trim();
    };
    const fail = (reason: string) => errors.push({ line: i + 1, text: line, reason });

    const name = get("name");
    if (!name) return fail("이름이 비어 있습니다.");
    const birth = get("birth").replace(/\D/g, "");
    if (birth.length !== 8) return fail("생년월일은 8자리(YYYYMMDD)여야 합니다.");

    /* 학년 칸에 「초등 4학년」처럼 통째로 적어 둔 명부도 받는다 */
    const gradeRaw = get("grade");
    const level = levelOf(get("level")) || levelOf(gradeRaw);
    const gradeNum = Number(gradeRaw.replace(/\D/g, ""));
    if (!level) return fail("학교급(초등·중등·고등)을 적어 주세요.");
    if (!gradeNum || gradeNum > MAX_GRADE[level])
      return fail("학년을 숫자로 정확히 적어 주세요.");

    const phone = get("phone").replace(/\D/g, "");
    if (phone && (phone.length < 10 || phone.length > 11))
      return fail("휴대전화 번호를 확인해 주세요. 없으면 비워 두세요.");

    const opt = (v: string) => v || undefined;
    const list = (v: string) => (multi(v).length ? multi(v) : undefined);
    const gender = get("gender");
    const profile: ChildProfile = {
      gender: /남/.test(gender) ? "남자" : /여/.test(gender) ? "여자" : undefined,
      region: opt(get("region")),
      interests: list(get("interests")),
      learning: list(get("learning")),
      observation: opt(get("observation")),
    };
    const hasProfile = Object.values(profile).some((v) => v !== undefined);

    rows.push({
      name,
      birth,
      grade: `${level} ${gradeNum}학년`,
      phone: opt(phone),
      school: opt(get("school")),
      klass: opt(get("klass")),
      guardianPhone: opt(get("guardianPhone").replace(/\D/g, "")),
      guardianName: opt(get("guardianName")),
      profile: hasProfile ? profile : undefined,
    });
  });

  return { rows, errors };
}

/** 등록 결과를 CSV로 내려받기 위한 문자열 */
export function toCsv(students: Student[]) {
  const head = "이름,생년월일,학교,학년,반,접속코드,보호자 동의 상태";
  const body = students
    .map((s) =>
      [
        s.name,
        s.birth,
        s.school ?? "",
        s.grade ?? "",
        s.klass ?? "",
        formatCode(s.code),
        guardianConsentInfo[s.consent].label,
      ].join(","),
    )
    .join("\n");
  return `${head}\n${body}`;
}
