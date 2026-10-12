"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "@/components/Icons";
import type { SubjectId } from "@/lib/exam";
import { HeadRow } from "./ExamStatusBar";
import { examPaper, examSerif, examZone } from "./skin";

/**
 * 시험지 창 — 응시 화면과 같은 틀을 페이지 위에 띄우는 껍데기.
 *
 * 두 자리가 쓴다.
 *   답안 풀이 보기  학생 대시보드의 정오표에서 여는 창(./AnswerReview.tsx)
 *   채점하기        운영 콘솔의 회원 채점에서 여는 창(./GradeDialog.tsx)
 *
 * 둘 다 **아이가 본 시험지 그대로** 보여야 한다 — 왼쪽에 자료, 가운데에 문항, 오른쪽에 문항
 * 이동판, 아래에 이전 · 다음. 그래서 틀은 여기 하나로 두고, 칸 안에 무엇을 얹을지(채점 결과 ·
 * 점수 칸)만 부르는 쪽이 정한다.
 *
 * 응시 존의 색 · 모서리 · 시험지 글꼴을 이 창 안에만 건다(./skin.ts) — 창 밖의 화면은 제
 * 모양 그대로다.
 */

const subscribeNothing = () => () => {};

export default function PaperDialog({
  label,
  name,
  note,
  subjects,
  subject,
  onSubject,
  onClose,
  resetKey,
  children,
  footer,
}: {
  /** 낭독기가 읽는 창 이름 */
  label: string;
  /** 머리 왼쪽의 진단 이름 — 응시 화면의 머리처럼 앞에 검사 이름이 붙는다 */
  name: string;
  /** 진단 이름 옆에 적는 글 — 「수학 답안 풀이」 */
  note: string;
  /** 머리의 과목 단추 — 하나뿐이면 세우지 않는다 */
  subjects: { id: SubjectId; short: string }[];
  subject: SubjectId;
  onSubject: (id: SubjectId) => void;
  onClose: () => void;
  /** 바뀌면 본문을 맨 위로 올린다 — 좁은 화면은 세 칸이 한 줄로 쌓여 통째로 밀린다 */
  resetKey: string;
  /** 본문의 세 칸 — 자료 · 문항 · 문항 이동판 */
  children: ReactNode;
  /** 하단 바 — 응시 화면과 같은 자리에 이전 · 다음 */
  footer: ReactNode;
}) {
  const body = useRef<HTMLDivElement>(null);
  /* 창이 열린 채로 처음 그려질 수 있다(디자인 보기의 주소) — 서버에는 붙일 body가 없다 */
  const mounted = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* 창이 떠 있는 동안 뒤의 화면은 밀리지 않는다 */
  useEffect(() => {
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = before;
    };
  }, []);

  useEffect(() => {
    body.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [resetKey]);

  if (!mounted) return null;

  /* body 바로 밑에 띄운다 — 본문 안에 두면 그 화면의 머리와 메뉴가 창 위로 올라온다 */
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="no-print fixed inset-0 z-50 flex bg-soft-ink/50 lg:p-5"
    >
      <div
        className={`${examSerif.variable} mx-auto flex h-full w-full max-w-[1600px] flex-col overflow-hidden bg-exam-bg font-sans text-[16px] leading-normal text-exam-text shadow-[0_20px_60px_rgba(15,23,42,0.3)] lg:rounded-[4px]`}
        style={{ ...examZone, ...examPaper }}
      >
        {/* 머리 한 줄 — 응시 화면의 머리와 같은 줄(HeadRow). 남은 시간 자리에 과목과 닫기가 선다 */}
        <header className="shrink-0 bg-exam-panel shadow-[inset_0_-1px_0_var(--color-exam-line)]">
          <div className="flex h-16 items-center gap-4 px-6 lg:px-10">
            <HeadRow name={name} subject={note}>
              {subjects.length > 1 && (
                <div role="group" aria-label="과목" className="flex">
                  {subjects.map((s) => {
                    const on = s.id === subject;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => onSubject(s.id)}
                        className={`-ml-px border px-3 py-1.5 text-[13px] transition-colors first:ml-0 ${
                          on
                            ? "relative border-exam-text bg-exam-text font-bold text-white"
                            : "border-exam-line bg-exam-panel text-exam-muted hover:bg-exam-raised hover:text-exam-text"
                        }`}
                      >
                        {s.short}
                      </button>
                    );
                  })}
                </div>
              )}
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 rounded-[2px] px-2.5 py-1.5 text-[13px] text-exam-muted transition-colors hover:bg-exam-raised hover:text-exam-text"
              >
                <CloseIcon className="h-4 w-4" />
                닫기
              </button>
            </HeadRow>
          </div>
        </header>

        {/* 본문 — 좌: 자료(보기) / 가운데: 문항 / 우: 문항 이동판. 응시 화면과 같은 칸이다 */}
        <div
          ref={body}
          className="grid min-h-0 w-full flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_14rem] lg:overflow-hidden"
        >
          {children}
        </div>

        <div className="shrink-0 border-t border-exam-line bg-exam-panel">
          <div className="flex h-[72px] w-full items-center justify-between gap-4 px-6 lg:px-10">
            {footer}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
