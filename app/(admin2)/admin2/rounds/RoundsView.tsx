"use client";

import Link from "next/link";
import { roundStates } from "@/lib/admin";
import { QUESTIONS_PER_SUBJECT, assessment, subjects } from "@/lib/exam";
import { n, pct, roundTone } from "@/lib/admin2";
import { useForms } from "@/lib/formStore";
import { planOf, useCurrentRound, usePlans } from "@/lib/roundPlanStore";
import { Body, DescList, Kpi, PageHead, Panel, SeedNote, Status, Tag } from "@/components/admin2/ui";
import RoundsTable from "./RoundsTable";

/**
 * ADM-05 회차·응시.
 *
 * 이 화면에서 슈퍼 관리자가 던지는 물음은 셋이다 —
 *
 *   ① 지금 회차는 어디까지 왔나        위 지표 넉 줄 + 회차 표의 막대 셋
 *   ② 이번 회차는 무엇을 보고 있나      오른쪽 요약
 *   ③ 다음 회차는 짜 두었나            표의 편성 칸 · 오른쪽 위 편성 단추
 *
 * 화면 전체가 클라이언트다. 회차 상태·기간·편성이 브라우저 저장소에 있어(lib/
 * roundPlanStore.ts · lib/formStore.ts) 서버에서 읽으면 씨앗값만 나오기 때문이다.
 * 예전에는 표만 살아 있는 값을 그리고 머리와 오른쪽 요약은 씨앗을 그려서, 회차를 연
 * 직후 같은 화면 안에서 「응시 진행중」과 「준비중」이 함께 서 있었다.
 */
export default function RoundsView() {
  const plans = usePlans();
  const forms = useForms();

  const r = useCurrentRound();
  const plan = planOf(plans, r.id);

  /* 과목마다 제한 시간이 갈릴 수 있으므로 값이 하나로 모이면 한 줄로, 갈리면 늘어놓는다.
     「40분」이라고 박아 두면 한 과목만 60분이 된 날 화면이 조용히 거짓말을 한다. */
  const limits = Array.from(new Set(subjects.map((s) => s.limitMin)));
  const limitText = limits.length === 1 ? `${limits[0]}분` : limits.map((v) => `${v}분`).join(" · ");
  const totalMin = subjects.reduce((sum, s) => sum + s.limitMin, 0);

  const mine = forms.filter((f) => f.round === r.id);
  const confirmed = mine.filter((f) => f.state === "confirmed");
  const going = confirmed.reduce((sum, f) => sum + f.itemIds.length, 0);

  return (
    <>
      <PageHead
        title="회차·응시"
        meta={
          <>
            <span>{r.label}</span>
            <span aria-hidden>·</span>
            <span className="a2-mono">
              {plan.opensOn} – {plan.closesOn}
            </span>
            <span aria-hidden>·</span>
            <Status tone={roundTone[plan.state]}>{roundStates[plan.state].label}</Status>
          </>
        }
        actions={
          <>
            <Link href="/admin2/queue" className="a2-btn">
              판정 큐
            </Link>
            <Link href={`/admin2/rounds/${r.id}`} className="a2-btn a2-btn-primary">
              회차 편성
            </Link>
          </>
        }
        /* 지금 회차의 깔때기 넉 줄.
           분모를 일부러 두 가지만 쓴다 — 제출은 대상 대비, 판정과 발행은 제출 대비.
           판정·발행까지 대상으로 나누면 세 값이 늘 함께 낮아져 어디가 막혔는지 사라진다.
           증감(▲▼)은 달지 않았다. 견줄 상대가 지난 회차뿐인데 지금 회차는 아직 진행
           중이라, 끝난 회차와 대면 무엇을 재든 늘 내려간 것처럼 보인다. */
        stats={
          <>
            <Kpi
              label="응시 대상"
              value={n(r.target)}
              unit="명"
              sub={<span className="a2-mono">마감 {plan.closesOn}</span>}
            />
            {/* 분모가 0인 회차(아직 응시가 시작되지 않은 회차)에서는 비율을 적지 않는다.
                「대상의 0%」는 아무도 안 냈다는 말로 읽히는데, 실제로는 아직 셀 것이 없다는
                뜻이다. 둘은 운영에서 전혀 다른 상황이다. */}
            <Kpi
              label="제출"
              value={n(r.submitted)}
              unit="명"
              sub={r.target ? `대상의 ${pct(r.submitted, r.target)}%` : "아직 응시 전"}
            />
            <Kpi
              label="판정 확정"
              value={n(r.graded)}
              unit="명"
              sub={r.submitted ? `제출의 ${pct(r.graded, r.submitted)}%` : "제출 없음"}
              href="/admin2/queue"
            />
            <Kpi
              label="리포트 발행"
              value={n(r.published)}
              unit="명"
              sub={r.submitted ? `제출의 ${pct(r.published, r.submitted)}%` : "제출 없음"}
            />
          </>
        }
      />
<Body>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
          <RoundsTable />

          {/*
           * 이번 회차 요약.
           *
           * 위쪽은 편성에서 정한 값(상태·기간·검사지), 아래쪽은 응시 화면이 쓰는 검사
           * 규격(lib/exam.ts)이다. 두 곳의 회차 이름과 마감일이 지금 서로 다른데, 그
           * 어긋남을 감추지 않고 「응시 화면 표기」로 나란히 적는다 — 붙일 때 한쪽으로
           * 맞춰야 할 자리이고, 화면에 안 보이면 아무도 맞추지 않는다.
           */}
          <Panel
            title="이번 회차"
            meta={r.label}
            actions={
              <Link href={`/admin2/rounds/${r.id}`} className="a2-btn a2-btn-sm">
                편성 열기
              </Link>
            }
          >
            <DescList
              rows={[
                { k: "상태", v: <Status tone={roundTone[plan.state]}>{roundStates[plan.state].label}</Status> },
                {
                  k: "응시 기간",
                  v: (
                    <span className="a2-mono">
                      {plan.opensOn} – {plan.closesOn}
                    </span>
                  ),
                },
                {
                  k: "편성",
                  v:
                    mine.length === 0 ? (
                      <span className="text-(--a2-ink-4)">아직 없음</span>
                    ) : (
                      <>
                        <span className="a2-num">
                          {confirmed.length}/{mine.length}
                        </span>
                        벌 확정 · 나가는 문항 <span className="a2-num">{n(going)}</span>
                      </>
                    ),
                },
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
                      {subjects.length}과목 · {subjects.length * QUESTIONS_PER_SUBJECT}문항 · {totalMin}분
                    </span>
                  ),
                },
                { k: "검사 이름", v: `${assessment.name} (${assessment.ko})` },
                { k: "응시 화면 표기", v: assessment.round },
                { k: "응시 화면 마감", v: <span className="a2-mono">{assessment.deadline}</span> },
              ]}
            />
            <p className="a2-hint">
              과목당 문항·시간은 응시 화면의 규격(lib/exam.ts)입니다. 실제로 나가는 문항 수는 편성한 검사지가 정합니다.
            </p>
          </Panel>
        </div>

</Body>
      <SeedNote>
        응시 대상 · 제출 · 판정 · 발행은 화면 설계를 위한 예시입니다(lib/admin.ts). 상태 · 기간 · 편성은 이
        브라우저에 저장된 편성 기록에서 읽습니다.
      </SeedNote>
    </>
  );
}
