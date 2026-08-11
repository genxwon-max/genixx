import type { Metadata } from "next";
import Link from "next/link";
import { labelText as fieldLabel, field as input } from "@/components/account/ui";
import { AccHead, btnGhost, btnPrimary, card, cardPad } from "@/components/account/ui";
import { ArrowRight } from "@/components/Icons";

export const metadata: Metadata = {
  title: "내 정보 설정",
  description: "비밀번호·연락처·수신 설정. (ACC-04)",
  robots: { index: false, follow: false },
};

const links = [
  { href: "/my/children", label: "학생 프로필", desc: "아이 등록과 접속코드 관리" },
  { href: "/my/account/notification", label: "알림 설정", desc: "응시 안내·리포트 발행 채널" },
  { href: "/my/children/consent-stages", label: "단계별 동의 관리", desc: "무엇에 동의했는지 확인" },
  { href: "/my/account/leave", label: "회원 탈퇴", desc: "탈퇴 시 학생 데이터 처리 방침" },
];

/** ACC-04 내 정보 설정 */
export default function AccountPage() {
  return (
    <>
      <AccHead id="ACC-04" title="내 정보 설정" lead="비밀번호와 연락처를 바꾸실 수 있습니다." />

      <div className={`${card} ${cardPad} grid gap-5`}>
        <div>
          <label htmlFor="a-phone" className={fieldLabel}>
            휴대폰 번호
          </label>
          <input id="a-phone" type="tel" defaultValue="010-1234-5678" className={`mt-2 ${input}`} />
          <p className="mt-1.5 text-[12px] text-soft-muted">
            본인확인에 쓰인 번호입니다. 바꾸시면 다시 인증해야 합니다.
          </p>
        </div>

        <div>
          <label htmlFor="a-email" className={fieldLabel}>
            이메일
          </label>
          <input
            id="a-email"
            type="email"
            defaultValue="genix.kim@example.com"
            className={`mt-2 ${input}`}
          />
        </div>

        <div>
          <label htmlFor="a-pw" className={fieldLabel}>
            새 비밀번호
          </label>
          <input
            id="a-pw"
            type="password"
            placeholder="영문·숫자·기호 조합 8자 이상"
            className={`mt-2 ${input}`}
          />
        </div>

        <button type="button" className={btnPrimary}>
          변경 사항 저장
        </button>
      </div>

      <ul className="mt-4 space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="group flex items-center gap-4 rounded-xl border border-soft-line bg-slate-50 px-5 py-4 transition-colors hover:border-soft-primary"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold text-soft-ink">{l.label}</span>
                <span className="mt-0.5 block text-[13px] text-soft-muted">{l.desc}</span>
              </span>
              <ArrowRight className="h-5 w-5 shrink-0 text-soft-muted transition-colors group-hover:text-soft-primary-dark" />
            </Link>
          </li>
        ))}
      </ul>

      <Link href="/exam" className={`${btnGhost} mt-6 w-full`}>
        응시 화면으로 가기
      </Link>
    </>
  );
}
