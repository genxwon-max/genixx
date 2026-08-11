import { rounds } from "@/lib/admin";
import { subjects } from "@/lib/exam";
import { PageHead, TableCard, Progress, Badge, StatCard } from "@/components/admin/Parts";
import PermissionGate from "@/components/admin/PermissionGate";
import * as a from "@/components/admin/ui";

export const metadata = { title: "회차·응시 현황 · GENIXX 관리자" };

const roundState = {
  open: { label: "응시 진행중", className: "border-emerald-300 bg-emerald-50 text-emerald-700" },
  grading: { label: "채점중", className: "border-amber-300 bg-amber-50 text-amber-700" },
  closed: { label: "마감", className: "border-exam-line bg-exam-raised text-exam-muted" },
} as const;

/** 이번 회차 과목별 진행 (예시 데이터) */
const bySubject = [
  { id: "korean", started: 782, submitted: 741, forfeited: 12 },
  { id: "math", started: 764, submitted: 703, forfeited: 21 },
  { id: "science", started: 731, submitted: 668, forfeited: 18 },
];

/** 설문 수집 현황 */
const surveyRows = [
  { label: "어머니 설문", got: 612, note: "가장 많이 들어옵니다" },
  { label: "아버지 설문", got: 341, note: "절반 이하 — 안내 문자 재발송 검토" },
  { label: "교사 설문", got: 458, note: "기관 소속 학생만 대상" },
  { label: "설문 없이 진행 선택", got: 74, note: "보호자가 직접 선택한 건" },
];

export default function RoundsPage() {
  const current = rounds[0];

  return (
    <>
      <PageHead
        id="ADM-04"
        title="회차 · 응시 현황"
        lead="지금 열려 있는 회차가 어디까지 왔는지 봅니다. 과목은 한 번에 몰아 보지 않고 따로 응시하므로 과목별로 나눠 표시합니다."
        action={
          <>
            <button type="button" className={a.btnGhost}>
              응시 명단 내려받기
            </button>
            <button type="button" className={a.btnPrimary}>
              새 회차 만들기
            </button>
          </>
        }
      />

      <PermissionGate need="round.manage">
        <section className={`${a.panel} p-6`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="adm-t-xl font-black text-exam-text">{current.label}</h2>
                <Badge {...roundState[current.state]} />
              </div>
              <p className="mt-1.5 adm-t-md text-exam-muted">
                {current.period} · 응시 대상 {current.target.toLocaleString("ko-KR")}명
              </p>
            </div>
            <button type="button" className={a.btnGhost}>
              회차 설정 바꾸기
            </button>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            <Progress label="응시 제출" value={current.submitted} total={current.target} />
            <Progress label="판정 확정" value={current.graded} total={current.submitted} />
            <Progress label="리포트 발행" value={current.published} total={current.submitted} />
          </div>
        </section>

        <div className="mt-6 grid gap-5 xl:grid-cols-2">
          <TableCard title="과목별 응시" caption="한 과목당 4문항 · 제한 시간 40분입니다.">
            <table className={a.table}>
              <thead>
                <tr>
                  <th className={a.th}>과목</th>
                  <th className={a.th}>시작</th>
                  <th className={a.th}>제출</th>
                  <th className={a.th}>포기</th>
                  <th className={a.th}>제출률</th>
                </tr>
              </thead>
              <tbody>
                {bySubject.map((s) => {
                  const subject = subjects.find((x) => x.id === s.id)!;
                  const rate = Math.round((s.submitted / s.started) * 100);
                  return (
                    <tr key={s.id}>
                      <td className={a.tdStrong}>{subject.name}</td>
                      <td className={a.tdNum}>{s.started.toLocaleString("ko-KR")}</td>
                      <td className={a.tdNum}>{s.submitted.toLocaleString("ko-KR")}</td>
                      <td className={a.tdNum}>
                        <span className={s.forfeited > 15 ? "font-bold text-rose-700" : undefined}>
                          {s.forfeited}
                        </span>
                      </td>
                      <td className={a.tdNum}>{rate}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableCard>

          <TableCard
            title="설문 수집"
            caption="설문이 없어도 검사는 진행되지만, 리포트의 '발견의 순간'은 나가지 않습니다."
          >
            <table className={a.table}>
              <thead>
                <tr>
                  <th className={a.th}>설문</th>
                  <th className={a.th}>수집</th>
                  <th className={a.th}>참고</th>
                </tr>
              </thead>
              <tbody>
                {surveyRows.map((r) => (
                  <tr key={r.label}>
                    <td className={a.tdStrong}>{r.label}</td>
                    <td className={a.tdNum}>{r.got.toLocaleString("ko-KR")}건</td>
                    <td className={a.td}>{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <StatCard label="측정하는 재능 축" value={3} unit="개" note="언어 · 수리·논리 · 자연·탐구" />
          <StatCard
            label="이번 회차 미측정 축"
            value={5}
            unit="개"
            note="공간·청각·신체·관계·자기이해 — 2027 심화진단"
          />
          <StatCard label="평균 응시 소요" value="27" unit="분" note="과목당 · 제한 40분" />
        </div>

        <div className="mt-6">
          <TableCard title="지난 회차" caption="마감된 회차는 자료를 읽기만 할 수 있습니다.">
          <table className={a.table}>
            <thead>
              <tr>
                <th className={a.th}>회차</th>
                <th className={a.th}>기간</th>
                <th className={a.th}>상태</th>
                <th className={a.th}>대상</th>
                <th className={a.th}>제출</th>
                <th className={a.th}>발행</th>
                <th className={a.th}>할 일</th>
              </tr>
            </thead>
            <tbody>
              {rounds.map((r) => (
                <tr key={r.id}>
                  <td className={a.tdStrong}>{r.label}</td>
                  <td className={a.td}>{r.period}</td>
                  <td className={a.td}>
                    <Badge {...roundState[r.state]} />
                  </td>
                  <td className={a.tdNum}>{r.target.toLocaleString("ko-KR")}</td>
                  <td className={a.tdNum}>{r.submitted.toLocaleString("ko-KR")}</td>
                  <td className={a.tdNum}>{r.published.toLocaleString("ko-KR")}</td>
                  <td className={a.td}>
                    <button type="button" className={a.btnRowGhost}>
                      자세히 보기
                    </button>
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          </TableCard>
        </div>
      </PermissionGate>
    </>
  );
}
