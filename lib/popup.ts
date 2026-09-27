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

/**
 * 응시 창을 닫는다 — 원래 창이 없으면 주어진 자리로 보낸다.
 *
 * 닫는 단추가 두 자리에 있다. 머리 오른쪽 끝과 셋트를 다 푼 끝 화면이다. 창을 닫는 방법을
 * 양쪽에 적어 두면 한쪽만 고쳐져, 어떤 자리에서는 전체화면이 풀리지 않은 채로 창이 닫힌다.
 *
 * 전체화면을 먼저 푼다. 팝업으로 열리지 않고 같은 탭에서 열린 경우(팝업 차단) 창을 닫을 수
 * 없어 주소로 돌아가는데, 전체화면인 채로 돌아가면 대시보드가 전체화면으로 뜬다.
 */
export async function closeExamWindow(fallback = "/exam/apply") {
  const { leaveFullscreen } = await import("./fullscreen");
  await leaveFullscreen();
  if (typeof window === "undefined") return;
  if (window.opener) {
    window.close();
    return;
  }
  window.location.href = fallback;
}
