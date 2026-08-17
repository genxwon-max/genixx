import Link from "next/link";
import { approvals, gradingQueue, hitlFlow, inquiries, items, roleOf, rounds } from "@/lib/admin";
import { PageHead, CountRows, Progress, TableCard, Badge } from "@/components/admin/Parts";
import TodayQueue from "@/components/admin/TodayQueue";
import BusinessMetrics from "@/components/admin/BusinessMetrics";
import ItemStats from "@/components/admin/ItemStats";
import { caseStates } from "@/lib/admin";
import * as a from "@/components/admin/ui";

export const metadata = { title: "대시보드 · GENIXX 관리자" };

const round = rounds[0];

export default function AdminHome() {
  const soon = gradingQueue.filter((c) => c.state === "ai" || c.state === "conference").slice(0, 4);

  return (
    <>
      <PageHead
        id="ADM-01"
        title="대시보드"
        lead={`${round.label} (${round.period}) 기준입니다. 맨 위가 오늘 처리할 것이고, 그 아래가 이번 달 숫자입니다.`}
      />

      {/* ① 할 일 — 지표가 아니라 처리할 것이 먼저다. 한 줄로 접어 두고 역할이
          손댈 수 있는 것만 센다 */}
      <TodayQueue />

      {/* ② 이번 달 숫자와 추이 */}
      <BusinessMetrics />

      {/* ③ 문항 은행 — 저장소를 그대로 읽으므로 워크벤치와 숫자가 어긋나지 않는다 */}
      <ItemStats />

      {/* ④ 사람이 도는 순환 — 네 칸을 늘어놓지 않고 한 줄씩 눕힌다. 단계마다 대기 건수가
          오른쪽 끝에 모여, 어디가 막혀 있는지 세로로 훑힌다. */}
      <section className="mt-7">
        <h2 className={a.cardTitle}>문항이 도는 길</h2>
        <p className="mt-1.5 adm-t-sm text-exam-muted">
          AI가 초안을 내도 확정은 사람이 합니다. 출제자와 검수자는 권한이 갈려 있어, 자기가 쓴
          문항을 자기가 승인할 수 없습니다.
        </p>

        <ol className="mt-4 border-b border-exam-line">
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

        <p className="mt-3 adm-t-sm leading-relaxed text-exam-muted">
          반려되면 2번에서 1번으로 되돌아갑니다. 사유 코드와 코멘트가 문항에 붙어 출제자에게 그대로
          전달됩니다.
        </p>
      </section>

      {/* ⑤ 회차 진행 */}
      <div className="mt-7 grid gap-x-8 gap-y-6 lg:grid-cols-[1.15fr_1fr]">
        <section>
          <h2 className={a.cardTitle}>{round.label} 진행 상황</h2>
          <p className="mt-1 adm-t-sm text-exam-muted">
            응시 대상 {round.target.toLocaleString("ko-KR")}명 · {round.period}
          </p>
          <div className="mt-5 space-y-4">
            <Progress label="응시 제출" value={round.submitted} total={round.target} />
            <Progress label="채점·판정 확정" value={round.graded} total={round.submitted} />
            <Progress label="리포트 발행" value={round.published} total={round.submitted} />
          </div>
          <p className="mt-4 adm-t-sm leading-relaxed text-exam-muted">
            리포트는 전문가가 확정한 뒤에만 학부모 화면에 나갑니다. 확정 전 자료는 보호자에게 보이지
            않습니다.
          </p>
        </section>

        <section className="self-start">
          <h2 className={a.cardTitle}>오늘 숫자</h2>
          <div className="mt-4">
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
      </div>

      {/* ⑥ 지금 큐 맨 앞 */}
      <div className="mt-6">
        <TableCard
          title="가장 오래 기다린 응시"
          caption="검토가 끝나지 않은 것 중 먼저 봐야 할 순서입니다."
          action={
            <Link href="/admin/grading" className={a.btnRowGhost}>
              전체 보기
            </Link>
          }
        >
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
        </TableCard>
      </div>

      {/* ⑦ 참고 지표 — 아래로 내린다 */}
      <section className="mt-7">
        <h2 className={a.cardTitle}>눈여겨볼 것</h2>
        <div className="mt-4">
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
    </>
  );
}
