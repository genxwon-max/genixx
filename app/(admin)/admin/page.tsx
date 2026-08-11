import Link from "next/link";
import { approvals, gradingQueue, inquiries, items, rounds, pending } from "@/lib/admin";
import { PageHead, StatCard, Progress, TableCard, Badge } from "@/components/admin/Parts";
import { caseStates } from "@/lib/admin";
import * as a from "@/components/admin/ui";

export const metadata = { title: "대시보드 · GENIXX 관리자" };

const round = rounds[0];

/** 오늘 반드시 처리해야 하는 것만 추린다. 숫자 나열이 아니라 할 일 목록으로 만든다. */
const todo = [
  {
    label: "AI 분석이 끝나 검토를 기다리는 응시",
    count: pending.grading,
    unit: "건",
    href: "/admin/grading",
    urgent: true,
    note: "이 중 판정 컷 경계 사례는 확정하지 말고 케이스 회의로 넘깁니다.",
  },
  {
    label: "케이스 회의에서 합의해야 하는 경계 사례",
    count: pending.cases,
    unit: "건",
    href: "/admin/grading",
    urgent: true,
    note: "오늘 오후 4시 회의 안건입니다.",
  },
  {
    label: "소속 확인을 기다리는 교사·기관 가입",
    count: pending.approvals,
    unit: "건",
    href: "/admin/approvals",
    urgent: false,
    note: "승인 전에는 학생 자료를 볼 수 없습니다.",
  },
  {
    label: "답변하지 않은 문의",
    count: pending.inquiries,
    unit: "건",
    href: "/admin/inquiries",
    urgent: false,
    note: "24시간이 지난 문의가 1건 있습니다.",
  },
  {
    label: "교차 검수를 기다리는 문항",
    count: pending.items,
    unit: "건",
    href: "/admin/items",
    urgent: false,
    note: "작성자 본인은 검수할 수 없습니다.",
  },
];

export default function AdminHome() {
  const soon = gradingQueue.filter((c) => c.state === "ai" || c.state === "conference").slice(0, 4);

  return (
    <>
      <PageHead
        id="ADM-01"
        title="오늘 할 일"
        lead={`${round.label} (${round.period}) 기준입니다. 아래 목록을 위에서부터 처리하시면 됩니다.`}
        action={
          <Link href="/admin/grading" className={a.btnPrimary}>
            채점·판정 큐 열기
          </Link>
        }
      />

      {/* ① 할 일 — 대시보드의 첫 화면은 지표가 아니라 처리할 목록이어야 한다 */}
      <section className={`${a.panel} overflow-hidden`}>
        <h2 className="border-b border-exam-line px-5 py-4 adm-t-lg font-black text-exam-text">
          처리 대기 {todo.reduce((s, t) => s + t.count, 0)}건
        </h2>
        <ul>
          {todo.map((t) => (
            <li key={t.label} className="border-b border-exam-line last:border-b-0">
              <Link
                href={t.href}
                className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4 transition-colors hover:bg-exam-raised"
              >
                <span
                  aria-hidden
                  className={`${a.dot} ${t.urgent ? "bg-rose-500" : "bg-exam-line"}`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block adm-t-md font-bold text-exam-text">{t.label}</span>
                  <span className="mt-0.5 block adm-t-sm text-exam-muted">{t.note}</span>
                </span>
                <span
                  className={`adm-t-lg font-black tabular-nums ${
                    t.urgent ? "text-rose-700" : "text-exam-text"
                  }`}
                >
                  {t.count}
                  <span className="ml-1 adm-t-sm font-bold text-exam-muted">{t.unit}</span>
                </span>
                <span className="adm-t-sm font-bold text-brand-700">처리하기 →</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ② 회차 진행 */}
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
