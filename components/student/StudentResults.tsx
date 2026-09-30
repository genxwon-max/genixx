"use client";

import Link from "next/link";
import { evalName, type TrackId } from "@/lib/examCatalog";
import { decideType, scoreAxes } from "@/lib/result";
import ResultView from "@/components/exam/ResultView";
import {
  DiagRow,
  EmptyList,
  MissingDiag,
  StageTag,
  examPath,
  findDiag,
  md,
  periodOf,
  resultPath,
  useDiags,
  type Diag,
  type Stage,
} from "./diag";
import { Head, WhoNote, btnGo, cardBox, useSelf } from "./self";

/**
 * 진단 결과 (/student/results) — 접수한 진단마다 결과가 어디까지 왔는지.
 *
 * 결과가 발행된 줄만 눌린다. 누르면 그 진단의 결과지(/student/results/2026-3/e4)로 들어간다.
 * 아직 결과가 없는 줄도 목록에서 빼지 않는다 — 「3분기 결과는 어디 갔나」를 찾던 아이가
 * 그 줄에서 「전문가 확인 중」·「최종 제출 전」을 읽는다.
 */
export default function StudentResults() {
  const self = useSelf();
  const diags = useDiags(self.id);

  return (
    <>
      <WhoNote self={self} />

      <Head title="진단 결과" lead="결과가 나온 진단을 누르면 결과지를 봅니다." />

      {!self.hydrated ? (
        <p className={`${cardBox} mt-7 p-10 text-center text-[13px] text-soft-muted`}>
          확인 중입니다…
        </p>
      ) : diags.length === 0 ? (
        <EmptyList body="진단을 접수해 응시하고 최종 제출하면, 전문가 확인을 거쳐 이 목록에 결과가 올라옵니다." />
      ) : (
        <ul className={`${cardBox} mt-7 divide-y divide-slate-100 overflow-hidden`}>
          {diags.map((d) => {
            const r = resultOf(d);
            return (
              <li key={d.id}>
                <DiagRow
                  diag={d}
                  href={d.stage === "published" ? resultPath(d.ref) : undefined}
                  when={r.when}
                  state={<StageTag stage={r.tag ?? d.stage} label={r.label} />}
                  note={r.note}
                />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

/** ISO 시각 → 이 기기 날짜로 「2026.09.12」 */
function dayOf(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

/**
 * 결과 쪽에서 읽는 한 줄 — 발행 · 확인 중 · 아직 · 없음.
 * 최종 제출 전인 진단은 과목을 얼마나 했든 결과 쪽에서는 한 가지 자리라, 점 색도 하나로 둔다.
 */
function resultOf(d: Diag): { tag?: Stage; label?: string; note: string; when: string } {
  switch (d.stage) {
    case "published": {
      const type = decideType(scoreAxes(d.record));
      return {
        note: type ? `${type.code} · ${type.name}` : "결과지를 볼 수 있습니다",
        /* 발행 시각은 「2026-09-12 14:30」 꼴로 적혀 있다(lib/reportStore.ts) */
        when: d.report?.publishedAt
          ? `발행 ${d.report.publishedAt.slice(0, 10).replace(/-/g, ".")}`
          : periodOf(d.reg.info),
      };
    }
    case "reviewing":
      return {
        note: "발행되면 여기서 봅니다",
        when: d.record.finalizedAt
          ? `최종 제출 ${dayOf(d.record.finalizedAt)}`
          : periodOf(d.reg.info),
      };
    case "closed":
      return {
        label: "결과 없음",
        note: "기간 안에 최종 제출하지 않았습니다",
        when: periodOf(d.reg.info),
      };
    case "upcoming":
      return {
        note: d.reg.info ? `${md(d.reg.info.opensOn)}에 응시가 시작됩니다` : "",
        when: periodOf(d.reg.info),
      };
    default:
      return {
        tag: "ready",
        label: "최종 제출 전",
        note: "최종 제출하면 결과가 나옵니다",
        when: periodOf(d.reg.info),
      };
  }
}

const back = { href: "/student/results", label: "진단 결과" };

/**
 * 결과지 한 장 (/student/results/2026-3/e4).
 *
 * 결과지는 보호자·기관과 같은 것(ResultView)을 쓴다. 볼 사람은 이 화면이 정한 학생이다
 * (components/student/self.tsx) — 주소에 ?student= 를 싣지 않는다.
 * 발행 전이면 결과지 대신 지금 어디까지 왔는지를 적는다 — 목록에서는 눌리지 않지만 주소는
 * 남는다(최종 제출 직후 판이 이 주소로 보낸다).
 */
export function StudentResultDetail({ round, track }: { round: string; track: TrackId }) {
  const self = useSelf();
  const diags = useDiags(self.id);

  if (!self.hydrated) {
    return (
      <>
        <Head back={back} title={`${evalName(round, track)} 결과`} />
        <p className={`${cardBox} mt-7 p-10 text-center text-[13px] text-soft-muted`}>
          결과를 불러오는 중입니다…
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

  if (diag.stage !== "published") {
    const reviewing = diag.stage === "reviewing";
    return (
      <>
        <WhoNote self={self} />
        <Head back={back} title={`${diag.name} 결과`} />
        <div className={`${cardBox} mt-7 p-10 text-center`}>
          <p className="text-[15px] font-bold text-soft-ink">
            {reviewing ? "전문가가 결과를 확인하고 있습니다" : "아직 결과가 없습니다"}
          </p>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-[1.75] text-soft-muted">
            {reviewing
              ? "최종 제출을 마쳤습니다. 전문가가 확인해 발행하면 이 자리에 결과지가 뜹니다."
              : diag.stage === "closed"
                ? "기간 안에 최종 제출하지 않아 결과가 나오지 않습니다."
                : "과목을 모두 내고 최종 제출하면, 전문가 확인을 거쳐 결과가 나옵니다."}
          </p>
          {!reviewing && diag.stage !== "closed" && (
            <Link href={examPath(diag.ref)} className={`${btnGo} mt-5`}>
              이 진단으로 가기 →
            </Link>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <WhoNote self={self} />
      <ResultView reg={diag.ref} studentId={self.id} back={back} />
    </>
  );
}
