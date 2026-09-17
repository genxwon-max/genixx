"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

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

/* ───────────────────────── 응시 나가기 요청 ───────────────────────── */

/** 헤더의 「포기하기」가 응시 화면에 보내는 신호 — 둘은 서로 다른 트리에 있다 */
const EXIT_EVENT = "exam:ask-exit";

export function askExamExit() {
  window.dispatchEvent(new Event(EXIT_EVENT));
}

/* 지금 물음을 받아 줄 화면이 있는가 — 없으면 헤더에 「포기하기」를 두지 않는다 */
let listening = 0;
const watchers = new Set<() => void>();
const setListening = (delta: number) => {
  listening += delta;
  watchers.forEach((w) => w());
};

export function useExamExitAvailable() {
  return useSyncExternalStore(
    (cb) => {
      watchers.add(cb);
      return () => watchers.delete(cb);
    },
    () => listening > 0,
    () => false,
  );
}

type KeyboardLock = { lock?: (keys: string[]) => Promise<void>; unlock?: () => void };

/**
 * 응시 중 ESC · 헤더의 「포기하기」 · 전체화면 해제를 모두 「나갈까요?」 물음으로 바꾼다.
 *
 * 브라우저는 전체화면에서 ESC를 누르면 페이지가 알기도 전에 전체화면을 끈다. 크롬 · 엣지는
 * 전체화면일 때 키보드 잠금(navigator.keyboard.lock)으로 ESC를 페이지가 먼저 받게 할 수
 * 있어 그 길을 쓴다(길게 누르면 브라우저가 여전히 끈다). 잠금을 못 하는 브라우저에서는
 * 전체화면이 꺼진 뒤에 묻고, 「계속」을 누르면 그 클릭 안에서 다시 전체화면으로 들어간다.
 */
export function useExamExitRequest(active: boolean, onAsk: () => void) {
  const ask = useRef(onAsk);
  useEffect(() => {
    ask.current = onAsk;
  });

  useEffect(() => {
    if (!active) return;
    const keyboard = (navigator as Navigator & { keyboard?: KeyboardLock }).keyboard;

    const onExit = () => ask.current();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      ask.current();
    };
    const onFull = () => {
      if (document.fullscreenElement) keyboard?.lock?.(["Escape"]).catch(() => {});
      else ask.current();
    };

    if (document.fullscreenElement) keyboard?.lock?.(["Escape"]).catch(() => {});
    setListening(1);
    window.addEventListener(EXIT_EVENT, onExit);
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFull);
    return () => {
      window.removeEventListener(EXIT_EVENT, onExit);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFull);
      keyboard?.unlock?.();
      setListening(-1);
    };
  }, [active]);
}
