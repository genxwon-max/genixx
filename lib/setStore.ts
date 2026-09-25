"use client";

import { useEffect, useSyncExternalStore } from "react";
import { isSubjectId, type SubjectId } from "./exam";
import { isTrackId, type TrackId } from "./examCatalog";
import { claimSet, raiseTier } from "./examStore";
import { applyFree, getWallet } from "./ticketStore";

/**
 * 가입 전에 푼 **셋트 한 건**.
 *
 * 진단평가 절차의 둘째·셋째 단계다 — 학년마다 1셋트(4문항)를 한 교과만 골라 풀고, 그것을
 * 푼 뒤 회원가입을 하면 무료시험(나머지 문항)으로 넘어간다. 그래서 셋트 답은 창을 닫아도
 * 남아 있어야 한다. 가입한 뒤 그 답을 무료시험의 앞 문항으로 물려받지 않으면, 아이는 같은
 * 네 문항을 두 번 풀게 되고 「모두 20문항」이라 적어 놓은 셈도 어긋난다.
 *
 * 학생별로 나누지 않는다 — 아직 계정이 없는 사람의 기록이라 열쇠로 쓸 학생 번호가 없다.
 * 한 브라우저에 한 건만 두고, 가입한 학생이 물려받는 순간(claimSet) 비운다.
 *
 * ⚠ 브라우저에만 있다. 셋트를 푼 기기와 가입한 기기가 다르면 물려받을 것이 없고, 그때는
 *   무료시험이 20문항을 처음부터 연다 — 답을 잃는 것이 두 번 푸는 것보다 낫다.
 */

export type SetTrial = {
  round: string;
  track: TrackId;
  /** 고른 교과 — 절차가 「수, 과, 국 중 1개 교과」로 정했다 */
  subject: SubjectId;
  /** 문항 ID → 고른 보기 index 또는 쓴 글 */
  answers: Record<string, number | string>;
  /** 마지막으로 답한 시각 */
  at: string;
};

const KEY = "genixx.set";
const EVENT = "genixx:set-change";

let cacheRaw: string | null = null;
let cacheValue: SetTrial | null = null;

/** 저장분을 훑어 없어진 학년 칸·과목을 버린다 — 학년이 줄면 옛 번호가 남는다 */
function clean(v: SetTrial | null): SetTrial | null {
  if (!v || !isTrackId(v.track) || !isSubjectId(v.subject)) return null;
  return v;
}

function read(): SetTrial | null {
  if (typeof window === "undefined") return null;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return cacheValue;
  }
  if (raw === cacheRaw) return cacheValue;
  cacheRaw = raw;
  try {
    cacheValue = raw ? clean(JSON.parse(raw) as SetTrial) : null;
  } catch {
    cacheValue = null;
  }
  return cacheValue;
}

function write(next: SetTrial | null) {
  try {
    if (next) window.localStorage.setItem(KEY, JSON.stringify(next));
    else window.localStorage.removeItem(KEY);
  } catch {
    return;
  }
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

export function useSetTrial(): SetTrial | null {
  return useSyncExternalStore(
    subscribe,
    read,
    () => null,
  );
}

export const getSetTrial = () => read();

/**
 * 셋트 답 한 문항을 적는다 — 고른 평가·학년·교과가 바뀌면 앞의 답은 버린다.
 *
 * 교과를 바꿔 다시 시작하면 앞 교과의 답을 들고 있을 까닭이 없다. 절차가 한 교과만
 * 고르게 했으므로, 둘을 함께 들고 있으면 무료시험이 어느 과목을 물려받을지 갈린다.
 */
export function setSetAnswer(
  at: { round: string; track: TrackId; subject: SubjectId },
  questionId: string,
  value: number | string,
) {
  const cur = read();
  const same =
    cur && cur.round === at.round && cur.track === at.track && cur.subject === at.subject;
  write({
    ...at,
    answers: { ...(same ? cur.answers : {}), [questionId]: value },
    at: new Date().toISOString(),
  });
}

/** 셋트 기록을 비운다 — 가입한 학생이 물려받은 뒤에 부른다 */
export const clearSetTrial = () => write(null);

/* ───────────────────────── 물려받기 ───────────────────────── */

/**
 * 가입한 학생이 셋트를 물려받는다 — 절차의 셋째 단계에서 넷째 단계로 넘어가는 자리.
 *
 * 두 가지를 한다.
 *   · 셋트를 풀던 그 평가를 **무료로 접수**한다(응시권을 쓰지 않는다). 접수가 없으면 응시하기
 *     탭이 비어 있어, 가입을 마친 아이는 무료시험을 어디서 보는지 알 수 없다.
 *   · 셋트 4문항의 답을 그 과목의 응시 기록으로 옮긴다.
 *
 * 그러고 나면 기록을 비운다 — 한 번만 물려받는다. 같은 회차에 이미 접수한 것이 있으면
 * 접수는 건너뛰고 답만 옮긴다(applyFree가 false를 돌려준다).
 *
 * 돌려주는 값은 「물려받을 것이 있었나」다. 화면이 「무료시험이 열렸습니다」를 한 번 말할 수
 * 있게 하려는 것이다.
 */
export function claimSetFor(studentId: string): boolean {
  const trial = read();
  if (!trial) return false;
  applyFree(studentId, trial.round, trial.track);
  claimSet(studentId, trial.subject, trial.answers);
  write(null);
  return true;
}

/**
 * 응시 존 화면이 열릴 때 한 번 **셋트를 물려받고 갈래를 맞춘다.**
 *
 * 가입을 마친 학생이 처음 닿는 자리가 접수하기 탭일 수도, 응시하기 탭일 수도 있어 두 곳에서
 * 부른다. 할 일이 없으면 아무 일도 하지 않으므로 두 번 불러도 괜찮다.
 *
 * ── 갈래를 왜 여기서 맞추는가 ──
 * 갈래는 두 곳에 적힌다. 접수 기록(lib/ticketStore.ts)은 「이 평가를 무엇으로 접수했나」를,
 * 응시 기록(lib/examStore.ts)은 「이 아이에게 몇 문항이 열리나」를 들고 있다. 접수는 회차마다
 * 갈리고 응시 기록은 학생마다 한 벌이라 둘을 한 값으로 합칠 수 없다.
 *
 * 그래서 들어올 때 한 번 맞춘다 — 유료로 접수한 기록이 있으면 응시 기록의 갈래도 유료로
 * 올린다. 갈래를 적기 전에 접수한 옛 기록도 이 자리에서 제자리를 찾는다.
 */
export function useClaimSet(studentId: string | null) {
  useEffect(() => {
    if (!studentId) return;
    claimSetFor(studentId);
    if (getWallet(studentId).used.some((u) => u.tier === "paid")) raiseTier(studentId, "paid");
  }, [studentId]);
}
