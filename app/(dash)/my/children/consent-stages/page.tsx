import type { Metadata } from "next";
import Link from "next/link";
import { consentStages, type ConsentStage } from "@/lib/account";
import SectionTitle from "@/components/exam/SectionTitle";
import { AccHead, card } from "@/components/account/ui";

export const metadata: Metadata = {
  title: "단계별 동의 관리",
  description:
    "1차 동의는 기본정보·설문·면담(녹취). 음성·영상·행동로그는 해당 시점에 따로 받습니다. (ACC-03-3)",
  robots: { index: false, follow: false },
};

/**
 * 수집 항목 문자열을 [필수]·[선택] 두 줄로 편다.
 * 「[필수] 이름, 생년월일 … [선택] 성별, …」 한 줄로 두면 어디까지가 필수인지 읽히지 않는다.
 */
function splitItems(items: string) {
  const m = items.match(/^\[필수\]\s*(.+?)\s*\[선택\]\s*(.+)$/);
  return m ? [`필수 — ${m[1]}`, `선택 — ${m[2]}`] : [items];
}

function Badge({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11.5px] font-bold ${
        on ? "bg-soft-primary-soft text-soft-primary" : "bg-slate-100 text-slate-500"
      }`}
    >
      {children}
    </span>
  );
}

function StageList({ rows, showWhen }: { rows: ConsentStage[]; showWhen?: boolean }) {
  return (
    <ul className={`${card} divide-y divide-slate-100`}>
      {rows.map((s) => (
        <li key={s.id} className="px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15.5px] font-bold text-soft-ink">{s.label}</h3>
            <Badge on={s.required}>{s.required ? "필수" : "선택"}</Badge>
          </div>
          <dl className="mt-3 grid gap-y-1.5 text-[13.5px] leading-[1.7] sm:grid-cols-[5.5rem_1fr]">
            {showWhen && (
              <>
                <dt className="text-soft-muted">받는 시점</dt>
                <dd className="text-soft-ink">{s.when}</dd>
              </>
            )}
            <dt className="text-soft-muted">이용 목적</dt>
            <dd className="text-soft-ink">{s.purpose}</dd>
            <dt className="text-soft-muted">수집 항목</dt>
            <dd className="text-soft-ink">
              {splitItems(s.items).map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </dd>
            <dt className="text-soft-muted">보관 기간</dt>
            <dd className="text-soft-ink">{s.keep}</dd>
          </dl>
        </li>
      ))}
    </ul>
  );
}

/**
 * ACC-03-3 단계별 동의 관리.
 *
 * 예전에는 다섯 항목을 똑같은 카드 다섯 장으로 쌓고 배지를 둘씩(필수/선택 · 1차/별도) 달았다.
 * 배지 색이 셋(빨강·파랑·노랑)이라 무엇이 중요한지보다 색이 먼저 읽혔다. 지금은
 * 「지금 동의한 것」과 「필요할 때 따로 여쭙는 것」 두 묶음으로 가르고 배지는 필수/선택 하나만 둔다.
 */
export default function ConsentStagesPage() {
  const now = consentStages.filter((s) => s.upfront);
  const later = consentStages.filter((s) => !s.upfront);

  return (
    <>
      <AccHead
        id="ACC-03-3"
        title="단계별 동의 관리"
        lead="한 번에 다 받지 않습니다. 그 데이터가 실제로 필요해지는 시점에 따로 여쭤봅니다."
        back={{ href: "/mypage?section=consent", label: "마이페이지로" }}
      />

      <section>
        <SectionTitle>가입 때 동의한 항목</SectionTitle>
        <StageList rows={now} />
      </section>

      <section className="mt-8">
        <SectionTitle note="해당 시점이 오면 그때 따로 여쭙니다.">
          필요할 때 받는 항목
        </SectionTitle>
        <StageList rows={later} showWhen />
      </section>

      <div className="mt-8 flex flex-col items-start justify-between gap-3 rounded-[14px] bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
        <p className="text-[13.5px] leading-[1.7] text-soft-muted">
          동의와 철회 기록은 모두 남고, 요청하시면 그대로 보여 드립니다.
        </p>
        <div className="flex shrink-0 gap-2">
          <Link
            href="/mypage?section=consent"
            className="inline-flex h-10 items-center rounded-full border border-soft-line bg-white px-4 text-[13.5px] font-semibold text-soft-ink hover:bg-slate-50"
          >
            선택 동의 켜고 끄기
          </Link>
          <Link
            href="/mypage?section=withdraw"
            className="inline-flex h-10 items-center rounded-full border border-soft-line bg-white px-4 text-[13.5px] font-semibold text-soft-ink hover:bg-slate-50"
          >
            자료 파기 요청
          </Link>
        </div>
      </div>
    </>
  );
}
