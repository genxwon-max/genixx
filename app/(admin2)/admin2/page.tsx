import Link from "next/link";
import { auditLog, caseStates, currentRound, gradingQueue } from "@/lib/admin";
import { change, conversionRate, lastMonth, thisMonth, totalMembers } from "@/lib/adminMetrics";
import { caseTone, n } from "@/lib/admin2";
import { Body, Kpi, PageHead, Panel, SeedNote, Status } from "@/components/admin2/ui";
import TableBox from "@/components/admin2/TableBox";
import RoundsProgress, { CurrentRoundKpi } from "./RoundsProgress";
import Waiting from "./Waiting";

export const metadata = { title: "대시보드" };

/*
 * ADM-01 대시보드 — 슈퍼 관리자용.
 *
 * 기존 /admin 대시보드는 「알림 → 이번 달 → 지금 상태」 세 덩이를 세로로 쌓아 두었다.
 * 여기서는 한 화면(1440×900)에 스크롤 없이 들어오는 것을 목표로 잡았다. 슈퍼 관리자가
 * 아침에 이 화면을 열고 던지는 질문은 넷이고, 그 넷을 네 구역으로 못 박는다 —
 *
 *   ① 이번 달 장사는 어떤가        지표 넉 줄
 *   ② 회차는 어디까지 왔나          회차 표 (진행 막대)
 *   ③ 지금 사람 손이 필요한 건 몇 건  대기 표
 *   ④ 누가 무엇을 만졌나            감사 로그 최근 여섯 줄
 *
 * 설명 문단을 두지 않는다. 매일 여는 화면에서 같은 문장을 다시 읽는 사람은 없고,
 * 그 세 줄이 곧 표 세 줄이다.
 *
 * ⚠ 숫자는 전부 예시다(lib/adminMetrics.ts · lib/admin.ts). 화면에도 그렇게 적어 둔다.
 */

const signupsDelta = change(thisMonth.signups, lastMonth.signups);
const paidDelta = change(thisMonth.paid, lastMonth.paid);

/* 결제 금액은 이 자리에 두지 않는다. 2026 파일럿 회차는 전면 무료로 공지되어 있어
   (lib/pageContent.ts "/service/pricing"), 회차 이름 바로 아래 「결제 금액 700만 원」이
   서면 진단이 그만큼 벌고 있다는 말로 읽힌다. 기존 콘솔도 같은 이유로 뺐다
   (components/admin/BusinessMetrics.tsx). 그 자리에는 회차 제출률을 세운다. */

export default function Admin2Home() {
  const recent = auditLog.slice(0, 6);
  /* 확정된 것은 빼고 센다. state !== "published"로 걸렀더니 「확정 전 6건」이라 적어 놓고
     그 여섯 줄 안에 「판정 확정」이 들어 있었다 — 기둥 배지·처리 대기 표와도 어긋났다. */
  const queue = gradingQueue.filter((c) => c.state === "ai" || c.state === "review" || c.state === "conference");
  /* 미리보기는 여섯 줄까지. No가 세는 것은 「지금 이 표에 서 있는 줄 수」이므로 자리에서
     slice를 부르지 않고 목록을 먼저 뽑아 둔다 — 전체 건수는 판 머리(meta)가 적는다 */
  const shownQueue = queue.slice(0, 6);

  return (
    <>
      <PageHead
        title="대시보드"
        actions={
          <>
            <Link href="/admin2/rounds" className="a2-btn">
              회차 현황
            </Link>
            <Link href="/admin2/queue" className="a2-btn a2-btn-primary">
              판정 큐 열기
            </Link>
          </>
        }
        /* ① 이번 달 */
        stats={
          <>
            <Kpi
              label={`신규 가입 (${thisMonth.full})`}
              value={n(thisMonth.signups)}
              unit="명"
              delta={signupsDelta}
              sub={`지난달 ${n(lastMonth.signups)}`}
            />
            <Kpi
              label="유료 전환"
              value={n(thisMonth.paid)}
              unit="명"
              delta={paidDelta}
              sub={`전환율 ${conversionRate(thisMonth).toFixed(1)}%`}
            />
            <CurrentRoundKpi />
            <Kpi
              label="누적 회원"
              value={n(totalMembers)}
              unit="명"
              sub="학부모·교사 가입 누계"
              href="/admin2/members"
            />
          </>
        }
      />
<Body>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          {/* ② 회차 진행 — 상태가 브라우저 저장소 값이라 판째로 클라이언트다 */}
          <RoundsProgress />

          {/* ③ 대기 — 문항 한 줄이 브라우저 저장소 값이라 판째로 클라이언트다 */}
          <Waiting />
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-2">
          {/* 판정 큐 미리보기 */}
          <Panel
            title="판정 큐"
            meta={`${currentRound.label} · 확정 전 ${queue.length}건`}
            flush
            actions={
              <Link href="/admin2/queue" className="a2-btn a2-btn-sm">
                전체
              </Link>
            }
          >
            <TableBox>
              <table className="a2-table">
                <thead>
                  <tr>
                    <th scope="col" className="a2-th-num" style={{ width: "3rem" }}>
                      No
                    </th>
                    <th scope="col" style={{ width: "7rem" }}>
                      케이스
                    </th>
                    <th scope="col" style={{ width: "6rem" }}>
                      상태
                    </th>
                    <th scope="col" style={{ width: "5rem" }}>
                      제안 축
                    </th>
                    <th scope="col" className="a2-th-num" style={{ width: "4rem" }}>
                      신뢰도
                    </th>
                    <th scope="col">사유</th>
                  </tr>
                </thead>
                <tbody>
                  {shownQueue.map((c, i) => (
                    <tr key={c.id}>
                      <td className="a2-td-num a2-nowrap a2-t-sm text-(--a2-ink-3)">{shownQueue.length - i}</td>
                      <td className="a2-td-key a2-mono a2-nowrap">{c.id}</td>
                      <td className="a2-nowrap">
                        <Status tone={caseTone[c.state]}>{caseStates[c.state].label}</Status>
                      </td>
                      <td className="a2-nowrap">{c.suggested}</td>
                      <td className="a2-td-num">
                        <span style={{ color: c.confidence < 75 ? "var(--a2-danger)" : undefined }}>{c.confidence}</span>
                      </td>
                      <td className="a2-clip a2-t-sm" style={{ width: "100%" }}>
                        {c.flag ?? <span className="text-(--a2-ink-4)">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableBox>
          </Panel>

          {/* ④ 감사 로그 */}
          <Panel
            title="최근 활동"
            meta="감사 로그"
            flush
            actions={
              <Link href="/admin2/audit" className="a2-btn a2-btn-sm">
                전체
              </Link>
            }
          >
            <TableBox>
              <table className="a2-table">
                <thead>
                  <tr>
                    <th scope="col" className="a2-th-num" style={{ width: "3rem" }}>
                      No
                    </th>
                    <th scope="col" style={{ width: "8.5rem" }}>
                      시각
                    </th>
                    <th scope="col" style={{ width: "4.5rem" }}>
                      행위자
                    </th>
                    <th scope="col" style={{ width: "9rem" }}>
                      동작
                    </th>
                    <th scope="col">대상</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((l, i) => (
                    <tr key={l.id}>
                      <td className="a2-td-num a2-nowrap a2-t-sm text-(--a2-ink-3)">{recent.length - i}</td>
                      <td className="a2-mono a2-nowrap a2-t-xs">{l.at.slice(5)}</td>
                      <td className="a2-td-key a2-nowrap">{l.actor}</td>
                      <td className="a2-nowrap">
                        {l.reason && (
                          <span
                            aria-label="사유 입력 대상"
                            title="개인정보 열람 — 사유가 기록됨"
                            className="a2-dot mr-1.5 inline-block align-middle"
                            style={{ color: "var(--a2-warn)" }}
                          />
                        )}
                        {l.action}
                      </td>
                      <td className="a2-clip a2-t-sm" style={{ width: "100%" }}>
                        {l.target}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableBox>
          </Panel>
        </div>

</Body>
      <SeedNote>
        이 콘솔의 숫자는 화면 설계를 위한 예시입니다. 실제 집계가 아니며, 붙일 때는 집계 API 응답으로 갈아 끼웁니다.
        회차 상태 · 기간과 문항 검수 건수만 이 브라우저에 저장된 값에서 읽습니다.
      </SeedNote>
    </>
  );
}
