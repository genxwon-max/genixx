"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { designLinks } from "@/lib/designScreens";
import type { ConsentLog, ConsentState, PrivacyRow } from "@/lib/privacyStore";
import PrivacyBoard, { type PrivacyTab } from "@/components/admin2/PrivacyBoard";
import PrivacyRecord from "@/components/admin2/PrivacyRecord";
import ConsoleFrame from "../ConsoleFrame";

/**
 * 개인정보 관리 (실제 주소 /admin2/privacy · /admin2/privacy/[회원]) — 디자인.
 *
 * 지우는 화면의 이름이 「파기 스케줄러」에서 「개인정보 파기」로 바뀌면서(./PrivacyPurge.tsx),
 * 그 화면을 가리키던 이 두 화면의 글도 함께 바뀌었다.
 *
 *   목록   머리 오른쪽의 단추 「개인정보 파기 6」 — 예전 이름은 「파기 스케줄러 6」
 *   상세   파기 대기인 회원의 안내 「파기는 「개인정보 파기」에서 실행합니다 …」
 *
 * 화면은 실제 조각(components/admin2/PrivacyBoard.tsx · PrivacyRecord.tsx)이다. 회원은 개인정보
 * 파기 · 스케줄러 디자인과 같은 사람들이다(./purgeFlow.ts) — 파기 대기 여섯(철회 요청 셋 ·
 * 보관기간이 지난 탈퇴 회원 셋)과 지난달에 지운 한 명이 그대로 있다. 탭은 주소로 옮긴다.
 *
 *   오늘      2026년 10월 12일
 *   스케줄러  자동 파기 켜짐 · 탈퇴 30일 뒤 · 가입 3년 뒤
 */

const to = designLinks("privacy");
const AT = "/admin2/privacy";
const TODAY = "2026-10-12";
const PURGE = "/design/admin2/privacy/purge";

/* ───────────────────────── 예시 회원 ───────────────────────── */

const joined = (name: string, day: string, marketing: boolean): ConsentLog[] => [
  { kind: "personal", state: "granted", at: `${day} 09:12`, by: name, via: "가입 · 약관 동의" },
  { kind: "sensitive", state: "granted", at: `${day} 09:12`, by: name, via: "가입 · 약관 동의" },
  ...(marketing
    ? [{ kind: "marketing" as const, state: "granted" as const, at: `${day} 09:12`, by: name, via: "가입 · 선택 동의" }]
    : []),
];

/** 필수 동의를 철회했다 — 「지금 지워 달라」는 요청이라 그날 파기 대기에 오른다 */
const pulled = (name: string, at: string): ConsentLog[] => [
  { kind: "personal", state: "withdrawn", at, by: name, via: "1:1 문의 · 파기 요청" },
  { kind: "sensitive", state: "withdrawn", at, by: name, via: "1:1 문의 · 파기 요청" },
];

const none = {
  purge: "none",
  purgeReason: null,
  purgeDue: null,
  purgedAt: null,
  purgedBy: null,
  purgedWhy: null,
} as const;

type ParentSeed = {
  id: string;
  name: string;
  joinedAt: string;
  marketing: ConsentState;
  /** 필수 동의를 철회한 때 */
  pulledAt?: string;
  /** 탈퇴한 날 — 보관기간(30일)을 이날부터 센다 */
  leftAt?: string;
  keepUntil: string;
  purge?: Partial<PrivacyRow>;
};

const parent = (p: ParentSeed): PrivacyRow => ({
  id: p.id,
  name: p.name,
  kind: "학부모",
  state: p.leftAt ? "withdrawn" : "active",
  joinedAt: p.joinedAt,
  minor: false,
  consents: {
    personal: p.pulledAt ? "withdrawn" : "granted",
    guardian: "none",
    sensitive: p.pulledAt ? "withdrawn" : "granted",
    marketing: p.marketing,
  },
  log: [
    ...joined(p.name, p.joinedAt, p.marketing !== "none"),
    ...(p.pulledAt ? pulled(p.name, p.pulledAt) : []),
  ],
  keepFrom: p.leftAt ?? p.joinedAt,
  keepKind: p.leftAt ? "left" : "member",
  keepUntil: p.keepUntil,
  ...none,
  ...p.purge,
});

type StudentSeed = {
  id: string;
  name: string;
  guardian: string;
  joinedAt: string;
  /** 법정대리인 동의 — 만 14세 미만이면 꼭 있어야 한다 */
  guardianOk: ConsentState;
  /** 법정대리인이 동의를 철회한 때 */
  pulledAt?: string;
  keepUntil: string;
  purge?: Partial<PrivacyRow>;
};

const student = (s: StudentSeed): PrivacyRow => ({
  id: s.id,
  name: s.name,
  kind: "학생",
  state: "active",
  joinedAt: s.joinedAt,
  minor: true,
  consents: {
    personal: s.pulledAt ? "withdrawn" : "granted",
    guardian: s.guardianOk,
    sensitive: s.pulledAt ? "withdrawn" : "granted",
    marketing: "none",
  },
  log: [
    {
      kind: "personal",
      state: "granted",
      at: `${s.joinedAt} 10:20`,
      by: s.guardian,
      via: s.guardianOk === "none" ? "자녀 등록" : "자녀 등록 · 법정대리인 동의",
    },
    { kind: "sensitive", state: "granted", at: `${s.joinedAt} 10:20`, by: s.guardian, via: "자녀 등록" },
    ...(s.guardianOk === "none"
      ? []
      : [
          {
            kind: "guardian" as const,
            state: "granted" as const,
            at: `${s.joinedAt} 10:20`,
            by: s.guardian,
            via: "자녀 등록 · 본인확인",
          },
        ]),
    ...(s.pulledAt
      ? [
          ...pulled(s.guardian, s.pulledAt),
          {
            kind: "guardian" as const,
            state: "withdrawn" as const,
            at: s.pulledAt,
            by: s.guardian,
            via: "1:1 문의 · 파기 요청",
          },
        ]
      : []),
  ],
  keepFrom: s.joinedAt,
  keepKind: "member",
  keepUntil: s.keepUntil,
  ...none,
  ...s.purge,
});

const queuedPulled = (due: string): Partial<PrivacyRow> => ({
  purge: "queued",
  purgeReason: "withdrawn",
  purgeDue: due,
});
const queuedExpired = (due: string): Partial<PrivacyRow> => ({
  purge: "queued",
  purgeReason: "expired",
  purgeDue: due,
});

const rows: PrivacyRow[] = [
  /* 철회 요청 — 요청한 날 파기 대기에 올랐다 */
  parent({
    id: "M-20633",
    name: "신은정",
    joinedAt: "2025-03-04",
    marketing: "granted",
    pulledAt: "2026-10-08 14:05",
    keepUntil: "2028-03-03",
    purge: queuedPulled("2026-10-08"),
  }),
  student({
    id: "S-12044",
    name: "신도현",
    guardian: "신은정",
    joinedAt: "2025-03-04",
    guardianOk: "withdrawn",
    pulledAt: "2026-10-08 14:05",
    keepUntil: "2028-03-03",
    purge: queuedPulled("2026-10-08"),
  }),
  parent({
    id: "M-20649",
    name: "남궁혁",
    joinedAt: "2025-06-17",
    marketing: "none",
    pulledAt: "2026-10-10 11:40",
    keepUntil: "2028-06-16",
    purge: queuedPulled("2026-10-10"),
  }),
  /* 탈퇴한 지 30일이 지났다 — 보관기간 도래 */
  parent({
    id: "M-20418",
    name: "송미란",
    joinedAt: "2024-11-02",
    marketing: "withdrawn",
    leftAt: "2026-08-21",
    keepUntil: "2026-09-20",
    purge: queuedExpired("2026-09-20"),
  }),
  parent({
    id: "M-20455",
    name: "배정훈",
    joinedAt: "2025-01-15",
    marketing: "none",
    leftAt: "2026-09-02",
    keepUntil: "2026-10-02",
    purge: queuedExpired("2026-10-02"),
  }),
  parent({
    id: "M-20502",
    name: "유경아",
    joinedAt: "2025-02-08",
    marketing: "granted",
    leftAt: "2026-09-10",
    keepUntil: "2026-10-10",
    purge: queuedExpired("2026-10-10"),
  }),
  /* 탈퇴했지만 아직 30일이 지나지 않았다 */
  parent({
    id: "M-20561",
    name: "권태식",
    joinedAt: "2025-04-21",
    marketing: "none",
    leftAt: "2026-09-20",
    keepUntil: "2026-10-20",
  }),
  /* 지난달 정기 파기에서 지웠다 */
  parent({
    id: "M-20391",
    name: "고영순",
    joinedAt: "2024-09-30",
    marketing: "none",
    leftAt: "2026-08-13",
    keepUntil: "2026-09-12",
    purge: {
      purge: "done",
      purgeReason: "expired",
      purgeDue: "2026-09-12",
      purgedAt: "2026-09-15 10:20",
      purgedBy: "박서준",
      purgedWhy: "9월 정기 파기 — 보관기간 도래 2건, 철회 1건 통지 완료",
    },
  }),
  /* 동의를 모두 갖춘 회원 */
  parent({
    id: "M-20712",
    name: "이정민",
    joinedAt: "2026-01-19",
    marketing: "granted",
    keepUntil: "2029-01-18",
  }),
  student({
    id: "S-12102",
    name: "이서준",
    guardian: "이정민",
    joinedAt: "2026-01-19",
    guardianOk: "granted",
    keepUntil: "2029-01-18",
  }),
  /* 만 14세 미만인데 법정대리인 동의가 없다 */
  student({
    id: "S-12150",
    name: "한지호",
    guardian: "한상우",
    joinedAt: "2026-09-28",
    guardianOk: "none",
    keepUntil: "2029-09-27",
  }),
];

const tabSlug: Record<PrivacyTab, string> = { all: "", withdrawn: "withdrawn", guardian: "guardian" };

/** 상세를 그려 둔 회원 — 나머지 줄은 파기 대기인 회원의 상세로 간다 */
const DETAILS = ["M-20633", "M-20391"];
const hrefOf = (v: PrivacyRow) => to(DETAILS.includes(v.id) ? v.id : "M-20633");

export default function Privacy({ state }: { state: string }) {
  const router = useRouter();
  const row = rows.find((v) => v.id === state);

  return (
    <ConsoleFrame at={AT}>
      {row ? (
        <PrivacyRecord
          row={row}
          now={TODAY}
          back={
            <Link href={to()} className="a2-btn">
              ← 개인정보 관리
            </Link>
          }
          memberHref={row.kind === "학생" ? `/admin2/students/${row.id}` : `/admin2/members/${row.id}`}
        />
      ) : (
        <PrivacyBoard
          rows={rows}
          now={TODAY}
          tab={state === "withdrawn" ? "withdrawn" : state === "guardian" ? "guardian" : "all"}
          onTab={(tab) => router.push(to(tabSlug[tab]))}
          hrefOf={hrefOf}
          purgeHref={PURGE}
        />
      )}
    </ConsoleFrame>
  );
}
