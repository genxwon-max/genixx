import type { Metadata } from "next";
import Link from "next/link";
import { AccHead, btnGhost, card, cardPad, LegalNote } from "@/components/account/ui";

export const metadata: Metadata = {
  title: "회원 탈퇴",
  description: "탈퇴 시 학생 프로필·응답 데이터 처리 방침을 고지합니다. (ACC-04-2)",
  robots: { index: false, follow: false },
};

const effects = [
  { t: "학생 프로필", d: "등록하신 모든 학생 프로필이 함께 삭제됩니다. 아이별로 남길 수 없습니다." },
  { t: "응시 기록·응답", d: "지필 답안, 설문 응답, 면담 녹취가 파기 절차에 들어갑니다." },
  { t: "결과 리포트", d: "발행된 리포트를 더 이상 열람할 수 없습니다. 필요하시면 미리 저장해 주세요." },
  { t: "접속코드", d: "발급된 코드가 즉시 무효가 되어 아이가 응시 화면에 들어갈 수 없습니다." },
  { t: "법령상 보관 항목", d: "결제 기록 등 법에서 보관을 정한 항목은 해당 기간까지 따로 보관합니다." },
];

/** ACC-04-2 회원 탈퇴 */
export default function LeavePage() {
  return (
    <>
      <AccHead
        id="ACC-04-2"
        title="회원 탈퇴"
        lead="탈퇴하시면 아래 내용이 함께 처리됩니다. 되돌릴 수 없으니 먼저 읽어 주세요."
        back={{ href: "/my/account", label: "내 정보 설정으로" }}
      />

      <div className={`${card} ${cardPad}`}>
        <h2 className="text-[16px] font-black text-soft-ink">탈퇴하면 이렇게 됩니다</h2>
        <ul className="mt-5 space-y-4">
          {effects.map((e) => (
            <li key={e.t} className="border-b border-soft-line pb-4 last:border-b-0 last:pb-0">
              <p className="text-[15px] font-bold text-soft-ink">{e.t}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-soft-muted">{e.d}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4">
        <LegalNote title="자료만 지우고 계정은 남기고 싶으시다면">
          <p>
            탈퇴하지 않고 아이 자료만 파기할 수도 있습니다. 다음 회차에 다시 응시하실 계획이라면
            이쪽이 낫습니다.
          </p>
        </LegalNote>
      </div>

      <Link href="/my/children/withdraw" className={`${btnGhost} mt-5 w-full`}>
        계정은 두고 자료만 파기 요청하기
      </Link>

      <button
        type="button"
        className="mt-2 inline-flex min-h-[3rem] w-full items-center justify-center rounded-lg border border-rose-300 bg-white px-6 text-[15px] font-bold text-rose-700 transition-colors hover:bg-rose-50"
      >
        위 내용을 모두 확인했고 탈퇴하겠습니다
      </button>
    </>
  );
}
