"use client";

import { useSyncExternalStore } from "react";

/**
 * 학생 명부 + 접속코드 발급.
 *
 * 학생은 독립 회원가입 경로가 없고, 학원장(기관) 또는 학부모가 등록한 뒤
 * 발급된 접속코드 + 생년월일로 응시 화면에 들어온다.
 */

export type Owner = "director" | "parent";

export type Student = {
  id: string;
  /** 접속코드 — 명부 전체에서 유일 */
  code: string;
  name: string;
  /** YYYYMMDD */
  birth: string;
  grade: string;
  /** 반·학급 (학원장 등록 시) */
  klass?: string;
  /** 보호자 연락처 */
  guardianPhone?: string;
  owner: Owner;
  /** 등록한 기관·보호자 이름 */
  ownerName: string;
  createdAt: string;
};

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
    cacheValue = raw ? (JSON.parse(raw) as Student[]) : [];
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
  grade: string;
  klass?: string;
  guardianPhone?: string;
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
      grade: row.grade.trim(),
      klass: row.klass?.trim() || undefined,
      guardianPhone: row.guardianPhone?.trim() || undefined,
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
 * 열 순서: 이름, 생년월일(8자리), 학년, 반(선택), 보호자연락처(선택)
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

    const [name, birthRaw, grade, klass, phone] = cells;
    if (!name) {
      errors.push({ line: i + 1, text: line, reason: "이름이 비어 있습니다." });
      return;
    }
    const birth = (birthRaw ?? "").replace(/\D/g, "");
    if (birth.length !== 8) {
      errors.push({ line: i + 1, text: line, reason: "생년월일은 8자리(YYYYMMDD)여야 합니다." });
      return;
    }
    if (!grade) {
      errors.push({ line: i + 1, text: line, reason: "학년이 비어 있습니다." });
      return;
    }
    rows.push({ name, birth, grade, klass, guardianPhone: phone });
  });

  return { rows, errors };
}

/** 등록 결과를 CSV로 내려받기 위한 문자열 */
export function toCsv(students: Student[]) {
  const head = "이름,생년월일,학년,반,접속코드";
  const body = students
    .map((s) => [s.name, s.birth, s.grade, s.klass ?? "", formatCode(s.code)].join(","))
    .join("\n");
  return `${head}\n${body}`;
}
