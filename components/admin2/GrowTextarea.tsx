"use client";

import { useEffect, useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";

/**
 * 적은 만큼 늘어나는 글 칸 — 문항 상세의 글 칸이 모두 쓴다.
 *
 * 칸 안에 스크롤이 서면 모범답안 · 인정 예처럼 긴 글을 한 번에 못 읽고, 칸 모서리를 끌어
 * 늘려야 했다. 적은 줄만큼 칸이 자란다. rows는 비었을 때의 높이로만 남는다.
 *
 * 크롬 계열은 CSS가 늘린다(admin2.css .a2-grow의 field-sizing). 그것을 모르는 브라우저만
 * 높이를 재서 박는다 — 재려고 높이를 잠깐 auto로 돌리는 순간 문서가 줄어, 긴 칸 아래쪽을
 * 쓰다 보면 화면이 위로 튄다. 그래서 그 길에서는 스크롤 자리를 되돌려 놓는다.
 *
 * ── line ──
 * 한 줄짜리 값(보기 · 성취기준 내용 · 학습 요소 …)이다. input으로 두었더니 칸 폭을 넘는
 * 글의 뒷부분이 밀려 들어가 보이지 않았다. 칸 폭에서 접혀 보이되 줄바꿈은 받지 않는다 —
 * 보기 글에 줄바꿈이 들면 응시 화면의 보기가 두 줄로 갈라진다.
 */
export default function GrowTextarea({
  line = false,
  rows = line ? 1 : 2,
  className = "",
  onChange,
  onKeyDown,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { line?: boolean }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  /* 비었을 때의 높이. field-sizing은 rows를 보지 않아서 rows만큼을 최소 높이로 박는다.
     클래스가 준 최소 높이(.a2-textarea-lg 72px)보다 낮게는 내리지 않는다 */
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.minHeight = "";
    const cs = getComputedStyle(el);
    const px = (v: string) => parseFloat(v) || 0;
    const floor =
      rows * px(cs.lineHeight) +
      px(cs.paddingTop) +
      px(cs.paddingBottom) +
      px(cs.borderTopWidth) +
      px(cs.borderBottomWidth);
    el.style.minHeight = `${Math.max(floor, px(cs.minHeight))}px`;
  }, [rows]);

  /* field-sizing을 모르는 브라우저 — 값이 바뀔 때마다 잰다 */
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && !sizesItself()) fit(el);
  }, [rest.value]);

  /* 폭이 바뀌면 접히는 줄 수가 바뀐다. 높이만 바뀐 것은 여기서 박은 높이라 다시 재지 않는다 */
  useEffect(() => {
    const el = ref.current;
    if (!el || sizesItself()) return;
    let width = el.clientWidth;
    const watch = new ResizeObserver(() => {
      if (el.clientWidth === width) return;
      width = el.clientWidth;
      fit(el);
    });
    watch.observe(el);
    return () => watch.disconnect();
  }, []);

  return (
    <textarea
      ref={ref}
      rows={rows}
      className={`${className} a2-grow${line ? " a2-grow-line" : ""}`}
      onKeyDown={(e) => {
        /* 한글 조합 중의 Enter는 글자를 끝맺는 키라 막지 않는다 */
        if (line && e.key === "Enter" && !e.nativeEvent.isComposing) e.preventDefault();
        onKeyDown?.(e);
      }}
      onChange={(e) => {
        /* 붙여 넣은 글의 줄바꿈은 띄어쓰기 하나로 */
        if (line && /[\r\n]/.test(e.target.value)) {
          e.target.value = e.target.value.replace(/[^\S\r\n]*[\r\n]+[^\S\r\n]*/g, " ");
        }
        onChange?.(e);
      }}
      {...rest}
    />
  );
}

function sizesItself() {
  return typeof CSS !== "undefined" && CSS.supports("field-sizing", "content");
}

function fit(el: HTMLTextAreaElement) {
  const page = document.scrollingElement;
  const top = page?.scrollTop ?? 0;
  const edges = el.offsetHeight - el.clientHeight;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight + edges}px`;
  if (page) page.scrollTop = top;
}
