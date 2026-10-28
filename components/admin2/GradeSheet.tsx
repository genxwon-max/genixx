"use client";

import { useState } from "react";
import { answerKind, autoGraded, keyText, markLabel, pointText, type Mark } from "@/lib/exam";
import {
  gradeOf,
  gradeStat,
  gradeStateLabel,
  type GradeEdit,
  type GradeMarks,
  type GradeState,
  type GradeSubject,
} from "@/lib/gradeSheet";
import type { Tone } from "@/lib/admin2";
import { AnswerCell } from "@/components/exam/AnswerKey";
import GradeDialog, { type GradeAt } from "@/components/exam/GradeDialog";
import TableBox from "./TableBox";
import { Body, FormRow, PageHead, Panel, Status, Tab, Tag } from "./ui";

/**
 * EXP-04-1 답안지 — 한 아이의 **정오표**와, 거기서 여는 「채점하기」 창.
 *
 * 회원 채점 목록에서 줄을 누르면 이 화면이다. 예전에는 문항마다 판을 하나씩 세워 왼쪽에
 * 문제 · 오른쪽에 배점 칸을 두었다. 서른 문항이 판 서른 개로 늘어서 어디까지 봤는지를 셀 수
 * 없었고, 문항이 시험지에서 어떻게 보였는지도 알 수 없었다. 둘로 갈랐다.
 *
 *   이 화면    정오표 — 1번부터 끝까지 한 줄씩. 정답 · 제출한 답 · AI 점수 · 지금 점수 · 정오 ·
 *              채점 상태. 어디까지 확인했는지가 한눈에 보인다
 *   채점하기   응시 화면과 같은 틀의 창. 아이가 본 시험지 그대로를 넘기며 오른쪽 아래에서
 *              점수를 고친다(components/exam/GradeDialog.tsx)
 *
 * 표의 줄을 누르면 그 문항부터 채점 창이 열린다. 줄 끝에 단추를 따로 두지 않는다.
 *
 * 사진을 알아볼 수 없어 채점 창에서 「알아볼 수 없음」을 고른 문항은 「운영자 확인」이다(2026-10-21).
 * 탭 · 채점 칸 · 응시 판에 따로 세고, 확인한 문항으로 치지 않는다 — 그 문항이 남아 있는 동안
 * 답안지 채점은 끝나지 않는다(lib/gradeSheet.ts의 gradeStat).
 *
 * 값을 읽고 저장하는 일은 부르는 쪽이 한다 — 실제 화면(app/(admin2)/…/SheetView.tsx)은
 * 저장소를, 디자인 보기는 적어 둔 예시를 넘긴다. 채점 창을 여닫는 것도 부르는 쪽이 정한다
 * (디자인 보기는 창이 열린 화면을 주소로 가른다).
 */

const markSign: Record<Mark, string> = {
  right: "○",
  partial: "△",
  wrong: "✕",
  empty: "✕",
  pending: "",
};

const markTone: Record<Mark, Tone> = {
  right: "ok",
  partial: "warn",
  wrong: "danger",
  empty: "danger",
  pending: "muted",
};

/* 운영자 확인은 붉게 — 사진을 다시 받기 전에는 이 답안지의 채점이 끝나지 않는다 */
const stateTone: Record<GradeState, Tone> = { ai: "warn", checked: "ok", edited: "info", held: "danger" };

type TabId = "all" | GradeState;

/** 「채점하기」가 처음 펼 문항 — 아직 확인하지 않은 첫 문항. 다 확인했으면 1번이다 */
export function firstOpen(subjects: GradeSubject[], marks: GradeMarks): GradeAt | null {
  for (const s of subjects) {
    const line = s.lines.find((l) => gradeOf(l, marks).state === "ai");
    if (line) return { subject: s.id, no: line.no };
  }
  const first = subjects[0];
  return first?.lines[0] ? { subject: first.id, no: first.lines[0].no } : null;
}

export default function GradeSheet({
  seat,
  grade,
  roundName,
  subjects,
  marks,
  back,
  gradeAt,
  doneNote,
  onOpen,
  onClose,
  onMark,
}: {
  /** 응시번호 — 이름은 적지 않는다. 채점하는 사람이 누구 답인지 알면 안 된다 */
  seat: string;
  grade: string;
  /** 진단 이름 — 「2026 파일럿 3회차」 */
  roundName: string;
  subjects: GradeSubject[];
  marks: GradeMarks;
  back: React.ReactNode;
  /** 채점 창이 펴 둔 문항 — null이면 창이 닫혀 있다 */
  gradeAt: GradeAt | null;
  /**
   * 채점이 끝난 답안지에 덧붙이는 한 줄 — 이 답안지의 리포트가 어디로 갔는가.
   * 채점이 끝나야 리포트가 만들어진다(lib/reportStore.ts의 syncSheetReport).
   */
  doneNote?: React.ReactNode;
  onOpen: (at: GradeAt) => void;
  onClose: () => void;
  onMark: (edits: GradeEdit[]) => void;
}) {
  const [tab, setTab] = useState<TabId>("all");
  const stat = gradeStat(subjects, marks);
  const start = firstOpen(subjects, marks);
  const countOf = (state: GradeState) =>
    subjects.reduce(
      (n, s) => n + s.lines.filter((l) => gradeOf(l, marks).state === state).length,
      0,
    );
  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: "all", label: "전체", count: stat.total },
    { id: "ai", label: "확인 전", count: countOf("ai") },
    { id: "checked", label: "확인", count: countOf("checked") },
    { id: "edited", label: "수정", count: countOf("edited") },
    { id: "held", label: "운영자 확인", count: stat.held },
  ];
  /* 운영자 확인으로 넘긴 문항은 채점자가 더 볼 것이 없다 — 남은 문항에서 뺀다 */
  const left = stat.total - stat.done - stat.held;

  return (
    <>
      <PageHead
        title={`${seat} 답안지`}
        back={back}
        actions={
          start && (
            <button type="button" className="a2-btn a2-btn-primary" onClick={() => onOpen(start)}>
              {stat.done + stat.held === 0 ? "채점하기" : left > 0 ? "이어서 채점하기" : "다시 보기"}
            </button>
          )
        }
        tabsLabel="문항 조회 조건"
        tabs={tabs.map((t) => (
          <Tab
            key={t.id}
            label={t.label}
            count={t.count}
            active={tab === t.id}
            onClick={() => setTab(t.id)}
          />
        ))}
      />

      <Body className="grid gap-3">
        <Panel title="응시" meta={roundName} flush>
          <div className="a2-form">
            <FormRow label="응시번호">
              <span className="a2-mono a2-t-sm font-semibold text-(--a2-ink)">{seat}</span>
              <span className="a2-t-xs text-(--a2-ink-4)">{grade}</span>
              {subjects.map((s) => (
                <Tag key={s.id}>{s.short}</Tag>
              ))}
            </FormRow>
            <FormRow label="채점">
              <span className="a2-num a2-t-md font-bold text-(--a2-ink)">
                {stat.done} / {stat.total}문항
              </span>
              <span className="a2-t-sm text-(--a2-ink-3)">
                {left > 0
                  ? `확인 전 ${left}문항 · AI가 먼저 매긴 점수를 문항마다 확인합니다. 사진으로 낸 답은 AI가 채점하지 않습니다`
                  : stat.held > 0
                    ? "운영자 확인으로 넘긴 문항을 빼고 모두 확인했습니다"
                    : "모든 문항을 확인했습니다"}
                {stat.edited > 0 && ` · 수정 ${stat.edited}문항`}
              </span>
              {stat.held > 0 && (
                <span className="a2-hint" style={{ color: "var(--a2-danger)" }}>
                  운영자 확인 {stat.held}문항 — 사진을 알아볼 수 없어 넘긴 문항입니다. 운영자가 보호자에게 사진을
                  다시 받아 오거나 지금 사진으로 채점하라고 돌려보내면 「확인 전」으로 돌아옵니다. 그때까지 이 답안지의
                  채점은 끝나지 않고 리포트도 만들어지지 않습니다.
                </span>
              )}
              {stat.done === stat.total && doneNote && (
                <span className="a2-hint">{doneNote}</span>
              )}
            </FormRow>
            <FormRow label="지필 점수">
              <span className="a2-num a2-t-md font-bold text-(--a2-ink)">
                {pointText(stat.got)} / {stat.max}점
              </span>
              {/* 아직 다 확인하지 않은 답안지의 총점은 **아직 총점이 아니다** */}
              {stat.done < stat.total && (
                <span className="a2-t-sm text-(--a2-ink-3)">
                  {left > 0
                    ? "확인하지 않은 문항은 AI가 매긴 점수로 더했습니다"
                    : "운영자 확인으로 넘긴 문항은 점수 없이 더했습니다"}
                </span>
              )}
            </FormRow>
          </div>
        </Panel>

        {subjects.map((s) => {
          const rows = s.lines
            .map((line) => ({ line, g: gradeOf(line, marks) }))
            .filter((r) => tab === "all" || r.g.state === tab);
          if (rows.length === 0) return null;
          const sub = gradeStat([s], marks);
          return (
            <Panel
              key={s.id}
              title={`${s.short} 정오표`}
              meta={`${s.lines.length}문항 · ${pointText(sub.got)} / ${sub.max}점 · 확인 ${sub.done} / ${sub.total}`}
              flush
            >
              <TableBox download={`${s.short} 정오표`}>
                <table className="a2-table">
                  <thead>
                    <tr>
                      <th style={{ width: "3.5rem" }}>문항</th>
                      <th style={{ width: "4.5rem" }}>유형</th>
                      <th style={{ width: "9rem" }}>정답</th>
                      <th>제출한 답</th>
                      <th style={{ width: "4rem" }}>AI</th>
                      <th style={{ width: "5.5rem" }}>점수</th>
                      <th style={{ width: "6.5rem" }}>정오</th>
                      <th style={{ width: "5rem" }}>채점</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ line, g }) => {
                      const open = () => onOpen({ subject: s.id, no: line.no });
                      const key = autoGraded(line.q) ? keyText(line.q) : "";
                      return (
                        <tr key={line.q.id} className="cursor-pointer" onClick={open}>
                          <td>
                            {/* 줄을 누르면 이 단추가 대신 눌린다 — 글쇠로도 같은 문항이 열린다 */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                open();
                              }}
                              aria-label={`${s.short} 문항 ${line.no} 채점하기`}
                              className="a2-num font-semibold text-(--a2-ink)"
                            >
                              {line.no}
                            </button>
                          </td>
                          <td className="whitespace-nowrap">{answerKind(line.q)}</td>
                          <td className="a2-num">
                            {key || <span className="text-(--a2-ink-4)">채점 기준</span>}
                          </td>
                          <td style={{ whiteSpace: "normal" }}>
                            <AnswerCell q={line.q} value={line.value} />
                          </td>
                          {/* AI가 채점하지 않은 문항(사진)은 채점자가 매기기 전까지 점수가 없다 */}
                          <td className="a2-num">
                            {line.ai === null ? (
                              <span className="text-(--a2-ink-4)">없음</span>
                            ) : (
                              pointText(line.ai)
                            )}
                          </td>
                          <td className="a2-num whitespace-nowrap font-semibold text-(--a2-ink)">
                            {g.scored ? pointText(g.points) : "–"} / {line.max}
                          </td>
                          <td className="whitespace-nowrap">
                            <Status tone={markTone[g.mark]}>
                              {markSign[g.mark]} {markLabel[g.mark]}
                            </Status>
                          </td>
                          <td className="whitespace-nowrap">
                            <Status tone={stateTone[g.state]}>{gradeStateLabel[g.state]}</Status>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </TableBox>
            </Panel>
          );
        })}
      </Body>

      {gradeAt && (
        <GradeDialog
          key={`${gradeAt.subject}-${gradeAt.no}`}
          name={roundName}
          seat={seat}
          subjects={subjects}
          marks={marks}
          at={gradeAt}
          onMark={onMark}
          onClose={onClose}
        />
      )}
    </>
  );
}
