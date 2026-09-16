"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { useSession } from "@/lib/authStore";
import { useCatalogRounds, type CatalogRound } from "@/lib/catalogRounds";
import { QUESTIONS_PER_SUBJECT, assessment } from "@/lib/exam";
import {
  availabilityLabel,
  dotDate,
  evalName,
  schoolLevels,
  trackFromGrade,
  trackLabel,
  tracks,
  type Availability,
  type Track,
  type TrackId,
} from "@/lib/examCatalog";
import { resetStudent } from "@/lib/examStore";
import { findById } from "@/lib/roster";
import { resetWallet } from "@/lib/ticketStore";
import { applyAction, useApplyFlow, type ApplyAction } from "./ApplyFlow";
import { PageTitle } from "./Registrations";
import StudentOnly from "./StudentOnly";
import { btnBox, btnBoxDisabled } from "./ui";

/**
 * 접수하기 탭 (/exam/apply) — 평가를 골라 접수한다.
 *
 *   제목      가운데 큰 「접수하기」
 *   왼쪽      학년군 카테고리 — 전체 · 초등학교(3-4 · 5-6학년) · 중학교(1-2학년)
 *   오른쪽    검색(접수 상태 · 검색어) → 건수와 보기 방식 → 평가 목록 → 페이지
 *
 * ── 해가 쌓여도 버티는 모양 ──
 * 평가는 해마다 네 시기, 시기마다 학년군 수만큼 열린다(「2026 3-1 평가」 · 「3-2」 …).
 * 연도·회차를 탭이나 고르개로 세우면 해가 늘 때마다 고를 것이 는다. 그래서 목록은 지난
 * 평가까지 **한 줄로 모두** 두고, 찾는 일은 검색어와 페이지가 맡는다.
 *
 * 차례는 **접수 중 → 접수 예정 → 접수 마감**, 같은 상태 안에서는 최근 평가가 위다. 학생이
 * 이 탭을 여는 까닭은 거의 늘 「지금 접수할 것」이라, 그것이 첫 쪽 맨 위에 서야 한다.
 *
 * 목록은 기본이 리스트이고, 오른쪽 위에서 카드로 바꿔 볼 수 있다. 접수하면 응시권 한
 * 매를 쓰고, 그 평가가 응시하기 탭 표에 올라온다.
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

type Item = {
  round: CatalogRound;
  track: Track;
  /** 「2026 3-1 평가」 */
  name: string;
  mine: boolean;
  action: ApplyAction;
  onApply: () => void;
};

export default function ExamCatalog() {
  const session = useSession();
  const studentId = session?.studentId ?? "demo";
  const asGuardian = session?.asGuardian === true;
  const rounds = useCatalogRounds();
  const { wallet, begin, dialog } = useApplyFlow(studentId);
  const mine = trackFromGrade(findById(studentId)?.grade);

  const [filter, setFilter] = useState<Filter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  /* 입력 중인 검색어와 실제로 건 검색어를 가른다 — 한 글자마다 목록이 흔들리면 쪽 번호도 함께 흔들린다 */
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("list");
  const [page, setPage] = useState(1);
  const head = useRef<HTMLDivElement>(null);

  if (session && session.role !== "student") return <StudentOnly role={session.role} />;

  const q = query.trim().toLowerCase();
  const all: Item[] = rounds
    .flatMap((round) =>
      tracks.map((track) => ({
        round,
        track,
        name: evalName(round.id, track.id, round.label),
        mine: mine === track.id,
        action: applyAction(round, track.id, wallet, asGuardian),
        onApply: () => begin(round, track.id),
      })),
    )
    .filter((it) => filter === "all" || it.track.id === filter)
    .filter((it) => status === "all" || it.round.availability === status)
    .filter(
      (it) =>
        !q ||
        `${it.name} ${trackLabel(it.track.id)} ${it.track.short}`.toLowerCase().includes(q),
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
    <div>
      <PageTitle>접수하기</PageTitle>

      <div className="mt-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <GradeCategory
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
            aria-label="평가 검색"
            onSubmit={search}
            className="flex flex-wrap items-end gap-x-3 gap-y-3 border border-soft-line bg-white px-5 py-4"
          >
            <Field label="접수 상태" htmlFor="apply-status">
              <select
                id="apply-status"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as StatusFilter);
                  setPage(1);
                }}
                className="h-10 min-w-[120px] rounded-[4px] border border-soft-line bg-white px-3 text-[14px] text-soft-ink outline-none focus:border-soft-primary"
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
                placeholder="평가명으로 찾기 (예: 2025, 3-1, 5-6학년)"
                className="h-10 w-full rounded-[4px] border border-soft-line bg-white px-3 text-[14px] text-soft-ink outline-none placeholder:text-slate-400 focus:border-soft-primary"
              />
            </Field>
            <button
              type="submit"
              className="h-10 rounded-[4px] bg-soft-primary px-5 text-[14px] font-semibold text-white transition-colors hover:bg-soft-primary-dark"
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
                className="h-10 rounded-[4px] border border-soft-line bg-white px-4 text-[14px] text-soft-ink transition-colors hover:bg-slate-50"
              >
                초기화
              </button>
            )}
          </form>

          {/* 목록 머리 — 왼쪽에 건수, 오른쪽 위에 보기 방식 */}
          <div
            ref={head}
            className="mt-6 flex scroll-mt-4 flex-wrap items-center justify-between gap-3 pb-3"
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
              view={view}
              onPick={(v) => {
                setView(v);
                setPage(1);
              }}
            />
          </div>

          {view === "list" ? (
            <ListView items={items} total={all.length} offset={offset} />
          ) : items.length === 0 ? (
            <p className="border-y border-soft-line bg-white py-4 text-center text-[14px] text-soft-muted">
              조건에 맞는 평가가 없습니다.
            </p>
          ) : (
            <ul className="grid gap-5 border-t-2 border-soft-primary pt-5 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((it) => (
                <li key={`${it.round.id}-${it.track.id}`}>
                  <ExamCard {...it} />
                </li>
              ))}
            </ul>
          )}

          <Pager
            page={current}
            pages={pages}
            onPage={(p) => {
              setPage(p);
              head.current?.scrollIntoView({ block: "start" });
            }}
          />
        </div>
      </div>

      <div className="mt-12 flex justify-end border-t border-soft-line pt-5">
        <button
          type="button"
          onClick={() => {
            resetWallet(studentId);
            resetStudent(studentId);
          }}
          className="rounded-[4px] border border-soft-line bg-white px-4 py-2 text-[12px] font-bold text-soft-muted transition-colors hover:bg-slate-50"
        >
          시연용 초기화
        </button>
      </div>

      {dialog}
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

/* ───────────────────────── 왼쪽 학년군 카테고리 ───────────────────────── */

function GradeCategory({
  filter,
  onPick,
  mine,
}: {
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
    <nav aria-label="학년 선택" className="shrink-0 lg:w-[220px]">
      {/* 넓은 화면 — 세로 카테고리 */}
      {/* 윗선만 파랗게 — 오른쪽 표의 머리와 같은 말투다 */}
      <div className="hidden border border-t-2 border-soft-line border-t-soft-primary bg-white lg:block">
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
              className={`rounded-[4px] border px-3.5 py-2 text-[14px] transition-colors ${
                on
                  ? "border-soft-primary bg-soft-primary font-semibold text-white"
                  : "border-soft-line bg-white text-soft-ink hover:bg-slate-50"
              }`}
            >
              {id === "all" ? "전체" : trackLabel(id)}
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
function ViewToggle({ view, onPick }: { view: View; onPick: (v: View) => void }) {
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
    <div role="group" aria-label="보기 방식" className="inline-flex border border-soft-line bg-white">
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
  page,
  pages,
  onPage,
}: {
  page: number;
  pages: number;
  onPage: (p: number) => void;
}) {
  if (pages <= 1) return null;
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  const nums = Array.from({ length: Math.min(5, pages) }, (_, i) => start + i);

  const cell =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-[4px] border px-2.5 text-[13px] tabular-nums transition-colors";
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
    <nav aria-label="쪽 넘김" className="mt-6 flex flex-wrap items-center justify-center gap-1.5">
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

const rowBtn =
  "inline-flex items-center justify-center whitespace-nowrap rounded-[4px] bg-soft-primary px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-soft-primary-dark";

function ListView({ items, total, offset }: { items: Item[]; total: number; offset: number }) {
  const th = "border-b border-soft-line px-4 py-4 font-semibold text-soft-ink";
  const td = "border-b border-soft-line px-4 py-4 text-soft-muted";

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] border-collapse bg-white text-[14px]">
        <caption className="sr-only">접수할 수 있는 평가</caption>
        <colgroup>
          <col className="w-[8%]" />
          <col />
          <col className="w-[20%]" />
          <col className="w-[12%]" />
          <col className="w-[18%]" />
        </colgroup>
        <thead>
          <tr className="border-t-2 border-soft-primary bg-slate-50">
            <th scope="col" className={`${th} text-left`}>
              번호
            </th>
            <th scope="col" className={th}>
              평가명
            </th>
            <th scope="col" className={th}>
              접수 기간
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
              <td colSpan={5} className={`${td} text-center`}>
                조건에 맞는 평가가 없습니다.
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
                    <span className="ml-2 whitespace-nowrap rounded-[4px] bg-soft-primary px-1.5 py-0.5 align-[1px] text-[11px] font-bold text-white">
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
                <td
                  className={`${td} text-center text-[13px] font-semibold ${stateTone[it.round.availability]}`}
                >
                  {availabilityLabel[it.round.availability]}
                </td>
                <td className={`${td} text-center`}>
                  <ActionCell action={it.action} onApply={it.onApply} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function ActionCell({ action, onApply }: { action: ApplyAction; onApply: () => void }) {
  if (action.kind === "done") {
    return (
      <span className="flex flex-col items-center gap-1">
        <span className="text-[13px] font-semibold text-soft-primary">접수 완료</span>
        <Link href="/exam" className="text-[12px] text-soft-ink underline-offset-2 hover:underline">
          {action.label}
        </Link>
      </span>
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

function ExamCard({ round, track, name, mine, action, onApply }: Item) {
  const total = round.subjects.reduce((sum, s) => sum + s.minutes, 0);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[14px] border border-soft-line bg-white">
      <div className="relative aspect-[16/9] bg-slate-100">
        <Image
          src={track.image}
          alt={track.alt}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 280px"
          className="object-cover"
        />
        {mine && (
          <span className="absolute right-3 top-3 rounded-[4px] bg-soft-primary px-2 py-1 text-[12px] font-bold text-white">
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

        <p className="mt-4 text-[12px] font-bold text-soft-muted">평가 과목</p>
        {round.subjects.length > 0 ? (
          <ul className="mt-1.5 divide-y divide-slate-100 border-y border-slate-100">
            {round.subjects.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2.5 text-[14px]">
                <span className="font-semibold text-soft-ink">{s.name}</span>
                <span className="tabular-nums text-soft-muted">
                  {QUESTIONS_PER_SUBJECT}문항 · {s.minutes}분
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

        <div className="mt-auto pt-5">
          {action.kind === "done" ? (
            <>
              <p className="mb-2 text-[13px] font-semibold text-soft-primary">접수 완료</p>
              <Link href="/exam" className={`${btnBox} w-full`}>
                {action.label}
              </Link>
            </>
          ) : action.kind === "apply" ? (
            <button type="button" onClick={onApply} className={`${btnBox} w-full`}>
              {action.label}
            </button>
          ) : (
            <span aria-disabled className={`${btnBoxDisabled} w-full`}>
              {action.label}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
