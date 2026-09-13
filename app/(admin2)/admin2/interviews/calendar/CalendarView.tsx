"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useHydrated } from "@/lib/examStore";
import { DATE_RE, today, useInterviewDesk } from "@/lib/interviewStore";
import { PageHead } from "@/components/admin2/ui";
import InterviewCalendar from "../InterviewCalendar";

/**
 * EXP-06-1 면담 일정 — 화면 껍데기.
 *
 * 달력 몸통은 InterviewCalendar가 그린다. 이 조각이 하는 일은 셋뿐이다 — 화면 머리를
 * 세우고, 주소에서 「보여 달라」는 날을 받고, 시계를 읽어도 되는 때를 가른다.
 *
 * ⚠ useSearchParams는 Suspense 경계 안에서 부른다. 경계 없이 부르면 빌드가 이 화면을
 *   통째로 동적으로 돌린다.
 *
 * ⚠ useHydrated() 뒤에만 몸통을 그린다. 「이번 달」이 시계에서 나오므로 서버가 그릴 값이
 *   없다. 머리는 먼저 그려 화면이 통째로 비지 않게 한다.
 *
 * ⚠ 머리에 「면담 신청」으로 건너가는 단추를 두지 않는다. 기둥의 「면담 관리」 그룹에 두
 *   화면이 나란히 서 있어 한 번에 닿는다 — 같은 자리로 가는 길을 둘 만들면 어느 쪽이 제
 *   길인지 묻게 된다.
 */
export default function CalendarView() {
  return (
    <Suspense fallback={<PageHead title="면담 일정" />}>
      <Screen />
    </Suspense>
  );
}

function Screen() {
  const params = useSearchParams();
  const hydrated = useHydrated();
  const desk = useInterviewDesk();

  /* 상세의 「달력에서 보기」가 ?on=YYYY-MM-DD로 넘어온다. 그것은 화면 상태가 아니라
     「이 날을 보여 달라」는 요청이라 주소로 받는다. 달·주를 넘기는 것은 반대로 주소에
     남기지 않는다 — 훑는 자리라 뒤로 가기가 달 넘김을 되짚으면 안 된다 */
  const on = params.get("on");
  const asked = on && DATE_RE.test(on) ? on : null;

  return (
    <>
      <PageHead title="면담 일정" />
      {hydrated && <InterviewCalendar desk={desk} now={today()} on={asked} />}
    </>
  );
}
