"use client";

import { gradeText, levelSpecs } from "./blueprint";
import { buildCardReport, reportStatusLabel, sectionName } from "./cardReport";
import { downloadCsv, stampedName } from "./csv";
import { AI_AUDIT_MAX, aiVerdictLabel, type ItemDraft } from "./itemStore";

/**
 * AI 검수 보고서 — 인쇄 · 다운로드 (EXP-03-2).
 *
 * 보고서 내용은 lib/cardReport.ts가 문항 카드 항목마다 만든다. 여기는 그것을 종이 · 파일로 내보낸다.
 * 검수자는 보고서를 뽑아 문항 옆에 두고 보거나 출제 회의에 들고 간다.
 *
 * 인쇄는 숨긴 iframe에 보고서를 그려 그 안에서 print()를 부른다. 새 창을 열면 팝업 차단에 걸리고,
 * 콘솔 화면을 통째로 인쇄하면 메뉴 · 도구 줄까지 종이에 나온다.
 *
 * ⚠ 정답 · 보기 글은 싣지 않는다(「정답 2번」 같은 요약만). 뽑은 종이가 돌아다녀도 문항이 새지 않게.
 */

const has = (i: ItemDraft) => !!i.aiAudit;

const roundOf = (i: ItemDraft) => `${i.aiAudit?.round ?? i.aiAuditCount ?? 1}/${AI_AUDIT_MAX}`;

/** CSV — 보고서 항목 한 줄이 한 행이다 */
export function downloadAuditCsv(items: ItemDraft[]) {
  const rows = items.filter(has).flatMap((i) =>
    buildCardReport(i).sections.map((s) => [
      i.code || i.id,
      i.subject,
      gradeText(i.gradeNo),
      roundOf(i),
      i.aiAudit!.at,
      aiVerdictLabel[i.aiAudit!.verdict],
      sectionName(s),
      reportStatusLabel[s.status],
      s.written.replace(/정답 \d+번/, "정답 ○번"),
      s.findings.map((f) => `${f.text} → ${f.fix}`).join(" / "),
    ]),
  );
  downloadCsv(
    "AI검수보고서",
    ["문항 ID", "과목", "학년", "AI 검수 회차", "검수 시각", "권고", "카드 항목", "판정", "카드에 적힌 것", "소견 → 고칠 곳"],
    rows,
  );
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function itemHtml(i: ItemDraft) {
  const r = buildCardReport(i);
  const a = i.aiAudit!;
  const rows = r.sections
    .map(
      (s) => `
      <tr>
        <th>${esc(sectionName(s))}</th>
        <td class="${s.status}">${reportStatusLabel[s.status]}</td>
        <td>${esc(s.written.replace(/정답 \d+번/, "정답 ○번"))}</td>
        <td>${s.findings.length ? s.findings.map((f) => `<div>${esc(f.text)} <span class="fix">→ ${esc(f.fix)}</span></div>`).join("") : "—"}</td>
      </tr>`,
    )
    .join("");
  return `
  <section>
    <h2>${esc(i.code || i.id)} <small>${esc(i.subject)} · ${gradeText(i.gradeNo)} · ${i.level} ${esc(levelSpecs[i.level].name)}</small></h2>
    <p class="meta">AI 검수 ${roundOf(i)}회 · ${esc(a.at)} · 권고 <b>${aiVerdictLabel[a.verdict]}</b> · 보완 필요 ${r.fails} · 확인 필요 ${r.warns} · 적합 ${r.sections.length - r.fails - r.warns}</p>
    <table>
      <thead><tr><th>문항 카드 항목</th><th>판정</th><th>카드에 적힌 것</th><th>소견 → 고칠 곳</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

export function printAudit(items: ItemDraft[], title = "AI 문항 검수 보고서") {
  const list = items.filter(has);
  if (list.length === 0) return;
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<title>${esc(stampedName(title.replace(/\s+/g, "_"), "pdf").replace(/\.pdf$/, ""))}</title>
<style>
  @page { size: A4; margin: 14mm; }
  body { font-family: "Noto Sans KR", "Malgun Gothic", sans-serif; color: #111; font-size: 10.5px; line-height: 1.5; }
  h1 { font-size: 16px; margin: 0 0 2px; }
  .sub { color: #555; margin: 0 0 14px; }
  section { border-top: 1.5px solid #111; padding-top: 8px; margin-bottom: 18px; }
  h2 { font-size: 13px; margin: 0; font-family: "IBM Plex Mono", monospace; }
  h2 small { font-family: inherit; font-weight: 400; color: #555; font-size: 11px; margin-left: 6px; }
  .meta { margin: 2px 0 6px; color: #333; }
  table { width: 100%; border-collapse: collapse; }
  tr { break-inside: avoid; }
  th, td { border: 1px solid #bbb; padding: 4px 6px; text-align: left; vertical-align: top; }
  thead th { background: #f2f2f2; }
  tbody th { width: 9em; font-weight: 600; }
  td.ok { color: #1a7f37; width: 5em; } td.warn { color: #9a6700; width: 5em; font-weight: 600; } td.fail { color: #cf222e; width: 5em; font-weight: 700; }
  .fix { color: #555; }
  .note { margin-top: 18px; color: #666; font-size: 10px; }
</style></head><body>
<h1>${esc(title)}</h1>
<p class="sub">${list.length}문항 · 출력 ${esc(new Date().toLocaleString("ko-KR"))}</p>
${list.map(itemHtml).join("")}
<p class="note">AI 검수 보고서는 문항 카드를 규칙으로 대조한 결과이며 결론이 아닙니다. 승인 · 반려는 검수자가 합니다. 교과 내용의 정확성과 학년 이독성은 규칙으로 가려지지 않습니다.</p>
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
