"use client";

import Link from "next/link";
import { dotDate, evalName, trackLabel } from "@/lib/examCatalog";
import { assessment } from "@/lib/exam";
import { useClaimSet } from "@/lib/setStore";
import StatusTable from "@/components/exam/StatusTable";
import { useRegistrations } from "@/components/exam/Registrations";
import { Head, WhoNote, btnGo, btnQuiet, cardBox, useSelf } from "./self";

/**
 * 평가 보기 (/student/exams) — 대시보드 안에서 바로 응시하는 자리.
 *
 * 예전에는 접수한 평가를 줄로 세우고 「평가 페이지로」를 눌러 응시 존의 평가 판으로
 * 건너가게 했다. 아이에게는 한 걸음이 더 있는 셈이었다 — 국어를 풀러 왔는데 목록을 한 번
 * 더 지나야 국어가 보였다. 여기서는 그 판(StatusTable)을 그대로 품는다. 과목 셋이 바로
 * 서고, 누르면 응시 창이 열린다. 설문과 최종 제출도 같은 화면에 있어, 시험을 보는 동안
 * 아이가 갈 곳은 이 한 자리다.
 *
 * 문항 창만 따로 뜬다(lib/popup.ts) — 시험지는 남은 시간과 문항만 남기는 틀이라 레일을
 * 지고 있을 수 없다. 창을 닫으면 이 표로 돌아오고 상태가 그 자리에서 바뀐다.
 *
 * 접수는 아직 응시 존(/exam/apply)에 있다. 고르는 평가가 64건이라 목록·검색·쪽나눔이
 * 통째로 필요한 화면이고, 아이가 한 번 지나가는 자리라 레일 안으로 들일 까닭이 적다.
 */
export default function StudentExams() {
  const self = useSelf();
  const rows = useRegistrations(self.id);
  /* 가입을 마친 학생이 이 화면에 먼저 닿을 수 있다 — 셋트를 물려받고 갈래를 맞춘다 */
  useClaimSet(self.own ? self.id : null);

  /* 머리에 적을 평가 — 가장 최근에 접수한 것. 응시 기록은 학생마다 한 벌이라 판도 하나다 */
  const current = rows[0];
  const heading = current?.info
    ? {
        eyebrow: trackLabel(current.track),
        title: `${assessment.name} ${evalName(current.round, current.track, current.info.label)}`,
        period: `${dotDate(current.info.opensOn)} ~ ${dotDate(current.info.closesOn)}`,
      }
    : undefined;

  return (
    <>
      <WhoNote self={self} />

      {!self.hydrated ? (
        <p className={`${cardBox} p-10 text-center text-[13px] text-soft-muted`}>
          확인 중입니다…
        </p>
      ) : !current ? (
        <>
          <Head
            eyebrowText="평가 보기"
            title="평가 보기"
            lead="접수한 평가가 있으면 이 자리에 국어·수학·과학이 바로 섭니다."
            right={
              <Link href="/exam/apply" className={btnGo}>
                접수하러 가기 →
              </Link>
            }
          />
          <div className={`${cardBox} mt-7 p-10 text-center`}>
            <p className="text-[15px] font-bold text-soft-ink">아직 접수한 평가가 없습니다</p>
            <p className="mx-auto mt-2 max-w-md text-[13px] leading-[1.75] text-soft-muted">
              접수하기에서 회차와 학년을 고르면 이 화면에 과목 셋이 뜨고, 과목을 누르면 응시
              창이 열립니다. 무료시험은 20문항 한 판으로 바로 볼 수 있습니다.
            </p>
            <Link href="/exam/apply" className={`${btnGo} mt-5`}>
              접수하러 가기 →
            </Link>
          </div>
        </>
      ) : (
        <>
          {/* 평가 판을 그대로 품는다 — 머리 · 과목 표 · 설문 표 · 최종 제출이 한 벌이다 */}
          <StatusTable studentId={self.id} heading={heading} resultHref="/student/results" />

          {/* 접수한 평가가 여럿이면 어느 것을 보고 있는지 밝힌다. 응시 기록은 학생마다
              한 벌이라 판을 갈아 끼울 수 없고, 그렇다고 말없이 하나만 세우면 나머지가
              사라진 것으로 읽힌다 */}
          {rows.length > 1 && (
            <p className="mt-6 text-[12.5px] leading-[1.8] text-soft-muted">
              접수한 평가가 {rows.length}건입니다. 위 판은 가장 최근에 접수한{" "}
              <b className="font-semibold text-soft-ink">{current.title}</b>의 것입니다. 나머지는{" "}
              <Link href="/exam" className="font-semibold text-soft-primary hover:underline">
                응시하기
              </Link>
              에서 볼 수 있습니다.
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-2.5 border-t border-soft-line pt-6">
            <Link href="/exam/apply" className={btnQuiet}>
              다른 평가 접수하기
            </Link>
            <Link href="/exam/answers" className={btnQuiet}>
              정답과 해설
            </Link>
          </div>
        </>
      )}
    </>
  );
}
