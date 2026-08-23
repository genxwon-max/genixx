import { contractLabel, type OrgRow } from "@/lib/admin";
import { orgDirectory } from "@/lib/adminUsers";
import { n, pct } from "@/lib/admin2";
import { Bar, Kpi, PageHead, SeedNote } from "@/components/admin2/ui";
import OrgsTable from "./OrgsTable";

export const metadata = { title: "기관" };

/*
 * ADM-07 기관 — 계약을 맺은 곳의 목록 하나.
 *
 * 슈퍼 관리자가 이 화면을 여는 이유는 둘뿐이다.
 *   ① 계약이 언제 끊기나        → 상태 넉 칸 + 만료일 정렬
 *   ② 응시권 자리가 남아 있나    → 배정 대비 사용 합계 + 표의 소진율
 * 그래서 지표 줄도 딱 그 둘로 갈랐다. 앞 넉 칸은 계약, 마지막 한 칸은 자리다.
 *
 * 기관 종류·지역별 분포 같은 것은 두지 않았다. 분포는 분기에 한 번 보는 값이고,
 * 매일 여는 화면에서 그 자리는 표 넉 줄을 밀어낸다. 종류·지역은 표의 거르개로 족하다.
 */

/** 응시권 소진이 이 선을 넘으면 곧 자리가 모자란다 — 배정을 늘리자고 먼저 연락할 기준 */
const TIGHT = 90;

const orgs = orgDirectory;
const countOf = (c: OrgRow["contract"]) => orgs.filter((o) => o.contract === c).length;

const seatUsed = orgs.reduce((s, o) => s + o.seats[0], 0);
const seatTotal = orgs.reduce((s, o) => s + o.seats[1], 0);
const students = orgs.reduce((s, o) => s + o.students, 0);
/** 기관 단위로 센다 — 합계 소진율은 큰 기관에 묻혀서, 자리가 없는 작은 곳이 안 보인다 */
const tightCount = orgs.filter((o) => pct(o.seats[0], o.seats[1]) >= TIGHT).length;

export default function Admin2Orgs() {
  return (
    <>
      <PageHead
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
      />

      {/* 지표 — 계약 상태 넉 칸의 이름은 표의 상태 칸과 같은 글자(contractLabel)를 쓴다.
          지표에서 시범 운영이라 부르고 표에서 체험이라 부르면 같은 값을 두 번 세게 된다 */}
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
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
      </div>

      <div className="mt-3">
        <OrgsTable rows={orgs} tightAt={TIGHT} />
      </div>

      <SeedNote>
        이 화면의 기관·응시권 숫자는 화면 설계를 위한 예시입니다. 실제 계약이 아니며, 붙일 때는 기관 목록 API의
        응답으로 갈아 끼웁니다.
      </SeedNote>
    </>
  );
}
