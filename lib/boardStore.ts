"use client";

import { useSyncExternalStore } from "react";
import type { Role, Session } from "./authStore";

/**
 * 자유게시판(PUB-09-2) 글.
 *
 * 쓰는 사람은 로그인한 보호자·기관·전문가다. 학생은 쓰지 못한다 — 학생은 계정이 아니라
 * 보호자가 발급한 접속코드로 들어오고(ACC-02-1), 대부분 만 14세 미만이다. 아이가 공개
 * 게시판에 제 이름과 학교를 적는 길을 처음부터 열어 두지 않는다.
 *
 * 본문은 서식 없는 글만 받는다. 공지처럼 HTML·마크다운을 받으면 아무나 쓰는 자리에
 * 소독기 하나만 믿고 태그를 들이게 된다. 화면은 whitespace-pre-wrap으로 줄바꿈만 살린다.
 *
 * ⚠ 브라우저 저장소에만 남는다(lib/contentStore.ts와 같다). 붙일 때는 게시판 API로
 *   갈아 끼운다 — 지금은 같은 브라우저에서 쓴 글만 보인다.
 */

export type Post = {
  id: string;
  title: string;
  body: string;
  /** 목록·본문에 보이는 이름 — 쓸 때 가려서 저장한다(maskName) */
  author: string;
  /** 지울 수 있는 사람을 가르는 값 — 화면에는 나가지 않는다 */
  authorKey: string;
  role: Role;
  /** 게시 시각 (YYYY-MM-DD HH:mm) */
  postedAt: string;
};

/** 글을 쓸 수 없는 역할 */
export const cannotWrite: Role[] = ["student"];

/** 운영 공지 한 편 — 게시판이 비어 있을 때 무엇을 쓰면 안 되는지부터 보이게 한다 */
const SEED: Post[] = [
  {
    id: "BD-001",
    title: "자유게시판 이용 안내",
    body: [
      "자유게시판은 보호자·기관 회원이 진단 준비와 양육 경험을 나누는 자리입니다.",
      "",
      "· 아이의 실명, 학교, 사진, 연락처는 올리지 말아 주세요. 올라온 경우 운영팀이 내립니다.",
      "· 진단 문항이나 정답을 옮겨 적는 글은 다른 응시자의 공정성을 해치므로 내립니다.",
      "· 광고·홍보, 다른 회원을 향한 비방은 예고 없이 내립니다.",
      "· 결과 해석이나 계정 문제처럼 답이 필요한 질문은 고객지원의 1:1 문의로 남겨 주세요.",
    ].join("\n"),
    author: "운영팀",
    authorKey: "admin",
    role: "admin",
    postedAt: "2026-08-01 10:00",
  },
];

/* ───────────────────────── 저장소 ───────────────────────── */

const KEY = "genixx.board";
const EVENT = "genixx:board-change";

let cacheRaw: string | null = null;
let cacheValue: Post[] = SEED;

function read(): Post[] {
  if (typeof window === "undefined") return SEED;
  const raw = window.localStorage.getItem(KEY);
  if (raw === cacheRaw) return cacheValue;
  cacheRaw = raw;
  try {
    cacheValue = raw ? (JSON.parse(raw) as Post[]) : SEED;
  } catch {
    cacheValue = SEED;
  }
  return cacheValue;
}

function write(next: Post[]) {
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

/** 새 글이 위로 */
export function usePosts(): Post[] {
  return useSyncExternalStore(subscribe, read, () => SEED);
}

/* ───────────────────────── 쓰기·지우기 ───────────────────────── */

/** 이름 가운데를 가린다 — 김민수 → 김*수, 이준 → 이*, 기관명은 그대로 둔다 */
export function maskName(name: string) {
  const n = name.trim();
  if (n.length <= 1) return n || "회원";
  if (n.length === 2) return `${n[0]}*`;
  return `${n[0]}${"*".repeat(n.length - 2)}${n[n.length - 1]}`;
}

/** 같은 사람인지 가르는 값 — 아이디, 없으면 이메일, 그것도 없으면 역할과 이름 */
export function authorKeyOf(s: Session) {
  return s.loginId ?? s.email ?? `${s.role}:${s.name}`;
}

function now() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 글을 올리고 새 번호를 돌려준다 */
export function addPost(session: Session, title: string, body: string): string {
  const cur = read();
  const max = cur.reduce((m, p) => Math.max(m, Number(p.id.slice(3)) || 0), 0);
  const id = `BD-${String(max + 1).padStart(3, "0")}`;
  const author = session.role === "director" && session.org ? session.org : maskName(session.name);
  write([
    {
      id,
      title: title.trim(),
      body: body.trim(),
      author,
      authorKey: authorKeyOf(session),
      role: session.role,
      postedAt: now(),
    },
    ...cur,
  ]);
  return id;
}

/** 쓴 사람과 관리자만 지울 수 있다 */
export function canRemove(post: Post, session: Session | null) {
  if (!session) return false;
  return session.role === "admin" || authorKeyOf(session) === post.authorKey;
}

export function removePost(id: string) {
  write(read().filter((p) => p.id !== id));
}
