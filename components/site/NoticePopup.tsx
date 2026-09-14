"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { renderDetail } from "@/lib/richText";
import { popupNotice, useContent } from "@/lib/contentStore";

/**
 * 사이트를 열면 뜨는 공지 판.
 *
 * 콘솔에서 「팝업으로 띄움」을 켠 공지 하나가 여기로 온다(ADM-15). 목록에 올려 두는 것과
 * 눈앞에 띄우는 것은 다른 일이라, 켜는 자리도 따로 뒀다 — 점검 안내처럼 **모르고 지나가면
 * 곤란한 것**만 띄운다.
 *
 * ── 한 번 닫으면 그날은 다시 안 뜬다 ──
 * 화면을 옮길 때마다 다시 뜨면 공지가 아니라 방해가 된다. 닫은 사실을 이 브라우저에
 * 적어 두되 **공지 번호와 날짜를 함께** 적는다 — 다른 공지로 갈아 끼우면 다시 떠야 하고,
 * 날이 바뀌면 같은 공지라도 한 번은 더 보여 주는 편이 낫다.
 *
 * ⚠ 저장소가 브라우저에 있어 서버가 그리는 첫 화면에는 아무것도 없다(씨앗의 팝업도
 *   서버에서는 안 뜬다). 붙일 때는 콘텐츠 API를 서버에서 읽어 첫 그림에 담는다.
 */

const KEY = "genixx.notice.seen";
const EVENT = "genixx:notice-seen";

/**
 * 「오늘 하루 보지 않기」로 닫아 둔 표식을 읽는다.
 *
 * 서버에서는 **모른다**(?)로 내놓는다. 빈 값으로 두면 서버가 판을 그려 놓고 붙자마자
 * 사라지는 깜빡임이 생긴다 — 이미 닫아 둔 사람에게 판이 한 번 번쩍이는 셈이다.
 */
function readSeen() {
  try {
    return window.localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

function subscribeSeen(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

/** 오늘 (YYYY-MM-DD) — 닫은 날을 적어 두는 값 */
function today() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function NoticePopup() {
  const content = useContent();
  const notice = popupNotice(content);
  const seen = useSyncExternalStore(subscribeSeen, readSeen, () => "?");
  /* 이번 방문에서만 닫은 것 — 「오늘 하루」와 달리 다음 화면에서 다시 뜬다 */
  const [dismissed, setDismissed] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const closed = !notice || dismissed || seen === "?" || seen === `${notice.id}@${today()}`;
  useEffect(() => {
    if (closed) return;
    const before = document.activeElement as HTMLElement | null;
    box.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDismissed(true);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      before?.focus?.();
    };
  }, [closed]);

  if (!notice || closed) return null;

  const html = renderDetail(notice.body.mode, notice.body.body, notice.body.images);

  const hideToday = () => {
    try {
      window.localStorage.setItem(KEY, `${notice.id}@${today()}`);
      window.dispatchEvent(new Event(EVENT));
    } catch {
      /* 저장을 막아 둔 브라우저에서도 닫히기는 해야 한다 */
    }
    setDismissed(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setDismissed(true);
      }}
    >
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notice-popup-title"
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key !== "Tab") return;
          const able = box.current?.querySelectorAll<HTMLElement>("a[href], button");
          if (!able?.length) return;
          const first = able[0];
          const last = able[able.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }}
        className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-float outline-none"
      >
        <div className="border-b border-brand-100 px-7 py-6">
          <p className="type-eyebrow text-brand-500">공지</p>
          <h2 id="notice-popup-title" className="type-h3 mt-2 font-black text-brand-950">
            {notice.title}
          </h2>
          <p className="type-meta mt-1 tabular-nums text-slate-400">{notice.postedOn}</p>
        </div>

        <div className="max-h-[46vh] overflow-y-auto px-7 py-6">
          <div
            className="type-body prose-faq leading-relaxed text-slate-600"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-100 bg-brand-50/60 px-7 py-4">
          <button
            type="button"
            onClick={hideToday}
            className="type-meta font-bold text-slate-500 underline-offset-4 hover:underline"
          >
            오늘 하루 보지 않기
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/support"
              onClick={() => setDismissed(true)}
              className="btn btn-sm border border-brand-200 bg-white text-brand-800 hover:border-brand-400"
            >
              고객지원
            </Link>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="btn btn-sm bg-brand-900 text-white hover:bg-brand-800"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
