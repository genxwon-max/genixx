"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { CatalogRound } from "@/lib/catalogRounds";
import { FREE_COUNT, FREE_TOTAL, PAID_COUNT, subjects } from "@/lib/exam";
import { dotDate, evalName, trackLabel, type TrackId } from "@/lib/examCatalog";
import { raiseTier } from "@/lib/examStore";
import {
  applyFree,
  spendTicket,
  ticketsLeft,
  usedInRound,
  useWallet,
  type UseTier,
  type Wallet,
} from "@/lib/ticketStore";
import { btnBox, btnBoxGhost, eyebrow } from "./ui";

/**
 * 「접수하기」 탭의 카드 버튼 — 무엇을 누를 수 있는지는 여기 한 곳에서 정한다.
 */
export type ApplyAction =
  /** 이미 접수한 평가 — 응시하기 탭으로 보낸다. tier는 어느 갈래로 접수했는지 */
  | { kind: "done"; label: string; tier: UseTier }
  /** 접수 창을 연다 — 갈래는 고르는 것이 아니라 응시권이 있는지가 정한다 */
  | { kind: "apply"; label: string }
  | { kind: "blocked"; label: string }
  /** 로그인하지 않은 사람 — 접수 대신 셋트 창을 연다 */
  | { kind: "try"; label: string; href: string };

export function applyAction(
  round: CatalogRound,
  track: TrackId,
  wallet: Wallet,
  asGuardian: boolean,
): ApplyAction {
  const used = usedInRound(wallet, round.id);
  if (used?.track === track) {
    /* 무료로 접수해 둔 평가는 유료로 올릴 길을 남긴다 — 응시하기로만 보내면 결제할 자리가 없다 */
    return used.tier === "free"
      ? { kind: "done", label: "응시하기로 이동", tier: "free" }
      : { kind: "done", label: "응시하기로 이동", tier: "paid" };
  }
  if (round.availability === "ended") return { kind: "blocked", label: "접수 마감" };
  if (round.availability === "soon") {
    return { kind: "blocked", label: `${dotDate(round.opensOn).slice(5)} 접수 시작` };
  }
  /* 같은 시기의 평가는 하나만 — 응시 기록이 학생마다 한 벌이다(lib/ticketStore.ts) */
  if (used) {
    return { kind: "blocked", label: `${evalName(round.id, used.track, round.label)} 접수함` };
  }
  if (round.subjects.length === 0) return { kind: "blocked", label: "준비 중인 평가입니다" };
  /* 보호자는 설문만 한다. 응시권을 쓰는 것은 시험을 보는 학생이다 */
  if (asGuardian) return { kind: "blocked", label: "학생 계정에서 접수합니다" };
  return { kind: "apply", label: "접수하기" };
}

/**
 * 「접수하기」를 누른 뒤의 흐름 — 접수하고, 끝나면 응시하기 탭으로 갈 길을 연다.
 *
 * ── 갈래를 묻지 않는다 ──
 * 예전에는 이 창에서 「무료시험 / 유료시험」 두 칸을 세워 고르게 했다. 접수하려던 사람이
 * 문항 수와 응시권 매수를 견주는 자리에 먼저 서게 되고, 골라 놓고도 무엇을 고른 것인지
 * 응시할 때 다시 기억해 내야 한다. 고를 것이 아니라 **이미 정해져 있는 것**이다 —
 *
 *   응시권이 없으면   무료시험으로 접수한다. 20문항을 한 번에 이어서 푼다.
 *   응시권이 있으면   한 매를 써서 유료시험으로 접수한다. 과목마다 따로 응시한다.
 *
 * 그래서 창은 묻는 대신 **어느 갈래로 접수되는지와 그 까닭을 적어 둔다**.
 *
 * ── 올리는 길도 두지 않는다 ──
 * 한때는 무료로 접수해 둔 평가를 이 창에서 유료로 올릴 수 있었다(「유료시험으로 올릴까요?」).
 * 갈래를 고르게 하지 않기로 한 뒤에는 그 길이 갈래를 두 번 묻는 꼴이 된다 — 접수할 때 한
 * 번, 목록에 돌아와서 또 한 번. 갈래는 접수하는 순간 결제 여부가 정하고, 그것으로 끝이다.
 */
export function useApplyFlow(studentId: string) {
  const wallet = useWallet(studentId);
  const [pending, setPending] = useState<{ round: CatalogRound; track: TrackId } | null>(null);
  const [applied, setApplied] = useState<{
    round: CatalogRound;
    track: TrackId;
    tier: UseTier;
  } | null>(null);

  const begin = (round: CatalogRound, track: TrackId) => setPending({ round, track });
  const close = () => {
    setPending(null);
    setApplied(null);
  };

  const left = ticketsLeft(wallet);

  let dialog: ReactNode = null;
  if (applied) {
    dialog = (
      <ExamDialog title="접수가 완료되었습니다" eyebrowText="접수 완료" onClose={close}>
        <Summary round={applied.round} track={applied.track} />
        <p className="mt-4 text-[14px] leading-relaxed text-soft-muted">
          {applied.tier === "free"
            ? `응시하기 탭에서 ${FREE_TOTAL}문항을 한 번에 이어서 응시합니다.`
            : "응시하기 탭에서 과목을 하나씩 응시합니다. 응시권 한 매를 썼습니다."}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={close} className={btnBoxGhost}>
            닫기
          </button>
          <Link href="/exam" data-autofocus className={btnBox}>
            응시하기로 이동
          </Link>
        </div>
      </ExamDialog>
    );
  } else if (pending) {
    /* 갈래는 고르는 것이 아니라 결제한 응시권이 있는지가 정한다 */
    const tier: UseTier = left > 0 ? "paid" : "free";
    const confirm = () => {
      const { round, track } = pending;
      const ok =
        tier === "paid"
          ? spendTicket(studentId, round.id, track)
          : applyFree(studentId, round.id, track);
      setPending(null);
      if (!ok) return;
      if (tier === "paid") raiseTier(studentId, "paid");
      setApplied({ round, track, tier });
    };

    dialog = (
      <ExamDialog title="이 평가를 접수할까요?" eyebrowText="접수 확인" onClose={close}>
        <Summary round={pending.round} track={pending.track} />

        <TierNote
          tier={tier}
          left={left}
          counts={subjects
            .map((x) => `${x.short} ${(tier === "paid" ? PAID_COUNT : FREE_COUNT)[x.id]}`)
            .join(" · ")}
          reason={
            tier === "paid"
              ? "결제한 응시권이 있어 유료시험으로 접수합니다."
              : "결제한 응시권이 없어 무료시험으로 접수합니다."
          }
        />

        <ul className="mt-4 space-y-1 text-[13px] leading-relaxed text-soft-muted">
          <li>
            · 같은 기간에 열리는 평가는 하나만 접수할 수 있습니다. 학년은 접수한 뒤 바꿀 수
            없습니다.
          </li>
          {tier === "free" && (
            <li>· 응시권은 보호자가 결제해 넘겨줍니다. 결제한 뒤에 접수하면 유료시험이 됩니다.</li>
          )}
        </ul>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={close} className={btnBoxGhost}>
            취소
          </button>
          <button type="button" data-autofocus onClick={confirm} className={btnBox}>
            접수하기
          </button>
        </div>
      </ExamDialog>
    );
  }

  return { wallet, begin, dialog };
}

/**
 * 어느 갈래로 접수되는지 — 고르개가 아니라 **적어 두는 칸**이다.
 *
 * 고를 것이 없으니 누를 것도 없다. 대신 왜 이 갈래인지(응시권이 있는지)를 한 줄로 적는다.
 * 그것을 빼면 같은 버튼을 눌렀는데 어떤 날은 20문항이, 어떤 날은 50문항이 열린다.
 */
function TierNote({
  tier,
  left,
  counts,
  reason,
}: {
  tier: UseTier;
  /** 남은 응시권 */
  left: number;
  /** 「국 4 · 수 8 · 과 8」 */
  counts: string;
  /** 왜 이 갈래인가 — 고를 것이 없으니 까닭은 적어 두어야 한다 */
  reason: string;
}) {
  const paid = tier === "paid";

  return (
    <div className="mt-4 rounded-[2px] border border-soft-line bg-slate-50 px-5 py-4">
      <p className="flex items-baseline justify-between gap-3">
        <span className="text-[15px] font-bold text-soft-ink">
          {paid ? "유료시험" : "무료시험"}
        </span>
        <span className="shrink-0 text-[12px] tabular-nums text-soft-muted">
          {paid ? `응시권 1매 (남은 응시권 ${left}매)` : "응시권 없이 응시"}
        </span>
      </p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-soft-muted">
        {paid
          ? `${counts}문항을 과목마다 따로 응시합니다. 정밀 리포트와 전문가 해석으로 이어집니다.`
          : `${counts}문항을 한 번에 이어서 풉니다. 결제 없이 응시하고 요약 리포트를 받습니다.`}
      </p>
      <p className="mt-2 text-[12px] leading-relaxed text-soft-ink">{reason}</p>
    </div>
  );
}

function Summary({ round, track }: { round: CatalogRound; track: TrackId }) {
  return (
    <div className="rounded-[2px] border border-soft-line bg-slate-50 px-5 py-4">
      <p className="text-[12px] font-semibold text-soft-muted">{trackLabel(track)}</p>
      <p className="mt-1 text-[16px] font-bold text-soft-ink">
        TalentMe {evalName(round.id, track, round.label)}
      </p>
      <p className="mt-2 text-[13px] text-soft-muted">
        {round.subjects.map((s) => `${s.name} ${s.minutes}분`).join(" · ")}
      </p>
    </div>
  );
}

/**
 * 응시 존 확인 창 — Esc와 바깥 누르기로 닫히고, 뜰 때 data-autofocus 버튼으로 초점을 옮긴다.
 *
 * 접수 확인 → 접수 완료로 창이 바뀌면(제목이 바뀌면) 초점도 새 창의 버튼으로 다시 옮긴다.
 */
function ExamDialog({
  title,
  eyebrowText,
  onClose,
  children,
}: {
  title: string;
  eyebrowText: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    box.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    return () => before?.focus?.();
  }, [title]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-soft-ink/40 p-5"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby="exam-dialog-title"
        className="w-full max-w-md rounded-[2px] border border-soft-line bg-white px-7 py-6"
      >
        <p className={eyebrow}>{eyebrowText}</p>
        <h2 id="exam-dialog-title" className="mt-2 text-[19px] font-bold text-soft-ink">
          {title}
        </h2>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
