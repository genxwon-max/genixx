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
  type SubjectId,
} from "@/lib/exam";
import { evalName, isTrackId } from "@/lib/examCatalog";
import { designOf, isDesignKind } from "@/lib/examDesign";
import { useWallet } from "@/lib/ticketStore";
import { useExamRecord, useHydrated } from "@/lib/examStore";
import { useSession } from "@/lib/authStore";
import { useExamConfig } from "@/lib/roundStore";
import { askExamExit, useExamExitAvailable } from "@/lib/fullscreen";
import { closeExamWindow } from "@/lib/popup";
import { CloseIcon } from "@/components/Icons";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/* ───────────────────────── 셋트가 고른 학년과 과목 ───────────────────────── */

/**
 * 셋트 창이 머리에 건네는 진단 이름과 과목.
 *
 * 유료 진단 창은 주소에 과목이 들어 있어(/exam/session/paid/수학) 머리가 혼자 읽는다. 셋트 창은
 * 학년도 과목도 **창 안에서 묻는다** — 표지를 넘기면 1번이 학교와 학년, 2번이 흥미 있는
 * 과목이다. 주소의 학년은 목록에서 누른 줄일 뿐이라, 1번에서 바꾸면 머리가 주소만 읽어서는
 * 다른 학년을 적게 된다. 머리는 레이아웃에, 셋트는 페이지에 있어 서로 다른 트리다 —
 * 「나가기」 신호와 같은 방법으로 건넨다.
 */
type TrialHead = { name: string | null; subject: string | null };

const NO_TRIAL_HEAD: TrialHead = { name: null, subject: null };
let trialHead = NO_TRIAL_HEAD;
const trialWatchers = new Set<() => void>();

/** 셋트 창이 켜져 있는 동안 머리에 진단 이름과 과목을 적는다 — 과목은 셋트에 들어선 뒤에만 있다 */
export function useTrialHead(name: string, subject: string | null) {
  useEffect(() => {
    trialHead = { name, subject };
    trialWatchers.forEach((w) => w());
    return () => {
      trialHead = NO_TRIAL_HEAD;
      trialWatchers.forEach((w) => w());
    };
  }, [name, subject]);
}

function useTrialHeadValue() {
  return useSyncExternalStore(
    (cb) => {
      trialWatchers.add(cb);
      return () => trialWatchers.delete(cb);
    },
    () => trialHead,
    () => NO_TRIAL_HEAD,
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
 * 이 줄은 응시 화면(/exam/session/…)에서만 선다. 탭 화면에서는 아무것도 그리지 않는다 —
 * 거기 헤더는 로고와 메뉴가 쓰는 자리다.
 *
 * 전체화면을 끄는 단추는 두지 않는다 — 나가는 길은 「포기하기」 하나고, ESC도 같은 물음을
 * 연다(lib/fullscreen.ts). 셋트는 시계가 없어 「셋트 그만하기」만 선다.
 *
 * ── 평가명은 어디서 오는가 ──
 * 셋트 창은 주소에 회차와 학년이 들어 있다(/exam/session/trial/2026-3/e4). 다만 학년은 창
 * 안의 1번에서 바꿀 수 있어, 창이 건넨 이름(useTrialHead)이 있으면 그것을 쓴다. 응시 창은
 * 주소에 없으므로 **접수 기록**에서 가장 최근 것을 읽는다 — 한 회차에 한 학년만 접수할 수
 * 있어 그 줄이 곧 지금 보는 평가다.
 */
export default function ExamStatusBar() {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const session = useSession();
  const record = useExamRecord(session?.studentId ?? "demo");
  const config = useExamConfig();
  const [now, setNow] = useState(0);
  const canExit = useExamExitAvailable();
  const trial = useTrialHeadValue();

  /* /exam/session/{갈래}/… — 갈래는 trial · free · paid 셋이고 늘 주소 세 번째 칸이다 */
  const parts = pathname.startsWith("/exam/session/") ? pathname.split("/") : [];
  const slug = parts[3] ?? null;
  const subject = slug === "paid" && isSubjectId(parts[4] ?? "") ? (parts[4] as SubjectId) : null;
  const wallet = useWallet(session?.studentId ?? "demo");
  /**
   * 무료 진단(/exam/session/free)은 과목 셋을 한 판으로 본다.
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
  /** 지금 보는 과목 — 무료 진단은 셋을 한 번에 본다 */
  const subjectText = free
    ? subjects.map((x) => x.short).join(" · ")
    : subject
      ? subjectOf(subject)!.name
      : null;

  /**
   * 응시 화면 밖에서는 아무것도 그리지 않는다.
   *
   * 이 줄은 **시험지 머리**다 — 로고도 메뉴도 감춘 자리에 평가명 · 과목 · 남은 시간만
   * 세우려고 만들었다. 그런데 주소를 가리지 않아 접수하기 · 응시하기 같은 탭 화면의
   * 헤더에도 평가명이 따라 붙었다. 거기는 왼쪽에 이미 「GENIXX · TalentMe 재능진단」이
   * 서 있는 자리라, 같은 이름이 한 줄에 두 번 서고 로그인한 사람 이름 앞을 막았다.
   */
  if (!slug) return null;

  /* 문항 유형 디자인 보기(/exam/session/design/[유형]) — 응시가 아니라 평가명도 시계도 없다 */
  if (slug === "design") {
    const kind = parts[4] ?? "";
    return (
      <HeadRow name="문항 유형" subject={isDesignKind(kind) ? designOf(kind).name : null}>
        {null}
      </HeadRow>
    );
  }

  /* 셋트에도 시계가 없다는 말은 머리에 적지 않는다. 시계가 서야 할 자리가 비어 있는
     것으로 이미 읽히고, 머리에 문장을 하나 더 두면 평가명·과목이 뒤로 밀린다 */
  if (slug === "trial") {
    return (
      /* 이름은 셋트 창이 건넨 것이 먼저다 — 1번에서 학년을 바꾸면 주소의 학년과 갈린다.
         주소에서 읽은 이름은 창이 아직 건네기 전의 첫 그림에만 선다 */
      <HeadRow name={trial.name ?? examName} subject={trial.subject}>
        {/* 시작하기 전(표지)에는 나갈 길이 「창 닫기」다. 시작한 뒤에는 전체화면이라
            브라우저의 닫기 단추가 보이지 않으므로 「셋트 그만하기」가 그 자리를 잇는다 */}
        {canExit ? <ExitLink>셋트 그만하기</ExitLink> : <CloseWindow fallback="/exam/apply" />}
      </HeadRow>
    );
  }
  /* 아직 시작하지 않은 표지에서도 머리는 선다 — 그 줄이 통째로 사라지면 헤더가 텅 빈다.
     시계만 아직 흐르지 않을 뿐, 무슨 평가의 어느 과목인지는 그때도 읽혀야 한다.

     다만 **읽히기 전에는 이름을 세우지 않는다.** 평가 이름은 접수 기록에서 나오는데
     그것은 브라우저에 있어 첫 그림에는 없다. 그 순간 examName은 바닥값인 기본 회차
     이름(「2026학년도 1회차(26A)」)이 되어, 아이가 접수한 평가와 **다른 이름**이 한 번
     번쩍이고 사라진다. 틀린 이름을 잠깐 보여 주느니 이름 없이 한 박자 기다린다 */
  if (!rec || !hydrated) {
    return (
      <HeadRow name={hydrated ? examName : null} subject={subjectText}>
        <CloseWindow fallback="/exam" />
      </HeadRow>
    );
  }
  /* 표지에서는 머리에 평가명과 과목만 둔다. 「아직 시작하지 않았습니다」는 종이 한가운데가
     이미 「시작하기 전에는 이 면을 넘기지 마시오」로 말하고 있는 것이라, 머리에 한 번 더
     적으면 같은 말이 한 화면에 둘이 된다 */
  if (!live) {
    /* 나갈 길은 **표지에서만** 둔다. 제출한 뒤의 해석 작성 화면도 여기로 오는데(시계가
       멎었으므로), 거기에 「창 닫기」를 세우면 방금 쓰던 해석을 두고 나가는 손잡이가
       문항 옆에 서게 된다. 아직 한 번도 시작하지 않았을 때만 세운다 */
    return (
      <HeadRow name={examName} subject={subjectText}>
        {rec.startedAt ? null : <CloseWindow fallback="/exam" />}
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
  children,
}: {
  /** 평가 이름. 아직 읽지 못했으면 없다 — 그때는 검사 이름만 선다 */
  name: string | null;
  subject: string | null;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
      <p className="flex min-w-0 items-baseline gap-2.5">
        <span className="truncate text-[14px] font-bold tracking-tight text-exam-text">
          {name ? `${assessment.name} ${name}` : assessment.name}
        </span>
        {subject && (
          <span className="hidden shrink-0 text-[13px] text-exam-muted sm:inline">{subject}</span>
        )}
      </p>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}

/**
 * 창 닫기 — 머리 오른쪽 끝.
 *
 * 응시 창은 대시보드에서 띄운 별도 창이라, 시험지 한 장만 놓고 보면 돌아갈 길이 보이지
 * 않는다. 닫는 일은 어느 화면에서나 오른쪽 위에 있으므로 그 자리에 둔다 — 종이 위에
 * 얹으면 시험지 안에 종이 밖의 단추가 서게 된다.
 *
 * 팝업이 막혀 같은 탭에서 열린 사람에게는 창을 닫을 수가 없어 주소로 돌려보낸다. 그
 * 돌아갈 자리가 갈래마다 다르다 — 셋트는 아직 회원이 아닌 사람이 온 자리라 평가 목록이고,
 * 무료·유료 진단은 접수한 사람이 온 자리라 응시하기다.
 */
function CloseWindow({ fallback }: { fallback?: string }) {
  return (
    <button
      type="button"
      onClick={() => closeExamWindow(fallback)}
      className="inline-flex items-center gap-1.5 rounded-[2px] px-2.5 py-1.5 text-[13px] text-exam-muted transition-colors hover:bg-exam-raised hover:text-exam-text"
    >
      <CloseIcon className="h-4 w-4" />
      창 닫기
    </button>
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
