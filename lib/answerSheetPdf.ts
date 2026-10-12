"use client";

import { fontEmbedCss } from "./reportPdf";

/**
 * 정오표를 A4 PDF 파일로 내려받는다.
 *
 * 보고서 PDF(lib/reportPdf.ts)와 같은 방법이다 — 종이를 그림으로 떠서(html-to-image) 한 장씩
 * 붙인다(jsPDF). 한글 글꼴을 PDF에 심지 않아도 화면과 똑같이 나온다.
 *
 * 다른 점은 **길이가 정해져 있지 않다**는 것이다. 보고서는 지면이 A4 한 장씩으로 짜여 있지만
 * 정오표는 긴 글과 사진이 줄 안에 들어가 과목마다 길이가 다르다. 그래서 과목 한 벌을 긴 그림
 * 한 장으로 뜬 다음 **표의 줄 경계에서** 잘라 쪽을 나눈다 — 쪽 높이로만 자르면 글 한 줄이나
 * 사진 한 장이 두 쪽에 걸친다. 둘째 쪽부터는 표 머리(문항 · 정답 · 내 답 · 정오)를 다시 얹는다.
 */

/** A4와 여백(mm) */
const PAGE = { width: 210, height: 297, margin: 14 };
/** 그림으로 뜰 때의 배율 — 2배면 인쇄해도 글자가 뭉개지지 않는다 */
const RATIO = 2;

export async function saveAnswerSheetPdf(sheets: HTMLElement[], fileName: string) {
  if (sheets.length === 0) return;
  const [{ toCanvas }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
  await document.fonts.ready;
  const fontCss = await fontEmbedCss();

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  const inner = { width: PAGE.width - PAGE.margin * 2, height: PAGE.height - PAGE.margin * 2 };
  let blank = true;

  for (const sheet of sheets) {
    const top = sheet.getBoundingClientRect().top;
    const width = sheet.offsetWidth;
    const total = sheet.offsetHeight;
    if (!width || !total) continue;

    /* 종이 한 쪽에 들어가는 높이 — 화면 px로 */
    const pageHeight = (inner.height * width) / inner.width;
    const head = sheet.querySelector("thead")?.getBoundingClientRect();
    const headAt = head ? { from: head.top - top, to: head.bottom - top } : null;
    /* 자를 수 있는 자리 — 줄마다 그 아래 끝 */
    const cuts = Array.from(sheet.querySelectorAll("tbody > tr")).map(
      (row) => row.getBoundingClientRect().bottom - top,
    );

    const whole = await toCanvas(sheet, {
      width,
      height: total,
      pixelRatio: RATIO,
      backgroundColor: "#ffffff",
      fontEmbedCSS: fontCss,
    });

    let from = 0;
    for (let page = 0; from < total - 1; page++) {
      /* 둘째 쪽부터는 표 머리를 다시 얹는다 */
      const repeat = page > 0 && headAt ? headAt.to - headAt.from : 0;
      const room = pageHeight - repeat;
      const fit = cuts.filter((c) => c > from + 1 && c <= from + room);
      const to =
        total - from <= room
          ? total
          : fit.length > 0
            ? fit[fit.length - 1]
            : /* 한 줄이 한 쪽보다 길다 — 줄 안에서라도 자른다 */
              from + room;

      const slice = document.createElement("canvas");
      slice.width = Math.round(width * RATIO);
      slice.height = Math.round((repeat + to - from) * RATIO);
      const ctx = slice.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, slice.width, slice.height);
      if (repeat && headAt) {
        ctx.drawImage(
          whole,
          0,
          headAt.from * RATIO,
          width * RATIO,
          repeat * RATIO,
          0,
          0,
          width * RATIO,
          repeat * RATIO,
        );
      }
      ctx.drawImage(
        whole,
        0,
        from * RATIO,
        width * RATIO,
        (to - from) * RATIO,
        0,
        repeat * RATIO,
        width * RATIO,
        (to - from) * RATIO,
      );

      if (!blank) pdf.addPage();
      blank = false;
      pdf.addImage(
        slice.toDataURL("image/jpeg", 0.92),
        "JPEG",
        PAGE.margin,
        PAGE.margin,
        inner.width,
        ((repeat + to - from) * inner.width) / width,
      );
      from = to;
    }
  }

  pdf.save(`${fileName}.pdf`);
}
