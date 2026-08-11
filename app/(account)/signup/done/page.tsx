import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckIcon } from "@/components/Icons";
import { AccHead, btnGhost, btnPrimary, card, cardPad, LegalNote } from "@/components/account/ui";

export const metadata: Metadata = {
  title: "가입 완료",
  robots: { index: false, follow: false },
};

const next = [
  {
    step: "1",
    title: "법정대리인 동의",
    desc: "자녀 등록의 가장 첫 단계입니다. 만 14세 미만이면 반드시 먼저 받습니다.",
    href: "/my/children/consent",
  },
  {
    step: "2",
    title: "자녀 기본정보 입력",
    desc: "학년·지역·학교유형과 가정 내 주사용 언어를 받습니다.",
    href: "/my/children/new",
  },
  {
    step: "3",
    title: "접속코드 발급 후 응시",
    desc: "발급된 8자리 코드와 생년월일로 아이가 응시 화면에 들어갑니다.",
    href: "/exam",
  },
];

/** 가입 완료 — 학부모 경로 */
export default function SignupDonePage() {
  return (
    <>
      <div className={`${card} ${cardPad} text-center`}>
        <span
          aria-hidden
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"
        >
          <CheckIcon className="h-7 w-7" />
        </span>
        <h1 className="mt-5 text-[26px] font-black tracking-tight text-exam-text">
          가입이 끝났습니다
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-exam-muted">
          이제 자녀를 등록하면 진단을 신청할 수 있습니다. 아래 순서대로 진행하시면 됩니다.
        </p>
      </div>

      <AccHead id="ACC-03" title="다음에 할 일" />

      <ol className="space-y-3">
        {next.map((n) => (
          <li key={n.step}>
            <Link
              href={n.href}
              className="group flex items-center gap-4 rounded-xl border border-exam-line bg-exam-panel px-5 py-4 transition-colors hover:border-brand-500"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-900 text-[14px] font-black text-white">
                {n.step}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-black text-exam-text">{n.title}</span>
                <span className="mt-1 block text-[13px] leading-relaxed text-exam-muted">
                  {n.desc}
                </span>
              </span>
              <ArrowRight className="h-5 w-5 shrink-0 text-exam-muted transition-colors group-hover:text-brand-700" />
            </Link>
          </li>
        ))}
      </ol>

      <div className="mt-4">
        <LegalNote title="아이 정보는 필요한 시점에만 받습니다">
          <p>
            가입 단계에서는 아이 정보를 받지 않았습니다. 자녀를 등록하실 때, 그때 필요한 항목만
            단계적으로 여쭤봅니다.
          </p>
        </LegalNote>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link href="/my/children/consent" className={btnPrimary}>
          자녀 등록 시작하기
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link href="/my/account" className={`${btnGhost} w-full`}>
          내 정보 설정
        </Link>
      </div>
    </>
  );
}
