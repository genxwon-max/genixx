"use client";

import { useSyncExternalStore } from "react";
import { detailIsEmpty, type DetailMode } from "./richText";

/**
 * 사람에게 보여 주는 글 — 공지 · 자주 묻는 질문.
 *
 * 여태 이 글들은 화면 파일 안에 박혀 있었다(components/site/HomeFaq.tsx ·
 * app/(site)/support/faq/page.tsx). 그러면 오탈자 하나를 고치는 데도 배포가 필요하고,
 * 무엇보다 **운영자가 손댈 수 있는 글이 아니게 된다.** 회차 공지는 이미 회차마다
 * 고칠 수 있는데(lib/roundPlanStore.ts) 사이트 공지와 FAQ만 코드에 박혀 있는 것은
 * 앞뒤가 안 맞는다.
 *
 * 여기로 옮기고, 콘솔의 「콘텐츠」 그룹이 이 값을 고친다. 공개 화면은 이 저장소를 읽는다.
 *
 * ── 씨앗이 곧 지금 화면의 글이다 ──
 * 아래 목록은 옮겨 오기 전 화면에 있던 글 그대로다. 브라우저에 저장분이 없으면 이 값이
 * 그대로 나가므로, 옮기는 동안 공개 화면의 글이 한 글자도 바뀌지 않는다.
 *
 * ⚠ 브라우저 저장소에만 남는다(다른 콘솔 저장소와 같다). 붙일 때는 콘텐츠 API로 갈아
 *   끼우고, 서버 렌더가 첫 화면을 그리도록 옮긴다 — 지금은 서버가 씨앗을 그리고
 *   브라우저가 저장분으로 덮는다(useSyncExternalStore의 서버 스냅숏).
 */

/* ───────────────────────── 글 한 덩이 ───────────────────────── */

/**
 * 갈래를 가진 글 — 문항 지문·회차 공지와 **같은 꼴**이다(components/admin2/BodyEditor.tsx).
 *
 * 콘솔에서 글을 받는 자리가 셋(문항·회차·콘텐츠)인데 셋이 다른 꼴을 쓰면 편집기도 셋이
 * 되고, 한쪽에만 미리보기가 붙는 날이 온다.
 */
export type RichText = { mode: DetailMode; body: string; images: string[] };

export const blankRich = (): RichText => ({ mode: "text", body: "", images: [] });

/** 글만 문자열로 든 옛 값도 읽어 준다 */
export function richOf(v: RichText | string | undefined): RichText {
  if (!v) return blankRich();
  if (typeof v === "string") return { mode: "text", body: v, images: [] };
  return { mode: v.mode ?? "text", body: v.body ?? "", images: v.images ?? [] };
}

/**
 * 저장할 꼴로 다듬는다 — **저장한 뒤에 읽어 오는 값과 같아야 한다.**
 *
 * 화면이 든 초안과 저장분을 견주어 「고친 것이 남았는가」를 셈하므로, 저장할 때 조용히
 * 다듬으면 그 둘이 영영 어긋난다(lib/roundPlanStore.ts의 canonNote와 같은 까닭).
 */
export const canonRich = (v: RichText): RichText => ({ ...v, body: v.body.trim() });

export const richIsEmpty = (v: RichText) => detailIsEmpty(v.mode, v.body, v.images);

/* ───────────────────────── 공지 ───────────────────────── */

export type Notice = {
  id: string;
  title: string;
  /** 게시일 (YYYY-MM-DD) — 목록의 차례를 정하는 값이다 */
  postedOn: string;
  /**
   * 공개 화면에 내보내는가.
   *
   * 지우는 것과 가르는 까닭 — 다 쓴 공지를 지우면 그때 무슨 안내가 나갔는지가 사라진다.
   * 내려 두면 목록에는 남고 사람 눈에는 안 보인다.
   */
  shown: boolean;
  /** 목록 맨 위에 붙인다 — 회차 모집처럼 기간 내내 보여야 하는 것 */
  pinned: boolean;
  /**
   * 사이트를 열자마자 판으로 띄울 것인가.
   *
   * 목록에 올려 두는 것과 눈앞에 띄우는 것은 다른 일이다. 점검 안내처럼 **모르고 지나가면
   * 곤란한 것**만 띄운다 — 공지마다 띄우면 사람이 판을 닫는 손버릇부터 익히고, 정작
   * 띄워야 할 때 그것도 같이 닫힌다.
   *
   * 띄우려면 노출도 켜져 있어야 한다(내려 둔 공지가 판으로 뜨면 앞뒤가 안 맞는다).
   */
  popup: boolean;
  /**
   * 판의 차림 — 띄우는 까닭이 둘이라 틀도 둘이다.
   *
   *   notice  점검·중단처럼 **읽어야 하는 말**. 「공지사항」 머리띠에 제목·게시일·본문
   *   event   모집·행사처럼 **보여 주고 부르는 것**. 머리띠 없이 그림이 판을 꽉 채우고
   *           아래에 누를 단추가 선다
   *
   * 이벤트 안내를 「공지사항」 머리띠에 넣으면 그림은 좁은 틀 안에 갇히고, 정작 눌러야
   * 할 곳이 본문 속 링크 한 줄로 묻힌다. 반대로 점검 안내를 포스터로 띄우면 무슨 말인지
   * 읽기 전에 닫힌다.
   */
  popupKind: PopupKind;
  /** 이벤트 판 아래 단추가 갈 곳 — 비우면 단추를 세우지 않는다 */
  popupLink: string;
  /** 그 단추에 적을 말 — 비우면 「자세히 보기」 */
  popupLinkLabel: string;
  body: RichText;
};

export type PopupKind = "notice" | "event";

export const popupKinds: { id: PopupKind; label: string; hint: string }[] = [
  { id: "notice", label: "안내", hint: "「공지사항」 머리띠에 제목·게시일·본문. 점검·중단처럼 읽어야 하는 말." },
  { id: "event", label: "이벤트", hint: "그림이 판을 꽉 채우고 아래에 누를 단추. 모집·행사처럼 보여 주고 부르는 것." },
];

/* ───────────────────────── 자주 묻는 질문 ───────────────────────── */

/** 답변 화면이 이 차례로 묶어 낸다. 목록에 없는 분류를 쓰면 맨 뒤에 선다 */
export const faqGroups = ["진단", "응시", "결과 해석", "개인정보", "결제"];

export type Faq = {
  id: string;
  group: string;
  q: string;
  a: RichText;
  shown: boolean;
  /**
   * 홈에도 세우는가.
   *
   * 홈과 고객지원이 각자 제 목록을 들고 있었다. 같은 질문이 두 곳에 다른 말로 적혀 있어
   * 한쪽만 고쳐지는 날이 오고, 겹치는 여섯 개는 실제로 답이 서로 달랐다. 목록을 하나로
   * 합치고 「홈에도 보이는가」만 켜고 끈다 — 홈은 먼저 걸리는 것 열 개, 고객지원은 전부.
   */
  home: boolean;
};

/* ───────────────────────── 씨앗 ───────────────────────── */

const NOTICE_SEED: { title: string; postedOn: string; pinned: boolean; popup?: boolean; body: string }[] = [
  {
    title: "2026 파일럿 3회차 응시 안내",
    postedOn: "2026-07-28",
    pinned: true,
    body: "2026 파일럿 3회차는 8월 1일부터 8월 31일까지 열립니다. 국어·수학·과학 세 과목을 각각 따로 응시하며, 한 과목은 40분입니다. 세 과목을 모두 제출해야 결과 분석이 시작됩니다.",
  },
  {
    title: "파일럿 회차는 전면 무료입니다",
    postedOn: "2026-07-20",
    pinned: true,
    body: "가입과 응시에 결제 정보를 받지 않습니다. 카드번호나 계좌를 요구하는 안내를 받으셨다면 저희가 보낸 것이 아닙니다. 정식 서비스 요금은 파일럿이 끝난 뒤 요금 안내에 올립니다.",
  },
  {
    title: "8월 12일 오전 시스템 점검",
    postedOn: "2026-08-05",
    pinned: false,
    /* 모르고 들어왔다가 응시 화면이 안 열리는 일을 막는 안내라 판으로 띄운다 */
    popup: true,
    body: "8월 12일 오전 2시부터 4시까지 응시 화면이 열리지 않습니다. 점검 중 제출된 답안은 없으며, 점검 뒤에는 이어서 응시할 수 있습니다.",
  },
];

/** 옮겨 오기 전 자주 묻는 질문 화면(PUB-06-1)에 있던 글 그대로다 */
const FAQ_SEED: { group: string; q: string; a: string; home: boolean }[] = [
  { group: "진단", q: "학력진단과 재능진단은 뭐가 다른가요?", a: "학력진단은 지금 교과 내용을 어디까지 이해하고 있는지를 봅니다. 재능진단은 어떤 조건에서 몰입하고 어떤 방식으로 문제를 다루는지를 봅니다. GENIXX는 이 둘을 별개의 축으로 두고 교차해서 보기 때문에, 성적이 높지 않아도 특정 재능 축이 뚜렷하게 나타나는 경우를 놓치지 않습니다.", home: true },
  { group: "진단", q: "몇 학년부터 볼 수 있나요?", a: "2026 파일럿 회차는 초등 3~4학년을 대상으로 합니다. 이후 학년은 문항 이독성 검증을 마친 뒤 순차적으로 확대합니다.", home: false },
  { group: "진단", q: "결과에 등급이나 순위가 나오나요?", a: "아닙니다. A·B·C 같은 명사형 등급은 쓰지 않습니다. 또래와 줄을 세우는 대신 해당 발달 단계의 상한 대비 지금 어디쯤인지, 그리고 실제로 관찰된 행동이 무엇인지를 서술형으로 제시합니다. 이 원칙은 진단 윤리 헌장에 문서로 공개되어 있습니다.", home: true },
  { group: "진단", q: "AI가 아이를 판정하는 건가요?", a: "AI는 판정하지 않습니다. AI가 지필·설문·면담 데이터를 1차로 분석해 제안값을 만들고, 교육전문가가 케이스 회의에서 이를 검토해 확정합니다. 전문가 승인 전에는 어떤 결과도 학부모 화면에 노출되지 않으며, 판정 컷 경계에 있는 사례는 확정하지 않고 다음 회차 재관찰로 넘깁니다.", home: true },
  { group: "응시", q: "한 번에 다 봐야 하나요?", a: "아닙니다. 본검사(세션 1)와 소개·설문(세션 2)은 별도 접속으로 나누어 진행합니다. 연속으로 보면 70분이 넘어 집중도가 떨어지기 때문입니다.", home: false },
  { group: "응시", q: "중간에 인터넷이 끊기면요?", a: "응답은 자동 저장되며 재접속 시 이어서 진행할 수 있습니다. 남은 시간은 서버 기준으로 관리됩니다.", home: false },
  { group: "응시", q: "부모가 옆에서 도와줘도 되나요?", a: "본검사 중에는 개입할 수 없습니다. 아이가 스스로 답한 내용이어야 해석이 가능하기 때문입니다. 대신 학부모 설문에서 가정에서 관찰한 모습을 충분히 적어 주시면, 검사만으로는 보이지 않는 부분을 보완할 수 있습니다.", home: true },
  { group: "응시", q: "포기하면 어떻게 되나요?", a: "해당 회차의 응시 기회가 소모되고 지금까지의 답안은 저장되지 않습니다. 남은 기회가 있으면 다시 응시할 수 있습니다.", home: false },
  { group: "응시", q: "아이가 검사받는 데 시간이 얼마나 걸리나요?", a: "국어(언어)·수학·과학을 한 번에 몰아 보지 않고 과목별로 따로 응시합니다. 한 과목은 4문항에 제한 시간 40분이며, 하루에 한 과목씩 나눠 봐도 됩니다. 세 과목을 모두 제출해야 결과 분석이 시작됩니다.", home: true },
  { group: "응시", q: "학부모 설문을 꼭 해야 하나요?", a: "필수는 아닙니다. 응시 기록 화면에서 '학부모 설문 없이 검사 진행'을 선택하면 학생 응답만으로 분석합니다. 다만 리포트의 '발견의 순간'처럼 보호자 관찰을 바탕으로 하는 항목은 제공되지 않습니다.", home: true },
  { group: "응시", q: "아이도 따로 계정을 만들어야 하나요?", a: "만 14세를 기준으로 갈립니다. 만 14세 이상이면 학생이 직접 가입해 본인 동의로 응시할 수 있습니다. 만 14세 미만이면 학생 혼자서는 가입을 끝낼 수 없고(가입 불가가 아니라 단독가입 불가입니다), 법정대리인의 동의가 확인되면 프로필이 열립니다. 그때는 학부모·기관이 발급한 8자리 접속코드와 생년월일로 들어갑니다. 어느 쪽이든 학생 화면에서는 결제 정보나 형제자매의 결과가 보이지 않습니다.", home: true },
  { group: "결과 해석", q: "점수가 낮게 나온 영역은 우리 아이의 약점인가요?", a: "아닙니다. 낮게 나온 영역은 '없는 재능'이 아니라 '아직 발현되지 않은 영역'으로 표기합니다. 그 영역을 만날 기회가 적었을 수도 있고, 지금 발달 단계에서는 드러나기 어려울 수도 있습니다. 리포트에도 같은 문구가 그대로 들어갑니다.", home: true },
  { group: "결과 해석", q: "결과는 언제 나오나요?", a: "AI 1차 분석에 1~2일, 이후 전문가 협진 판정과 리포트 승인을 거칩니다. 승인 전에는 어떤 결과도 공개되지 않습니다.", home: false },
  { group: "개인정보", q: "아이의 답변은 누가 보게 되나요?", a: "보호자, 그리고 채점·판정에 참여하는 전문가만 열람합니다. 개인정보 열람 시에는 사유 입력이 강제되고 누가 언제 무엇을 봤는지 전건이 감사 로그로 남습니다. 동의를 철회하시면 즉시 파기 절차에 들어가고 처리 결과를 통지해 드립니다.", home: true },
  { group: "개인정보", q: "동의를 철회하면 데이터는 어떻게 되나요?", a: "철회 요청 즉시 파기 큐에 등록되고, 처리 결과를 통지해 드립니다.", home: false },
  { group: "결제", q: "무료 학력진단은 정말 아무 비용 없이 볼 수 있나요?", a: "네. 2026 파일럿 회차는 전면 무료입니다. 결제 수단을 등록하지 않아도 되고, 진단이 끝난 뒤 자동으로 유료로 전환되는 구조도 없습니다. 정식 서비스 요금은 파일럿이 끝난 뒤 별도로 공지합니다.", home: true },
  { group: "결제", q: "환불은 어떻게 하나요?", a: "리포트 발행 전에는 전액 환불됩니다. 발행 후에는 디지털 콘텐츠 제공이 완료된 것으로 보아 환불이 제한됩니다.", home: false },
];

export type Content = { notices: Notice[]; faqs: Faq[] };

const SEED: Content = {
  notices: NOTICE_SEED.map((s, i) => ({
    id: `NT-${String(i + 1).padStart(3, "0")}`,
    title: s.title,
    postedOn: s.postedOn,
    shown: true,
    pinned: s.pinned,
    popup: !!s.popup,
    popupKind: "notice",
    popupLink: "",
    popupLinkLabel: "",
    body: { mode: "text", body: s.body, images: [] },
  })),
  faqs: FAQ_SEED.map((s, i) => ({
    id: `FQ-${String(i + 1).padStart(3, "0")}`,
    group: s.group,
    q: s.q,
    a: { mode: "text", body: s.a, images: [] },
    shown: true,
    home: s.home,
  })),
};

/* ───────────────────────── 저장소 ───────────────────────── */

const KEY = "genixx.content";
const EVENT = "genixx:content-change";

let cacheRaw: string | null = null;
let cacheValue: Content = SEED;

function read(): Content {
  if (typeof window === "undefined") return SEED;
  const raw = window.localStorage.getItem(KEY);
  if (raw === cacheRaw) return cacheValue;
  cacheRaw = raw;
  try {
    const saved = raw ? (JSON.parse(raw) as Partial<Content>) : null;
    cacheValue = saved
      ? {
          /* popup이 없던 저장분은 「안 띄움」으로 읽는다 — 띄우는 것은 사람이 정한다.
             차림이 없던 저장분은 전부 안내 판이었다 — 이벤트 틀은 나중에 생겼다 */
          notices: (saved.notices ?? SEED.notices).map((v) => ({
            ...v,
            popup: !!v.popup,
            popupKind: v.popupKind === "event" ? "event" : "notice",
            popupLink: v.popupLink ?? "",
            popupLinkLabel: v.popupLinkLabel ?? "",
            body: richOf(v.body),
          })),
          /* home이 없던 저장분은 「홈에는 안 보임」으로 읽는다 — 켜는 것은 사람이 정한다 */
          faqs: (saved.faqs ?? SEED.faqs).map((v) => ({ ...v, a: richOf(v.a), home: !!v.home })),
        }
      : SEED;
  } catch {
    cacheValue = SEED;
  }
  return cacheValue;
}

function write(next: Content) {
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

export function useContent(): Content {
  return useSyncExternalStore(subscribe, read, () => SEED);
}

/* ───────────────────────── 고치기 ───────────────────────── */

/** 새 번호 — 지운 것과 겹치지 않게 지금 있는 것 중 가장 큰 수 다음을 준다 */
function nextId(prefix: string, ids: string[]) {
  const max = ids.reduce((m, id) => {
    const n = Number(id.slice(prefix.length + 1));
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

/** 오늘 (YYYY-MM-DD) — 새 공지의 게시일 기본값 */
export function today() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function blankNotice(cur: Content, postedOn: string): Notice {
  return {
    id: nextId("NT", cur.notices.map((n) => n.id)),
    title: "",
    postedOn,
    shown: false,
    pinned: false,
    popup: false,
    popupKind: "notice",
    popupLink: "",
    popupLinkLabel: "",
    body: blankRich(),
  };
}

export function blankFaq(cur: Content): Faq {
  return {
    id: nextId("FQ", cur.faqs.map((f) => f.id)),
    group: faqGroups[0],
    q: "",
    a: blankRich(),
    shown: false,
    home: false,
  };
}

/** 있으면 갈아 끼우고 없으면 뒤에 붙인다 */
export function saveNotice(next: Notice) {
  const cur = read();
  const has = cur.notices.some((n) => n.id === next.id);
  const one = { ...next, title: next.title.trim(), body: canonRich(next.body) };
  write({
    ...cur,
    notices: has ? cur.notices.map((n) => (n.id === next.id ? one : n)) : [...cur.notices, one],
  });
}

export function removeNotice(id: string) {
  const cur = read();
  write({ ...cur, notices: cur.notices.filter((n) => n.id !== id) });
}

export function saveFaq(next: Faq) {
  const cur = read();
  const has = cur.faqs.some((f) => f.id === next.id);
  const one = { ...next, q: next.q.trim(), a: canonRich(next.a) };
  write({ ...cur, faqs: has ? cur.faqs.map((f) => (f.id === next.id ? one : f)) : [...cur.faqs, one] });
}

export function removeFaq(id: string) {
  const cur = read();
  write({ ...cur, faqs: cur.faqs.filter((f) => f.id !== id) });
}

/* ───────────────────────── 공개 화면이 읽는 꼴 ───────────────────────── */

/**
 * 내보낼 공지 — 고정한 것이 먼저, 그다음 게시일 늦은 것부터.
 *
 * 내려 둔 것(shown: false)은 여기서 걸러진다. 콘솔 목록은 걸러내지 않는다 — 저쪽에서
 * 답할 물음은 「무엇을 올려 두었나」가 아니라 「무엇이 있나」다.
 */
/**
 * 지금 판으로 띄울 공지 — **하나뿐이다**.
 *
 * 둘을 겹쳐 띄우면 아래 것이 가려지고, 나란히 띄우면 화면이 공지판이 된다. 여럿이
 * 켜져 있으면 가장 나중에 올린 것을 띄운다.
 */
export function popupNotice(c: Content): Notice | null {
  return shownNotices(c).find((v) => v.popup) ?? null;
}

export function shownNotices(c: Content): Notice[] {
  return c.notices
    .filter((n) => n.shown && !richIsEmpty(n.body))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.postedOn.localeCompare(a.postedOn));
}

/**
 * 홈에 세우는 질문 — 목록 차례 그대로(분류 순서 안에서 넣은 차례).
 *
 * 홈이 제 목록을 들고 있을 때는 「무료인가」를 맨 앞에 두었었다. 합치면서 차례는 분류를
 * 따라간다 — 같은 목록을 두 곳이 다른 차례로 그리면 「세 번째 질문」이 서로 다른 것이 된다.
 */
export function homeFaqs(c: Content): Faq[] {
  return shownFaqGroups(c).flatMap((g) => g.items.filter((f) => f.home));
}

/** 분류 차례대로 묶은 자주 묻는 질문 — 빈 묶음은 내지 않는다 */
export function shownFaqGroups(c: Content): { name: string; items: Faq[] }[] {
  const on = c.faqs.filter((f) => f.shown && f.q.trim() !== "");
  const names = [...faqGroups, ...on.map((f) => f.group).filter((g) => !faqGroups.includes(g))];
  return [...new Set(names)]
    .map((name) => ({ name, items: on.filter((f) => f.group === name) }))
    .filter((g) => g.items.length > 0);
}
