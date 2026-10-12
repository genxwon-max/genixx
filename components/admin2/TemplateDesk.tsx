"use client";

import { useMemo } from "react";
import { labelCheck } from "@/lib/labelCheck";
import { bandOf, gradeLabel, isCustomSlot, slotOf } from "@/lib/reportAssets";
import type { TemplateRow } from "@/lib/reportAssetStore";
import { axes } from "@/lib/result";
import { LeaveDialog, PageSaveBar, useEditDraft, useUnsavedGuard } from "./EditGuard";
import { Body, FormRow, PageHead, Panel, Status, Tag } from "./ui";

/**
 * 해석 템플릿 한 칸의 화면 — 리포트에 나갈 글을 쓰고 고친다.
 *
 * 읽는 쪽과 그리는 쪽을 갈랐다. 실제 화면(app/(admin2)/admin2/reports/templates/[id]/TemplateDetail.tsx)은
 * 저장소의 칸을 넘기고 저장을 맡는다. 디자인 보기(/design/admin2/reports/templates/…)는 처음 값과
 * 고치던 글을 넘긴다.
 *
 * ── 라벨링 점검을 여기에 건 까닭 ──
 * 리포트 승인 화면(EXP-08)에도 같은 점검이 있다. 거기서는 **아이 하나**의 문구를 막지만,
 * 템플릿은 그 문구를 받는 **모든 아이**에게 나간다. 같은 금칙어가 저기서 스무 번 걸릴 것을
 * 여기서 한 번 막는 편이 낫다.
 *
 * 막는 말(BANNED)은 저장을 잠그고, 짚는 말(CAUTION)은 적어만 둔다 — 「부족합니다」는 맥락에
 * 따라 쓸 수 있는 말이라 사람이 판단할 자리를 남긴다.
 *
 * ── 고친 문구가 걸리는 범위 ──
 * 저장하면 그 뒤에 조립하는 리포트와, 이 칸의 문구를 쓰는 **발행 전 리포트**에 걸린다
 * (lib/reportStore.ts의 syncWaitingReports — 부르는 쪽이 저장하면서 맞춘다). 검토하다 문구가
 * 이상해 여기로 와서 고쳤는데 그 리포트는 옛 글 그대로 나가는 일이 없게 한다. 발행한 리포트는
 * 바뀌지 않는다. 저장 줄의 안내가 그 범위를 말한다.
 *
 * ── 서식을 열지 않는다 ──
 * BodyEditor(RichText)를 쓰지 않는다. 공지는 그림과 목록이 들어가 저것이 필요하지만 리포트
 * 문구는 한 문단의 평문이고, 서식을 열면 아이마다 다른 모양의 리포트가 나간다.
 */
export default function TemplateDesk({
  row,
  back,
  start,
  guarded = false,
  onSave,
  onReset,
  onRemove,
  children,
}: {
  row: TemplateRow;
  back: React.ReactNode;
  /** 처음부터 고쳐 둔 글 — 디자인 보기가 「고치는 중」을 그릴 때만 넘긴다 */
  start?: { title?: string; text?: string };
  /** 손댄 채로 나가려 하면 붙잡고 묻는다 — 실제 화면만 켠다 */
  guarded?: boolean;
  /** 저장 — 저장하지 못했으면 false를 돌려준다 */
  onSave: (title: string, text: string) => boolean;
  /** 「기본 문구로 되돌리기」 — 고친 기본 항목에만 있다 */
  onReset: () => void;
  /** 「이 항목 지우기」 — 운영자가 더한 항목에만 있다. 정말 지울지 묻는 일은 부르는 쪽이 한다 */
  onRemove: () => void;
  children?: React.ReactNode;
}) {
  const slot = slotOf(row.slot);
  const custom = isCustomSlot(row.slot);

  const draft = useEditDraft({ title: row.title, text: row.text }, start);
  const v = draft.value;

  const findings = useMemo(() => labelCheck(v.text), [v.text]);
  const blocked = findings.some((f) => f.tone === "block");
  const empty = !v.text.trim();

  const save = () => {
    if (blocked || empty) return false;
    return onSave(v.title, v.text);
  };
  const guard = useUnsavedGuard(guarded && draft.dirty, save, draft.reset);

  const axisName = row.axis ? (axes.find((a) => a.id === row.axis)?.label ?? row.axis) : null;

  return (
    <>
      <PageHead
        title={slot.label}
        back={back}
        actions={
          <>
            {row.edited && !custom && (
              <button type="button" className="a2-btn" onClick={onReset}>
                기본 문구로 되돌리기
              </button>
            )}
            {/* 운영자가 더한 자리만 지운다 — 칸 하나가 아니라 자리 전체(학년대 넷의 문구 · 규칙)가 사라진다 */}
            {custom && (
              <button type="button" className="a2-btn a2-btn-danger" onClick={onRemove}>
                이 항목 지우기
              </button>
            )}
          </>
        }
      />

      <Body className="grid gap-3">
        <Panel title="이 칸" meta={row.id} flush>
          <div className="a2-form">
            <FormRow label="학년">
              <Tag accent>{gradeLabel(row.grade)}</Tag>
            </FormRow>
            <FormRow label="재능 축">
              {axisName ? <Tag>{axisName}</Tag> : <span className="a2-t-sm text-(--a2-ink-3)">모든 축</span>}
            </FormRow>
            <FormRow label="발현 밴드">
              {row.band ? (
                <Tag>
                  {row.band} {bandOf(row.band).label}
                </Tag>
              ) : (
                <span className="a2-t-sm text-(--a2-ink-3)">밴드 없음</span>
              )}
            </FormRow>
            <FormRow label="상태">
              {row.empty ? (
                <Status tone="warn">빈 칸</Status>
              ) : row.edited ? (
                <>
                  <Status tone="info">수정됨</Status>
                  <span className="a2-mono a2-t-xs text-(--a2-ink-4)">
                    {row.editedAt} · {row.editedBy}
                  </span>
                </>
              ) : (
                <Status tone="muted">기본 문구</Status>
              )}
            </FormRow>
            <FormRow label="이 항목의 규칙">
              {slot.guide ? (
                <span className="a2-t-sm text-(--a2-ink-2)">{slot.guide}</span>
              ) : (
                <span className="a2-t-sm text-(--a2-ink-4)">항목을 만들 때 적어 둔 안내가 없습니다.</span>
              )}
            </FormRow>
          </div>
        </Panel>

        <Panel title="문구" lead flush>
          <div className="a2-form">
            <FormRow label="블록 제목">
              <input
                className="a2-input"
                style={{ maxWidth: "22rem" }}
                value={v.title}
                placeholder={`예: ${axisName ? `${axisName} 축` : slot.label}`}
                onChange={(e) => draft.set("title", e.target.value)}
              />
            </FormRow>
            <FormRow label="리포트에 나갈 글" req>
              <textarea
                className="a2-textarea"
                rows={6}
                value={v.text}
                placeholder="여기에 나갈 문장을 적어 주세요."
                onChange={(e) => draft.set("text", e.target.value)}
              />
            </FormRow>

            {(findings.length > 0 || empty) && (
              <FormRow label="확인할 점">
                <span className="grid w-full gap-1">
                  {empty && (
                    <span className="a2-note" style={{ borderLeftColor: "var(--a2-danger)" }}>
                      <span>문구가 비어 있습니다.</span>
                    </span>
                  )}
                  {findings.map((f, i) => (
                    <span
                      key={`${f.word}-${i}`}
                      className="a2-note"
                      style={{
                        borderLeftColor: f.tone === "block" ? "var(--a2-danger)" : "var(--a2-warn)",
                      }}
                    >
                      <span>
                        <b>「{f.word}」</b> {f.why}
                      </span>
                    </span>
                  ))}
                </span>
              </FormRow>
            )}
          </div>
        </Panel>

        {row.history.length > 0 && (
          <Panel title="수정 이력" meta={`${row.history.length}건`} flush>
            <ul className="divide-y divide-(--a2-line)">
              {row.history.map((h, i) => (
                <li key={`${h.at}-${i}`} className="p-3">
                  <p className="a2-t-xs text-(--a2-ink-4)">
                    <span className="a2-mono">{h.at}</span> · {h.by}
                  </p>
                  <p className="mt-1 a2-t-sm leading-[1.7] text-(--a2-ink-2)">{h.text}</p>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </Body>

      <PageSaveBar
        dirty={draft.dirty}
        onSave={save}
        onCancel={draft.reset}
        disabled={blocked || empty}
        note={
          blocked
            ? "금지 표현이 들어 있어 저장할 수 없습니다 — 헌장 7조."
            : draft.dirty
              ? "저장하면 발행을 기다리는 리포트와 앞으로 조립하는 리포트에 이 문구가 들어갑니다. 이미 발행한 리포트는 바뀌지 않습니다."
              : row.empty
                ? "아직 아무도 쓰지 않은 칸입니다."
                : undefined
        }
      />
      <LeaveDialog guard={guard} />

      {children}
    </>
  );
}
