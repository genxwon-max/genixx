"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { OrgRow } from "./admin";
import { recordAction } from "./adminStore";
import {
  orgDirectory,
  parents,
  students,
  teachers,
  type ParentRow,
  type StudentRow,
  type TeacherRow,
  type UserState,
} from "./adminUsers";

/**
 * 명부(회원·학생·기관)에서 고친 것.
 *
 * 명부 자체(lib/adminUsers.ts)는 씨앗 고정 난수로 만든 **읽기 전용** 예시다. 서버에서
 * 평가되는 모듈이라 여기에 값을 써 넣을 수 없고, 써 넣는다 해도 새로고침 한 번에
 * 사라진다. 그래서 이 파일은 명부를 통째로 복사해 들지 않고 **사람이 고친 칸만**
 * 줄 번호별로 담는다. 목록도 상세도 「씨앗 + 고친 것」으로 그린다.
 *
 * 복사본을 들지 않는 까닭은 문항·검사지와 같다 — 명부에 줄이 늘어나면 복사본은
 * 그 줄을 모르는 채로 남고, 그때부터 두 목록이 조용히 갈라진다.
 *
 * ── 세 명부를 한 저장소에 담은 까닭 ──
 * 번호가 갈래마다 다르다(M- · T- · S- · O-). 갈래별로 저장소를 나누면 같은 코드를
 * 네 벌 쓰게 되고, 그중 한 벌만 고쳐지는 날이 온다. 칸은 갈래마다 다르지만 전부
 * 「없으면 씨앗 그대로」인 선택 칸이라 한 꼴로 담긴다.
 *
 * ── 고칠 수 있는 것 ──
 *  회원  상태 · 지역 · 메모
 *  학생  상태 · 학년 · 접속코드(재발급) · 메모
 *  기관  계약 상태 · 만료일 · 담당자 · 배정 응시권 · 메모
 *
 * 이름·메일·전화는 어느 갈래에도 두지 않는다. 원본이 이미 가려진 채로 오고
 * (gm****@naver.com), 관리자 화면에서 그것을 **고치게** 만들면 가려 둘 이유가 사라진다.
 * 자녀 수·담당 학생·응시권 사용량처럼 다른 명부에서 세는 값도 두지 않는다 — 여기서
 * 고치면 그 명부와 갈린다.
 *
 * ⚠ 상태를 바꾼 기록은 이 파일이 따로 쌓지 않는다. lib/adminStore.ts의 감사 기록
 *   (recordAction)에 남기고 감사 로그 화면이 그것을 읽는다. 기록을 두 곳에 쌓으면
 *   「감사 로그에 안 남는 조치」가 생긴다.
 */

/** 씨앗과 다른 값만 담는다. 없는 칸은 씨앗 그대로라는 뜻이다 */
export type DirectoryPatch = {
  /** 회원·학생 계정 상태 */
  state?: UserState;
  /** 회원 지역 */
  region?: string;
  /** 학생 학년 */
  grade?: string;
  /** 학생 접속코드 — 재발급하면 바뀐다 */
  code?: string;
  /** 기관 계약 상태 */
  contract?: OrgRow["contract"];
  /** 기관 계약 만료일 */
  until?: string;
  /** 기관 담당자 */
  manager?: string;
  /** 기관에 **배정한** 응시권. 쓴 자리(seats[0])는 여기서 고치지 못한다 */
  seats?: number;
  /** 운영 메모 — 세 갈래 모두 */
  memo?: string;
  /** 마지막으로 고친 시각·사람 — 상세 화면 판 머리에 적어 둔다 */
  at?: string;
  by?: string;
};

export type DirectoryPatches = Record<string, DirectoryPatch>;

/* 서버 스냅샷은 매번 같은 참조여야 한다. 새 객체를 돌려주면 React가 무한 루프로 본다 */
const EMPTY: DirectoryPatches = {};

/* 저장소 이름은 옛 이름(genixx.members)을 그대로 쓴다. 회원 상세만 있던 시절에 이미
   브라우저에 쌓인 것이 있고, 이름을 바꾸면 그 값이 조용히 버려진다 */
const KEY = "genixx.members";
const EVENT = "genixx:directory-change";

let cacheRaw: string | null = null;
let cacheValue: DirectoryPatches = EMPTY;

function read(): DirectoryPatches {
  if (typeof window === "undefined") return EMPTY;
  const raw = window.localStorage.getItem(KEY);
  if (raw === cacheRaw) return cacheValue;
  cacheRaw = raw;
  try {
    cacheValue = raw ? (JSON.parse(raw) as DirectoryPatches) : EMPTY;
  } catch {
    cacheValue = EMPTY;
  }
  return cacheValue;
}

function write(next: DirectoryPatches) {
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

export function usePatches(): DirectoryPatches {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

/** 지금 이 줄의 고친 값 하나 */
export function patchOf(patches: DirectoryPatches, id: string): DirectoryPatch {
  return patches[id] ?? {};
}

/* ───────────────────────── 씨앗 + 고친 것 ─────────────────────────
   목록과 상세가 같은 함수를 쓴다. 목록만 씨앗을 그리면 상세에서 정지해 놓고 돌아왔을 때
   그 줄이 아직 「활성」으로 서 있다 — 눌러서 고친 것이 화면에 안 돌아오는 콘솔은
   고친 것 자체를 못 믿게 만든다. */

function overlayMember<T extends ParentRow | TeacherRow>(row: T, p?: DirectoryPatch): T {
  if (!p) return row;
  return { ...row, state: p.state ?? row.state, region: p.region ?? row.region };
}

function overlayStudent(row: StudentRow, p?: DirectoryPatch): StudentRow {
  if (!p) return row;
  return {
    ...row,
    state: p.state ?? row.state,
    grade: p.grade ?? row.grade,
    code: p.code ?? row.code,
  };
}

function overlayOrg(row: OrgRow, p?: DirectoryPatch): OrgRow {
  if (!p) return row;
  return {
    ...row,
    contract: p.contract ?? row.contract,
    until: p.until ?? row.until,
    manager: p.manager ?? row.manager,
    /* 쓴 자리는 그대로 두고 배정만 갈아 끼운다. 배정을 쓴 자리보다 적게 넣는 것은
       상세 화면이 막는다 — 여기서 자르면 「저장했는데 다른 수가 들어갔다」가 된다 */
    seats: p.seats == null ? row.seats : [row.seats[0], p.seats],
  };
}

export function useParents(): ParentRow[] {
  const patches = usePatches();
  return useMemo(() => parents.map((r) => overlayMember(r, patches[r.id])), [patches]);
}

export function useTeachers(): TeacherRow[] {
  const patches = usePatches();
  return useMemo(() => teachers.map((r) => overlayMember(r, patches[r.id])), [patches]);
}

export function useStudents(): StudentRow[] {
  const patches = usePatches();
  return useMemo(() => students.map((r) => overlayStudent(r, patches[r.id])), [patches]);
}

export function useOrgs(): OrgRow[] {
  const patches = usePatches();
  return useMemo(() => orgDirectory.map((r) => overlayOrg(r, patches[r.id])), [patches]);
}

/* ───────────────────────── 고치기 ───────────────────────── */

function stamp() {
  const now = new Date();
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function put(id: string, patch: DirectoryPatch) {
  const now = read();
  write({ ...now, [id]: { ...now[id], ...patch } });
}

/**
 * 값 하나를 고친다.
 *
 * 저장 단추를 두지 않는다 — 문항 상세와 같은 까닭이다. 칸을 고칠 때마다 바로 쓰고
 * 화면은 저장된 값만 그린다. 고친 값을 화면 안에 따로 들고 있으면, 저장하기 전에 다른
 * 줄로 넘어갔을 때 그 값이 어디로 갔는지 설명할 자리가 없다.
 *
 * 감사 기록은 남기지 않는다. 지역·학년·메모·담당자는 계정을 막거나 여는 일이 아니고,
 * 여기까지 기록을 쌓으면 감사 로그가 메모 수정으로 덮여 정작 정지·탈퇴가 안 보인다.
 */
export function patchInfo(id: string, patch: Omit<DirectoryPatch, "at" | "by">, by: string) {
  put(id, { ...patch, at: stamp(), by });
}

/**
 * 계정 상태를 바꾸고 감사 기록에 남긴다. 회원과 학생이 같은 함수를 쓴다.
 *
 * 시각은 감사 기록이 찍어 준 것을 그대로 받아 쓴다. 여기서 한 번 더 new Date를 부르면
 * 상세 화면의 「마지막 변경」과 감사 로그의 시각이 몇 초씩 갈린다.
 */
export function actOnAccount(
  id: string,
  label: string,
  next: UserState,
  verb: string,
  reason: string,
  actor: string,
) {
  const entry = recordAction(`${label} · ${id}`, `계정 ${verb}`, reason, actor);
  put(id, { state: next, at: entry.at.slice(0, 16), by: actor });
}

/** 학생 접속코드에 쓰는 글자 — 0·O·1·I처럼 헷갈리는 것은 뺀다(lib/adminUsers.ts와 같은 벌) */
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * 접속코드를 다시 낸다.
 *
 * 명부를 만들 때는 씨앗 고정 난수를 쓰지만(서버와 브라우저가 같은 목록을 내야 한다)
 * 재발급은 사람이 단추를 눌러 일어나는 일이라 Math.random으로 낸다. 렌더 중에 부르지
 * 않으므로 하이드레이션과 무관하다.
 *
 * 옛 코드를 감사 기록에 남긴다 — 「코드가 안 먹는다」는 문의가 왔을 때 그 사람이 들고
 * 있는 것이 재발급 전 코드인지 확인할 자리가 그것뿐이다.
 */
export function reissueCode(id: string, label: string, oldCode: string, actor: string) {
  const code = Array.from(
    { length: 8 },
    () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)],
  ).join("");
  const entry = recordAction(`${label} · ${id}`, "접속코드 재발급", `이전 코드 ${oldCode}`, actor);
  put(id, { code, at: entry.at.slice(0, 16), by: actor });
  return code;
}
