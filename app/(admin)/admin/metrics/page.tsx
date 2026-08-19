import Link from "next/link";
import { series, thisMonth, won } from "@/lib/adminMetrics";
import { ColumnChart } from "@/components/admin/Charts";
import PermissionGate from "@/components/admin/PermissionGate";
import { CountStrip, PageHead } from "@/components/admin/Parts";
import * as a from "@/components/admin/ui";

export const metadata = { title: "운영 지표 · GENIXX 관리자" };

/**
 * ADM-01-1 운영 지표 — 열두 달 추이.
 *
 * 대시보드 안에 접이식으로 있던 것을 화면으로 내보냈다. 접이식은 펼치는 순간 그
 * 아래에 있던 것이 통째로 밀려 내려가서, 무엇을 보다 말았는지 잊게 된다. 훑는
 * 자리(대시보드)와 파고드는 자리(여기)를 주소로 가른다.
 *
 * ⚠ 2026 파일럿 응시권은 전액 무료라 응시 건수는 결제에 잡히지 않는다. 여기 금액은
 *   기관 계약분과 정식 서비스 사전 결제분이다. 화면에도 그렇게 적어 둔다 — 이 숫자와
 *   요금 안내(PUB-03-5)가 어긋나면 둘 중 하나는 거짓말이 된다.
 */
export default function MetricsPage() {
  const year = series.reduce(
    (sum, m) => ({
      signups: sum.signups + m.signups,
      paid: sum.paid + m.paid,
      revenue: sum.revenue + m.revenue,
    }),
    { signups: 0, paid: 0, revenue: 0 },
  );

  return (
    <>
      <PageHead
        title="운영 지표"
        lead={`${series[0].full}부터 ${thisMonth.full}까지 열두 달입니다.`}
        action={
          <Link href="/admin" className={a.btnGhost}>
            ← 대시보드
          </Link>
        }
      />

      <PermissionGate need="member.read">
        <CountStrip
          rows={[
            { label: "열두 달 회원가입", value: year.signups, unit: "명" },
            { label: "그중 유료 전환", value: year.paid, unit: "명" },
            { label: "열두 달 결제 금액", value: won(year.revenue), unit: "원" },
          ]}
        />

        <section className="mt-8">
          <h2 className={a.cardTitle}>회원가입과 유료 전환</h2>
          <p className={`${a.bodyText} mt-1.5`}>
            학기초(3월)와 방학(7~8월)에 몰립니다. 짙은 부분이 그달 가입자 중 유료로 넘어간
            몫입니다.
          </p>
          <div className="mt-4">
            <ColumnChart
              data={series.map((m) => ({
                key: m.key,
                label: m.short,
                full: m.full,
                total: m.signups,
                sub: m.paid,
              }))}
              totalName="회원가입"
              subName="유료 전환"
              unit="명"
              caption={`${series[0].full}부터 ${thisMonth.full}까지 월별 회원가입과 그중 유료 전환 수입니다.`}
            />
          </div>
        </section>

        <section className="mt-10">
          <h2 className={a.cardTitle}>결제 금액</h2>
          <p className={`${a.bodyText} mt-1.5`}>
            파일럿 회차 응시권은 0원 처리라 여기에 잡히지 않습니다. 기관 계약분과 정식 서비스 사전
            결제분입니다.
          </p>
          <div className="mt-4">
            <ColumnChart
              data={series.map((m) => ({
                key: m.key,
                label: m.short,
                full: m.full,
                total: Math.round(m.revenue / 10_000),
              }))}
              totalName="결제 금액"
              unit="만원"
              caption={`${series[0].full}부터 ${thisMonth.full}까지 월별 결제 금액입니다. 단위는 만원입니다.`}
            />
          </div>
        </section>
      </PermissionGate>
    </>
  );
}
