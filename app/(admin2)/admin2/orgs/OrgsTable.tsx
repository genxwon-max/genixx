"use client";

import Link from "next/link";
import { useMemo } from "react";
import { contractLabel, type OrgRow } from "@/lib/admin";
import { contractTone, n } from "@/lib/admin2";
import DataTable, { type Col, type Filter } from "@/components/admin2/DataTable";
import { Status, Tag } from "@/components/admin2/ui";

/**
 * ADM-07 기관 목록의 표.
 *
 * DataTable이 함수(cell·value·match)를 받으므로 이 조각만 클라이언트로 내린다.
 * page.tsx는 서버에서 합계만 세고, 여기서는 한 줄을 어떻게 그릴지만 정한다.
 *
 * ── 칸 순서 ──
 *  ID · 이름          어느 기관인지 (문의·감사 로그가 ID로 오므로 ID가 맨 앞)
 *  종류 · 지역 · 담당자  누구이고 누구에게 전화하는지
 *  학생수            규모
 *  계약 상태 · 만료일    언제 끊기는지. 결론이므로 오른쪽 끝
 *
 * ── 일부러 뺀 것 ──
 *  · 응시권 사용/배정: 위 탭이 「응시권 90%↑」로 급한 곳을 이미 모아 주고, 몇 석이
 *    남았는지는 상세에서 막대와 함께 본다. 열두 칸짜리 표에서 한 칸을 두 값(사용·배정)과
 *    막대에 내주고 있었다.
 *  · 담당자 연락처·기관 주소: 목록에서 훑을 값이 아니고, 원문 연락처는 이 콘솔의
 *    목록 화면에 두지 않는다. 필요하면 상세에서 사유를 남기고 연다.
 *  · 결제·청구 이력: 응시권 배정으로 이미 규모가 읽히고, 금액은 정산 화면의 몫이다.
 *  · 기관 이름에 링크를 걸지 않았다. 상세 화면은 생겼지만(ORG-02-1) 한 줄에서 가는
 *    길은 오른쪽 끝의 「수정하기」 하나로 둔다 — 이름과 단추 둘 다 같은 곳으로 가면
 *    회원·학생 목록과 줄에서 손이 가는 자리가 달라진다.
 */

export default function OrgsTable({ rows, empty }: { rows: OrgRow[]; empty: string }) {
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
      {
        // 오른쪽 끝의 관리 칸 — 회원·학생 목록과 같은 자리에 같은 말로 세운다.
        // 정렬·검색을 달지 않는다: value가 없으면 머리 행이 눌리는 단추가 되지 않는다
        key: "act",
        head: "관리",
        width: "5.5rem",
        nowrap: true,
        cell: (o) => (
          <Link href={`/admin2/orgs/${o.id}`} className="a2-btn a2-btn-sm" aria-label={`${o.name} 수정하기`}>
            수정하기
          </Link>
        ),
      },
    ],
    [],
  );

  /* 계약 상태는 머리의 탭이 맡는다(OrgsView). 같은 조건을 두 군데서 걸면 탭에서
     「만료」를 고른 채 거르개에서 「계약중」을 골라 0줄이 나온다 */
  const filters = useMemo<Filter<OrgRow>[]>(
    () => [
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
      empty={empty}
      // 줄 수는 끈다 — 탭의 개수 알약과 쪽 넘김 줄이 이미 같은 수를 적는다
      showCount={false}
    />
  );
}
