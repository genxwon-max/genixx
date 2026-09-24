"use client";

import Link from "next/link";
import { counselFee, counselors, SPANS, spanLabel, type Span } from "@/lib/counselors";
import { orderWon } from "@/lib/orderStore";
import { themeOf, type Variant } from "@/lib/authVariant";
import SectionTitle from "@/components/exam/SectionTitle";
import { card } from "./ui";

/**
 * 결제 › 면담 — 파는 것은 둘, 30분 면담과 60분 면담.
 *
 * ── 여기서 돈을 받지 않는다 ──
 * 면담은 **전문가 · 날짜 · 시각이 정해져야 결제가 뜻을 갖는다.** 자리를 잡지 않은 채
 * 「60분 면담권」을 먼저 팔면, 그 권을 들고 예약 화면에 갔는데 그 전문가가 60분을 받지
 * 않거나 두 달 뒤까지 자리가 없는 일이 생긴다. 환불 문의가 거기서 난다.
 *
 * 그래서 이 판은 **차림표**다 — 무엇을 얼마에 파는지 보이고, 고르면 예약 화면으로 길이를
 * 들고 넘어간다(/my/interviews?span=60). 결제는 시각을 고른 뒤 그 화면에서 끝난다.
 * 지난 면담 결제는 이 화면 아래 내역에 함께 쌓인다.
 */

/** 길이마다 무엇이 다른가 — 값만 다른 것이 아니라 나누는 이야기가 다르다 */
const blurb: Record<Span, { lead: string; items: string[] }> = {
  30: {
    lead: "결과지에서 궁금한 대목을 짚어 묻는 자리입니다.",
    items: [
      "여덟 재능 축 가운데 한두 축을 골라 읽습니다",
      "미리 적어 보내신 물음에 먼저 답합니다",
      "처음 받아 보신 결과지라면 이 길이로 충분합니다",
    ],
  },
  60: {
    lead: "아이 이야기를 처음부터 듣고 결과지 전체를 함께 읽는 자리입니다.",
    items: [
      "여덟 축과 학력 축을 이어 읽고 다음 회차에 볼 것을 정합니다",
      "가정·학교에서 지켜본 모습을 함께 놓고 봅니다",
      "판정이 경계선에 섰거나 심화 과정을 두고 고민 중이라면 이 길이를 권합니다",
    ],
  },
};

export default function CounselPayPanel({ variant = 2 }: { variant?: Variant }) {
  const t = themeOf(variant);

  return (
    <>
      <SectionTitle note="길이를 고르시면 그 길이를 받는 전문가만 예약 화면에 섭니다.">
        면담 고르기
      </SectionTitle>

      <ul className="grid gap-3 sm:grid-cols-2">
        {SPANS.map((span) => {
          const who = counselors.filter((c) => c.spans.includes(span)).length;
          return (
            <li key={span} className={`${card} flex flex-col p-5 sm:p-6`}>
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-[17px] font-bold text-soft-ink">{spanLabel(span)} 면담</span>
                <span className="rounded-full border border-soft-line px-2 py-0.5 text-[11.5px] font-semibold text-soft-muted">
                  1:1 화상 · 전화 · 대면
                </span>
              </p>
              <p className="mt-2 text-[17px] font-bold tabular-nums text-soft-ink">
                {orderWon(counselFee[span])}
              </p>
              <p className="mt-2.5 text-[13.5px] leading-[1.7] text-soft-ink">
                {blurb[span].lead}
              </p>
              <ul className="mt-2.5 flex-1 space-y-1.5 text-[12.5px] leading-[1.7] text-soft-muted">
                {blurb[span].items.map((line) => (
                  <li key={line}>· {line}</li>
                ))}
              </ul>
              <p className="mt-3 text-[12.5px] text-soft-muted">
                이 길이를 받는 전문가 <b className="text-soft-ink">{who}명</b>
              </p>
              <Link href={`/my/interviews?span=${span}`} className={`${t.btnAction} mt-4 w-full`}>
                전문가 고르고 예약하기
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 rounded-[14px] border border-soft-line bg-soft-primary-soft p-5 text-[13px] leading-[1.8] text-soft-ink">
        면담은 <b>전문가 · 날짜 · 시간을 고르신 뒤 그 자리에서 결제</b>합니다. 자리를 잡지 않은
        채 먼저 결제하면, 원하시는 전문가의 자리가 없을 때 되돌리는 일이 번거로워집니다. 30분
        자리 둘, 60분 자리 둘처럼 한 번에 여러 자리를 잡고 한 번에 결제하실 수 있습니다.
      </p>
    </>
  );
}
