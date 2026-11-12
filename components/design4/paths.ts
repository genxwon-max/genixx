import { legalGroup, siteMenu } from "@/lib/nav";

/**
 * /design4 안에서 링크가 어디로 가는가.
 *
 * 공개 사이트 갈래(소개 · 서비스 · 샘플 · 콘텐츠 · 고객지원 · 파트너 · 커뮤니티 · 법적 고지)와
 * 로그인 · 회원가입(2026-11-12 추가)의
 * 주소는 /design4 아래 사본으로 보낸다 — 시안을 둘러보는 사람이 실제 화면으로 빠져나가지 않게.
 * 홈(/)은 /design4/home이다(/design4 자체는 /design3처럼 주소 목록이다).
 * 응시 · 보호자 · 학생 화면처럼 그 밖의 주소는 그대로 둔다.
 */
const PUBLIC = /^\/(about|service|sample|insight|support|partner|community|legal|login|signup|consent)(\/|$|#|\?)/;

export const D4_HOME = "/design4/home";

export function d4(href: string) {
  if (href === "/") return D4_HOME;
  return PUBLIC.test(href) ? `/design4${href}` : href;
}

/** /design4 주소에서 실제 서비스 주소를 되찾는다 */
export function realOf(pathname: string) {
  const rest = pathname.replace(/^\/design4/, "");
  return rest === "/home" ? "/" : rest || "/";
}

/** 머리띠 · 왼쪽 메뉴가 읽는 갈래 — 공개 사이트 일곱 갈래 + 법적 고지 */
export const d4Groups = [...siteMenu, legalGroup];

export function groupOf(real: string) {
  const group = d4Groups.find((g) => real === g.href || real.startsWith(`${g.href}/`));
  const here = group?.children.find((c) => real === c.href || real.startsWith(`${c.href}/`));
  return { group, here };
}
