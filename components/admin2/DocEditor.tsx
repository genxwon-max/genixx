"use client";

import { useEffect, useRef, useState } from "react";
import { IMPORT_ACCEPT, importDocument } from "@/lib/docImport";
import { shrinkImage } from "@/lib/productStore";
import { sanitizeHtml } from "@/lib/richText";

/**
 * 문서 편집기 — 지문 · 문항을 한글 · 워드처럼 한 장에 이어 쓰는 팝업 (2026-09-22 요청).
 *
 * 콘솔의 블록 편집기(BlockEditor)는 문단 · 표 · 사진을 칸 하나씩 쌓는다. 응시 화면과 짝이 맞아
 * 정확하지만, 한글에서 지문을 쓰던 출제위원에게는 「표 하나 넣는 데 단추 셋」이다. 이 팝업은
 * A4 한 장을 펴 놓고 이어 쓰게 하고, .hwpx · .docx를 그대로 불러온다. 적용하면 부르는 쪽이
 * 블록으로 되접는다(lib/docBlocks.ts) — 저장 모양은 그대로다.
 *
 * ── 리본에 둔 것 = 응시 화면이 그릴 수 있는 것 ──
 * 굵게 · 기울임 · 밑줄 · 위/아래 첨자 · 글머리표 · 번호 · 표 · 그림 · 〈보기〉 상자 · ※ 알림 ·
 * 빈칸 표지. 글꼴 · 크기 · 색 · 정렬은 두지 않는다 — 응시 화면이 모든 문항을 같은 글꼴로 그려서,
 * 여기서 바꿔도 아이 화면에는 나오지 않는다. 있는 척하는 단추는 두지 않는다.
 *
 * 붙여 넣기도 같은 거르개를 지난다(sanitizeHtml) — 한글 · 워드에서 복사한 글은 글꼴 · 색 서식을
 * 잔뜩 달고 온다.
 *
 * ⚠ document.execCommand를 쓴다. 표준에서 내려갔지만 모든 브라우저가 여전히 지원하고, 되돌리기
 *   (Ctrl+Z)가 이것으로 한 변경만 기억한다. 편집기 라이브러리를 들이는 것은 이 화면이 그 이상을
 *   요구할 때 한다.
 */

const CONSONANTS = "ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ";

type Ctx = { inTable: boolean; box: HTMLElement | null };

/** 리본 단추 — 누르는 순간 편집 영역의 선택이 풀리지 않게 mousedown을 막는다 */
function Btn({
  label,
  title: t,
  on,
  wide,
  disabled,
}: {
  label: React.ReactNode;
  title: string;
  on: () => void;
  wide?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={`a2-doc-btn${wide ? " a2-doc-btn-wide" : ""}`}
      title={t}
      aria-label={t}
      disabled={disabled}
      /* 누르는 순간 편집 영역의 선택이 풀리지 않게 */
      onMouseDown={(e) => e.preventDefault()}
      onClick={on}
    >
      {label}
    </button>
  );
}

export default function DocEditor({
  title,
  initialHtml,
  mode,
  onApply,
  onClose,
}: {
  /** 머리에 서는 이름 — 「지문 — 260810-3-K-C-S2-001」 */
  title: string;
  initialHtml: string;
  /** 문항이면 상태 줄에 발문 · 보기를 가르는 규칙을 적는다 */
  mode: "passage" | "question";
  onApply: (html: string) => void;
  onClose: () => void;
}) {
  const page = useRef<HTMLDivElement>(null);
  const fileIn = useRef<HTMLInputElement>(null);
  const imageIn = useRef<HTMLInputElement>(null);
  const [dirty, setDirty] = useState(false);
  const [chars, setChars] = useState(0);
  const [msg, setMsg] = useState<{ tone: "ok" | "danger"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [ctx, setCtx] = useState<Ctx>({ inTable: false, box: null });
  const [grid, setGrid] = useState<{ open: boolean; r: number; c: number }>({ open: false, r: 0, c: 0 });
  const [drag, setDrag] = useState(false);
  /* 선택이 편집 영역 밖(리본 단추)으로 나가도 되돌려 놓을 자리 */
  const saved = useRef<Range | null>(null);

  /* 처음 한 번만 채운다 — 그 뒤로는 편집 영역이 스스로 들고 있다(제어하지 않는 편집 영역) */
  useEffect(() => {
    if (page.current) {
      page.current.innerHTML = initialHtml || "<p><br></p>";
      setChars(page.current.innerText.replace(/\s/g, "").length);
      page.current.focus();
    }
    /* 한 문단 단위를 <p>로 — 브라우저마다 기본이 <div>라 블록으로 되접을 때 갈래가 흔들린다 */
    document.execCommand("defaultParagraphSeparator", false, "p");
  }, [initialHtml]);

  const close = () => {
    if (dirty && !window.confirm("적용하지 않은 편집이 있습니다. 닫으면 사라집니다.\n\n닫을까요?")) return;
    onClose();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* 커서가 어디 있는지 — 표 안이면 표 도구를, 상자 안이면 상자 이름 칸을 연다 */
  useEffect(() => {
    const onSel = () => {
      const sel = document.getSelection();
      const node = sel?.anchorNode ?? null;
      if (!node || !page.current?.contains(node)) return;
      if (sel && sel.rangeCount) saved.current = sel.getRangeAt(0).cloneRange();
      const el = (node.nodeType === 1 ? node : node.parentElement) as HTMLElement | null;
      setCtx({
        inTable: !!el?.closest("td,th"),
        box: (el?.closest("section[data-box]") as HTMLElement | null) ?? null,
      });
    };
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, []);

  const touched = () => {
    setDirty(true);
    setChars(page.current?.innerText.replace(/\s/g, "").length ?? 0);
  };

  /** 리본 단추 — 편집 영역에 커서를 되돌린 뒤 명령 */
  const restore = () => {
    page.current?.focus();
    const sel = document.getSelection();
    if (saved.current && sel) {
      sel.removeAllRanges();
      sel.addRange(saved.current);
    }
  };
  const cmd = (name: string, value?: string) => {
    restore();
    document.execCommand(name, false, value);
    touched();
  };
  const insert = (html: string) => cmd("insertHTML", html);

  /* ── 불러오기 ── */
  const load = async (file: File) => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await importDocument(file);
      const empty = !page.current?.innerText.trim();
      if (!empty) {
        const replace = window.confirm(
          `「${file.name}」을 불러옵니다.\n\n[확인] 지금 쓴 것을 지우고 바꿉니다\n[취소] 커서 자리에 끼워 넣습니다`,
        );
        if (replace && page.current) page.current.innerHTML = r.html || "<p><br></p>";
        else insert(r.html);
      } else if (page.current) page.current.innerHTML = r.html || "<p><br></p>";
      touched();
      setMsg({
        tone: "ok",
        text:
          `「${file.name}」을 불러왔습니다.` +
          (r.skippedImages > 0
            ? ` 브라우저가 그리지 못하는 그림 ${r.skippedImages}개(EMF · WMF 등)는 건너뛰었습니다 — PNG · JPG로 넣어 주세요.`
            : "") +
          " 글꼴 · 크기 · 색은 응시 화면 서식으로 바뀝니다.",
      });
    } catch (e) {
      setMsg({ tone: "danger", text: e instanceof Error ? e.message : "문서를 읽지 못했습니다." });
    } finally {
      setBusy(false);
    }
  };

  const addImage = async (file: File) => {
    try {
      const url = await shrinkImage(file);
      insert(`<p><img src="${url}" alt=""></p><p><br></p>`);
    } catch {
      setMsg({ tone: "danger", text: "그림을 읽지 못했습니다. PNG · JPG 파일인지 확인해 주세요." });
    }
  };

  /* ── 붙여 넣기 — 서식을 걸러 낸다 ── */
  const onPaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const files = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith("image/"));
    if (files.length > 0) {
      e.preventDefault();
      for (const f of files) await addImage(f);
      return;
    }
    const html = e.clipboardData.getData("text/html");
    if (html) {
      e.preventDefault();
      /* 워드가 붙이는 <!--StartFragment--> · 조건부 주석 · <o:p>를 먼저 걷는다 */
      const clean = sanitizeHtml(html.replace(/<!--[\s\S]*?-->/g, "").replace(/<\/?o:p>/g, ""));
      document.execCommand("insertHTML", false, clean);
      touched();
    }
  };

  /* ── 표 ── */
  const tableHtml = (r: number, c: number) =>
    `<table><thead><tr>${"<th><br></th>".repeat(c)}</tr></thead><tbody>${`<tr>${"<td><br></td>".repeat(c)}</tr>`.repeat(
      Math.max(0, r - 1),
    )}</tbody></table><p><br></p>`;

  const cellNow = () => {
    const n = saved.current?.startContainer ?? null;
    const el = (n && (n.nodeType === 1 ? n : n.parentElement)) as HTMLElement | null;
    return el?.closest("td,th") as HTMLTableCellElement | null;
  };
  const tableEdit = (what: "row+" | "row-" | "col+" | "col-" | "del") => {
    const cell = cellNow();
    const table = cell?.closest("table");
    if (!cell || !table) return;
    const tr = cell.parentElement as HTMLTableRowElement;
    const col = cell.cellIndex;
    const rows = Array.from(table.rows);
    if (what === "row+") {
      const n = document.createElement("tr");
      for (let k = 0; k < tr.cells.length; k++) n.appendChild(document.createElement("td")).innerHTML = "<br>";
      if (tr.parentElement?.tagName === "THEAD") (table.tBodies[0] ?? table.createTBody()).prepend(n);
      else tr.after(n);
    } else if (what === "row-") {
      if (rows.length > 1) tr.remove();
    } else if (what === "col+") {
      for (const r of rows) {
        const c = document.createElement(r.parentElement?.tagName === "THEAD" ? "th" : "td");
        c.innerHTML = "<br>";
        r.cells[col].after(c);
      }
    } else if (what === "col-") {
      if (tr.cells.length > 1) for (const r of rows) r.cells[col]?.remove();
    } else {
      table.remove();
    }
    touched();
  };

  /* ── 빈칸 표지 — 이미 쓴 자음 다음 것을 넣는다 ── */
  const blank = () => {
    const used = new Set(
      [...(page.current?.innerText ?? "").matchAll(/\(\s*([ㄱ-ㅎ])\s*\)/g)].map((m) => m[1]),
    );
    const next = [...CONSONANTS].find((c) => !used.has(c)) ?? "ㄱ";
    cmd("insertText", `( ${next} )`);
  };

  const apply = () => {
    onApply(page.current?.innerHTML ?? "");
    onClose();
  };

  return (
    <div className="a2-doc" role="dialog" aria-modal="true" aria-label={`문서 편집기 — ${title}`}>
      {/* 제목 줄 */}
      <div className="a2-doc-titlebar">
        <span className="font-bold">문서 편집기</span>
        <span className="truncate opacity-80">{title}</span>
        <span className="ml-auto flex items-center gap-1.5">
          <button type="button" className="a2-doc-bar-btn" onClick={close}>
            취소
          </button>
          <button type="button" className="a2-doc-bar-btn a2-doc-bar-primary" onClick={apply}>
            적용
          </button>
        </span>
      </div>

      {/* 리본 */}
      <div className="a2-doc-ribbon">
        <div className="a2-doc-group">
          <div className="a2-doc-tools">
            <Btn
              wide
              label={busy ? "불러오는 중…" : "문서 불러오기"}
              title="한글(.hwpx) · 워드(.docx) 파일 불러오기"
              disabled={busy}
              on={() => fileIn.current?.click()}
            />
          </div>
          <span className="a2-doc-group-name">파일 · HWPX · DOCX</span>
        </div>

        <div className="a2-doc-group">
          <div className="a2-doc-tools">
            <Btn label="↶" title="되돌리기 (Ctrl+Z)" on={() => cmd("undo")} />
            <Btn label="↷" title="다시 하기 (Ctrl+Y)" on={() => cmd("redo")} />
          </div>
          <span className="a2-doc-group-name">편집</span>
        </div>

        <div className="a2-doc-group">
          <div className="a2-doc-tools">
            <Btn label={<b>가</b>} title="굵게 (Ctrl+B)" on={() => cmd("bold")} />
            <Btn label={<i>가</i>} title="기울임 (Ctrl+I)" on={() => cmd("italic")} />
            <Btn label={<u>가</u>} title="밑줄 (Ctrl+U)" on={() => cmd("underline")} />
            <Btn label={<span>x<sup>2</sup></span>} title="위 첨자" on={() => cmd("superscript")} />
            <Btn label={<span>x<sub>2</sub></span>} title="아래 첨자" on={() => cmd("subscript")} />
          </div>
          <span className="a2-doc-group-name">글자</span>
        </div>

        <div className="a2-doc-group">
          <div className="a2-doc-tools">
            <Btn label="• 목록" wide title="글머리표 목록" on={() => cmd("insertUnorderedList")} />
            <Btn label="1. 번호" wide title="번호 목록" on={() => cmd("insertOrderedList")} />
          </div>
          <span className="a2-doc-group-name">문단</span>
        </div>

        <div className="a2-doc-group">
          <div className="a2-doc-tools relative">
            <Btn wide label="표" title="표 넣기" on={() => setGrid((g) => ({ ...g, open: !g.open }))} />
            <Btn wide label="그림" title="그림 넣기 (PNG · JPG)" on={() => imageIn.current?.click()} />
            <Btn
              wide
              label="〈보기〉"
              title="〈보기〉 상자 넣기"
              on={() => insert(`<section data-box="보기"><p><br></p></section><p><br></p>`)}
            />
            <Btn
              wide
              label="※ 알림"
              title="※ 알림 넣기"
              on={() => insert(`<aside data-note><p>※ </p></aside><p><br></p>`)}
            />
            <Btn wide label="( ㄱ )" title="빈칸 표지 넣기 — 응시 화면에서 칸 모양으로 섭니다" on={blank} />
            {grid.open && (
              <div className="a2-doc-grid" onMouseLeave={() => setGrid((g) => ({ ...g, r: 0, c: 0 }))}>
                <p className="a2-doc-grid-label">
                  {grid.r > 0 ? `${grid.r}줄 × ${grid.c}칸` : "표 크기를 고르세요"}
                </p>
                {Array.from({ length: 8 }, (_, r) => (
                  <div key={r} className="flex">
                    {Array.from({ length: 8 }, (_, c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`${r + 1}줄 ${c + 1}칸 표`}
                        className={`a2-doc-grid-cell${r < grid.r && c < grid.c ? " on" : ""}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseEnter={() => setGrid({ open: true, r: r + 1, c: c + 1 })}
                        onClick={() => {
                          setGrid({ open: false, r: 0, c: 0 });
                          insert(tableHtml(r + 1, c + 1));
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
          <span className="a2-doc-group-name">넣기</span>
        </div>

        {/* 커서 자리에 따라 서는 도구 */}
        {ctx.inTable && (
          <div className="a2-doc-group a2-doc-group-ctx">
            <div className="a2-doc-tools">
              <Btn wide label="줄 +" title="아래에 줄 추가" on={() => tableEdit("row+")} />
              <Btn wide label="줄 −" title="이 줄 지우기" on={() => tableEdit("row-")} />
              <Btn wide label="칸 +" title="오른쪽에 칸 추가" on={() => tableEdit("col+")} />
              <Btn wide label="칸 −" title="이 칸 지우기" on={() => tableEdit("col-")} />
              <Btn wide label="표 지우기" title="표 전체 지우기" on={() => tableEdit("del")} />
            </div>
            <span className="a2-doc-group-name">표 · 첫 줄은 머리</span>
          </div>
        )}
        {ctx.box && (
          <div className="a2-doc-group a2-doc-group-ctx">
            <div className="a2-doc-tools">
              <input
                key={ctx.box.getAttribute("data-box") ?? ""}
                className="a2-doc-input"
                defaultValue={ctx.box.getAttribute("data-box") ?? ""}
                aria-label="상자 이름"
                onChange={(e) => {
                  ctx.box?.setAttribute("data-box", e.target.value);
                  touched();
                }}
              />
            </div>
            <span className="a2-doc-group-name">상자 이름 — 비우면 이름 없이</span>
          </div>
        )}
      </div>

      {/* 책상 — 가운데에 A4 한 장 */}
      <div
        className={`a2-doc-desk${drag ? " a2-doc-drag" : ""}`}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            setDrag(true);
          }
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          const f = e.dataTransfer.files[0];
          setDrag(false);
          if (!f) return;
          e.preventDefault();
          if (/\.(hwpx|docx|hwp|doc)$/i.test(f.name)) void load(f);
          else if (f.type.startsWith("image/")) void addImage(f);
        }}
      >
        <div
          ref={page}
          className="a2-doc-page"
          contentEditable
          suppressContentEditableWarning
          spellCheck={false}
          onInput={touched}
          onPaste={onPaste}
          aria-label="문서 본문"
        />
      </div>

      {/* 상태 줄 */}
      <div className="a2-doc-status">
        <span>글자 {chars.toLocaleString("ko-KR")}</span>
        {msg ? (
          <span style={{ color: msg.tone === "danger" ? "#b42318" : "#1a7f37" }}>{msg.text}</span>
        ) : (
          <span className="opacity-80">
            {mode === "question"
              ? "첫 줄부터 발문, 줄 맨 앞의 ① ② ③ …은 보기로 나뉩니다. 「정답: ③」 줄은 정답으로 읽습니다. 표 · 그림 · 상자는 발문 아래 자료로 들어갑니다."
              : "한글 · 워드 파일을 이 창에 끌어다 놓아도 불러옵니다. 글꼴 · 크기 · 색은 응시 화면 서식으로 바뀝니다."}
          </span>
        )}
        <span className="ml-auto">Esc 닫기</span>
      </div>

      <input
        ref={fileIn}
        type="file"
        accept={IMPORT_ACCEPT}
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void load(f);
        }}
      />
      <input
        ref={imageIn}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void addImage(f);
        }}
      />
    </div>
  );
}
