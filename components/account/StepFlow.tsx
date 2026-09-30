"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { themeOf, type Variant } from "@/lib/authVariant";
import { CheckIcon } from "@/components/Icons";

/**
 * 결제(/my/payments)와 면담(/my/interviews)을 걸음마다 한 화면으로 나눈 판의 조각.
 *
 * ── 왜 나누는가 ──
 * 학생을 고르면 그 아래로 상품이, 전문가를 고르면 그 아래로 달력이 펼쳐지던 화면은 고른 것이
 * 무엇을 바꿨는지 보려면 스크롤을 내려야 했다. 걸음마다 주소가 다른 화면을 세우고 「다음」으로
 * 넘기면 지금 할 일이 늘 화면 맨 위에 있고, 화면 하나하나를 주소로 가리켜 디자인으로 넘길 수
 * 있다. 앞 걸음에서 고른 것은 lib/flowDraft.ts가 이어 준다.
 *
 * 차례는 위에 늘 적어 두고(StepBar), [이전]·[다음]은 늘 아래 가운데에 둔다(StepNav) — 계정
 * 존 규칙 ③ · ④(components/account/ui.tsx). 둘 다 링크라서 브라우저의 뒤로 가기와 새 탭
 * 열기가 그대로 통한다.
 */

export type Step = {
  label: string;
  /** 이 걸음의 주소 — 지난 걸음은 눌러서 돌아간다 */
  href: string;
  /** 지난 걸음에서 고른 것 — 단계 표시 아래에 작게 적는다 */
  value?: string;
};

/** 진행 단계 — 지난 걸음은 눌러서 돌아갈 수 있고, 거기서 고른 것을 아래에 적는다 */
export function StepBar({ steps, current }: { steps: Step[]; current: number }) {
  return (
    <nav aria-label="진행 단계" className="mb-7">
      <ol className="flex">
        {steps.map((s, i) => {
          const done = i < current;
          const on = i === current;
          const circle = (
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold tabular-nums transition-colors ${
                done
                  ? "bg-soft-primary text-white group-hover:bg-soft-primary-dark"
                  : on
                    ? "border-2 border-soft-primary bg-white text-soft-primary"
                    : "border border-soft-line bg-white text-slate-400"
              }`}
            >
              {done ? <CheckIcon className="h-4 w-4" /> : i + 1}
            </span>
          );
          const label = (
            <span
              className={`text-[12.5px] leading-tight ${
                on
                  ? "font-bold text-soft-ink"
                  : done
                    ? "font-semibold text-soft-ink"
                    : "font-medium text-soft-muted"
              }`}
            >
              {s.label}
            </span>
          );
          const box = "group relative flex min-w-0 max-w-full flex-col items-center gap-1.5 px-1";
          return (
            <li
              key={s.href}
              aria-current={on ? "step" : undefined}
              className="relative flex min-w-0 flex-1 justify-center"
            >
              {/* 앞 걸음과 잇는 선 — 동그라미 한가운데 높이에 둔다 */}
              {i > 0 && (
                <span
                  aria-hidden
                  className={`absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2 ${
                    i <= current ? "bg-soft-primary" : "bg-soft-line"
                  }`}
                />
              )}
              {done ? (
                <Link href={s.href} className={box}>
                  {circle}
                  {label}
                  {s.value && (
                    <span className="max-w-full truncate text-[11.5px] font-semibold text-soft-primary group-hover:underline">
                      {s.value}
                    </span>
                  )}
                </Link>
              ) : (
                <span className={box}>
                  {circle}
                  {label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <p className="sr-only">{`전체 ${steps.length}단계 중 ${current + 1}단계, ${steps[current]?.label ?? ""}`}</p>
    </nav>
  );
}

/**
 * [이전] · [다음] — 걸음의 맨 아래 가운데.
 *
 * 「다음」이 있는 걸음에서는 화면 아래에 붙여 둔다. 전문가 목록처럼 긴 걸음은 위에서 고르고
 * 나서 단추를 찾으러 목록 끝까지 내려가야 했다. 좁은 화면에서는 하단 탭(DashShell, 높이
 * 약 61px) 바로 위에 선다 — 탭보다 한 겹 아래(z-10)에 두어 겹치는 한두 픽셀은 탭이 덮는다.
 *
 * 「다음」은 고를 것을 다 골랐을 때만 링크가 된다. 못 누를 때 링크를 씌우면 disabled를 줘도
 * 그대로 눌린다(components/account/ChildList.tsx와 같은 까닭).
 */
export function StepNav({
  backHref,
  nextHref,
  nextDisabled,
  note,
  variant = 2,
}: {
  backHref?: string;
  nextHref?: string;
  nextDisabled?: boolean;
  /** 이 걸음에서 고른 것 한 줄 — 고른 카드가 화면 밖으로 밀려나도 무엇을 골랐는지 보인다 */
  note?: ReactNode;
  variant?: Variant;
}) {
  const t = themeOf(variant);
  const both = !!backHref && !!nextHref;

  return (
    <div
      className={
        nextHref
          ? "sticky bottom-[3.75rem] z-10 -mx-4 mt-4 px-4 pb-3 pt-8 sm:-mx-6 sm:px-6 lg:bottom-0 lg:pb-6"
          : "mt-8"
      }
    >
      {/* 바탕은 회원 존 바탕(#f4f6fb) 한 빛깔을 깔고 위쪽만 가린다. 같은 빛깔끼리 이은
          그러데이션은 브라우저가 잘게 흩뿌려 그려서, 목록이 없는 자리에서도 네모가 비쳐 보였다 */}
      {nextHref && (
        <span
          aria-hidden
          className="absolute inset-0 -z-10 bg-[#f4f6fb] [mask-image:linear-gradient(to_top,#000_65%,transparent)]"
        />
      )}
      {note && (
        <p className="mb-2.5 truncate text-center text-[13px] text-soft-muted">{note}</p>
      )}
      <div
        className={`mx-auto grid gap-2.5 ${both ? "max-w-[24rem] grid-cols-2" : "max-w-[12rem]"}`}
      >
        {backHref && (
          <Link href={backHref} className={t.btnNeutral}>
            이전
          </Link>
        )}
        {nextHref &&
          (nextDisabled ? (
            <button type="button" disabled className={t.btnPrimary}>
              다음
            </button>
          ) : (
            <Link href={nextHref} className={t.btnPrimary}>
              다음
            </Link>
          ))}
      </div>
    </div>
  );
}
