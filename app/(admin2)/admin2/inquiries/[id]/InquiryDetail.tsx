"use client";

import Link from "next/link";
import { useState } from "react";
import { inquiryStates } from "@/lib/admin";
import { useAdminPrefs } from "@/lib/adminStore";
import { richIsEmpty } from "@/lib/contentStore";
import { useHydrated } from "@/lib/examStore";
import {
  answerInquiry,
  inquiryActions,
  reopenInquiry,
  useInquiries,
  type Inquiry,
} from "@/lib/inquiryStore";
import BodyEditor from "@/components/admin2/BodyEditor";
import {
  LeaveDialog,
  PageSaveBar,
  useEditDraft,
  useUnsavedGuard,
} from "@/components/admin2/EditGuard";
import { Body, FormRow, PageHead, Panel, Status, Tag } from "@/components/admin2/ui";
import { STATE_TONE } from "../InquiriesTable";

/**
 * 문의 하나에 답하는 화면 (ADM-10).
 *
 * 판 셋이다 — 무엇을 물었나 · 무엇이라 답하나 · 그동안 무슨 일이 있었나. 답을 쓰는 판이
 * 이 화면의 주인이라 가운데에 크게 세운다(lead).
 *
 * ── 맡기를 두지 않는다 ──
 * 「내가 맡기」 단추가 따로 있었다. 배정 회의가 있는 규모가 아니라 이 콘솔을 여는 사람이
 * 곧 답하는 사람이고, 맡기를 눌러야 답이 열리는 것도 아니었다 — 한 걸음이 늘 뿐이었다.
 * 맡은 사람은 답을 보내는 순간 정해진다(lib/inquiryStore.ts의 answerInquiry).
 *
 * ── 답은 초안이다 ──
 * 쓰는 동안에는 저장소에 아무것도 쓰지 않는다. 보내야 나가고, 손댄 채로 화면을 떠나려
 * 하면 붙잡고 물어본다(EditGuard).
 */
export default function InquiryDetail({ id }: { id: string }) {
  const hydrated = useHydrated();
  const rows = useInquiries();
  const row = rows.find((r) => r.id === id) ?? null;

  const back = (
    <Link href="/admin2/inquiries" className="a2-btn">
      ← 문의
    </Link>
  );

  if (!row) {
    return (
      <>
        <PageHead title="찾지 못했습니다" back={back} />
        <Body>
          <Panel title="없는 문의">
            <p className="a2-t-sm text-(--a2-ink-2)">
              <span className="a2-mono">{id}</span> 은(는) 목록에 없는 문의입니다.
            </p>
          </Panel>
        </Body>
      </>
    );
  }

  /* 답과 상태는 브라우저에만 있다. 하이드레이션 전에 초안을 잡으면 빈 답이 붙들려,
     저장분이 들어와도 고친 것이 있다고 잘못 켜진다 */
  if (!hydrated) return <PageHead title={row.title} back={back} />;

  return <Desk row={row} back={back} />;
}

function Desk({ row, back }: { row: Inquiry; back: React.ReactNode }) {
  const by = useAdminPrefs().staffName || "운영자";
  const draft = useEditDraft({ answer: row.answer });
  const [why, setWhy] = useState("");

  const answered = row.state === "answered";
  const empty = richIsEmpty(draft.value.answer);

  const send = () => {
    if (empty) return false;
    answerInquiry(row.id, draft.value.answer, by);
    return true;
  };
  const guard = useUnsavedGuard(draft.dirty, send, draft.reset);

  return (
    <>
      <PageHead
        title={row.title}
        back={back}
        actions={<Status tone={STATE_TONE[row.state]}>{inquiryStates[row.state].label}</Status>}
      />

      <Body className="grid gap-3">
        <Panel title="문의" meta={row.id} flush>
          <div className="a2-form">
            <FormRow label="보낸 사람">
              <span className="a2-t-sm text-(--a2-ink-2)">{row.writer}</span>
              <Tag accent={row.channel === "기관 도입"}>{row.channel}</Tag>
              <Tag>{row.category}</Tag>
            </FormRow>

            {/* 목표 초과 표시는 여기 두지 않는다. 그것은 「무엇부터 여나」를 고르는 값이라
                목록의 탭과 칸이 맡고, 이미 열고 들어온 화면에서는 답을 쓰는 데 보탬이 없다 */}
            <FormRow label="기다린 시간">
              <span className="a2-t-sm text-(--a2-ink-2)">{row.waited}</span>
            </FormRow>

            <FormRow label="내용">
              <p className="w-full whitespace-pre-line a2-t-sm leading-[1.7] text-(--a2-ink-2)">
                {row.body}
              </p>
            </FormRow>
          </div>
        </Panel>

        <Panel title="답변" lead flush>
          <div className="a2-form a2-form-lg">
            {answered ? (
              <>
                <FormRow label="보낸 때">
                  <span className="a2-mono a2-t-sm text-(--a2-ink-2)">{row.answeredAt}</span>
                  <span className="a2-t-sm text-(--a2-ink-2)">{row.answeredBy}</span>
                </FormRow>

                <FormRow label="보낸 답">
                  <p className="w-full whitespace-pre-line a2-t-sm leading-[1.7] text-(--a2-ink-2)">
                    {row.answer.body}
                  </p>
                </FormRow>

                {/* 보낸 답을 그 자리에서 덮어쓰지 않는다. 다시 여는 까닭이 기록에 남아야
                    「왜 답이 두 번 나갔나」에 답할 수 있다 */}
                <FormRow label="다시 여는 까닭" req>
                  <textarea
                    className="a2-textarea a2-textarea-lg"
                    rows={2}
                    value={why}
                    onChange={(e) => setWhy(e.target.value)}
                    placeholder="예: 되물음이 들어와 답을 고쳐 보냅니다"
                  />
                  <span className="flex w-full">
                    <button
                      type="button"
                      className="a2-btn"
                      disabled={why.trim().length < 5}
                      onClick={() => {
                        reopenInquiry(row.id, by, why.trim());
                        setWhy("");
                      }}
                    >
                      다시 열기
                    </button>
                  </span>
                </FormRow>
              </>
            ) : (
              <FormRow label="보낼 글" req>
                <BodyEditor
                  name={`answer-mode-${row.id}`}
                  value={draft.value.answer}
                  disabled={false}
                  rows={9}
                  placeholder="묻는 사람이 그대로 받는 글입니다. 무엇을 확인했고 무엇을 해 드릴지 적습니다."
                  onChange={(patch) => draft.set("answer", { ...draft.value.answer, ...patch })}
                />
              </FormRow>
            )}
          </div>
        </Panel>

        {row.log.length > 0 && (
          <Panel title="처리 기록" meta={`${row.log.length}건`} flush>
            <ul className="divide-y divide-(--a2-line)">
              {[...row.log].reverse().map((l, k) => (
                <li key={`${l.at}-${k}`} className="flex flex-wrap items-center gap-x-2 p-3 a2-t-xs">
                  <span className="a2-mono text-(--a2-ink-4)">{l.at}</span>
                  <span className="font-bold text-(--a2-ink-2)">{l.by}</span>
                  <Tag>{inquiryActions[l.action]}</Tag>
                  <span className="text-(--a2-ink-2)">{l.text}</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        {!answered && (
          <PageSaveBar
            dirty={draft.dirty}
            onSave={send}
            onCancel={draft.reset}
            disabled={empty}
            note=""
          />
        )}
      </Body>

      <LeaveDialog guard={guard} />
    </>
  );
}
