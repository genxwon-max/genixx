"use client";

import Link from "next/link";
import { ageFromBirth, CONSENT_AGE, MAJORITY_AGE } from "@/lib/account";
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
  /** 만 나이. 명부에 없거나 생년월일이 성하지 않으면 null */
  age: number | null;
  /**
   * 만 14세 이상인가 — 학생 자리에 **결제와 면담이 서는지**를 이 한 칸이 가른다.
   *
   * 개인정보 동의를 본인이 할 수 있는 나이(개인정보보호법 제22조의2)이고, 그때부터
   * 학생에게 자기 계정·자기 연락처가 있다. 미만인 아이 화면에 결제를 세워 두면 눌러
   * 봐야 「보호자 계정에서」만 나오고, 그 아이의 돈과 면담은 실제로 보호자가 다룬다.
   *
   * 나이를 모르면(명부에 없는 시연 계정) 세우지 않는다. 모르는 채로 여는 것보다
   * 닫아 두고 보호자 쪽으로 보내는 편이 낫다.
   */
  teen: boolean;
  /**
   * 만 19세 미만 미성년인가 — 결제 화면에서 법정대리인 동의를 한 칸 더 받는다.
   * 동의의 기준선(14세)과 계약의 기준선(19세)은 다른 선이다(lib/account.ts).
   */
  minor: boolean;
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
      ...ageOf(student),
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
    ...ageOf(first),
  };
}

/** 생년월일 한 칸에서 나이 갈래 셋을 함께 뽑는다 */
function ageOf(student: Student | null): Pick<Self, "age" | "teen" | "minor"> {
  const age = student ? ageFromBirth(student.birth) : null;
  return {
    age,
    teen: age !== null && age >= CONSENT_AGE,
    minor: age === null || age < MAJORITY_AGE,
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

/**
 * 결제·면담처럼 **열리지 않은 자리**에 닿았을 때 대신 세우는 판.
 *
 * 레일에서 뺀 자리라 눌러 올 길은 없지만, 주소는 남는다 — 형이 쓰던 링크를 그대로
 * 열거나, 생일이 지나 열렸던 자리가 명부 수정으로 닫히는 일이 있다. 그때 빈 화면이나
 * 반쯤 열린 결제창을 보여 주는 대신 **왜 여기가 내 자리가 아닌지**를 적는다.
 *
 * 문장을 부르는 쪽에서 그대로 받는다 — 「결제는」 「면담 신청은」처럼 조사가 말마다
 * 달라서, 이름 한 칸만 받아 문장을 지으면 어느 한쪽이 어긋난다.
 */
export function GateNote({
  label,
  title,
  head,
  body,
}: {
  label: string;
  title: string;
  head: string;
  body: string;
}) {
  return (
    <>
      <Head eyebrowText={label} title={title} />
      <div className={`${cardBox} mt-7 p-7 text-center sm:p-9`}>
        <p className="text-[15px] font-bold text-soft-ink">{head}</p>
        <p className="mx-auto mt-2.5 max-w-[34rem] text-[13px] leading-[1.8] text-soft-muted">
          {body}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          <Link href="/student" className={btnGo}>
            내 평가로 돌아가기
          </Link>
          <Link href="/exam/info" className={btnQuiet}>
            시험 안내
          </Link>
        </div>
      </div>
    </>
  );
}

/**
 * 나이를 아직 모르는 동안 세우는 판.
 *
 * 결제·면담은 만 14세에서 갈리고, 나이는 명부에서 읽는다 — 명부는 브라우저 저장소에
 * 있어서 첫 그림에는 없다. 그 사이에 결제창을 먼저 펴 두면 만 14세 미만 아이에게 결제가
 * 한 번 번쩍 보이고 사라진다. 한 박자 기다리는 편이 낫다.
 */
export function Checking({ label, title }: { label: string; title: string }) {
  return (
    <>
      <Head eyebrowText={label} title={title} />
      <p className={`${cardBox} mt-7 p-12 text-center text-[13px] text-soft-muted`}>
        확인 중입니다…
      </p>
    </>
  );
}
