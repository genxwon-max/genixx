"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  FREE_LIMIT_MIN,
  SUBJECT_IDS,
  assessment,
  isSubjectId,
  subjectOf,
  subjects,
} from "@/lib/exam";
import { evalName, isTrackId } from "@/lib/examCatalog";
import { useWallet } from "@/lib/ticketStore";
import { useExamRecord, useHydrated } from "@/lib/examStore";
import { useSession } from "@/lib/authStore";
import { useExamConfig } from "@/lib/roundStore";
import { askExamExit, useExamExitAvailable } from "@/lib/fullscreen";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/* ───────────────────────── 셋트가 고른 교과 ───────────────────────── */

/**
 * 셋트 창이 머리에 건네는 교과 이름.
 *
 * 응시 창은 주소에 과목이 들어 있어(/exam/session/수학) 머리가 혼자 읽는다. 셋트 창은
 * 주소가 회차와 학년까지라, 교과는 시작 화면에서 고르고 나서야 정해진다. 머리는 레이아웃에,
 * 셋트는 페이지에 있어 서로 다른 트리다 — 「나가기」 신호와 같은 방법으로 건넨다.
 */
let trialSubject: string | null = null;
const trialWatchers = new Set<() => void>();

/** 셋트 응시 화면이 켜져 있는 동안 머리에 과목을 적는다 */
export function useTrialSubject(name: string | null) {
  useEffect(() => {
    trialSubject = name;
    trialWatchers.forEach((w) => w());
    return () => {
      trialSubject = null;
      trialWatchers.forEach((w) => w());
    };
  }, [name]);
}

function useTrialSubjectName() {
  return useSyncExternalStore(
    (cb) => {
      trialWatchers.add(cb);
      return () => trialWatchers.delete(cb);
    },
    () => trialSubject,
    () => null,
  );
}

/**
 * 응시 화면의 **머리 한 줄** — 평가명 · 과목 · 남은 시간, 그리고 나가는 길.
 *
 * 예전에는 머리가 둘이었다. 위에 로고와 남은 시간이 있고, 그 아래 응시 화면이 제 머리를
 * 또 그려 과목과 문항 수를 적었다. 시험지 한 장을 보는 자리에 띠가 둘이면 어느 쪽이 지금
 * 보는 시험인지 읽는 데 시간이 든다. 하나로 합치고, 거기에는 **무슨 평가의 어느 과목을
 * 얼마나 남기고 보고 있는지**만 둔다.
 *
 * 전체화면을 끄는 단추는 두지 않는다 — 나가는 길은 「포기하기」 하나고, ESC도 같은 물음을
 * 연다(lib/fullscreen.ts). 셋트는 시계가 없어 「셋트 그만하기」만 선다.
 *
 * ── 평가명은 어디서 오는가 ──
 * 셋트 창은 주소에 회차와 학년이 들어 있다(/exam/session/trial/2026-3/e4). 응시 창은 주소에
 * 없으므로 **접수 기록**에서 가장 최근 것을 읽는다 — 한 회차에 한 학년만 접수할 수 있어
 * 그 줄이 곧 지금 보는 평가다.
 */
export default function ExamStatusBar() {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const session = useSession();
  const record = useExamRecord(session?.studentId ?? "demo");
  const config = useExamConfig();
  const [now, setNow] = useState(0);
  const canExit = useExamExitAvailable();
  const trialName = useTrialSubjectName();

  const parts = pathname.startsWith("/exam/session/") ? pathname.split("/") : [];
  const slug = parts[3] ?? null;
  const subject = slug && isSubjectId(slug) ? slug : null;
  const wallet = useWallet(session?.studentId ?? "demo");
  /**
   * 무료시험(/exam/session/free)은 과목 셋을 한 판으로 본다.
   *
   * 세 기록이 함께 움직이므로(startFree · submitFree) 시계와 상태는 어느 하나를 봐도 같다.
   *
   * 응답 수는 여기서 세지 않는다 — 문항 이동판과 하단 바가 이미 세고 있고, 머리에는
   * 평가명 · 과목 · 남은 시간만 둔다.
   */
  const free = slug === "free";
  const rec = free ? record.subjects[SUBJECT_IDS[0]] : subject ? record.subjects[subject] : null;
  // 안내 화면을 지나 실제 응시가 시작된 뒤에만 노출한다
  const live = !!rec?.startedAt && (rec.status === "ready" || rec.status === "in-progress");

  useEffect(() => {
    if (!live) return;
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [live]);

  /** 지금 보는 평가의 이름 — 「2026 3분기 초4 평가」 */
  const applied = wallet.used[wallet.used.length - 1] ?? null;
  const examName =
    slug === "trial" && isTrackId(parts[5] ?? "")
      ? evalName(parts[4], parts[5] as Parameters<typeof evalName>[1])
      : applied
        ? evalName(applied.round, applied.track)
        : config.roundLabel;
  /** 지금 보는 과목 — 무료시험은 셋을 한 번에 본다 */
  const subjectText = free
    ? subjects.map((x) => x.short).join(" · ")
    : subject
      ? subjectOf(subject)!.name
      : null;

  if (slug === "trial") {
    return (
      <HeadRow name={examName} subject={trialName} hint="시간을 재지 않습니다">
        {canExit ? <ExitLink>셋트 그만하기</ExitLink> : null}
      </HeadRow>
    );
  }
  /* 아직 시작하지 않은 표지에서도 머리는 선다 — 그 줄이 통째로 사라지면 헤더가 텅 빈다.
     시계만 아직 흐르지 않을 뿐, 무슨 평가의 어느 과목인지는 그때도 읽혀야 한다 */
  if (!rec || !hydrated) {
    return <HeadRow name={examName} subject={subjectText}>{null}</HeadRow>;
  }
  if (!live) {
    return (
      <HeadRow name={examName} subject={subjectText} hint="아직 시작하지 않았습니다">
        {null}
      </HeadRow>
    );
  }

  const started = rec.startedAt ? new Date(rec.startedAt).getTime() : now;
  const elapsed = Math.max(0, Math.floor((now - started) / 1000));
  /* 시작할 때 박아 둔 값을 쓴다 — 관리자가 도중에 줄여도 이 시계는 줄지 않는다 */
  const limitMin = rec.limitMin ?? (free ? FREE_LIMIT_MIN : config.limits[subject!]);
  const remain = Math.max(0, limitMin * 60 - elapsed);
  const low = remain < config.warnMin * 60;

  return (
    <HeadRow name={examName} subject={subjectText}>
      <div
        className={`flex items-center gap-2 rounded-[2px] border px-3.5 py-1.5 ${
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
    </HeadRow>
  );
}

/**
 * 머리 한 줄 — 왼쪽에 평가명과 과목, 오른쪽에 남은 시간과 나가는 길.
 *
 * 이 줄이 응시 화면의 유일한 머리다. 응시 존 레이아웃이 로고와 메뉴를 감추고 이것만
 * 세운다(app/(exam)/layout.tsx).
 */
function HeadRow({
  name,
  subject,
  hint,
  children,
}: {
  name: string;
  subject: string | null;
  /** 시계가 없는 판(셋트)에서 그 자리에 적는 말 */
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
      <p className="flex min-w-0 items-baseline gap-2.5">
        <span className="truncate text-[14px] font-bold tracking-tight text-exam-text">
          {assessment.name} {name}
        </span>
        {subject && (
          <span className="hidden shrink-0 text-[13px] text-exam-muted sm:inline">{subject}</span>
        )}
        {hint && (
          <span className="hidden shrink-0 text-[13px] text-exam-muted sm:inline">{hint}</span>
        )}
      </p>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
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
