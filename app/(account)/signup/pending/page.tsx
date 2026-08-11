import type { Metadata } from "next";
import Link from "next/link";
import { AccHead, btnGhost, btnPrimary, card, cardPad, LegalNote } from "@/components/account/ui";

export const metadata: Metadata = {
  title: "소속 승인 대기",
  description: "교사·기관담당자 계정의 승인 진행 상태입니다. (ACC-01-4)",
  robots: { index: false, follow: false },
};

const steps = [
  { t: "가입 신청 접수", d: "입력하신 소속 정보로 신청이 접수되었습니다.", done: true },
  { t: "기관 관리자 확인", d: "소속 기관의 관리자가 재직 여부를 확인합니다.", done: true },
  {
    t: "승인 처리",
    d: "승인이 완료되면 학급 학생 목록과 관찰 설문에 접근할 수 있습니다.",
    done: false,
  },
];

/** ACC-01-4 교사·기관 소속 승인 대기 */
export default function PendingPage() {
  return (
    <>
      <AccHead
        id="ACC-01-4"
        title="소속 승인을 기다리는 중입니다"
        lead="보통 1~2 영업일이 걸리며, 결과는 등록하신 연락처로 안내해 드립니다."
      />

      <div className={`${card} ${cardPad}`}>
        <ol className="space-y-5">
          {steps.map((s, i) => (
            <li key={s.t} className="flex gap-4">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded border text-[13px] font-bold tabular-nums ${
                  s.done
                    ? "border-emerald-300 bg-emerald-100 text-emerald-700"
                    : "border-exam-line text-exam-muted"
                }`}
              >
                {i + 1}
              </span>
              <div>
                <p className={`text-[15px] font-bold ${s.done ? "text-exam-text" : "text-exam-muted"}`}>
                  {s.t}
                  {s.done && <span className="ml-2 text-[12px] text-emerald-600">완료</span>}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-exam-muted">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-4">
        <LegalNote title="승인 전에는 학생 데이터에 접근할 수 없습니다">
          <p>
            지금 로그인하셔도 학급 명단·응답·리포트는 보이지 않습니다. 승인 여부와 무관하게 열람
            시도는 모두 감사 로그에 남습니다.
          </p>
        </LegalNote>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link href="/support/inquiry" className={btnPrimary}>
          승인 문의하기
        </Link>
        <Link href="/" className={`${btnGhost} w-full`}>
          홈으로
        </Link>
      </div>
    </>
  );
}
