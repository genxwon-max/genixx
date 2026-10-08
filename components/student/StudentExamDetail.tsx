"use client";

import Link from "next/link";
import { useState } from "react";
import { tierOf } from "@/lib/exam";
import { evalName, type TrackId } from "@/lib/examCatalog";
import { decideType, scoreAxes } from "@/lib/result";
import { useClaimSet } from "@/lib/setStore";
import StatusTable from "@/components/exam/StatusTable";
import {
  MissingDiag,
  StageTag,
  amountOf,
  dayText,
  daysLeft,
  findDiag,
  md,
  openStages,
  periodOf,
  resultPath,
  useDiags,
  type Diag,
} from "./diag";
import { Head, WhoNote, btnGo, cardBox, useSelf } from "./self";

const back = { href: "/student/exams", label: "내 진단" };

/**
 * 진단 한 건 (/student/exams/2026-3/e4) — 「내 진단」 목록에서 줄을 누르면 오는 자리.
 *
 * 위에 지금 어디쯤인지 한 줄(결과가 나왔으면 재능 유형과 「결과 보기」), 아래에 과목을
 * 응시하는 판(StatusTable)이다. 문항은 따로 뜨는 창에서 푼다(lib/popup.ts) — 시험지는 남은
 * 시간과 문항만 남기는 틀이라 레일을 지고 있을 수 없다. 창을 닫으면 이 화면으로 돌아오고
 * 판의 상태가 그 자리에서 바뀐다.
 *
 * 결과가 나온 진단은 판을 접어 둔다. 다 끝난 과목 표가 길게 서면 결과가 그 아래에 묻힌다.
 */
export default function StudentExamDetail({ round, track }: { round: string; track: TrackId }) {
  const self = useSelf();
  const diags = useDiags(self.id);
  useClaimSet(self.own ? self.id : null);

  if (!self.hydrated) {
    return (
      <>
        <Head back={back} title={evalName(round, track)} />
        <p className={`${cardBox} mt-7 p-10 text-center text-[13px] text-soft-muted`}>
          확인 중입니다…
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

  const { reg, stage, record } = diag;
  const left = daysLeft(reg.info?.closesOn);
  const lead = [
    tierOf(reg.tier).label,
    periodOf(reg.info),
    openStages.includes(stage) ? dayText(left) : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <WhoNote self={self} />

      <Head back={back} title={diag.name} lead={lead} right={<StageTag stage={stage} />} />

      <Now diag={diag} />

      {/* 판 — 응시하는 자리. 결과가 나온 진단은 접어 둔다 */}
      {stage === "upcoming" ? null : record.finalized ? (
        <Folded>
          <StatusTable
            embedded
            studentId={self.id}
            reg={diag.ref}
            resultHref={resultPath(diag.ref)}
          />
        </Folded>
      ) : (
        <div className={`${cardBox} mt-4 px-5 py-6 sm:px-7 sm:py-7`}>
          <StatusTable
            embedded
            studentId={self.id}
            reg={diag.ref}
            resultHref={resultPath(diag.ref)}
          />
        </div>
      )}
    </>
  );
}

/**
 * 끝난 진단의 판 — 펼칠 때에만 그린다.
 *
 * 판은 서자마자 자기 진단을 「지금 보고 있는 진단」으로 가리킨다(StatusTable의 setActiveReg).
 * 접힌 채로도 그려 두면 지난 결과를 한 번 들여다본 것만으로 학생 홈의 「지금 할 일」이 끝난
 * 진단으로 넘어간다.
 */
function Folded({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <details className={`${cardBox} mt-4`} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="cursor-pointer px-5 py-4 text-[14px] font-semibold text-soft-ink sm:px-7">
        제출한 과목 · 설문 보기
      </summary>
      {open && <div className="border-t border-soft-line px-5 py-6 sm:px-7">{children}</div>}
    </details>
  );
}

/**
 * 지금 어디쯤인가 — 굵은 한 줄과 할 일 한 줄.
 *
 * 결과가 나왔으면 재능 유형을 적고 결과지로 가는 단추를 단다. 결과지 자체는 「진단 결과」의
 * 자리다 — 여기에 다시 펴면 같은 결과가 두 곳에서 따로 선다.
 */
function Now({ diag }: { diag: Diag }) {
  const { stage, record, reg } = diag;
  const a = amountOf(record);
  const free = record.tier === "free";
  const type = stage === "published" ? decideType(scoreAxes(record)) : null;

  const [head, body] = ((): [string, string] => {
    switch (stage) {
      case "upcoming":
        return [
          "아직 응시 기간이 아닙니다",
          reg.info
            ? `${md(reg.info.opensOn)}에 응시가 시작되면 여기에 과목이 열립니다.`
            : "응시 기간이 시작되면 여기에 과목이 열립니다.",
        ];
      case "ready":
        return [
          "아직 시작하지 않았습니다",
          free
            ? `아래 표에서 「진단 시작」을 누르면 응시 창이 열리고, ${a.total}문항이 한 창에서 이어집니다.`
            : "아래 표에서 과목의 「진단 시작」을 누르면 응시 창이 열립니다.",
        ];
      case "doing":
        return [
          `${a.total}${a.unit} 중 ${a.done}${a.unit}을 ${free ? "풀었습니다" : "냈습니다"}`,
          `남은 ${a.unit}을 마치고 최종 제출하면 결과가 나옵니다.`,
        ];
      case "submitted":
        return [
          free ? `${a.total}문항을 모두 냈습니다` : "과목을 모두 냈습니다",
          "아래 맨 끝에서 최종 제출하면 결과 분석이 시작됩니다.",
        ];
      case "reviewing":
        return [
          "최종 제출을 마쳤습니다",
          "전문가가 결과를 확인하고 있습니다. 발행되면 「진단 결과」에서 봅니다.",
        ];
      case "published":
        return [
          type ? `결과가 나왔습니다 · ${type.code} ${type.name}` : "결과가 나왔습니다",
          type ? type.tagline : "「결과 보기」에서 결과지를 봅니다.",
        ];
      case "closed":
        return ["응시 기간이 끝났습니다", "기간 안에 최종 제출하지 못해 결과가 나오지 않습니다."];
    }
  })();

  return (
    <section
      className={`${cardBox} mt-7 flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6`}
    >
      <div className="min-w-[15rem] flex-1">
        <p className="text-[16.5px] font-bold text-soft-ink">{head}</p>
        <p className="mt-1 text-[13.5px] leading-[1.7] text-soft-muted">{body}</p>
      </div>
      {stage === "published" && (
        <Link href={resultPath(diag.ref)} className={btnGo}>
          결과 보기 →
        </Link>
      )}
    </section>
  );
}
