"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CloseIcon } from "@/components/Icons";
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
 * ── 생김새는 흔히 보는 공지 팝업 그대로 ──
 * 위에 「공지사항」 머리띠와 닫기(✕), 가운데 제목·게시일·본문, 아래에 「오늘 하루 보지
 * 않기」 체크와 [닫기]. 처음 보는 사람도 어디를 눌러야 닫히는지 바로 아는 모양이라,
 * 홍보 화면의 둥근 카드·알약 버튼 대신 이 틀을 쓴다. 체크해 두면 어느 길로 닫든
 * (✕·닫기·바깥 누르기·Esc) 그날은 다시 안 뜬다.
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

/** 「오늘 하루 보지 않기」 — 이 공지를 오늘 닫았다고 적어 둔다 */
function rememberToday(id: string) {
  try {
    window.localStorage.setItem(KEY, `${id}@${today()}`);
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* 저장을 막아 둔 브라우저에서도 닫히기는 해야 한다 */
  }
}

export default function NoticePopup() {
  const content = useContent();
  const notice = popupNotice(content);
  const seen = useSyncExternalStore(subscribeSeen, readSeen, () => "?");
  /* 이번 방문에서만 닫은 것 — 「오늘 하루」와 달리 다음 화면에서 다시 뜬다 */
  const [dismissed, setDismissed] = useState(false);
  /* 「오늘 하루 보지 않기」 체크 — 닫는 순간에 적는다 */
  const [skipToday, setSkipToday] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const closed = !notice || dismissed || seen === "?" || seen === `${notice.id}@${today()}`;
  const noticeId = notice?.id;

  /* 뜰 때 판으로 초점을 옮기고, 닫히면 원래 자리로 돌려준다 */
  useEffect(() => {
    if (closed) return;
    const before = document.activeElement as HTMLElement | null;
    box.current?.focus();
    return () => before?.focus?.();
  }, [closed]);

  /* Esc도 닫기와 같다 — 체크를 바꿀 때마다 새 값으로 다시 붙인다(초점 효과와 따로 둔 까닭) */
  useEffect(() => {
    if (closed || !noticeId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (skipToday) rememberToday(noticeId);
      setDismissed(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closed, skipToday, noticeId]);

  if (!notice || closed) return null;

  const close = () => {
    if (skipToday) rememberToday(notice.id);
    setDismissed(true);
  };

  const html = renderDetail(notice.body.mode, notice.body.body, notice.body.images);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
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
          const able = box.current?.querySelectorAll<HTMLElement>("a[href], button, input");
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
        className="w-full max-w-[420px] overflow-hidden rounded-md bg-white shadow-float outline-none"
      >
        <div className="flex items-center justify-between bg-brand-900 py-2.5 pl-5 pr-2 text-white">
          <p className="type-h4 font-bold">공지사항</p>
          <button
            type="button"
            onClick={close}
            aria-label="공지 닫기"
            className="flex h-9 w-9 items-center justify-center rounded text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[56vh] overflow-y-auto px-5 py-5">
          <h2 id="notice-popup-title" className="type-h4 font-bold text-slate-900">
            {notice.title}
          </h2>
          <p className="type-caption mt-1 tabular-nums text-slate-400">{notice.postedOn}</p>
          <div
            className="type-body prose-faq mt-4 border-t border-slate-200 pt-4 text-slate-600"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 py-2 pl-5 pr-2">
          <label className="type-meta flex cursor-pointer items-center gap-2 text-slate-600">
            <input
              type="checkbox"
              checked={skipToday}
              onChange={(e) => setSkipToday(e.target.checked)}
              className="h-4 w-4 accent-brand-900"
            />
            오늘 하루 보지 않기
          </label>
          <button
            type="button"
            onClick={close}
            className="type-meta rounded px-3 py-2 font-bold text-slate-700 transition-colors hover:bg-slate-200"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
