"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { FREE_LIMIT_MIN, SUBJECT_IDS, freeOrder, isSubjectId, tierQuestions } from "@/lib/exam";
import { useExamRecord, useHydrated } from "@/lib/examStore";
import { useSession } from "@/lib/authStore";
import { useExamConfig } from "@/lib/roundStore";
import { askExamExit, useExamExitAvailable } from "@/lib/fullscreen";
import { isAnswered } from "./ExamSession";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * 응시 중 화면 오른쪽 위에 붙는 응답 수 · 남은 시간 · 포기하기.
 *
 * 전체화면을 끄는 단추는 두지 않는다 — 나가는 길은 「포기하기」 하나고, ESC도 같은 물음을
 * 연다(lib/fullscreen.ts). 셋트는 시계가 없어 「셋트 그만하기」만 선다.
 */
export default function ExamStatusBar() {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const session = useSession();
  const record = useExamRecord(session?.studentId ?? "demo");
  const config = useExamConfig();
  const [now, setNow] = useState(0);
  const canExit = useExamExitAvailable();

  const slug = pathname.startsWith("/exam/session/") ? pathname.split("/")[3] : null;
  const subject = slug && isSubjectId(slug) ? slug : null;
  /**
   * 무료시험(/exam/session/free)은 과목 셋을 한 판으로 본다.
   *
   * 세 기록이 함께 움직이므로(startFree · submitFree) 시계와 상태는 어느 하나를 봐도 같다.
   * 응답 수만 스물을 통째로 세어야 한다 — 국어 기록 하나만 세면 「2/4」가 떠서, 스무 문항을
   * 푸는 아이가 거의 다 온 줄 안다.
   */
  const free = slug === "free";
  const rec = free ? record.subjects[SUBJECT_IDS[0]] : subject ? record.subjects[subject] : null;
  const opened = free
    ? freeOrder()
    : subject
      ? tierQuestions(record.tier, subject, record.setSubject)
      : [];
  const answersOf = (q: (typeof opened)[number]) => record.subjects[q.subject].answers[q.id];
  // 안내 화면을 지나 실제 응시가 시작된 뒤에만 노출한다
  const live = !!rec?.startedAt && (rec.status === "ready" || rec.status === "in-progress");

  useEffect(() => {
    if (!live) return;
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [live]);

  if (pathname.startsWith("/exam/session/trial/")) {
    return canExit ? <ExitLink>셋트 그만하기</ExitLink> : null;
  }
  if (!rec || !hydrated || !live) return null;

  /* 갈래가 연 문항만 센다 — 무료시험을 보는 아이에게 「3/50」이라 적으면 끝이 안 보인다 */
  const done = opened.filter((q) => isAnswered(q, answersOf(q))).length;
  const started = rec.startedAt ? new Date(rec.startedAt).getTime() : now;
  const elapsed = Math.max(0, Math.floor((now - started) / 1000));
  /* 시작할 때 박아 둔 값을 쓴다 — 관리자가 도중에 줄여도 이 시계는 줄지 않는다 */
  const limitMin = rec.limitMin ?? (free ? FREE_LIMIT_MIN : config.limits[subject!]);
  const remain = Math.max(0, limitMin * 60 - elapsed);
  const low = remain < config.warnMin * 60;

  return (
    <div className="flex items-center gap-2">
      <div className="hidden items-center gap-1.5 rounded-md border border-exam-line bg-exam-raised px-3 py-1.5 sm:flex">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-exam-muted">
          응답
        </span>
        <span className="text-[14px] font-black tabular-nums text-exam-text">
          {done}
          <span className="text-exam-muted">/{opened.length}</span>
        </span>
      </div>

      <div
        className={`flex items-center gap-2 rounded-md border px-3.5 py-1.5 ${
          low ? "border-rose-300 bg-rose-50" : "border-exam-line bg-exam-raised"
        }`}
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-exam-muted">
          남은 시간
        </span>
        <span
          className={`text-[18px] font-black leading-none tabular-nums ${
            low ? "text-rose-600" : "text-exam-text"
          }`}
        >
          {pad(Math.floor(remain / 60))}:{pad(remain % 60)}
        </span>
        <span className="hidden text-[10px] tabular-nums text-exam-muted md:block">
          / {limitMin}:00
        </span>
      </div>

      {canExit && <ExitLink>포기하기</ExitLink>}
    </div>
  );
}

/** 버튼이 아니라 글 링크로 둔다 — 시험 도중에 눈에 띄게 누를 자리가 아니다 */
function ExitLink({ children }: { children: string }) {
  return (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        askExamExit();
      }}
      className="ml-2 cursor-pointer whitespace-nowrap text-[13px] font-medium text-exam-muted underline-offset-4 transition-colors hover:text-rose-600 hover:underline"
    >
      {children}
    </a>
  );
}
