"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { roundStates } from "@/lib/admin";
import { useAdminPrefs, recordAction } from "@/lib/adminStore";
import type { GradeNo } from "@/lib/blueprint";
import { useForms } from "@/lib/formStore";
import { useItems, type ItemDraft } from "@/lib/itemStore";
import {
  gradeFor,
  canonNote,
  checkPeriod,
  closeRound,
  finishRound,
  noteOf,
  openChecks,
  openRound,
  periodOf,
  periodText,
  planActions,
  planOf,
  reopenRound,
  setPeriod,
  setRoundNotes,
  setRoundPlan,
  slotsFor,
  slotsOf,
  stampOf,
  subjectsFor,
  usePlans,
  useRounds,
  type PlanGateAction,
  type RoundNote,
} from "@/lib/roundPlanStore";
import { Body, FormRow, PageHead, Panel, Tag } from "@/components/admin2/ui";
import {
  LeaveDialog,
  PageSaveBar,
  useEditDraft,
  useUnsavedGuard,
} from "@/components/admin2/EditGuard";
/* 검사지를 짜는 조각은 공용으로 옮겼다 — 평가별 문항관리 상세(ADM-04-3)의 과목 탭도
   같은 것을 그린다. 담는 자리가 둘이면 같은 검사지를 두 화면이 다르게 그린다 */
import FormSlot from "@/components/admin2/FormSlot";
import RoundNotes from "./RoundNotes";
import SlotPicker from "./SlotPicker";

/**
 * ADM-05-4 회차 편성 — 이 회차에 무엇이 나가고, 언제 열리고, 지금 열어도 되는가.
 *
 * 회차 목록(ADM-05)은 「어디까지 왔나」를 보는 자리고 여기는 「무엇을 내보낼까」를
 * 정하는 자리다. 셋을 한 화면에 둔 까닭은 셋이 한 물음의 앞뒤여서다 —
 *
 *   ① 편성   과목 × 학년 여섯 칸. 한 칸이 검사지 한 벌이고 칸마다 짜거나 비운다.
 *   ② 기간   언제부터 언제까지 여는가. 회차 목록의 값을 받아 여기서 고친다.
 *   ③ 개폐   준비중 → 응시 진행중 → 채점중 → 마감. 여는 것은 사람이 누르되
 *            **확정하지 않은 검사지가 하나라도 남아 있으면 막는다.**
 *
 * 편성을 표가 아니라 여섯 줄 고정 표로 두는 것은, 여기서 세는 것이 「있는 줄」이 아니라
 * 「빈 칸이 어디인가」이기 때문이다. 없는 칸을 안 그리면 짜야 할 칸이 남았다는 사실을
 * 회차를 열려다가 처음 알게 된다.
 *
 * ── 저장은 화면에 하나 ──
 * 기간은 제 단추로, 편성은 고르는 즉시, 공지는 제 저장 줄로 나갔었다. 한 화면에서 저장이
 * 셋이면 「지금 무엇이 저장된 상태인가」가 판마다 다르고, 편성만 되돌릴 길이 없다.
 * 지금은 **기간 · 편성 · 공지 · 열어 둔 검사지가 한 초안**이고 오른쪽 아래 저장 줄 하나가
 * 그것을 함께 내보낸다(components/admin2/EditGuard.tsx). 손댄 채로 나가려 하면 붙잡는다.
 *
 * 개폐(열기·마감)는 그 초안에 들어가지 않는다. 그것은 값을 고치는 일이 아니라 되돌리기
 * 어려운 **동작**이라, 제 까닭을 받아 제 단추로 나간다.
 *
 * ── 두 기둥에서 한 기둥으로 ──
 * 고치는 칸을 왼쪽 이름 · 오른쪽 입력으로 펴면서(FormRow · a2-form) 오른쪽 좁은 기둥이
 * 터졌다 — 이름표 10.5rem을 떼고 나면 날짜와 시각 두 칸이 나란히 설 자리가 없다. 판을
 * 한 기둥에 차례로 쌓는다. 문항 상세(ADM-04-1)와 같은 꼴이다.
 */
export default function RoundPlanView({ id }: { id: string }) {
  const forms = useForms();
  const items = useItems();
  const plans = usePlans();
  const allRounds = useRounds();
  const prefs = useAdminPrefs();

  const [openKey, setOpenKey] = useState<string | null>(null);
  const [gateWhy, setGateWhy] = useState("");

  /* 열어 둔 검사지의 초안 — 저장·되돌리기는 그 조각이 들고, 여기서는 부르기만 한다.
     dirty만 상태로 든다. 함수까지 상태로 들면 렌더마다 새 함수가 들어와 화면이 돈다 */
  const slotRef = useRef<{ dirty: boolean; save: () => void; discard: () => void } | null>(null);
  const [slotDirty, setSlotDirty] = useState(false);

  const round = allRounds.find((r) => r.id === id);
  const by = prefs.staffName || "운영자";

  /* ── 이 화면이 고치는 것 전부 ──
     기간 넷 · 편성 둘 · 공지 둘. 저장된 값에서 초안을 뜨고, 저장하거나 되돌리면 그 값으로
     돌아간다. 바깥에서 바뀐 값이 초안을 밀어내지 않는다 — 치고 있는 글자를 남의 저장이
     지우면 안 된다(useEditDraft).

     시각이 없는 옛 회차는 periodOf가 그날 통째(00:00–23:59)로 채워 준다.

     ⚠ 없는 회차로 빠지는 길(아래 이른 반환)보다 **위에** 둔다. 훅은 어느 렌더에서나 같은
       차례로 돌아야 한다. planOf는 저장분이 없어도 바닥값을 내주므로 회차를 못 찾은
       화면에서도 안전하다. */
  const plan = planOf(plans, id);
  const savedPeriod = periodOf(plan);
  const draft = useEditDraft({
    opensOn: savedPeriod.opensOn,
    opensAt: savedPeriod.opensAt,
    closesOn: savedPeriod.closesOn,
    closesAt: savedPeriod.closesAt,
    grade: gradeFor(plan),
    subjects: subjectsFor(plan),
    notice: noteOf(plan.notice),
    caution: noteOf(plan.caution),
  });
  const v = draft.value;

  const nextPeriod = {
    opensOn: v.opensOn,
    opensAt: v.opensAt,
    closesOn: v.closesOn,
    closesAt: v.closesAt,
  };
  const periodBad = checkPeriod(nextPeriod);
  const periodMoved =
    v.opensOn !== savedPeriod.opensOn ||
    v.opensAt !== savedPeriod.opensAt ||
    v.closesOn !== savedPeriod.closesOn ||
    v.closesAt !== savedPeriod.closesAt;

  const dirty = draft.dirty || slotDirty;

  /**
   * 저장 — 기간 · 편성 · 공지 · 열어 둔 검사지를 한 번에.
   *
   * **저장하지 못하면 false를 돌려준다.** 나가기 물음의 「저장하고 나가기」가 이 값을 보고
   * 보낼지 정한다 — 값이 어긋나 저장이 걸러졌는데 화면을 떠나 버리면, 저장했다고 믿는
   * 순간에 고친 것이 통째로 사라진다.
   */
  const save = () => {
    if (!round || periodBad.length > 0) return false;
    if (periodMoved) {
      setPeriod(round.id, nextPeriod, by, "");
      recordAction(
        round.label,
        planActions.period,
        `${stampOf(v.opensOn, v.opensAt)} – ${stampOf(v.closesOn, v.closesAt)}`,
        by,
      );
    }
    /* 편성은 값이 실제로 달라졌을 때만 내보낸다 — 그러지 않으면 저장을 누를 때마다
       「편성을 정했습니다」가 회차 기록에 한 줄씩 쌓인다 */
    if (v.grade !== gradeFor(plan) || v.subjects.join("|") !== subjectsFor(plan).join("|")) {
      setRoundPlan(round.id, { grade: v.grade, subjects: v.subjects }, by);
    }
    /* 저장소가 다듬은 꼴을 초안에도 되돌려 넣는다. 넣지 않으면 줄 끝 빈 칸 하나로
       초안과 저장분이 어긋난 채로 남아, 저장 줄이 영영 켜져 있게 된다 */
    const notice = canonNote(v.notice);
    const caution = canonNote(v.caution);
    setRoundNotes(round.id, { notice, caution });
    draft.patch({ notice, caution });
    slotRef.current?.save();
    return true;
  };

  const cancel = () => {
    draft.reset();
    slotRef.current?.discard();
  };

  const guard = useUnsavedGuard(dirty, save, cancel);

  /* 다른 칸을 열면 아래 편집기가 새로 선다. 담다 만 것이 있으면 먼저 물어본다 */
  const openSlot = (key: string | null) =>
    guard.ask(() => {
      slotRef.current = null;
      setSlotDirty(false);
      setOpenKey(key);
    });

  if (!round) {
    return (
      <>
        <PageHead
          title="회차를 찾지 못했습니다"
          actions={
            <Link href="/admin2/rounds" className="a2-btn">
              회차 목록
            </Link>
          }
        />
        <Body>
          <Panel title="없는 회차">
            <p className="a2-t-sm text-(--a2-ink-2)">
              <span className="a2-mono">{id}</span> 회차가 목록에 없습니다(lib/admin.ts).
            </p>
          </Panel>
        </Body>
      </>
    );
  }

  const slots = slotsOf(round.id, forms, items, slotsFor(plan));
  const checks = openChecks(round.id, slots, plans);
  const blocks = checks.filter((c) => c.tone === "block");
  const warns = checks.filter((c) => c.tone === "warn");

  const slot = slots.find((s) => s.key === openKey) ?? null;

  /* 지금 상태에서 누를 수 있는 것만 낸다. 넷을 늘 세워 두고 흐리게 하면 무엇이
     지금 되는 것인지 매번 읽어야 한다. */
  const gates: { action: PlanGateAction; label: string; danger?: boolean; blocked?: boolean }[] =
    plan.state === "draft"
      ? [{ action: "open", label: "회차 열기", blocked: blocks.length > 0 }]
      : plan.state === "open"
        ? [{ action: "close", label: "응시 마감" }]
        : plan.state === "grading"
          ? [
              { action: "finish", label: "회차 종료" },
              { action: "reopen", label: "응시 다시 열기", danger: true },
            ]
          : [];

  const run = (action: PlanGateAction, text: string) => {
    const fn = { open: openRound, close: closeRound, finish: finishRound, reopen: reopenRound }[action];
    fn(round.id, by, text);
    recordAction(round.label, planActions[action], text, by);
    setGateWhy("");
  };

  return (
    <>
      <PageHead
        title={round.label}
        actions={
          <>
            <Link href="/admin2/items" className="a2-btn">
              문항 은행
            </Link>
            <Link href="/admin2/rounds" className="a2-btn">
              회차 목록
            </Link>
          </>
        }
      />
      <Body>
        <div className="grid gap-3">
          {/* ① 편성판 — 과목마다 한 줄. 넣은 과목은 빠짐없이 낸다.
              표였던 것을 줄로 폈다. 칸이 여덟(칸·검사지·문항·단계 배분·배점·앵커·남은
              승인·동작)이라 가로로 넓었는데, 정작 여기서 답하는 것은 「어느 과목을 손대야
              하나」 하나다. 단계 배분·앵커·남은 승인·확정 여부는 **그 칸을 열면** 바로 위에
              같은 말로 서 있고(FormSlot의 요약 판), 확정이 안 된 칸이 어디인지는 여는
              관문이 막을 때 이름으로 불러 준다. 여기서는 과목 · 문항 · 배점 · 여닫기만 둔다 */}
          <Panel title="편성판" flush>
            <div className="a2-form">
              {slots.map((s) => {
                const on = openKey === s.key;
                return (
                  <FormRow key={s.key} label={s.subject}>
                    <span className="a2-num a2-t-md font-bold text-(--a2-ink)">{s.picked.length}</span>
                    <span className="a2-t-sm text-(--a2-ink-3)">문항</span>
                    <span className="a2-num a2-t-md font-bold text-(--a2-ink)">
                      {s.picked.reduce((sum, i) => sum + i.points, 0)}
                    </span>
                    <span className="a2-t-sm text-(--a2-ink-3)">점</span>
                    <span className="ml-auto">
                      <button
                        type="button"
                        className="a2-btn a2-btn-sm"
                        aria-pressed={on}
                        aria-label={`${s.label} ${on ? "닫기" : "열기"}`}
                        onClick={() => openSlot(on ? null : s.key)}
                      >
                        {on ? "닫기" : "열기"}
                      </button>
                    </span>
                  </FormRow>
                );
              })}
              {slots.length === 0 && (
                <FormRow label="과목">
                  <span className="a2-t-sm text-(--a2-ink-4)">
                    넣은 과목이 없습니다. 아래 평가 과목 편성에서 넣습니다.
                  </span>
                </FormRow>
              )}
            </div>
          </Panel>

          {/* key를 칸 열쇠로 준다. 없으면 국어 칸에서 체크해 둔 문항 목록을 든 채로 수학
              칸이 열려, 담기를 누르면 다른 과목 문항이 들어간다(확정 대조에서 걸리기는
              하지만 그 전에 담기는 것 자체를 막는 편이 낫다).

              저장은 이 화면의 저장 줄이 맡는다(onDraft) — 검사지만 따로 저장하는 줄을
              두면 한 화면에 저장이 둘이 된다 */}
          {slot && (
            <FormSlot
              key={slot.key}
              roundId={round.id}
              slot={slot}
              items={items}
              by={by}
              onClose={() => openSlot(null)}
              onDraft={(d) => {
                slotRef.current = d;
                setSlotDirty(d?.dirty ?? false);
              }}
            />
          )}

          {/* 칸 하나를 열면 그 아래는 접는다.
              열린 검사지는 판 넷에 표 둘이라 화면 두 장이 넘는다. 그 밑에 기간·공지·관문·
              기록이 그대로 서 있으면 문항을 담다가 화면 끝까지 내려가 「내가 무엇을 하다가
              여기까지 왔지」가 되고, 담긴 문항을 다시 보려면 도로 올라와야 한다. 닫으면
              그대로 돌아온다 — 고치던 것은 초안에 그대로 있고 저장 줄도 그대로다.

              편성판만 남긴다. 지금 어느 칸을 열어 두었는지를 그 표가 말하고(단추가
              「닫기」로 서 있다), 닫고 돌아갈 자리도 거기다. */}
          {!slot && (
            <>
              {/* 이 회차가 볼 칸을 다시 정한다. 편성판 바로 아래에 두는 까닭은,
                  「비어 있는 칸이 셋이나 남았다」를 본 다음에 드는 물음이 대개 「그 칸을
                  이번엔 안 보면 안 되나」라서다 */}
              <SlotPicker
                round={round.id}
                locked={plan.state !== "draft"}
                value={{ grade: v.grade, subjects: v.subjects }}
                onChange={(next: { grade: GradeNo; subjects: ItemDraft["subject"][] }) =>
                  draft.patch({ grade: next.grade, subjects: next.subjects })
                }
              />

            {/* ② 응시 기간 — 날짜와 시각을 한 줄에 나란히 둔다 */}
            <Panel title="응시 기간" meta={periodText(plan)} flush>
              <div className="a2-form">
                <FormRow label="시작" req>
                  <input
                    type="date"
                    className="a2-input a2-mono"
                    style={{ maxWidth: "11rem" }}
                    aria-label="응시 시작일"
                    value={v.opensOn}
                    onChange={(e) => draft.set("opensOn", e.target.value)}
                  />
                  <input
                    type="time"
                    className="a2-input a2-mono"
                    style={{ maxWidth: "8rem" }}
                    aria-label="응시 시작 시각"
                    value={v.opensAt}
                    onChange={(e) => draft.set("opensAt", e.target.value)}
                  />
                </FormRow>

                <FormRow label="마감" req>
                  <input
                    type="date"
                    className="a2-input a2-mono"
                    style={{ maxWidth: "11rem" }}
                    aria-label="응시 마감일"
                    value={v.closesOn}
                    onChange={(e) => draft.set("closesOn", e.target.value)}
                  />
                  <input
                    type="time"
                    className="a2-input a2-mono"
                    style={{ maxWidth: "8rem" }}
                    aria-label="응시 마감 시각"
                    value={v.closesAt}
                    onChange={(e) => draft.set("closesAt", e.target.value)}
                  />
                </FormRow>

                {(periodBad.length > 0 || (plan.state !== "draft" && periodMoved)) && (
                  <FormRow label="짚을 것">
                    {periodBad.length > 0 && (
                      <p className="a2-note w-full" style={{ borderLeftColor: "var(--a2-danger)" }}>
                        <span>{periodBad.join(" · ")}</span>
                      </p>
                    )}
                    {plan.state !== "draft" && periodMoved && (
                      <p className="a2-note w-full" style={{ borderLeftColor: "var(--a2-warn)" }}>
                        <span>
                          이미 {roundStates[plan.state].label}인 회차입니다. 마감을 미루는 것(연장)은 흔한 일이지만,
                          시작을 바꾸면 이미 응시한 기록과 기간이 어긋납니다.
                        </span>
                      </p>
                    )}
                  </FormRow>
                )}
              </div>
            </Panel>

            {/* 공지는 편성 칸 다음에 둔다. 무엇을 낼지 정한 다음에 나오는 물음이
                「이번엔 무슨 말을 함께 낼까」라서다 */}
            <RoundNotes
              locked={plan.state === "closed"}
              value={{ notice: v.notice, caution: v.caution }}
              onChange={(next: { notice: RoundNote; caution: RoundNote }) => draft.patch(next)}
            />

            {/* ③ 여는 관문 — 값을 고치는 일이 아니라 되돌리기 어려운 동작이라
                저장 줄에 얹지 않고 제 까닭을 받아 제 단추로 나간다 */}
            <Panel title="여는 관문" meta={`막음 ${blocks.length} · 확인 ${warns.length}`} flush>
              <div className="a2-form">
                {gates.length === 0 ? (
                  <FormRow label="다음 걸음">
                    <span className="a2-t-sm text-(--a2-ink-4)">마감된 회차입니다. 더 옮길 상태가 없습니다.</span>
                  </FormRow>
                ) : (
                  <>
                    <FormRow label="까닭" req>
                      <textarea
                        className="a2-textarea"
                        rows={2}
                        value={gateWhy}
                        onChange={(e) => setGateWhy(e.target.value)}
                        placeholder="예: 국어 검사지 확정 확인함. 과학은 문항이 모자라 이번 회차에 보지 않기로 함"
                      />
                    </FormRow>
                    {/* 누를 수 있는 것이 둘일 때(채점중)도 줄 하나에 함께 세운다. 줄마다
                        이름표를 달면 그 이름표가 단추와 같은 말이 되어 두 번 읽힌다.

                        막는 것을 목록으로 펴 두었다가 걷었다. 대신 **막힌 단추가 제 까닭을
                        들고 있게** 한다 — 눌리지 않는 단추만 남고 왜인지가 어디에도 없으면
                        고장으로 읽힌다. 머리의 「막음 N」이 몇 건인지는 늘 적는다 */}
                    <FormRow label="다음 걸음">
                      <span className="flex flex-wrap items-center gap-1.5">
                        {gates.map((g) => (
                          <button
                            key={g.action}
                            type="button"
                            className={`a2-btn ${g.danger ? "a2-btn-danger" : "a2-btn-primary"}`}
                            disabled={g.blocked || gateWhy.trim().length < 10 || dirty}
                            title={
                              dirty
                                ? "먼저 저장해 주세요 — 관문은 저장된 편성을 봅니다"
                                : g.blocked
                                  ? blocks.map((c) => c.text).join(" · ")
                                  : gateWhy.trim().length < 10
                                    ? "까닭을 열 자 이상 적어 주세요"
                                    : undefined
                            }
                            onClick={() => run(g.action, gateWhy.trim())}
                          >
                            {g.label}
                          </button>
                        ))}
                      </span>
                    </FormRow>
                </>
              )}
            </div>
          </Panel>

          {/* 기록 */}
          <Panel title="회차 기록" meta={`${plan.log.length}건`} flush>
            {plan.log.length === 0 ? (
              <p className="p-3 a2-t-sm text-(--a2-ink-4)">아직 열고 닫은 기록이 없습니다.</p>
            ) : (
              <ul className="divide-y divide-(--a2-line)">
                {plan.log.map((l, k) => (
                  <li key={`${l.at}-${k}`} className="px-2.5 py-1.5">
                    <p className="flex flex-wrap items-center gap-x-2 a2-t-xs">
                      <span className="a2-mono text-(--a2-ink-4)">{l.at}</span>
                      <span className="font-bold text-(--a2-ink-2)">{l.by}</span>
                      <Tag>{planActions[l.action]}</Tag>
                    </p>
                    <p className="a2-t-sm text-(--a2-ink-2)">{l.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
            </>
          )}
        </div>

        {/* 기간 · 편성 · 공지 · 열어 둔 검사지를 한 번에 */}
        <PageSaveBar
          dirty={dirty}
          onSave={save}
          onCancel={cancel}
          disabled={periodBad.length > 0}
          note={periodBad.length > 0 ? periodBad.join(" · ") : undefined}
        />
      </Body>
      <LeaveDialog guard={guard} />
    </>
  );
}
