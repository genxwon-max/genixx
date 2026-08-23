"use client";

import { useMemo } from "react";
import { contractLabel, type OrgRow } from "@/lib/admin";
import { n, pct, type Tone } from "@/lib/admin2";
import DataTable, { type Col, type Filter } from "@/components/admin2/DataTable";
import { Bar, Status, Tag } from "@/components/admin2/ui";

/**
 * ADM-07 기관 목록의 표.
 *
 * DataTable이 함수(cell·value·match)를 받으므로 이 조각만 클라이언트로 내린다.
 * page.tsx는 서버에서 합계만 세고, 여기서는 한 줄을 어떻게 그릴지만 정한다.
 *
 * ── 칸 순서 ──
 *  ID · 이름          어느 기관인지 (문의·감사 로그가 ID로 오므로 ID가 맨 앞)
 *  종류 · 지역 · 담당자  누구이고 누구에게 전화하는지
 *  학생수 · 응시권      규모와 남은 자리 — 이 화면을 여는 실제 이유
 *  계약 상태 · 만료일    언제 끊기는지. 결론이므로 오른쪽 끝
 *
 * ── 일부러 뺀 것 ──
 *  · 담당자 연락처·기관 주소: 목록에서 훑을 값이 아니고, 원문 연락처는 이 콘솔의
 *    목록 화면에 두지 않는다. 필요하면 상세에서 사유를 남기고 연다.
 *  · 결제·청구 이력: 응시권 배정으로 이미 규모가 읽히고, 금액은 정산 화면의 몫이다.
 *  · 기관 이름에 링크를 걸지 않았다 — 상세 화면이 아직 없다. 죽은 링크를 두면
 *    매번 눌러 보고 아무 일도 안 일어나는 것을 확인하게 된다.
 */

/* 계약 상태 → 점 색. contractLabel의 className(text-emerald-700 …)은 쓰지 않는다 —
   저쪽은 기존 /admin의 팔레트 색이고, 이 콘솔은 상태에 면·팔레트색을 칠하지 않고
   Status의 점 하나로만 적는다. 가져오는 것은 label 글자뿐이다. */
const contractTone: Record<OrgRow["contract"], Tone> = {
  active: "ok",
  trial: "warn",
  expired: "danger",
};

export default function OrgsTable({ rows, tightAt }: { rows: OrgRow[]; tightAt: number }) {
  const cols = useMemo<Col<OrgRow>[]>(
    () => [
      {
        key: "id",
        head: "기관 ID",
        width: "5.5rem",
        nowrap: true,
        value: (o) => o.id,
        cell: (o) => <span className="a2-mono text-(--a2-ink)">{o.id}</span>,
      },
      {
        // 폭을 주지 않아 남는 자리를 이 칸이 먹는다. 줄바꿈은 막는다 — 한 줄 32px가 무너진다
        key: "name",
        head: "이름",
        nowrap: true,
        value: (o) => o.name,
        cell: (o) => <span className="font-semibold text-(--a2-ink)">{o.name}</span>,
      },
      {
        key: "kind",
        head: "종류",
        width: "5.5rem",
        nowrap: true,
        value: (o) => o.kind,
        cell: (o) => <Tag>{o.kind}</Tag>,
      },
      {
        // 지역·담당자는 좁아지면 접는다. 담당자가 먼저 접히는 것은, 좁은 화면에서
        // 훑는 값은 대개 지역이고 담당자는 한 곳을 정한 뒤에 찾는 값이라서다
        key: "region",
        head: "지역",
        width: "7rem",
        nowrap: true,
        hide: "md",
        value: (o) => o.region,
        cell: (o) => o.region,
      },
      {
        key: "manager",
        head: "담당자",
        width: "5rem",
        nowrap: true,
        hide: "lg",
        value: (o) => o.manager,
        cell: (o) => o.manager,
      },
      {
        key: "students",
        head: "학생수",
        width: "5rem",
        num: true,
        value: (o) => o.students,
        // 0은 —로 감추지 않는다. 계약은 했는데 아직 한 명도 안 붙은 곳이 곧 할 일이다
        cell: (o) => <span className={o.students ? "" : "text-(--a2-ink-4)"}>{n(o.students)}</span>,
      },
      {
        /* 응시권 — 이 화면에서 제일 급한 칸.
           소진율이 tightAt(%)을 넘으면 곧 자리가 모자라므로 셋을 겹쳐 눈에 띄게 한다.
            ① 앞에 빨간 점을 세운다(면을 칠하지 않는 이 콘솔에서 쓸 수 있는 가장 센 표시)
            ② 사용/배정 숫자를 --a2-danger로 물들이고 굵게 — 점만으로는 흑백에서 사라진다
            ③ 정렬 값을 사용량이 아니라 소진율로 둔다. 머리를 한 번 눌러 내림차순으로
               놓으면 급한 기관이 통째로 맨 위에 모인다.
               (500석 중 100석 쓴 곳보다 50석 중 48석 쓴 곳이 먼저다) */
        key: "seats",
        head: "응시권 사용/배정",
        width: "12rem",
        num: true,
        nowrap: true,
        value: (o) => pct(o.seats[0], o.seats[1]),
        cell: (o) => {
          const [used, total] = o.seats;
          const tight = pct(used, total) >= tightAt;
          return (
            <span
              className="inline-flex items-center justify-end gap-2"
              title={tight ? `응시권 소진 ${tightAt}% 이상 — 배정을 늘려야 합니다` : undefined}
            >
              {tight && <span aria-hidden className="a2-dot" style={{ color: "var(--a2-danger)" }} />}
              <span style={tight ? { color: "var(--a2-danger)", fontWeight: 600 } : undefined}>
                {n(used)} / {n(total)}
              </span>
              <Bar value={used} total={total} width="3rem" />
            </span>
          );
        },
      },
      {
        key: "contract",
        head: "계약 상태",
        width: "6rem",
        nowrap: true,
        // 검색창에 만료라고 쳐도 걸리도록, 정렬·검색 값으로 코드가 아니라 표시 글자를 준다
        value: (o) => contractLabel[o.contract].label,
        cell: (o) => <Status tone={contractTone[o.contract]}>{contractLabel[o.contract].label}</Status>,
      },
      {
        // ISO 날짜라 문자열 정렬이 곧 날짜 정렬이다. 오름차순이 곧 만료 임박 순
        key: "until",
        head: "만료일",
        width: "6.5rem",
        nowrap: true,
        value: (o) => o.until,
        cell: (o) => <span className="a2-mono">{o.until}</span>,
      },
    ],
    [tightAt],
  );

  const filters = useMemo<Filter<OrgRow>[]>(
    () => [
      {
        id: "contract",
        label: "계약",
        // 종류 목록은 데이터에서 뽑고, 계약 상태는 contractLabel의 순서(계약중·시범·만료)를
        // 그대로 쓴다 — 이 순서 자체가 급한 정도라 가나다순으로 흐트러뜨리지 않는다
        options: (Object.keys(contractLabel) as OrgRow["contract"][]).map((c) => ({
          value: c,
          label: contractLabel[c].label,
        })),
        match: (o, v) => o.contract === v,
      },
      {
        id: "kind",
        label: "종류",
        // 타입에 있는 네 값을 손으로 적어 두면 데이터가 늘 때 어긋난다. 있는 것만 세운다
        options: [...new Set(rows.map((o) => o.kind))]
          .sort((a, b) => a.localeCompare(b, "ko-KR"))
          .map((k) => ({ value: k, label: k })),
        match: (o, v) => o.kind === v,
      },
    ],
    [rows],
  );

  return (
    <DataTable
      rows={rows}
      cols={cols}
      filters={filters}
      getKey={(o) => o.id}
      // 기관은 서른 곳 남짓이다. 기본 25로 끊으면 소진율 순으로 훑을 때마다 두 쪽을
      // 넘겨야 하므로, 이 표는 한 쪽에 다 세운다
      pageSize={50}
      searchHint="기관명 · ID · 담당자 · 지역"
      empty="조건에 맞는 기관이 없습니다."
    />
  );
}
