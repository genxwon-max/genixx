"use client";

import { useMemo, useState } from "react";
import { contractLabel, orgs, type OrgRow } from "@/lib/admin";
import DataList, { Picker, type Column } from "./DataList";
import { Badge, CountStrip } from "./Parts";
import * as a from "./ui";

/**
 * 기관 (ADM-07).
 *
 * 콘솔의 다른 목록과 같은 표를 쓴다(DataList). 기관이 스물만 넘어도 「응시권이 바닥난
 * 곳이 어디인가」를 눈으로 훑어 찾게 되는데, 찾기와 거르기가 없으면 그때부터 이
 * 화면은 쓸 수 없다.
 *
 * 응시권은 남은 수를 함께 적는다. 「48 / 50」만 적어 두면 남은 둘을 사람이 매번
 * 빼야 하고, 0이 된 곳은 학생이 응시 화면에 들어가지 못하므로 붉게 적는다.
 */
export default function OrgTable() {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("all");
  const [contract, setContract] = useState("all");

  const kindOptions = useMemo(
    () => [...new Set(orgs.map((o) => o.kind))].map((v) => ({ value: v, label: v })),
    [],
  );

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return orgs.filter(
      (o) =>
        (kind === "all" || o.kind === kind) &&
        (contract === "all" || o.contract === contract) &&
        (!needle ||
          [o.id, o.name, o.region, o.manager].some((f) => f.toLowerCase().includes(needle))),
    );
  }, [q, kind, contract]);

  const filtering = q.trim() !== "" || kind !== "all" || contract !== "all";
  const reset = () => {
    setQ("");
    setKind("all");
    setContract("all");
  };

  const columns: Column<OrgRow>[] = [
    {
      key: "name",
      head: "기관",
      cell: (o) => (
        <span className="block min-w-[11rem]">
          <span className="adm-t-md font-bold text-exam-text">{o.name}</span>
          <span className="mt-0.5 block adm-t-sm text-exam-muted">
            {o.id} · {o.kind} · {o.region}
          </span>
        </span>
      ),
    },
    { key: "manager", head: "담당자", hide: "lg", nowrap: true, cell: (o) => o.manager },
    {
      key: "students",
      head: "등록 학생",
      align: "right",
      nowrap: true,
      cell: (o) => `${o.students.toLocaleString("ko-KR")}명`,
    },
    {
      key: "seats",
      head: "응시권",
      align: "right",
      nowrap: true,
      cell: (o) => {
        const [used, total] = o.seats;
        const left = total - used;
        return (
          <>
            <span className="adm-t-md font-bold tabular-nums text-exam-text">
              {used.toLocaleString("ko-KR")} / {total.toLocaleString("ko-KR")}
            </span>
            <span
              className={`mt-0.5 block adm-t-sm ${
                left === 0 ? "font-bold text-rose-700" : "text-exam-muted"
              }`}
            >
              {left === 0 ? "남은 것 없음" : `${left.toLocaleString("ko-KR")}개 남음`}
            </span>
          </>
        );
      },
    },
    {
      key: "contract",
      head: "계약",
      nowrap: true,
      cell: (o) => (
        <>
          <Badge {...contractLabel[o.contract]} />
          <span className="mt-0.5 block adm-t-sm tabular-nums text-exam-muted">{o.until}</span>
        </>
      ),
    },
    {
      key: "act",
      head: "할 일",
      nowrap: true,
      cell: () => (
        <button type="button" className={a.btnRowGhost}>
          응시권 배정
        </button>
      ),
    },
  ];

  return (
    <>
      <div className="mb-5">
        <CountStrip
          rows={[
            {
              label: "계약중",
              value: orgs.filter((o) => o.contract === "active").length,
              unit: "곳",
            },
            {
              label: "시범 운영",
              value: orgs.filter((o) => o.contract === "trial").length,
              unit: "곳",
            },
            {
              label: "만료",
              value: orgs.filter((o) => o.contract === "expired").length,
              unit: "곳",
              tone: orgs.some((o) => o.contract === "expired") ? "warn" : undefined,
            },
            {
              label: "등록 학생",
              value: orgs.reduce((s, o) => s + o.students, 0),
              unit: "명",
            },
          ]}
        />
      </div>

      <DataList
        rows={rows}
        totalCount={orgs.length}
        columns={columns}
        rowKey={(o) => o.id}
        unit="곳"
        searchPlaceholder="기관번호 · 기관명 · 지역 · 담당자로 찾기"
        query={q}
        onQuery={setQ}
        filtering={filtering}
        onReset={reset}
        emptyText="조건에 맞는 기관이 없습니다."
        filters={
          <>
            <Picker
              label="구분 전체"
              options={kindOptions}
              value={kind}
              onChange={setKind}
              className="w-full sm:w-32"
            />
            <Picker
              label="계약 전체"
              options={[
                { value: "active", label: "계약중" },
                { value: "trial", label: "시범 운영" },
                { value: "expired", label: "만료" },
              ]}
              value={contract}
              onChange={setContract}
              className="w-full sm:w-36"
            />
          </>
        }
      />

      <p className={`${a.hint} mt-3`}>
        응시권이 모자라면 학생이 응시 화면에 들어가지 못합니다. 파일럿 회차는 전액 무료라 금액이
        발생하지 않고, 정식 요금 적용 시점부터 이 숫자가 그대로 정산 근거가 됩니다.
      </p>
    </>
  );
}
