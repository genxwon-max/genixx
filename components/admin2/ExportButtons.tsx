"use client";

import { downloadCsv, type CsvCell } from "@/lib/csv";
import { downloadXlsx } from "@/lib/xlsx";

/**
 * 「CSV 다운로드」 · 「엑셀 다운로드」 두 단추 (2026-10-28 사용자 요청: 「관리자 페이지의 리스트 화면은 모두
 * CSV나 엑셀로 데이터를 추출할 수 있게」).
 *
 * 목록 표(DataTable)는 늘 이 두 단추를 세우고, 손으로 짠 표는 TableBox의 download로 세운다. 값은 누르는 순간에
 * 읽는다(data) — 미리 만들어 두면 거르개를 바꿀 때마다 파일 한 벌을 새로 짓게 된다.
 *
 * 파일 이름을 넘기지 않으면 그 화면의 제목(h1)을 쓴다. 목록마다 이름을 적어 두게 하면 새 목록에서 반드시
 * 빠뜨린다.
 */
export type ExportData = { head: string[]; rows: CsvCell[][] };

export function pageFileName() {
  const h1 = document.querySelector("main h1, h1")?.textContent?.trim();
  return (h1 || document.title.split(/[·|]/)[0].trim() || "목록").replace(/[\\/:*?"<>|]/g, " ");
}

export default function ExportButtons({
  name,
  count,
  data,
}: {
  /** 파일 이름 앞부분 — 없으면 화면 제목 */
  name?: string;
  /** 내려받을 줄 수 — 0이면 단추를 끈다. 손으로 짠 표처럼 모르면 넘기지 않는다 */
  count?: number;
  data: () => ExportData;
}) {
  const run = (kind: "csv" | "xlsx") => {
    const { head, rows } = data();
    const base = name || pageFileName();
    if (kind === "csv") downloadCsv(base, head, rows);
    else downloadXlsx(base, head, rows);
  };
  const title =
    count === undefined
      ? "이 표를 내려받습니다"
      : `지금 조건의 결과 ${count.toLocaleString("ko-KR")}건을 내려받습니다`;
  return (
    <>
      <button
        type="button"
        className="a2-btn a2-btn-sm"
        disabled={count === 0}
        title={title}
        onClick={() => run("csv")}
      >
        CSV 다운로드
      </button>
      <button
        type="button"
        className="a2-btn a2-btn-sm"
        disabled={count === 0}
        title={title}
        onClick={() => run("xlsx")}
      >
        엑셀 다운로드
      </button>
    </>
  );
}

/**
 * 손으로 짠 표에서 값을 읽는다 — 화면에 보이는 글자 그대로. 머리가 빈 칸(손잡이 · 체크상자 칸)은 뺀다.
 * 숫자만 있는 칸은 숫자로 넣어 엑셀에서 더하고 세울 수 있게 한다.
 */
export function readTable(table: HTMLTableElement): ExportData {
  const heads = [...table.querySelectorAll("thead tr:last-child th")].map((th) =>
    (th as HTMLElement).innerText.replace(/[↕▲▼]/g, "").trim(),
  );
  const keep = heads.map((h, i) => (h ? i : -1)).filter((i) => i >= 0);
  const rows = [...table.querySelectorAll("tbody tr")]
    .map((tr) => [...tr.children] as HTMLElement[])
    /* 「항목이 없습니다」 같은 한 칸짜리 줄은 데이터가 아니다 */
    .filter((cells) => cells.length >= keep.length && !(cells.length === 1 && heads.length > 1))
    .map((cells) =>
      keep.map((i) => {
        const t = (cells[i]?.innerText ?? "").replace(/\s*\n\s*/g, " ").trim();
        /* 앞의 0이 뜻을 가진 값(0012 · 접속코드)과 열다섯 자리를 넘는 번호는 글자로 둔다 */
        return /^-?(0|[1-9]\d{0,14})(\.\d+)?$/.test(t) ? Number(t) : t;
      }),
    );
  return { head: keep.map((i) => heads[i]), rows };
}
