"use client";

import { contractLabel, type OrgRow } from "@/lib/admin";
import { n, pct } from "@/lib/admin2";
import { useOrgs } from "@/lib/directoryStore";
import { Bar, Kpi, PageHead } from "@/components/admin2/ui";
import OrgsTable from "./OrgsTable";

/**
 * ADM-07 기관 화면의 머리·지표·표.
 *
 * 셋을 한 클라이언트 조각에 묶은 까닭은 하나다 — 지표 넉 칸이 **계약 상태별 기관 수**이고,
 * 계약 상태는 기관 상세(ORG-02-1)에서 고치는 값이다. 서버에서 세어 박아 두면 한 곳을
 * 만료로 돌려놓고 돌아온 화면에서 「계약중 26곳」만 옛 수로 남는다. 응시권 합계도 배정을
 * 고칠 수 있게 되면서 같은 처지가 되었다.
 *
 * page.tsx에는 문서 제목과 예시 데이터 고지만 남는다.
 */

/** 응시권 소진이 이 선을 넘으면 곧 자리가 모자란다 — 배정을 늘리자고 먼저 연락할 기준 */
const TIGHT = 90;

export default function OrgsView() {
  const orgs = useOrgs();

  const countOf = (c: OrgRow["contract"]) => orgs.filter((o) => o.contract === c).length;
  const seatUsed = orgs.reduce((s, o) => s + o.seats[0], 0);
  const seatTotal = orgs.reduce((s, o) => s + o.seats[1], 0);
  const students = orgs.reduce((s, o) => s + o.students, 0);
  /** 기관 단위로 센다 — 합계 소진율은 큰 기관에 묻혀서, 자리가 없는 작은 곳이 안 보인다 */
  const tightCount = orgs.filter((o) => pct(o.seats[0], o.seats[1]) >= TIGHT).length;

  return (
    <>
      <PageHead
        statCols={5}
        title="기관"
        meta={
          <>
            <span>{n(orgs.length)}곳</span>
            <span aria-hidden>·</span>
            <span>
              응시권 <span className="a2-mono">{n(seatUsed)}</span> /{" "}
              <span className="a2-mono">{n(seatTotal)}</span>
            </span>
          </>
        }
        /* 지표 — 계약 상태 넉 칸의 이름은 표의 상태 칸과 같은 글자(contractLabel)를 쓴다.
           지표에서 시범 운영이라 부르고 표에서 체험이라 부르면 같은 값을 두 번 세게 된다 */
        stats={
          <>
            <Kpi label="기관" value={n(orgs.length)} unit="곳" sub={`학생 합계 ${n(students)}명`} />
            <Kpi
              label={contractLabel.active.label}
              value={n(countOf("active"))}
              unit="곳"
              sub={`전체의 ${pct(countOf("active"), orgs.length)}%`}
            />
            <Kpi
              label={contractLabel.trial.label}
              value={n(countOf("trial"))}
              unit="곳"
              sub={`전체의 ${pct(countOf("trial"), orgs.length)}%`}
            />
            <Kpi
              label={contractLabel.expired.label}
              value={n(countOf("expired"))}
              unit="곳"
              sub={`전체의 ${pct(countOf("expired"), orgs.length)}%`}
            />
            {/* 자리 — 배정 합계를 단위 자리에 붙여 사용/배정을 한 눈에 읽게 두고,
                곁들이는 줄에 소진 90% 이상 기관 수를 적는다. 표를 열기 전에
                지금 몇 곳이 급한지가 먼저 보여야 한다 */}
            <Kpi
              label="응시권 사용 / 배정"
              value={n(seatUsed)}
              unit={`/ ${n(seatTotal)}`}
              sub={
                <>
                  <Bar value={seatUsed} total={seatTotal} width="3rem" />
                  <span style={tightCount ? { color: "var(--a2-danger)" } : undefined}>
                    소진 {TIGHT}% 이상 {n(tightCount)}곳
                  </span>
            </>
          }
        />
          </>
        }
      />
      <OrgsTable rows={orgs} tightAt={TIGHT} />
    </>
  );
}
