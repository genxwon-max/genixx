"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSession } from "@/lib/authStore";
import { addDays, today, weekday, weekdayKo } from "@/lib/calendar";
import {
  caseStatusLabel,
  caseStatusTone,
  statusOf,
  useCounselCases,
  type CaseStatus,
  type CounselCase,
} from "@/lib/counselCaseStore";
import { useBookings, type Booking } from "@/lib/counselStore";
import { useHydrated } from "@/lib/examStore";
import {
  DEMO_EXPERT_ID,
  demoClients,
  type ExpertAccount,
  type ExpertDuty,
} from "@/lib/expertAccounts";
import { useExpertAccount } from "@/lib/expertAccountStore";
import { useRoster, type Student } from "@/lib/roster";
import { Head, btnGo, btnQuiet, cardBox } from "@/components/student/self";

/**
 * 전문가 자리(/expert)가 함께 쓰는 것 — 「지금 누구인가」와 「나에게 들어온 면담」.
 *
 * ── 승인과 권한은 계정에서 읽는다 ──
 * 세션에는 계정 번호(expertId)만 있다. 승인 여부와 권한을 세션에 베껴 두면, 운영진이
 * 승인하거나 권한을 고친 뒤에도 다시 로그인하기 전까지 옛 값으로 화면이 선다.
 *
 * ── 면담 신청은 내 줄에 잡힌 예약이다 ──
 * 보호자·학생이 면담을 신청하면 예약(lib/counselStore.ts)에 상담사 번호가 박힌다. 그
 * 번호가 내 계정의 counselorId와 같은 것만 내 것이다. 다른 상담사에게 간 신청은 목록에도
 * 서지 않고, 그 학생의 주소를 직접 쳐도 열리지 않는다(clientOf).
 */

export type ExpertMe = {
  hydrated: boolean;
  /** 전문가로 로그인해 있는가 */
  signedIn: boolean;
  account: ExpertAccount | null;
  approved: boolean;
  has: (duty: ExpertDuty) => boolean;
};

export function useExpertMe(): ExpertMe {
  const hydrated = useHydrated();
  const session = useSession();
  const signedIn = session?.role === "expert";
  const account = useExpertAccount(signedIn ? session?.expertId : null);
  const approved = account?.state === "approved";
  return {
    hydrated,
    signedIn,
    account,
    approved,
    has: (duty) => approved && !!account?.duties.includes(duty),
  };
}

/* ───────────────────────── 나에게 들어온 면담 ───────────────────────── */

/** 면담 한 건 — 실제 예약과 시연용 예시를 같은 꼴로 편 것 */
export type ClientBooking = Booking & {
  /** 시연 계정에 세운 예시 신청 — 명부에 없는 학생이라 정보도 예시에서 읽는다 */
  demo: boolean;
  /** 신청 → 확정 → 진행중 → 완료 (lib/counselCaseStore.ts) */
  status: CaseStatus;
  /** 상담사가 손댄 기록 — 거절 사유 · 상담일지 · 한 일. 손대지 않았으면 없다 */
  kase: CounselCase | null;
};

/** 끝난 자리 — 목록 아래로 내리고, 학생 자료를 여는 근거로 치지 않는다 */
export const isDead = (s: CaseStatus) => s === "declined" || s === "canceled";

/** 수락한 뒤의 자리 — 연락처와 보고서는 여기서부터 열린다 */
export const isAccepted = (s: CaseStatus) => s === "confirmed" || s === "ongoing" || s === "done";

/** 상태 한마디 — 목록과 상세가 같은 색으로 적는다 */
export function CaseTag({ status }: { status: CaseStatus }) {
  return (
    <span className={`text-[13px] font-semibold ${caseStatusTone[status]}`}>
      {caseStatusLabel[status]}
    </span>
  );
}

/** 면담을 신청한 학생 한 사람 — 명부에 있으면 명부에서, 없으면 예시에서 */
export type ClientStudent = {
  id: string;
  name: string;
  school?: string;
  grade?: string;
  birth?: string;
  guardianName?: string;
  guardianPhone?: string;
  /** 명부의 학생 — 보호자가 적은 관찰·관심 분야가 여기 있다 */
  roster: Student | null;
  demo: boolean;
  /**
   * 수락한 신청이 하나라도 있는가.
   *
   * 신청만 들어온 단계에서는 수락할지 정하는 데 필요한 것(학교 · 학년 · 상담 목적)만 보이고,
   * 보호자 연락처와 진단 보고서는 수락한 뒤에 열린다 — 맡지 않을 수도 있는 아이의 자료를
   * 먼저 펴 볼 까닭이 없다.
   */
  accepted: boolean;
};

/**
 * 예시 신청의 날짜 — 오늘에서 며칠 뒤(앞)로 잡되, 시연 상담사의 근무 요일(월·수·금)에 맞춘다.
 * 맞추지 않으면 「상담 일정」 달력에서 쉬는 날에 신청이 떠 있다.
 */
function demoDate(now: string, offset: number) {
  let date = addDays(now, offset);
  while (![1, 3, 5].includes(weekday(date))) date = addDays(date, offset < 0 ? -1 : 1);
  return date;
}

/** 내 줄에 잡힌 예약 전부 — 다가오는 것이 위로, 끝난 것과 거절·취소는 아래로 */
export function useMyBookings(account: ExpertAccount | null): ClientBooking[] {
  const all = useBookings();
  const cases = useCounselCases();
  return useMemo(() => {
    if (!account?.counselorId) return [];
    const now = today();
    const withCase = <T extends Booking>(b: T, demo: boolean): ClientBooking => ({
      ...b,
      demo,
      status: statusOf(b, cases),
      kase: cases.cases[b.id] ?? null,
    });
    const real: ClientBooking[] = all
      .filter((b) => b.counselorId === account.counselorId)
      .map((b) => withCase(b, false));
    const demo: ClientBooking[] =
      account.id === DEMO_EXPERT_ID
        ? demoClients.map((d) =>
            withCase(
              {
                id: d.id,
                studentId: d.studentId,
                studentName: d.studentName,
                counselorId: account.counselorId!,
                date: demoDate(now, d.dayOffset),
                start: d.start,
                span: d.span,
                mode: d.mode,
                note: d.note,
                bookerName: d.booker === "student" ? d.studentName : d.guardianName,
                bookerRole: d.booker,
                madeAt: "",
                state: "booked",
              },
              true,
            ),
          )
        : [];

    const rank = (b: ClientBooking) =>
      isDead(b.status) ? 2 : b.status === "done" || b.date < now ? 1 : 0;
    return [...real, ...demo].sort((a, b) => {
      const d = rank(a) - rank(b);
      if (d !== 0) return d;
      const when = `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`);
      /* 다가오는 것은 가까운 날부터, 지난 것은 최근 것부터 */
      return rank(a) === 0 ? when : -when;
    });
  }, [all, cases, account]);
}

/** 이 학생이 나에게 면담을 신청한 사람인가 — 거절·취소한 신청만 남은 학생은 열지 않는다 */
export function useClient(
  account: ExpertAccount | null,
  studentId: string,
): { student: ClientStudent | null; bookings: ClientBooking[] } {
  const mine = useMyBookings(account);
  const roster = useRoster();
  return useMemo(() => {
    const bookings = mine.filter((b) => b.studentId === studentId);
    const live = bookings.filter((b) => !isDead(b.status));
    if (live.length === 0) return { student: null, bookings: [] };

    const first = live[0];
    const seed = first.demo ? demoClients.find((d) => d.studentId === studentId) : undefined;
    const row = roster.find((s) => s.id === studentId) ?? null;
    return {
      bookings,
      student: {
        id: studentId,
        name: row?.name ?? first.studentName,
        school: row?.school ?? seed?.school,
        grade: row?.grade ?? seed?.grade,
        birth: row?.birth,
        guardianName: row?.guardianName ?? seed?.guardianName,
        guardianPhone: row?.guardianPhone ?? seed?.guardianPhone,
        roster: row,
        demo: first.demo,
        accepted: live.some((b) => isAccepted(b.status)),
      },
    };
  }, [mine, roster, studentId]);
}

/** 「2026-10-12」 → 「10.12 (월)」 */
export const dayLabel = (date: string) =>
  `${date.slice(5, 7)}.${date.slice(8, 10)} (${weekdayKo(date)})`;

/** 신청한 사람 한 줄 — 「김보호 · 학부모」. 옛 예약에는 신청인이 없어 명부에서 대신 읽는다 */
export function bookerText(b: ClientBooking, guardianName?: string) {
  if (b.bookerRole === "student") return `${b.studentName} · 학생 본인`;
  const name = b.bookerName || guardianName;
  return name ? `${name} · 학부모` : "학부모";
}

/* ───────────────────────── 문 ───────────────────────── */

/**
 * 전문가 화면을 열 수 없을 때 대신 세우는 판.
 *
 * 로그인하지 않았거나 다른 회원으로 들어와 있으면 로그인으로, 승인 전이거나 권한이 없으면
 * 전문가 홈으로 보낸다 — 홈이 「지금 어디까지 왔는지」를 말하는 자리다.
 */
export function ExpertGate({
  title,
  me,
  need,
}: {
  title: string;
  me: ExpertMe;
  /** 이 화면을 여는 데 필요한 권한. 없으면 승인만 본다 */
  need?: { duty: ExpertDuty; label: string };
}): React.ReactNode | null {
  if (!me.hydrated) {
    return (
      <>
        <Head title={title} />
        <p className={`${cardBox} mt-7 p-12 text-center text-[13px] text-soft-muted`}>
          확인 중입니다…
        </p>
      </>
    );
  }

  const note = (head: string, body: string, action: React.ReactNode) => (
    <>
      <Head title={title} />
      <div className={`${cardBox} mt-7 p-7 text-center sm:p-9`}>
        <p className="text-[15px] font-bold text-soft-ink">{head}</p>
        <p className="mx-auto mt-2.5 max-w-[34rem] text-[13px] leading-[1.8] text-soft-muted">
          {body}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">{action}</div>
      </div>
    </>
  );

  if (!me.signedIn || !me.account) {
    return note(
      "전문가 계정으로 로그인해 주세요",
      "이 화면은 전문가 회원 전용입니다. 전문가로 가입하셨다면 가입할 때 정한 방법으로 로그인해 주세요.",
      <>
        <Link href="/login" className={btnGo}>
          로그인
        </Link>
        <Link href="/signup/type" className={btnQuiet}>
          전문가 회원가입
        </Link>
      </>,
    );
  }

  if (need && !me.has(need.duty)) {
    return note(
      me.approved ? `${need.label} 권한이 없습니다` : "아직 가입 승인 전입니다",
      me.approved
        ? `이 화면은 ${need.label} 권한을 받은 전문가에게만 열립니다. 권한은 운영진이 가입 승인에서 정합니다.`
        : "운영진이 소속과 경력을 확인한 뒤 권한을 정해 계정을 활성화합니다. 그때까지는 내 정보만 채울 수 있습니다.",
      <Link href="/expert" className={btnGo}>
        전문가 홈으로
      </Link>,
    );
  }

  return null;
}

/** 사진 자리 — 올린 사진이 없으면 이름 모노그램 */
export function ExpertPhoto({
  photo,
  name,
  size = 72,
}: {
  photo: string;
  name: string;
  size?: number;
}) {
  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt=""
        style={{ width: size, height: size }}
        className="shrink-0 rounded-[14px] object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.round(size * 0.3) }}
      className="flex shrink-0 items-center justify-center rounded-[14px] bg-soft-primary-soft font-bold text-soft-primary"
    >
      {name.slice(1) || name || "?"}
    </span>
  );
}
