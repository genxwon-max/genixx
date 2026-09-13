"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  permissionIds,
  roleOf,
  staffRoles,
  type PermissionId,
  type StaffRoleId,
} from "./admin";
import { staffDirectory, type StaffMember } from "./adminUsers";

/**
 * ADM-03-1 운영자 권한 — 사람 하나에 붙는 역할과 권한.
 *
 * ── 역할이 기본값이고, 사람이 그 위에 얹힌다 ──
 * 권한의 출처는 여전히 역할이다(lib/admin.ts staffRoles). 여기서는 그 역할을 갈아 끼우거나,
 * 역할 기본값에서 몇 칸을 더하고 뺀 것만 적어 둔다. 사람마다 권한 열여덟을 통째로 들고
 * 있으면, 역할 정의를 고쳐도 이미 만들어진 계정은 옛 권한에 붙들린 채로 남는다.
 *
 * 그래서 저장하는 것은 **역할 + 더한 것 + 뺀 것** 셋뿐이다. 화면에 그릴 때 비로소
 * 역할 기본값과 합쳐 지금의 권한을 만든다.
 *
 * ── 되돌리면 자국을 지운다 ──
 * 고친 것을 다시 역할 기본값으로 되돌리면 열쇠째 지운다. 빈 값을 들고 있으면 목록이
 * 「고침」이라고 말하고, 나중에 역할 정의가 바뀌어도 그 계정만 옛 값에 붙들린다.
 *
 * ⚠ 브라우저 저장소에만 남는다. 붙일 때는 운영자 권한 API로 갈아 끼운다.
 * ⚠ 이 저장소는 **화면에 무엇을 보여 줄지**를 정할 뿐, 실제로 무엇을 막지는 않는다.
 *   막는 것은 서버가 한다 — 콘솔이 단추를 숨기는 것으로 권한을 지킬 수는 없다.
 */

export type StaffPerm = {
  /** 갈아 끼운 역할. 바꾸지 않았으면 명부의 역할과 같다 */
  role: StaffRoleId;
  /** 역할 기본값에 없는데 준 것 */
  add: PermissionId[];
  /** 역할 기본값에 있는데 뺀 것 */
  drop: PermissionId[];
  at: string;
  by: string;
};

export type StaffPerms = Record<string, StaffPerm>;

/** 명부 한 줄에 지금의 역할·권한을 얹은 것 — 목록과 상세가 함께 쓴다 */
export type StaffRow = StaffMember & {
  /**
   * 명부에 적힌 역할. `role`은 갈아 끼운 것이라 되돌릴 자리를 알려면 이것이 필요하다.
   *
   * ⚠ 되돌리기와 저장이 둘 다 이 값을 본다. `role`로 견주면 이미 갈아 끼운 계정에서
   *   「명부와 같다」가 참이 되어, 손댄 자국을 저장하는 순간 지워 버린다.
   */
  roleSeed: StaffRoleId;
  /** 지금 권한 (역할 기본값 + 더한 것 − 뺀 것) */
  perms: PermissionId[];
  /** 손댄 자국이 있는가 */
  edited: boolean;
  /** 손댄 자국 — 없으면 null */
  mark: StaffPerm | null;
};

const EMPTY: StaffPerms = {};

const KEY = "genixx.staff-perms";
const EVENT = "genixx:staff-perms-change";

let cacheRaw: string | null = null;
let cacheValue: StaffPerms = EMPTY;

function read(): StaffPerms {
  if (typeof window === "undefined") return EMPTY;
  const raw = window.localStorage.getItem(KEY);
  if (raw === cacheRaw) return cacheValue;
  cacheRaw = raw;
  try {
    cacheValue = raw ? (JSON.parse(raw) as StaffPerms) : EMPTY;
  } catch {
    cacheValue = EMPTY;
  }
  return cacheValue;
}

function write(next: StaffPerms) {
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

function usePerms(): StaffPerms {
  /* ⚠ 서버 스냅숏으로 모듈 상수를 돌려준다. 새 객체를 만들면 렌더마다 참조가 달라
     React가 무한 루프로 본다 */
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

function now() {
  const d = new Date();
  const p = (v: number) => String(v).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/* ───────────────────────── 합치기 ───────────────────────── */

/** 역할 기본값 */
export const basePerms = (role: StaffRoleId): PermissionId[] => roleOf(role).permissions;

/**
 * 역할 기본값에 더한 것과 뺀 것을 얹는다.
 *
 * 차례는 언제나 permissionIds 그대로 둔다 — 더한 칸이 뒤에 붙어 서면, 같은 권한 묶음이
 * 사람마다 다른 차례로 적히고 두 계정을 나란히 대조할 수 없게 된다.
 */
export function mergePerms(
  role: StaffRoleId,
  add: PermissionId[] = [],
  drop: PermissionId[] = [],
): PermissionId[] {
  const base = basePerms(role);
  return permissionIds.filter(
    (p) => (base.includes(p) || add.includes(p)) && !drop.includes(p),
  );
}

/** 명부 한 줄 + 손댄 자국 → 지금의 한 줄 */
export function rowOf(member: StaffMember, all: StaffPerms): StaffRow {
  const mark = all[member.id] ?? null;
  const role = mark?.role ?? member.role;
  return {
    ...member,
    role,
    roleSeed: member.role,
    perms: mark ? mergePerms(role, mark.add, mark.drop) : basePerms(role),
    edited: mark != null,
    mark,
  };
}

/**
 * 명부 스물여덟 줄에 지금의 권한을 얹어 돌려준다.
 *
 * 목록의 탭·거르개가 역할로 거르므로, 갈아 끼운 역할을 여기서 미리 얹어 두어야 한다.
 * 표만 고쳐 두면 「출제자」로 걸러 놓고 검수자가 섞여 나온다.
 */
export function useStaffRows(): StaffRow[] {
  const all = usePerms();
  return useMemo(() => staffDirectory.map((m) => rowOf(m, all)), [all]);
}

/** 한 사람 — 없는 계정 ID면 null */
export function useStaffRow(id: string): StaffRow | null {
  const all = usePerms();
  return useMemo(() => {
    const member = staffDirectory.find((m) => m.id === id);
    return member ? rowOf(member, all) : null;
  }, [all, id]);
}

/* ───────────────────────── 막을 것 ───────────────────────── */

/*
 * 겸직을 짚어 주던 줄(permFindings)이 여기 있었다. 출제와 검수를 한 계정이 함께 들면
 * 정의서 9장을 들어 「다시 보아 주세요」를 적던 것인데, 화면에서 걷어 내면서 함께 지웠다.
 * 짚어 주기만 하고 막지 않는 줄은 화면에 서 있을 때만 뜻이 있다 — 아무도 읽지 않는
 * 검사 함수를 저장소에 남겨 두면, 다음 사람이 그것을 「지금도 걸리는 규칙」으로 읽는다.
 *
 * 아래 잠김만은 다르다. 그것은 판단이 아니라 사고라서 화면이 아니라 저장이 막는다 —
 * 마지막 한 사람에게서 권한 관리를 빼면 아무도 이 콘솔을 다시 열 수 없다.
 */

/**
 * 이 계정에서 권한 관리를 빼면 콘솔에 아무도 남지 않는가.
 *
 * 활성 계정만 센다 — 정지·휴면 계정이 권한을 들고 있어도 로그인하지 못하므로 그것으로
 * 문이 열려 있다고 볼 수 없다.
 */
export function wouldLockOut(rows: StaffRow[], id: string, next: PermissionId[]): boolean {
  if (next.includes("staff.manage")) return false;
  const others = rows.filter(
    (r) => r.id !== id && r.state === "active" && r.perms.includes("staff.manage"),
  );
  return others.length === 0;
}

/* ───────────────────────── 저장 ───────────────────────── */

/**
 * 한 사람의 역할·권한을 한 번에 저장한다.
 *
 * 돌려주는 값이 **false면 저장하지 않은 것**이다(EditGuard의 약속). 「저장하고 나가기」를
 * 눌렀는데 걸러졌고 화면은 떠나 버리면, 사람이 저장했다고 믿는 순간에 고친 것이 사라진다.
 */
export function saveStaffPerms(
  row: StaffRow,
  rows: StaffRow[],
  next: { role: StaffRoleId; perms: PermissionId[] },
  by: string,
): { ok: boolean; why?: string } {
  if (wouldLockOut(rows, row.id, next.perms)) {
    return {
      ok: false,
      why: "운영자 계정·권한 관리를 들고 있는 활성 계정이 이 하나뿐입니다. 다른 계정에 먼저 넘겨 주세요.",
    };
  }

  const base = basePerms(next.role);
  const add = next.perms.filter((p) => !base.includes(p));
  const drop = base.filter((p) => !next.perms.includes(p));
  const cur = read();
  const nextAll = { ...cur };

  /* 명부 역할 그대로에 더하고 뺀 것도 없으면 자국을 지운다 — 위 머리 주석 참조 */
  if (next.role === row.roleSeed && add.length === 0 && drop.length === 0) {
    if (!cur[row.id]) return { ok: true };
    delete nextAll[row.id];
  } else {
    nextAll[row.id] = { role: next.role, add, drop, at: now(), by };
  }
  write(nextAll);
  return { ok: true };
}

/*
 * 자국을 열쇠째 지우는 resetStaffPerms가 여기 있었다. 상세의 「고친 기록」 판과 함께
 * 그 단추가 빠지면서 부르는 곳이 없어졌다. 되돌리는 길이 사라진 것은 아니다 — 명부의
 * 역할 그대로에 더하고 뺀 것이 없으면 위 saveStaffPerms가 같은 일을 한다.
 */

/**
 * 감사 로그에 적을 한 줄 — 「출제자 → 검수자 · +audit.read −item.write」.
 *
 * 「권한을 고쳤다」만 적어 두면 나중에 로그를 읽는 사람이 무엇이 어떻게 바뀌었는지
 * 알 길이 없다. 역할은 짧은 이름으로, 권한은 ID 그대로 적는다 — ID라야 대조표에서
 * 같은 줄을 찾을 수 있다.
 */
export function permDiffText(
  row: StaffRow,
  next: { role: StaffRoleId; perms: PermissionId[] },
): string {
  const bits: string[] = [];
  if (next.role !== row.role) {
    bits.push(`${roleOf(row.role).short} → ${roleOf(next.role).short}`);
  }
  const before = row.perms;
  const gained = next.perms.filter((p) => !before.includes(p));
  const lost = before.filter((p) => !next.perms.includes(p));
  if (gained.length > 0) bits.push(`+${gained.join(" +")}`);
  if (lost.length > 0) bits.push(`−${lost.join(" −")}`);
  return bits.length > 0 ? bits.join(" · ") : "바뀐 것 없음";
}

/** 역할 고르개에 쓸 목록 — 화면이 staffRoles를 직접 읽지 않게 한 겹 둔다 */
export const roleOptions = staffRoles.map((r) => ({
  id: r.id,
  label: r.label,
  short: r.short,
  desc: r.desc,
}));
