import type { Metadata } from "next";
import Link from "next/link";
import { AccHead, btnGhost, btnPrimary, card, cardPad, LegalNote } from "@/components/account/ui";

export const metadata: Metadata = {
  title: "소속 승인 대기",
  description: "교사·기관담당자 계정의 승인 진행 상태입니다. (ACC-01-4)",
  robots: { index: false, follow: false },
};

/**
 * 승인 대기도 로그인 후 화면이라 회원 존(대시보드 껍데기) 안에 둔다.
 * 예전에는 /signup/pending으로 가입 존에 있어서, 로그인하자마자 마케팅 헤더를 이고
 * 있는 화면을 만났다. 승인 전에는 레일도 홈·설정만 남는다(DashShell).
 */

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
                    : "border-soft-line text-soft-muted"
                }`}
              >
                {i + 1}
              </span>
              <div>
                <p className={`text-[15px] font-bold ${s.done ? "text-soft-ink" : "text-soft-muted"}`}>
                  {s.t}
                  {s.done && <span className="ml-2 text-[12px] text-emerald-600">완료</span>}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-soft-muted">{s.d}</p>
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

      {/* 승인 전에는 갈 수 있는 회원 화면이 설정뿐이라 그쪽만 남긴다.
          고객지원은 공개 존이라 같은 탭에서 열면 대시보드가 마케팅 껍데기로 바뀐다. */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <a
          href="/support/inquiry"
          target="_blank"
          rel="noopener noreferrer"
          className={btnPrimary}
        >
          승인 문의하기
        </a>
        <Link href="/mypage" className={`${btnGhost} w-full`}>
          내 정보 확인
        </Link>
      </div>
    </>
  );
}
