import type { Metadata } from "next";
import Link from "next/link";
import { AccHead, btnGhost, card, cardPad, LegalNote } from "@/components/account/ui";

export const metadata: Metadata = {
  title: "동의 철회·데이터 파기 요청",
  description: "철회 시 파기 절차가 자동으로 연동되고 처리 결과를 통지합니다. (ACC-03-4)",
  robots: { index: false, follow: false },
};

const steps = [
  { t: "요청 접수", d: "철회 대상과 범위를 확인합니다. 아이별로 따로 요청하실 수 있습니다." },
  { t: "즉시 열람 차단", d: "접수와 동시에 전문가·교사의 열람이 막힙니다." },
  { t: "파기 실행", d: "응답·설문·녹취를 파기합니다. 법령상 보관 의무가 있는 항목은 따로 알려 드립니다." },
  { t: "결과 통지", d: "무엇을 언제 파기했는지 문서로 보내 드립니다." },
];

/** ACC-03-4 동의 철회·데이터 파기 요청 */
export default function WithdrawPage() {
  return (
    <>
      <AccHead
        id="ACC-03-4"
        title="동의 철회 · 데이터 파기 요청"
        lead="언제든 요청하실 수 있습니다. 이유를 적지 않으셔도 됩니다."
        back={{ href: "/my/children/consent-stages", label: "단계별 동의 관리로" }}
      />

      <div className={`${card} ${cardPad}`}>
        <h2 className="text-[16px] font-black text-exam-text">요청하면 이렇게 진행됩니다</h2>
        <ol className="mt-5 space-y-4">
          {steps.map((s, i) => (
            <li key={s.t} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-900 text-[13px] font-black text-white tabular-nums">
                {i + 1}
              </span>
              <div>
                <p className="text-[15px] font-bold text-exam-text">{s.t}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-exam-muted">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-4">
        <LegalNote title="이미 발행된 리포트는 어떻게 되나요?">
          <p>
            파기하면 결과 리포트도 함께 열람할 수 없게 됩니다. 필요하시면 요청 전에 PDF로 저장해
            두시길 권해 드립니다.
          </p>
          <p>진단에 쓰인 아이의 응답은 되살릴 수 없습니다.</p>
        </LegalNote>
      </div>

      <Link href="/support/inquiry" className={`${btnGhost} mt-6 w-full`}>
        철회·파기 요청 접수하기
      </Link>
      <p className="mt-3 text-center text-[13px] text-exam-muted">
        접수 후 처리 상황은 등록하신 연락처로 안내해 드립니다.
      </p>
    </>
  );
}
