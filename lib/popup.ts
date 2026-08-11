"use client";

/**
 * 응시·설문은 크기가 고정된 별도 창으로 연다.
 * 팝업이 차단되면 같은 탭으로 이동시켜 흐름이 끊기지 않게 한다.
 */
export function openFixedWindow(url: string, width: number, height: number, name = "genixx") {
  if (typeof window === "undefined") return;
  const left = window.screenX + Math.max(0, Math.round((window.outerWidth - width) / 2));
  const top = window.screenY + Math.max(0, Math.round((window.outerHeight - height) / 2));
  const features = `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`;
  const win = window.open(url, `${name}-${Date.now()}`, features);
  if (!win) {
    window.location.href = url;
    return;
  }
  win.focus();
}

/** 응시 창 (좌우 분할이 유지되도록 넓게) */
export const examWindow = (url: string) => openFixedWindow(url, 1280, 880, "genixx-exam");

/** 설문 창 (세로로 긴 고정 크기) */
export const surveyWindow = (url: string) => openFixedWindow(url, 620, 820, "genixx-survey");
