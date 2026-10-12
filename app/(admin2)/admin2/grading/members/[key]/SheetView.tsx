"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { rounds } from "@/lib/admin";
import { useAdminPrefs } from "@/lib/adminStore";
import { useHydrated } from "@/lib/examStore";
import { paperOf } from "@/lib/examSheet";
import { gradeStat } from "@/lib/gradeSheet";
import { nowStamp } from "@/lib/reportRelease";
import { useSendRow } from "@/lib/reportSendStore";
import { reportIdOf, syncSheetReport } from "@/lib/reportStore";
import { factsOfSheet } from "@/lib/sheetFacts";
import { saveSheetMarks, useSheetMarks } from "@/lib/sheetMarkStore";
import { sheetsOf, useExpert, type Sheet } from "@/lib/expertStore";
import type { GradeAt } from "@/components/exam/GradeDialog";
import GradeSheet from "@/components/admin2/GradeSheet";
import { Body, PageHead, Panel } from "@/components/admin2/ui";

/**
 * EXP-04-1 답안지 — 이 아이의 정오표를 펴고, 거기서 채점한다.
 *
 * 화면은 components/admin2/GradeSheet.tsx가 그린다 — 정오표(1번부터 끝까지)와 「채점하기」
 * 창(응시 화면과 같은 틀, 오른쪽 아래에서 점수를 고친다). 여기서는 값을 읽고 저장한다.
 *
 *   시험지    응시번호를 씨앗으로 지어낸 응시 원본(lib/examSheet.ts) — 문항 · 낸 답 · AI 점수
 *   채점      채점자가 확인하거나 고친 점수와 해설(lib/sheetMarkStore.ts)
 *
 * ── 저장은 따로 누르지 않는다 ──
 * 예전에는 답안지 한 장을 다 고친 뒤 「저장」을 한 번 눌렀다. 채점 창은 문항을 하나씩 넘기는
 * 화면이라, 점수를 고치거나 「확인하고 다음」을 누르는 그 자리에서 저장한다 — 서른 문항을
 * 넘기다 창을 닫아도 본 데까지는 남는다.
 *
 * ── 채점이 끝나면 리포트가 만들어진다 ──
 * 마지막 문항까지 확인하는 순간 이 답안지의 점수로 리포트를 조립해 리포트 승인(EXP-08) 목록에
 * 올린다(lib/reportStore.ts의 syncSheetReport). 리포트는 그때부터 스케줄러가 정한 날을 기다린다.
 * 채점이 끝나지 않은 답안지에는 리포트가 없다.
 *
 * 그 뒤에 점수를 고치면, 발행 전인 리포트는 새 점수로 다시 조립된다. 정오표의 점수와 리포트의
 * 근거가 다른 값을 말하면 안 된다. 발행한 리포트는 바뀌지 않는다.
 *
 * ── 서술형 응답 큐는 여기서 다루지 않는다 ──
 * 예전에는 진단 채점(EXP-04)의 서술형 응답(ScoreTask)을 답안지 끝에 붙여 함께 손봤다. 그
 * 응답은 시험지에 없는 문항이라 시험지 모양으로 펼 수 없고, 시험지의 서술형 · 논술형 문항이
 * 이미 같은 일을 한다. 루브릭 판정은 진단 채점에서 그대로 한다 — 이 화면은 그 응답으로
 * 「어느 회차의 어느 아이인지」만 읽고, 시험지는 세 과목을 모두 편다(lib/examSheet.ts의 paperOf).
 *
 * ⚠ 여기서 매긴 점수와 진단 채점(EXP-04)의 루브릭 점수(완전 2 · 부분 1 · 오답 0)는 서로 이어져
 *   있지 않다 — 한쪽에서 확정해도 다른 쪽 값은 그대로다. 리포트는 **이 화면의 점수**로
 *   조립한다(lib/sheetFacts.ts). 붙일 때는 두 화면이 같은 점수 하나를 읽고 고치게 해야 한다.
 */

const roundLabel = (id: string) => rounds.find((r) => r.id === id)?.label ?? id;

export default function SheetView({ sheetId }: { sheetId: string }) {
  const { scores } = useExpert();
  const hydrated = useHydrated();
  const sheet = useMemo(() => sheetsOf(scores).find((s) => s.key === sheetId) ?? null, [scores, sheetId]);

  const back = (
    <Link href="/admin2/grading/members" className="a2-btn">
      ← 회원 채점
    </Link>
  );

  if (!sheet) {
    return (
      <>
        <PageHead title="찾지 못했습니다" back={back} />
        <Body>
          <Panel title="없는 답안지">
            <p className="a2-t-sm text-(--a2-ink-2)">
              <span className="a2-mono">{sheetId}</span> 답안지가 목록에 없습니다.
            </p>
          </Panel>
        </Body>
      </>
    );
  }

  /* 채점한 값은 브라우저에만 있다. 하이드레이션 전에 그리면 모든 문항이 「확인 전」으로 한 번
     번쩍인다 */
  if (!hydrated) return <PageHead title={`${sheet.seat} 답안지`} back={back} />;

  return <Sheet1 key={sheet.key} sheet={sheet} back={back} />;
}

function Sheet1({ sheet, back }: { sheet: Sheet; back: React.ReactNode }) {
  const by = useAdminPrefs().staffName || "운영자";
  const marks = useSheetMarks(sheet.key);
  /* 이 답안지의 리포트 — 채점이 끝나기 전에는 없다 */
  const report = useSendRow(reportIdOf(sheet.key), nowStamp());
  const [gradeAt, setGradeAt] = useState<GradeAt | null>(null);

  /* 이 아이의 시험지 — 세 과목 전부 */
  const subjects = useMemo(() => paperOf(sheet.seat), [sheet.seat]);

  /* 마지막 문항까지 확인하면 이 답안지의 점수로 리포트가 조립돼 리포트 승인 목록에 오른다.
     그 뒤에 점수를 고치면 발행 전 리포트가 새 점수로 다시 조립된다 — 발행 예정일은 처음
     채점이 끝난 때에서 그대로 센다 */
  const stat = gradeStat(subjects, marks);
  const done = stat.total > 0 && stat.done === stat.total;
  const facts = useMemo(() => factsOfSheet(sheet, subjects, marks), [sheet, subjects, marks]);
  useEffect(() => {
    if (done) syncSheetReport(sheet, facts);
  }, [done, sheet, facts]);

  return (
    <GradeSheet
      seat={sheet.seat}
      grade={sheet.grade}
      roundName={roundLabel(sheet.round)}
      subjects={subjects}
      marks={marks}
      back={back}
      /* 이름은 적지 않는다 — 채점하는 사람이 누구 답인지 알면 안 된다 */
      doneNote={
        !report
          ? undefined
          : report.send === "sent"
            ? `이 답안지의 리포트는 ${report.sentAt}에 발행되었습니다.`
            : `이 답안지의 리포트가 「리포트 승인」 목록에 있습니다. 발행 예정일은 ${report.sendOn}입니다.`
      }
      gradeAt={gradeAt}
      onOpen={setGradeAt}
      onClose={() => setGradeAt(null)}
      onMark={(edits) => saveSheetMarks(sheet.key, edits, by)}
    />
  );
}
