import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 「로 / 으로」를 앞말에 맞춰 고른다.
 *
 * 화면 문구를 값과 이어 붙이면 「완전정답로 확정」 같은 말이 나온다. 사람이 읽는
 * 문장이므로 조사까지 맞춘다 — 받침이 없거나 ㄹ 받침이면 「로」, 나머지는 「으로」.
 */
export function ro(word: string) {
  const last = word.trim().slice(-1);
  const code = last.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return "로"; // 한글이 아니면 그냥 둔다
  const jong = code % 28;
  return jong === 0 || jong === 8 ? "로" : "으로";
}
