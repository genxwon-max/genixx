"use client";

import { useSyncExternalStore } from "react";
import type { Span } from "./counselors";

/**
 * 결제·면담·학생 일괄 등록에서 앞 화면이 고른 것을 뒤 화면이 이어 받는 자리.
 *
 * 세 흐름은 걸음마다 주소가 다르다 — 결제는 /my/payments → /checkout → /done, 면담은
 * /my/interviews → /counselor → /time → /pay → /done, 일괄 등록은 /my/children/bulk → /done.
 * 걸음 하나가 화면 목록(docs/사용자 화면 전체.csv)의 한 줄이고, 그 주소를 그대로 개발팀에
 * 디자인으로 넘긴다.
 *
 * ── 왜 주소에 싣지 않는가 ──
 * 학생 · 전문가 · 날짜 · 시각을 모두 주소에 실으면 같은 화면의 주소가 고를 때마다 달라지고,
 * 적어 둔 날짜가 지나면 그 주소가 열리지 않는다. 그래서 주소는 **어느 화면인가**만 가리키고
 * 고른 것은 여기 둔다. 새로 고침 · 새 탭 · 뒤로 가기에도 그대로 남는다.
 *
 * 면담은 보호자 자리(/my)와 학생 본인 자리(/student)를 따로 적는다. 한 브라우저에서 둘을
 * 오가며 볼 때 보호자가 고른 아이가 학생 화면으로 새어 들지 않게 하려고.
 *
 * ⚠ 브라우저 저장소에만 남는다. 결제 정보는 두지 않는다 — 누구 · 누구와 · 언제뿐이다.
 */

/** 결제 › 재능 진단 — ① 학생 선택에서 고른 아이들 */
export type PayDraft = {
  students: string[];
};

/**
 * 학생 일괄 등록 — ① 명단에서 등록한 아이들을 ② 발급 화면이 이어 받는다.
 *
 * 명단에 적던 값(이름 · 생년월일 · 연락처)은 여기 두지 않는다. 등록을 마친 아이의 ID만
 * 남기고, 발급 화면은 그 ID로 명부에서 코드를 읽는다.
 */
export type BulkDraft = {
  issued: string[];
};

/** 면담 — ① 학생 · ② 전문가 · ③ 날짜 · 시각 */
export type CounselDraft = {
  studentId: string;
  /** 결제 화면의 면담 차림표에서 들고 온 길이 — 전문가 고르개의 처음 조건. 0이면 조건 없음 */
  spanPref: Span | 0;
  counselorId: string;
  span: Span;
  date: string;
  starts: string[];
};

export type CounselZone = "/my" | "/student";

const blankPay: PayDraft = { students: [] };
const blankCounsel: CounselDraft = {
  studentId: "",
  spanPref: 0,
  counselorId: "",
  span: 30,
  date: "",
  starts: [],
};

/** 저장소 한 칸 — 읽기는 같은 문자열이면 같은 참조를 돌려준다(useSyncExternalStore) */
function slot<T extends object>(key: string, blank: T) {
  const event = `genixx:draft-change:${key}`;
  let cacheRaw: string | null = null;
  let cacheValue: T = blank;

  function read(): T {
    if (typeof window === "undefined") return blank;
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(key);
    } catch {
      return cacheValue;
    }
    if (raw === cacheRaw) return cacheValue;
    cacheRaw = raw;
    try {
      /* 칸이 늘어도 옛 저장분이 깨지지 않게 빈 값 위에 덮는다 */
      cacheValue = raw ? { ...blank, ...(JSON.parse(raw) as Partial<T>) } : blank;
    } catch {
      cacheValue = blank;
    }
    return cacheValue;
  }

  function write(next: T) {
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      return;
    }
    window.dispatchEvent(new Event(event));
  }

  function subscribe(onChange: () => void) {
    window.addEventListener("storage", onChange);
    window.addEventListener(event, onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener(event, onChange);
    };
  }

  return { read, write, subscribe, blank };
}

const pay = slot("genixx.draft.pay", blankPay);
const bulk = slot<BulkDraft>("genixx.draft.bulk", { issued: [] });
const counsel: Record<CounselZone, ReturnType<typeof slot<CounselDraft>>> = {
  "/my": slot("genixx.draft.counsel", blankCounsel),
  "/student": slot("genixx.draft.counsel.self", blankCounsel),
};

export function usePayDraft(): PayDraft {
  return useSyncExternalStore(pay.subscribe, pay.read, () => pay.blank);
}

export function patchPayDraft(patch: Partial<PayDraft>) {
  pay.write({ ...pay.read(), ...patch });
}

export function useBulkDraft(): BulkDraft {
  return useSyncExternalStore(bulk.subscribe, bulk.read, () => bulk.blank);
}

export function patchBulkDraft(patch: Partial<BulkDraft>) {
  bulk.write({ ...bulk.read(), ...patch });
}

export function useCounselDraft(zone: CounselZone): CounselDraft {
  const s = counsel[zone];
  return useSyncExternalStore(s.subscribe, s.read, () => s.blank);
}

export function patchCounselDraft(zone: CounselZone, patch: Partial<CounselDraft>) {
  const s = counsel[zone];
  s.write({ ...s.read(), ...patch });
}
