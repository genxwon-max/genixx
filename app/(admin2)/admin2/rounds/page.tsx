import Link from "next/link";
import { currentRound, roundStates } from "@/lib/admin";
import { QUESTIONS_PER_SUBJECT, assessment, subjects } from "@/lib/exam";
import { n, pct, roundTone } from "@/lib/admin2";
import { DescList, Kpi, PageHead, Panel, SeedNote, Status, Tag } from "@/components/admin2/ui";
import RoundsTable from "./RoundsTable";

export const metadata = { title: "회차·응시" };

/*
 * ADM-05 회차·응시.
 *
 * 이 화면에서 슈퍼 관리자가 던지는 물음은 둘뿐이다 —
 *
 *   ① 지금 회차는 어디까지 왔나        위 지표 넉 줄 + 회차 표의 막대 셋
 *   ② 이번 회차는 무엇을 보고 있나      오른쪽 설정 요약
 *
 * 그래서 왼쪽은 여러 회차를 세로로 견주는 자리, 오른쪽은 지금 회차 한 벌을 세로로
 * 읽는 자리로 갈랐다. 둘을 위아래로 쌓지 않은 것은, 표를 보다가 「이번 회차 국어는
 * 몇 문항이더라」로 넘어갈 때 화면을 굴리지 않게 하려는 것이다.
 *
 * ⚠ 숫자는 전부 예시다(lib/admin.ts). 회차를 실제로 열고 닫은 결과는
 *   lib/roundPlanStore.ts가 브라우저에 들고 있어 서버에서 읽지 못한다. 이 화면은
 *   씨앗값만 그리고, 개폐 단추는 두지 않는다.
 */

/* 과목마다 제한 시간이 갈릴 수 있으므로 값이 하나로 모이면 한 줄로, 갈리면 늘어놓는다.
   「40분」이라고 박아 두면 한 과목만 60분이 된 날 화면이 조용히 거짓말을 한다. */
const limits = Array.from(new Set(subjects.map((s) => s.limitMin)));
const limitText = limits.length === 1 ? `${limits[0]}분` : limits.map((v) => `${v}분`).join(" · ");
const totalMin = subjects.reduce((sum, s) => sum + s.limitMin, 0);
const totalQ = subjects.length * QUESTIONS_PER_SUBJECT;

export default function Admin2Rounds() {
  const r = currentRound;

  return (
    <>
      <PageHead
        title="회차·응시"
        meta={
          <>
            <span>{r.label}</span>
            <span aria-hidden>·</span>
            <span className="a2-mono">{r.period}</span>
            <span aria-hidden>·</span>
            <Status tone={roundTone[r.state]}>{roundStates[r.state].label}</Status>
          </>
        }
        actions={
          <Link href="/admin2/queue" className="a2-btn a2-btn-primary">
            판정 큐 열기
          </Link>
        }
      />

      {/*
       * 지금 회차의 깔때기 넉 줄.
       *
       * 분모를 일부러 두 가지만 쓴다 — 제출은 대상 대비, 판정과 발행은 제출 대비.
       * 판정·발행까지 대상으로 나누면 세 값이 늘 함께 낮아져 어디가 막혔는지 사라진다.
       *
       * 증감(▲▼)은 달지 않았다. 견줄 상대가 지난 회차뿐인데 지금 회차는 아직 진행
       * 중이라, 끝난 회차와 대면 무엇을 재든 늘 내려간 것처럼 보인다.
       */}
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="응시 대상" value={n(r.target)} unit="명" sub={<span className="a2-mono">{r.period}</span>} />
        <Kpi label="제출" value={n(r.submitted)} unit="명" sub={`대상의 ${pct(r.submitted, r.target)}%`} />
        <Kpi
          label="판정 확정"
          value={n(r.graded)}
          unit="명"
          sub={`제출의 ${pct(r.graded, r.submitted)}%`}
          href="/admin2/queue"
        />
        <Kpi label="리포트 발행" value={n(r.published)} unit="명" sub={`제출의 ${pct(r.published, r.submitted)}%`} />
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
        <RoundsTable />

        {/*
         * 이번 회차 설정.
         *
         * 위쪽 넉 줄은 운영이 부르는 회차(lib/admin.ts), 아래쪽은 응시 화면이 쓰는
         * 검사 규격(lib/exam.ts)이다. 두 곳의 회차 이름과 마감일이 지금 서로 다른데,
         * 그 어긋남을 감추지 않고 「응시 화면 표기」로 나란히 적는다 — 붙일 때 한쪽으로
         * 맞춰야 할 자리이고, 화면에 안 보이면 아무도 맞추지 않는다.
         *
         * 문항 목록은 여기 두지 않는다. 어느 문항이 나가는지는 회차 편성(검사지)의
         * 일이고, 이 판은 「몇 과목 · 몇 문항 · 몇 분」까지만 답한다.
         */}
        <Panel title="이번 회차 설정" meta={r.label}>
          <DescList
            rows={[
              { k: "상태", v: <Status tone={roundTone[r.state]}>{roundStates[r.state].label}</Status> },
              { k: "기간", v: <span className="a2-mono">{r.period}</span> },
              { k: "응시 마감", v: <span className="a2-mono">{r.closesOn}</span> },
              {
                k: "과목",
                v: (
                  <span className="flex flex-wrap gap-1">
                    {subjects.map((s) => (
                      <Tag key={s.id}>{s.short}</Tag>
                    ))}
                  </span>
                ),
              },
              {
                k: "과목당 문항",
                v: (
                  <>
                    <span className="a2-num">{QUESTIONS_PER_SUBJECT}</span>문항
                  </>
                ),
              },
              { k: "과목당 시간", v: <span className="a2-num">{limitText}</span> },
              {
                k: "회차 전체",
                v: (
                  <span className="a2-num">
                    {subjects.length}과목 · {totalQ}문항 · {totalMin}분
                  </span>
                ),
              },
              { k: "검사 이름", v: `${assessment.name} (${assessment.ko})` },
              { k: "응시 화면 표기", v: assessment.round },
              { k: "응시 화면 마감", v: <span className="a2-mono">{assessment.deadline}</span> },
            ]}
          />
        </Panel>
      </div>

      <SeedNote>
        이 화면의 숫자는 화면 설계를 위한 예시입니다. 실제 집계가 아니며, 회차 상태와 개폐 기록은 붙일 때 회차
        편성(ADM-05-4)의 값으로 갈아 끼웁니다.
      </SeedNote>
    </>
  );
}
