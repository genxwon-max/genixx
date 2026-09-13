"use client";

import { useEffect, useState } from "react";
import { labelCheck } from "@/lib/labelCheck";
import { blockText, clearOverride, overrideBlock, type ReportBlock } from "@/lib/reportStore";
import type { SendRow } from "@/lib/reportSendStore";
import { Tag } from "@/components/admin2/ui";

/**
 * 회원이 받는 리포트 — 읽고, 여기서 고친다.
 *
 * ── 왜 고치는 자리가 여기인가 ──
 * 검토 화면의 블록에는 근거 줄과 라벨링 점검이 함께 붙는다. 그것은 검토자를 위한 것이고
 * 보호자는 문장만 받는다. 그런데 **문구를 고치는 사람이 보아야 하는 것도 회원이 받는 꼴**이다 —
 * 근거가 붙은 화면에서 고치면 앞뒤 문단과 어떻게 이어지는지가 안 보인다. 상세 판 안에서 펴서
 * 고치던 것을 걷고 이 안으로 들인 까닭이 그것이다. 고치는 자리가 둘이면 어느 쪽이 실제로
 * 나가는 글인지 묻게 된다.
 *
 * ── 저장은 한 번 ──
 * 블록마다 저장 단추를 세우지 않는다. 한 리포트를 손보는 일은 문단 몇 개를 함께 다듬는
 * 일이라, 사유도 한 번만 받는다 — 문단마다 까닭을 묻는 화면은 쓰다가 그만두게 된다.
 *
 * ⚠ 이미 보낸 리포트는 고치지 못한다. 보호자가 이미 읽은 글이 뒤에서 바뀌면 안 되고,
 *   overrideBlock도 published면 아무것도 하지 않는다 — 「수정」 단추를 아예 내지 않는다.
 *
 * ⚠ 고치다 만 채로 닫히지 않게 한다. 바탕을 눌러 닫는 길은 고치는 동안 막고, 닫기와 Esc는
 *   한 번 묻는다.
 */
export default function Preview({
  row,
  by,
  sent,
  onClose,
}: {
  row: SendRow;
  by: string;
  sent: boolean;
  onClose: () => void;
}) {
  const [edit, setEdit] = useState(false);
  /** 손댄 문단만 담는다 — 안 건드린 것까지 덮어쓰면 「수정됨」이 전부에 붙는다 */
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [why, setWhy] = useState("");
  const [leave, setLeave] = useState(false);

  const textOf = (b: ReportBlock) => draft[b.id] ?? blockText(b);
  const changed = row.blocks.filter(
    (b) => b.id in draft && draft[b.id].trim() && draft[b.id].trim() !== blockText(b),
  );
  const dirty = changed.length > 0;

  const findings = changed.flatMap((b) => labelCheck(draft[b.id]));
  const blocked = findings.some((f) => f.tone === "block");
  const empty = row.blocks.some((b) => b.id in draft && !draft[b.id].trim());
  const ok = dirty && !blocked && !empty && why.trim().length >= 5;

  const stopEdit = () => {
    setDraft({});
    setWhy("");
    setEdit(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (edit && dirty) setLeave(true);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [edit, dirty, onClose]);

  const save = () => {
    for (const b of changed) overrideBlock(row.id, b.id, draft[b.id].trim(), by, why.trim());
    stopEdit();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/35 p-4"
      onClick={() => !edit && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="a2-preview-title"
        className="a2-panel my-4 w-full max-w-[44rem]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="a2-panel-head">
          <div className="flex min-w-0 items-baseline gap-2">
            <h2 id="a2-preview-title" className="a2-h">
              {edit ? "리포트 고치기" : "회원이 받는 리포트"}
            </h2>
            <span className="truncate a2-t-xs text-(--a2-ink-4)">
              {edit ? "고친 글이 그대로 나갑니다" : sent ? "이미 보냈습니다" : "읽기만 합니다"}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {edit ? (
              <>
                <button
                  type="button"
                  className="a2-btn a2-btn-sm"
                  onClick={() => (dirty ? setLeave(true) : stopEdit())}
                >
                  그만두기
                </button>
                <button
                  type="button"
                  className="a2-btn a2-btn-sm a2-btn-primary"
                  disabled={!ok}
                  onClick={save}
                >
                  저장
                </button>
              </>
            ) : (
              <>
                {/* 이미 보낸 리포트에는 이 단추가 서지 않는다 */}
                {!sent && (
                  <button
                    type="button"
                    className="a2-btn a2-btn-sm a2-btn-primary"
                    onClick={() => setEdit(true)}
                  >
                    수정
                  </button>
                )}
                <button type="button" className="a2-btn a2-btn-sm" onClick={onClose}>
                  닫기
                </button>
              </>
            )}
          </div>
        </div>

        <div className="a2-preview" style={{ maxHeight: "none" }}>
          <p className="a2-t-sm text-(--a2-ink-3)">
            {row.round} · {row.grade}
          </p>
          <h3 className="a2-title-lg mt-1">{row.student} 님의 재능 리포트</h3>
          <p className="mt-2 flex flex-wrap items-center gap-1.5">
            <Tag accent>{row.typeName}</Tag>
            <span className="a2-t-sm text-(--a2-ink-3)">신뢰도 {row.confidence}</span>
          </p>

          <div className="mt-5 grid gap-5">
            {row.blocks.map((b) => {
              const t = textOf(b);
              const found = edit ? labelCheck(t) : [];
              return (
                <section key={b.id}>
                  <p className="a2-label">{b.section}</p>
                  <h4 className="a2-h mt-0.5">
                    {b.title}
                    {b.override && (
                      <span className="ml-1.5 a2-t-xs font-normal text-(--a2-ink-4)">수정됨</span>
                    )}
                  </h4>
                  {edit ? (
                    <>
                      <textarea
                        className="a2-textarea mt-1.5"
                        rows={4}
                        aria-label={`${b.title} 문구`}
                        value={t}
                        onChange={(e) => setDraft((d) => ({ ...d, [b.id]: e.target.value }))}
                      />
                      {b.override && (
                        <button
                          type="button"
                          className="a2-btn a2-btn-sm mt-1.5"
                          onClick={() => {
                            clearOverride(row.id, b.id, by);
                            setDraft((d) => {
                              const next = { ...d };
                              delete next[b.id];
                              return next;
                            });
                          }}
                        >
                          원문으로 되돌리기
                        </button>
                      )}
                      {found.map((f, k) => (
                        <p
                          key={`${f.word}-${k}`}
                          className="a2-note mt-1.5"
                          style={{
                            borderLeftColor:
                              f.tone === "block" ? "var(--a2-danger)" : "var(--a2-warn)",
                          }}
                        >
                          <span>
                            <b>「{f.word}」</b> {f.why}
                          </span>
                        </p>
                      ))}
                    </>
                  ) : (
                    <p className="mt-1.5 a2-t-md leading-[1.9] text-(--a2-ink)">{t}</p>
                  )}
                </section>
              );
            })}
          </div>

          {edit && (
            <div className="mt-5 grid gap-1.5 border-t border-(--a2-line) pt-4">
              <input
                className="a2-input"
                placeholder="고친 까닭 — 다섯 자 이상"
                value={why}
                onChange={(e) => setWhy(e.target.value)}
              />
              <p className="a2-t-xs text-(--a2-ink-4)">
                {blocked
                  ? "검토가 필요한 표현이 들어 있어 저장할 수 없습니다."
                  : empty
                    ? "빈 문단은 저장하지 않습니다."
                    : dirty
                      ? `${changed.length}개 문단을 고쳤습니다. 저장하면 이 글이 나갑니다.`
                      : "고친 문단이 없습니다."}
              </p>
            </div>
          )}
        </div>
      </div>

      {leave && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/35 p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="a2-leave-edit"
            className="a2-panel w-full max-w-[24rem] p-5"
          >
            <h2 id="a2-leave-edit" className="a2-h">
              고친 것이 저장되지 않았습니다
            </h2>
            <p className="mt-2 a2-t-sm leading-[1.6] text-(--a2-ink-2)">
              문단 {changed.length}개를 고쳤습니다. 지금 나가면 사라집니다.
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-1.5">
              <button type="button" className="a2-btn" onClick={() => setLeave(false)}>
                계속 고치기
              </button>
              <button
                type="button"
                className="a2-btn"
                onClick={() => {
                  setLeave(false);
                  stopEdit();
                }}
              >
                고친 것 버리기
              </button>
              <button type="button" className="a2-btn a2-btn-danger" onClick={onClose}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
