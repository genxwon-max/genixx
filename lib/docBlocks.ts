"use client";

import type { Block, Figure } from "./content";
import { sanitizeHtml } from "./richText";

/**
 * 자료 블록(lib/content.ts) ⇄ 문서 편집기의 HTML.
 *
 * 문서 편집기(components/admin2/DocEditor.tsx)는 한글 · 워드처럼 한 장에 이어 쓰는 화면이고,
 * 저장은 여전히 블록이다 — 응시 화면 · 미리보기 · 검수가 모두 블록을 읽는다. 열 때 블록을
 * HTML로 펴고, 적용할 때 HTML을 블록으로 되접는다.
 *
 *   문단          꾸밈이 없으면 text, 굵게 · 밑줄 등이 섞이면 rich(html). 이어진 문단은 한 블록으로
 *   글머리표/번호  list (번호 목록은 「1. 」을 글에 붙인다)
 *   표            table — 첫 줄이 머리
 *   그림          images — 이어진 그림은 한 블록(차례대로)
 *   〈보기〉 상자   box
 *   ※ 알림        note
 *
 * ── 편집기가 못 고치는 블록은 통째로 들고 간다 ──
 * 영상 · 음성 · 애니메이션 · 이름표를 붙인 사진 · 두 줄 머리 표처럼 문서 한 장으로 펼 수 없는
 * 블록은 편집기 안에 「고칠 수 없는 조각」으로 세운다(data-atom). 옮기거나 지울 수는 있고,
 * 적용하면 원래 블록 그대로 돌아온다. 펼쳐서 흉내 내면 저장하는 순간 그 정보가 사라진다.
 */

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const lines = (s: string) =>
  s
    .split("\n")
    .map((l) => `<p>${esc(l) || "<br>"}</p>`)
    .join("");

/** 편집기가 그대로 펼 수 있는 블록인가 */
function editable(b: Block) {
  if (b.kind === "table") return !b.table.groups;
  if (b.kind === "images")
    return b.images.every((f) => !f.marks?.length && !f.rings?.length);
  return ["text", "list", "rich", "note", "box"].includes(b.kind);
}

const ATOM_LABEL: Partial<Record<Block["kind"], string>> = {
  video: "영상",
  audio: "음성",
  animation: "애니메이션",
  images: "표시가 있는 사진",
  table: "두 줄 머리 표",
};

export function blocksToHtml(blocks: Block[]): { html: string; atoms: Block[] } {
  const atoms: Block[] = [];
  const html = blocks
    .map((b) => {
      if (!editable(b)) {
        atoms.push(b);
        const cap =
          "caption" in b && typeof b.caption === "string" && b.caption ? ` — ${esc(b.caption)}` : "";
        return `<div data-atom="${atoms.length - 1}" contenteditable="false">${
          ATOM_LABEL[b.kind] ?? b.kind
        }${cap} · 이 조각은 블록 편집에서 고칩니다</div>`;
      }
      switch (b.kind) {
        case "text":
          return lines(b.text);
        case "rich":
          return b.format === "html" ? sanitizeHtml(b.body) : lines(b.body);
        case "list":
          return `<ul>${b.items.map((i) => `<li>${esc(i) || "<br>"}</li>`).join("")}</ul>`;
        case "note":
          return `<aside data-note>${lines(b.text)}</aside>`;
        case "box":
          return `<section data-box="${esc(b.title)}">${lines(b.text)}</section>`;
        case "images":
          return b.images
            .map(
              (f) =>
                `<p><img src="${esc(f.src)}" alt="${esc(f.alt)}" data-caption="${esc(f.caption)}"></p>`,
            )
            .join("");
        case "table": {
          const t = b.table;
          const cap = t.caption ? ` data-caption="${esc(t.caption)}"` : "";
          return (
            `<table${cap}><thead><tr>${t.head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>` +
            `<tbody>${t.rows
              .map((r) => `<tr>${r.map((c) => `<td>${esc(c).replace(/\n/g, "<br>")}</td>`).join("")}</tr>`)
              .join("")}</tbody></table>`
          );
        }
        default:
          return "";
      }
    })
    .join("");
  return { html, atoms };
}

/* ── HTML → 블록 ── */

const INLINE_MARK = /^(STRONG|B|EM|I|U|SUP|SUB|S|DEL|MARK)$/;

/** 줄바꿈(<br>)을 살린 글 */
function textOf(el: Node): string {
  let s = "";
  el.childNodes.forEach((n) => {
    if (n.nodeType === 3) s += n.textContent ?? "";
    else if ((n as Element).tagName === "BR") s += "\n";
    else if ((n as Element).tagName !== "IMG") s += textOf(n);
  });
  return s.replace(/ /g, " ");
}

const hasMarks = (el: Element) =>
  Array.from(el.querySelectorAll("*")).some((c) => INLINE_MARK.test(c.tagName));

/** 문단 안 HTML — 허용한 꾸밈만 남긴다 */
function inlineHtml(el: Element) {
  const clone = el.cloneNode(true) as Element;
  clone.querySelectorAll("img").forEach((i) => i.remove());
  return sanitizeHtml(clone.innerHTML.replace(/&nbsp;/g, " "));
}

export function htmlToBlocks(html: string, atoms: Block[]): Block[] {
  const doc = new DOMParser().parseFromString(`<div id="r">${html}</div>`, "text/html");
  const root = doc.getElementById("r")!;
  const out: Block[] = [];

  /* 이어진 문단을 모아 두었다가 한 블록으로 */
  let paras: { text: string; html: string; marked: boolean }[] = [];
  const flushParas = () => {
    while (paras.length && !paras[0].text.trim()) paras.shift();
    while (paras.length && !paras[paras.length - 1].text.trim()) paras.pop();
    if (paras.length) {
      if (paras.some((p) => p.marked)) {
        out.push({
          kind: "rich",
          format: "html",
          body: paras.map((p) => `<p>${p.html || "<br>"}</p>`).join(""),
        });
      } else {
        out.push({ kind: "text", text: paras.map((p) => p.text).join("\n") });
      }
    }
    paras = [];
  };
  /* 이어진 그림도 한 블록으로 */
  let figs: Figure[] = [];
  const flushFigs = () => {
    if (figs.length) out.push({ kind: "images", layout: figs.length > 1 ? "sequence" : "row", images: figs });
    figs = [];
  };
  const flush = () => {
    flushParas();
    flushFigs();
  };

  const takeImages = (el: Element) => {
    const imgs = el.tagName === "IMG" ? [el] : Array.from(el.querySelectorAll("img"));
    for (const img of imgs) {
      flushParas();
      figs.push({
        src: img.getAttribute("src") ?? "",
        alt: img.getAttribute("alt") ?? "",
        caption: img.getAttribute("data-caption") ?? "",
      });
    }
  };

  const paragraph = (el: Element) => {
    const text = textOf(el);
    if (text.trim()) {
      flushFigs();
      paras.push({ text, html: inlineHtml(el), marked: hasMarks(el) });
    } else if (!el.querySelector("img")) {
      paras.push({ text: "", html: "", marked: false });
    }
    takeImages(el);
  };

  for (const node of Array.from(root.childNodes)) {
    if (node.nodeType === 3) {
      if ((node.textContent ?? "").trim()) {
        flushFigs();
        paras.push({ text: node.textContent ?? "", html: esc(node.textContent ?? ""), marked: false });
      }
      continue;
    }
    if (node.nodeType !== 1) continue;
    const el = node as Element;
    const atom = el.getAttribute("data-atom");
    if (atom !== null) {
      flush();
      const b = atoms[Number(atom)];
      if (b) out.push(b);
      continue;
    }
    switch (el.tagName) {
      case "UL":
      case "OL": {
        flush();
        const items = Array.from(el.querySelectorAll(":scope > li")).map((li, k) =>
          el.tagName === "OL" ? `${k + 1}. ${textOf(li).trim()}` : textOf(li).trim(),
        );
        if (items.some(Boolean)) out.push({ kind: "list", items });
        break;
      }
      case "TABLE": {
        flush();
        const trs = Array.from(el.querySelectorAll("tr"));
        const cells = trs.map((tr) => Array.from(tr.children).map((c) => textOf(c).trim()));
        if (cells.length === 0) break;
        const width = Math.max(...cells.map((r) => r.length));
        const pad = (r: string[]) => [...r, ...Array(width - r.length).fill("")];
        const caption = el.getAttribute("data-caption") ?? undefined;
        out.push({
          kind: "table",
          table: { ...(caption ? { caption } : {}), head: pad(cells[0]), rows: cells.slice(1).map(pad) },
        });
        break;
      }
      case "SECTION": {
        flush();
        out.push({ kind: "box", title: el.getAttribute("data-box") ?? "보기", text: blockText(el) });
        break;
      }
      case "ASIDE": {
        flush();
        out.push({ kind: "note", text: blockText(el) });
        break;
      }
      case "IMG":
        takeImages(el);
        break;
      case "H1":
      case "H2":
      case "H3":
      case "H4":
      case "P":
      case "DIV":
      case "BLOCKQUOTE":
        paragraph(el);
        break;
      default:
        paragraph(el);
    }
  }
  flush();
  return out;
}

/** 상자 · 알림 안의 문단들 → 줄바꿈으로 이은 글 */
function blockText(el: Element) {
  const ps = Array.from(el.children).filter((c) => c.tagName === "P" || c.tagName === "DIV");
  const t = ps.length ? ps.map((p) => textOf(p)).join("\n") : textOf(el);
  return t.replace(/^\n+|\n+$/g, "");
}

/* ── 문항(발문 + 보기) ── */

const MARKS = "①②③④⑤⑥";

/** 꾸밈 없는 글 → 줄마다 문단 */
export const textToHtml = (text: string) => lines(text);

/**
 * 문항을 문서로 편다 — 발문, 발문 아래 자료, 그 아래 「① 보기」 한 줄씩(응시 화면 차례).
 * 발문은 부르는 쪽이 HTML로 만들어 넘긴다 — 발문이 마크다운 · HTML로 적힌 옛 문항이 있다.
 */
export function questionToHtml(stemHtml: string, choices: string[], extra: Block[]) {
  const body = blocksToHtml(extra);
  const html =
    (stemHtml || "<p><br></p>") +
    body.html +
    choices.map((c, k) => `<p>${MARKS[k]} ${esc(c)}</p>`).join("");
  return { html, atoms: body.atoms };
}

/**
 * 문서 → 문항. 글 문단은 한 덩이 글로 모아 붙여 넣기 규칙(lib/choicePaste.ts)으로 발문 · 보기 ·
 * 정답을 가르고, 표 · 그림 · 상자는 발문 아래 자료로 보낸다.
 */
export function htmlToQuestion(html: string, atoms: Block[]) {
  const blocks = htmlToBlocks(html, atoms);
  const text: string[] = [];
  const extra: Block[] = [];
  for (const b of blocks) {
    if (b.kind === "text") text.push(b.text);
    else if (b.kind === "rich" && b.format === "html") {
      const d = new DOMParser().parseFromString(b.body, "text/html");
      text.push(
        Array.from(d.body.children)
          .map((p) => textOf(p))
          .join("\n"),
      );
    } else extra.push(b);
  }
  return { text: text.join("\n"), extra };
}

/**
 * 문서 첫 문단이 지시문이면 떼어 낸다 — HTML 단계에서 본다. 블록으로 접은 뒤에는 첫 문단이 굵은
 * 글과 한 덩이(rich)로 묶여 가려내기 어렵다.
 */
export function splitLeadHtml(html: string): { lead: string | null; html: string } {
  const doc = new DOMParser().parseFromString(`<div id="r">${html}</div>`, "text/html");
  const root = doc.getElementById("r")!;
  const firstP = Array.from(root.children).find((c) => (c.textContent ?? "").trim() !== "");
  if (!firstP || firstP.tagName !== "P") return { lead: null, html };
  const line = (firstP.textContent ?? "").replace(/ /g, " ").trim();
  if (!/(물음|질문|문제)에\s*답하(시오|세요)\.?$/.test(line)) return { lead: null, html };
  firstP.remove();
  return { lead: line, html: root.innerHTML };
}
