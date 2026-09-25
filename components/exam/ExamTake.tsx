"use client";

import Link from "next/link";
import { useSession } from "@/lib/authStore";
import { SUBJECT_IDS, freeOrder } from "@/lib/exam";
import { dotDate, roomHref } from "@/lib/examCatalog";
import { allSubmitted, submittedCount, useExamRecord, type ExamRecord } from "@/lib/examStore";
import { useClaimSet } from "@/lib/setStore";
import { GoApply, PageTitle, RegTable, useRegistrations, type Registration } from "./Registrations";
import StudentOnly from "./StudentOnly";

/**
 * 응시하기 탭 (/exam) — 접수한 평가 표.
 *
 * 접수하기 탭에서 접수한 것만 여기 올라온다. 응시상태 칸의 버튼을 누르면 과목 판
 * (/exam/[회차]/[학년])으로 가서 과목을 하나씩 응시한다.
 *
 * 상태는 응시 기록 한 벌(lib/examStore.ts)에서 읽는다. 한 회차에 한 학년만 접수할 수
 * 있게 막아 둔 까닭이 이것이다(lib/ticketStore.ts).
 */
export default function ExamTake() {
  const session = useSession();
  const studentId = session?.studentId ?? "demo";
  const record = useExamRecord(studentId);
  /* 가입을 마친 학생이 이 탭에 먼저 닿을 수 있다 — 셋트를 물려받고 갈래를 맞춘다 */
  useClaimSet(session?.role === "student" ? studentId : null);
  const rows = useRegistrations(studentId);

  if (session && session.role !== "student") return <StudentOnly role={session.role} />;

  return (
    <div>
      <PageTitle>응시하기</PageTitle>
      <div className="mt-10">
        <RegTable
          caption="접수한 평가"
          rows={rows}
          lastHead="응시상태"
          renderLast={(row) => <TakeCell row={row} record={record} />}
        />
      </div>
      {rows.length === 0 && <GoApply />}
    </div>
  );
}

const cellBtn =
  "inline-flex items-center justify-center rounded-[2px] bg-soft-primary px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-soft-primary-dark";
const cellBtnGhost =
  "inline-flex items-center justify-center rounded-[2px] border border-soft-line bg-white px-4 py-2 text-[13px] font-medium text-soft-ink transition-colors hover:bg-slate-50";

function TakeCell({ row, record }: { row: Registration; record: ExamRecord }) {
  const href = roomHref(row.round, row.track);
  const started = SUBJECT_IDS.some((id) => record.subjects[id].status !== "ready");
  /* 무료시험은 과목이 아니라 시험 하나다 — 「제출 1/3과목」이 아니라 문항 수로 센다 */
  const free = row.tier === "free";
  const all = row.info?.subjects.length ?? SUBJECT_IDS.length;

  if (record.finalized) {
    return (
      <span className="flex flex-col items-center gap-1.5">
        <span className="font-semibold text-soft-ink">응시 완료</span>
        <Link href="/exam/report" className="text-[12px] text-soft-primary hover:underline">
          결과보기
        </Link>
      </span>
    );
  }

  if (row.info?.availability === "soon") {
    return <span>{dotDate(row.info.opensOn).slice(5)} 응시 시작</span>;
  }

  if (row.info?.availability === "ended") {
    return started ? (
      <Link href={href} className={cellBtnGhost}>
        기록 보기
      </Link>
    ) : (
      <span>응시 기간 종료</span>
    );
  }

  /* 무료시험은 한 번에 내는 시험이라, 내고 나면 이 탭에서 더 할 일이 없다 — 남은 일은
     설문과 최종 제출이고 그것은 평가 판에 있다 */
  if (free && allSubmitted(record)) {
    return (
      <span className="flex flex-col items-center gap-1.5">
        <span className="font-semibold text-soft-ink">제출 완료</span>
        <Link href={href} className="text-[12px] text-soft-primary hover:underline">
          설문 · 최종 제출
        </Link>
      </span>
    );
  }

  return (
    <span className="flex flex-col items-center gap-1.5">
      <Link href={href} className={cellBtn}>
        {started ? "이어서 응시" : "응시하기"}
      </Link>
      <span className="text-[12px] tabular-nums text-soft-muted">
        {free
          ? `${freeOrder().length}문항 · 한 번에 응시`
          : started
            ? `제출 ${submittedCount(record)}/${all}과목`
            : `${all}과목 · 과목마다 따로 응시`}
      </span>
    </span>
  );
}
