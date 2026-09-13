"use client";

import { useMemo, useSyncExternalStore } from "react";
import { currentRound, rounds, type Round, type RoundState } from "./admin";
import { gradeBands, type GradeBand } from "./blueprint";
import { formItems, type ExamForm } from "./formStore";
import { detailIsEmpty, type DetailMode } from "./richText";
import type { ItemDraft } from "./itemStore";

/**
 * 회차 편성과 개폐 (ADM-05-4).
 *
 * 「이 회차에 어떤 문항이 나가는가」와 「이 회차를 열어도 되는가」는 한 가지 물음의
 * 앞뒤다. 그런데 앞엣것은 문항 은행(검사지 조립)에, 뒤엣것은 어디에도 없었다.
 * 그래서 관리자는 검사지를 확정해 놓고도 그것이 회차에 걸렸는지 확인할 자리가
 * 없었고, 회차 상태는 코드에 박힌 글자였다.
 *
 * 이 파일이 그 둘을 잇는다 —
 *
 *   편성  한 회차는 **과목 × 학년군** 칸으로 이루어진다(3 × 2 = 여섯 칸). 한 칸이
 *         검사지 한 벌이고, 칸마다 짜거나 비워 둘 수 있다. 비운 칸은 이번 회차에
 *         그 과목·학년군을 보지 않는다는 뜻이다.
 *
 *   개폐  준비중 → 응시 진행중 → 채점중 → 마감. 여는 것은 사람이 누르되, **초안이
 *         하나라도 남아 있으면 막는다.** 확정되지 않은 검사지가 회차에 걸리면 응시
 *         도중에 문항이 갈릴 수 있고, 그러면 같은 회차 점수를 견줄 수 없다.
 *
 * ⚠ 검사지 내용을 여기 복사해 두지 않는다. 무엇이 나가는지는 formStore가 들고 있는
 *   문항 번호에서 매번 다시 센다 — 복사본을 들면 은행에서 고친 문항과 회차에 걸린
 *   문항이 조용히 갈라진다.
 */

export type PlanAction = "open" | "close" | "finish" | "reopen" | "period";

export const planActions: Record<PlanAction, string> = {
  open: "회차 열기",
  close: "응시 마감",
  finish: "회차 종료",
  reopen: "응시 다시 열기",
  period: "응시 기간 변경",
};

/**
 * 회차를 열고 닫는 네 동작.
 *
 * 기간 변경을 뺀 갈래다. 앞의 넷은 되돌리기 어려워 「한 번 묻는 대화상자」를 거치지만
 * 기간은 판 위에서 고쳐 저장하는 값이라 물을 것이 없다. 한 union으로 묶어 두었더니
 * 대화상자 문구표가 쓰지도 않을 기간 칸을 요구했다.
 */
export type PlanGateAction = Exclude<PlanAction, "period">;

export type PlanLog = { at: string; by: string; action: PlanAction; text: string };

/**
 * 회차 공지 한 덩이 — 글과 그림.
 *
 * 그림은 data URL로 담는다. 이 콘솔은 파일 서버가 없어서 올릴 데가 없고, 붙일 때는 이
 * 자리에 업로드 주소가 들어간다. 담기 전에 가로 1200px로 줄인다 — 브라우저 저장소는
 * 5MB 남짓이라 사진 두 장이면 회차 기록·문항·검사지가 통째로 안 들어간다(NoteImages 참조).
 */
/**
 * 회차 공지 한 덩이 — 문항 지문과 **같은 네 갈래**로 쓴다(글 · 마크다운 · HTML · 그림).
 *
 * 글 한 칸과 그림 목록으로만 받던 것을 넓혔다. 공지에 실제로 들어가는 것은 「9월 2일
 * 오전에 점검이 있습니다」 같은 두 문장이기도 하고, 표와 굵은 글씨가 필요한 안내이기도
 * 하다. 문항 지문이 같은 문제를 이미 네 갈래로 풀어 두었으므로(lib/richText.ts) 그것을
 * 그대로 쓴다 — 같은 일을 하는 칸이 화면마다 다른 꼴이면 한쪽에만 미리보기가 붙는다.
 */
export type RoundNote = { mode: DetailMode; body: string; images: string[] };

export const blankNote = (): RoundNote => ({ mode: "text", body: "", images: [] });

/**
 * 저장분을 한 꼴로 맞춘다.
 *
 * 세 대가 섞여 있다 — 글만 문자열로 든 것, {text, images}로 든 것, 지금 꼴. 앞의 둘은
 * 전부 「글」 갈래로 읽는다. 읽을 때 맞추므로 저장소를 옮겨 쓰는 일(migration)이 없다.
 */
export function noteOf(v: RoundNote | { text?: string; images?: string[] } | string | undefined): RoundNote {
  if (!v) return blankNote();
  if (typeof v === "string") return { mode: "text", body: v, images: [] };
  const old = v as Partial<RoundNote> & { text?: string };
  const body = old.body ?? old.text ?? "";
  const images = old.images ?? [];
  /* 글이 없고 그림만 있는 옛 공지는 「그림」 갈래로 읽는다. 「글」로 읽으면 본문이 비어
     있다는 뜻이 되어, 다음 저장 때 detailIsEmpty가 그 공지를 통째로 버린다 */
  return {
    mode: old.mode ?? (body.trim() === "" && images.length > 0 ? "images" : "text"),
    body,
    images,
  };
}

/**
 * 저장할 꼴로 다듬는다 — **저장한 뒤에 읽어 오는 값과 같아야 한다.**
 *
 * 화면이 든 초안과 저장소가 든 값을 견주어 「고친 것이 남았는가」를 셈하므로(useEditDraft),
 * 저장할 때 조용히 다듬으면 그 둘이 영영 어긋난다 — 줄 끝 빈 칸 하나로 저장 줄이 계속
 * 켜져 있고, 저장을 눌러도 내려오지 않는다. 다듬는 규칙을 한 곳에 두고 양쪽이 함께 쓴다.
 */
export function canonNote(v: RoundNote): RoundNote {
  return detailIsEmpty(v.mode, v.body, v.images) ? blankNote() : { ...v, body: v.body.trim() };
}

export type RoundPlan = {
  round: string;
  state: RoundState;
  /**
   * 응시 기간의 날짜 (YYYY-MM-DD).
   *
   * 회차 목록(lib/admin.ts)의 opensOn·closesOn을 시작값으로 받아 여기서 고친다. 상태와
   * 같은 자리에 두는 까닭은 하나다 — 「언제부터 언제까지 여는가」와 「지금 열려 있는가」는
   * 한 물음의 앞뒤이고, 두 군데에 적어 두면 기간만 늘리고 마감을 안 푸는 날이 온다.
   */
  opensOn: string;
  closesOn: string;
  /**
   * 응시 기간의 시각 (HH:MM) — **날짜와 갈라 든다**.
   *
   * 하루 단위로만 열던 것을 시각까지 잡게 했다. 「8월 31일까지」가 그날 자정까지인지
   * 저녁 여섯 시까지인지를 화면이 말해 주지 않으면, 마감일 오후에 들어온 응시를 받을지
   * 말지를 사람이 그때그때 정하게 된다.
   *
   * 날짜에 붙여 한 문자열(YYYY-MM-DDTHH:mm)로 들지 않는 까닭은 저장된 것 때문이다.
   * 브라우저에 남은 회차와 코드에 박힌 회차 넷(lib/admin.ts)은 전부 날짜만 들고 있고,
   * 그 값을 그대로 읽어야 이미 짜 둔 회차가 화면에서 안 깨진다.
   *
   * ⚠ 없으면 그날 통째로 본다 — 시작 00:00, 마감 23:59(DEFAULT_OPEN_AT · DEFAULT_CLOSE_AT).
   *   09:00~18:00 같은 값을 바닥값으로 두면, 시각을 넣기 전에 만든 회차의 뜻이 조용히
   *   좁아진다. 읽는 자리는 늘 periodOf()를 지난다.
   */
  opensAt?: string;
  closesAt?: string;
  openedAt?: string;
  openedBy?: string;
  closedAt?: string;
  closedBy?: string;
/**
   * 이번 회차가 보는 학년군 — **하나**.
   *
   * 과목보다 먼저 정한다. 학년군은 「누구에게 내보내는가」이고 과목은 「무엇을 재는가」라,
   * 앞엣것이 정해져야 뒤엣것의 문항 재고를 셀 수 있다 — 국어 문항이 열 개 있어도 그것이
   * 전부 3·4학년군이면 5·6학년군 회차에서는 담을 것이 하나도 없다.
   *
   * 한동안 여럿을 담는 배열이었다(bands). 실제 편성은 한 회차가 한 학년군을 본다 —
   * 3·4학년군과 5·6학년군은 응시 기간도 문항 재고도 따로 굴러가고, 둘을 한 회차에 묶으면
   * 제출률·판정 진행이 두 학년군의 평균이 되어 어느 쪽이 밀렸는지가 사라진다.
   *
   * 없으면 3·4학년군으로 본다(코드에 박힌 회차 넷과 옛 저장분). 없는 것을 「아무 학년군도
   * 안 본다」로 읽으면 이미 짜 둔 검사지가 화면에서 통째로 사라진다.
   */
  band?: GradeBand;
  /**
   * 이번 회차에 넣은 평가 과목 — **차례가 곧 응시 차례**다.
   *
   * 배열 순서가 그대로 순서다. 따로 order 번호를 두지 않는다 — 번호를 들면 지우고 넣을
   * 때마다 1,2,4처럼 구멍이 나고, 그 구멍을 메우는 코드가 화면과 저장소 두 군데에 생긴다.
   *
   * 없으면 세 과목 전부. 칸(과목 × 학년군)은 이 목록과 bands를 곱해서 만든다(slotsFor).
   */
  subjects?: ItemDraft["subject"][];
  /**
   * 여기서 만든 회차의 이름·대상.
   *
   * 코드에 박힌 회차 넷(lib/admin.ts rounds)은 이 값이 없다. 있으면 그것이 사람이
   * 만든 회차라는 뜻이고, 목록은 둘을 합쳐 낸다(allRounds).
   */
  made?: { label: string; target: number; createdAt: string; createdBy: string };
  /**
   * 이 회차에만 붙는 공지와 유의사항.
   *
   * 검사 전체의 유의사항(lib/exam.ts)과 다르다. 저쪽은 회차가 바뀌어도 같은 말이고
   * 이쪽은 「이번 회차는 서술형 첨부 제출을 30분 더 받습니다」처럼 그 회차에서만 참인
   * 말이다. 한 칸에 담으면 회차마다 검사 전체 유의사항을 다시 적게 된다.
   *
   * 회차를 만들 때 적고, 편성 화면에서 고친다 — 만들 때만 적을 수 있으면 오탈자 하나에
   * 회차를 다시 만들어야 한다.
   */
  notice?: RoundNote;
  caution?: RoundNote;
  log: PlanLog[];
};

export type Plans = Record<string, RoundPlan>;

/* 시각을 안 적은 회차는 그날 통째로 본다. 바닥값을 여기 한 곳에만 둔다 —
   화면과 저장소가 각자 09:00을 적어 두면 둘이 갈리는 날이 온다 */
export const DEFAULT_OPEN_AT = "00:00";
export const DEFAULT_CLOSE_AT = "23:59";

/* 씨앗은 lib/admin.ts의 회차 목록이다. 상태를 두 군데 적어 두면 한쪽만 고쳐지는
   날이 반드시 온다 — 여기서는 회차 목록의 상태와 기간을 시작값으로만 받아 쓴다. */
const SEED: Plans = Object.fromEntries(
  rounds.map((r): [string, RoundPlan] => [
    r.id,
    {
      round: r.id,
      state: r.state,
      opensOn: r.opensOn,
      closesOn: r.closesOn,
      opensAt: DEFAULT_OPEN_AT,
      closesAt: DEFAULT_CLOSE_AT,
      log: [],
    },
  ]),
);

const KEY = "genixx.roundplan";
const EVENT = "genixx:roundplan-change";

let cacheRaw: string | null = null;
let cacheValue: Plans = SEED;

function read(): Plans {
  if (typeof window === "undefined") return SEED;
  const raw = window.localStorage.getItem(KEY);
  if (raw === cacheRaw) return cacheValue;
  cacheRaw = raw;
  try {
    /* 씨앗 위에 덮는다 — 뒤에 회차가 늘어나도 옛 저장분이 그 회차를 빠뜨리지 않는다 */
    cacheValue = raw ? { ...SEED, ...(JSON.parse(raw) as Plans) } : SEED;
  } catch {
    cacheValue = SEED;
  }
  return cacheValue;
}

function write(next: Plans) {
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

export function usePlans(): Plans {
  return useSyncExternalStore(subscribe, read, () => SEED);
}

/**
 * 저장분이 없거나 낡았을 때 기대는 바닥값.
 *
 * 브라우저에 남아 있는 옛 저장분에는 기간 칸이 없다. 없는 채로 화면에 흘리면 날짜
 * 입력이 빈 값으로 서고, 저장하는 순간 회차 기간이 지워진다. 회차 목록의 값을 먼저
 * 깔고 저장분을 그 위에 덮는다.
 */
function blankPlan(roundId: string): RoundPlan {
  const r = rounds.find((x) => x.id === roundId);
  return {
    round: roundId,
    state: r?.state ?? "draft",
    opensOn: r?.opensOn ?? "",
    closesOn: r?.closesOn ?? "",
    opensAt: DEFAULT_OPEN_AT,
    closesAt: DEFAULT_CLOSE_AT,
    log: [],
  };
}

export function planOf(plans: Plans, roundId: string): RoundPlan {
  const saved = plans[roundId];
  return saved ? { ...blankPlan(roundId), ...saved } : blankPlan(roundId);
}

/**
 * 사람이 「지금」이라고 부르는 회차.
 *
 * 열려 있는 회차이고, 없으면(전부 마감했거나 아직 안 열었으면) 회차 목록이 정한 것으로
 * 물러선다. 화면마다 이 셈을 따로 적어 두었더니 대시보드 머리는 4회차, 그 아래 제출률은
 * 3회차를 말하는 일이 생겼다.
 */
export function useCurrentRound() {
  const plans = usePlans();
  return rounds.find((r) => planOf(plans, r.id).state === "open") ?? currentRound;
}

/** 응시 기간 네 칸 — 날짜 둘과 시각 둘을 늘 한 덩이로 옮긴다 */
export type Period = {
  opensOn: string;
  opensAt: string;
  closesOn: string;
  closesAt: string;
};

/** 저장분에서 기간을 꺼낸다 — 시각이 없는 옛 회차는 여기서 바닥값을 입는다 */
export function periodOf(plan: RoundPlan): Period {
  return {
    opensOn: plan.opensOn,
    opensAt: plan.opensAt || DEFAULT_OPEN_AT,
    closesOn: plan.closesOn,
    closesAt: plan.closesAt || DEFAULT_CLOSE_AT,
  };
}

/**
 * 견주기 위한 한 문자열 — "2026-08-31 23:59".
 *
 * 날짜와 시각을 이 차례로 붙이면 글자 크기 비교가 곧 시간 비교가 된다(둘 다 0으로
 * 자리를 채우는 꼴이라). Date로 파싱하지 않는 까닭은 시간대다 — 브라우저가 어디에
 * 있든 관리자가 적어 넣은 「18:00」은 같은 18:00이어야 한다.
 */
export const stampOf = (day: string, time: string) => `${day} ${time}`;

/** 사람이 읽는 기간 한 줄 */
export function periodText(plan: RoundPlan) {
  const p = periodOf(plan);
  if (!p.opensOn || !p.closesOn) return "기간 미정";
  return `${p.opensOn.replace(/-/g, ".")} ${p.opensAt} – ${p.closesOn.replace(/-/g, ".")} ${p.closesAt}`;
}

/**
 * 기간이 말이 되는가 — 저장 전에 본다.
 *
 * 오늘 날짜와 견주지 않는다. 지난 회차의 기간을 뒤늦게 바로잡는 일이 실제로 있고,
 * 「어제보다 앞이다」로 막으면 그 수정을 화면이 가로막는다. 여기서 보는 것은 네
 * 값끼리의 앞뒤와 꼴뿐이다.
 *
 * 마감이 시작과 **같은 것도 막는다**. 길이가 0인 기간은 열어도 아무도 못 들어온다.
 */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function checkPeriod(p: Period): string[] {
  const out: string[] = [];
  if (!DATE_RE.test(p.opensOn)) out.push("시작일을 YYYY-MM-DD로 적어 주세요");
  if (!TIME_RE.test(p.opensAt)) out.push("시작 시각을 HH:MM으로 적어 주세요");
  if (!DATE_RE.test(p.closesOn)) out.push("마감일을 YYYY-MM-DD로 적어 주세요");
  if (!TIME_RE.test(p.closesAt)) out.push("마감 시각을 HH:MM으로 적어 주세요");
  if (out.length === 0 && stampOf(p.closesOn, p.closesAt) <= stampOf(p.opensOn, p.opensAt)) {
    out.push("마감이 시작보다 앞이거나 같습니다");
  }
  return out;
}

/* ───────────────────────── 편성판 ───────────────────────── */

export const planSubjects: ItemDraft["subject"][] = ["국어", "수학", "과학"];

/** 과목 × 학년군 한 칸의 열쇠. 화면과 저장소가 같은 글자를 써야 칸이 어긋나지 않는다 */
export const slotKey = (subject: ItemDraft["subject"], band: GradeBand) => `${subject}:${band}`;

/** 새 회차의 기본 학년군 */
export const defaultBand: GradeBand = gradeBands[0].id;

/** 여섯 칸 전부 — band·subjects가 없는 옛 회차가 보는 값 */
export const allSlotKeys = planSubjects.flatMap((s) => gradeBands.map((g) => slotKey(s, g.id)));

/** 이 회차가 보는 학년군. 없으면 3·4학년군 */
export const bandFor = (plan: RoundPlan): GradeBand => plan.band ?? defaultBand;

/**
 * 이 회차에 넣은 과목 — **넣은 차례 그대로**. 칸이 아예 없으면(옛 회차) 세 과목 전부.
 *
 * ⚠ 빈 배열과 없음을 가른다. `?.length`로 보던 때는 **과목을 전부 뺀 회차가 세 과목을
 *   보는 회차로 되읽혔다** — 저장해도 화면이 「고친 것이 남았다」에서 내려오지 않고,
 *   저장을 누를 때마다 「편성을 정했습니다 — 과목 없음」이 기록에 한 줄씩 쌓였다.
 *   전부 뺀 회차는 열 수 없지만(여는 관문이 막는다) 그것과 이것은 다른 이야기다.
 */
export const subjectsFor = (plan: RoundPlan): ItemDraft["subject"][] =>
  plan.subjects ? plan.subjects.filter((s) => planSubjects.includes(s)) : planSubjects;

/**
 * 이 회차가 보는 칸 = 과목 × 학년군.
 *
 * 과목 차례를 바깥에 둔다. 「국어 3·4 → 국어 5·6 → 수학 3·4 …」로 서야 응시 차례대로
 * 읽히고, 학년군을 바깥에 두면 같은 과목이 표에서 갈라져 선다.
 */
export function slotsFor(plan: RoundPlan): string[] {
  const band = bandFor(plan);
  return subjectsFor(plan).map((s) => slotKey(s, band));
}

export type PlanSlot = {
  /** 과목:학년군 — 화면에서 어느 칸을 열었는지 붙들어 두는 열쇠 */
  key: string;
  subject: ItemDraft["subject"];
  band: GradeBand;
  label: string;
  /**
   * 여럿을 이어 붙일 때 쓰는 짧은 이름 — 「국어 3·4」.
   *
   * 점검 문구는 어긋난 칸을 모두 부른다. 「국어 · 초등 3·4학년군」을 여섯 번 이으면
   * 한 줄이 세 줄이 되고, 그 안에서 어느 칸이 걸렸는지 도로 찾아 읽어야 한다.
   */
  short: string;
  form: ExamForm | null;
  /** 담긴 문항 (출제 순서대로) */
  picked: ItemDraft[];
  /** 아직 안 담긴, 담을 수 있는 승인 문항 수 */
  pool: number;
};

/**
 * 이 회차의 여섯 칸.
 *
 * 검사지가 없는 칸도 빼지 않고 낸다. 「없는 것」이 안 보이면 관리자는 짜야 할 칸이
 * 남았다는 사실을 회차를 열려다가 처음 알게 된다.
 */
export function slotsOf(
  roundId: string,
  forms: ExamForm[],
  items: ItemDraft[],
  /* 이 회차가 보는 칸. 넘기지 않으면 여섯 칸 전부 — 부르는 쪽이 plan을 안 들고 있을 때다 */
  only: string[] = allSlotKeys,
): PlanSlot[] {
  /* **넘겨받은 차례 그대로** 낸다. 한동안 planSubjects(국어·수학·과학)를 돌면서 걸러 냈는데,
     그러면 회차에서 정한 과목 차례가 편성판에서 무시된다 — 수학을 첫 과목으로 올려 두고
     돌아왔더니 국어가 여전히 맨 위였다. 차례를 정하게 해 놓고 그 차례로 안 그리면
     정하는 일 자체가 뜻을 잃는다. */
  return only.flatMap((key): PlanSlot[] => {
    const [subject, band] = key.split(":") as [ItemDraft["subject"], GradeBand];
    const g = gradeBands.find((x) => x.id === band);
    if (!g) return [];
    const form =
      forms.find((f) => f.round === roundId && f.subject === subject && f.band === band) ?? null;
    return [
      {
        key,
        subject,
        band,
        label: `${subject} · ${g.label}`,
        short: `${subject} ${band.replace("-", "·")}`,
        form,
        picked: form ? formItems(form, items) : [],
        pool: items.filter(
          (i) =>
            i.state === "approved" &&
            i.subject === subject &&
            i.band === band &&
            !form?.itemIds.includes(i.id),
        ).length,
      },
    ];
  });
}

/* ───────────────────────── 회차 만들기 ─────────────────────────
   코드에 박힌 회차 넷(lib/admin.ts rounds)에 여기서 만든 것을 잇는다. 저쪽을 고치지
   않는 까닭은 그 배열을 아홉 군데가 읽고 있어서다 — 목록을 합치는 자리를 하나로 두고,
   화면은 그 하나만 부른다. */

/** 코드에 박힌 넷 + 여기서 만든 것. 최신 회차가 앞에 온다 */
export function allRounds(plans: Plans): Round[] {
  const made = Object.values(plans)
    .filter((p) => p.made)
    .map(
      (p): Round => ({
        id: p.round,
        label: p.made!.label,
        period: `${p.opensOn.replace(/-/g, ".")} – ${p.closesOn.slice(5).replace("-", ".")}`,
        opensOn: p.opensOn,
        closesOn: p.closesOn,
        state: p.state,
        target: p.made!.target,
        /* 아직 아무도 안 본 회차다. 제출·채점·발행을 0이 아닌 값으로 두면 목록의
           제출률이 만들자마자 채워져 있다 */
        submitted: 0,
        graded: 0,
        published: 0,
      }),
    );
  return [...made, ...rounds].sort((a, b) => b.opensOn.localeCompare(a.opensOn));
}

export function useRounds(): Round[] {
  const plans = usePlans();
  return useMemo(() => allRounds(plans), [plans]);
}

/** 새 회차 번호 — 만든 해와 그 해에 몇 번째인지로 짓는다 */
function nextRoundId(plans: Plans, year: string) {
  const mine = Object.keys(plans).filter((id) => id.startsWith(`${year}-`));
  const used = new Set([...rounds.map((r) => r.id), ...Object.keys(plans)]);
  let n = mine.length + rounds.filter((r) => r.id.startsWith(`${year}-`)).length + 1;
  while (used.has(`${year}-${n}`)) n += 1;
  return `${year}-${n}`;
}

/**
 * 회차를 만든다.
 *
 * 준비중으로 들어간다. 만들자마자 여는 길은 두지 않는다 — 검사지가 한 벌도 없는 회차를
 * 열면 응시자가 빈 시험지를 받는다. 여는 것은 편성 화면의 관문을 지나야 한다.
 */
export function createRound(
  input: {
    label: string;
    opensOn: string;
    opensAt: string;
    closesOn: string;
    closesAt: string;
    target: number;
    band: GradeBand;
    subjects: ItemDraft["subject"][];
    notice?: RoundNote;
    caution?: RoundNote;
  },
  by: string,
): string {
  const cur = read();
  const id = nextRoundId(cur, input.opensOn.slice(0, 4));
  const at = now();
  write({
    ...cur,
    [id]: {
      round: id,
      state: "draft",
      opensOn: input.opensOn,
      opensAt: input.opensAt,
      closesOn: input.closesOn,
      closesAt: input.closesAt,
      band: input.band,
      subjects: input.subjects,
      notice: input.notice,
      caution: input.caution,
      made: { label: input.label.trim(), target: input.target, createdAt: at, createdBy: by },
      log: [
        {
          at,
          by,
          action: "period",
          text: `회차를 만들었습니다 — ${input.subjects.join(" · ")} · ${input.band}학년군`,
        },
      ],
    },
  });
  return id;
}

/**
 * 회차 공지·유의사항을 고친다.
 *
 * 기록을 남기지 않는다. 회차를 열고 닫는 일과 달리 이것은 글을 다듬는 일이고, 오탈자를
 * 고칠 때마다 회차 기록에 한 줄이 쌓이면 정작 개폐 이력이 그 사이에 묻힌다.
 */
export function setRoundNotes(roundId: string, notes: { notice: RoundNote; caution: RoundNote }) {
  /* 빈 것은 아예 담지 않는다 — 빈 덩이를 담아 두면 「공지가 있다」로 읽는 화면이 생긴다.
     담는 값은 canonNote와 같은 규칙을 지난다(위 주석) */
  const keep = (v: RoundNote) =>
    detailIsEmpty(v.mode, v.body, v.images) ? undefined : canonNote(v);
  const cur = read();
  const plan = cur[roundId] ?? blankPlan(roundId);
  write({
    ...cur,
    [roundId]: { ...plan, notice: keep(notes.notice), caution: keep(notes.caution) },
  });
}

/**
 * 이 회차가 볼 칸을 다시 정한다.
 *
 * 이미 문항이 담긴 칸을 끄는 것은 막지 않는다. 대신 그 칸의 검사지는 지우지 않고 그대로
 * 둔다 — 껐다가 다시 켜면 짜 두었던 것이 돌아와야 하고, 무엇보다 「칸을 껐더니 열 문항이
 * 사라졌다」는 되돌릴 수 없는 일이다. 화면이 끄기 전에 담긴 수를 알려 준다.
 */
export function setRoundPlan(
  roundId: string,
  next: { band: GradeBand; subjects: ItemDraft["subject"][] },
  by: string,
) {
  const cur = read();
  const plan = cur[roundId] ?? blankPlan(roundId);
  /* 새 기록이 앞에 온다 — 이 파일의 patch()와 같은 차례여야 편성 이력이 뒤섞이지 않는다 */
  write({
    ...cur,
    [roundId]: {
      ...plan,
      band: next.band,
      subjects: next.subjects,
      log: [
        {
          at: now(),
          by,
          action: "period" as const,
          text: `편성을 정했습니다 — ${next.subjects.join(" · ") || "과목 없음"} · ${next.band}학년군`,
        },
        ...plan.log,
      ].slice(0, 40),
    },
  });
}

/* ───────────────────────── 여는 관문 ───────────────────────── */

export type PlanCheck = { tone: "block" | "warn"; text: string };

/**
 * 회차를 열기 전에 대조한다.
 *
 * block은 막는 것이고 warn은 사람이 보고 그대로 갈 수 있는 것이다. 파일럿 회차는
 * 과목 하나만 보는 일이 실제로 있으므로, 「빈 칸이 있다」로 회차를 못 열게 하면
 * 화면이 현실을 막는 셈이 된다.
 */
export function openChecks(roundId: string, slots: PlanSlot[], plans: Plans): PlanCheck[] {
  const out: PlanCheck[] = [];

  /* 기간부터 본다. 기간이 비뚤어진 채로 열면 응시 화면이 「오늘은 응시 기간이
     아닙니다」를 띄우고, 관리자는 회차를 열었는데 아무도 못 들어오는 상태가 된다. */
  const plan = planOf(plans, roundId);
  const period = checkPeriod(periodOf(plan));
  if (period.length > 0) {
    out.push({ tone: "block", text: `응시 기간을 먼저 정해 주세요 — ${period.join(" · ")}` });
  }

  const built = slots.filter((s) => s.form);
  if (built.length === 0) {
    out.push({
      tone: "block",
      text: "편성한 검사지가 하나도 없습니다. 적어도 한 칸은 짜야 회차를 열 수 있습니다.",
    });
  }

  const unconfirmed = slots.filter((s) => s.form && s.form.state !== "confirmed");
  if (unconfirmed.length > 0) {
    out.push({
      tone: "block",
      text: `아직 확정하지 않은 검사지가 ${unconfirmed.length}벌 있습니다 — ${unconfirmed
        .map((s) => s.short)
        .join(" · ")}`,
    });
  }

  /* 두 회차가 함께 열려 있으면 응시자가 어느 회차를 푸는지 정해지지 않는다 */
  const other = rounds.find((r) => r.id !== roundId && planOf(plans, r.id).state === "open");
  if (other) {
    out.push({
      tone: "block",
      text: `${other.label}가 아직 열려 있습니다. 먼저 그 회차의 응시를 마감해 주세요.`,
    });
  }

  /* 하나도 짜지 않은 회차에는 적지 않는다 — 위의 막는 줄과 같은 말이 된다 */
  const empty = slots.filter((s) => !s.form);
  if (empty.length > 0 && built.length > 0) {
    out.push({
      tone: "warn",
      text: `비워 둔 칸 ${empty.length}개(${empty
        .map((s) => s.short)
        .join(" · ")})는 이 회차에 응시하지 않습니다.`,
    });
  }

  return out;
}

/* ───────────────────────── 상태를 옮긴다 ───────────────────────── */

function now() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function patch(id: string, change: Partial<RoundPlan>, entry: Omit<PlanLog, "at">) {
  const cur = read();
  const before = planOf(cur, id);
  write({
    ...cur,
    [id]: { ...before, ...change, log: [{ ...entry, at: now() }, ...before.log].slice(0, 40) },
  });
}

export function openRound(id: string, by: string, text: string) {
  patch(id, { state: "open", openedAt: now(), openedBy: by }, { by, action: "open", text });
}

export function closeRound(id: string, by: string, text: string) {
  patch(id, { state: "grading", closedAt: now(), closedBy: by }, { by, action: "close", text });
}

export function finishRound(id: string, by: string, text: string) {
  patch(id, { state: "closed" }, { by, action: "finish", text });
}

/**
 * 응시 기간을 고친다.
 *
 * 열려 있는 회차의 마감일을 미루는 것(연장)은 실제로 하는 일이라 상태로 막지 않는다.
 * 대신 무엇을 무엇으로 바꿨는지를 기록에 그대로 적는다 — 기간이 바뀐 회차의 결과를
 * 뒤에 견줄 때, 「그때 열흘 늘렸다」가 남아 있어야 제출률 차이를 설명할 수 있다.
 */
export function setPeriod(id: string, next: Period, by: string, why: string) {
  if (checkPeriod(next).length > 0) return;
  const before = periodOf(planOf(read(), id));
  /* 무엇이 무엇으로 바뀌었는지를 날짜·시각 한 덩이로 적는다. 「마감 2026-08-31 →
     2026-08-31」처럼 날짜만 적으면 시각만 늘린 연장이 기록에서 사라진다 */
  const moved = (a: string, b: string) => (a ? a : "없음") + " → " + b;
  const changed = [
    before.opensOn !== next.opensOn || before.opensAt !== next.opensAt
      ? `시작 ${moved(before.opensOn && stampOf(before.opensOn, before.opensAt), stampOf(next.opensOn, next.opensAt))}`
      : "",
    before.closesOn !== next.closesOn || before.closesAt !== next.closesAt
      ? `마감 ${moved(before.closesOn && stampOf(before.closesOn, before.closesAt), stampOf(next.closesOn, next.closesAt))}`
      : "",
  ].filter(Boolean);
  if (changed.length === 0) return;
  patch(
    id,
    {
      opensOn: next.opensOn,
      opensAt: next.opensAt,
      closesOn: next.closesOn,
      closesAt: next.closesAt,
    },
    { by, action: "period", text: why ? `${changed.join(" · ")} — ${why}` : changed.join(" · ") },
  );
}

/** 마감을 되돌린다 — 마감 시각을 지우되 되돌린 사실은 기록에 남는다 */
export function reopenRound(id: string, by: string, text: string) {
  patch(
    id,
    { state: "open", closedAt: undefined, closedBy: undefined },
    { by, action: "reopen", text },
  );
}
