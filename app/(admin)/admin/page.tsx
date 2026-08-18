import Link from "next/link";
import { approvals, gradingQueue, hitlFlow, inquiries, items, roleOf, rounds } from "@/lib/admin";
import { PageHead, CountRows, Progress, Badge } from "@/components/admin/Parts";
import TodayQueue from "@/components/admin/TodayQueue";
import BusinessMetrics from "@/components/admin/BusinessMetrics";
import ItemStats from "@/components/admin/ItemStats";
import { caseStates } from "@/lib/admin";
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
 * 남긴 순서는 급한 것 → 이번 달 → 지금 상태 → 파고들 것이다.
 */

const round = rounds[0];

export default function AdminHome() {
  const soon = gradingQueue.filter((c) => c.state === "ai" || c.state === "conference").slice(0, 4);

  return (
    <>
      <PageHead
        title="대시보드"
        lead={`${round.label} (${round.period}) 기준입니다.`}
      />

      {/* ① 급한 것 — 한 줄 */}
      <TodayQueue />

      {/* ② 이번 달 숫자와 석 달 추이 */}
      <BusinessMetrics />

      {/* ③ 지금 상태 — 문항 은행과 회차 진행을 나란히 */}
      <div className="mt-6 grid gap-x-10 gap-y-6 border-t border-exam-line pt-6 lg:grid-cols-2">
        <ItemStats />

        <section>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className={a.cardTitle}>{round.label}</h2>
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

      {/* ④ 오늘 숫자와 눈여겨볼 것 — 둘 다 짧은 목록이라 나란히 */}
      <div className="mt-6 grid gap-x-10 gap-y-6 border-t border-exam-line pt-6 lg:grid-cols-2">
        <section>
          <h2 className={a.cardTitle}>오늘 숫자</h2>
          <div className="mt-3">
            <CountRows
              rows={[
                { label: "오늘 응시 제출", value: 128, unit: "건", note: "어제 같은 시각 111건" },
                { label: "설문 수집률", value: "74", unit: "%", note: "학부모 설문 기준" },
                {
                  label: "활성 기관",
                  value: 5,
                  unit: "곳",
                  note: "시범 2곳 포함",
                  href: "/admin/orgs",
                },
                { label: "어제 발행한 리포트", value: 62, unit: "건", note: "반송 0건" },
              ]}
            />
          </div>
        </section>

        <section>
          <h2 className={a.cardTitle}>눈여겨볼 것</h2>
          <div className="mt-3">
            <CountRows
              rows={[
                {
                  label: "승인 대기 중 확인 필요",
                  value: approvals.filter((x) => x.warning).length,
                  unit: "건",
                  note: "증빙이 부족하거나 메일 도메인이 다릅니다",
                  href: "/admin/approvals",
                },
                {
                  label: "24시간 넘긴 문의",
                  value: inquiries.filter((x) => x.overdue).length,
                  unit: "건",
                  note: "개인정보 파기 요청 포함",
                  href: "/admin/inquiries",
                },
                {
                  label: "수정 요청된 문항",
                  value: items.filter((x) => x.state === "revise").length,
                  unit: "건",
                  note: "다음 회차 전까지 반영해야 합니다",
                  href: "/admin/items",
                },
              ]}
            />
          </div>
        </section>
      </div>

      {/* ⑤ 파고들 것 — 여기부터는 접어 둔다 */}
      <div className="mt-6 space-y-2 border-t border-exam-line pt-4">
        <details>
          <summary className="cursor-pointer adm-t-sm font-bold text-brand-700">
            가장 오래 기다린 응시 {soon.length}건 보기
          </summary>
          <div className="mt-3 overflow-x-auto">
            <table className={a.table}>
              <thead>
                <tr>
                  <th className={a.th}>응시번호</th>
                  <th className={a.th}>학년</th>
                  <th className={a.th}>소속</th>
                  <th className={a.th}>상태</th>
                  <th className={a.th}>사람이 봐야 하는 이유</th>
                  <th className={a.th}>대기 시작</th>
                </tr>
              </thead>
              <tbody>
                {soon.map((c) => (
                  <tr key={c.id}>
                    <td className={a.tdStrong}>{c.seat}</td>
                    <td className={a.td}>{c.grade}</td>
                    <td className={a.td}>{c.org}</td>
                    <td className={a.td}>
                      <Badge {...caseStates[c.state]} />
                    </td>
                    <td className={a.td}>
                      {c.flag ? (
                        <span className="font-bold text-rose-700">{c.flag}</span>
                      ) : (
                        <span>특이사항 없음 · 확인 후 확정</span>
                      )}
                    </td>
                    <td className={a.td}>{c.updatedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link href="/admin/conference" className={`${a.btnRowGhost} mt-3`}>
            판정 협진 전체 보기
          </Link>
        </details>

        <details>
          <summary className="cursor-pointer adm-t-sm font-bold text-brand-700">
            문항이 도는 길 — 누가 무엇을 확정하는지
          </summary>
          <p className="mt-3 adm-t-md leading-relaxed text-exam-muted">
            AI가 초안을 내도 확정은 사람이 합니다. 출제자와 검수자는 권한이 갈려 있어, 자기가 쓴
            문항을 자기가 승인할 수 없습니다.
          </p>

          <ol className="mt-3 border-b border-exam-line">
            {hitlFlow.map((step, i) => (
              <li key={step.id} className="border-t border-exam-line">
                <Link
                  href={step.href}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-3 transition-colors hover:bg-exam-raised"
                >
                  <span aria-hidden className="adm-t-sm tabular-nums text-exam-muted">
                    {i + 1}
                  </span>
                  <span className="adm-t-md font-bold text-exam-text">{step.title}</span>
                  <span className="adm-t-sm text-exam-muted">
                    {roleOf(step.role).short} · {step.desc}
                  </span>
                  <span className="ml-auto adm-t-md font-bold tabular-nums text-exam-text">
                    {step.count}건
                  </span>
                  <span className="adm-t-sm font-bold text-brand-700">→</span>
                </Link>
              </li>
            ))}
          </ol>

          <p className="mt-3 adm-t-md leading-relaxed text-exam-muted">
            반려되면 2번에서 1번으로 되돌아갑니다. 사유 코드와 코멘트가 문항에 붙어 출제자에게
            그대로 전달됩니다.
          </p>
        </details>
      </div>
    </>
  );
}
