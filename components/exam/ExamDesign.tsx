"use client";

import Link from "next/link";
import { useState } from "react";
import { designOf, designQuestions, designs, type DesignKind } from "@/lib/examDesign";
import { ArrowRight } from "@/components/Icons";
import { BriefPanel, QuestionBody, ScreenColumn, setRange } from "./ExamSession";
import { btnGhost, btnPrimary } from "./ui";

/**
 * 문항 유형 하나를 응시 화면 그대로 세운다 (/exam/session/design/[유형]) — 디자인 확인용.
 *
 * 왼쪽 자료 · 가운데 문제는 응시와 같은 컴포넌트다. 문항 이동판과 시계는 두지 않는다 —
 * 보려는 것은 그 유형의 칸 하나이고, 답은 이 화면 안에만 둔다.
 */
export default function ExamDesign({ kind }: { kind: DesignKind }) {
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const design = designOf(kind);
  const order = designQuestions(kind);
  const at = designs.indexOf(design);
  const prev = designs[at - 1];
  const next = designs[at + 1];

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col overflow-hidden">
      <div className="mx-auto grid min-h-0 w-full max-w-[1600px] flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:overflow-hidden">
        <BriefPanel brief={order[0].brief} range={setRange(order, order[0])} />
        <ScreenColumn
          order={order}
          screen={order}
          renderQuestion={(q) => (
            <QuestionBody
              key={q.id}
              q={q}
              num={order.indexOf(q) + 1}
              value={answers[q.id]}
              onAnswer={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
            />
          )}
        />
      </div>

      {/* 하단 바 — 응시 화면의 「이전 · 다음」 자리에서 유형을 넘긴다 */}
      <div className="shrink-0 border-t border-exam-line bg-exam-panel">
        <div className="mx-auto flex h-[72px] w-full max-w-[1600px] items-center justify-between gap-4 px-6 lg:px-10">
          <p className="min-w-0 truncate text-[12px] text-exam-muted">
            <b className="mr-2 tabular-nums text-exam-text">
              유형 {at + 1}/{designs.length}
            </b>
            {design.desc}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            {prev && (
              <Link href={`/exam/session/design/${prev.id}`} className={btnGhost}>
                {prev.name}
              </Link>
            )}
            {next && (
              <Link href={`/exam/session/design/${next.id}`} className={btnPrimary}>
                {next.name}
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
