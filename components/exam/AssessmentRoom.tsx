"use client";

import Link from "next/link";
import { useSession } from "@/lib/authStore";
import { useCatalogRounds } from "@/lib/catalogRounds";
import { assessment } from "@/lib/exam";
import { dotDate, evalName, trackLabel, type TrackId } from "@/lib/examCatalog";
import { isApplied, useWallet } from "@/lib/ticketStore";
import StatusTable from "./StatusTable";
import StudentOnly from "./StudentOnly";
import { btnBox, eyebrow, panel } from "./ui";

/**
 * 과목 판 (/exam/[회차]/[학년]) — 응시하기 탭에서 과목을 하나씩 응시하는 자리.
 *
 * **접수한 평가만** 열린다. 주소를 직접 쳐서 접수하지 않은 평가로 들어오면 접수하기
 * 탭으로 돌려보낸다 — 여기서 바로 접수하게 두면 접수하기 탭을 거치지 않는 두 번째
 * 접수 창구가 생긴다.
 */
export default function AssessmentRoom({ roundId, trackId }: { roundId: string; trackId: TrackId }) {
  const session = useSession();
  const studentId = session?.studentId ?? "demo";
  const rounds = useCatalogRounds();
  const wallet = useWallet(studentId);

  if (session && session.role !== "student") return <StudentOnly role={session.role} />;

  const round = rounds.find((r) => r.id === roundId);

  const back = (
    <Link
      href="/exam"
      className="inline-flex items-center rounded-[2px] border border-soft-line bg-white px-3.5 py-2 text-[13px] font-semibold text-soft-ink transition-colors hover:bg-slate-50"
    >
      목록으로
    </Link>
  );

  if (!round) {
    return (
      <div>
        {back}
        <div className={`mx-auto mt-8 max-w-lg p-8 text-center ${panel}`}>
          <h1 className="text-[20px] font-bold text-soft-ink">평가를 찾을 수 없습니다</h1>
          <p className="mt-3 text-[13px] leading-relaxed text-soft-muted">
            주소가 바뀌었거나 없어진 평가입니다. 응시하기 목록에서 다시 골라 주세요.
          </p>
        </div>
      </div>
    );
  }

  const period = `${dotDate(round.opensOn)} ~ ${dotDate(round.closesOn)}`;
  const name = `${assessment.name} ${evalName(round.id, trackId, round.label)}`;

  if (isApplied(wallet, round.id, trackId)) {
    return (
      <div>
        <div className="mb-5">{back}</div>
        <StatusTable heading={{ eyebrow: trackLabel(trackId), title: name, period }} />
      </div>
    );
  }

  return (
    <div>
      {back}
      <div className={`mx-auto mt-8 max-w-lg p-8 text-center ${panel}`}>
        <p className={eyebrow}>{trackLabel(trackId)}</p>
        <h1 className="mt-2 text-[22px] font-bold text-soft-ink">{name}</h1>
        <p className="mt-3 text-[13px] leading-relaxed text-soft-muted">
          접수하지 않은 평가입니다. 접수하기 탭에서 먼저 접수해 주세요.
        </p>
        <Link href="/exam/apply" className={`mt-7 ${btnBox}`}>
          접수하기로 이동
        </Link>
      </div>
    </div>
  );
}
