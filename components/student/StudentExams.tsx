"use client";

import Link from "next/link";
import { useExamRecord } from "@/lib/examStore";
import { useClaimSet } from "@/lib/setStore";
import { RegTable, useRegistrations } from "@/components/exam/Registrations";
import { TakeCell } from "@/components/exam/ExamTake";
import { Head, WhoNote, btnGo, btnQuiet, cardBox, useSelf } from "./self";

/**
 * 내 평가 (/student/exams) — 접수한 평가를 줄로 세우고, 그 줄에서 평가 판으로 건너간다.
 *
 * 응시하기 탭(/exam)과 **같은 표**를 쓴다. 아이가 대시보드에서 본 표와 응시 존에서 본
 * 표가 다르면 같은 평가를 두 번 배워야 한다. 상태 칸의 규칙도 한곳(TakeCell)에서 읽는다.
 *
 * 문항은 여기서 열지 않는다. 시험지 껍데기(남은 시간만 남기고 메뉴를 감추는 틀)가 따로
 * 있어서, 이 화면은 그 자리로 가는 길만 둔다.
 */
export default function StudentExams() {
  const self = useSelf();
  const record = useExamRecord(self.id);
  const rows = useRegistrations(self.id);
  /* 가입을 마친 학생이 이 화면에 먼저 닿을 수 있다 — 셋트를 물려받고 갈래를 맞춘다 */
  useClaimSet(self.own ? self.id : null);

  return (
    <>
      <WhoNote self={self} />

      <Head
        eyebrowText="내 평가"
        title="내 평가"
        lead="접수한 평가입니다. 「평가 페이지로」를 누르면 과목을 하나씩 응시하는 자리로 갑니다."
        right={
          <>
            <Link href="/exam/apply" className={btnQuiet}>
              접수하기
            </Link>
            <Link href="/exam" className={btnGo}>
              평가 페이지로 가기 →
            </Link>
          </>
        }
      />

      <div className={`mt-7 overflow-hidden ${cardBox}`}>
        <RegTable
          caption="접수한 평가와 응시 상태"
          rows={self.hydrated ? rows : []}
          lastHead="응시상태"
          renderLast={(row) => (
            <TakeCell row={row} record={record} goLabel="평가 페이지로" resultHref="/student/results" />
          )}
        />
      </div>

      {self.hydrated && rows.length === 0 && (
        <div className={`${cardBox} mt-5 p-8 text-center`}>
          <p className="text-[15px] font-bold text-soft-ink">아직 접수한 평가가 없습니다</p>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-[1.75] text-soft-muted">
            접수하기에서 회차와 학년을 고르면 이 표에 올라옵니다. 무료시험은 20문항 한 판으로
            바로 볼 수 있습니다.
          </p>
          <Link href="/exam/apply" className={`${btnGo} mt-5`}>
            접수하러 가기 →
          </Link>
        </div>
      )}
    </>
  );
}
