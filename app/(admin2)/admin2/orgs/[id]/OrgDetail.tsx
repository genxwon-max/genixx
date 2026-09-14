"use client";

import Link from "next/link";
import { auditLog, contractLabel, type OrgRow } from "@/lib/admin";
import { contractTone, n, pct } from "@/lib/admin2";
import { useAdminPrefs, useLocalAudit } from "@/lib/adminStore";
import { REGIONS } from "@/lib/adminUsers";
import { patchInfo, usePatches } from "@/lib/directoryStore";
import RecordList from "@/components/admin2/RecordList";
import {
  Field,
  LeaveDialog,
  PageSaveBar,
  useEditDraft,
  useUnsavedGuard,
} from "@/components/admin2/EditGuard";
import { Bar, Body, PageHead, Panel, Status } from "@/components/admin2/ui";

/**
 * ORG-02-1 기관 상세 — 한 곳의 계약과 응시권.
 *
 * 회원 상세(ADM-02-3) · 학생 상세(ADM-02-1-1)와 같은 틀을 쓴다 — 왼쪽 위 되돌아가기,
 * 오른쪽 위 지금 상태, 본문은 위에서 아래로 한 줄(기본정보 → 응시권 → 기록), 저장은
 * 화면 오른쪽 아래에 고정. 같은 성격의 화면이 서로 다른 자리를 쓰면 한 화면을 익혀도
 * 다음 화면에서 다시 찾아야 한다.
 *
 * ── 머리에 세우는 것이 계약 상태인 까닭 ──
 * 회원 화면에서 제일 먼저 확인하는 것이 「이 계정이 살아 있는가」라면, 기관에서는
 * 「이 계약이 살아 있는가」다. 다만 단추는 달지 않는다 — 기관에는 정지·삭제가 없고
 * 그 일을 계약 상태가 대신하는데, 그것은 아래 칸에서 고르는 값이지 머리에서 누르는
 * 동작이 아니다. 배지만 세운다.
 *
 * ── 관리자는 다 고친다 ──
 * 이름 · 종류 · 지역 · 학생 수 · 계약 상태 · 만료일 · 담당자 · 배정 응시권 · 메모.
 * 예전에는 앞의 넷을 「고칠 수 없는 칸」 판에 가둬 두었는데, 학원이 이름을 바꾸거나
 * 분원이 갈라져 나가는 일이 실제로 있고 그때 고칠 자리가 없었다.
 *
 * 둘만 잠긴다 —
 *   · **기관 ID**   바꾸면 다른 기관이 된다.
 *   · **쓴 자리**   응시가 만들어 낸 값이라 여기서 줄이면 실제로 시험을 본 아이의 수와
 *                   갈린다. 그래서 배정을 쓴 자리보다 적게 넣는 것도 저장할 때 막는다 —
 *                   96석을 쓴 곳의 배정을 50으로 두면 소진율이 192%가 되어 목록이 안 읽힌다.
 */
export default function OrgDetail({ row }: { row: OrgRow }) {
  const patches = usePatches();
  const localLog = useLocalAudit();
  const prefs = useAdminPrefs();

  const patch = patches[row.id] ?? {};
  const by = prefs.staffName || "운영자";
  const used = row.seats[0];
  /* 제목과 머리 배지는 **저장된** 값을 그린다. 고치는 중인 값을 비추면 저장하지 않고
     나간 뒤에도 그렇게 바뀐 줄 알게 된다 */
  const name = patch.name ?? row.name;
  const contract = patch.contract ?? row.contract;

  const info = useEditDraft({
    name: patch.name ?? row.name,
    kind: patch.kind ?? row.kind,
    region: patch.region ?? row.region,
    students: patch.students ?? row.students,
    contract: patch.contract ?? row.contract,
    until: patch.until ?? row.until,
    manager: patch.manager ?? row.manager,
    seats: patch.seats ?? row.seats[1],
    memo: patch.memo ?? "",
  });
  const save = () =>
    patchInfo(row.id, { ...info.value, seats: Math.max(used, Math.round(info.value.seats)) }, by);
  const guard = useUnsavedGuard(info.dirty, save);

  const total = info.value.seats;
  const rate = pct(used, total);

  return (
    <>
      <PageHead
        title={name}
        back={
          <Link href="/admin2/orgs" className="a2-btn">
            ← 이전으로
          </Link>
        }
        actions={
          <span className="flex items-center gap-1.5">
            <span className="a2-t-xs text-(--a2-ink-4)">계약 상태</span>
            <Status tone={contractTone[contract]}>{contractLabel[contract].label}</Status>
          </span>
        }
      />

      <Body>
        <div className="grid gap-3">
          <Panel
            title="기본정보"
            meta={patch.at ? `마지막 변경 ${patch.at} · ${patch.by}` : undefined}
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <Field label="기관 ID" value={row.id} readOnly mono />
              <Field
                label="이름"
                value={info.value.name}
                onChange={(v) => info.set("name", v)}
              />

              <label className="a2-field block">
                <span className="a2-label">종류</span>
                <select
                  className="a2-select"
                  value={info.value.kind}
                  onChange={(e) => info.set("kind", e.target.value as OrgRow["kind"])}
                >
                  {(["학원", "학교", "교육원", "교육청"] as OrgRow["kind"][]).map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </label>

              <label className="a2-field block">
                <span className="a2-label">지역</span>
                <select
                  className="a2-select"
                  value={info.value.region}
                  onChange={(e) => info.set("region", e.target.value)}
                >
                  {REGIONS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>

              <Field
                label="학생 수"
                type="number"
                value={info.value.students}
                onChange={(v) => info.set("students", Number(v))}
              />

              <label className="a2-field block">
                <span className="a2-label">계약 상태</span>
                <select
                  className="a2-select"
                  value={info.value.contract}
                  onChange={(e) => info.set("contract", e.target.value as OrgRow["contract"])}
                >
                  {(Object.keys(contractLabel) as OrgRow["contract"][]).map((c) => (
                    <option key={c} value={c}>
                      {contractLabel[c].label}
                    </option>
                  ))}
                </select>
              </label>

              <Field
                label="만료일"
                type="date"
                value={info.value.until}
                onChange={(v) => info.set("until", v)}
              />
              <Field
                label="담당자"
                value={info.value.manager}
                onChange={(v) => info.set("manager", v)}
              />
            </div>

            <label className="a2-field mt-3 block">
              <span className="a2-label">운영 메모</span>
              <textarea
                className="a2-textarea"
                value={info.value.memo}
                placeholder="다음에 이 기관을 볼 사람에게 남기는 메모입니다."
                onChange={(e) => info.set("memo", e.target.value)}
              />
            </label>
          </Panel>

          <Panel title="응시권" meta={`소진 ${rate}%`}>
            <div className="flex items-baseline gap-1.5">
              <span
                className="a2-metric"
                style={rate >= 90 ? { color: "var(--a2-danger)" } : undefined}
              >
                {n(used)}
              </span>
              <span className="a2-t-sm text-(--a2-ink-3)">/ {n(total)}석</span>
            </div>
            <div className="mt-2">
              <Bar value={used} total={total} width="100%" />
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <Field label="쓴 자리" value={used} readOnly />
              <Field
                label="배정 응시권"
                type="number"
                value={total}
                onChange={(v) => info.set("seats", Number(v))}
              />
            </div>

            {rate >= 90 && (
              <p className="a2-note mt-2" style={{ borderLeftColor: "var(--a2-danger)" }}>
                <span>자리가 곧 모자랍니다. 배정을 늘리거나 기관에 먼저 연락하세요.</span>
              </p>
            )}
          </Panel>

          {/* 기록은 맨 아래. 오늘 할 일이 아니라 되짚어 볼 때 여는 것이다 */}
          <RecordList
            id={row.id}
            server={auditLog}
            local={localLog}
            empty="아직 이 기관에 대한 기록이 없습니다."
          />
        </div>

        <PageSaveBar
          dirty={info.dirty}
          onSave={save}
          onCancel={info.reset}
          note={
            info.dirty && info.value.seats < used
              ? `배정은 쓴 자리 ${n(used)}석까지만 내려갑니다.`
              : undefined
          }
        />
      </Body>

      <LeaveDialog guard={guard} />
    </>
  );
}
