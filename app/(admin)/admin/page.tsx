import Link from "next/link";
import {
  approvals,
  gradingQueue,
  hitlFlow,
  inquiries,
  items,
  roleOf,
  rounds,
} from "@/lib/admin";
import { PageHead, StatCard, Progress, TableCard, Badge } from "@/components/admin/Parts";
import TodayQueue from "@/components/admin/TodayQueue";
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
        title="오늘 할 일"
        lead={`${round.label} (${round.period}) 기준입니다. 아래 목록을 위에서부터 처리하시면 됩니다.`}
      />

      {/* ① 할 일 — 지표가 아니라 처리할 목록이 먼저다. 역할이 손댈 수 있는 것만 남는다 */}
      <TodayQueue />

      {/* ② 사람이 도는 순환 — 이 콘솔이 무엇을 위한 도구인지 한 줄로 보여 주는 자리 */}
      <section className={`${a.panel} mt-6 p-5`}>
        <h2 className={a.cardTitle}>문항이 도는 길</h2>
        <p className="mt-1.5 adm-t-sm text-exam-muted">
          AI가 초안을 내도 확정은 사람이 합니다. 출제자와 검수자는 권한이 갈려 있어, 자기가 쓴
          문항을 자기가 승인할 수 없습니다.
        </p>

        <ol className="mt-5 grid gap-3 lg:grid-cols-4">
          {hitlFlow.map((step, i) => (
            <li key={step.id} className="relative">
              <Link
                href={step.href}
                className="flex h-full flex-col rounded-lg border border-exam-line bg-exam-panel p-4 transition-colors hover:border-brand-600 hover:bg-white"
              >
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-900 adm-t-xs font-black text-white"
                  >
                    {i + 1}
                  </span>
                  <span className="adm-t-md font-black text-exam-text">{step.title}</span>
                </span>
                <span className="mt-1 adm-t-xs font-bold text-brand-700">
                  {roleOf(step.role).short}
                </span>
                <span className="mt-2 flex-1 adm-t-sm leading-relaxed text-exam-muted">
                  {step.desc}
                </span>
                <span className="mt-3 adm-t-sm font-bold text-exam-text">
                  대기 <span className="tabular-nums">{step.count}</span>건
                </span>
              </Link>
              {/* 마지막 칸 뒤에는 화살표를 붙이지 않는다 */}
              {i < hitlFlow.length - 1 && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-2.5 top-1/2 hidden -translate-y-1/2 adm-t-md text-exam-muted lg:block"
                >
                  →
                </span>
              )}
            </li>
          ))}
        </ol>

        <p className="mt-4 rounded-md bg-exam-panel px-4 py-3 adm-t-sm text-exam-muted">
          반려되면 2번에서 1번으로 되돌아갑니다. 사유 코드와 코멘트가 문항에 붙어 출제자에게
          그대로 전달됩니다.
        </p>
      </section>

      {/* ③ 회차 진행 */}
      <div className="mt-6 grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <section className={`${a.panel} p-5`}>
          <h2 className={a.cardTitle}>{round.label} 진행 상황</h2>
          <p className="mt-1 adm-t-sm text-exam-muted">
            응시 대상 {round.target.toLocaleString("ko-KR")}명 · {round.period}
          </p>
          <div className="mt-5 space-y-4">
            <Progress label="응시 제출" value={round.submitted} total={round.target} />
            <Progress label="채점·판정 확정" value={round.graded} total={round.submitted} />
            <Progress label="리포트 발행" value={round.published} total={round.submitted} />
          </div>
          <p className="mt-5 rounded-md bg-exam-panel px-4 py-3 adm-t-sm text-exam-muted">
            리포트는 전문가가 확정한 뒤에만 학부모 화면에 나갑니다. 확정 전 자료는 보호자에게
            보이지 않습니다.
          </p>
        </section>

        <div className="grid grid-cols-2 gap-4 self-start">
          <StatCard label="오늘 응시 제출" value={128} unit="건" note="어제 같은 시각 111건" />
          <StatCard
            label="설문 수집률"
            value="74"
            unit="%"
            note="학부모 설문 기준"
            tone="warn"
          />
          <StatCard label="활성 기관" value={5} unit="곳" note="시범 2곳 포함" href="/admin/orgs" />
          <StatCard
            label="어제 발행한 리포트"
            value={62}
            unit="건"
            note="반송 0건"
            tone="good"
          />
        </div>
      </div>

      {/* ③ 지금 큐 맨 앞 */}
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

      {/* ④ 참고 지표 — 아래로 내린다 */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <StatCard
          label="승인 대기 중 확인 필요"
          value={approvals.filter((x) => x.warning).length}
          unit="건"
          note="증빙이 부족하거나 메일 도메인이 다릅니다"
          href="/admin/approvals"
        />
        <StatCard
          label="24시간 넘긴 문의"
          value={inquiries.filter((x) => x.overdue).length}
          unit="건"
          note="개인정보 파기 요청 포함"
          tone="warn"
          href="/admin/inquiries"
        />
        <StatCard
          label="수정 요청된 문항"
          value={items.filter((x) => x.state === "revise").length}
          unit="건"
          note="다음 회차 전까지 반영해야 합니다"
          href="/admin/items"
        />
      </div>
    </>
  );
}
