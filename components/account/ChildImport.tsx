"use client";

import Link from "next/link";
import { useState } from "react";
import StudentRegistrar from "@/components/exam/StudentRegistrar";
import { CONSENT_AGE } from "@/lib/account";
import { AccHead, btnGhost, btnPrimary, card, cardPad, LegalNote } from "./ui";

/**
 * ACC-03-2 자녀 일괄 등록.
 *
 * 한 명씩 등록하는 흐름(/my/children/consent → new)은 아이마다 생년월일을 받아 만 14세로
 * 갈라 동의를 받는다. 여러 명을 한 번에 올릴 때는 그 갈래를 화면에서 하나씩 밟을 수 없다.
 * 그래서 올리기 전에 법정대리인 동의를 한 번 확인하고 들어간다 — 확인 없이 명부에
 * 아이 정보가 먼저 쌓이는 것이 개인정보보호법 제22조의2가 막는 상황이라서다.
 *
 * 등록 도구 자체는 기관 명부(/exam/roster)와 같은 것을 학부모 모드로 쓴다. 이름·생년월일·
 * 학년을 받아 접속코드를 발급하는 일이 같기 때문이다.
 */
export default function ChildImport() {
  const [agreed, setAgreed] = useState(false);

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
        <StudentRegistrar mode="parent" initialTab="bulk" surveyPrompt={false} />
      </>
    );
  }

  return (
    <>
      <AccHead
        id="ACC-03-2"
        title="자녀 일괄 등록"
        lead="여러 명을 한 번에 올리기 전에 법정대리인 동의를 한 번 확인합니다."
        back={{ href: "/my", label: "홈으로" }}
      />

      <LegalNote title="법정대리인 동의" basis="개인정보보호법 제22조의2">
        <p>
          만 {CONSENT_AGE}세 미만 아동의 개인정보는 법정대리인이 동의해야 처리할 수 있습니다.
          한 명씩 등록하실 때는 아이마다 생년월일을 받아 이 갈래를 확인하지만, 여러 명을 한 번에
          올릴 때는 여기서 한 번에 확인합니다.
        </p>
        <p>동의는 언제든 철회할 수 있고, 철회하시면 파기 절차가 자동으로 시작됩니다.</p>
      </LegalNote>

      <div className={`${card} ${cardPad} mt-4`}>
        <p className="text-[15px] font-bold text-soft-ink">올리실 아이들에 대해 확인해 주세요</p>
        <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-[14px] leading-[1.7] text-soft-muted">
          <li>이름·생년월일·학년을 받습니다. 학교 이름과 주민등록번호는 받지 않습니다.</li>
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
            올리는 아이들의 법정대리인으로서 위 내용에 동의합니다.
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
