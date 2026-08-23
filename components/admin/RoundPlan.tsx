"use client";

import { useState } from "react";
import Link from "next/link";
import { can, rounds, roundStates } from "@/lib/admin";
import { recordAction, useAdminPrefs } from "@/lib/adminStore";
import { createForm, formPoints, useForms } from "@/lib/formStore";
import { useItems } from "@/lib/itemStore";
import {
  closeRound,
  finishRound,
  openChecks,
  openRound,
  planActions,
  planOf,
  reopenRound,
  slotsOf,
  usePlans,
  type PlanAction,
  type PlanSlot,
} from "@/lib/roundPlanStore";
import { FormEditor } from "./FormBuilder";
import RoundSwitch from "./RoundSwitch";
import { Badge, Callout, CountStrip } from "./Parts";
import * as a from "./ui";

/**
 * 회차 편성 (ADM-05-4).
 *
 * 이 화면이 답하는 물음은 둘뿐이다 — **이 회차에 무엇이 나가는가**, 그리고 **지금
 * 열어도 되는가.**
 *
 * 편성판은 과목 × 학년군 여섯 칸이다. 표가 아니라 판으로 둔 까닭은, 여기서 세는
 * 것이 줄이 아니라 「빈 칸이 어디인가」이기 때문이다. 표로 세우면 없는 칸은 줄이
 * 아예 나오지 않아 눈에 걸리지 않는다.
 *
 * 문항을 고르는 판은 검사지 조립(ADM-04-3)에서 쓰던 것을 그대로 가져다 쓴다
 * (FormEditor). 같은 일을 두 벌 만들면 한쪽에만 고쳐지는 날이 온다. 다른 것은 들어
 * 오는 길뿐이다 — 저기서는 검사지에서 회차를 고르고, 여기서는 회차에서 칸을 고른다.
 *
 * ── 처음 이 화면을 여는 사람에게 ──
 *
 * 판만 여섯 칸 깔아 두었더니, 이 콘솔을 처음 여는 사람은 **어디부터 눌러야 하는지**
 * 알 수 없었다. 「아직 열 수 없습니다 — 2건」처럼 막는 까닭만 적어 두는 것은 이미
 * 순서를 아는 사람에게나 쓸모가 있다.
 *
 * 그래서 맨 위에 차례를 세운다 — **① 검사지 짜기 → ② 확정 → ③ 회차 열기.** 세
 * 걸음이 지금 어디까지 왔는지 숫자로 보이고, 그 아래 「지금 할 일」 한 줄이 **다음
 * 한 가지**를 이름으로 부르며 그 자리로 가는 단추를 든다. 할 일이 여럿이어도 한
 * 번에 하나만 내민다 — 셋을 함께 늘어놓으면 그중 무엇이 먼저인지 다시 사람이
 * 골라야 한다.
 *
 * 막는 까닭을 따로 적던 판(Callout)은 걷었다. 그 셋은 모두 「지금 할 일」의 갈래로
 * 들어가 있어서, 남겨 두면 같은 말을 두 번 하는 자리가 된다.
 */
export default function RoundPlan({ roundId }: { roundId: string }) {
  const forms = useForms();
  const items = useItems();
  const plans = usePlans();
  const prefs = useAdminPrefs();

  const [openKey, setOpenKey] = useState<string | null>(null);
  const [ask, setAsk] = useState<PlanAction | null>(null);

  const round = rounds.find((r) => r.id === roundId) ?? rounds[0];
  const plan = planOf(plans, round.id);
  const slots = slotsOf(round.id, forms, items);
  const checks = openChecks(round.id, slots, plans);
  const blocks = checks.filter((c) => c.tone === "block");
  const warns = checks.filter((c) => c.tone === "warn");

  const by = prefs.staffName || "운영자";
  const may = can(prefs.role, "round.manage");

  const built = slots.filter((s) => s.form);
  const confirmed = slots.filter((s) => s.form?.state === "confirmed");
  const going = confirmed.reduce((n, s) => n + s.picked.length, 0);

  const slot = slots.find((s) => s.key === openKey) ?? null;

  const make = (s: PlanSlot) => {
    createForm(round.id, s.subject, s.band, by);
    setOpenKey(s.key);
  };

  /* ── 차례 ──
     지금 어디까지 왔는지. 셋째 걸음은 열고 나면 「언제 열었나」로 바뀐다. */
  const steps = [
    {
      name: "검사지 짜기",
      note: built.length > 0 ? `${built.length}벌 짰습니다` : "아직 없습니다",
      done: built.length > 0,
    },
    {
      name: "확정",
      note: built.length === 0 ? "검사지를 짠 뒤에" : `${confirmed.length} / ${built.length}벌`,
      done: built.length > 0 && confirmed.length === built.length,
    },
    {
      name: "회차 열기",
      note:
        plan.state === "draft"
          ? blocks.length === 0
            ? "이제 열 수 있습니다"
            : "아직"
          : (plan.openedAt ?? "열림"),
      done: plan.state !== "draft",
    },
  ];
  const at = steps.findIndex((x) => !x.done);

  /* ── 지금 할 일 ──
     막는 까닭 셋(검사지 없음 · 초안 남음 · 다른 회차 열림)이 그대로 갈래가 된다.
     여럿이 걸려 있어도 맨 앞의 하나만 내민다. */
  const otherOpen = rounds.find((r) => r.id !== round.id && planOf(plans, r.id).state === "open");
  const emptyForm = slots.find((x) => x.form && x.picked.length === 0);
  const draftForm = slots.find((x) => x.form?.state === "draft" && x.picked.length > 0);
  const startable = slots.find((x) => !x.form && x.pool > 0);

  type Next = {
    text: string;
    label: string;
    go?: () => void;
    href?: string;
    danger?: boolean;
    also?: { label: string; action: PlanAction };
  };

  const next: Next | null =
    !may || plan.state === "closed"
      ? null
      : plan.state === "grading"
        ? {
            text: "채점과 리포트 발행이 끝나면 회차를 종료합니다.",
            label: "회차 종료하기",
            go: () => setAsk("finish"),
            also: { label: "응시 다시 열기", action: "reopen" },
          }
        : plan.state === "open"
          ? {
              text: "응시가 진행 중입니다. 응시 기간이 끝나면 마감하세요.",
              label: "응시 마감하기",
              go: () => setAsk("close"),
            }
          : built.length === 0
            ? startable
              ? {
                  text: `아직 짠 검사지가 없습니다. 「${startable.label}」부터 짜 보세요.`,
                  label: "이 칸 짜기",
                  go: () => make(startable),
                }
              : {
                  text: "담을 수 있는 승인 문항이 아직 없습니다. 문항을 쓰고 검수를 지나야 검사지를 짤 수 있습니다.",
                  label: "출제 워크벤치로",
                  href: "/admin/authoring",
                }
            : emptyForm
              ? {
                  text: `「${emptyForm.label}」 검사지가 비어 있습니다. 목록에서 넣을 문항을 체크해 담으세요.`,
                  label: "문항 고르기",
                  go: () => setOpenKey(emptyForm.key),
                }
              : draftForm
                ? {
                    text: `「${draftForm.label}」 검사지가 아직 초안입니다. 확인하고 확정하세요.`,
                    label: "검사지 열기",
                    go: () => setOpenKey(draftForm.key),
                  }
                : otherOpen
                  ? {
                      text: `${otherOpen.label}가 아직 열려 있습니다. 두 회차가 함께 열리면 응시자가 어느 회차를 푸는지 정해지지 않습니다.`,
                      label: "그 회차로 가기",
                      href: `/admin/rounds/exam?round=${otherOpen.id}`,
                    }
                  : {
                      text: "편성이 끝났습니다. 이제 회차를 열 수 있습니다.",
                      label: "회차 열기",
                      go: () => setAsk("open"),
                    };

  return (
    <>
      {/* 회차 고르개는 갈래 줄 아래다. 머리글에 붙이면 이 화면만 머리글이 두 줄이
          되어, 갈래를 옮길 때마다 갈래 줄이 위아래로 움직인다. */}
      <div className="mb-5 flex flex-wrap items-center gap-4">
        <RoundSwitch id={round.id} base="/admin/rounds/exam" />
        <Badge {...roundStates[plan.state]} />
      </div>

      {/* ── 차례와 지금 할 일 ──
          단추를 머리줄 오른쪽 끝에 두지 않는다. 눌러야 할 것과 눌러도 되는지를
          말하는 문장이 화면 양 끝으로 갈라져 있으면, 처음 온 사람은 둘을 잇지
          못하고 회색 단추만 몇 번 눌러 본다. */}
      <section className={`${a.panel} p-5`}>
        {/* 차례는 **아직 열지 않은 회차**에서만 편다. 이미 연 회차에 세워 두면
            「① 아직 없습니다 … ③ ✓ 열림」처럼 앞뒤가 맞지 않는 그림이 되고,
            처음 온 사람은 그것을 화면이 고장 난 것으로 읽는다. 연 회차에 남는 것은
            지금 할 일 한 줄뿐이다. */}
        {plan.state === "draft" && (
        <ol className="grid gap-3 sm:grid-cols-3">
          {steps.map((x, n) => {
            const here = n === at;
            return (
              <li
                key={x.name}
                aria-current={here ? "step" : undefined}
                className={`flex items-center gap-3 rounded-md border p-3 ${
                  x.done ? "border-emerald-300" : here ? "border-brand-900" : "border-exam-line"
                }`}
              >
                {/* 번호 동그라미 — 끝난 걸음은 갈매기표로 바뀐다. 색 하나로만
                    알리지 않으려고 모양도 함께 바꾼다. */}
                <span
                  aria-hidden
                  className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border adm-t-sm font-black ${
                    x.done
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : here
                        ? "border-brand-900 bg-brand-900 text-white"
                        : "border-exam-line bg-white text-exam-muted"
                  }`}
                >
                  {x.done ? "✓" : n + 1}
                </span>
                <span className="min-w-0">
                  <span
                    className={`block adm-t-md font-bold ${
                      here || x.done ? "text-exam-text" : "text-exam-muted"
                    }`}
                  >
                    {x.name}
                  </span>
                  <span className={`${a.hint} block tabular-nums`}>{x.note}</span>
                </span>
              </li>
            );
          })}
        </ol>
        )}

        {next && (
          <div
            className={`flex flex-wrap items-center justify-between gap-x-5 gap-y-3 ${
              plan.state === "draft" ? "mt-4 border-t border-exam-line pt-4" : ""
            }`}
          >
            <p className={a.bodyText}>
              <b className="text-exam-text">지금 할 일</b> — {next.text}
            </p>
            <span className="flex flex-wrap items-center gap-2">
              {next.also && (
                <button
                  type="button"
                  onClick={() => setAsk(next.also!.action)}
                  className={a.btnDanger}
                >
                  {next.also.label}
                </button>
              )}
              {next.href ? (
                <Link href={next.href} className={a.btnPrimary}>
                  {next.label}
                </Link>
              ) : (
                <button type="button" onClick={next.go} className={a.btnPrimary}>
                  {next.label}
                </button>
              )}
            </span>
          </div>
        )}
      </section>

      <div className="mt-5" />

      <CountStrip
        rows={[
          { label: "편성한 검사지", value: built.length, unit: "벌" },
          {
            label: "확정",
            value: confirmed.length,
            unit: "벌",
            tone: built.length > 0 && confirmed.length === built.length ? "good" : undefined,
          },
          { label: "이 회차에 나가는 문항", value: going, unit: "개" },
        ]}
      />

      {/* 막는 까닭은 「지금 할 일」이 이미 하나로 골라 말했다. 여기 남기는 것은
          막지 않지만 사람이 보고 넘어갈 것뿐이고, 아직 열지 않은 회차에서만 편다. */}
      {plan.state === "draft" && warns.length > 0 && (
        <div className="mt-5">
          <Callout tone="info" title={`짚고 넘어갈 것 — ${warns.length}건`}>
            <ul className="space-y-1">
              {warns.map((c) => (
                <li key={c.text}>· {c.text}</li>
              ))}
            </ul>
          </Callout>
        </div>
      )}

      {plan.state !== "draft" && plan.openedAt && (
        <p className={`${a.hint} mt-4`}>
          {plan.openedBy} 님이 {plan.openedAt}에 열었습니다
          {plan.closedAt && ` · ${plan.closedBy} 님이 ${plan.closedAt}에 응시를 마감했습니다`}
        </p>
      )}

      {/* ── 편성판 ── */}
      <div className="mt-7">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className={a.cardTitle}>편성판</h2>
          <p className={a.hint}>한 칸은 한 과목 · 한 학년군입니다. 비운 칸은 보지 않습니다.</p>
        </div>

        <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {slots.map((s) => (
            <SlotCard
              key={s.key}
              slot={s}
              open={s.key === openKey}
              may={may}
              onOpen={() => setOpenKey(s.key === openKey ? null : s.key)}
              onCreate={() => make(s)}
            />
          ))}
        </div>
      </div>

      {slot?.form && (
        <FormEditor
          form={slot.form}
          items={items}
          by={by}
          mayConfirm={can(prefs.role, "item.review")}
          onClose={() => setOpenKey(null)}
        />
      )}

      {/* ── 회차에 한 일 ── */}
      {plan.log.length > 0 && (
        <div className="mt-8 border-t border-exam-line pt-5">
          <p className={a.label}>이 회차에 한 일 {plan.log.length}건</p>
          <ul className="mt-2 space-y-1.5">
            {plan.log.map((l, n) => (
              <li key={n} className="adm-t-md text-exam-text">
                <span className={a.hint}>
                  {l.at} · {l.by} · {planActions[l.action]}
                </span>{" "}
                {l.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      {ask && (
        <PlanAsk
          action={ask}
          round={round.label}
          warns={ask === "open" ? warns.map((w) => w.text) : []}
          onClose={() => setAsk(null)}
          onDone={(text) => {
            const run = { open: openRound, close: closeRound, finish: finishRound, reopen: reopenRound };
            run[ask](round.id, by, text);
            recordAction(round.label, planActions[ask], text, by);
            setAsk(null);
          }}
        />
      )}
    </>
  );
}

/**
 * 편성판의 한 칸.
 *
 * 테두리 색으로만 알리지 않는다 — 상태 글자가 함께 바뀐다. 색만으로 「확정」과
 * 「초안」을 가르면 색을 못 보는 사람에게는 여섯 칸이 모두 같은 칸이 된다.
 */
function SlotCard({
  slot,
  open,
  may,
  onOpen,
  onCreate,
}: {
  slot: PlanSlot;
  open: boolean;
  may: boolean;
  onOpen: () => void;
  onCreate: () => void;
}) {
  const form = slot.form;
  const done = form?.state === "confirmed";
  const edge = !form
    ? "border-dashed border-exam-line"
    : done
      ? "border-emerald-300"
      : "border-amber-300";

  return (
    <div className={`rounded-md border p-4 ${edge} ${open ? "bg-exam-raised" : "bg-white"}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className={a.strongText}>{slot.label}</p>
        <span
          className={`${a.badge} ${
            !form ? "text-exam-muted" : done ? "text-emerald-700" : "text-amber-700"
          }`}
        >
          {!form ? "편성 안 함" : done ? "확정" : "초안"}
        </span>
      </div>

      {/* 「N / 10」으로 적지 않는다. 한 검사지의 문항 수는 정해져 있지 않고
          사람이 목록에서 골라 넣는 만큼이다(lib/formStore.ts). 붉게 두는 것은
          0건뿐이다 — 그것만이 확정을 막는 값이다. */}
      {form ? (
        <p className={`${a.hint} mt-2`}>
          문항{" "}
          <b className={slot.picked.length === 0 ? "font-bold text-rose-700" : "text-exam-text"}>
            {slot.picked.length}건
          </b>{" "}
          · 배점 {formPoints(slot.picked)}점 · 앵커 {slot.picked.filter((i) => i.anchor).length}건
        </p>
      ) : (
        <p className={`${a.hint} mt-2`}>
          {slot.pool === 0 ? (
            <span className="font-bold text-rose-700">담을 수 있는 승인 문항이 없습니다</span>
          ) : (
            `담을 수 있는 승인 문항 ${slot.pool}건`
          )}
        </p>
      )}

      <div className="mt-3">
        {form ? (
          <button type="button" onClick={onOpen} className={open ? a.btnRow : a.btnRowGhost}>
            {open ? "접기" : done ? "열어 보기" : "문항 고르기"}
          </button>
        ) : slot.pool === 0 ? (
          /* 담을 것이 없는 칸에 「짜기」만 두면 눌러서 빈 검사지를 만들고 거기서
             다시 막힌다. 막다른 자리에는 단추가 아니라 **문항이 어디서 오는지**와
             그리로 가는 문을 둔다. */
          <Link href="/admin/authoring" className={a.btnRowGhost}>
            출제 워크벤치로 →
          </Link>
        ) : (
          may && (
            <button type="button" onClick={onCreate} className={a.btnRowGhost}>
              이 칸 짜기
            </button>
          )
        )}
      </div>
    </div>
  );
}

/**
 * 회차를 열고 닫기 전에 한 번 묻는다.
 *
 * 넷 다 되돌리기 어렵다. 여는 순간 아이들 화면에 문항이 나가고, 마감하는 순간 그
 * 회차로는 더 시작할 수 없다. 무엇이 일어나는지 문장으로 적고 까닭을 받는다.
 */
const askCopy: Record<
  PlanAction,
  { title: string; body: string[]; hint: string; confirm: string; danger?: boolean }
> = {
  open: {
    title: "이 회차를 엽니다",
    body: [
      "확정한 검사지가 이 회차의 응시 문항이 됩니다. 담긴 순서 그대로 나갑니다.",
      "비워 둔 칸의 과목·학년군은 이번 회차에 응시하지 않습니다.",
      "연 사람과 시각이 기록에 남습니다.",
    ],
    hint: "예: 국어·수학 검사지 확정 확인함. 과학은 문항이 모자라 이번 회차에 보지 않기로 함",
    confirm: "회차 열기",
  },
  close: {
    title: "응시를 마감합니다",
    body: [
      "이 회차로는 더 응시를 시작할 수 없게 됩니다.",
      "회차가 채점중으로 넘어갑니다. 채점과 판정은 그대로 이어집니다.",
      "마감한 사람과 시각이 기록에 남습니다.",
    ],
    hint: "예: 응시 기간이 끝났고 미응시 12명은 다음 회차로 옮기기로 함",
    confirm: "응시 마감하기",
  },
  finish: {
    title: "이 회차를 종료합니다",
    body: [
      "채점과 리포트 발행이 끝났다는 뜻입니다.",
      "종료한 회차의 자료는 읽기만 합니다.",
      "종료한 사람과 시각이 기록에 남습니다.",
    ],
    hint: "예: 판정 확정 851건, 리포트 발행 851건으로 모두 끝났습니다",
    confirm: "회차 종료하기",
  },
  reopen: {
    title: "마감한 응시를 다시 엽니다",
    body: [
      "마감 뒤에 들어온 응시와 그 전 응시가 한 회차에 섞입니다.",
      "채점 중이던 자료는 그대로 두고 응시만 다시 열립니다.",
      "되돌린 사람과 까닭이 기록에 남습니다.",
    ],
    hint: "예: 기관 두 곳이 접속 장애로 응시하지 못해 사흘 더 엽니다",
    confirm: "다시 열기",
    danger: true,
  },
};

function PlanAsk({
  action,
  round,
  warns,
  onDone,
  onClose,
}: {
  action: PlanAction;
  round: string;
  warns: string[];
  onDone: (text: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const short = text.trim().length < 10;
  const copy = askCopy[action];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-ask-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-exam-line bg-white p-6 sm:p-8">
        <h2 id="plan-ask-title" className={a.pageTitle}>
          {copy.title}
        </h2>
        <p className={`${a.bodyText} mt-2.5`}>{round}</p>

        <ul className={`${a.bodyText} mt-3 list-disc space-y-1.5 pl-5`}>
          {copy.body.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>

        {warns.length > 0 && (
          <div className="mt-5">
            <Callout tone="warn" title="짚고 넘어갈 것">
              <ul className="space-y-1">
                {warns.map((w) => (
                  <li key={w}>· {w}</li>
                ))}
              </ul>
            </Callout>
          </div>
        )}

        <div className="mt-5">
          <label htmlFor="plan-ask-text" className={a.label}>
            왜 지금인지 적어 주세요
          </label>
          <p className={`${a.hint} mt-1`}>{copy.hint}</p>
          <textarea
            id="plan-ask-text"
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="10자 이상 적어 주세요"
            className={`${a.input} mt-2 resize-none`}
          />
          <p className={`mt-1.5 adm-t-sm font-bold ${short ? "text-rose-700" : "text-emerald-700"}`}>
            {short ? `${10 - text.trim().length}자 더 적어 주세요` : "충분히 입력되었습니다"}
          </p>
        </div>

        <div className="mt-7 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={short}
            onClick={() => onDone(text.trim())}
            className={short ? a.btnDisabled : copy.danger ? a.btnDanger : a.btnPrimary}
          >
            기록을 남기고 {copy.confirm}
          </button>
          <button type="button" onClick={onClose} className={a.btnGhost}>
            그만두기
          </button>
        </div>
      </div>
    </div>
  );
}
