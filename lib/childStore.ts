"use client";

/**
 * 자녀 등록 초안의 잔재를 치운다.
 *
 * 예전에는 등록이 동의(B00) → 기본정보(B01~B10) 두 화면이었고, 그 사이를 건너는
 * 동안 생년월일과 동의 갈래를 브라우저에 들고 다녔다. 지금은 한 폼에서 끝나므로
 * 들고 다닐 것이 없다.
 *
 * 그래도 이 함수는 남긴다. 예전 흐름을 쓰던 중에 창을 닫은 사람의 브라우저에는
 * 아직 아이 생년월일이 남아 있다. 등록을 마칠 때 한 번 지워 주는 자리다.
 */

const KEY = "genixx.child.draft";
const EVENT = "genixx:child-draft-change";

export function clearChildDraft() {
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
}
