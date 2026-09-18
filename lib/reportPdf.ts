"use client";

/**
 * 보고서 지면(.rp-page)을 A4 PDF 파일로 내려받는다.
 *
 * 브라우저 인쇄 창에서 「PDF로 저장」을 고르게 하면 여백·배경 그래픽 설정을 사람이 맞춰야
 * 해서, 누르면 바로 파일이 떨어지게 한다. 지면마다 그림으로 떠서(html-to-image) 한 장씩
 * 붙인다(jsPDF) — 글자를 고를 수는 없지만 화면과 똑같이 나온다.
 *
 * ── 글꼴 ──
 *   그림으로 뜰 때는 웹 글꼴을 파일째 심어야 한다. 한글 글꼴은 글자 범위별로 수백 조각이라
 *   다 심으면 수십 MB가 되므로, **이 창에서 이미 내려받은 조각만** 골라 심는다
 *   (document.fonts에서 loaded인 것과 같은 family·weight·unicode-range의 @font-face).
 */

const A4_PX = { width: 794, height: 1123 };

const norm = (s: string) => s.replace(/["'\s]/g, "").toLowerCase();

async function dataUrl(url: string) {
  const blob = await (await fetch(url)).blob();
  return new Promise<string>((ok, fail) => {
    const reader = new FileReader();
    reader.onload = () => ok(String(reader.result));
    reader.onerror = fail;
    reader.readAsDataURL(blob);
  });
}

async function fontEmbedCss() {
  const loaded = new Set<string>();
  document.fonts.forEach((f) => {
    if (f.status === "loaded")
      loaded.add(`${norm(f.family)}|${norm(f.weight)}|${norm(f.unicodeRange)}`);
  });

  const out: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of Array.from(rules)) {
      if (!(rule instanceof CSSFontFaceRule)) continue;
      const st = rule.style;
      const key = `${norm(st.getPropertyValue("font-family"))}|${norm(
        st.getPropertyValue("font-weight") || "normal",
      )}|${norm(st.getPropertyValue("unicode-range") || "U+0-10FFFF")}`;
      if (!loaded.has(key)) continue;
      const m = st.getPropertyValue("src").match(/url\(["']?([^"')]+)["']?\)/);
      if (!m) continue;
      try {
        const url = new URL(m[1], sheet.href ?? location.href).href;
        out.push(rule.cssText.replace(m[0], `url(${await dataUrl(url)})`));
      } catch {
        /* 조각 하나를 못 읽으면 그 글자만 대체 글꼴로 나온다 — 저장 자체는 막지 않는다 */
      }
    }
  }
  return out.join("\n");
}

export async function saveReportPdf(pages: HTMLElement[], fileName: string) {
  const [{ toJpeg }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
  await document.fonts.ready;
  const fontCss = await fontEmbedCss();

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  for (let i = 0; i < pages.length; i++) {
    const img = await toJpeg(pages[i], {
      ...A4_PX,
      pixelRatio: 2,
      quality: 0.92,
      fontEmbedCSS: fontCss,
      /* 화면에서 줄여 보이는 배율과 그림자는 종이에 옮기지 않는다 */
      style: { zoom: "1", boxShadow: "none", margin: "0" },
    });
    if (i > 0) pdf.addPage();
    pdf.addImage(img, "JPEG", 0, 0, 210, 297);
  }
  pdf.save(`${fileName}.pdf`);
}
