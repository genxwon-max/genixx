"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CloseIcon } from "@/components/Icons";
import { renderDetail } from "@/lib/richText";
import { popupNotice, useContent } from "@/lib/contentStore";

/**
 * 사이트를 열면 뜨는 공지 판.
 *
 * 콘솔에서 「팝업으로 띄움」을 켠 공지 하나가 여기로 온다(ADM-15). 목록에 올려 두는 것과
 * 눈앞에 띄우는 것은 다른 일이라, 켜는 자리도 따로 뒀다.
 *
 * ── 틀이 둘인 까닭 ──
 * 띄우는 까닭이 둘이다. 점검 안내처럼 **모르고 지나가면 곤란한 것**과, 모집·행사처럼
 * **보여 주고 부르는 것**. 앞엣것은 읽혀야 하고 뒤엣것은 눌려야 한다.
 *
 *   안내(notice)   「공지사항」 머리띠 · 제목 · 게시일 · 본문. 읽는 판이다
 *   이벤트(event)  머리띠 없이 그림이 판을 꽉 채우고, 아래에 갈 곳을 적은 단추가 선다
 *
 * 이벤트 포스터를 「공지사항」 머리띠에 넣으면 그림은 여백에 갇혀 작아지고, 정작 눌러야
 * 할 곳은 본문 속 링크 한 줄로 묻힌다. 반대로 점검 안내를 포스터 틀로 띄우면 무슨 말인지
 * 읽기 전에 닫힌다. 그래서 틀을 가르고, 어느 틀로 띄울지는 콘솔에서 사람이 고른다.
 *
 * ── 한 번 닫으면 그날은 다시 안 뜬다 ──
 * 화면을 옮길 때마다 다시 뜨면 공지가 아니라 방해가 된다. 닫은 사실을 이 브라우저에
 * 적어 두되 **공지 번호와 날짜를 함께** 적는다 — 다른 공지로 갈아 끼우면 다시 떠야 하고,
 * 날이 바뀌면 같은 공지라도 한 번은 더 보여 주는 편이 낫다.
 *
 * 닫는 길은 어느 틀에서나 같다(✕ · 닫기 · 바깥 누르기 · Esc). 「오늘 하루 보지 않기」를
 * 체크해 두면 어느 길로 닫든 그날은 다시 안 뜬다.
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

/**
 * 단추가 갈 곳 — 우리 화면(`/…`)인지 바깥(`https://…`)인지, 아니면 못 쓸 주소인지.
 *
 * 운영자가 적은 글자가 그대로 주소가 된다. `javascript:` 한 줄이 섞여 들어오면 판을
 * 누르는 것이 곧 코드 실행이 되므로, 아는 두 갈래만 통과시키고 나머지는 단추를 안 세운다.
 */
function popupHref(raw: string): { href: string; external: boolean } | null {
  const v = raw.trim();
  if (v === "") return null;
  if (v.startsWith("/")) return { href: v, external: false };
  if (/^https?:\/\//i.test(v)) return { href: v, external: true };
  return null;
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

  const event = notice.popupKind === "event";
  const html = renderDetail(notice.body.mode, notice.body.body, notice.body.images);
  /* 그림만 올린 이벤트 판은 그림이 판 끝까지 간다 — 여백을 두면 포스터가 액자에 갇힌다 */
  const poster = event && notice.body.mode === "images";
  const cta = event ? popupHref(notice.popupLink) : null;
  const ctaLabel = notice.popupLinkLabel.trim() || "자세히 보기";

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
        className={
          event
            ? "relative w-full max-w-[400px] overflow-hidden rounded-xl bg-white shadow-float outline-none"
            : "w-full max-w-[420px] overflow-hidden rounded-md bg-white shadow-float outline-none"
        }
      >
        {event ? (
          /* 머리띠를 걷고 ✕만 그림 위에 얹는다 — 포스터가 판의 첫 줄부터 시작해야 한다 */
          <button
            type="button"
            onClick={close}
            aria-label="공지 닫기"
            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/65"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        ) : (
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
        )}

        {/* 이벤트 판은 ✕가 글 위에 떠 있다 — 오른쪽을 비워 두지 않으면 제목이 그 밑으로 들어간다 */}
        <div
          className={
            poster
              ? "max-h-[64vh] overflow-y-auto"
              : event
                ? "max-h-[56vh] overflow-y-auto py-5 pl-5 pr-14"
                : "max-h-[56vh] overflow-y-auto px-5 py-5"
          }
        >
          {poster ? (
            /* 제목은 그림 안에 그려져 있다. 판의 이름은 화면 낭독기에만 남긴다 */
            <h2 id="notice-popup-title" className="sr-only">
              {notice.title}
            </h2>
          ) : (
            <>
              <h2 id="notice-popup-title" className={event ? "type-h3 font-bold text-slate-900" : "type-h4 font-bold text-slate-900"}>
                {notice.title}
              </h2>
              {/* 게시일은 안내 판에만 — 행사 판에서 궁금한 날짜는 「언제 하는가」지 「언제 올렸는가」가 아니다 */}
              {!event && (
                <p className="type-caption mt-1 tabular-nums text-slate-400">{notice.postedOn}</p>
              )}
            </>
          )}
          <div
            className={
              poster
                ? `popup-poster${notice.body.images.length === 1 ? " popup-poster-fit" : ""}`
                : event
                  ? "type-body prose-faq mt-3 text-slate-600"
                  : "type-body prose-faq mt-4 border-t border-slate-200 pt-4 text-slate-600"
            }
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>

        {cta &&
          (cta.external ? (
            <a
              href={cta.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={close}
              className="type-h4 block bg-brand-900 px-5 py-3.5 text-center font-bold text-white transition-colors hover:bg-brand-950"
            >
              {ctaLabel}
            </a>
          ) : (
            <Link
              href={cta.href}
              onClick={close}
              className="type-h4 block bg-brand-900 px-5 py-3.5 text-center font-bold text-white transition-colors hover:bg-brand-950"
            >
              {ctaLabel}
            </Link>
          ))}

        <div
          className={
            event
              ? "flex items-center justify-between gap-3 bg-slate-900 py-2 pl-5 pr-2 text-white"
              : "flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 py-2 pl-5 pr-2"
          }
        >
          <label
            className={
              event
                ? "type-meta flex cursor-pointer items-center gap-2 text-white/80"
                : "type-meta flex cursor-pointer items-center gap-2 text-slate-600"
            }
          >
            <input
              type="checkbox"
              checked={skipToday}
              onChange={(e) => setSkipToday(e.target.checked)}
              className={event ? "h-4 w-4 accent-white" : "h-4 w-4 accent-brand-900"}
            />
            오늘 하루 보지 않기
          </label>
          <button
            type="button"
            onClick={close}
            className={
              event
                ? "type-meta rounded px-3 py-2 font-bold text-white transition-colors hover:bg-white/10"
                : "type-meta rounded px-3 py-2 font-bold text-slate-700 transition-colors hover:bg-slate-200"
            }
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
