"use client";

import { useMemo, useState } from "react";

/**
 * 표 하나 — 검색 · 거르개 · 정렬 · 쪽 넘김을 한 덩어리로.
 *
 * 관리 도구의 표는 거의 같은 일을 한다. 화면마다 손으로 짜면 어느 표는 정렬이 되고
 * 어느 표는 안 되는 상태가 되므로, 열두 화면이 이 하나를 쓴다.
 *
 * ── 정한 것 ──
 *  · 검색은 `value`(사람이 보는 글자)를 이어 붙인 한 줄에서 찾는다. 칸마다 검색창을 두지 않는다.
 *  · 정렬은 `sort`가 있으면 그것으로, 없으면 `value`로. **둘을 가른 까닭** — 하나로 쓰면
 *    학년·상태처럼 「보이는 글자 ≠ 세우는 순서」인 칸에서 한쪽이 반드시 깨진다. 실제로
 *    학년 정렬을 위해 숫자를 넣었더니 「초5」를 쳐도 0줄이 나오고 「11」을 치면 화면에
 *    없는 48줄이 걸렸다(중1의 자리 숫자).
 *  · 쪽 넘김은 25/50/100. 무한 스크롤을 쓰지 않는다 — 「아까 그 줄」로 못 돌아간다.
 *  · 머리 행은 스크롤에 붙는다(sticky). 200줄을 내려도 무슨 칸인지 안 잊는다.
 *  · 줄 수는 늘 적어 둔다. 거르개를 걸고 나서 몇 줄이 남았는지가 곧 답일 때가 많다.
 */
export type Col<T> = {
  key: string;
  head: string;
  /** 고정 폭 — 값 길이가 들쭉날쭉한 칸(ID·상태·동작)에 준다 */
  width?: string;
  /** 숫자 칸 — 오른쪽 정렬 + 고정폭 글꼴 */
  num?: boolean;
  /** 쪼개지면 뜻이 상하는 값 */
  nowrap?: boolean;
  /** 넘치면 말줄임 — width와 함께 쓴다 */
  clip?: boolean;
  /** 좁은 화면에서 접는다 */
  hide?: "sm" | "md" | "lg";
  /** 검색에 쓰는 글자. 사람이 화면에서 보는 그대로 적는다. 없으면 검색에 안 걸린다 */
  value?: (row: T) => string | number;
  /** 세우는 순서. 없으면 value로 세운다. 둘 다 없으면 정렬 화살표를 달지 않는다 */
  sort?: (row: T) => string | number;
  cell: (row: T) => React.ReactNode;
};

export type Filter<T> = {
  id: string;
  label: string;
  options: { value: string; label: string }[];
  match: (row: T, value: string) => boolean;
};

const hideCls = {
  sm: "max-sm:hidden",
  md: "max-md:hidden",
  lg: "max-lg:hidden",
} as const;

export default function DataTable<T>({
  rows,
  cols,
  getKey,
  filters = [],
  search = true,
  searchHint = "검색",
  pageSize: initialPageSize = 25,
  toolbarExtra,
  empty = "조건에 맞는 줄이 없습니다.",
}: {
  rows: T[];
  cols: Col<T>[];
  getKey: (row: T) => string;
  filters?: Filter<T>[];
  search?: boolean;
  searchHint?: string;
  pageSize?: number;
  /** 도구 줄 오른쪽에 붙일 것 — 내려받기·새로 만들기 */
  toolbarExtra?: React.ReactNode;
  empty?: string;
}) {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [asc, setAsc] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const shown = useMemo(() => {
    let out = rows;

    for (const f of filters) {
      const v = picked[f.id];
      if (v) out = out.filter((r) => f.match(r, v));
    }

    const key = q.trim().toLowerCase();
    if (key) {
      out = out.filter((r) =>
        cols
          .map((c) => (c.value ? String(c.value(r)) : ""))
          .join(" ")
          .toLowerCase()
          .includes(key),
      );
    }

    const col = cols.find((c) => c.key === sortKey);
    const get = col?.sort ?? col?.value;
    if (get) {
      out = [...out].sort((a, b) => {
        const x = get(a);
        const y = get(b);
        const d =
          typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "ko-KR");
        return asc ? d : -d;
      });
    }
    return out;
  }, [rows, cols, filters, picked, q, sortKey, asc]);

  const pages = Math.max(1, Math.ceil(shown.length / pageSize));
  const at = Math.min(page, pages - 1);
  const slice = shown.slice(at * pageSize, at * pageSize + pageSize);
  const from = shown.length ? at * pageSize + 1 : 0;
  const to = at * pageSize + slice.length;

  const toggleSort = (c: Col<T>) => {
    if (!c.sort && !c.value) return;
    if (sortKey === c.key) setAsc((v) => !v);
    else {
      setSortKey(c.key);
      setAsc(true);
    }
    setPage(0);
  };

  return (
    <div className="a2-panel overflow-hidden">
      {(search || filters.length > 0 || toolbarExtra) && (
        <div className="a2-toolbar">
          {search && (
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              placeholder={searchHint}
              className="a2-input w-[13rem]"
              aria-label={searchHint}
            />
          )}
          {filters.map((f) => (
            <label key={f.id} className="inline-flex items-center gap-1.5">
              <span className="a2-label">{f.label}</span>
              <select
                value={picked[f.id] ?? ""}
                onChange={(e) => {
                  setPicked((p) => ({ ...p, [f.id]: e.target.value }));
                  setPage(0);
                }}
                className="a2-select w-auto"
              >
                <option value="">전체</option>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          ))}

          <span className="a2-t-xs text-(--a2-ink-4)">
            <span className="a2-num text-(--a2-ink-2)">{shown.length.toLocaleString("ko-KR")}</span>
            {shown.length !== rows.length && (
              <span> / 전체 {rows.length.toLocaleString("ko-KR")}</span>
            )}
            줄
          </span>

          {(q || Object.values(picked).some(Boolean)) && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                setPicked({});
                setPage(0);
              }}
              className="a2-btn a2-btn-sm"
            >
              조건 지우기
            </button>
          )}

          {toolbarExtra && <div className="ml-auto flex items-center gap-1.5">{toolbarExtra}</div>}
        </div>
      )}

      {/* 상한을 15rem로 두었더니 지표 띠가 있는 화면(students·orgs)에서 쪽 넘김 줄이
          첫 화면 밖으로 밀렸다 — 표 위 239px + 쪽 넘김 38px + 고지 27px이 필요하다.
          tabIndex는 스크롤 상자를 키보드로 굴리기 위한 것이다. 줄에 링크가 하나도 없는
          표(회원·기관)는 이것이 없으면 뒷줄에 키보드로 영영 닿지 못한다. */}
      <div
        tabIndex={0}
        role="region"
        aria-label={`${searchHint} 결과 ${shown.length}줄`}
        className="a2-table-wrap max-h-[calc(100vh-21rem)] overflow-y-auto"
      >
        <table className="a2-table">
          <thead>
            <tr>
              {cols.map((c) => {
                const on = sortKey === c.key;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    style={c.width ? { width: c.width } : undefined}
                    className={`${c.num ? "a2-th-num" : ""} ${c.hide ? hideCls[c.hide] : ""}`}
                    aria-sort={on ? (asc ? "ascending" : "descending") : undefined}
                  >
                    {c.sort || c.value ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c)}
                        /* 칸 전체를 누를 수 있게 한다. 30px 칸 안에 17px 단추만 두었더니
                           좁은 칸은 눌리는 넓이가 13%밖에 되지 않았다 */
                        className={`-mx-2.5 inline-flex h-[30px] w-[calc(100%+1.25rem)] items-center gap-1 px-2.5 font-bold ${
                          on ? "text-(--a2-accent)" : "hover:text-(--a2-ink)"
                        }`}
                      >
                        {c.head}
                        <span aria-hidden className="a2-t-xs">
                          {on ? (asc ? "▲" : "▼") : "↕"}
                        </span>
                      </button>
                    ) : (
                      c.head
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {slice.map((r) => (
              <tr key={getKey(r)}>
                {cols.map((c) => (
                  <td
                    key={c.key}
                    style={c.width ? { width: c.width } : undefined}
                    className={`${c.num ? "a2-td-num" : ""} ${c.nowrap ? "a2-nowrap" : ""} ${
                      c.clip ? "a2-clip" : ""
                    } ${c.hide ? hideCls[c.hide] : ""}`}
                  >
                    {c.cell(r)}
                  </td>
                ))}
              </tr>
            ))}
            {slice.length === 0 && (
              <tr>
                <td colSpan={cols.length} className="text-center text-(--a2-ink-4)">
                  <span className="block py-6">{empty}</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-(--a2-line) bg-(--a2-raised) px-2.5 py-1.5">
        <span className="a2-t-xs text-(--a2-ink-3)">
          <span className="a2-num">
            {from}–{to}
          </span>{" "}
          / <span className="a2-num">{shown.length.toLocaleString("ko-KR")}</span>
        </span>
        <div className="flex items-center gap-1.5">
          <label className="inline-flex items-center gap-1.5">
            <span className="a2-label">쪽당</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(0);
              }}
              className="a2-select h-[26px] w-auto text-[0.6875rem]"
            >
              {[25, 50, 100].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={at === 0}
            className="a2-btn a2-btn-sm"
          >
            이전
          </button>
          <span className="a2-num a2-t-xs text-(--a2-ink-3)">
            {at + 1} / {pages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
            disabled={at >= pages - 1}
            className="a2-btn a2-btn-sm"
          >
            다음
          </button>
        </div>
      </div>
    </div>
  );
}
