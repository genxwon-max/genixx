"use client";

import Link from "next/link";
import { decideType, scoreAxes } from "@/lib/result";
import { useClaimSet } from "@/lib/setStore";
import {
  DiagRow,
  EmptyList,
  StageTag,
  amountOf,
  dayText,
  daysLeft,
  examPath,
  md,
  periodOf,
  useDiags,
  type Diag,
} from "./diag";
import { Head, WhoNote, btnQuiet, cardBox, useSelf } from "./self";

/**
 * 내 진단 (/student/exams) — 접수한 진단 목록.
 *
 * 진단마다 한 줄이고, 줄을 누르면 그 진단의 자리(/student/exams/2026-3/e4)로 들어가 과목을
 * 응시한다. 줄에는 지금 어디쯤인지만 적는다 — 단계 하나와 한 줄(몇 과목을 냈는지 · 마감까지
 * 며칠 · 결과가 나왔으면 재능 유형).
 *
 * 예전에는 올해 분기 넷을 칸으로 세우고 고른 진단을 같은 화면 아래에 펼쳤다. 칸 · 펼침 ·
 * 지난 진단 목록이 한 화면에 겹쳐, 무엇을 눌러야 하는지부터 읽어야 했다 — 목록과 상세로 나눴다.
 */
export default function StudentExams() {
  const self = useSelf();
  const diags = useDiags(self.id);
  /* 가입을 마친 학생이 이 화면에 먼저 닿을 수 있다 — 셋트를 물려받는다 */
  useClaimSet(self.own ? self.id : null);

  return (
    <>
      <WhoNote self={self} />

      {/* 목록이 비었으면 접수 단추는 아래 빈 칸 안에 하나만 둔다 */}
      <Head
        title="내 진단"
        lead="접수한 진단입니다. 눌러서 들어가면 과목을 응시하고 진행 상황을 볼 수 있습니다."
        right={
          diags.length > 0 ? (
            <Link href="/exam/apply" className={btnQuiet}>
              진단 접수하기
            </Link>
          ) : undefined
        }
      />

      {!self.hydrated ? (
        <p className={`${cardBox} mt-7 p-10 text-center text-[13px] text-soft-muted`}>
          확인 중입니다…
        </p>
      ) : diags.length === 0 ? (
        <EmptyList body="진단을 접수하면 이 목록에 한 줄씩 표시됩니다. 무료 진단은 20문항을 한 번에 바로 응시할 수 있습니다." />
      ) : (
        <ul className={`${cardBox} mt-7 divide-y divide-slate-100 overflow-hidden`}>
          {diags.map((d) => (
            <li key={d.id}>
              <DiagRow
                diag={d}
                href={examPath(d.ref)}
                when={periodOf(d.reg.info)}
                state={<StageTag stage={d.stage} />}
                note={noteOf(d)}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** 단계 아래 한 줄 — 얼마나 했는지, 결과가 어떤지 */
function noteOf(d: Diag) {
  const a = amountOf(d.record);
  switch (d.stage) {
    case "upcoming":
      return d.reg.info ? `${md(d.reg.info.opensOn)}에 응시가 시작됩니다` : "";
    case "ready":
    case "doing":
      return [`${a.unit} ${a.done}/${a.total}`, dayText(daysLeft(d.reg.info?.closesOn))]
        .filter(Boolean)
        .join(" · ");
    case "submitted":
      return "최종 제출하면 결과가 나옵니다";
    case "reviewing":
      return "결과를 준비하고 있습니다";
    case "published": {
      const type = decideType(scoreAxes(d.record));
      return type ? `${type.code} · ${type.name}` : "결과를 볼 수 있습니다";
    }
    case "closed":
      return `${a.unit} ${a.done}/${a.total}에서 끝났습니다`;
  }
}
