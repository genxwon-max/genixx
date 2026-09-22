"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useAdminPrefs } from "@/lib/adminStore";
import { useHydrated } from "@/lib/examStore";
import { labelCheck } from "@/lib/labelCheck";
import { bandOf, gradeLabel, isCustomSlot, slotOf } from "@/lib/reportAssets";
import { removeSlot, resetTemplate, saveTemplate, useTemplateById } from "@/lib/reportAssetStore";
import { axes } from "@/lib/result";
import {
  LeaveDialog,
  PageSaveBar,
  useEditDraft,
  useUnsavedGuard,
} from "@/components/admin2/EditGuard";
import { Body, FormRow, PageHead, Panel, SeedNote, Status, Tag } from "@/components/admin2/ui";

/**
 * 해석 템플릿 한 칸.
 *
 * ── 라벨링 점검을 여기에 건 까닭 ──
 * 리포트 승인 화면(EXP-08)에도 같은 점검이 있다. 거기서는 **아이 하나**의 문구를 막지만,
 * 템플릿은 그 문구를 받는 **모든 아이**에게 나간다. 같은 금칙어가 저기서 스무 번 걸릴 것을
 * 여기서 한 번 막는 편이 낫다.
 *
 * 막는 말(BANNED)은 저장을 잠그고, 짚는 말(CAUTION)은 적어만 둔다 — 「부족합니다」는 맥락에
 * 따라 쓸 수 있는 말이라 사람이 판단할 자리를 남긴다.
 *
 * ── 서식을 열지 않는다 ──
 * BodyEditor(RichText)를 쓰지 않는다. 공지는 그림과 목록이 들어가 저것이 필요하지만 리포트
 * 문구는 한 문단의 평문이고, 서식을 열면 아이마다 다른 모양의 리포트가 나간다.
 */
export default function TemplateDetail({ id }: { id: string }) {
  const row = useTemplateById(id);
  const hydrated = useHydrated();

  const back = (
    <Link href="/admin2/reports/templates" className="a2-btn">
      ← 해석 템플릿
    </Link>
  );

  if (!row) {
    return (
      <>
        <PageHead title="찾지 못했습니다" back={back} />
        <Body>
          <Panel title="없는 칸">
            <p className="a2-t-sm text-(--a2-ink-2)">
              <span className="a2-mono">{id}</span> 은(는) 격자에 없는 칸입니다.
            </p>
          </Panel>
        </Body>
      </>
    );
  }

  /* 저장분은 브라우저에만 있어 서버에서 그릴 값이 없다. 머리는 먼저 그려 화면이 통째로
     비지 않게 하고, 초안은 하이드레이션 뒤에 잡는다 — useEditDraft가 첫 렌더의 값을
     붙드는데 씨앗 값으로 잡히면 저장분이 들어와도 dirty가 거짓으로 켜진다 */
  if (!hydrated) return <PageHead title={slotOf(row.slot).label} back={back} />;

  return <Desk key={row.id} row={row} back={back} />;
}

function Desk({
  row,
  back,
}: {
  row: NonNullable<ReturnType<typeof useTemplateById>>;
  back: React.ReactNode;
}) {
  const by = useAdminPrefs().staffName || "운영자";
  const router = useRouter();
  const slot = slotOf(row.slot);
  const custom = isCustomSlot(row.slot);

  const draft = useEditDraft({ title: row.title, text: row.text });
  const v = draft.value;

  const findings = useMemo(() => labelCheck(v.text), [v.text]);
  const blocked = findings.some((f) => f.tone === "block");
  const empty = !v.text.trim();

  const save = () => {
    if (blocked || empty) return false;
    return saveTemplate(row.id, v.title, v.text, by);
  };
  const guard = useUnsavedGuard(draft.dirty, save, draft.reset);

  const axisName = row.axis ? (axes.find((a) => a.id === row.axis)?.label ?? row.axis) : null;

  return (
    <>
      <PageHead
        title={slot.label}
        back={back}
        actions={
          <>
            {row.edited && !custom && (
              <button type="button" className="a2-btn" onClick={() => resetTemplate(row.id)}>
                기본 문구로 되돌리기
              </button>
            )}
            {/* 운영자가 더한 자리만 지운다 — 칸 하나가 아니라 자리 전체(학년대 넷의 문구 · 규칙)가 사라진다 */}
            {custom && (
              <button
                type="button"
                className="a2-btn a2-btn-danger"
                onClick={() => {
                  if (
                    !window.confirm(
                      `「${slot.label}」 자리를 지웁니다.\n학년마다 쓴 문구와 조립 규칙이 함께 사라집니다. 이미 발행된 리포트는 그대로입니다.\n\n지울까요?`,
                    )
                  )
                    return;
                  router.push("/admin2/reports/templates");
                  removeSlot(row.slot);
                }}
              >
                이 자리 지우기
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
              {axisName ? <Tag>{axisName}</Tag> : <span className="a2-t-sm text-(--a2-ink-3)">전 축</span>}
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
                  <Status tone="info">고침</Status>
                  <span className="a2-mono a2-t-xs text-(--a2-ink-4)">
                    {row.editedAt} · {row.editedBy}
                  </span>
                </>
              ) : (
                <Status tone="muted">기본 문구</Status>
              )}
            </FormRow>
            <FormRow label="이 자리의 규칙">
              {slot.guide ? (
                <span className="a2-t-sm text-(--a2-ink-2)">{slot.guide}</span>
              ) : (
                <span className="a2-t-sm text-(--a2-ink-4)">자리를 만들 때 적어 둔 안내가 없습니다.</span>
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
                placeholder="이 자리에 나갈 문장을 적어 주세요."
                onChange={(e) => draft.set("text", e.target.value)}
              />
            </FormRow>

            {(findings.length > 0 || empty) && (
              <FormRow label="짚을 것">
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
          <Panel title="고쳐 온 자취" meta={`${row.history.length}벌`} flush>
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
            ? "막는 표현이 들어 있어 저장할 수 없습니다 — 헌장 7조."
            : draft.dirty
              ? "저장하면 다음에 조립되는 리포트부터 이 문구가 나갑니다."
              : row.empty
                ? "아직 아무도 쓰지 않은 칸입니다."
                : undefined
        }
      />
      <LeaveDialog guard={guard} />

      <SeedNote />
    </>
  );
}
