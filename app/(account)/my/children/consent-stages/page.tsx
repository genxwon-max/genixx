import type { Metadata } from "next";
import Link from "next/link";
import { consentStages } from "@/lib/account";
import { AccHead, btnGhost, card, LegalNote } from "@/components/account/ui";

export const metadata: Metadata = {
  title: "단계별 동의 관리",
  description:
    "1차 동의는 기본정보·설문·면담(녹취). 음성·영상·행동로그는 해당 시점에 따로 받습니다. (ACC-03-3)",
  robots: { index: false, follow: false },
};

/** ACC-03-3 단계별 동의 관리 */
export default function ConsentStagesPage() {
  return (
    <>
      <AccHead
        id="ACC-03-3"
        title="단계별 동의 관리"
        lead="한 번에 다 받지 않습니다. 그 데이터가 실제로 필요해지는 시점에 따로 여쭤봅니다."
        back={{ href: "/my/children", label: "자녀 프로필로" }}
      />

      <ul className="space-y-3">
        {consentStages.map((s) => (
          <li key={s.id} className={`${card} p-5 sm:p-6`}>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-[16px] font-black text-soft-ink">{s.label}</h2>
              <span
                className={`rounded border px-1.5 py-0.5 text-[11px] font-bold ${
                  s.required
                    ? "border-rose-300 bg-rose-50 text-rose-700"
                    : "border-soft-line bg-slate-50 text-soft-muted"
                }`}
              >
                {s.required ? "필수" : "선택"}
              </span>
              <span
                className={`rounded border px-1.5 py-0.5 text-[11px] font-bold ${
                  s.upfront
                    ? "border-soft-primary bg-soft-primary-soft text-soft-primary-dark"
                    : "border-amber-300 bg-amber-50 text-amber-800"
                }`}
              >
                {s.upfront ? "1차 동의에 포함" : "해당 시점에 별도 동의"}
              </span>
            </div>

            <dl className="mt-4 grid gap-x-6 gap-y-2 text-[13px] sm:grid-cols-2">
              <div className="flex gap-2">
                <dt className="shrink-0 font-bold text-soft-ink">받는 시점</dt>
                <dd className="text-soft-muted">{s.when}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="shrink-0 font-bold text-soft-ink">이용 목적</dt>
                <dd className="text-soft-muted">{s.purpose}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="shrink-0 font-bold text-soft-ink">수집 항목</dt>
                <dd className="text-soft-muted">{s.items}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="shrink-0 font-bold text-soft-ink">보관 기간</dt>
                <dd className="text-soft-muted">{s.keep}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>

      <div className="mt-4">
        <LegalNote title="동의를 켜고 끈 기록은 모두 남습니다">
          <p>
            동의와 철회는 각각 이벤트로 적재됩니다. 언제 무엇에 동의했고 언제 철회했는지 요청하시면
            그대로 보여 드립니다.
          </p>
        </LegalNote>
      </div>

      <Link href="/my/children/withdraw" className={`${btnGhost} mt-6 w-full`}>
        동의 철회·데이터 파기 요청하기
      </Link>
    </>
  );
}
