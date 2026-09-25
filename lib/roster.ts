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
  /** 시·도까지만 */
  region?: string;
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

/** 생년월일만 보고 처음 놓일 상태를 고른다. 만 14세 이상은 동의 대기가 없다. */
export function initialConsent(birth: string, owner: Owner): GuardianConsentStatus {
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

export type ParseResult = {
  rows: NewStudent[];
  errors: { line: number; text: string; reason: string }[];
};

/**
 * CSV·TSV·엑셀 복사 붙여넣기를 모두 받는다.
 * 열 순서: 이름, 생년월일(8자리), 학교(선택), 학년(선택), 반(선택),
 *          법정대리인 연락처(선택), 법정대리인 성명(선택)
 *
 * 만 14세 미만 학생은 법정대리인 연락처가 있어야 동의 요청을 보낼 수 있다. 비어 있어도
 * 등록은 되지만 「임시등록」에 머문다.
 *
 * 반드시 있어야 하는 것은 이름과 생년월일뿐이다. 학원이 명부를 뽑을 때 학교·학년이
 * 비어 있는 줄이 섞이는 일이 흔한데, 그 줄 때문에 전체를 못 올리게 하지 않는다.
 */
export function parseRoster(text: string): ParseResult {
  const rows: NewStudent[] = [];
  const errors: ParseResult["errors"] = [];

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  lines.forEach((line, i) => {
    const cells = line.split(/\t|,|;/).map((c) => c.trim());
    // 머리글 행은 건너뛴다
    if (i === 0 && /이름|성명|name/i.test(cells[0] ?? "")) return;

    const [name, birthRaw, school, grade, klass, phone, guardianName] = cells;
    if (!name) {
      errors.push({ line: i + 1, text: line, reason: "이름이 비어 있습니다." });
      return;
    }
    const birth = (birthRaw ?? "").replace(/\D/g, "");
    if (birth.length !== 8) {
      errors.push({ line: i + 1, text: line, reason: "생년월일은 8자리(YYYYMMDD)여야 합니다." });
      return;
    }
    rows.push({ name, birth, school, grade, klass, guardianPhone: phone, guardianName });
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
