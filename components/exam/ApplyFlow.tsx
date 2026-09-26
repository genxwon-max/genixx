"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { CatalogRound } from "@/lib/catalogRounds";
import {
  FREE_COUNT,
  FREE_TOTAL,
  PAID_COUNT,
  PAID_TOTAL,
  subjects,
  tierOf,
} from "@/lib/exam";
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
import { CloseIcon } from "@/components/Icons";
import { btnBox, btnBoxGhost } from "./ui";

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
      <ExamDialog
        title="접수 완료"
        onClose={close}
        footer={
          <>
            <button type="button" onClick={close} className={btnBoxGhost}>
              닫기
            </button>
            <Link href="/exam" data-autofocus className={btnBox}>
              응시하기로 이동
            </Link>
          </>
        }
      >
        <Summary round={applied.round} track={applied.track} />
        <p className="mt-4 text-[14px] leading-relaxed text-soft-ink">
          {applied.tier === "free"
            ? `${tierOf("free").label}으로 접수했습니다. 응시하기 탭에서 ${FREE_TOTAL}문항을 한 번에 이어서 응시합니다.`
            : `${tierOf("paid").label}으로 접수했습니다. 응시하기 탭에서 과목을 하나씩 응시합니다.`}
        </p>
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

    const paid = tier === "paid";
    const counts = subjects
      .map((x) => `${x.short} ${(paid ? PAID_COUNT : FREE_COUNT)[x.id]}`)
      .join(" · ");

    dialog = (
      <ExamDialog
        title="접수 확인"
        onClose={close}
        footer={
          <>
            <button type="button" onClick={close} className={btnBoxGhost}>
              취소
            </button>
            <button type="button" data-autofocus onClick={confirm} className={btnBox}>
              접수하기
            </button>
          </>
        }
      >
        <Summary round={pending.round} track={pending.track} />

        {/* 접수되는 내용 — 문장으로 늘어놓지 않고 항목으로 세운다. 접수 확인은 읽는 글이
            아니라 **맞는지 훑는 표**라, 무엇이 어떤 값인지 눈이 왼쪽에서 찾을 수 있어야 한다 */}
        <dl className="mt-5 border-y border-soft-line">
          <Row t="응시 갈래">
            <span className="inline-flex items-center rounded-[2px] bg-soft-primary-soft px-2 py-0.5 text-[13px] font-bold text-soft-primary">
              {tierOf(tier).label}
            </span>
          </Row>
          <Row t="문항">
            {counts}
            <span className="ml-1.5 text-soft-muted">· 모두 {paid ? PAID_TOTAL : FREE_TOTAL}문항</span>
          </Row>
          <Row t="응시 방식">
            {paid ? "과목마다 따로 응시" : "세 과목을 한 번에 이어서 응시"}
          </Row>
          <Row t="응시권">
            {paid ? (
              <>
                1매 사용
                <span className="ml-1.5 text-soft-muted">· 쓰고 나면 {left - 1}매 남음</span>
              </>
            ) : (
              <>
                쓰지 않음
                <span className="ml-1.5 text-soft-muted">· 결제 없이 응시합니다</span>
              </>
            )}
          </Row>
        </dl>

        {/* 왜 이 갈래인지 — 고르는 자리를 없앤 만큼 까닭은 적어 두어야 한다 */}
        <p className="mt-3.5 text-[13px] leading-relaxed text-soft-ink">
          {paid
            ? "결제한 응시권이 있어 유료시험으로 접수합니다. 정밀 리포트와 전문가 해석으로 이어집니다."
            : "결제한 응시권이 없어 무료시험으로 접수합니다. 요약 리포트를 받습니다."}
        </p>

        <ul className="mt-3 space-y-1 text-[13px] leading-relaxed text-soft-muted">
          <li>· 같은 기간에 열리는 평가는 하나만 접수할 수 있습니다.</li>
          <li>· 학년은 접수한 뒤 바꿀 수 없습니다.</li>
          {!paid && (
            <li>· 응시권은 보호자가 결제해 넘겨줍니다. 결제한 뒤에 접수하면 유료시험이 됩니다.</li>
          )}
        </ul>
      </ExamDialog>
    );
  }

  return { wallet, begin, dialog };
}

/** 접수 내용 한 줄 — 왼쪽에 무엇, 오른쪽에 값 */
function Row({ t, children }: { t: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline gap-4 border-b border-slate-100 py-2.5 last:border-b-0">
      <dt className="w-[4.5rem] shrink-0 text-[12.5px] font-semibold text-soft-muted">{t}</dt>
      <dd className="min-w-0 flex-1 text-[13.5px] font-medium text-soft-ink">{children}</dd>
    </div>
  );
}

/**
 * 무슨 평가를 접수하는지 — 창의 첫 줄.
 *
 * 회색 상자에 넣지 않는다. 아래 표도 회색 상자였을 때는 같은 덩이가 둘 겹쳐 서서, 어느
 * 쪽이 평가 이름이고 어느 쪽이 접수 내용인지 한 번 더 읽어야 했다. 여기는 제목처럼 서고,
 * 아래가 표다.
 */
function Summary({ round, track }: { round: CatalogRound; track: TrackId }) {
  return (
    <div>
      <p className="text-[12px] font-semibold text-soft-primary">{trackLabel(track)}</p>
      <p className="mt-1 text-[18px] font-bold leading-snug text-soft-ink">
        TalentMe {evalName(round.id, track, round.label)}
      </p>
      <p className="mt-1.5 text-[13px] text-soft-muted">
        {round.subjects.map((s) => `${s.name} ${s.minutes}분`).join(" · ")}
      </p>
    </div>
  );
}

/**
 * 응시 존 확인 창.
 *
 * ── 창처럼 생겼어야 한다 ──
 * 예전에는 흰 상자 안에 작은 라벨 · 제목 · 본문 · 단추가 차례로 얹혀 있을 뿐이었다.
 * 테두리 하나가 전부라 화면 위에 글 뭉치가 떠 있는 것처럼 보이고, 어디까지가 이 창인지도
 * 눈으로 끊기지 않는다. 창이면 창의 부분을 갖춘다 —
 *
 *   머리띠  제목과 ✕. 같은 색 띠가 「여기부터 이 창」이라고 말한다
 *   본문    길면 여기만 구른다. 창이 화면 밖으로 자라지 않는다
 *   발치    단추가 서는 띠. 배경을 한 톤 깔아 본문과 가른다
 *
 * 이것은 공지 판(components/site/NoticePopup.tsx)이 쓰는 짜임 그대로다. 한 제품 안에서
 * 창이 두 가지 모양이면 둘 중 하나는 남의 것처럼 보인다.
 *
 * 좁은 화면에서는 아래에 붙여 세운다(items-end). 손이 닿는 곳이 화면 아래쪽이라, 가운데
 * 띄운 창은 단추까지 손을 올려야 한다.
 *
 * 닫는 길은 ✕ · 바깥 누르기 · Esc 셋이다. 뜰 때 data-autofocus로 초점을 옮기고, 접수
 * 확인 → 접수 완료로 창이 바뀌면(제목이 바뀌면) 초점도 새 창의 단추로 다시 옮긴다.
 * Tab은 창 안에서 돈다 — 뒤에 깔린 목록으로 초점이 새어 나가면 창이 모달이 아니게 된다.
 */
function ExamDialog({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** 발치 띠에 서는 단추들 */
  footer: ReactNode;
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-soft-ink/45 p-0 sm:items-center sm:p-5"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby="exam-dialog-title"
        onKeyDown={(e) => {
          if (e.key !== "Tab") return;
          const able = box.current?.querySelectorAll<HTMLElement>(
            "a[href], button:not([disabled])",
          );
          if (!able?.length) return;
          const first = able[0];
          const last = able[able.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }}
        className="w-full max-w-[30rem] overflow-hidden rounded-t-[10px] bg-white shadow-float sm:rounded-[var(--ui-r-card)]"
      >
        <div className="flex items-center justify-between gap-3 bg-soft-primary py-2.5 pl-6 pr-2.5 text-white">
          <h2 id="exam-dialog-title" className="text-[15px] font-bold tracking-tight">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="창 닫기"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[2px] text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[calc(100dvh-16rem)] overflow-y-auto px-6 py-6 sm:max-h-[60vh]">
          {children}
        </div>

        <div className="flex justify-end gap-2 border-t border-soft-line bg-slate-50 px-6 py-4">
          {footer}
        </div>
      </div>
    </div>
  );
}
