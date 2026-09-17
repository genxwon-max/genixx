"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { CatalogRound } from "@/lib/catalogRounds";
import { dotDate, evalName, trackLabel, type TrackId } from "@/lib/examCatalog";
import { spendTicket, ticketsLeft, usedInRound, useWallet, type Wallet } from "@/lib/ticketStore";
import { btnBox, btnBoxGhost, eyebrow } from "./ui";

/**
 * 「접수하기」 탭의 카드 버튼 — 무엇을 누를 수 있는지는 여기 한 곳에서 정한다.
 */
export type ApplyAction =
  /** 이미 접수한 평가 — 응시하기 탭으로 보낸다 */
  | { kind: "done"; label: string }
  /** 응시권을 쓰고 접수한다 */
  | { kind: "apply"; label: string }
  | { kind: "blocked"; label: string }
  /** 로그인하지 않은 사람 — 접수 대신 무료 체험 창을 연다 */
  | { kind: "try"; label: string; href: string };

export function applyAction(
  round: CatalogRound,
  track: TrackId,
  wallet: Wallet,
  asGuardian: boolean,
): ApplyAction {
  const used = usedInRound(wallet, round.id);
  if (used?.track === track) return { kind: "done", label: "응시하기로 이동" };
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
 * 「접수하기」를 누른 뒤의 흐름 — 응시권을 쓸지 묻고, 접수가 끝나면 응시하기 탭으로
 * 갈 길을 연다. 남은 응시권이 없으면 묻는 대신 없다고 알린다.
 */
export function useApplyFlow(studentId: string) {
  const wallet = useWallet(studentId);
  const [pending, setPending] = useState<{ round: CatalogRound; track: TrackId } | null>(null);
  const [applied, setApplied] = useState<{ round: CatalogRound; track: TrackId } | null>(null);

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
          응시하기 탭에서 과목을 하나씩 응시할 수 있습니다.
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
  } else if (pending && left <= 0) {
    dialog = (
      <ExamDialog title="응시권이 없습니다" eyebrowText="접수 확인" onClose={close}>
        <p className="text-[14px] leading-relaxed text-soft-muted">
          남은 응시권이 없어 접수할 수 없습니다. 보호자께 응시권을 요청해 주세요.
        </p>
        <div className="mt-6 flex justify-end">
          <button type="button" data-autofocus onClick={close} className={btnBox}>
            확인
          </button>
        </div>
      </ExamDialog>
    );
  } else if (pending) {
    dialog = (
      <ExamDialog title="이 평가를 접수할까요?" eyebrowText="접수 확인" onClose={close}>
        <Summary round={pending.round} track={pending.track} />

        <dl className="mt-4 flex items-center justify-between rounded-[4px] border border-soft-line px-5 py-3.5 text-[14px]">
          <dt className="font-semibold text-soft-ink">사용할 응시권</dt>
          <dd className="tabular-nums text-soft-muted">
            1매 <span className="text-soft-muted">(남은 응시권 {left}매)</span>
          </dd>
        </dl>

        <ul className="mt-4 space-y-1 text-[13px] leading-relaxed text-soft-muted">
          <li>
            · 같은 기간에 열리는 평가는 하나만 접수할 수 있습니다. 접수한 뒤에는 바꿀 수 없습니다.
          </li>
          <li>· 접수한 평가는 응시하기 탭에서 과목별로 따로 응시합니다.</li>
        </ul>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={close} className={btnBoxGhost}>
            취소
          </button>
          <button
            type="button"
            data-autofocus
            onClick={() => {
              const ok = spendTicket(studentId, pending.round.id, pending.track);
              setPending(null);
              if (ok) setApplied(pending);
            }}
            className={btnBox}
          >
            접수하기
          </button>
        </div>
      </ExamDialog>
    );
  }

  return { wallet, begin, dialog };
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
