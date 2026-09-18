"use client";

import { useState } from "react";
import { useSession } from "@/lib/authStore";
import { useExamRecord } from "@/lib/examStore";
import { useReportOf } from "@/lib/reportStore";
import { GoApply, PageTitle, RegTable, useRegistrations, type Registration } from "./Registrations";
import ResultView from "./ResultView";
import StudentOnly from "./StudentOnly";

/**
 * 결과보기 탭 (/exam/report).
 *
 * 다른 탭과 같은 표를 먼저 편다 — 접수한 평가가 줄로 서고, 없으면 「내역이 없습니다.」.
 * 결과를 바로 펼치지 않는 까닭은, 평가를 여러 번 보면 결과도 여러 벌이 되기 때문이다.
 * 어느 평가의 결과인지 고르는 자리가 목록이다.
 *
 * 결과 칸은 셋으로 갈린다 —
 *   최종 제출 전       「응시 완료 후 공개」
 *   전문가 확인 중      「확인 중」  (조립은 끝났지만 사람이 발행을 누르기 전)
 *   발행 완료          [보기] — 누르면 아래에 결과 리포트가 펼쳐진다
 *
 * ⚠ 응시 기록도 리포트도 학생마다 한 벌이라 어느 줄을 눌러도 같은 결과가 열린다. 한 시기에
 *   한 평가만 접수할 수 있게 막아 둔 까닭이 이것이다(lib/ticketStore.ts).
 */
export default function ReportList() {
  const session = useSession();
  const studentId = session?.studentId ?? "demo";
  const record = useExamRecord(studentId);
  const report = useReportOf(studentId);
  const rows = useRegistrations(studentId);
  const [open, setOpen] = useState<string | null>(null);

  if (session && session.role !== "student") return <StudentOnly role={session.role} />;

  const key = (r: Registration) => `${r.round}-${r.track}`;
  const picked = rows.find((r) => key(r) === open) ?? null;
  const published = report?.state === "published";

  return (
    <div>
      <PageTitle>결과보기</PageTitle>
      <div className="mt-10">
        <RegTable
          caption="결과를 볼 수 있는 평가"
          rows={rows}
          lastHead="결과"
          renderLast={(row) => {
            if (!record.finalized) return <span>응시 완료 후 공개</span>;
            if (!published) return <span>전문가 확인 중</span>;
            const on = open === key(row);
            return (
              <button
                type="button"
                aria-expanded={on}
                onClick={() => setOpen(on ? null : key(row))}
                className={`inline-flex items-center justify-center rounded-[4px] px-4 py-2 text-[13px] font-semibold transition-colors ${
                  on
                    ? "border border-soft-line bg-white text-soft-ink hover:bg-slate-50"
                    : "bg-soft-primary text-white hover:bg-soft-primary-dark"
                }`}
              >
                {on ? "닫기" : "보기"}
              </button>
            );
          }}
        />
      </div>
      {rows.length === 0 && <GoApply />}

      {picked && published && (
        <section className="mt-12" aria-label={`${picked.title} 결과`}>
          <ResultView />
        </section>
      )}
    </div>
  );
}
