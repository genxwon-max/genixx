"use client";

/** 응시 화면 전체화면 제어. 사용자 동작(클릭) 안에서 호출해야 브라우저가 허용한다. */
export async function enterFullscreen() {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
  } catch {
    // 브라우저가 막으면 일반 창으로 진행한다
  }
}

export async function leaveFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
  } catch {
    // 무시
  }
}

export function isFullscreen() {
  return typeof document !== "undefined" && !!document.fullscreenElement;
}
