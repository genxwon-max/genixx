import {
  change,
  conversionRate,
  lastMonth,
  series,
  thisMonth,
  totalMembers,
  won,
} from "@/lib/adminMetrics";
import { ColumnChart } from "./Charts";
import * as a from "./ui";

/**
 * ADM-01 이번 달 숫자.
 *
 * 카드를 네 개 세우지 않고 한 줄에 하나씩 눕힌다. 카드는 숫자마다 테두리가 생겨서
 * 정작 넷을 견주기가 어렵고, 급한 것과 안 급한 것을 색으로 나누기 시작하면 화면이
 * 알록달록해진다. 값을 오른쪽 끝에 맞춰 두면 위에서 아래로 한 번에 훑힌다.
 *
 * 증감은 화살표만 쓰지 않는다. 색과 방향만으로는 색약 사용자가 못 읽으므로
 * 「지난달보다 142명 많음」처럼 글자로도 적는다.
 */

/* ⚠ 2026 파일럿 응시권은 전액 무료라 응시 건수는 결제에 잡히지 않는다. 여기 금액은
   기관 계약분과 정식 서비스 사전 결제분이다. 화면에도 그렇게 적어 둔다 — 대시보드
   숫자와 요금 안내(PUB-03-5)가 어긋나면 둘 중 하나는 거짓말이 된다. */

type Metric = {
  label: string;
  value: string;
  unit: string;
  now: number;
  before: number;
  /** 증감 대신 적을 말 (누적처럼 지난달과 견줄 값이 아닌 경우) */
  instead?: string;
  /**
   * 증감 폭을 적는 방식.
   *
   * 금액은 「만원」으로 줄여 적는데, 원 단위 차이를 따로 반올림하면 화면에 적힌
   * 두 값의 차이와 어긋난다. 700만 − 682만인데 증감은 19만원이 되는 식이다.
   * 화면에 보이는 값과 같은 자릿수로 뺀 뒤에 적는다.
   */
  diffText?: string;
  note: string;
};

/** 만원 단위로 끊어 견준다 */
const inTenThousand = (v: number) => Math.round(v / 10_000);

export default function BusinessMetrics() {
  const rate = conversionRate(thisMonth);
  const rateBefore = conversionRate(lastMonth);

  const metrics: Metric[] = [
    {
      label: "이번 달 회원가입",
      value: thisMonth.signups.toLocaleString("ko-KR"),
      unit: "명",
      now: thisMonth.signups,
      before: lastMonth.signups,
      note: `지난달 ${lastMonth.signups.toLocaleString("ko-KR")}명`,
    },
    {
      label: "이번 달 유료 전환",
      value: thisMonth.paid.toLocaleString("ko-KR"),
      unit: "명",
      now: thisMonth.paid,
      before: lastMonth.paid,
      note: `전환율 ${rate.toFixed(1)}% · 지난달 ${rateBefore.toFixed(1)}%`,
    },
    {
      label: "이번 달 결제 금액",
      value: won(thisMonth.revenue),
      unit: "원",
      now: thisMonth.revenue,
      before: lastMonth.revenue,
      diffText: `${Math.abs(
        inTenThousand(thisMonth.revenue) - inTenThousand(lastMonth.revenue),
      ).toLocaleString("ko-KR")}만원`,
      note: `지난달 ${won(lastMonth.revenue)}원 · 파일럿 무료 응시분 제외`,
    },
    {
      label: "누적 회원",
      value: totalMembers.toLocaleString("ko-KR"),
      unit: "명",
      now: totalMembers,
      before: totalMembers - thisMonth.signups,
      instead: `이번 달 ${thisMonth.signups.toLocaleString("ko-KR")}명 늘었습니다`,
      note: "학부모·교사 계정 합계",
    },
  ];

  return (
    <section className="mt-7">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className={a.cardTitle}>{thisMonth.full}</h2>
        <p className="adm-t-xs text-exam-muted">
          화면 설계용 예시 수치입니다 — 실제 집계가 아닙니다
        </p>
      </div>

      <ul className="mt-4 border-b border-exam-line">
        {metrics.map((m) => {
          const pct = change(m.now, m.before);
          const diff = m.now - m.before;
          return (
            <li
              key={m.label}
              className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-exam-line py-3.5"
            >
              <span className="adm-t-md font-bold text-exam-text">{m.label}</span>
              <span className="adm-t-sm text-exam-muted">{m.note}</span>

              <span className="ml-auto flex items-baseline gap-1">
                <b className="adm-t-lg font-black tabular-nums text-exam-text">{m.value}</b>
                <span className="adm-t-sm text-exam-muted">{m.unit}</span>
              </span>

              <span className="w-full text-right adm-t-sm sm:w-56">
                {m.instead ? (
                  <span className="font-bold text-brand-700">{m.instead}</span>
                ) : pct === null ? (
                  <span className="text-exam-muted">견줄 지난달 값이 없습니다</span>
                ) : (
                  <span className={`font-bold ${diff >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                    {diff >= 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}% · 지난달보다{" "}
                    {m.diffText ?? `${Math.abs(diff).toLocaleString("ko-KR")}${m.unit}`}{" "}
                    {diff >= 0 ? "많음" : "적음"}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-6">
        <h3 className={a.cardTitle}>최근 12개월 회원가입과 유료 전환</h3>
        <p className={`${a.bodyText} mt-1.5`}>
          학기초(3월)와 방학(7~8월)에 몰립니다. 짙은 부분이 그달 가입자 중 유료로 넘어간 몫입니다.
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
      </div>

      <div className="mt-7">
        <h3 className={a.cardTitle}>최근 12개월 결제 금액</h3>
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
      </div>
    </section>
  );
}
