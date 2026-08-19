import Link from "next/link";
import { change, conversionRate, lastMonth, series, thisMonth, totalMembers } from "@/lib/adminMetrics";
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
 *
 * 첫 화면에는 석 달만 세운다. 열두 달 막대를 두 벌 펼쳐 두었더니 대시보드가 네
 * 화면이 되어, 정작 들어오자마자 봐야 할 이번 달 숫자가 접히는 선 아래로 밀렸다.
 * 대시보드는 훑는 자리이고 파고드는 자리가 아니다 — 열두 달은 제 화면(/admin/metrics)
 * 으로 내보내고 여기서는 「자세히 보기」로 보낸다. 접이식으로 두었을 때는, 펼치면
 * 그 아래에 있던 것이 통째로 밀려 내려가 무엇을 보다 말았는지 잊게 되었다.
 */

/** 첫 화면에 세우는 달 수 */
const RECENT = 3;

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

export default function BusinessMetrics() {
  const rate = conversionRate(thisMonth);

  const metrics: Metric[] = [
    {
      label: "이번 달 회원가입",
      value: thisMonth.signups.toLocaleString("ko-KR"),
      unit: "명",
      now: thisMonth.signups,
      before: lastMonth.signups,
      /* 「지난달 1,049명」은 적지 않는다. 옆 칸이 이미 「지난달보다 50명 많음」이라
         적고 있어서, 같은 말을 두 번 하느라 줄이 하나 더 든다. */
      note: "",
    },
    {
      label: "이번 달 유료 전환",
      value: thisMonth.paid.toLocaleString("ko-KR"),
      unit: "명",
      now: thisMonth.paid,
      before: lastMonth.paid,
      note: `전환율 ${rate.toFixed(1)}%`,
    },
    /* 결제 금액은 대시보드에 두지 않는다. 2026 파일럿 응시권이 전액 무료라 여기
       잡히는 것은 기관 계약분과 사전 결제분뿐인데, 「이번 달 결제 금액」이라 적어
       두면 진단이 돈을 그만큼 벌고 있다는 말로 읽힌다. 월별 추이는 운영 지표
       화면에서 무엇이 잡히고 무엇이 안 잡히는지와 함께 본다. */
    {
      label: "누적 회원",
      value: totalMembers.toLocaleString("ko-KR"),
      unit: "명",
      now: totalMembers,
      before: totalMembers - thisMonth.signups,
      instead: `이번 달 ${thisMonth.signups.toLocaleString("ko-KR")}명 늘었습니다`,
      note: "학부모·교사",
    },
  ];

  const signupBars = (months: typeof series) =>
    months.map((m) => ({
      key: m.key,
      label: m.short,
      full: m.full,
      total: m.signups,
      sub: m.paid,
    }));

  const recent = series.slice(-RECENT);

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className={a.cardTitle}>{thisMonth.full}</h2>
        <Link href="/admin/metrics" className="adm-t-sm font-bold text-brand-700 hover:underline">
          자세히 보기 →
        </Link>
      </div>

      {/* 숫자는 왼쪽, 석 달 추이는 오른쪽. 세로로 이으면 넷을 견주기도 전에
          그래프가 화면을 밀어낸다. */}
      <div className="mt-3 grid gap-x-8 gap-y-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
        <ul className="border-b border-exam-line">
          {metrics.map((m) => {
            const pct = change(m.now, m.before);
            const diff = m.now - m.before;
            return (
              /* 넓을 때는 한 줄에 [이름][증감·설명][값]. 좁아지면 증감이 아래로
                 내려가 두 줄이 된다. 넓은 화면에서까지 두 줄을 쓰면 넷을 견주는
                 데 화면 반이 든다. */
              <li
                key={m.label}
                className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-0.5 border-t border-exam-line py-2.5 xl:grid-cols-[minmax(7rem,auto)_1fr_auto]"
              >
                <span className="adm-t-md font-bold text-exam-text">{m.label}</span>

                <span className="order-3 col-span-2 adm-t-sm xl:order-none xl:col-span-1 xl:text-right">
                  {m.instead ? (
                    <span className="font-bold text-brand-700">{m.instead}</span>
                  ) : pct === null ? (
                    <span className="text-exam-muted">견줄 지난달 값이 없습니다</span>
                  ) : (
                    <span
                      className={`font-bold ${diff >= 0 ? "text-emerald-700" : "text-rose-700"}`}
                    >
                      {diff >= 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}% · 지난달보다{" "}
                      {m.diffText ?? `${Math.abs(diff).toLocaleString("ko-KR")}${m.unit}`}{" "}
                      {diff >= 0 ? "많음" : "적음"}
                    </span>
                  )}
                  <span className="ml-2 text-exam-muted">{m.note}</span>
                </span>

                <span className="flex items-baseline justify-end gap-1">
                  <b className="adm-t-lg font-black tabular-nums text-exam-text">{m.value}</b>
                  <span className="adm-t-sm text-exam-muted">{m.unit}</span>
                </span>
              </li>
            );
          })}
        </ul>

        <div className="lg:pt-1">
          <h3 className={a.label}>최근 {RECENT}개월 회원가입</h3>
          <div className="mt-3">
            <ColumnChart
              data={signupBars(recent)}
              totalName="회원가입"
              subName="유료 전환"
              unit="명"
              height="h-28"
              numbers={false}
              caption={`${recent[0].full}부터 ${thisMonth.full}까지 월별 회원가입과 그중 유료 전환 수입니다.`}
            />
          </div>
        </div>
      </div>

    </section>
  );
}
