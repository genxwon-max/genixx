"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { CatalogRound } from "@/lib/catalogRounds";
import { FREE_TOTAL, PAID_COUNT, subjects } from "@/lib/exam";
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
  /** 접수 창을 연다 — 무료시험인지 유료시험인지는 그 창에서 고른다 */
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
 * 「접수하기」를 누른 뒤의 흐름 — **갈래를 고르고**, 접수가 끝나면 응시하기 탭으로 갈 길을 연다.
 *
 * 갈래 고르개를 목록에 두지 않고 이 창에 둔 까닭은 둘이 무엇이 다른지 설명할 자리가 필요해
 * 서다. 목록 칸에 「무료」·「유료」 두 버튼을 세우면 아이는 문항 수도 값도 모른 채 누른다.
 *
 *   무료시험  응시권이 들지 않는다. 20문항.
 *   유료시험  응시권 한 매를 쓴다. 편성 문항 수(수 20 · 과 20 · 국 10)까지 열린다.
 *
 * 무료로 접수해 둔 평가를 유료로 올리는 일도 이 창에서 한다(upgrade). 그때 무료 칸은 이미
 * 접수한 것이라 고를 수 없고, 답과 제출 기록은 그대로 남는다.
 */
export function useApplyFlow(studentId: string) {
  const wallet = useWallet(studentId);
  const [pending, setPending] = useState<{
    round: CatalogRound;
    track: TrackId;
    /** 무료로 이미 접수한 평가를 올리는 길인가 */
    upgrade: boolean;
  } | null>(null);
  const [applied, setApplied] = useState<{
    round: CatalogRound;
    track: TrackId;
    tier: UseTier;
  } | null>(null);
  /* 창 안에서 고르는 갈래. 무료로 접수해 둔 평가를 올리러 왔으면 유료만 남는다 */
  const [pick, setPick] = useState<UseTier>("free");

  const begin = (round: CatalogRound, track: TrackId, upgrade = false) => {
    setPick(upgrade ? "paid" : "free");
    setPending({ round, track, upgrade });
  };
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
            ? `무료시험으로 접수했습니다. 응시하기 탭에서 과목을 하나씩 ${FREE_TOTAL}문항까지 응시할 수 있습니다.`
            : "유료시험으로 접수했습니다. 응시하기 탭에서 과목을 하나씩 응시할 수 있습니다."}
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
    /* 응시권이 없으면 유료 칸을 잠근다. 창을 아예 안 열지는 않는다 — 무료시험은 볼 수 있다 */
    const paidBlocked = left <= 0;
    const confirm = () => {
      const { round, track } = pending;
      const ok =
        pick === "paid" ? spendTicket(studentId, round.id, track) : applyFree(studentId, round.id, track);
      setPending(null);
      if (!ok) return;
      if (pick === "paid") raiseTier(studentId, "paid");
      setApplied({ round, track, tier: pick });
    };

    dialog = (
      <ExamDialog
        title={pending.upgrade ? "유료시험으로 올릴까요?" : "이 평가를 접수할까요?"}
        eyebrowText="접수 확인"
        onClose={close}
      >
        <Summary round={pending.round} track={pending.track} />

        <p className="mt-4 text-[13px] font-bold text-soft-ink">접수할 갈래를 고르세요</p>
        <ul className="mt-2 grid gap-2">
          <TierChoice
            on={pick === "free"}
            disabled={pending.upgrade}
            onPick={() => setPick("free")}
            title="무료시험"
            cost="응시권 0매"
            desc={`세 과목을 더해 ${FREE_TOTAL}문항. 결제 없이 응시하고 요약 리포트를 받습니다.`}
            note={pending.upgrade ? "이미 무료시험으로 접수했습니다" : undefined}
          />
          <TierChoice
            on={pick === "paid"}
            disabled={paidBlocked}
            onPick={() => setPick("paid")}
            title="유료시험"
            cost={`응시권 1매 (남은 응시권 ${left}매)`}
            desc={`${subjects.map((x) => `${x.short} ${PAID_COUNT[x.id]}`).join(" · ")}문항. 정밀 리포트와 전문가 해석으로 이어집니다.`}
            note={paidBlocked ? "남은 응시권이 없습니다. 보호자께 요청해 주세요" : undefined}
          />
        </ul>

        <ul className="mt-4 space-y-1 text-[13px] leading-relaxed text-soft-muted">
          <li>
            · 같은 기간에 열리는 평가는 하나만 접수할 수 있습니다. 학년은 접수한 뒤 바꿀 수
            없습니다.
          </li>
          <li>· 접수한 평가는 응시하기 탭에서 과목별로 따로 응시합니다.</li>
          <li>· 무료시험으로 먼저 보고 나중에 유료시험으로 올릴 수 있습니다. 답은 그대로 남습니다.</li>
        </ul>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={close} className={btnBoxGhost}>
            취소
          </button>
          <button
            type="button"
            data-autofocus
            onClick={confirm}
            aria-disabled={pick === "paid" && paidBlocked}
            disabled={pick === "paid" && paidBlocked}
            className={`${btnBox} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {pick === "free" ? "무료시험 접수하기" : "유료시험 접수하기"}
          </button>
        </div>
      </ExamDialog>
    );
  }

  return { wallet, begin, dialog };
}

/** 갈래 한 칸 — 이름 · 드는 응시권 · 무엇이 열리는지 */
function TierChoice({
  on,
  disabled,
  onPick,
  title,
  cost,
  desc,
  note,
}: {
  on: boolean;
  disabled?: boolean;
  onPick: () => void;
  title: string;
  cost: string;
  desc: string;
  /** 고를 수 없는 까닭 — 잠긴 칸에만 적는다 */
  note?: string;
}) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={on}
        disabled={disabled}
        onClick={onPick}
        className={`w-full rounded-[4px] border px-5 py-3.5 text-left transition-colors ${
          disabled
            ? "cursor-not-allowed border-soft-line bg-slate-50 text-slate-400"
            : on
              ? "border-soft-primary bg-soft-primary-soft"
              : "border-soft-line bg-white hover:border-soft-primary"
        }`}
      >
        <span className="flex items-baseline justify-between gap-3">
          <span className={`text-[15px] font-bold ${disabled ? "" : "text-soft-ink"}`}>{title}</span>
          <span className="shrink-0 text-[12px] tabular-nums">{cost}</span>
        </span>
        <span className="mt-1 block text-[13px] leading-relaxed text-soft-muted">{desc}</span>
        {note && <span className="mt-1 block text-[12px] text-amber-700">{note}</span>}
      </button>
    </li>
  );
}

function Summary({ round, track }: { round: CatalogRound; track: TrackId }) {
  return (
    <div className="rounded-[4px] border border-soft-line bg-slate-50 px-5 py-4">
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
        className="w-full max-w-md rounded-md border border-soft-line bg-white px-7 py-6"
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
