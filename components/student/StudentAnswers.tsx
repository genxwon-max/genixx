"use client";

import Link from "next/link";
import { evalName, type TrackId } from "@/lib/examCatalog";
import { AnswerSheet, answerSubjects, answerTotals } from "@/components/exam/AnswerKey";
import {
  DiagRow,
  EmptyList,
  MissingDiag,
  StageTag,
  answerPath,
  dayOf,
  examPath,
  findDiag,
  md,
  periodOf,
  useDiags,
  type Diag,
  type Stage,
} from "./diag";
import { Head, WhoNote, btnGo, cardBox, useSelf } from "./self";

/**
 * 정답과 해설 (/student/answers) — 접수한 진단마다 정답을 볼 수 있는지.
 *
 * 최종 제출을 마친 줄만 눌린다. 누르면 그 진단의 정오표(/student/answers/2026-3/e4)로
 * 들어간다. 풀기 전에 정답이 보이면 진단이 되지 않으므로, 아직 응시 중인 진단은 줄에
 * 「최종 제출 전」만 적는다.
 *
 * 예전에는 응시 존의 탭(/exam/answers)이었다. 접수 · 응시 · 결과와 함께 이 대시보드로
 * 옮겼고, 「내 진단」 · 「진단 결과」와 같은 목록 → 상세로 맞췄다.
 */
export default function StudentAnswers() {
  const self = useSelf();
  const diags = useDiags(self.id);

  return (
    <>
      <WhoNote self={self} />

      <Head
        title="정답과 해설"
        lead="최종 제출을 마친 진단을 누르면 정오표가 열립니다. 정답과 내 답을 문항마다 비교해 봅니다."
      />

      {!self.hydrated ? (
        <p className={`${cardBox} mt-7 p-10 text-center text-[13px] text-soft-muted`}>
          확인 중입니다…
        </p>
      ) : diags.length === 0 ? (
        <EmptyList body="진단을 접수해 응시하고 최종 제출하면, 이 목록에서 정답과 해설을 볼 수 있습니다." />
      ) : (
        <ul className={`${cardBox} mt-7 divide-y divide-slate-100 overflow-hidden`}>
          {diags.map((d) => {
            const a = answerOf(d);
            return (
              <li key={d.id}>
                <DiagRow
                  diag={d}
                  href={d.record.finalized ? answerPath(d.ref) : undefined}
                  when={a.when}
                  state={<StageTag stage={a.tag} label={a.label} />}
                  note={a.note}
                />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

/**
 * 정답 쪽에서 읽는 한 줄 — 볼 수 있다 · 아직이다 · 열리지 않는다.
 * 결과가 발행됐는지는 여기서 가르지 않는다. 정답은 최종 제출한 그날부터 열린다.
 */
export function answerOf(d: Diag): { tag: Stage; label: string; note: string; when: string } {
  if (d.record.finalized) {
    const t = answerTotals(d.reg, d.record);
    return {
      tag: "published",
      label: "정답 공개",
      /* 채점 중인 문항이 몇인지는 상세의 정오표가 말한다 — 줄에는 한 가지만 적는다 */
      note: `채점한 ${t.graded}문항 중 ${t.right}문항 정답`,
      when: d.record.finalizedAt
        ? `최종 제출 ${dayOf(d.record.finalizedAt)}`
        : periodOf(d.reg.info),
    };
  }
  switch (d.stage) {
    case "upcoming":
      return {
        tag: "upcoming",
        label: "응시 시작 전",
        note: d.reg.info ? `${md(d.reg.info.opensOn)}에 응시가 시작됩니다` : "",
        when: periodOf(d.reg.info),
      };
    case "closed":
      return {
        tag: "closed",
        label: "기간 종료",
        note: "기간 안에 최종 제출하지 않아 정답이 열리지 않습니다",
        when: periodOf(d.reg.info),
      };
    default:
      return {
        tag: "ready",
        label: "최종 제출 전",
        note: "최종 제출하면 정답이 열립니다",
        when: periodOf(d.reg.info),
      };
  }
}

const back = { href: "/student/answers", label: "정답과 해설" };

/**
 * 진단 한 건의 정답과 해설 (/student/answers/2026-3/e4).
 *
 * 머리에 진단 이름, 아래에 과목 단추 · 「답안 풀이 보기」 · 정오표와 내려받기(PDF · CSV ·
 * 인쇄)가 선다(components/exam/AnswerKey.tsx). 문제를 다시 보는 일은 「답안 풀이 보기」
 * 창이 맡는다 — 이 화면에는 정오표만 있다. 최종 제출 전이면 정답 대신 지금 어디까지
 * 왔는지를 적는다 — 목록에서는 눌리지 않지만 주소는 남는다.
 */
export function StudentAnswerDetail({ round, track }: { round: string; track: TrackId }) {
  const self = useSelf();
  const diags = useDiags(self.id);

  if (!self.hydrated) {
    return (
      <>
        <Head back={back} title={`${evalName(round, track)} 정답과 해설`} />
        <p className={`${cardBox} mt-7 p-10 text-center text-[13px] text-soft-muted`}>
          정답을 불러오는 중입니다…
        </p>
      </>
    );
  }

  const diag = findDiag(diags, round, track);
  if (!diag) {
    return (
      <>
        <WhoNote self={self} />
        <MissingDiag back={back} />
      </>
    );
  }

  if (!diag.record.finalized) {
    return (
      <>
        <WhoNote self={self} />
        <Head back={back} title={`${diag.name} 정답과 해설`} />
        <AnswerLocked stage={diag.stage} examHref={examPath(diag.ref)} />
      </>
    );
  }

  const submitted = diag.record.finalizedAt ? dayOf(diag.record.finalizedAt) : "-";

  return (
    <>
      <WhoNote self={self} />
      <Head
        back={back}
        title={`${diag.name} 정답과 해설`}
        lead={`최종 제출 ${submitted} · 과목 ${answerSubjects(diag.reg).length}개`}
      />
      <AnswerSheet
        key={diag.id}
        row={diag.reg}
        record={diag.record}
        student={self.name}
        submitted={submitted}
      />
    </>
  );
}

/**
 * 정답이 아직 열리지 않은 진단에 서는 판 — 지금 어디까지 왔는지와, 응시할 수 있으면 그 진단으로
 * 가는 길 하나. 기간이 끝났거나 아직 열리지 않은 진단에는 갈 길을 달지 않는다.
 */
export function AnswerLocked({ stage, examHref }: { stage: Stage; examHref: string }) {
  const open = stage !== "closed" && stage !== "upcoming";
  return (
    <div className={`${cardBox} mt-7 p-10 text-center`}>
      <p className="text-[15px] font-bold text-soft-ink">아직 정답을 볼 수 없습니다</p>
      <p className="mx-auto mt-2 max-w-md text-[13px] leading-[1.75] text-soft-muted">
        {stage === "closed"
          ? "기간 안에 최종 제출하지 않아 정답이 열리지 않습니다."
          : stage === "upcoming"
            ? "응시 기간이 시작되고, 과목을 모두 내어 최종 제출하면 정답이 열립니다."
            : "과목을 모두 내고 최종 제출하면 정답과 해설이 열립니다."}
      </p>
      {open && (
        <Link href={examHref} className={`${btnGo} mt-5`}>
          이 진단으로 가기 →
        </Link>
      )}
    </div>
  );
}
