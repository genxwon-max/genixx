"use client";

import Link from "next/link";
import { useState } from "react";
import StudentRegistrar from "@/components/exam/StudentRegistrar";
import { useSession } from "@/lib/authStore";
import { useHydrated } from "@/lib/examStore";
import { CONSENT_AGE } from "@/lib/account";
import { btnGhost, btnPrimary, card, cardPad, LegalNote } from "./ui";

/**
 * 학생 명부·등록 — 대시보드 안에서 연다.
 *
 * 예전에는 응시 존(/exam/roster)에 있어서 대시보드에서 나갔다가 다른 껍데기를 만났다.
 * 등록은 회원이 자기 자리에서 하는 일이라 회원 존으로 들여왔다.
 *
 * 역할에 따라 하는 일이 갈린다 —
 *  · 기관담당자·교사 : 소속 학생을 등록한다. 보호자 동의는 별도 경로로 받는다.
 *  · 학부모          : 자기 아이를 등록한다. 만 14세 미만 아동의 개인정보는 법정대리인이
 *                      동의해야 처리할 수 있어서(개인정보보호법 제22조의2) 올리기 전에
 *                      한 번 확인하고 들어간다. 한 명씩 등록할 때는 아이마다 생년월일로
 *                      갈래를 확인하지만, 여러 명을 한 번에 올릴 때는 그 갈래를 화면에서
 *                      밟을 수 없기 때문이다.
 */
export default function StudentsScreen({ tab = "one" }: { tab?: "one" | "bulk" }) {
  const hydrated = useHydrated();
  const session = useSession();
  const [agreed, setAgreed] = useState(false);

  const isOrg = session?.role === "director" || session?.role === "teacher";

  if (!hydrated) {
    return <p className="py-16 text-center text-[13px] text-soft-muted">확인 중입니다…</p>;
  }

  if (isOrg) {
    return <StudentRegistrar mode="director" initialTab={tab} />;
  }

  if (agreed) {
    return (
      <>
        {/* 등록 도구가 자기 제목을 이미 달고 있어서 여기서는 돌아가는 길만 둔다 */}
        <Link
          href="/my"
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-soft-muted hover:text-soft-ink"
        >
          ← 홈으로
        </Link>
        <StudentRegistrar mode="parent" initialTab={tab} surveyPrompt={false} />
      </>
    );
  }

  return (
    <>
      <header className="mb-5">
        <Link
          href="/my"
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-soft-muted hover:text-soft-ink"
        >
          ← 홈으로
        </Link>
        <h1 className="text-[26px] font-bold leading-tight tracking-tight text-soft-ink sm:text-[30px]">
          학생 등록
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-soft-muted">
          여러 명을 한 번에 올리기 전에 법정대리인 동의를 한 번 확인합니다.
        </p>
      </header>

      <LegalNote title="법정대리인 동의" basis="개인정보보호법 제22조의2">
        <p>
          만 {CONSENT_AGE}세 미만 아동의 개인정보는 법정대리인이 동의해야 처리할 수 있습니다.
          한 명씩 등록하실 때는 생년월일을 받아 이 갈래를 확인하지만, 여러 명을 한 번에 올릴
          때는 여기서 한 번에 확인합니다.
        </p>
        <p>동의는 언제든 철회할 수 있고, 철회하시면 파기 절차가 자동으로 시작됩니다.</p>
      </LegalNote>

      <div className={`${card} ${cardPad} mt-4`}>
        <p className="text-[15px] font-bold text-soft-ink">올리실 학생에 대해 확인해 주세요</p>
        <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-[14px] leading-[1.7] text-soft-muted">
          <li>이름·생년월일·학교·학년을 받습니다. 주민등록번호는 받지 않습니다.</li>
          <li>수집한 정보는 학력·재능 진단과 결과 리포트 작성에만 씁니다.</li>
          <li>보관 기간은 수집일로부터 5년이며, 철회 시 지체 없이 파기합니다.</li>
        </ul>

        <label className="mt-5 flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-[18px] w-[18px] shrink-0"
          />
          <span className="text-[14px] leading-[1.6] text-soft-ink">
            등록하는 학생의 법정대리인으로서 위 내용에 동의합니다.
          </span>
        </label>

        <div className="mt-5 flex flex-wrap gap-2.5">
          <button type="button" disabled className={`${btnPrimary} disabled:opacity-45`}>
            체크하시면 다음으로 넘어갑니다
          </button>
          <Link href="/my/children/consent" className={btnGhost}>
            한 명씩 등록할게요
          </Link>
        </div>
      </div>
    </>
  );
}
