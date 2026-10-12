import type { PurgePolicy } from "@/lib/purgePolicy";
import type { PurgeRow } from "@/components/admin2/PurgeBoard";

/**
 * 스케줄러와 개인정보 파기 디자인이 함께 쓰는 예시 값 — 파기 대기에 오르는 회원들.
 *
 * 두 화면이 같은 건수를 말해야 한다. 스케줄러에서 「보관기간을 14일로 줄이면 파기 대기가 3건에서
 * 5건이 된다」고 적었으면, 개인정보 파기의 목록에도 그 다섯 줄이 있어야 한다.
 *
 * 저장소를 읽지 않는다. 회원마다 「탈퇴(또는 가입)한 지 며칠 됐는가」를 적어 두고, 스케줄러의
 * 보관기간에 견주어 대기에 오르는지를 센다 — 실제 화면의 셈(lib/privacyStore.ts)과 같은 꼴이다.
 *
 *   오늘      2026년 10월 12일
 *   스케줄러  자동 파기 켜짐 · 탈퇴 30일 뒤 · 가입 3년 뒤
 */

/** 지금 걸려 있는 개인정보 스케줄러 — 서비스를 열 때 정해 둔 값 그대로다 */
export const purgePolicy: PurgePolicy = { auto: true, leftDays: 30, memberYears: 3 };
export const purgeSetAt = "2026-07-01 09:00";
export const purgeSetBy = "박서준";

type Person = {
  id: string;
  name: string;
  kind: PurgeRow["kind"];
  /** 보관기간을 세기 시작한 날 — 탈퇴한 회원은 탈퇴한 날, 그 밖에는 가입한 날 */
  from: string;
  /** 그날부터 오늘까지 며칠 */
  days: number;
  left: boolean;
};

/** 보관기간에 걸리는 회원 — 탈퇴한 다섯과, 가입한 지 오래된 둘 */
const people: Person[] = [
  { id: "M-20418", name: "송미란", kind: "학부모", from: "2026-08-21", days: 52, left: true },
  { id: "M-20455", name: "배정훈", kind: "학부모", from: "2026-09-02", days: 40, left: true },
  { id: "M-20502", name: "유경아", kind: "학부모", from: "2026-09-10", days: 32, left: true },
  { id: "M-20561", name: "권태식", kind: "학부모", from: "2026-09-20", days: 22, left: true },
  { id: "M-20577", name: "문소희", kind: "학부모", from: "2026-09-26", days: 16, left: true },
  { id: "S-11208", name: "안지율", kind: "학생", from: "2024-03-02", days: 954, left: false },
  { id: "S-11731", name: "홍라온", kind: "학생", from: "2024-09-14", days: 758, left: false },
];

/** 철회를 요청한 회원 — 스케줄러와 상관없이 요청한 날 대기에 오른다 */
const withdrawn: PurgeRow[] = [
  { id: "M-20633", name: "신은정", kind: "학부모", purge: "queued", purgeReason: "withdrawn", purgeDue: "2026-10-08", purgedAt: null, purgedBy: null, purgedWhy: null },
  { id: "S-12044", name: "신도현", kind: "학생", purge: "queued", purgeReason: "withdrawn", purgeDue: "2026-10-08", purgedAt: null, purgedBy: null, purgedWhy: null },
  { id: "M-20649", name: "남궁혁", kind: "학부모", purge: "queued", purgeReason: "withdrawn", purgeDue: "2026-10-10", purgedAt: null, purgedBy: null, purgedWhy: null },
];

/** 이미 지운 것 — 9월 정기 파기 */
const done: PurgeRow[] = [
  { id: "M-20391", name: "고영순", kind: "학부모", purge: "done", purgeReason: "expired", purgeDue: "2026-09-12", purgedAt: "2026-09-15 10:20", purgedBy: "박서준", purgedWhy: "9월 정기 파기 — 보관기간 도래 2건, 철회 1건 통지 완료" },
  { id: "M-20402", name: "표재원", kind: "학부모", purge: "done", purgeReason: "expired", purgeDue: "2026-09-14", purgedAt: "2026-09-15 10:20", purgedBy: "박서준", purgedWhy: "9월 정기 파기 — 보관기간 도래 2건, 철회 1건 통지 완료" },
  { id: "M-20467", name: "염수빈", kind: "학부모", purge: "done", purgeReason: "withdrawn", purgeDue: "2026-09-11", purgedAt: "2026-09-15 10:18", purgedBy: "박서준", purgedWhy: "9월 정기 파기 — 보관기간 도래 2건, 철회 1건 통지 완료" },
];

const pad = (n: number) => String(n).padStart(2, "0");

/** 날짜에서 며칠 뒤 (YYYY-MM-DD) */
function plus(day: string, days: number) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** 이 스케줄러에서 보관기간이 지난 회원 */
const expiredOf = (policy: PurgePolicy) =>
  policy.auto
    ? people.filter((p) => p.days >= (p.left ? policy.leftDays : policy.memberYears * 365))
    : [];

/** 이 스케줄러에서 파기 대기가 몇 건인가 — 스케줄러 화면이 지금 상태와 바꾼 뒤를 함께 센다 */
export function purgeCount(policy: PurgePolicy) {
  return { expired: expiredOf(policy).length, withdrawn: withdrawn.length };
}

/** 이 스케줄러에서의 개인정보 파기 목록 — 대기(보관기간 도래 · 철회 요청)와 완료 */
export function purgeRows(policy: PurgePolicy): PurgeRow[] {
  const expired: PurgeRow[] = expiredOf(policy).map((p) => ({
    id: p.id,
    name: p.name,
    kind: p.kind,
    purge: "queued",
    purgeReason: "expired",
    purgeDue: plus(p.from, p.left ? policy.leftDays : policy.memberYears * 365),
    purgedAt: null,
    purgedBy: null,
    purgedWhy: null,
  }));
  return [...withdrawn, ...expired, ...done];
}
