"use client";

import InterviewBooking from "@/components/account/InterviewBooking";
import type { Span } from "@/lib/counselors";
import { Checking, GateNote, WhoNote, cardBox, useSelf } from "./self";

/**
 * 내 면담 (/student/interviews) — **만 14세 이상** 학생이 자기 결과지를 놓고 이야기할
 * 자리를 잡는다.
 *
 * 결제 화면(StudentPayments)과 같은 규칙으로 선다 — 만 14세부터 본인 것이고, 미만이면
 * 보호자 자리다. 다만 면담은 결제보다 한 겹 더 조심할 것이 있다: **약속은 사람과 시간을
 * 묶는 일**이라, 아이가 잡아 놓고 보호자가 모르면 그 시각에 아무도 앉지 않는다. 그래서
 * 만 19세 미만이면 결제 앞의 동의 칸에 「확정 안내도 보호자 연락처로 함께 간다」를 적어
 * 둔다(InterviewBooking의 selfId 갈래).
 *
 * 예약 판은 보호자 것을 그대로 쓴다 — 전문가 마흔 명의 달력·시간표·취소 규정을 학생용으로
 * 한 벌 더 두면 자리 겹침을 세는 곳이 둘이 된다. 명부 대신 나 하나를 세우고 내 예약만
 * 세도록 학생 ID만 넘긴다.
 */
export default function StudentInterviews({ initialSpan }: { initialSpan?: Span }) {
  const self = useSelf();

  if (!self.hydrated) return <Checking label="면담" title="면담" />;

  if (!self.student) {
    return (
      <GateNote
        label="면담"
        title="면담을 신청할 수 없습니다"
        head="명부에서 내 이름을 찾지 못했습니다"
        body="면담은 한 사람의 결과지를 놓고 나누는 자리입니다. 접속코드로 다시 들어오면 이 자리에서 신청할 수 있습니다."
      />
    );
  }

  if (!self.teen) {
    return (
      <GateNote
        label="면담"
        title="면담 신청은 보호자가 합니다"
        head="여기는 내 자리가 아닙니다"
        body="만 14세 미만은 면담을 직접 신청할 수 없습니다. 값을 내고 사람과 시간을 묶는 일이라 법정대리인이 정합니다. 결과지를 함께 읽고 싶으면 보호자에게 말해 주세요 — 보호자 화면에서 신청할 수 있습니다."
      />
    );
  }

  return (
    <>
      <WhoNote self={self} />

      {self.minor && (
        <p
          className={`${cardBox} mb-5 border-soft-primary bg-soft-primary-soft px-5 py-4 text-[13px] leading-[1.8] text-soft-ink`}
        >
          <b>만 19세 미만은 보호자에게 먼저 말해 주세요.</b> 면담은 값을 내고 전문가의 시간을
          잡는 일이라 만 19세 미만이 혼자 한 계약은 보호자가 취소할 수 있습니다(민법 제5조).
          확정 안내와 취소 안내는 보호자 연락처로도 함께 갑니다.
        </p>
      )}

      <InterviewBooking selfId={self.id} initialSpan={initialSpan} />
    </>
  );
}
