"use client";

import { shrinkImage } from "./productStore";

/**
 * 한글(.hwpx) · 워드(.docx) 문서를 문서 편집기(components/admin2/DocEditor.tsx)로 불러온다.
 *
 * 출제위원은 지문과 문항을 한글이나 워드에서 먼저 쓴다. 그것을 콘솔 칸에 한 줄씩 옮겨 적게
 * 하면 표 · 그림 · 〈보기〉 상자를 다시 만드는 데 문항 하나에 몇 분씩 든다. 파일을 그대로
 * 올리면 문단 · 굵게/기울임/밑줄/위·아래 첨자 · 목록 · 표 · 그림을 옮겨 온다.
 *
 * ── 무엇으로 푸나 ──
 * 두 형식 모두 ZIP 안에 XML이다(HWPX는 OWPML, DOCX는 WordprocessingML). 라이브러리를 들이지
 * 않고 브라우저가 가진 것만 쓴다 — ZIP 목차는 손으로 읽고, 압축은 DecompressionStream
 * ('deflate-raw')으로 풀고, XML은 DOMParser로 읽는다. lib/richText.ts가 의존성 없이 가는 까닭과 같다.
 *
 * ── 옮기지 않는 것 ──
 *   · 글꼴 · 글자 크기 · 색 · 문단 정렬 — 응시 화면은 모든 문항을 같은 글꼴 · 크기로 그린다
 *   · 머리말 · 꼬리말 · 각주 · 쪽 번호 · 글상자 위치
 *   · EMF/WMF 같은 브라우저가 못 그리는 그림 — 몇 개를 건너뛰었는지 알려 준다
 *   · 옛 한글 형식(.hwp) — 한글에서 「다른 이름으로 저장 → HWPX」로 바꿔 올린다
 *
 * ── 한 칸짜리 표는 〈보기〉 상자로 ──
 * 한글로 만든 시험지는 〈보기〉를 1×1 표로 그리는 일이 흔하다. 한 칸짜리 표는 상자로 옮기고,
 * 첫 줄이 「〈보기〉」 · 「<보기>」 · 「보기」면 그 이름을 상자 이름으로 쓴다.
 *
 * 결과는 편집기에 바로 넣을 HTML 조각이다. 저장 전에 편집기가 블록으로 바꾼다(lib/docBlocks.ts).
 */

export type ImportResult = { html: string; skippedImages: number; warnings: string[] };

/* ───────────────────────── ZIP ───────────────────────── */

type ZipEntry = { name: string; method: number; size: number; offset: number };

function readZipIndex(buf: ArrayBuffer): Map<string, ZipEntry> {
  const v = new DataView(buf);
  /* 목차 끝 표지(EOCD)를 뒤에서부터 찾는다 — 끝에 주석이 붙으면 자리가 밀린다 */
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65_557); i--) {
    if (v.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("문서 파일이 아닙니다(ZIP 목차를 찾지 못했습니다).");
  const count = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  const out = new Map<string, ZipEntry>();
  for (let k = 0; k < count; k++) {
    if (v.getUint32(p, true) !== 0x02014b50) break;
    const method = v.getUint16(p + 10, true);
    const size = v.getUint32(p + 20, true);
    const nameLen = v.getUint16(p + 28, true);
    const extraLen = v.getUint16(p + 30, true);
    const commentLen = v.getUint16(p + 32, true);
    const offset = v.getUint32(p + 42, true);
    const name = dec.decode(new Uint8Array(buf, p + 46, nameLen));
    out.set(name, { name, method, size, offset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

async function readZipFile(buf: ArrayBuffer, e: ZipEntry): Promise<Uint8Array> {
  const v = new DataView(buf);
  const nameLen = v.getUint16(e.offset + 26, true);
  const extraLen = v.getUint16(e.offset + 28, true);
  const start = e.offset + 30 + nameLen + extraLen;
  const raw = new Uint8Array(buf, start, e.size);
  if (e.method === 0) return raw;
  if (e.method !== 8) throw new Error(`풀 수 없는 압축 방식입니다(${e.method}).`);
  const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

class Zip {
  private index: Map<string, ZipEntry>;
  constructor(private buf: ArrayBuffer) {
    this.index = readZipIndex(buf);
  }
  names() {
    return [...this.index.keys()];
  }
  has(name: string) {
    return this.index.has(name);
  }
  async bytes(name: string) {
    const e = this.index.get(name);
    return e ? readZipFile(this.buf, e) : null;
  }
  async text(name: string) {
    const b = await this.bytes(name);
    return b ? new TextDecoder().decode(b) : null;
  }
  async xml(name: string) {
    const t = await this.text(name);
    return t ? new DOMParser().parseFromString(t, "application/xml") : null;
  }
}

/* ───────────────────────── 공용 ───────────────────────── */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const kids = (el: Element, local?: string) =>
  Array.from(el.children).filter((c) => !local || c.localName === local);

const first = (el: Element, local: string): Element | null => {
  const all = el.getElementsByTagNameNS("*", local);
  return all.length ? all[0] : null;
};

type Marks = { b?: boolean; i?: boolean; u?: boolean; sup?: boolean; sub?: boolean };

function wrap(text: string, m: Marks) {
  let h = esc(text);
  if (!h) return "";
  if (m.sup) h = `<sup>${h}</sup>`;
  if (m.sub) h = `<sub>${h}</sub>`;
  if (m.u) h = `<u>${h}</u>`;
  if (m.i) h = `<em>${h}</em>`;
  if (m.b) h = `<strong>${h}</strong>`;
  return h;
}

const RENDERABLE = /^image\/(png|jpe?g|gif|webp|bmp|svg\+xml)$/;
const mimeOf = (name: string) => {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  return (
    {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      webp: "image/webp",
      bmp: "image/bmp",
      svg: "image/svg+xml",
    } as Record<string, string>
  )[ext] ?? `application/${ext}`;
};

/** 문서 안 그림 → 줄인 data URL. 못 그리는 형식이면 null */
async function imageUrl(zip: Zip, path: string): Promise<string | null> {
  const bytes = await zip.bytes(path);
  if (!bytes) return null;
  const type = mimeOf(path);
  if (!RENDERABLE.test(type)) return null;
  const file = new File([bytes.slice()], path.split("/").pop() ?? "image", { type });
  try {
    return await shrinkImage(file);
  } catch {
    return null;
  }
}

/** 표 — 한 칸짜리는 〈보기〉 상자로, 나머지는 첫 줄을 머리로 */
function tableHtml(rows: string[][][]): string {
  /* rows[행][칸] = 칸 안의 문단 HTML들 */
  if (rows.length === 1 && rows[0].length === 1) {
    const paras = rows[0][0].filter((p) => p.replace(/<[^>]+>/g, "").trim() !== "");
    const head = (paras[0] ?? "").replace(/<[^>]+>/g, "").trim();
    const named = /^[<〈《(]?\s*보\s*기\s*[>〉》)]?$/.test(head);
    const body = named ? paras.slice(1) : paras;
    return `<section data-box="보기">${body.map((p) => `<p>${p}</p>`).join("") || "<p><br></p>"}</section>`;
  }
  const cell = (tag: string, ps: string[]) => `<${tag}>${ps.filter(Boolean).join("<br>")}</${tag}>`;
  const [head, ...body] = rows;
  return (
    `<table><thead><tr>${head.map((c) => cell("th", c)).join("")}</tr></thead>` +
    `<tbody>${body.map((r) => `<tr>${r.map((c) => cell("td", c)).join("")}</tr>`).join("")}</tbody></table>`
  );
}

/* ───────────────────────── DOCX ───────────────────────── */

async function importDocx(zip: Zip): Promise<ImportResult> {
  const doc = await zip.xml("word/document.xml");
  if (!doc) throw new Error("워드 문서의 본문(word/document.xml)을 찾지 못했습니다.");
  const rels = new Map<string, string>();
  const relXml = await zip.xml("word/_rels/document.xml.rels");
  if (relXml) {
    for (const r of Array.from(relXml.getElementsByTagNameNS("*", "Relationship"))) {
      const t = r.getAttribute("Target") ?? "";
      rels.set(r.getAttribute("Id") ?? "", t.startsWith("/") ? t.slice(1) : `word/${t}`);
    }
  }
  let skipped = 0;
  const on = (rPr: Element | null, local: string) => {
    const el = rPr ? kids(rPr, local)[0] : undefined;
    if (!el) return false;
    const val = el.getAttribute("w:val") ?? el.getAttributeNS("*", "val");
    return val !== "0" && val !== "false" && val !== "none";
  };

  /** 문단 하나 → { html, images } */
  const para = async (p: Element) => {
    let html = "";
    const imgs: string[] = [];
    const runs = p.getElementsByTagNameNS("*", "r");
    for (const r of Array.from(runs)) {
      /* 글상자 안의 문단이 바깥 문단의 r로도 잡히지 않게 — 가까운 문단이 p일 때만 */
      let up: Element | null = r.parentElement;
      while (up && up.localName !== "p") up = up.parentElement;
      if (up !== p) continue;
      const rPr = kids(r, "rPr")[0] ?? null;
      const va = rPr ? kids(rPr, "vertAlign")[0]?.getAttribute("w:val") : null;
      const m: Marks = {
        b: on(rPr, "b"),
        i: on(rPr, "i"),
        u: on(rPr, "u"),
        sup: va === "superscript",
        sub: va === "subscript",
      };
      for (const c of Array.from(r.children)) {
        if (c.localName === "t") html += wrap(c.textContent ?? "", m);
        else if (c.localName === "tab") html += " ";
        else if (c.localName === "br" || c.localName === "cr") html += "<br>";
        else if (c.localName === "drawing" || c.localName === "pict") {
          for (const blip of Array.from(c.getElementsByTagNameNS("*", "blip"))) {
            const id = blip.getAttribute("r:embed") ?? blip.getAttributeNS("*", "embed") ?? "";
            const path = rels.get(id);
            const url = path ? await imageUrl(zip, path) : null;
            if (url) imgs.push(url);
            else skipped += 1;
          }
        }
      }
    }
    const list = !!first(p, "numPr");
    return { html, imgs, list };
  };

  const body = first(doc.documentElement, "body");
  if (!body) throw new Error("워드 문서의 본문을 찾지 못했습니다.");
  const out: string[] = [];
  let listOpen = false;
  const closeList = () => {
    if (listOpen) out.push("</ul>");
    listOpen = false;
  };

  for (const el of Array.from(body.children)) {
    if (el.localName === "p") {
      const { html, imgs, list } = await para(el);
      if (list && html.trim()) {
        if (!listOpen) out.push("<ul>");
        listOpen = true;
        out.push(`<li>${html}</li>`);
      } else {
        closeList();
        if (html.trim() || imgs.length === 0) out.push(`<p>${html || "<br>"}</p>`);
      }
      for (const u of imgs) {
        closeList();
        out.push(`<p><img src="${u}" alt=""></p>`);
      }
    } else if (el.localName === "tbl") {
      closeList();
      const rows: string[][][] = [];
      for (const tr of kids(el, "tr")) {
        const row: string[][] = [];
        for (const tc of kids(tr, "tc")) {
          const ps: string[] = [];
          for (const p of kids(tc, "p")) ps.push((await para(p)).html);
          row.push(ps);
        }
        rows.push(row);
      }
      if (rows.length) out.push(tableHtml(rows));
    }
  }
  closeList();
  return { html: out.join(""), skippedImages: skipped, warnings: [] };
}

/* ───────────────────────── HWPX ───────────────────────── */

async function importHwpx(zip: Zip): Promise<ImportResult> {
  /* 글자 모양 — header.xml의 charPr id → 굵게 · 기울임 · 밑줄 · 첨자 */
  const shapes = new Map<string, Marks>();
  const header = await zip.xml("Contents/header.xml");
  if (header) {
    for (const cp of Array.from(header.getElementsByTagNameNS("*", "charPr"))) {
      const u = kids(cp, "underline")[0]?.getAttribute("type");
      shapes.set(cp.getAttribute("id") ?? "", {
        b: kids(cp, "bold").length > 0,
        i: kids(cp, "italic").length > 0,
        u: !!u && u !== "NONE",
        sup: kids(cp, "supscript").length > 0,
        sub: kids(cp, "subscript").length > 0,
      });
    }
  }
  /* 그림 — content.hpf 목록의 id → BinData 경로 */
  const bins = new Map<string, string>();
  const hpf = await zip.xml("Contents/content.hpf");
  if (hpf) {
    for (const it of Array.from(hpf.getElementsByTagNameNS("*", "item"))) {
      const href = it.getAttribute("href") ?? "";
      bins.set(it.getAttribute("id") ?? "", href.startsWith("/") ? href.slice(1) : href);
    }
  }
  const sections = zip
    .names()
    .filter((n) => /^Contents\/section\d+\.xml$/.test(n))
    .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
  if (sections.length === 0) throw new Error("한글 문서의 본문(Contents/section0.xml)을 찾지 못했습니다.");

  let skipped = 0;
  const out: string[] = [];

  const picture = async (pic: Element) => {
    const img = first(pic, "img");
    const ref = img?.getAttribute("binaryItemIDRef") ?? "";
    const path = bins.get(ref) ?? zip.names().find((n) => n.startsWith(`BinData/${ref}.`));
    const url = path ? await imageUrl(zip, path) : null;
    if (url) out.push(`<p><img src="${url}" alt=""></p>`);
    else skipped += 1;
  };

  /** 표 칸 안의 문단들 → 글 HTML(표 · 그림은 칸 안에서 글로 줄인다) */
  const cellParas = (tc: Element) =>
    Array.from(tc.getElementsByTagNameNS("*", "p")).map((p) => runsHtml(p, true).html);

  const table = (tbl: Element) => {
    const rows: string[][][] = kids(tbl, "tr").map((tr) => kids(tr, "tc").map(cellParas));
    if (rows.length) out.push(tableHtml(rows));
  };

  /** 문단 안의 글 — 표 · 그림은 따로 모은다(칸 안에서는 무시) */
  function runsHtml(p: Element, inCell = false) {
    let html = "";
    const objects: Element[] = [];
    for (const run of kids(p, "run")) {
      const m = shapes.get(run.getAttribute("charPrIDRef") ?? "") ?? {};
      for (const c of Array.from(run.children)) {
        if (c.localName === "t") {
          for (const n of Array.from(c.childNodes)) {
            if (n.nodeType === 3) html += wrap(n.textContent ?? "", m);
            else if ((n as Element).localName === "tab") html += " ";
            else if ((n as Element).localName === "lineBreak") html += "<br>";
          }
        } else if (!inCell && (c.localName === "tbl" || c.localName === "pic")) {
          objects.push(c);
        }
      }
    }
    return { html, objects };
  }

  for (const name of sections) {
    const sec = await zip.xml(name);
    if (!sec) continue;
    for (const p of kids(sec.documentElement, "p")) {
      const { html, objects } = runsHtml(p);
      if (html.trim() || objects.length === 0) out.push(`<p>${html || "<br>"}</p>`);
      for (const o of objects) {
        if (o.localName === "tbl") table(o);
        else await picture(o);
      }
    }
  }
  return { html: out.join(""), skippedImages: skipped, warnings: [] };
}

/* ───────────────────────── 들머리 ───────────────────────── */

export const IMPORT_ACCEPT = ".hwpx,.docx";

export async function importDocument(file: File): Promise<ImportResult> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".hwp")) {
    throw new Error("옛 한글 형식(.hwp)은 읽지 못합니다. 한글에서 「다른 이름으로 저장 → HWPX」로 바꿔 올려 주세요.");
  }
  if (name.endsWith(".doc")) {
    throw new Error("옛 워드 형식(.doc)은 읽지 못합니다. 워드에서 .docx로 저장해 올려 주세요.");
  }
  if (typeof DecompressionStream === "undefined") {
    throw new Error("이 브라우저는 문서 파일을 풀 수 없습니다. 최신 크롬 · 엣지 · 사파리에서 열어 주세요.");
  }
  const zip = new Zip(await file.arrayBuffer());
  if (zip.has("word/document.xml")) return importDocx(zip);
  if (zip.has("Contents/header.xml") || zip.names().some((n) => n.startsWith("Contents/section"))) {
    return importHwpx(zip);
  }
  throw new Error("한글(.hwpx)이나 워드(.docx) 문서가 아닙니다.");
}
