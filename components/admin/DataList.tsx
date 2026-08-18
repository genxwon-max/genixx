"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as a from "./ui";

/**
 * 관리자 콘솔의 목록 껍데기 — 조회 조건 · 표 · 쪽 넘김을 한 군데 모은 것.
 *
 * 사용자 네 갈래와 운영자까지 다섯 화면이 같은 목록을 쓴다. 화면마다 따로 짜면
 * 페이지당 개수나 「조건 지우기」가 화면마다 조금씩 달라지고, 그걸 매일 쓰는 사람이
 * 제일 먼저 알아챈다.
 *
 * shadcn 부품을 쓰되 높이를 고정하지 않는다. 이 콘솔은 --adm-zoom으로 글자를 최대
 * 1.6배까지 키우는데, h-11로 못 박아 두면 글자만 커지고 상자는 그대로라 넘친다.
 * min-h로 바닥만 지키고 위로는 열어 둔다.
 *
 * ── 목록 한 줄 규칙 ──
 *
 * 글자 크기는 components/admin/ui.ts의 다섯 눈금을 따르되, 표 안에서는 자리마다
 * 쓰는 칸이 정해져 있다. 목록은 여러 화면이 같은 모양으로 세로로 훑는 곳이라,
 * 화면마다 줄 짜임이 다르면 눈이 매번 다시 적응해야 한다.
 *
 *   표 머리글       sm 13   a.th가 이미 쓴다
 *   셀의 첫 줄       md 15   그 칸의 값. 이름·제목·숫자.
 *   셀의 둘째 줄     sm 13   첫 줄을 가리키는 말. ID·소속·시각.
 *   상태 꼬리표      xs 12   a.badge
 *   표 안 버튼       sm 13   a.btnRow / a.btnRowGhost
 *
 * ⚠ 한 칸에 세 줄 이상 쌓지 않는다. 줄이 늘수록 행 높이가 화면마다 달라져서
 *   세로로 훑을 때 눈이 걸린다. 셋째 줄이 필요하면 열을 늘리거나 상세로 넘긴다.
 * ⚠ 값을 sm으로 내리지 않는다. 좁아 보인다고 첫 줄을 줄이기 시작하면 그 목록만
 *   다른 화면이 된다 — 좁으면 hide로 열을 접는다.
 * ⚠ ID·시각·상태처럼 통짜 값에는 nowrap을 준다. 「KOR-3-014」가 두 줄로 갈리면
 *   세로로 훑던 눈이 매 줄에서 멈춘다. 발문 같은 읽는 글에는 주지 않는다.
 */

export type Column<T> = {
  key: string;
  head: string;
  /** 이 폭 아래에서는 접는다. 목록을 고르는 데 꼭 필요한 열에는 쓰지 않는다. */
  hide?: "md" | "lg" | "xl";
  align?: "right";
  /**
   * 줄바꿈하지 않는다 — ID·시각·상태처럼 쪼개지면 뜻이 상하는 값에 준다.
   * 발문 같은 읽는 글에는 주지 않는다. 자세한 까닭은 ui.ts의 nowrap 주석에.
   */
  nowrap?: boolean;
  cell: (row: T) => ReactNode;
};

/** 페이지당 개수. 기본은 20이고 10·50·100으로 바꿀 수 있다. */
export const PAGE_SIZES = [10, 20, 50, 100] as const;

const hideClass = {
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
} as const;

/** 글자 배율을 따라 커지도록 높이를 열어 둔 shadcn 입력 */
export const fieldShape = "h-auto min-h-[2.75rem] py-2 adm-field";

/** 조회 조건 줄에 놓는 선택 상자 — 화면마다 같은 모양으로 쓰기 위해 여기 둔다 */
export function Picker({
  label,
  options,
  value,
  onChange,
  className = "w-full sm:w-44",
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const items = [{ value: "all", label }, ...options];
  return (
    <Select items={items} value={value} onValueChange={(v) => onChange(String(v ?? "all"))}>
      <SelectTrigger aria-label={label} className={`${fieldShape} ${className}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((o) => (
          <SelectItem key={o.value} value={o.value} className="adm-field">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

type Props<T> = {
  rows: T[];
  /** 조건을 걸기 전 전체 건수 — 「N건 중 M건」을 적기 위해 받는다 */
  totalCount: number;
  columns: Column<T>[];
  rowKey: (row: T) => string;
  /** 검색 상자 안내 문구 */
  searchPlaceholder: string;
  query: string;
  onQuery: (v: string) => void;
  /** 검색 오른쪽에 놓을 선택 상자들 */
  filters?: ReactNode;
  /** 조건이 하나라도 걸려 있는가 — 「조건 지우기」를 띄울지 정한다 */
  filtering: boolean;
  onReset: () => void;
  unit?: string;
  emptyText?: string;
  /**
   * 여러 줄을 골라 한꺼번에 처리하는 목록에만 준다.
   *
   * 머리글 체크상자는 「지금 이 쪽에 보이는 줄」만 고른다. 조건에 걸린 500줄을
   * 한 번에 고르게 하면 무엇을 고른 것인지 화면에서 확인할 수가 없다.
   */
  select?: {
    selected: string[];
    onChange: (ids: string[]) => void;
  };
};

export default function DataList<T>({
  rows,
  totalCount,
  columns,
  rowKey,
  searchPlaceholder,
  query,
  onQuery,
  filters,
  filtering,
  onReset,
  unit = "건",
  emptyText = "조건에 맞는 자료가 없습니다.",
  select,
}: Props<T>) {
  const [size, setSize] = useState<number>(20);

  /**
   * 조건이 바뀌어 결과 수가 달라지면 첫 쪽으로 되돌린다.
   *
   * useEffect로 setPage(1)을 부르면 렌더가 한 번 더 도는데, 목록이 100줄일 때는
   * 그 한 번이 눈에 보인다. 그래서 쪽 번호를 「어느 목록의 몇 쪽인가」로 함께 들고
   * 있다가, 목록이 달라지면 렌더 중에 그냥 1을 쓴다.
   */
  const listKey = `${rows.length}|${size}`;
  const [at, setAt] = useState({ key: listKey, page: 1 });
  const page = at.key === listKey ? at.page : 1;
  const setPage = (p: number) => setAt({ key: listKey, page: p });

  const pages = Math.max(1, Math.ceil(rows.length / size));
  const current = Math.min(page, pages);
  const start = (current - 1) * size;
  const shown = useMemo(() => rows.slice(start, start + size), [rows, start, size]);

  /* 고르기 — 머리글 체크는 지금 쪽에 보이는 줄만 다룬다 */
  const pageIds = () => shown.map(rowKey);
  const pageAllPicked =
    !!select && shown.length > 0 && pageIds().every((id) => select.selected.includes(id));
  const togglePage = () => {
    if (!select) return;
    const ids = pageIds();
    select.onChange(
      pageAllPicked
        ? select.selected.filter((id) => !ids.includes(id))
        : [...new Set([...select.selected, ...ids])],
    );
  };
  const toggleOne = (id: string) => {
    if (!select) return;
    select.onChange(
      select.selected.includes(id)
        ? select.selected.filter((x) => x !== id)
        : [...select.selected, id],
    );
  };

  return (
    <div>
      {/* ── 조회 조건 ── */}
      <div className={`${a.panel} mb-4 p-4`}>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-exam-muted"
            />
            <Input
              type="search"
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label="목록 검색"
              className={`${fieldShape} pl-10`}
            />
          </div>

          {filters && <div className="flex flex-wrap gap-2">{filters}</div>}

          {filtering && (
            <Button
              variant="outline"
              onClick={onReset}
              className={`${fieldShape} shrink-0 px-5 font-bold`}
            >
              조건 지우기
            </Button>
          )}
        </div>
      </div>

      <p className="mb-2.5 adm-t-sm text-exam-muted">
        {filtering ? (
          <>
            전체 {totalCount.toLocaleString("ko-KR")}
            {unit} 중{" "}
            <b className="font-bold text-exam-text">
              {rows.length.toLocaleString("ko-KR")}
              {unit}
            </b>
          </>
        ) : (
          <>
            전체{" "}
            <b className="font-bold text-exam-text">
              {rows.length.toLocaleString("ko-KR")}
              {unit}
            </b>
          </>
        )}
        {rows.length > 0 && ` · ${start + 1}–${start + shown.length}번째`}
      </p>

      {/* ── 표 ── */}
      <div className={`${a.panel} overflow-x-auto`}>
        <table className={a.table}>
          <thead>
            <tr>
              {select && (
                <th className={`${a.th} w-12`}>
                  <label className="flex items-center justify-center">
                    <span className="sr-only">이 쪽 전체 고르기</span>
                    <input
                      type="checkbox"
                      className="h-5 w-5"
                      checked={pageAllPicked}
                      onChange={togglePage}
                    />
                  </label>
                </th>
              )}
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`${a.th} ${c.hide ? hideClass[c.hide] : ""} ${
                    c.align === "right" ? "text-right" : ""
                  }`}
                >
                  {c.head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr>
                <td
                  className={`${a.td} py-12 text-center`}
                  colSpan={columns.length + (select ? 1 : 0)}
                >
                  <span className="adm-t-md font-bold text-exam-text">{emptyText}</span>
                  <span className="mt-1 block adm-t-sm">검색어나 조회 조건을 바꿔 보세요.</span>
                </td>
              </tr>
            ) : (
              shown.map((row) => (
                <tr key={rowKey(row)}>
                  {select && (
                    <td className={a.td}>
                      <label className="flex items-center justify-center">
                        <span className="sr-only">이 줄 고르기</span>
                        <input
                          type="checkbox"
                          className="h-5 w-5"
                          checked={select.selected.includes(rowKey(row))}
                          onChange={() => toggleOne(rowKey(row))}
                        />
                      </label>
                    </td>
                  )}
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={`${c.align === "right" ? a.tdNum : a.td} ${
                        c.nowrap ? a.nowrap : ""
                      } ${c.hide ? hideClass[c.hide] : ""}`}
                    >
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── 쪽 넘김 ──
          왼쪽에 지금 보고 있는 범위, 오른쪽에 쪽 번호와 페이지당 개수. 개수 상자를
          오른쪽 끝에 두는 것은 목록을 다 훑고 「더 보자」고 마음먹는 자리가 거기라서다. */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="adm-t-sm text-exam-muted">
          {rows.length > 0
            ? `${rows.length.toLocaleString("ko-KR")}${unit} 중 ${start + 1}–${start + shown.length}번째`
            : `0${unit}`}
        </p>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Pager page={current} pages={pages} onGo={setPage} />
          <Select
            items={PAGE_SIZES.map((n) => ({ value: String(n), label: `${n}개씩` }))}
            value={String(size)}
            onValueChange={(v) => setSize(Number(v ?? 20))}
          >
            <SelectTrigger aria-label="페이지당 개수" className={`${fieldShape} w-[7.5rem]`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((n) => (
                <SelectItem key={n} value={String(n)} className="adm-field">
                  {n}개씩
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── 쪽 번호 ───────────────────────── */

function Pager({ page, pages, onGo }: { page: number; pages: number; onGo: (p: number) => void }) {
  const from = Math.max(1, Math.min(page - 2, pages - 4));
  const to = Math.min(pages, from + 4);
  const nums: number[] = [];
  for (let i = from; i <= to; i += 1) nums.push(i);

  const shape = "h-auto min-h-[2.75rem] min-w-[2.75rem] px-3 adm-field font-bold";

  return (
    <nav aria-label="쪽 넘김" className="flex flex-wrap items-center gap-1.5">
      <Button variant="outline" onClick={() => onGo(1)} disabled={page === 1} className={shape}>
        처음
      </Button>
      <Button
        variant="outline"
        onClick={() => onGo(page - 1)}
        disabled={page === 1}
        className={shape}
      >
        이전
      </Button>
      {nums.map((n) => (
        <Button
          key={n}
          variant={n === page ? "default" : "outline"}
          onClick={() => onGo(n)}
          aria-current={n === page ? "page" : undefined}
          className={shape}
        >
          {n}
        </Button>
      ))}
      <Button
        variant="outline"
        onClick={() => onGo(page + 1)}
        disabled={page === pages}
        className={shape}
      >
        다음
      </Button>
      <Button
        variant="outline"
        onClick={() => onGo(pages)}
        disabled={page === pages}
        className={shape}
      >
        마지막
      </Button>
    </nav>
  );
}
