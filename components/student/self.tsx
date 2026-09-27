"use client";

import Link from "next/link";
import { useSession } from "@/lib/authStore";
import { useHydrated } from "@/lib/examStore";
import { useRoster, type Student } from "@/lib/roster";

/**
 * 학생 대시보드(/student)가 「누구의 자리인가」를 정하는 곳.
 *
 * 학생 대시보드는 아이가 접속코드로 들어와 자기 것만 보는 자리다. 그래서 대상은 세션이
 * 정한다 — 학부모 화면처럼 ?student= 로 사람을 골라 오지 않는다. 주소를 고쳐 남의 결과를
 * 여는 길을 애초에 만들지 않는 편이 확인 한 줄을 더 두는 것보다 낫다.
 *
 * 보호자·기관 계정으로 이 주소에 들어오는 일도 있다 — 아이에게 무엇이 보이는지 확인하려는
 * 때다. 그때는 문을 닫고 「학생 계정에서 확인하세요」로 돌려보내지 않고, 자기 명부의 첫
 * 아이를 띄우고 **누구의 화면을 보고 있는지**를 위에 적는다(WhoNote). 닫아 버리면 보호자는
 * 아이가 무엇을 보는지 끝내 알 수 없고, 그게 문의로 돌아온다.
 */
export type Self = {
  hydrated: boolean;
  /** 응시 기록·지갑을 읽을 학생 ID. 명부에 아무도 없으면 시연용 "demo" */
  id: string;
  /** 명부에 있는 학생. 볼 아이가 아예 없으면 없다 */
  student: Student | null;
  name: string;
  /** 학생 본인으로 들어와 자기 자리를 보고 있는가 */
  own: boolean;
  /** 로그인하지 않았는가 */
  anonymous: boolean;
};

export function useSelf(): Self {
  const hydrated = useHydrated();
  const session = useSession();
  const roster = useRoster();

  if (session?.role === "student" && session.studentId) {
    const student = roster.find((s) => s.id === session.studentId) ?? null;
    return {
      hydrated,
      id: session.studentId,
      student,
      name: student?.name ?? session.name,
      own: true,
      anonymous: false,
    };
  }

  const owner = session?.role === "director" || session?.role === "teacher" ? "director" : "parent";
  const first = roster.find((s) => s.owner === owner) ?? null;
  return {
    hydrated,
    id: first?.id ?? "demo",
    student: first,
    name: first?.name ?? "응시자",
    own: false,
    anonymous: !session,
  };
}

/**
 * 학생 본인이 아닐 때 머리에 붙이는 한 줄.
 *
 * 색 면을 크게 깔지 않는다 — 화면의 주인은 아래 표지, 이 줄은 「지금 남의 자리를 보고
 * 있다」는 사실만 알리면 된다.
 */
export function WhoNote({ self }: { self: Self }) {
  if (!self.hydrated || self.own) return null;

  return (
    <p className="mb-5 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[12px] border border-soft-line bg-slate-50 px-4 py-3 text-[13px] text-soft-muted">
      {self.student ? (
        <>
          <span>
            <b className="font-semibold text-soft-ink">{self.student.name}</b> 학생에게 보이는 화면을
            그대로 보고 있습니다. 여기서 한 것은 학생 기록에 남습니다.
          </span>
          <Link href="/my" className="font-semibold text-soft-primary hover:underline">
            보호자 화면으로
          </Link>
        </>
      ) : (
        <>
          <span>
            {self.anonymous ? "로그인하지 않았습니다." : "아직 등록된 학생이 없습니다."} 학생
            접속코드로 들어오면 이 자리에 내 평가가 뜹니다.
          </span>
          <Link href="/login/student" className="font-semibold text-soft-primary hover:underline">
            학생 코드로 접속
          </Link>
        </>
      )}
    </p>
  );
}

/* ── 학생 대시보드가 함께 쓰는 조각 ── */

/** 화면 머리 — 분류 · 제목 · 오른쪽 액션. 학부모 홈과 같은 구성이다 */
export function Head({
  eyebrowText,
  title,
  lead,
  right,
}: {
  eyebrowText: string;
  title: string;
  lead?: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-soft-line pb-5">
      <div className="min-w-[16rem] flex-1">
        <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-soft-primary">
          {eyebrowText}
        </p>
        <h1 className="mt-1.5 text-[26px] font-bold tracking-tight text-soft-ink sm:text-[28px]">
          {title}
        </h1>
        {lead && <p className="mt-2.5 text-[13.5px] leading-[1.75] text-soft-muted">{lead}</p>}
      </div>
      {right && <div className="flex flex-wrap gap-2.5">{right}</div>}
    </header>
  );
}

/** 알약 단추 — 학부모 화면(themeOf(2))과 같은 무게 */
export const btnGo =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-soft-primary px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-soft-primary-dark";
export const btnQuiet =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-soft-line bg-white px-5 py-2.5 text-[14px] font-medium text-soft-ink transition-colors hover:bg-slate-50";
export const cardBox = "rounded-[14px] border border-soft-line bg-white";
