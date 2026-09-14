"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { admin2Nav } from "@/lib/admin2";

/**
 * 화면 찾기 (Ctrl/⌘+K).
 *
 * 열두 화면짜리 콘솔에 검색창이 과하다고 볼 수도 있지만, 관리 도구에서 시간을 먹는
 * 것은 화면 수가 아니라 **왕복**이다. 표를 보다가 다른 표로 갈 때마다 마우스가 왼쪽
 * 끝까지 갔다 오는 것을 없애려고 둔다. 위/아래로 고르고 Enter로 간다.
 *
 * 화면 이름뿐 아니라 화면 ID(ADM-05)로도 찾힌다 — 정의서를 펴 놓고 대조하는 자리라
 * 번호로 찾는 편이 빠를 때가 있다.
 *
 * 대화상자이므로 열려 있는 동안 Tab이 뒤로 새지 않게 가두고, 닫을 때 초점을 열기 전
 * 자리로 돌려준다. ↑↓로 고른 줄은 상자 밖으로 나가면 따라 굴린다 — 바닥에 「↑↓ 고르기」라
 * 적어 두고 정작 고른 줄이 안 보이면 안내가 거짓말이 된다.
 */
export default function Palette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [at, setAt] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const flat = useMemo(
    () => admin2Nav.flatMap((g) => g.items.map((it) => ({ ...it, group: g.label }))),
    [],
  );
  const hits = useMemo(() => {
    const key = q.trim().toLowerCase();
    if (!key) return flat;
    return flat.filter(
      (it) =>
        it.label.toLowerCase().includes(key) ||
        it.code.toLowerCase().includes(key) ||
        it.group.toLowerCase().includes(key) ||
        it.href.toLowerCase().includes(key),
    );
  }, [flat, q]);

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    return () => before?.focus?.();
  }, []);

  // 고른 줄이 상자 밖이면 끌어온다. 상태를 바꾸지 않으므로 다시 그리지 않는다
  useEffect(() => {
    rowsRef.current[at]?.scrollIntoView({ block: "nearest" });
  }, [at]);

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[12vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={boxRef}
        role="dialog"
        aria-modal
        aria-label="화면 찾기"
        onKeyDown={(e) => {
          if (e.key !== "Tab") return;
          const focusable = boxRef.current?.querySelectorAll<HTMLElement>("input, button");
          if (!focusable?.length) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }}
        className="w-full max-w-[26rem] overflow-hidden rounded-(--a2-radius) border border-(--a2-line-2) bg-(--a2-panel) shadow-[var(--a2-shadow)]"
      >
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            // 고른 자리를 맨 위로 되돌린다. 효과로 되돌리면 글자를 칠 때마다 한 번 더 그린다
            setAt(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setAt((v) => Math.min(hits.length - 1, v + 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setAt((v) => Math.max(0, v - 1));
            }
            if (e.key === "Enter" && hits[at]) {
              e.preventDefault();
              go(hits[at].href);
            }
          }}
          placeholder="화면 이름 또는 번호 (예: 회차, ADM-05)"
          className="h-10 w-full border-b border-(--a2-line) px-3 a2-t text-(--a2-ink) outline-none placeholder:text-(--a2-ink-4)"
        />
        <ul className="max-h-[18rem] overflow-y-auto py-1">
          {hits.map((it, i) => (
            <li key={it.href}>
              <button
                type="button"
                ref={(el) => {
                  rowsRef.current[i] = el;
                }}
                onMouseEnter={() => setAt(i)}
                onClick={() => go(it.href)}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left ${
                  i === at ? "bg-(--a2-accent-soft)" : ""
                }`}
              >
                {/* 그룹 이름이 여섯 자까지 온다(「리포트 관리」). w-11(44px)로는 다섯 자부터
                    넘쳐 옆의 화면 이름 위로 겹쳐 그려졌다 — 폭을 늘리고 넘치면 줄인다 */}
                <span className="a2-t-xs w-14 shrink-0 truncate text-(--a2-ink-4)" title={it.group}>
                  {it.group}
                </span>
                <span className="a2-t min-w-0 truncate font-semibold text-(--a2-ink)">{it.label}</span>
                <span className="a2-mono ml-auto a2-t-xs text-(--a2-ink-4)">{it.code}</span>
              </button>
            </li>
          ))}
          {hits.length === 0 && <li className="px-3 py-3 a2-t-sm text-(--a2-ink-4)">찾는 화면이 없습니다.</li>}
        </ul>
        <div className="flex items-center gap-2 border-t border-(--a2-line) bg-(--a2-raised) px-3 py-1.5 a2-t-xs text-(--a2-ink-4)">
          <span className="a2-kbd">↑↓</span> 고르기
          <span className="a2-kbd">Enter</span> 이동
          <span className="a2-kbd">Esc</span> 닫기
        </div>
      </div>
    </div>
  );
}
