"use client";

import Link from "next/link";
import { inquiries, inquiryStates, type InquiryRow } from "@/lib/admin";
import { type Inquiry } from "@/lib/inquiryStore";
import type { Tone } from "@/lib/admin2";
import DataTable, { type Col, type Filter } from "@/components/admin2/DataTable";
import { Status, Tag } from "@/components/admin2/ui";

/*
 * ADM-10 문의의 표.
 *
 * DataTable이 함수 prop(value·cell·match)을 받으므로 이 조각만 클라이언트로 내린다.
 * 칸 정의·거르개·기본 차례를 전부 모듈 바깥 상수로 둔다 — 컴포넌트 안에서 만들면
 * 매 렌더마다 새 배열이 되어 DataTable의 useMemo가 늘 다시 돈다.
 *
 * ── 정렬(기본 차례)이 왜 page.tsx가 아니라 여기에 있나 ──
 * 판정 큐(EXP-07)는 page.tsx에서 미리 정렬해 표로 넘긴다. 여기서는 정렬 기준이
 * 「대기 시간」이고 그 값은 문자열("31시간")을 숫자로 푸는 waitHours()로만 나온다.
 * 같은 함수를 대기 시간 칸의 value에서도 써야 하는데, "use client" 파일의 export를
 * 서버 컴포넌트가 불러다 실행할 수는 없다. 그래서 파싱과 차례를 한 파일이 갖게 두고,
 * page.tsx는 세는 일(지표)만 한다.
 *
 * ── 칸을 이 순서로 놓은 이유 ──
 *   무엇인가 (문의 ID)
 *     → 어디로 들어왔나 (채널)  → 무엇에 대한 것인가 (분류)  → 내용 (제목)
 *     → 누가 (작성자)          → 얼마나 기다렸나 (대기)
 *     → 지금 어떤가 (상태)      → 동작
 * 채널·분류를 제목 앞에 세운 것은 이 둘이 곧 「누가 답해야 하는 문의인가」라서다.
 * 기관 도입은 영업이 받고 접속코드·개인정보는 운영이 받는다. 제목을 먼저 읽고 나서
 * 담당을 되짚는 것보다, 담당을 보고 제목으로 내려가는 쪽이 한 줄당 눈이 덜 움직인다.
 *
 * ── 일부러 뺀 것 ──
 *  · 작성자 연락처·메일 칸: 원본(lib/admin.ts)에 아예 없다. 빈 칸을 세워 두면
 *    「아직 안 들어온 값」으로 읽히고, 그러면 채우라는 요구가 따라온다. 작성자 이름도
 *    개인은 이미 김**** 로 가려진 채 오고, 이 화면에서 그 이상을 풀지 않는다.
 *  · 담당자 칸: 답한 사람은 상세의 처리 기록에 남는다. 목록에 세우면 답변 완료 줄에만
 *    이름이 서고 나머지는 빈 칸이라, 다섯 줄에 하나만 채워진 칸이 된다.
 *  · 목표 초과 칸: 「무엇부터 여나」를 고르는 값이라 머리의 탭이 맡는다. 표에도 세우면
 *    같은 것을 두 번 읽게 되고, 바로 옆 대기 칸이 이미 같은 말을 하고 있다.
 *  · inquiryStates[].className: 기존 /admin의 팔레트 클래스(text-rose-600 …)라
 *    이 콘솔에서 쓰지 않는다. label만 가져다 쓰고 색은 Status의 tone으로만 간다.
 */

/** 상태 → 색. 단계가 풀리는 방향을 그대로 danger → warn → ok로 둔다.
 *  대기를 danger로 잡은 것은 「아직 아무도 답하지 않은 것」이 이 화면에서 제일 먼저
 *  새는 자리이기 때문이다. 처리중은 사람이 붙어 있으니 한 단계 눅인다. */
export const STATE_TONE: Record<InquiryRow["state"], Tone> = {
  new: "danger",
  working: "warn",
  answered: "ok",
};

/** 거르개 차림표와 기본 차례가 함께 쓰는 순서 — 문의가 흘러가는 단계 그대로.
 *  가나다순으로 두면 「답변 완료」가 「대기」보다 위에 서서 단계를 못 읽는다. */
const STATE_ORDER: InquiryRow["state"][] = ["new", "working", "answered"];

/** 채널도 순서를 못 박는다. 개인 문의가 절대다수라 위에 두고, 기관 도입을 아래에 둔다 */
const CHANNEL_ORDER: InquiryRow["channel"][] = ["1:1 문의", "기관 도입"];

/**
 * 대기 시간을 시간(h) 숫자로 푼다.
 *
 * 원본이 "2시간" · "31시간" · "완료" 세 꼴의 문자열이라, 문자열 그대로 정렬하면
 * "31시간"이 "9시간"보다 앞에 선다(3 < 9). 표에서 제일 먼저 눌릴 칸이 거꾸로 서는 것이라
 * 정렬값만 숫자로 바꿔 준다. 화면에 그리는 글자는 원본을 그대로 쓴다.
 *
 * 답변이 끝난 줄에는 「기다린 시간」이라는 것이 없어 -1로 떨어뜨린다. 0으로 두면
 * 접수 직후(0시간)와 같은 자리에 서는데, 그 둘은 정반대의 줄이다.
 */
const WAITED_HOURS = /^(\d+)\s*시간$/;
const waitHours = (r: InquiryRow) => {
  const m = WAITED_HOURS.exec(r.waited);
  return m ? Number(m[1]) : -1;
};

/*
 * 기본 차례 — 목표 초과 → 처리 단계 → 오래 기다린 순.
 *
 * 접수순(ID 역순)으로 두면 방금 들어온 2시간짜리가 맨 위에 서고, 24시간 약속을 이미
 * 깬 줄은 아래로 밀린다. 이 표를 여는 이유가 「지금 누구를 화나게 하고 있나」이므로
 * 넘긴 줄을 무조건 맨 위로 올린다 — 초과는 되돌릴 수 없는 유일한 값이고, 나머지는
 * 기다리면 나아지는 값이다.
 * 그다음이 단계인 것은 대기가 곧 아무도 답하지 않은 줄이라서고, 같은 단계에서는 오래
 * 기다린 쪽이 먼저다.
 *
 * DataTable에 기본 정렬 prop이 없으므로 여기서 미리 정렬해 넘긴다(사람이 머리 행을
 * 누르기 전에는 정렬을 건드리지 않으므로 넘긴 순서가 그대로 첫 화면이 된다).
 */

const COLS: Col<InquiryRow>[] = [
  {
    key: "id",
    head: "문의 ID",
    width: "8rem",
    nowrap: true,
    // 굵게 두지 않는다. ID는 감사 로그·메일에서 들고 온 값을 맞춰 보는 용도라 고정폭이면
    // 충분하고, 이 표에서 눈이 먼저 닿아야 하는 것은 제목이다
    value: (r) => r.id,
    cell: (r) => <span className="a2-mono">{r.id}</span>,
  },
  {
    // 채널: 거르개가 따로 있어 value(=정렬·검색)를 달지 않는다. 「기관」을 검색창에 치면
    // 기관 도입 전부가 끌려 나와 제목 검색이 묻힌다
    key: "channel",
    head: "채널",
    width: "6rem",
    nowrap: true,
    // 기관 도입만 accent를 준다. 다섯 줄에 하나꼴이고 답하는 사람도 창구도 다른 문의라,
    // 표를 훑을 때 한 눈에 갈라지는 편이 낫다. 둘 다 칠하면 갈라지는 뜻이 사라진다
    cell: (r) => <Tag accent={r.channel === "기관 도입"}>{r.channel}</Tag>,
  },
  {
    // 분류는 거르개를 두지 않았다(값이 여덟 갈래로 흩어져 차림표만 길어진다). 대신
    // 정렬·검색을 남겨 「개인정보」처럼 급한 갈래를 검색창으로 모으게 한다
    key: "category",
    head: "분류",
    width: "6.5rem",
    nowrap: true,
    hide: "sm",
    value: (r) => r.category,
    cell: (r) => <span className="a2-t-sm text-(--a2-ink-2)">{r.category}</span>,
  },
  {
    // 폭을 100%로 두어 남는 자리를 이 칸이 먹고, 넘치면 말줄임한다. 제목은 길이가
    // 제각각이라 고정폭을 주면 짧은 줄에서 표가 성글어진다.
    // 잘린 줄을 마우스로 확인할 수 있게 title에 원문을 붙인다
    key: "title",
    head: "제목",
    width: "100%",
    clip: true,
    value: (r) => r.title,
    // 제목이 상세로 가는 문이다. 오른쪽 끝 단추와 같은 곳으로 가지만, 표를 훑는 눈이
    // 멈추는 자리가 제목이라 거기서 바로 열 수 있어야 한다 — 이 콘솔의 다른 목록도 같다
    cell: (r) => (
      <Link
        href={`/admin2/inquiries/${r.id}`}
        className="font-semibold text-(--a2-ink) hover:text-(--a2-accent) hover:underline"
        title={r.title}
      >
        {r.title}
      </Link>
    ),
  },
  {
    // 개인은 원본이 이미 가려 둔 형태(김****)로 오고, 기관은 기관명이 곧 작성자다.
    // 가려진 값을 그대로 그릴 뿐 이 화면에서 더 풀지 않는다
    key: "writer",
    head: "작성자",
    width: "9rem",
    nowrap: true,
    clip: true,
    hide: "md",
    value: (r) => r.writer,
    cell: (r) => <span className="a2-t-sm">{r.writer}</span>,
  },
  {
    key: "waited",
    head: "대기",
    width: "5rem",
    // 수량이 아니라 길이지만 num을 준다 — 오른쪽 정렬 + 고정폭이라야 31과 9의 자릿수가
    // 세로로 맞아 「누가 제일 오래 기다렸나」가 눈으로 읽힌다
    num: true,
    value: (r) => r.waited,
    sort: waitHours,
    cell: (r) => (
      <span className={r.state === "answered" ? "text-(--a2-ink-4)" : undefined}>{r.waited}</span>
    ),
  },
  {
    // 상태: 거르개가 있고 기본 차례가 이미 단계순이라 정렬 화살표를 세우지 않는다
    key: "state",
    head: "상태",
    width: "7rem",
    nowrap: true,
    cell: (r) => <Status tone={STATE_TONE[r.state]}>{inquiryStates[r.state].label}</Status>,
  },
];

/*
 * 동작 칸.
 *
 * 답을 목록 아래에서 펴던 때는 이 칸이 「답변」과 「닫기」를 가려 적어야 해서 컴포넌트 안에서
 * 매번 지었다. 지금은 제 주소로 가는 문이라 다른 칸과 같은 모듈 바깥 상수다.
 *
 * 답변 완료 줄에도 같은 단추를 남긴다. 지난 답을 다시 읽고 고쳐 보내는 자리가 결국 같은
 * 화면이라, 줄마다 갈 데가 있고 없고를 가르면 훑는 눈이 그 자리에서 한 번 멈춘다.
 */
const ACT_COL: Col<Inquiry> = {
  key: "reply",
  head: "동작",
  width: "4.5rem",
  nowrap: true,
  cell: (r) => (
    <Link
      href={`/admin2/inquiries/${r.id}`}
      className="a2-btn a2-btn-sm"
      aria-label={`${r.id} 답변`}
    >
      답변
    </Link>
  ),
};

/* 거르개 차림표는 실제로 등장한 값에서만 뽑는다. 골라도 0줄이 나오는 선택지가 하나라도
   있으면 거르개 전체를 못 믿게 된다 */
/* 상태와 목표 초과는 머리의 탭이 맡는다(InquiriesView). 같은 조건을 두 군데서 걸면
   탭에서 「처리중」을 고른 채 거르개에서 「대기」를 골라 0줄이 나온다 */
const FILTERS: Filter<InquiryRow>[] = [
  {
    id: "channel",
    label: "채널",
    options: CHANNEL_ORDER.filter((c) => inquiries.some((i) => i.channel === c)).map((c) => ({
      value: c,
      label: c,
    })),
    match: (r, v) => r.channel === v,
  },
];

/**
 * 기본 차례(목표 초과 → 대기 → 오래 기다린 순)로 세운다.
 *
 * 목록이 이제 저장소를 덮어쓴 값이라(lib/inquiryStore.ts) 상수로 둘 수 없다 — 답을
 * 보내는 순간 상태가 바뀌므로 그때 차례도 다시 서야 한다. 부르는 쪽에서 세운다.
 */
export function sortInquiries(rows: Inquiry[]): Inquiry[] {
  return [...rows].sort(
    (a, b) =>
      Number(b.overdue) - Number(a.overdue) ||
      STATE_ORDER.indexOf(a.state) - STATE_ORDER.indexOf(b.state) ||
      waitHours(b) - waitHours(a),
  );
}

const ALL_COLS: Col<Inquiry>[] = [...(COLS as Col<Inquiry>[]), ACT_COL];

export default function InquiriesTable({ rows, empty }: { rows: Inquiry[]; empty: string }) {
  return (
    <DataTable
      rows={rows}
      cols={ALL_COLS}
      getKey={(r) => r.id}
      filters={FILTERS as Filter<Inquiry>[]}
      searchHint="문의 ID · 제목 · 작성자 · 분류"
      empty={empty}
      // 줄 수는 끈다 — 탭의 개수 알약과 쪽 넘김 줄이 이미 같은 수를 적는다
      showCount={false}
    />
  );
}
