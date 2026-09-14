"use client";

import { useSyncExternalStore } from "react";

/**
 * 법정대리인 동의 요청.
 *
 * 만 14세 미만 학생은 혼자 가입을 끝낼 수 없다. 그렇다고 문을 닫아 버리지 않고,
 * **법정대리인에게 동의를 요청하는 자리**로 넘긴다. 이 파일이 그 요청을 들고 있는다.
 *
 * 여기 담기는 것은 **법정대리인의 성명과 연락처뿐**이다. 개인정보보호법 시행령이
 * 법정대리인 동의를 받는 데 필요한 최소정보를 그 둘로 한정하고 있어서, 동의를 받기
 * 전에 아이 이름·학교·상세 생년월일 같은 전체 프로필을 먼저 갖고 있지 않는다.
 * 연령 확인은 화면에서 계산만 하고, 만 14세 미만으로 확인되면 생년월일을 저장하지
 * 않은 채 이 요청으로 넘어온다.
 *
 * 아이를 부르는 이름(childLabel)은 선택이고, 보호자가 「어느 아이 이야기인지」 알아볼
 * 수 있게 학생이 스스로 적는 별명 자리다. 실명을 요구하지 않는다.
 *
 * ⚠ 이 프로젝트에는 서버가 없다. 실제 연동에서는 요청 id가 곧 일회용 동의 링크의
 *   토큰이 되고, 문자·알림톡·이메일로 그 링크를 보낸다.
 */

export type RequestOrigin = "student" | "org" | "parent";

export type RequestStatus = "waiting" | "granted" | "declined" | "expired";

export type GuardianRequest = {
  /** 동의 링크 토큰 자리 */
  id: string;
  /** 학생이 스스로 적는 호칭. 없어도 된다 */
  childLabel?: string;
  /** 법정대리인 성명 — 시행령이 정한 최소정보 */
  guardianName: string;
  /** 법정대리인 연락처 — 시행령이 정한 최소정보 */
  guardianPhone: string;
  origin: RequestOrigin;
  /** 요청을 보낸 기관·보호자 이름 */
  originName?: string;
  /** 기관이 임시등록한 학생과 이어진 요청이면 그 명부 id */
  studentId?: string;
  status: RequestStatus;
  requestedAt: string;
  decidedAt?: string;
  /** 동의를 확인한 방법 (휴대전화 본인인증·서면·이메일 등) */
  via?: string;
  /** 확인된 관계 (모·부·기타 법정대리인) */
  relation?: string;
};

const KEY = "genixx.guardianRequests";
const EVENT = "genixx:guardian-request-change";

let cacheRaw: string | null = null;
let cacheValue: GuardianRequest[] = [];

const EMPTY: GuardianRequest[] = [];

function read(): GuardianRequest[] {
  if (typeof window === "undefined") return EMPTY;
  const raw = window.localStorage.getItem(KEY);
  if (raw === cacheRaw) return cacheValue;
  cacheRaw = raw;
  try {
    cacheValue = raw ? (JSON.parse(raw) as GuardianRequest[]) : EMPTY;
  } catch {
    cacheValue = EMPTY;
  }
  return cacheValue;
}

function write(next: GuardianRequest[]) {
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

export function useGuardianRequests(): GuardianRequest[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function getGuardianRequests() {
  return read();
}

export function findGuardianRequest(id: string) {
  return read().find((r) => r.id === id) ?? null;
}

/** 학생 명부 id로 이어진 요청 중 가장 최근 것 */
export function latestRequestFor(studentId: string) {
  const mine = read().filter((r) => r.studentId === studentId);
  return mine.length ? mine[mine.length - 1] : null;
}

function token() {
  const buf = new Uint32Array(2);
  crypto.getRandomValues(buf);
  return Array.from(buf, (n) => n.toString(36)).join("").slice(0, 12);
}

export type NewGuardianRequest = {
  guardianName: string;
  guardianPhone: string;
  childLabel?: string;
  origin: RequestOrigin;
  originName?: string;
  studentId?: string;
};

/** 동의 요청을 만든다. 반환값의 id가 곧 동의 링크의 토큰이다. */
export function createGuardianRequest(input: NewGuardianRequest): GuardianRequest {
  const req: GuardianRequest = {
    id: token(),
    guardianName: input.guardianName.trim(),
    guardianPhone: input.guardianPhone.replace(/\D/g, ""),
    childLabel: input.childLabel?.trim() || undefined,
    origin: input.origin,
    originName: input.originName,
    studentId: input.studentId,
    status: "waiting",
    requestedAt: new Date().toISOString(),
  };
  write([...read(), req]);
  return req;
}

function patch(id: string, next: Partial<GuardianRequest>) {
  write(read().map((r) => (r.id === id ? { ...r, ...next } : r)));
}

/** 법정대리인이 본인확인을 마치고 동의했다 */
export function grantRequest(id: string, via: string, relation?: string) {
  patch(id, { status: "granted", decidedAt: new Date().toISOString(), via, relation });
}

/** 법정대리인이 동의하지 않았다 */
export function declineRequest(id: string) {
  patch(id, { status: "declined", decidedAt: new Date().toISOString() });
}

/** 연락처를 고쳐 다시 보낸다 */
export function resendRequest(id: string, guardian?: { name?: string; phone?: string }) {
  patch(id, {
    status: "waiting",
    requestedAt: new Date().toISOString(),
    decidedAt: undefined,
    ...(guardian?.name ? { guardianName: guardian.name.trim() } : {}),
    ...(guardian?.phone ? { guardianPhone: guardian.phone.replace(/\D/g, "") } : {}),
  });
}

export function clearGuardianRequests() {
  write([]);
}

/** 연락처는 끝 네 자리만 보여 준다 — 기관 화면에 전체를 싣지 않기 위해서다 */
export function maskPhone(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.length < 4) return "***";
  return `***-****-${d.slice(-4)}`;
}
