"use client";

import { useMemo, useState } from "react";

import { downloadCsv, type CsvCell } from "@/lib/csv";
import TableBox from "./TableBox";

/**
 * 표 하나 — 검색 · 거르개 · 정렬 · 쪽 넘김을 한 덩어리로.
 *
 * 관리 도구의 표는 거의 같은 일을 한다. 화면마다 손으로 짜면 어느 표는 정렬이 되고
 * 어느 표는 안 되는 상태가 되므로, 열두 화면이 이 하나를 쓴다.
 *
 * ── 정한 것 ──
 *  · 검색은 `value`(사람이 보는 글자)를 이어 붙인 한 줄에서 찾는다. 칸마다 검색창을 두지 않는다.
 *  · 조회 조건은 **검색을 눌러야 걸린다.** 치는 대로 걸리게 두었더니 조건을 둘 이상 걸 때
 *    글자 하나마다 표가 다시 서서, 두 번째 조건을 고르는 동안 눈앞의 줄이 계속 바뀌었다.
 *    치고 고르는 값(draft)과 실제로 걸린 값을 갈라 들고, 검색을 누를 때 옮긴다.
 *    Enter도 같은 일을 한다 — 검색창에 치고 나서 손이 마우스로 가지 않게.
 *  · 정렬은 `sort`가 있으면 그것으로, 없으면 `value`로. **둘을 가른 까닭** — 하나로 쓰면
 *    학년·상태처럼 「보이는 글자 ≠ 세우는 순서」인 칸에서 한쪽이 반드시 깨진다. 실제로
 *    학년 정렬을 위해 숫자를 넣었더니 「초5」를 쳐도 0줄이 나오고 「11」을 치면 화면에
 *    없는 48줄이 걸렸다(중1의 자리 숫자).
 *  · 쪽 넘김은 25/50/100. 무한 스크롤을 쓰지 않는다 — 「아까 그 줄」로 못 돌아간다.
 *    쪽 번호를 열 개씩 늘어놓는다. 「이전 / 3 / 4 / 다음」만 두었더니 7쪽으로 가려면
 *    다음을 네 번 눌러야 했다. 넉 장짜리 표에서는 티가 안 나지만 148줄·6쪽부터는 다르다.
 *  · No 칸(일련번호)은 **늘 선다.** 켜고 끄는 값으로 두었더니 새 목록을 만들 때마다
 *    빠뜨렸고, 어느 화면에는 있고 어느 화면에는 없는 칸이 되었다.
 *    **큰 수가 위로 온다** — 첫 줄이 곧 전체 개수이고 마지막 줄이 1이다. 목록을 열자마자
 *    「지금 몇 개인가」가 왼쪽 위에 서 있어야 해서다. 세는 것은 거르고 난 뒤의 목록이라
 *    거르개를 걸면 그 순간의 줄 수에서 다시 시작한다.
 *    첫 칸에 제 번호를 세우는 표(문항 ID·케이스·로그 ID)에서도 둘이 하는 일은 다르다 —
 *    저쪽은 그 줄의 이름이고, No는 이 목록에서 몇 번째인가다.
 *  · 한 쪽에 세운 줄은 **전부 그린다.** 표 안에 세로 스크롤 상자를 두지 않는다 —
 *    쪽당 25로 두고도 열넷쯤에서 잘려 상자를 굴려야 했고, 그러면 「25줄을 본다」는 말이
 *    화면에서 지켜지지 않는다. 길어진 만큼은 화면(page)이 굴러간다.
 *  · 머리 행은 그 화면 스크롤에 붙는다(sticky · 상단 바 아래 40px). 200줄을 내려도 무슨
 *    칸인지 안 잊는다. 붙이려면 표를 감싼 상자가 스크롤 컨테이너가 아니어야 해서, 표가
 *    좁아 가로 스크롤이 필요 없을 때만 overflow-x를 끈다 — 아래 useEffect가 하는 일이다.
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

/**
 * CSV 내려받기 — 도구 줄 오른쪽에 「CSV 다운로드」를 세운다.
 *
 * 내려받는 것은 **지금 걸린 조건의 결과 전부**다(쪽 넘김과 상관없이, 정렬한 차례대로).
 * 25줄만 받으려고 누르는 사람은 없고, 거르개를 걸고 누른 사람은 그 결과를 원한다.
 *
 * 칸은 따로 주지 않으면 표의 칸 중 value가 있는 것을 그대로 쓴다 — 화면에서 보는 글자가
 * 곧 파일의 글자다. 화면에 없는 값(전화 · 가입 경로 …)까지 넣어야 하면 cols로 준다.
 */
export type CsvSpec<T> = {
  /** 파일 이름 앞부분 — 뒤에 오늘 날짜가 붙는다 */
  name: string;
  cols?: { head: string; value: (row: T) => CsvCell }[];
};

export type Filter<T> = {
  id: string;
  label: string;
  options: { value: string; label: string }[];
  match: (row: T, value: string) => boolean;
};

/**
 * 줄 고르기 — **고르는 표에만** 준다.
 *
 * 이 콘솔의 표는 대개 훑는 표다. 줄마다 누를 것이 생기면 훑는 일이 고르는 일로 바뀌므로
 * 체크상자를 기본으로 두지 않는다(admin2.css의 .a2-choice 주석과 같은 까닭). 다만
 * 「목록에서 여럿 골라 한 번에 넣는다」가 곧 그 화면이 하는 일인 자리가 있다 — 검사지에
 * 문항을 담는 표가 그것이다. 그때만 이 값을 넘겨 첫 칸에 체크상자를 세운다.
 *
 * 고른 것을 표가 들고 있지 않는다. 부르는 쪽이 들고 있어야 「고른 것 담기」 단추도, 담고
 * 나서 비우는 일도 표 밖에서 된다 — 표가 들고 있으면 담긴 뒤에도 체크가 남는다.
 *
 * 머리의 체크상자는 **지금 쪽에 보이는 줄**만 켠다. 걸러 낸 전체를 켜면 200줄이 한 번에
 * 딸려 오는데, 그것을 되돌리려면 다시 200줄을 꺼야 한다.
 */
export type Selection<T> = {
  /** 고른 줄의 열쇠 (getKey가 낸 값) */
  chosen: string[];
  /** 한 줄 켜고 끄기 */
  onToggle: (key: string) => void;
  /** 지금 쪽에 보이는 줄 전부 — on이면 넣고 아니면 뺀다 */
  onToggleMany: (keys: string[], on: boolean) => void;
  /** 체크상자에 읽어 줄 이름. 없으면 열쇠를 읽는다 */
  labelOf?: (row: T) => string;
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
  showCount = true,
  toolbarExtra,
  selection,
  csv,
  empty = "조건에 맞는 줄이 없습니다.",
}: {
  rows: T[];
  cols: Col<T>[];
  getKey: (row: T) => string;
  filters?: Filter<T>[];
  search?: boolean;
  searchHint?: string;
  pageSize?: number;
  /**
   * 도구 줄에 「N줄」을 적을지.
   *
   * 기본은 적는다 — 거르개를 걸고 몇 줄이 남았는지가 곧 답일 때가 많다. 다만 화면 위에
   * 이미 같은 수가 서 있으면(상태 탭의 개수 알약 같은 것) 같은 값이 한 화면에 세 번
   * 적히므로, 그런 화면만 끈다. 끄더라도 쪽 넘김 줄의 「1–3 / 3」은 그대로 남는다.
   */
  showCount?: boolean;
  /** 도구 줄 오른쪽에 붙일 것 — 내려받기·새로 만들기 */
  toolbarExtra?: React.ReactNode;
  /** 줄마다 체크상자를 세운다 — 고르는 표에만 */
  selection?: Selection<T>;
  /** 도구 줄에 CSV 내려받기를 세운다 */
  csv?: CsvSpec<T>;
  empty?: string;
}) {
  /* 실제로 걸린 조건 — 표는 이것만 본다 */
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Record<string, string>>({});
  /* 치고 고르는 중인 조건. 검색을 눌러야 위로 옮겨진다 */
  const [draftQ, setDraftQ] = useState("");
  const [draftPicked, setDraftPicked] = useState<Record<string, string>>({});
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

  /* 쪽 번호는 열 개씩 묶어 보여 준다. 넉 장짜리 표에서는 다 보이지만, 쪽당 25로
     4,000줄을 보면 160장이라 다 늘어놓으면 쪽 넘김 줄이 표보다 길어진다.
     묶음은 지금 쪽이 든 열 개다 — 7쪽에서는 1~10, 13쪽에서는 11~20. */
  const BLOCK = 10;
  const blockAt = Math.floor(at / BLOCK) * BLOCK;
  const block = Array.from({ length: Math.min(BLOCK, pages - blockAt) }, (_, i) => blockAt + i);

  /* 고른 것 — 표는 들고 있지 않고 부르는 쪽의 목록을 되비추기만 한다.
     머리의 체크상자는 지금 쪽에 보이는 줄만 본다(Selection 주석). */
  const chosenSet = useMemo(() => new Set(selection?.chosen ?? []), [selection?.chosen]);
  const pageKeys = slice.map(getKey);
  const pageAllOn = pageKeys.length > 0 && pageKeys.every((k) => chosenSet.has(k));
  const pageSomeOn = pageKeys.some((k) => chosenSet.has(k));

  /** 지금 고른 것과 걸린 것이 다른가 — 다르면 검색을 눌러야 한다고 알려 준다 */
  const dirty =
    draftQ !== q || filters.some((f) => (draftPicked[f.id] ?? "") !== (picked[f.id] ?? ""));
  /** 무엇이든 걸려 있는가 — 걸린 것이 있어야 「조건 지우기」를 낸다 */
  const active = q.trim() !== "" || Object.values(picked).some(Boolean);

  const apply = () => {
    setQ(draftQ);
    setPicked(draftPicked);
    /* 조건이 바뀌면 첫 쪽으로. 3쪽에서 조건을 좁히면 남은 줄이 한 쪽뿐인데 3쪽에
       머물러 빈 표를 보게 된다 */
    setPage(0);
  };

  const clear = () => {
    setDraftQ("");
    setDraftPicked({});
    setQ("");
    setPicked({});
    setPage(0);
  };

  const toggleSort = (c: Col<T>) => {
    if (!c.sort && !c.value) return;
    if (sortKey === c.key) setAsc((v) => !v);
    else {
      setSortKey(c.key);
      setAsc(true);
    }
    setPage(0);
  };

  const exportCsv = () => {
    if (!csv) return;
    const spec =
      csv.cols ??
      cols
        .filter((c) => c.value && c.head.trim())
        .map((c) => ({ head: c.head, value: (r: T) => c.value!(r) }));
    downloadCsv(
      csv.name,
      spec.map((c) => c.head),
      shown.map((r) => spec.map((c) => c.value(r))),
    );
  };

  /* 판 껍데기를 두르지 않는다 — 본문 전체가 이미 판 하나다(Shell). 도구 줄·쪽 넘김 줄의
     가로선은 그대로 남는다: 그것은 판 테두리가 아니라 칸막이다 */
  return (
    <div className="overflow-clip">
      {(search || filters.length > 0 || toolbarExtra || csv) && (
        <div className="a2-toolbar">
          {/* 이 띠가 무엇을 하는 자리인지 이름표로 못 박는다. 없을 때는 검색창과 고르개가
              표 바로 위에 떠 있어 처음 여는 사람이 표의 머리로 읽었다 */}
          <span className="a2-label a2-query-label">조회 조건</span>
          {search && (
            <input
              value={draftQ}
              onChange={(e) => setDraftQ(e.target.value)}
              /* 치고 나서 Enter로 바로 건다. 이것이 없으면 손이 검색 단추까지 갔다 온다 */
              onKeyDown={(e) => {
                if (e.key === "Enter") apply();
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
                value={draftPicked[f.id] ?? ""}
                onChange={(e) => setDraftPicked((v) => ({ ...v, [f.id]: e.target.value }))}
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

          <button type="button" onClick={apply} className="a2-btn a2-btn-sm a2-btn-primary">
            검색
          </button>

          {(active || dirty) && (
            <button type="button" onClick={clear} className="a2-btn a2-btn-sm">
              조건 지우기
            </button>
          )}

          {/* 거르개를 걸고 몇 줄이 남았는지가 곧 답일 때가 많다. 11px 흐린 회색으로
              두었더니 거르개 사이에 묻혀 안 읽혔다 — 숫자만 한 눈금 키워 세운다.
              이 수는 **걸린 조건**의 결과다. 고르는 중인 값으로 세면 검색을 누르기도 전에
              줄 수가 바뀌어, 검색이 하는 일이 무엇인지 알 수 없게 된다 */}
          {showCount && (
            <span className="a2-t-sm text-(--a2-ink-3)">
              <span className="a2-num a2-t text-(--a2-ink)">
                {shown.length.toLocaleString("ko-KR")}
              </span>
              {shown.length !== rows.length && (
                <span> / 전체 {rows.length.toLocaleString("ko-KR")}</span>
              )}
              줄
            </span>
          )}

          {/* 고쳐 놓고 안 누른 사람에게. 이 줄이 없으면 조건을 고쳐 놓고 표가 그대로인 것을
              고장으로 읽는다 */}
          {dirty && (
            <span className="a2-t-xs" style={{ color: "var(--a2-warn)" }}>
              고친 조건은 검색을 눌러야 걸립니다
            </span>
          )}

          {(toolbarExtra || csv) && (
            <div className="ml-auto flex items-center gap-1.5">
              {toolbarExtra}
              {csv && (
                <button
                  type="button"
                  className="a2-btn a2-btn-sm"
                  disabled={shown.length === 0}
                  title={`지금 조건의 결과 ${shown.length.toLocaleString("ko-KR")}줄을 CSV로 내려받습니다`}
                  onClick={exportCsv}
                >
                  CSV 다운로드
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 세로로는 자르지 않는다. 한동안 calc(100vh - N)으로 상한을 두었는데, 화면마다
          표 위에 서는 것이 달라 N을 화면별로 넘겨야 했고 그러고도 25줄이 다 안 보였다.
          가로로만 밀리고, 그것도 표가 상자보다 넓을 때만이다(TableBox) */}
      <TableBox label={`${searchHint} 결과 ${shown.length}줄`}>
        <table className="a2-table">
          <thead>
            <tr>
              {selection && (
                <th scope="col" style={{ width: "2.25rem" }}>
                  {/* 반쯤 켜진 상태(indeterminate)는 DOM 속성으로만 있다. 상태로 들고 있으면
                      켜고 끌 때마다 다시 그리게 되므로 ref로 직접 얹는다 */}
                  <input
                    type="checkbox"
                    checked={pageAllOn}
                    ref={(el) => {
                      if (el) el.indeterminate = !pageAllOn && pageSomeOn;
                    }}
                    onChange={() => selection.onToggleMany(pageKeys, !pageAllOn)}
                    aria-label="이 쪽에 보이는 줄 전부 고르기"
                  />
                </th>
              )}
              <th scope="col" className="a2-th-num" style={{ width: "3.5rem" }}>
                No
              </th>
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
                           좁은 칸은 눌리는 넓이가 13%밖에 되지 않았다. 높이·좌우 여백은
                           th(--a2-head · padding 12px)를 그대로 따라간다 — px로 박아 두면
                           줄 높이를 올릴 때마다 다시 어긋난다.
                           정렬 중인 칸은 --a2-accent-2로 적는다. --a2-accent는 청회색
                           머리 띠 위에서 4.39까지 떨어진다(11px 굵은 글자) */
                        className={`-mx-3 inline-flex h-(--a2-head) w-[calc(100%+1.5rem)] items-center gap-1 px-3 font-bold ${
                          on ? "text-(--a2-accent-2)" : "hover:text-(--a2-ink)"
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
            {slice.map((r, i) => (
              <tr key={getKey(r)} data-on={selection && chosenSet.has(getKey(r)) ? "true" : undefined}>
                {selection && (
                  <td>
                    <input
                      type="checkbox"
                      checked={chosenSet.has(getKey(r))}
                      onChange={() => selection.onToggle(getKey(r))}
                      aria-label={`${selection.labelOf?.(r) ?? getKey(r)} 고르기`}
                    />
                  </td>
                )}
                {/* 내림차순이라 첫 줄이 곧 전체 개수다. 쪽을 넘겨도 이어진다 —
                    96줄짜리 목록의 2쪽 첫 줄은 71이다(96 − 25). 쪽마다 다시 세면
                    「일흔한 번째 줄」을 말로 가리킬 수 없다 */}
                <td className="a2-td-num a2-nowrap a2-t-sm text-(--a2-ink-3)">
                  {shown.length - (at * pageSize + i)}
                </td>
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
                <td colSpan={cols.length + 1 + (selection ? 1 : 0)} className="text-center text-(--a2-ink-4)">
                  <span className="block py-10">{empty}</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableBox>

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-(--a2-line) bg-(--a2-raised) px-3 py-2">
        {/* 쪽 번호 — [처음][이전] 1…10 [다음][마지막].
            setPage에 함수를 넘기지 않고 at을 기준으로 셈한다. page에는 마지막 쪽보다 큰
            수가 남아 있을 수 있고(거르개를 걸어 쪽 수가 줄어든 뒤), 그때 p-1은 화면에
            보이는 쪽의 앞 쪽이 아니다. */}
        <nav aria-label="쪽 넘김" className="flex flex-wrap items-center gap-0.5">
          <button type="button" onClick={() => setPage(0)} disabled={at === 0} className="a2-page">
            [처음]
          </button>
          <button type="button" onClick={() => setPage(at - 1)} disabled={at === 0} className="a2-page">
            [이전]
          </button>
          {block.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPage(n)}
              aria-current={n === at ? "page" : undefined}
              aria-label={`${n + 1}쪽`}
              className="a2-page a2-page-no"
            >
              {n + 1}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPage(at + 1)}
            disabled={at >= pages - 1}
            className="a2-page"
          >
            [다음]
          </button>
          <button
            type="button"
            onClick={() => setPage(pages - 1)}
            disabled={at >= pages - 1}
            className="a2-page"
          >
            [마지막]
          </button>
        </nav>

        <div className="flex items-center gap-3">
          <span className="a2-t-xs text-(--a2-ink-3)">
            <span className="a2-num">
              {from}–{to}
            </span>{" "}
            / <span className="a2-num">{shown.length.toLocaleString("ko-KR")}</span>
          </span>
          <label className="inline-flex items-center gap-1.5">
            <span className="a2-label">쪽당</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(0);
              }}
              className="a2-select h-[28px] w-auto text-[0.6875rem]"
            >
              {[25, 50, 100].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}
