import Link from "next/link";
import { rounds } from "@/lib/admin";
import { PageHead, Progress } from "@/components/admin/Parts";
import MyAlerts from "@/components/admin/MyAlerts";
import RoundSwitch from "@/components/admin/RoundSwitch";
import BusinessMetrics from "@/components/admin/BusinessMetrics";
import ItemStats from "@/components/admin/ItemStats";
import * as a from "@/components/admin/ui";

export const metadata = { title: "대시보드 · GENIXX 관리자" };

/*
 * ADM-01 대시보드.
 *
 * 한 화면에 들어와야 한다. 열두 달 막대를 두 벌 펼쳐 두었더니 세로 2,950px —
 * 네 화면이 되어서 정작 들어오자마자 봐야 할 것이 접히는 선 아래로 밀렸다.
 *
 * 세 가지 규칙으로 줄였다.
 *  1) 첫 화면은 석 달까지만. 열두 달은 「자세히 보기」 안으로.
 *  2) 같은 무게의 구간은 두 칸씩 나란히. 세로로 이으면 두 배가 된다.
 *  3) 설명하는 글은 접는다. 「문항이 도는 길」은 매일 읽을 것이 아니라 처음
 *     한 번 읽고 나면 아는 내용이다.
 *
 * 남긴 순서는 알림 → 이번 달 → 지금 상태다.
 *
 * ── 걷어낸 것들 ──
 *
 * **처리 대기 줄** — 역할별 대기 건수를 모아 두었는데, 왼쪽 메뉴 배지와 같은 값을
 * (lib/admin.ts의 pending) 같은 링크로 한 번 더 보여 주는 것이었다. 갈래별 숫자는
 * 메뉴가 맡는다. 대신 **알림**(MyAlerts)을 둔다 — 배지가 말하지 못하는
 * 내 배정·마감·반려다.
 *
 * **오늘 숫자 · 눈여겨볼 것** — 넷씩 두 벌, 여덟 줄이 모두 예시 수치였다. 「어제
 * 발행한 리포트 62건」을 보고 사람이 할 일이 없다.
 *
 * **가장 오래 기다린 응시 · 문항이 도는 길** — 앞엣것은 판정 협진 화면이 그대로
 * 갖고 있고, 뒤엣것은 처음 한 번 읽으면 되는 설명이라 매일 오는 화면에 둘 것이
 * 아니다. 설명이 필요하면 그 일을 하는 화면에서 한다.
 *
 * ── 회차 ──
 *
 * 진단은 한 해에 네 번 돈다. 오른쪽 위 고르개로 앞뒤 회차를 넘긴다(RoundSwitch).
 * 고른 회차는 주소(`?round=`)에 남으므로 뒤로 가기와 링크 공유가 그대로 된다.
 *
 * ⚠ 제목 줄의 설명(lead)에는 회차를 적지 않는다. 회차마다 글자 수가 달라 머리글
 *   높이가 바뀌면, 화살표를 연달아 누를 때 고르개가 위아래로 흔들린다.
 */

export default async function AdminHome({
  searchParams,
}: {
  searchParams: Promise<{ round?: string }>;
}) {
  const { round: picked } = await searchParams;
  /* 없는 회차를 물어 오면 최신 회차를 보여 준다 — 빈 화면보다 낫다 */
  const round = rounds.find((r) => r.id === picked) ?? rounds[0];

  return (
    <>
      {/* 설명 줄을 두지 않는다. 「회차 진행과 이번 달 숫자입니다」는 화면을 보면
          아는 말이고, 회차를 넘기는 법은 화살표가 이미 말하고 있다.

          회차 고르개는 오른쪽 끝이 아니라 제목 옆에 붙인다. 아래 숫자가 전부 이
          회차 것이라, 제목과 떨어져 있으면 그 이음을 눈이 한 번 더 만들어야 한다. */}
      <PageHead title="대시보드" beside={<RoundSwitch id={round.id} />} />

      {/* ① 알림 — 배정 · 마감 · 반려 */}
      <MyAlerts round={round} />

      {/* ② 이번 달 숫자와 석 달 추이 */}
      <BusinessMetrics />

      {/* ③ 지금 상태 — 문항 은행과 회차 진행을 나란히 */}
      <div className="mt-6 grid gap-x-10 gap-y-6 border-t border-exam-line pt-6 lg:grid-cols-2">
        <ItemStats />

        <section>
          {/* 회차 이름은 오른쪽 위 고르개에 이미 있다. 여기 한 번 더 적으면 읽는
              사람은 둘이 다른 것인 줄 알고 두 번 읽는다. */}
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className={a.cardTitle}>회차 진행</h2>
            <Link
              href="/admin/rounds"
              className="adm-t-sm font-bold text-brand-700 hover:underline"
            >
              회차 현황으로 →
            </Link>
          </div>
          <p className={`${a.bodyText} mt-1`}>
            응시 대상 {round.target.toLocaleString("ko-KR")}명 · {round.period}
          </p>
          <div className="mt-4 space-y-3">
            <Progress label="응시 제출" value={round.submitted} total={round.target} />
            <Progress label="채점·판정 확정" value={round.graded} total={round.submitted} />
            <Progress label="리포트 발행" value={round.published} total={round.submitted} />
          </div>
          <p className="mt-3 adm-t-sm text-exam-muted">
            리포트는 전문가가 확정한 뒤에만 학부모 화면에 나갑니다.
          </p>
        </section>
      </div>

    </>
  );
}
