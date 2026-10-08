"use client";

import type { StaffRoleId } from "./admin";
import { adminSignIn } from "./adminStore";
import { dutyLabel, type ExpertAccount, type ExpertDuty } from "./expertAccounts";
import {
  assignScreenRole,
  getScreenAccess,
  saveScreenRole,
} from "./screenAccessStore";

/**
 * 전문가 계정 → 운영 콘솔(/admin2)의 작업 화면.
 *
 * 문항 출제 · 문항 검수 · 진단 채점은 콘솔에만 있다. 전문가에게 그 화면을 전문가 자리
 * (/expert)에 한 벌 더 짓지 않고, **받은 권한만큼만 콘솔을 열어 준다** — 같은 일을 두
 * 화면이 하면 한쪽에서 고친 규칙(자가 검수 차단 · 검수 체크리스트)이 다른 쪽에 없다.
 *
 * 콘솔은 「누구로 들어왔나」(lib/adminStore.ts)와 「어느 화면을 보나」(lib/screenAccessStore.ts)
 * 둘로 문을 지킨다. 그래서 다리도 둘을 놓는다 —
 *   · 전문가 계정에서 콘솔 아이디(ex.…)와 역할을 지어 들여보내고
 *   · 권한 조합마다 화면 권한 그룹(「전문가 · 출제자」 …)을 만들어 그 아이디에 붙인다.
 * 화면 권한이 붙은 계정은 받은 화면만 보이므로(Shell), 회원 · 결제 · 설정은 열리지 않는다.
 *
 * ── 역할은 들어가는 화면이 정한다 ──
 * 콘솔의 역할은 하나뿐인데 전문가는 출제와 검토를 함께 받을 수 있다. 출제 화면으로 들어가면
 * 출제자, 검수 화면으로 들어가면 검수자로 들인다 — 그래야 「자기가 낸 문항을 자기가
 * 검수하지 못한다」는 규칙(lib/admin.ts의 maySelfReview)이 전문가에게도 그대로 걸린다.
 *
 * ⚠ 콘솔 로그인은 브라우저에 하나뿐이라, 같은 브라우저에서 운영자로 들어와 있었다면 그
 *   자리를 전문가가 차지한다(시안의 한계 — 서버 세션이 붙으면 계정마다 따로 선다).
 */

/** 전문가가 들어가는 작업 — 권한 하나에 화면 하나 */
export type ExpertWork = "authoring" | "review" | "grading" | "counsel";

export const expertWorks: Record<
  ExpertWork,
  { duty: ExpertDuty; label: string; href: string; role: StaffRoleId; screens: string[] }
> = {
  authoring: {
    duty: "author",
    label: "문항 출제",
    href: "/admin2/authoring",
    role: "author",
    /* 문항 한 건(/admin2/items/…)이 「문항 은행」 아래 주소라, 은행이 없으면 줄을 눌러도 열리지 않는다 */
    screens: ["/admin2/authoring", "/admin2/items"],
  },
  review: {
    duty: "reviewer",
    label: "문항 검토",
    href: "/admin2/review",
    role: "reviewer",
    screens: ["/admin2/review", "/admin2/items"],
  },
  grading: {
    duty: "grader",
    label: "진단 채점",
    href: "/admin2/grading",
    role: "master",
    screens: ["/admin2/grading", "/admin2/grading/members"],
  },
  /* 상담사 — 나에게 들어온 신청과 내 상담 가능 시간. 콘솔 역할에는 상담사가 없어 마스터로 들인다 */
  counsel: {
    duty: "counselor",
    label: "상담 관리",
    href: "/admin2/counsel",
    role: "master",
    screens: ["/admin2/counsel", "/admin2/counsel/schedule"],
  },
};

export const isExpertWork = (v: string): v is ExpertWork => v in expertWorks;

/** 이 계정이 들어갈 수 있는 작업 — 메뉴와 홈이 이 차례로 세운다 */
export function worksOf(account: ExpertAccount | null): ExpertWork[] {
  if (!account || account.state !== "approved") return [];
  return (Object.keys(expertWorks) as ExpertWork[]).filter((w) =>
    account.duties.includes(expertWorks[w].duty),
  );
}

/** 콘솔 아이디 — 운영자 아이디(admin.park)와 겹치지 않게 ex.를 앞에 단다 */
export const consoleLoginOf = (account: ExpertAccount) =>
  `ex.${account.loginId || account.id.toLowerCase()}`;

/** 콘솔에 들어와 있는 사람이 전문가 계정인가 — 상단 바가 「전문가 홈」 길을 세울지 정한다 */
export const isExpertConsoleLogin = (loginId: string | null | undefined) =>
  !!loginId && loginId.startsWith("ex.");

/**
 * 계정의 권한을 콘솔 화면 권한에 맞춘다.
 *
 * 승인 · 권한 변경 때와 콘솔에 들어가기 직전에 부른다. 작업 권한이 하나도 없으면 붙여 둔
 * 화면 권한을 뗀다 — 권한을 거둔 뒤에도 콘솔이 열려 있으면 안 된다.
 */
export function syncExpertConsole(account: ExpertAccount) {
  const loginId = consoleLoginOf(account);
  const works = worksOf(account);
  if (works.length === 0) {
    assignScreenRole(loginId, null);
    return;
  }
  const name = `전문가 · ${works.map((w) => dutyLabel(expertWorks[w].duty)).join(" · ")}`;
  const screens = [...new Set(works.flatMap((w) => expertWorks[w].screens))];
  const old = getScreenAccess().roles.find((r) => r.name === name);
  const role = saveScreenRole({ id: old?.id, name, screens });
  assignScreenRole(loginId, role.id);
}

/**
 * 전문가를 콘솔의 작업 화면으로 들인다. 갈 주소를 돌려주고, 권한이 없으면 null이다.
 */
export function enterExpertConsole(account: ExpertAccount, work: ExpertWork): string | null {
  if (!worksOf(account).includes(work)) return null;
  syncExpertConsole(account);
  adminSignIn({
    loginId: consoleLoginOf(account),
    staffName: account.profile.name,
    role: expertWorks[work].role,
    temp: false,
  });
  return expertWorks[work].href;
}
