"use client";

import { gradeText, levelSpecs } from "./blueprint";
import { downloadCsv, stampedName } from "./csv";
import {
  AI_AUDIT_MAX,
  aiVerdictLabel,
  rejectLabel,
  reviewChecks,
  type ItemDraft,
} from "./itemStore";

/**
 * AI 검수 결과 — 인쇄 · 다운로드 (EXP-03-2, 2026-09-21 협의).
 *
 * 검수자는 결과를 종이로 뽑아 문항 옆에 두고 보거나, 출제 회의에 들고 간다. 화면에서만 볼 수
 * 있으면 그 자리에서 문항을 열어 놓고 한 줄씩 옮겨 적게 된다.
 *
 * 인쇄는 숨긴 iframe에 결과표를 그려 그 안에서 print()를 부른다. 새 창을 열면 팝업 차단에
 * 걸리고, 콘솔 화면을 통째로 인쇄하면 메뉴 · 도구 줄까지 종이에 나온다.
 *
 * ⚠ 정답 · 보기는 싣지 않는다. 소견 문장이 「정답 보기가 가장 깁니다」처럼 정답을 짚을 수는
 *   있지만 정답 자체를 옮기지는 않는다 — 뽑은 종이가 돌아다녀도 문항이 새지 않게.
 */

const checkLabel = (id: string) => reviewChecks.find((c) => c.id === id)?.label ?? id;

const has = (i: ItemDraft): i is ItemDraft & { aiAudit: NonNullable<ItemDraft["aiAudit"]> } =>
  !!i.aiAudit;

/** CSV — 소견 한 줄이 한 행이다. 걸린 것이 없는 갈래도 「통과」 한 행을 남긴다 */
export function downloadAuditCsv(items: ItemDraft[]) {
  const rows = items.filter(has).flatMap((i) => {
    const a = i.aiAudit;
    const base = [
      i.code || i.id,
      i.subject,
      gradeText(i.gradeNo),
      i.level,
      `${a.round ?? i.aiAuditCount ?? 1}/${AI_AUDIT_MAX}`,
      a.at,
      aiVerdictLabel[a.verdict],
      a.code ? rejectLabel(a.code) : "",
    ];
    return a.checks.flatMap((c) =>
      c.notes.length === 0
        ? [[...base, checkLabel(c.id), "통과", ""]]
        : c.notes.map((note) => [...base, checkLabel(c.id), c.ok ? "확인 필요" : "걸림", note]),
    );
  });
  downloadCsv(
    "AI검수결과",
    ["문항 ID", "과목", "학년", "단계", "AI 검수 회차", "검수 시각", "권고", "대표 사유", "갈래", "판정", "소견"],
    rows,
  );
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function itemHtml(i: ItemDraft & { aiAudit: NonNullable<ItemDraft["aiAudit"]> }) {
  const a = i.aiAudit;
  const checks = a.checks
    .map(
      (c) => `
      <tr>
        <th>${esc(checkLabel(c.id))}</th>
        <td class="${c.notes.length === 0 ? "ok" : c.ok ? "warn" : "bad"}">${
          c.notes.length === 0 ? "통과" : c.ok ? "확인 필요" : "걸림"
        }</td>
        <td>${c.notes.length === 0 ? "—" : c.notes.map((n) => `<div>${esc(n)}</div>`).join("")}</td>
      </tr>`,
    )
    .join("");
  return `
  <section>
    <h2>${esc(i.code || i.id)} <small>${esc(i.subject)} · ${gradeText(i.gradeNo)} · ${i.level} ${esc(
      levelSpecs[i.level].name,
    )}</small></h2>
    <p class="meta">AI 검수 ${a.round ?? i.aiAuditCount ?? 1}/${AI_AUDIT_MAX}회 · ${esc(a.at)} · 권고 <b>${
      aiVerdictLabel[a.verdict]
    }</b> · 규칙 위반 ${a.blocks} · 확인 필요 ${a.warns}${
      a.code ? ` · 대표 사유 ${esc(rejectLabel(a.code))}` : ""
    }</p>
    <p class="stem">${esc(i.stem || "발문 없음")}</p>
    <table>
      <thead><tr><th>갈래</th><th>판정</th><th>소견 → 고칠 곳</th></tr></thead>
      <tbody>${checks}</tbody>
    </table>
  </section>`;
}

export function printAudit(items: ItemDraft[], title = "AI 문항 검수 결과") {
  const list = items.filter(has);
  if (list.length === 0) return;
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<title>${esc(stampedName(title.replace(/\s+/g, "_"), "pdf").replace(/\.pdf$/, ""))}</title>
<style>
  @page { size: A4; margin: 14mm; }
  body { font-family: "Noto Sans KR", "Malgun Gothic", sans-serif; color: #111; font-size: 11px; line-height: 1.55; }
  h1 { font-size: 16px; margin: 0 0 2px; }
  .sub { color: #555; margin: 0 0 14px; }
  section { break-inside: avoid; border-top: 1.5px solid #111; padding-top: 8px; margin-bottom: 16px; }
  h2 { font-size: 13px; margin: 0; font-family: "IBM Plex Mono", monospace; }
  h2 small { font-family: inherit; font-weight: 400; color: #555; font-size: 11px; margin-left: 6px; }
  .meta { margin: 2px 0 4px; color: #333; }
  .stem { margin: 0 0 6px; color: #333; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #bbb; padding: 4px 6px; text-align: left; vertical-align: top; }
  thead th { background: #f2f2f2; }
  tbody th { width: 9.5em; font-weight: 600; }
  td.ok { color: #1a7f37; width: 5em; } td.warn { color: #9a6700; width: 5em; } td.bad { color: #cf222e; width: 5em; font-weight: 700; }
  .note { margin-top: 18px; color: #666; font-size: 10px; }
</style></head><body>
<h1>${esc(title)}</h1>
<p class="sub">${list.length}문항 · 출력 ${esc(new Date().toLocaleString("ko-KR"))}</p>
${list.map(itemHtml).join("")}
<p class="note">AI 검수는 규칙 대조 결과이며 결론이 아닙니다. 승인 · 반려는 검수자가 합니다. 교과 내용의 정확성과 학년 이독성은 규칙으로 가려지지 않습니다.</p>
</body></html>`;

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc) return frame.remove();
  doc.open();
  doc.write(html);
  doc.close();
  const go = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    /* 인쇄 창이 닫힌 뒤에 치운다 — 바로 지우면 몇몇 브라우저가 빈 종이를 낸다 */
    setTimeout(() => frame.remove(), 60_000);
  };
  if (doc.readyState === "complete") setTimeout(go, 50);
  else frame.onload = go;
}
