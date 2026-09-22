/**
 * CSV 내려받기 — 콘솔의 표를 엑셀에서 여는 파일로.
 *
 * 앞에 BOM(﻿)을 붙인다. 없으면 엑셀이 파일을 CP949로 읽어 한글이 전부 깨진다.
 * 칸 안에 쉼표 · 따옴표 · 줄바꿈이 있으면 따옴표로 감싸고 안의 따옴표는 두 번 쓴다(RFC 4180).
 *
 * ⚠ 수식 주입 — =·+·-·@로 시작하는 칸은 엑셀이 수식으로 실행한다. 발문이나 이름에 그런 글이
 *   들어오면 내려받은 사람의 엑셀에서 돌아가므로 앞에 작은따옴표를 붙여 글자로 둔다.
 */

export type CsvCell = string | number | boolean | null | undefined;

function cell(v: CsvCell): string {
  if (v === null || v === undefined) return "";
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(head: string[], rows: CsvCell[][]): string {
  return [head, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
}

/** 오늘 날짜를 파일 이름 끝에 붙인다 — 같은 날 여러 번 받아도 어느 날 것인지는 남는다 */
export function stampedName(base: string, ext = "csv") {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${base}_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}.${ext}`;
}

export function downloadText(name: string, text: string, type = "text/csv;charset=utf-8") {
  const blob = new Blob(["﻿", text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  /* 바로 풀면 몇몇 브라우저에서 내려받기가 시작되기 전에 주소가 사라진다 */
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadCsv(base: string, head: string[], rows: CsvCell[][]) {
  downloadText(stampedName(base), toCsv(head, rows));
}
