"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import SocialButtons from "./SocialButtons";
import { providerName, type ProviderId } from "@/lib/signup";
import { clearSignupDraft, patchSignupDraft } from "@/lib/signupStore";
import { ArrowRight } from "@/components/Icons";
import { AccHead, btnGhost, card, cardPad, LegalNote, narrow, Notes } from "./ui";

const entryNotes = [
  "간편 로그인으로 시작하시면 이름과 이메일을 받아 와 뒤 단계에서 다시 묻지 않습니다.",
  "가입은 유형 선택 → 본인확인 → 약관·동의 세 단계입니다.",
  "아이 정보는 가입 단계에서 받지 않습니다. 자녀를 등록하실 때 따로 여쭤봅니다.",
];

/**
 * ACC-01 회원가입 (입구).
 * 가입 방식을 먼저 고르고 ACC-01-1(회원 유형)로 넘어간다.
 * 간편 로그인으로 시작하면 이름·이메일을 받아 와 뒤 단계에서 다시 묻지 않는다.
 */
export default function SignupEntry() {
  const router = useRouter();

  const start = (provider: string | null) => {
    clearSignupDraft();
    patchSignupDraft(
      provider
        ? { provider, name: "김보호", email: "genix.kim@example.com" }
        : { provider: null },
    );
    router.push("/signup/type");
  };

  return (
    <div className={narrow}>
      <AccHead
        id="ACC-01"
        title="회원가입"
        lead="학부모·교사·기관담당자 세 가지 중에서 고릅니다. 가입은 3단계면 끝납니다."
      />

      <div className={`${card} ${cardPad}`}>
        <SocialButtons onPick={(id: ProviderId) => start(providerName(id))} />

        <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-[0.16em] text-exam-muted">
          <span className="h-px flex-1 bg-exam-line" />
          또는
          <span className="h-px flex-1 bg-exam-line" />
        </div>

        <button type="button" onClick={() => start(null)} className={`${btnGhost} w-full`}>
          이메일로 가입하기
          <ArrowRight className="h-4 w-4" />
        </button>

        <p className="mt-6 text-center text-[13px] text-exam-muted">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="font-bold text-brand-700 hover:underline">
            로그인
          </Link>
        </p>
      </div>

      <div className="mt-4">
        <LegalNote title="학생은 따로 가입하지 않습니다">
          <p>
            학생 계정은 만들지 않습니다. 보호자 계정 안의 <b>프로필</b>로 등록되고, 응시할 때는
            발급된 <b>8자리 접속코드와 생년월일</b>로 들어갑니다.
          </p>
          <p>
            만 14세 이상이어도 마찬가지입니다. 동의의 주체만 학생 본인으로 바뀔 뿐, 가입 경로는
            보호자 계정 하나입니다.
          </p>
        </LegalNote>
      </div>

      <Notes items={entryNotes} />
    </div>
  );
}
