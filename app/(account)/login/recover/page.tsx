import type { Metadata } from "next";
import Link from "next/link";
import { labelText as fieldLabel, field as input } from "@/components/account/ui";
import { AccHead, btnGhost, card, cardPad } from "@/components/account/ui";

export const metadata: Metadata = {
  title: "계정 찾기",
  description: "가입한 이메일 또는 휴대폰 번호로 계정을 찾습니다. (ACC-02-2)",
  robots: { index: false, follow: false },
};

const cards = [
  {
    title: "이메일 주소를 잊으셨나요?",
    desc: "가입 시 본인확인한 휴대폰 번호로 가입한 이메일 주소의 일부를 알려드립니다.",
    label: "휴대폰 번호",
    placeholder: "010-1234-5678",
    button: "이메일 찾기",
  },
  {
    title: "비밀번호를 잊으셨나요?",
    desc: "가입한 이메일로 재설정 링크를 보내드립니다. 링크는 발송 후 30분간 유효합니다.",
    label: "이메일",
    placeholder: "parent@example.com",
    button: "재설정 링크 받기",
  },
];

/** ACC-02-2 ID·비밀번호 찾기 */
export default function RecoverPage() {
  return (
    <>
      <AccHead
        id="ACC-02-2"
        title="계정 찾기"
        lead="카카오·네이버·구글로 가입하셨다면 해당 서비스의 계정 찾기를 이용해 주세요."
        back={{ href: "/login", label: "로그인으로 돌아가기" }}
      />

      <div className="space-y-3">
        {cards.map((c) => (
          <div key={c.title} className={`${card} ${cardPad}`}>
            <h2 className="text-[17px] font-black text-soft-ink">{c.title}</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-soft-muted">{c.desc}</p>
            <label className={`mt-5 block ${fieldLabel}`}>
              {c.label}
              <input
                type="text"
                placeholder={c.placeholder}
                className={`mt-2 font-normal ${input}`}
              />
            </label>
            <button type="button" className={`${btnGhost} mt-4 w-full`}>
              {c.button}
            </button>
          </div>
        ))}
      </div>

      <p className="mt-6 text-center text-[13px] text-soft-muted">
        학생 접속코드를 잃어버리셨다면{" "}
        <Link href="/my/children" className="font-bold text-soft-primary-dark hover:underline">
          자녀 프로필 관리
        </Link>
        에서 다시 발급하실 수 있습니다.
      </p>
    </>
  );
}
