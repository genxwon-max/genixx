"use client";

import Link from "next/link";
import { auditLog, contractLabel, type OrgRow } from "@/lib/admin";
import { contractTone, n, pct } from "@/lib/admin2";
import { useAdminPrefs, useLocalAudit } from "@/lib/adminStore";
import { patchInfo, usePatches } from "@/lib/directoryStore";
import RecordList from "@/components/admin2/RecordList";
import { Bar, Body, DescList, PageHead, Panel, SeedNote, Status, Tag } from "@/components/admin2/ui";

/**
 * ORG-02-1 기관 상세 — 한 곳의 계약과 응시권.
 *
 * ── 고칠 수 있는 것 ──
 * 계약 상태 · 만료일 · 담당자 · **배정 응시권** · 운영 메모.
 *
 * 배정을 고칠 수 있게 둔 것이 이 화면의 핵심이다. 목록은 소진율이 높은 곳에 빨간 점을
 * 세우고 「배정을 늘려야 합니다」라고 말하면서 정작 늘릴 자리가 없었다. 부르기만 하고
 * 답할 곳이 없는 화면은 매번 사람을 다른 도구로 내보낸다.
 *
 * **쓴 자리(seats[0])는 고치지 못한다.** 그것은 응시가 만들어 낸 값이라 여기서 줄이면
 * 실제로 시험을 본 아이의 수와 갈린다. 그래서 배정을 쓴 자리보다 적게 넣는 것도 막는다 —
 * 96석을 쓴 곳의 배정을 50으로 두면 소진율이 192%가 되어 목록이 읽히지 않는다.
 *
 * 계정 판(AccountActions)을 두지 않는다. 기관에는 정지·탈퇴가 없고, 대신 계약 상태가
 * 그 일을 한다(계약중 · 시범 · 만료). 없는 동작을 위해 판을 세우지 않는다.
 */
export default function OrgDetail({ row }: { row: OrgRow }) {
  const patches = usePatches();
  const localLog = useLocalAudit();
  const prefs = useAdminPrefs();

  const patch = patches[row.id] ?? {};
  const contract = patch.contract ?? row.contract;
  const until = patch.until ?? row.until;
  const manager = patch.manager ?? row.manager;
  const memo = patch.memo ?? "";
  const by = prefs.staffName || "운영자";

  const used = row.seats[0];
  const total = patch.seats ?? row.seats[1];
  const rate = pct(used, total);
  /* 배정을 쓴 자리 아래로 못 내린다. 입력에 min을 걸어 두고, 그래도 들어오는 값(직접
     타자·붙여넣기)은 여기서 한 번 더 막는다 */
  const setSeats = (v: number) => {
    if (!Number.isFinite(v)) return;
    patchInfo(row.id, { seats: Math.max(used, Math.round(v)) }, by);
  };

  return (
    <>
      <PageHead
        title={row.name}
        meta={
          <>
            <span className="a2-mono text-(--a2-ink-2)">{row.id}</span>
            <Tag>{row.kind}</Tag>
            <Status tone={contractTone[contract]}>{contractLabel[contract].label}</Status>
            <span aria-hidden>·</span>
            {/* 이름표를 「만료」로 두었더니 계약 상태가 만료인 기관에서 「만료 · 만료 2027-01-07」이
                되었다. 상태 이름과 칸 이름이 같은 글자면 둘 중 하나는 안 읽힌다 */}
            <span>
              만료일 <span className="a2-mono">{until}</span>
            </span>
          </>
        }
        actions={
          <Link href="/admin2/orgs" className="a2-btn">
            기관 목록
          </Link>
        }
      />
<Body>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div className="grid content-start gap-3">
            <Panel title="기관" meta="고칠 수 없는 칸">
              <DescList
                rows={[
                  { k: "기관 ID", v: <span className="a2-mono">{row.id}</span> },
                  { k: "이름", v: <span className="font-semibold">{row.name}</span> },
                  { k: "종류", v: <Tag>{row.kind}</Tag> },
                  { k: "지역", v: row.region },
                  {
                    k: "학생 수",
                    v: (
                      <span className="a2-num">
                        {n(row.students)}
                        <span className="a2-t-sm text-(--a2-ink-3)">명</span>
                      </span>
                    ),
                  },
                ]}
              />
            </Panel>

            {/* 고치는 칸 — 저장 단추가 없다. 고치는 즉시 저장한다(lib/directoryStore.ts) */}
            <Panel
              title="계약"
              meta={patch.at ? `마지막 변경 ${patch.at} · ${patch.by}` : "고치면 바로 저장됩니다"}
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="a2-field block">
                  <span className="a2-label">계약 상태</span>
                  <select
                    className="a2-select"
                    value={contract}
                    onChange={(e) =>
                      patchInfo(row.id, { contract: e.target.value as OrgRow["contract"] }, by)
                    }
                  >
                    {(Object.keys(contractLabel) as OrgRow["contract"][]).map((c) => (
                      <option key={c} value={c}>
                        {contractLabel[c].label}
                      </option>
                    ))}
                  </select>
                  <span className="a2-hint">만료로 두면 이 기관의 응시가 막힙니다.</span>
                </label>

                <label className="a2-field block">
                  <span className="a2-label">만료일</span>
                  <input
                    type="date"
                    className="a2-input"
                    value={until}
                    onChange={(e) => patchInfo(row.id, { until: e.target.value }, by)}
                  />
                  <span className="a2-hint">목록은 이 날짜 오름차순이 곧 임박 순입니다.</span>
                </label>

                <label className="a2-field block">
                  <span className="a2-label">담당자</span>
                  <input
                    className="a2-input"
                    value={manager}
                    onChange={(e) => patchInfo(row.id, { manager: e.target.value }, by)}
                  />
                  <span className="a2-hint">기관 쪽에서 연락을 받는 사람입니다.</span>
                </label>
              </div>

              <label className="a2-field mt-3 block">
                <span className="a2-label">운영 메모</span>
                <textarea
                  className="a2-textarea"
                  value={memo}
                  placeholder="다음에 이 기관을 볼 사람에게 남기는 메모입니다."
                  onChange={(e) => patchInfo(row.id, { memo: e.target.value }, by)}
                />
              </label>
            </Panel>
          </div>

          <div className="grid content-start gap-3">
            <Panel title="응시권" meta={`소진 ${rate}%`}>
              <div className="flex items-baseline gap-1.5">
                <span className="a2-metric" style={rate >= 90 ? { color: "var(--a2-danger)" } : undefined}>
                  {n(used)}
                </span>
                <span className="a2-t-sm text-(--a2-ink-3)">/ {n(total)}석</span>
              </div>
              <div className="mt-2">
                <Bar value={used} total={total} width="100%" />
              </div>

              <label className="a2-field mt-3 block">
                <span className="a2-label">배정 응시권</span>
                <input
                  type="number"
                  className="a2-input"
                  value={total}
                  min={used}
                  step={25}
                  onChange={(e) => setSeats(Number(e.target.value))}
                />
                <span className="a2-hint">
                  쓴 자리 <span className="a2-num">{n(used)}</span>석 아래로는 내리지 못합니다 — 이미 응시한 만큼은
                  되돌릴 수 없는 값입니다.
                </span>
              </label>

              {rate >= 90 && (
                <p className="a2-note mt-2" style={{ borderLeftColor: "var(--a2-danger)" }}>
                  <span>자리가 곧 모자랍니다. 배정을 늘리거나 기관에 먼저 연락하세요.</span>
                </p>
              )}
            </Panel>

            <RecordList
              id={row.id}
              server={auditLog}
              local={localLog}
              empty="아직 이 기관에 대한 기록이 없습니다."
            />
          </div>
        </div>

</Body>
      <SeedNote>
        이 기관·응시권 숫자는 화면 설계를 위한 예시입니다. 실제 계약이 아니며, 여기서 바꾼 값은 이 브라우저에만
        남습니다.
      </SeedNote>
    </>
  );
}
