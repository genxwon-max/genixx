"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { examDiscounted, examFeeText, useCatalogRounds, type CatalogRound } from "@/lib/catalogRounds";
import { FREE_TOTAL, SET_QUESTIONS, assessment, questionCount } from "@/lib/exam";
import {
  availabilityLabel,
  dotDate,
  evalName,
  schoolLevels,
  trackLabel,
  trackOf,
  tracks,
  type Availability,
  type Track,
  type TrackId,
} from "@/lib/examCatalog";
import { examWindow } from "@/lib/popup";
import { orderWon } from "@/lib/orderStore";
import type { ApplyAction } from "./ApplyFlow";
import { PageTitle } from "./Registrations";
import { btnBox, btnBoxDisabled } from "./ui";

/**
 * 진단 목록 — 회차 × 학년을 한 줄씩 세우고 걸러 보는 화면. 두 자리가 함께 쓴다.
 *
 *   응시 존 /exam                 「진단 둘러보기」 — 가입 전 사람이 골라 1셋트를 풀어 본다
 *   학생 대시보드 /student/apply   「진단 접수」 — 골라서 접수한다(components/student/StudentApply.tsx)
 *
 * 접수는 학생 대시보드 한 곳에서만 한다. 예전에는 응시 존에도 「접수하기」 탭이 있어 같은
 * 목록이 두 자리에 섰다 — 접수한 사람이 어느 쪽으로 돌아가야 하는지부터 골라야 했다.
 * 응시 존에 남은 이 목록은 **로그인하지 않은 사람**의 것이라 접수 단추가 없다.
 *
 *   왼쪽      학년 카테고리 — 전체 · 초등학교(3~6학년)
 *   오른쪽    검색(접수 상태 · 검색어) → 건수와 보기 방식 → 진단 목록 → 페이지
 *
 * ── 해가 쌓여도 버티는 모양 ──
 * 진단은 해마다 네 분기, 분기마다 학년 수만큼 열린다(「2026 3분기 초3 진단」 · 「초4」 …).
 * 학년이 넷이라 한 해에 열여섯, 세 해가 쌓이면 쉰을 넘는다.
 * 연도·회차를 탭이나 고르개로 세우면 해가 늘 때마다 고를 것이 는다. 그래서 목록은 지난
 * 진단까지 **한 줄로 모두** 두고, 찾는 일은 검색어와 페이지가 맡는다.
 *
 * 차례는 **접수 중 → 접수 예정 → 접수 마감**, 같은 상태 안에서는 최근 진단이 위다. 이
 * 목록을 여는 까닭은 거의 늘 「지금 접수할 것」이라, 그것이 첫 쪽 맨 위에 서야 한다.
 *
 * 목록은 기본이 리스트이고, 오른쪽 위에서 카드로 바꿔 볼 수 있다.
 *
 * 좁은 화면에서는 왼쪽 카테고리를 세로로 세우면 목록이 한참 아래로 밀리므로, 같은 선택을
 * 가로 버튼 줄로 바꿔 목록 위에 둔다.
 */

type Filter = "all" | TrackId;
type View = "list" | "card";
type StatusFilter = "all" | Availability;

/** 한 쪽에 싣는 수 — 카드는 세 줄로 떨어지게 아홉 */
const PAGE_SIZE: Record<View, number> = { list: 10, card: 9 };

const stateRank: Record<Availability, number> = { open: 0, soon: 1, ended: 2 };

const stateTone: Record<Availability, string> = {
  open: "text-soft-primary",
  soon: "text-amber-700",
  ended: "text-slate-400",
};

/**
 * 자리마다 다른 모양 — 목록의 짜임은 같고 모서리와 테두리만 갈린다.
 *
 * 응시 존은 모서리를 세우고 표 머리에 굵은 윗선을 긋는다. 시험을 고르는 자리의 말투다.
 * 학생 대시보드는 그 안의 다른 화면처럼 둥근 판과 알약 단추를 쓴다 — 접수 화면만 각지면
 * 남의 화면을 끼워 넣은 것으로 읽힌다.
 */
export type CatalogSkin = "exam" | "dash";

const skins: Record<
  CatalogSkin,
  {
    wrap: string;
    side: string;
    sideBox: string;
    chip: string;
    search: string;
    field: string;
    btnFind: string;
    btnReset: string;
    toggle: string;
    pagerCell: string;
    rowBtn: string;
    tableWrap: string;
    theadRow: string;
    mineBadge: string;
    cards: string;
    card: string;
    cardBadge: string;
    empty: string;
    go: string;
    goOff: string;
  }
> = {
  exam: {
    wrap: "mt-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8",
    side: "shrink-0 lg:w-[220px]",
    /* 윗선만 파랗게 — 오른쪽 표의 머리와 같은 말투다 */
    sideBox: "hidden border border-t-2 border-soft-line border-t-soft-primary bg-white lg:block",
    chip: "rounded-[2px]",
    search: "border border-soft-line bg-white",
    field: "rounded-[2px]",
    btnFind: "rounded-[2px]",
    btnReset: "rounded-[2px]",
    toggle: "inline-flex border border-soft-line bg-white",
    pagerCell: "rounded-[2px]",
    rowBtn: "rounded-[2px]",
    tableWrap: "overflow-x-auto",
    theadRow: "border-t-2 border-soft-primary bg-slate-50",
    mineBadge: "rounded-[2px] bg-soft-primary px-1.5 py-0.5 text-[11px] font-bold text-white",
    cards: "grid gap-5 border-t-2 border-soft-primary pt-5 sm:grid-cols-2 xl:grid-cols-3",
    card: "rounded-[2px]",
    cardBadge: "rounded-[2px] px-2",
    empty: "border-y border-soft-line bg-white py-4 text-center text-[14px] text-soft-muted",
    go: `${btnBox} w-full`,
    goOff: `${btnBoxDisabled} w-full`,
  },
  dash: {
    wrap: "mt-7 flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-6",
    side: "shrink-0 lg:w-[200px]",
    sideBox: "hidden overflow-hidden rounded-[14px] border border-soft-line bg-white lg:block",
    chip: "rounded-full",
    search: "rounded-[14px] border border-soft-line bg-white",
    field: "rounded-[10px]",
    btnFind: "rounded-full",
    btnReset: "rounded-full",
    toggle: "inline-flex overflow-hidden rounded-[10px] border border-soft-line bg-white",
    pagerCell: "rounded-[10px]",
    rowBtn: "rounded-full",
    /* 판이 테두리를 두르므로 마지막 줄의 밑줄은 걷는다 — 두 줄이 겹쳐 굵어진다 */
    tableWrap:
      "overflow-x-auto rounded-[14px] border border-soft-line bg-white [&_tbody_tr:last-child>td]:border-b-0",
    theadRow: "bg-slate-50",
    mineBadge:
      "rounded-full bg-soft-primary-soft px-2 py-0.5 text-[11.5px] font-bold text-soft-primary",
    cards: "grid gap-4 sm:grid-cols-2 xl:grid-cols-3",
    card: "rounded-[14px]",
    cardBadge: "rounded-full px-2.5",
    empty:
      "rounded-[14px] border border-soft-line bg-white py-10 text-center text-[14px] text-soft-muted",
    go: "inline-flex w-full items-center justify-center rounded-full bg-soft-primary px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-soft-primary-dark",
    goOff:
      "inline-flex w-full cursor-not-allowed items-center justify-center rounded-full border border-soft-line bg-slate-50 px-5 py-2.5 text-[14px] font-medium text-slate-400",
  },
};

type Skin = (typeof skins)[CatalogSkin];

type Item = {
  round: CatalogRound;
  track: Track;
  /** 「2026 3분기 초3 진단」 */
  name: string;
  mine: boolean;
  action: ApplyAction;
  onApply: () => void;
};

/**
 * 진단 둘러보기 (/exam) — 로그인하지 않은 사람이 보는 목록.
 *
 * 줄마다 단추는 「무료로 풀어보기」 하나다. 누르면 그 진단의 1셋트가 응시 창으로 뜬다
 * (/exam/session/trial/…). 다 풀면 그 창이 가입을 권하고, 가입한 뒤의 접수 · 응시 · 정답 ·
 * 결과는 모두 학생 대시보드에 있다.
 */
export default function ExamCatalog() {
  return (
    <div>
      <BrowseTitle />

      <CatalogBrowser
        skin="exam"
        mine={null}
        actionOf={(round, track) => tryAction(`/exam/session/trial/${round.id}/${track}`)}
      />
    </div>
  );
}

/** 둘러보기 목록의 줄 끝 단추 — 「무료로 풀어보기」. 누르면 그 주소가 응시 창으로 뜬다 */
export const tryAction = (href: string): ApplyAction => ({
  kind: "try",
  label: "무료로 풀어보기",
  href,
});

/** 진단 둘러보기의 제목과 안내 — 가입 없이 무엇을 할 수 있는지 */
export function BrowseTitle() {
  return (
    <PageTitle
      sub={
        <>
          회원가입 없이 보고 싶은 진단을 골라 교과 하나로 1셋트 {SET_QUESTIONS}문항을 풀어 볼
          수 있습니다.
          <br />
          셋트를 풀고 가입하면 무료 진단 {FREE_TOTAL}문항으로 이어집니다. 결과 리포트는{" "}
          <Link href="/signup" className="font-semibold text-soft-primary hover:underline">
            회원가입
          </Link>{" "}
          또는{" "}
          <Link href="/login" className="font-semibold text-soft-primary hover:underline">
            로그인
          </Link>{" "}
          후 이용할 수 있습니다.
        </>
      }
    >
      진단 둘러보기
    </PageTitle>
  );
}

type CatalogProps = {
  skin: CatalogSkin;
  /** 보는 학생의 학년 — 그 학년 줄에 「내 학년」을 붙인다. 모르면 null */
  mine: TrackId | null;
  actionOf: (round: CatalogRound, track: TrackId) => ApplyAction;
  /** 「접수하기」를 눌렀을 때 — 접수 확인 창을 띄운다 */
  onApply?: (round: CatalogRound, track: TrackId) => void;
};

/**
 * 목록 본체 — 학년 카테고리 · 검색 · 리스트/카드 · 페이지.
 *
 * 줄 끝의 단추가 무엇인지는 부르는 자리가 정한다(actionOf). 둘러보기는 「무료로 풀어보기」,
 * 접수 화면은 응시권과 접수 기록을 보고 「접수하기 · 접수 마감 · 이미 접수」를 가른다.
 *
 * 회차는 관리자 회차 편성 저장분에서 읽는다(useCatalogRounds). 그리는 일은 CatalogView가 한다.
 */
export function CatalogBrowser(props: CatalogProps) {
  const rounds = useCatalogRounds();
  return <CatalogView rounds={rounds} {...props} />;
}

/**
 * 목록을 그리는 쪽 — 회차를 넘겨받아 그대로 세운다.
 *
 * 저장소를 읽지 않는다. 디자인 보기(/design/student/apply · /design/exam)가 회차를 적어 넘겨
 * 누가 열어도 같은 목록을 보게 하려고 읽는 쪽(CatalogBrowser)과 갈라 두었다.
 */
export function CatalogView({
  rounds,
  skin: skinId,
  mine,
  actionOf,
  onApply,
  initial,
}: CatalogProps & {
  rounds: CatalogRound[];
  /** 처음에 걸어 둘 보기 방식과 검색어 — 디자인 보기가 「카드로 보기」 · 「찾는 진단 없음」을 주소로 굳힌다 */
  initial?: { view?: View; query?: string };
}) {
  const skin = skins[skinId];

  const [filter, setFilter] = useState<Filter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  /* 입력 중인 검색어와 실제로 건 검색어를 가른다 — 한 글자마다 목록이 흔들리면 쪽 번호도 함께 흔들린다 */
  const [draft, setDraft] = useState(initial?.query ?? "");
  const [query, setQuery] = useState(initial?.query ?? "");
  const [view, setView] = useState<View>(initial?.view ?? "list");
  const [page, setPage] = useState(1);
  const head = useRef<HTMLDivElement>(null);

  const q = query.trim().toLowerCase();
  const all: Item[] = rounds
    .flatMap((round) =>
      tracks.map((track) => ({
        round,
        track,
        name: evalName(round.id, track.id, round.label),
        mine: mine === track.id,
        action: actionOf(round, track.id),
        onApply: () => onApply?.(round, track.id),
      })),
    )
    .filter((it) => filter === "all" || it.track.id === filter)
    .filter((it) => status === "all" || it.round.availability === status)
    .filter(
      (it) =>
        !q || `${it.name} ${trackLabel(it.track.id)} ${it.track.short}`.toLowerCase().includes(q),
    )
    .sort(
      (a, b) =>
        stateRank[a.round.availability] - stateRank[b.round.availability] ||
        b.round.opensOn.localeCompare(a.round.opensOn) ||
        tracks.indexOf(a.track) - tracks.indexOf(b.track),
    );

  const size = PAGE_SIZE[view];
  const pages = Math.max(1, Math.ceil(all.length / size));
  const current = Math.min(page, pages);
  const offset = (current - 1) * size;
  const items = all.slice(offset, offset + size);

  const touched = status !== "all" || query !== "" || draft !== "";
  const filterLabel = filter === "all" ? "전체" : trackLabel(filter);

  const search = (e: FormEvent) => {
    e.preventDefault();
    setQuery(draft);
    setPage(1);
  };

  return (
    <div className={skin.wrap}>
      <GradeCategory
        skin={skin}
        filter={filter}
        onPick={(f) => {
          setFilter(f);
          setPage(1);
        }}
        mine={mine}
      />

      <div className="min-w-0 flex-1">
        {/* 검색 */}
        <form
          role="search"
          aria-label="진단 검색"
          onSubmit={search}
          className={`flex flex-wrap items-end gap-x-3 gap-y-3 px-5 py-4 ${skin.search}`}
        >
          <Field label="접수 상태" htmlFor="apply-status">
            <select
              id="apply-status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as StatusFilter);
                setPage(1);
              }}
              className={`h-10 min-w-[120px] border border-soft-line bg-white px-3 text-[14px] text-soft-ink outline-none focus:border-soft-primary ${skin.field}`}
            >
              <option value="all">전체</option>
              {(Object.keys(availabilityLabel) as Availability[]).map((k) => (
                <option key={k} value={k}>
                  {availabilityLabel[k]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="검색어" htmlFor="apply-query" grow>
            <input
              id="apply-query"
              type="search"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="진단명으로 찾기 (예: 2026, 3분기, 초4)"
              className={`h-10 w-full border border-soft-line bg-white px-3 text-[14px] text-soft-ink outline-none placeholder:text-slate-400 focus:border-soft-primary ${skin.field}`}
            />
          </Field>
          <button
            type="submit"
            className={`h-10 bg-soft-primary px-5 text-[14px] font-semibold text-white transition-colors hover:bg-soft-primary-dark ${skin.btnFind}`}
          >
            검색
          </button>
          {touched && (
            <button
              type="button"
              onClick={() => {
                setStatus("all");
                setDraft("");
                setQuery("");
                setPage(1);
              }}
              className={`h-10 border border-soft-line bg-white px-4 text-[14px] text-soft-ink transition-colors hover:bg-slate-50 ${skin.btnReset}`}
            >
              초기화
            </button>
          )}
        </form>

        {/* 목록 머리 — 왼쪽에 건수, 오른쪽 위에 보기 방식 */}
        <div
          ref={head}
          className="mt-6 flex scroll-mt-20 flex-wrap items-center justify-between gap-3 pb-3"
        >
          <p className="text-[14px] text-soft-muted">
            <b className="font-semibold text-soft-ink">{filterLabel}</b>
            {query && (
              <>
                {" "}
                · 「<span className="text-soft-ink">{query}</span>」 검색
              </>
            )}{" "}
            · 총 <b className="tabular-nums text-soft-primary">{all.length}</b>건
            <span className="ml-1 tabular-nums">
              ({current}/{pages}쪽)
            </span>
          </p>
          <ViewToggle
            skin={skin}
            view={view}
            onPick={(v) => {
              setView(v);
              setPage(1);
            }}
          />
        </div>

        {view === "list" ? (
          <ListView skin={skin} items={items} total={all.length} offset={offset} />
        ) : items.length === 0 ? (
          <p className={skin.empty}>조건에 맞는 진단이 없습니다.</p>
        ) : (
          <ul className={skin.cards}>
            {items.map((it) => (
              <li key={`${it.round.id}-${it.track.id}`}>
                <ExamCard skin={skin} {...it} />
              </li>
            ))}
          </ul>
        )}

        <Pager
          skin={skin}
          page={current}
          pages={pages}
          onPage={(p) => {
            setPage(p);
            head.current?.scrollIntoView({ block: "start" });
          }}
        />
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  grow = false,
  children,
}: {
  label: string;
  htmlFor: string;
  grow?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${grow ? "min-w-[200px] flex-1" : ""}`}>
      <label htmlFor={htmlFor} className="text-[12px] font-bold text-soft-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

/* ───────────────────────── 왼쪽 학년 카테고리 ───────────────────────── */

function GradeCategory({
  skin,
  filter,
  onPick,
  mine,
}: {
  skin: Skin;
  filter: Filter;
  onPick: (f: Filter) => void;
  mine: TrackId | null;
}) {
  const row = (id: Filter, label: string, indent: boolean) => {
    const on = filter === id;
    return (
      <button
        key={id}
        type="button"
        aria-pressed={on}
        onClick={() => onPick(id)}
        className={`relative flex w-full items-center justify-between gap-2 border-t border-soft-line py-3 pr-4 text-left text-[14px] transition-colors ${
          indent ? "pl-7" : "pl-4"
        } ${on ? "bg-soft-primary-soft font-bold text-soft-primary" : "text-soft-ink hover:bg-slate-50"}`}
      >
        {on && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-soft-primary" />}
        {label}
        {id !== "all" && id === mine && (
          <span className="text-[11px] font-semibold text-soft-muted">내 학년</span>
        )}
      </button>
    );
  };

  return (
    <nav aria-label="학년 선택" className={skin.side}>
      {/* 넓은 화면 — 세로 카테고리 */}
      <div className={skin.sideBox}>
        <p className="px-4 py-3 text-[15px] font-bold text-soft-ink">학년 선택</p>
        {row("all", "전체", false)}
        {schoolLevels.map((level) => (
          <div key={level}>
            <p className="border-t border-soft-line bg-slate-50 px-4 py-2.5 text-[13px] font-bold text-soft-muted">
              {level}
            </p>
            {tracks.filter((t) => t.level === level).map((t) => row(t.id, t.grades, true))}
          </div>
        ))}
      </div>

      {/* 좁은 화면 — 같은 선택을 가로 버튼 줄로 */}
      <div className="flex flex-wrap gap-2 lg:hidden">
        {(["all", ...tracks.map((t) => t.id)] as Filter[]).map((id) => {
          const on = filter === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={on}
              onClick={() => onPick(id)}
              className={`border px-3.5 py-2 text-[14px] transition-colors ${skin.chip} ${
                on
                  ? "border-soft-primary bg-soft-primary font-semibold text-white"
                  : "border-soft-line bg-white text-soft-ink hover:bg-slate-50"
              }`}
            >
              {/* 가로 줄에서는 짧은 이름을 쓴다 — 「초등학교 4학년」이 다섯 개 서면 두 줄이
                  넘고, 고르개가 목록보다 커진다 */}
              {id === "all" ? "전체" : trackOf(id).tag}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* ───────────────────────── 보기 방식 ───────────────────────── */

/**
 * 리스트 · 카드 전환 — 흔히 쓰는 줄 모양 · 바둑판 모양 아이콘으로 둔다.
 * 글자가 보이지 않으므로 이름은 aria-label과 title(마우스를 올리면 뜨는 말)로 준다.
 */
function ViewToggle({
  skin,
  view,
  onPick,
}: {
  skin: Skin;
  view: View;
  onPick: (v: View) => void;
}) {
  const opts: { id: View; label: string; icon: ReactNode }[] = [
    {
      id: "list",
      label: "리스트로 보기",
      icon: (
        <>
          <path d="M8 6h13M8 12h13M8 18h13" />
          <path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" strokeWidth={2.6} />
        </>
      ),
    },
    {
      id: "card",
      label: "카드로 보기",
      icon: (
        <>
          <rect x="3.5" y="3.5" width="7" height="7" rx="1" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="1" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1" />
          <rect x="13.5" y="13.5" width="7" height="7" rx="1" />
        </>
      ),
    },
  ];
  return (
    <div role="group" aria-label="보기 방식" className={skin.toggle}>
      {opts.map((o, i) => {
        const on = view === o.id;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            aria-label={o.label}
            title={o.label}
            onClick={() => onPick(o.id)}
            className={`flex h-9 w-9 items-center justify-center transition-colors ${
              i > 0 ? "border-l border-soft-line" : ""
            } ${on ? "bg-soft-primary text-white" : "text-soft-muted hover:bg-slate-50 hover:text-soft-ink"}`}
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-[18px] w-[18px]"
            >
              {o.icon}
            </svg>
          </button>
        );
      })}
    </div>
  );
}

/* ───────────────────────── 쪽 넘김 ───────────────────────── */

/**
 * 다섯 쪽 번호를 지금 쪽 둘레로 보여 준다. 쪽이 백을 넘어도 줄 길이가 같다.
 */
function Pager({
  skin,
  page,
  pages,
  onPage,
}: {
  skin: Skin;
  page: number;
  pages: number;
  onPage: (p: number) => void;
}) {
  if (pages <= 1) return null;
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  const nums = Array.from({ length: Math.min(5, pages) }, (_, i) => start + i);

  const cell = `inline-flex h-9 min-w-9 items-center justify-center border px-2.5 text-[13px] tabular-nums transition-colors ${skin.pagerCell}`;
  const idle = "border-soft-line bg-white text-soft-ink hover:bg-slate-50";
  const off = "cursor-not-allowed border-soft-line bg-white text-slate-300";

  const step = (label: string, to: number, disabled: boolean) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onPage(to)}
      className={`${cell} ${disabled ? off : idle}`}
    >
      {label}
    </button>
  );

  return (
    <nav aria-label="페이지 이동" className="mt-6 flex flex-wrap items-center justify-center gap-1.5">
      {step("처음", 1, page === 1)}
      {step("이전", page - 1, page === 1)}
      {nums.map((n) => (
        <button
          key={n}
          type="button"
          aria-current={n === page ? "page" : undefined}
          onClick={() => onPage(n)}
          className={`${cell} ${
            n === page ? "border-soft-primary bg-soft-primary font-semibold text-white" : idle
          }`}
        >
          {n}
        </button>
      ))}
      {step("다음", page + 1, page === pages)}
      {step("마지막", pages, page === pages)}
    </nav>
  );
}

/* ───────────────────────── 리스트 ───────────────────────── */

function ListView({
  skin,
  items,
  total,
  offset,
}: {
  skin: Skin;
  items: Item[];
  total: number;
  offset: number;
}) {
  const th = "border-b border-soft-line px-4 py-4 font-semibold text-soft-ink";
  const td = "border-b border-soft-line px-4 py-4 text-soft-muted";

  return (
    <div className={skin.tableWrap}>
      <table className="w-full min-w-[680px] border-collapse bg-white text-[14px]">
        <caption className="sr-only">접수할 수 있는 진단</caption>
        <colgroup>
          <col className="w-[7%]" />
          <col />
          <col className="w-[18%]" />
          <col className="w-[11%]" />
          <col className="w-[11%]" />
          <col className="w-[17%]" />
        </colgroup>
        <thead>
          <tr className={skin.theadRow}>
            <th scope="col" className={`${th} text-left`}>
              번호
            </th>
            <th scope="col" className={th}>
              진단명
            </th>
            <th scope="col" className={th}>
              접수 기간
            </th>
            {/* 응시료는 상태 **앞**에 둔다 — 「접수 중인가」를 보고 나서 누르기까지의 사이에
                드는 물음이 「얼마인가」라, 그 둘이 붙어 있어야 오른쪽 끝의 단추로 이어진다 */}
            <th scope="col" className={th}>
              응시료
            </th>
            <th scope="col" className={th}>
              상태
            </th>
            <th scope="col" className={th}>
              접수
            </th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={6} className={`${td} text-center`}>
                조건에 맞는 진단이 없습니다.
              </td>
            </tr>
          ) : (
            items.map((it, i) => (
              <tr key={`${it.round.id}-${it.track.id}`}>
                {/* 게시판처럼 전체에서 거꾸로 센다 — 쪽을 넘겨도 번호가 이어진다 */}
                <td className={`${td} tabular-nums`}>{total - offset - i}</td>
                <td className={td}>
                  <span className="font-semibold text-soft-ink">
                    {assessment.name} {it.name}
                  </span>
                  {it.mine && (
                    <span className={`ml-2 whitespace-nowrap align-[1px] ${skin.mineBadge}`}>
                      내 학년
                    </span>
                  )}
                  <span className="mt-0.5 block text-[12px]">
                    {trackLabel(it.track.id)} ·{" "}
                    {it.round.subjects.length > 0
                      ? it.round.subjects.map((s) => `${s.name} ${s.minutes}분`).join(" · ")
                      : "과목 준비 중"}
                  </span>
                </td>
                <td className={`${td} text-center text-[13px] tabular-nums`}>
                  {dotDate(it.round.opensOn)}
                  <br />~ {dotDate(it.round.closesOn)}
                </td>
                <td className={`${td} text-center text-[13px] tabular-nums`}>
                  <Fee round={it.round} />
                </td>
                <td
                  className={`${td} text-center text-[13px] font-semibold ${stateTone[it.round.availability]}`}
                >
                  {availabilityLabel[it.round.availability]}
                </td>
                <td className={`${td} text-center`}>
                  <ActionCell skin={skin} action={it.action} onApply={it.onApply} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/**
 * 응시료 — 할인 중이면 정가를 함께 적는다.
 *
 * 표와 카드가 같은 조각을 쓴다. 값을 두 곳에서 각자 그리면 한쪽만 할인 표시를 빠뜨리고,
 * 목록에서 본 값과 카드에서 본 값이 다르면 무엇이 맞는지 물으러 온다.
 *
 * 지난 진단에도 값을 적는다. 「접수 마감」 줄의 값이 대시로 비면 그 진단이 얼마짜리였는지
 * 알 수 없고, 다음 분기에 얼마를 준비해야 하는지도 거기서 가늠한다.
 */
function Fee({ round }: { round: CatalogRound }) {
  return (
    <>
      {examDiscounted(round) && (
        <span className="mr-1 text-[12px] text-slate-400 line-through">{orderWon(round.price)}</span>
      )}
      <span className="font-semibold text-soft-ink">{examFeeText(round)}</span>
    </>
  );
}

function ActionCell({
  skin,
  action,
  onApply,
}: {
  skin: Skin;
  action: ApplyAction;
  onApply: () => void;
}) {
  const rowBtn = `inline-flex items-center justify-center whitespace-nowrap bg-soft-primary px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-soft-primary-dark ${skin.rowBtn}`;

  if (action.kind === "done") {
    return (
      <span className="flex flex-col items-center gap-1">
        <span className="text-[13px] font-semibold text-soft-primary">
          {action.tier === "free" ? "무료 진단 접수" : "유료 진단 접수"}
        </span>
        <Link
          href={action.href}
          className="text-[12px] text-soft-ink underline-offset-2 hover:underline"
        >
          {action.label}
        </Link>
      </span>
    );
  }
  if (action.kind === "try") {
    /* 실제 응시처럼 별도 창에서 연다 */
    return (
      <button type="button" onClick={() => examWindow(action.href)} className={rowBtn}>
        {action.label}
      </button>
    );
  }
  if (action.kind === "apply") {
    return (
      <button type="button" onClick={onApply} className={rowBtn}>
        {action.label}
      </button>
    );
  }
  return <span className="text-[13px] text-slate-400">{action.label}</span>;
}

/* ───────────────────────── 카드 ───────────────────────── */

function ExamCard({ skin, round, track, name, mine, action, onApply }: Item & { skin: Skin }) {
  const total = round.subjects.reduce((sum, s) => sum + s.minutes, 0);

  return (
    <article
      className={`flex h-full flex-col overflow-hidden border border-soft-line bg-white ${skin.card}`}
    >
      <div className="relative aspect-[16/9] bg-slate-100">
        <Image
          src={track.image}
          alt={track.alt}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 280px"
          className="object-cover"
        />
        {mine && (
          <span
            className={`absolute right-3 top-3 bg-soft-primary py-1 text-[12px] font-bold text-white ${skin.cardBadge}`}
          >
            내 학년
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-[12px] font-semibold text-soft-muted">
          {trackLabel(track.id)} ·{" "}
          <span className={stateTone[round.availability]}>
            {availabilityLabel[round.availability]}
          </span>
        </p>
        <h3 className="mt-1 text-[18px] font-bold tracking-tight text-soft-ink">
          {assessment.name} {name}
        </h3>

        <p className="mt-4 text-[12px] font-bold text-soft-muted">진단 과목</p>
        {round.subjects.length > 0 ? (
          <ul className="mt-1.5 divide-y divide-slate-100 border-y border-slate-100">
            {round.subjects.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2.5 text-[14px]">
                <span className="font-semibold text-soft-ink">{s.name}</span>
                <span className="tabular-nums text-soft-muted">
                  {questionCount(s.id)}문항 · {s.minutes}분
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1.5 text-[13px] text-soft-muted">과목을 준비하고 있습니다.</p>
        )}
        {round.subjects.length > 0 && (
          <p className="mt-2 text-[12px] text-soft-muted">과목마다 따로 응시 · 모두 {total}분</p>
        )}
        <p className="mt-1 text-[12px] tabular-nums text-soft-muted">
          접수 기간 {dotDate(round.opensOn)} ~ {dotDate(round.closesOn)}
        </p>
        <p className="mt-2 flex items-baseline justify-between border-t border-slate-100 pt-2 text-[13px] tabular-nums">
          <span className="text-[12px] font-bold text-soft-muted">응시료</span>
          <span>
            <Fee round={round} />
          </span>
        </p>

        <div className="mt-auto pt-5">
          {action.kind === "done" ? (
            <>
              <p className="mb-2 text-[13px] font-semibold text-soft-primary">
                {action.tier === "free" ? "무료 진단 접수 완료" : "유료 진단 접수 완료"}
              </p>
              <Link href={action.href} className={skin.go}>
                {action.label}
              </Link>
            </>
          ) : action.kind === "try" ? (
            <button type="button" onClick={() => examWindow(action.href)} className={skin.go}>
              {action.label}
            </button>
          ) : action.kind === "apply" ? (
            <button type="button" onClick={onApply} className={skin.go}>
              {action.label}
            </button>
          ) : (
            <span aria-disabled className={skin.goOff}>
              {action.label}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
