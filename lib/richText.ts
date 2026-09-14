/**
 * 상세 내용 편집기 — 무엇으로 쓰는가.
 *
 * 상품 상세를 이미지 몇 장으로만 받던 것을 네 갈래로 연다. 파는 것이 응시권 하나일
 * 때는 그림 석 장이면 됐지만, 묶음·구독이 늘면서 「무엇이 들어 있고 언제 받는가」를
 * 글로 적어야 하는 상품이 생겼다. 디자인 시안을 뜬 그림으로만 채우면 그 글을 고칠 때마다
 * 디자이너를 거쳐야 한다.
 *
 *   이미지      그림 여러 장을 차례대로. 상세 시안을 그대로 올리는 가장 흔한 방식
 *   마크다운    글이 중심일 때. 표시 문법이 짧아 운영자가 직접 고치기 쉽다
 *   HTML        디자이너·개발자가 짠 마크업을 그대로 붙일 때
 *   일반 텍스트  꾸밈 없이 줄만 나누면 되는 짧은 안내
 *
 * 한 상품은 한 갈래만 쓴다. 넷을 겹쳐 두면 「이 상품의 상세는 무엇인가」가 화면마다
 * 달라지고, 파는 쪽에서도 무엇을 먼저 그릴지 정할 수 없다. 대신 마크다운·HTML 안에서
 * 그림을 넣을 수 있게 두어, 글과 그림을 함께 쓰는 길은 막지 않는다.
 *
 * ── 왜 라이브러리를 안 쓰나 ──
 * 마크다운 변환기와 소독기를 여기 직접 둔다. 이 화면이 쓰는 문법은 열 가지 남짓이고,
 * 그 열 가지를 위해 의존성을 늘리면 이 프로젝트에서 처음으로 런타임 의존성이 생긴다.
 * 문법이 늘어 손으로 못 감당하게 되면 그때 갈아 끼우면 된다 — 함수 두 개(markdownToHtml ·
 * sanitizeHtml)만 바꾸면 화면은 그대로다.
 */

export type DetailMode = "images" | "markdown" | "html" | "text";

export const detailModes: { id: DetailMode; label: string; hint: string }[] = [
  { id: "images", label: "이미지", hint: "그림을 올린 차례대로 세로로 이어 붙입니다." },
  {
    id: "markdown",
    label: "마크다운",
    hint: "# 제목 · **굵게** · - 목록 · [글자](주소) · ![설명](그림주소)를 씁니다.",
  },
  {
    id: "html",
    label: "HTML",
    hint: "짜 둔 마크업을 그대로 붙입니다. 허용하지 않는 태그와 속성은 저장할 때 걷어 냅니다.",
  },
  { id: "text", label: "일반 텍스트", hint: "꾸밈 없이 줄만 나눕니다. 빈 줄이 문단을 가릅니다." },
];

export function detailModeLabel(mode: DetailMode) {
  return detailModes.find((m) => m.id === mode)?.label ?? mode;
}

/* ───────────────────────── 소독 ─────────────────────────

   운영자가 적은 HTML이 파는 화면에 그대로 나간다. 그 사이에 이 함수가 선다.

   정규식으로 훑지 않는다. `<img src=x onerror=…>` 하나를 잡으려고 규칙을 붙이기
   시작하면 끝이 없고, 빠뜨린 하나가 곧 구멍이다. DOMParser로 실제 트리를 세운 뒤
   **허용 목록에 없는 것을 전부 지운다** — 새 태그가 생겨도 기본값이 「막힘」이다.

   class와 style은 통째로 뺀다. 파는 화면의 이름표를 흉내 내 눌러야 할 것처럼 보이게
   만들 수 있고, position:fixed 한 줄이면 화면 전체를 덮는다. 꾸밈은 파는 화면의
   서식(.a2-prose 같은 것)이 맡는다. */

const ALLOWED_TAGS = new Set([
  "P", "BR", "HR",
  "H1", "H2", "H3", "H4",
  "STRONG", "B", "EM", "I", "U", "S", "DEL", "MARK", "SMALL",
  "UL", "OL", "LI",
  "BLOCKQUOTE", "PRE", "CODE",
  "A", "IMG",
  "TABLE", "THEAD", "TBODY", "TR", "TH", "TD",
  "FIGURE", "FIGCAPTION", "DIV", "SPAN",
]);

/**
 * 태그도 안의 글자도 함께 지우는 것.
 *
 * 나머지 금지 태그는 껍데기만 벗기고 글자를 살리지만, 이 아홉은 글자 자체가 코드다.
 * 살려 두면 상세 화면에 자바스크립트 한 줄이 문단으로 적힌다 — 돌지는 않아도 흉하고,
 * 무엇보다 운영자가 「지워진 줄 알았는데 남아 있다」고 읽는다.
 */
const DROP_WHOLE = new Set([
  "SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "NOSCRIPT", "TEMPLATE", "LINK", "META",
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  A: new Set(["href", "title"]),
  IMG: new Set(["src", "alt", "title", "width", "height"]),
  TH: new Set(["colspan", "rowspan"]),
  TD: new Set(["colspan", "rowspan"]),
};

/** 주소로 쓸 수 있는 것 — data:는 그림만. data:text/html은 그 자체가 스크립트다 */
function safeUrl(raw: string, forImage: boolean) {
  const v = raw.trim();
  /* 스킴을 볼 때는 공백·탭·줄바꿈·제어문자를 먼저 걷어 낸다. 그것을 끼워 넣어
     우회하는 수법이 오래된 단골이다. 걷어 낸 값은 검사에만 쓰고, 돌려주는 것은
     손대지 않은 원래 주소다 */
  const flat = v.replace(/[\u0000-\u0020]/g, "").toLowerCase();
  if (flat.startsWith("http://") || flat.startsWith("https://")) return v;
  if (!forImage && (flat.startsWith("mailto:") || flat.startsWith("tel:"))) return v;
  if (forImage && flat.startsWith("data:image/")) return v;
  // 앞이 //, /, ./, ../ 이거나 스킴이 아예 없으면 상대 주소다
  if (!/^[a-z][a-z0-9+.-]*:/.test(flat)) return v;
  return null;
}

export function sanitizeHtml(dirty: string): string {
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    /* 서버에서는 트리를 세울 수 없다. 태그를 살려 내보내느니 글자로 만든다 —
       미리보기는 늘 브라우저에서 그리므로 이 갈래로 오는 일은 사실상 없다 */
    return escapeHtml(dirty);
  }

  const doc = new DOMParser().parseFromString(`<div id="root">${dirty}</div>`, "text/html");
  const root = doc.getElementById("root");
  if (!root) return "";

  const walk = (node: Element) => {
    for (const child of Array.from(node.children)) {
      if (DROP_WHOLE.has(child.tagName)) {
        /* 이 태그들은 안의 글자마저 지운다. 살려 두면 <script> 한 줄이 상세 화면에
           코드 그대로 적힌 문단이 되어, 돌지는 않지만 흉하게 남는다 */
        child.remove();
        continue;
      }
      if (!ALLOWED_TAGS.has(child.tagName)) {
        /* 태그만 걷어 내고 안의 글자는 살린다. 통째로 지우면 <section>으로 감싼 글이
           통째로 사라져, 운영자는 저장이 안 된 줄로 안다 */
        const text = doc.createTextNode(child.textContent ?? "");
        child.replaceWith(text);
        continue;
      }

      const allowed = ALLOWED_ATTRS[child.tagName] ?? new Set<string>();
      for (const attr of Array.from(child.attributes)) {
        if (!allowed.has(attr.name.toLowerCase())) {
          child.removeAttribute(attr.name);
          continue;
        }
        if (attr.name.toLowerCase() === "href" || attr.name.toLowerCase() === "src") {
          const ok = safeUrl(attr.value, child.tagName === "IMG");
          if (ok === null) child.removeAttribute(attr.name);
          else child.setAttribute(attr.name, ok);
        }
      }

      /* 바깥으로 나가는 링크는 새 창으로 열되 opener를 끊는다. 운영자가 적지 않아도
         우리가 붙인다 — 적어 달라고 하면 언젠가 빠뜨린다 */
      if (child.tagName === "A" && child.getAttribute("href")) {
        child.setAttribute("target", "_blank");
        child.setAttribute("rel", "noopener noreferrer");
      }

      walk(child);
    }
  };

  walk(root);
  return root.innerHTML;
}

export function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ───────────────────────── 마크다운 ─────────────────────────
   문단·제목·목록·인용·코드·구분선과 줄 안의 굵게·기울임·코드·링크·그림까지.
   표와 각주는 넣지 않았다 — 상품 상세에서 쓰는 것을 못 봤고, 문법이 늘수록 여기서
   틀릴 자리도 는다. 필요해지면 그때 늘린다. */

function inline(src: string) {
  let s = escapeHtml(src);
  // 그림이 링크보다 먼저다 — ![]() 가 []() 규칙에 먼저 걸리면 느낌표만 남는다
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, url) => `<img src="${url}" alt="${alt}">`);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text, url) => `<a href="${url}">${text}</a>`);
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  return s;
}

export function markdownToHtml(src: string): string {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let para: string[] = [];
  let list: "ul" | "ol" | null = null;
  let quote = false;
  let fence = false;
  let code: string[] = [];

  const flushPara = () => {
    if (para.length === 0) return;
    out.push(`<p>${para.map(inline).join("<br>")}</p>`);
    para = [];
  };
  const flushList = () => {
    if (!list) return;
    out.push(`</${list}>`);
    list = null;
  };
  const flushQuote = () => {
    if (!quote) return;
    out.push("</blockquote>");
    quote = false;
  };
  const flushAll = () => {
    flushPara();
    flushList();
    flushQuote();
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.trim().startsWith("```")) {
      if (fence) {
        out.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
        code = [];
        fence = false;
      } else {
        flushAll();
        fence = true;
      }
      continue;
    }
    if (fence) {
      code.push(raw);
      continue;
    }

    if (line.trim() === "") {
      flushAll();
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      flushAll();
      out.push("<hr>");
      continue;
    }

    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      flushAll();
      const level = h[1].length;
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      continue;
    }

    const q = /^>\s?(.*)$/.exec(line);
    if (q) {
      flushPara();
      flushList();
      if (!quote) {
        out.push("<blockquote>");
        quote = true;
      }
      out.push(`<p>${inline(q[1])}</p>`);
      continue;
    }
    flushQuote();

    const ul = /^[-*]\s+(.*)$/.exec(line);
    const ol = /^\d+\.\s+(.*)$/.exec(line);
    if (ul || ol) {
      flushPara();
      const want = ul ? "ul" : "ol";
      if (list !== want) {
        flushList();
        out.push(`<${want}>`);
        list = want;
      }
      out.push(`<li>${inline((ul ?? ol)![1])}</li>`);
      continue;
    }
    flushList();

    para.push(line);
  }

  if (fence && code.length > 0) out.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
  flushAll();
  return out.join("\n");
}

/** 일반 텍스트 — 빈 줄이 문단을 가르고, 줄바꿈은 줄바꿈으로 */
export function textToHtml(src: string): string {
  return src
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .filter((block) => block.trim() !== "")
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}

/**
 * 모드에 맞춰 미리보기 HTML을 만든다.
 *
 * 어느 갈래로 왔든 마지막에 소독을 한 번 더 거친다. 마크다운 안에 HTML을 적어 넣는 일이
 * 흔하고, 그 글자는 여기까지 태그인 채로 온다.
 */
export function renderDetail(mode: DetailMode, body: string, images: string[]): string {
  if (mode === "images") {
    return images.map((src) => `<img src="${src}" alt="">`).join("\n");
  }
  const html =
    mode === "markdown" ? markdownToHtml(body) : mode === "html" ? body : textToHtml(body);
  return sanitizeHtml(html);
}

/** 상세가 비어 있는가 — 목록에서 「아직 안 채운 상품」을 가릴 때 쓴다 */
export function detailIsEmpty(mode: DetailMode, body: string, images: string[]) {
  return mode === "images" ? images.length === 0 : body.trim() === "";
}
