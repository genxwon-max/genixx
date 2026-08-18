"use client";

import { useSyncExternalStore } from "react";
import { assessment, subjects, type SubjectId } from "./exam";

/**
 * 회차 시험 설정 (ADM-05).
 *
 * 제한 시간·응시 기간·보는 과목은 **회차마다 정하는 값**이지 서비스 전역 스위치가
 * 아니다. 3회차는 40분, 4회차는 45분일 수 있고, 그러면 두 회차 결과를 견줄 때
 * 「시간이 달랐다」는 사실이 회차 기록에 남아 있어야 한다. 시스템 설정에 두면 값이
 * 하나만 남아서, 지난 회차가 몇 분이었는지 아무도 모르게 된다.
 *
 * 그래서 여기는 바꾼 값만이 아니라 **판(version)과 바꾼 까닭**을 함께 든다. 설문
 * 원본(ADM-14)과 같은 얼개다 — 재는 도구를 바꿨으면 언제 무엇을 왜 바꿨는지가
 * 남아야 그 전후 자료를 함께 놓고 볼 수 있다.
 *
 * 바뀐 시간이 **이미 응시 중인 아이에게 소급되지 않는다**는 것이 이 파일의 다른
 * 절반이다. 시작할 때의 제한 시간을 응시 기록에 박아 두므로(examStore.startSubject),
 * 관리자가 도중에 40분을 30분으로 줄여도 지금 풀고 있는 아이의 시계는 줄지 않는다.
 */

export type ExamConfig = {
  roundId: string;
  roundLabel: string;
  /** 응시 기간 (YYYY-MM-DD) */
  opensAt: string;
  closesAt: string;
  /** 과목별 제한 시간(분) */
  limits: Record<SubjectId, number>;
  /** 이번 회차에 보는 과목 */
  enabled: Record<SubjectId, boolean>;
  /** 시간이 다 되면 자동으로 제출한다 */
  autoSubmit: boolean;
  /** 자동 제출 전에 주는 마무리 시간(분) */
  graceMin: number;
  /** 남은 시간 경고를 띄우기 시작하는 시점(분) */
  warnMin: number;
  version: number;
  updatedAt: string;
  updatedBy: string;
};

export type RoundLogEntry = {
  at: string;
  by: string;
  version: number;
  reason: string;
  lines: string[];
};

/** 손댈 수 있는 값의 한계 — 넘기면 막는다 */
export const LIMITS = {
  minMinutes: 5,
  maxMinutes: 180,
  maxGrace: 10,
  maxWarn: 30,
} as const;

const SEED_AT = "2026-03-02 09:00"; // 고정값 — SSR/CSR 불일치를 막는다

const SEED: ExamConfig = {
  roundId: "2026-3",
  roundLabel: assessment.round,
  opensAt: "2026-08-01",
  closesAt: assessment.deadline,
  limits: Object.fromEntries(subjects.map((s) => [s.id, s.limitMin])) as Record<SubjectId, number>,
  enabled: Object.fromEntries(subjects.map((s) => [s.id, true])) as Record<SubjectId, boolean>,
  /* 기본값은 자동 제출이다. 자동 제출을 끄면 「제한 시간」이라는 말이 화면에만 남고
     실제로는 아무것도 제한하지 않게 된다. 다만 마무리 시간 2분을 함께 둔다 —
     서술형을 쓰던 중에 문장 한가운데서 잘리면 그 답은 채점자가 읽을 수 없다. */
  autoSubmit: true,
  graceMin: 2,
  warnMin: 5,
  version: 1,
  updatedAt: SEED_AT,
  updatedBy: "초기 설정",
};

const SEED_LOG: RoundLogEntry[] = [
  {
    at: SEED_AT,
    by: "초기 설정",
    version: 1,
    reason: "서비스 시작 시 깔린 첫 판입니다",
    lines: [],
  },
];

export type RoundData = { config: ExamConfig; log: RoundLogEntry[] };

const SEED_DATA: RoundData = { config: SEED, log: SEED_LOG };

/* ───────────────────────── 점검 ───────────────────────── */

/** 바꾸기 전에 막을 것 — 값 자체가 말이 안 되는 경우 */
export function configErrors(c: ExamConfig): string[] {
  const out: string[] = [];
  for (const s of subjects) {
    const v = c.limits[s.id];
    if (!Number.isFinite(v) || v < LIMITS.minMinutes || v > LIMITS.maxMinutes) {
      out.push(
        `${s.short} 제한 시간은 ${LIMITS.minMinutes}분 이상 ${LIMITS.maxMinutes}분 이하로 적어 주세요.`,
      );
    }
  }
  if (!subjects.some((s) => c.enabled[s.id])) {
    out.push("과목을 하나도 켜 두지 않았습니다. 볼 것이 없는 회차는 열 수 없습니다.");
  }
  if (c.graceMin < 0 || c.graceMin > LIMITS.maxGrace) {
    out.push(`마무리 시간은 0분 이상 ${LIMITS.maxGrace}분 이하입니다.`);
  }
  if (c.warnMin < 1 || c.warnMin > LIMITS.maxWarn) {
    out.push(`남은 시간 경고는 1분 이상 ${LIMITS.maxWarn}분 이하입니다.`);
  }
  const shortest = Math.min(...subjects.filter((s) => c.enabled[s.id]).map((s) => c.limits[s.id]));
  if (Number.isFinite(shortest) && c.warnMin >= shortest) {
    out.push("남은 시간 경고가 가장 짧은 과목의 제한 시간보다 깁니다. 시작하자마자 경고가 뜹니다.");
  }
  if (c.closesAt < c.opensAt) {
    out.push("응시 마감일이 시작일보다 앞섭니다.");
  }
  if (!c.roundLabel.trim()) {
    out.push("회차 이름을 적어 주세요. 결과 리포트에 그대로 실립니다.");
  }
  return out;
}

/**
 * 막지는 않지만 짚어 둘 것.
 *
 * `started`는 이번 회차에 이미 응시를 시작한 사람 수다. 0이 아니면 조건이 바뀌는
 * 것이므로, 무엇이 어긋나는지 눈앞에 적어 둔다.
 */
export function configWarnings(before: ExamConfig, after: ExamConfig, started: number): string[] {
  const out: string[] = [];
  if (started > 0) {
    const moved = subjects.filter((s) => before.limits[s.id] !== after.limits[s.id]);
    if (moved.length > 0) {
      out.push(
        `이미 ${started}명이 응시를 시작했습니다. 지금 바꾸면 먼저 본 아이와 나중에 볼 아이의 조건이 달라집니다.`,
      );
      out.push(
        "이미 시작한 아이의 시계는 줄거나 늘지 않습니다. 시작할 때의 시간이 그 아이 기록에 박혀 있습니다.",
      );
    }
    const off = subjects.filter((s) => before.enabled[s.id] && !after.enabled[s.id]);
    if (off.length > 0) {
      out.push(
        `${off.map((s) => s.short).join("·")} 과목을 끕니다. 이미 그 과목을 제출한 아이의 자료는 남지만, 아직 안 본 아이는 영영 못 보게 됩니다.`,
      );
    }
  }
  if (before.autoSubmit && !after.autoSubmit) {
    out.push(
      "자동 제출을 끕니다. 시간이 다 되어도 계속 쓸 수 있게 되므로, 「제한 시간」은 화면에만 남고 실제로는 제한하지 않습니다.",
    );
  }
  for (const s of subjects) {
    const d = after.limits[s.id] - before.limits[s.id];
    if (d < 0) {
      out.push(`${s.short} 제한 시간을 ${-d}분 줄입니다. 지난 회차와 견줄 때 이 차이를 함께 봐야 합니다.`);
    }
  }
  return out;
}

/** 무엇이 어떻게 바뀌는지 사람 말로 — 그대로 변경 기록에 남는다 */
export function diffConfig(before: ExamConfig, after: ExamConfig): string[] {
  const out: string[] = [];
  if (before.roundLabel !== after.roundLabel) {
    out.push(`회차 이름 「${before.roundLabel}」 → 「${after.roundLabel}」`);
  }
  if (before.opensAt !== after.opensAt) out.push(`응시 시작 ${before.opensAt} → ${after.opensAt}`);
  if (before.closesAt !== after.closesAt) out.push(`응시 마감 ${before.closesAt} → ${after.closesAt}`);
  for (const s of subjects) {
    if (before.limits[s.id] !== after.limits[s.id]) {
      out.push(`${s.short} 제한 시간 ${before.limits[s.id]}분 → ${after.limits[s.id]}분`);
    }
    if (before.enabled[s.id] !== after.enabled[s.id]) {
      out.push(`${s.short} ${after.enabled[s.id] ? "켬" : "끔"}`);
    }
  }
  if (before.autoSubmit !== after.autoSubmit) {
    out.push(`시간이 다 되면 ${after.autoSubmit ? "자동 제출" : "그대로 두기"}`);
  }
  if (before.graceMin !== after.graceMin) {
    out.push(`마무리 시간 ${before.graceMin}분 → ${after.graceMin}분`);
  }
  if (before.warnMin !== after.warnMin) {
    out.push(`남은 시간 경고 ${before.warnMin}분 전 → ${after.warnMin}분 전`);
  }
  return out;
}

/* ───────────────────────── 저장소 ───────────────────────── */

const KEY = "genixx.round";
const EVENT = "genixx:round-change";

let cacheRaw: string | null = null;
let cacheValue: RoundData = SEED_DATA;

function read(): RoundData {
  if (typeof window === "undefined") return SEED_DATA;
  const raw = window.localStorage.getItem(KEY);
  if (raw === cacheRaw) return cacheValue;
  cacheRaw = raw;
  try {
    const parsed = raw ? (JSON.parse(raw) as RoundData) : SEED_DATA;
    /* 뒤에 과목이 늘어나도 옛 저장분이 빈칸을 내지 않도록 씨앗 위에 덮는다 */
    cacheValue = {
      log: parsed.log ?? SEED_LOG,
      config: {
        ...SEED,
        ...parsed.config,
        limits: { ...SEED.limits, ...parsed.config?.limits },
        enabled: { ...SEED.enabled, ...parsed.config?.enabled },
      },
    };
  } catch {
    cacheValue = SEED_DATA;
  }
  return cacheValue;
}

function write(next: RoundData) {
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

export function useRound(): RoundData {
  return useSyncExternalStore(subscribe, read, () => SEED_DATA);
}

export function useExamConfig(): ExamConfig {
  return useRound().config;
}

/** 훅 밖에서 — 응시를 시작할 때 그 시점의 값을 박아 두는 데 쓴다 */
export function getExamConfig(): ExamConfig {
  return read().config;
}

function now() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * 설정을 바꾼다.
 *
 * 판 번호는 앞으로만 간다. 되돌릴 때도 번호를 되돌리지 않고 새 판을 매긴다 —
 * 같은 번호가 서로 다른 값을 가리키면 「그때 몇 분이었나」를 물을 자리가 사라진다.
 */
export function saveConfig(next: ExamConfig, by: string, reason: string) {
  const cur = read();
  const lines = diffConfig(cur.config, next);
  if (lines.length === 0) return null;
  if (configErrors(next).length > 0) return null;

  const version = cur.config.version + 1;
  const at = now();
  write({
    config: { ...next, version, updatedAt: at, updatedBy: by },
    log: [{ at, by, version, reason, lines }, ...cur.log].slice(0, 40),
  });
  return version;
}

/** 옛 판으로 되돌린다 — 값만 되돌리고 번호는 새로 매긴다 */
export function revertConfig(version: number, by: string, reason: string) {
  const cur = read();
  const at = cur.log.find((l) => l.version === version);
  if (!at) return null;
  /* 기록에는 「무엇을 바꿨나」만 들어 있으므로, 그 판의 값을 되짚어 세운다 */
  const rebuilt = rebuild(version, cur);
  if (!rebuilt) return null;
  return saveConfig(rebuilt, by, reason);
}

/**
 * 어떤 판의 값을 되짚는다.
 *
 * 판마다 전체 값을 통째로 넣어 두지 않고 바뀐 줄만 남기기 때문에, 되돌릴 때는 지금
 * 값에서 그 뒤에 일어난 변경을 거꾸로 벗겨 낸다. 화면에 보여 준 변경 기록과 되돌린
 * 결과가 어긋날 수 없다는 것이 이 방식의 이점이다.
 */
function rebuild(version: number, data: RoundData): ExamConfig | null {
  let c = { ...data.config, limits: { ...data.config.limits }, enabled: { ...data.config.enabled } };
  /* 로그는 최신이 앞이다. 지금 판부터 목표 판 다음 판까지 거꾸로 되감는다. */
  for (const entry of data.log) {
    if (entry.version <= version) break;
    for (const line of entry.lines) {
      const undone = undo(line, c);
      if (!undone) return null;
      c = undone;
    }
  }
  return c;
}

/** 변경 한 줄을 거꾸로 돌린다 */
function undo(line: string, c: ExamConfig): ExamConfig | null {
  let m = /^회차 이름 「(.*)」 → 「(.*)」$/.exec(line);
  if (m) return { ...c, roundLabel: m[1] };

  m = /^응시 시작 (\S+) → (\S+)$/.exec(line);
  if (m) return { ...c, opensAt: m[1] };

  m = /^응시 마감 (\S+) → (\S+)$/.exec(line);
  if (m) return { ...c, closesAt: m[1] };

  m = /^(\S+) 제한 시간 (\d+)분 → (\d+)분$/.exec(line);
  if (m) {
    const s = subjects.find((x) => x.short === m![1]);
    if (!s) return null;
    return { ...c, limits: { ...c.limits, [s.id]: Number(m[2]) } };
  }

  m = /^(\S+) (켬|끔)$/.exec(line);
  if (m) {
    const s = subjects.find((x) => x.short === m![1]);
    if (!s) return null;
    return { ...c, enabled: { ...c.enabled, [s.id]: m[2] === "끔" } };
  }

  m = /^시간이 다 되면 (자동 제출|그대로 두기)$/.exec(line);
  if (m) return { ...c, autoSubmit: m[1] !== "자동 제출" };

  m = /^마무리 시간 (\d+)분 → (\d+)분$/.exec(line);
  if (m) return { ...c, graceMin: Number(m[1]) };

  m = /^남은 시간 경고 (\d+)분 전 → (\d+)분 전$/.exec(line);
  if (m) return { ...c, warnMin: Number(m[1]) };

  return null;
}
