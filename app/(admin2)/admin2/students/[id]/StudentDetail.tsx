"use client";

import Link from "next/link";
import { useState } from "react";
import { auditLog } from "@/lib/admin";
import { examTone, studentAccountTone } from "@/lib/admin2";
import { useAdminPrefs, useLocalAudit } from "@/lib/adminStore";
import {
  GRADES,
  examStateLabel,
  findMember,
  userStateLabel,
  type StudentRow,
} from "@/lib/adminUsers";
import { actOnAccount, patchInfo, reissueCode, usePatches } from "@/lib/directoryStore";
import { Body, DescList, PageHead, Panel, SeedNote, Status } from "@/components/admin2/ui";
import RecordList from "@/components/admin2/RecordList";
import AccountActions from "@/components/admin2/AccountActions";

/**
 * ADM-02-1-1 학생 상세.
 *
 * ── 고칠 수 있는 것 ──
 * 학년 · 운영 메모 · 계정 상태, 그리고 접속코드 재발급. 이름·학교·보호자는 칸을 만들지
 * 않았다. 학교는 보호자가 등록할 때 고르는 값이고, 보호자를 바꾸는 일은 계정을 옮기는
 * 일이라 이 화면에서 조용히 할 일이 아니다.
 *
 * 생년월일은 여기에도 두지 않는다 — 목록에 두지 않기로 한 값이고(students/page.tsx),
 * 상세에 두면 목록에서 뺀 뜻이 사라진다.
 *
 * ── 접속코드 재발급 ──
 * 목록에 있던 「코드 재발급」은 눌러도 아무 일이 없는 자리만이었다. 여기로 옮겨 실제로
 * 새 코드를 내고, **옛 코드를 감사 기록에 남긴다** — 「코드가 안 먹는다」는 문의가 왔을 때
 * 그 사람이 들고 있는 것이 재발급 전 코드인지 확인할 자리가 그것뿐이다.
 */
export default function StudentDetail({ row }: { row: StudentRow }) {
  const patches = usePatches();
  const localLog = useLocalAudit();
  const prefs = useAdminPrefs();
  const [issued, setIssued] = useState<string | null>(null);

  const patch = patches[row.id] ?? {};
  const state = patch.state ?? row.state;
  const grade = patch.grade ?? row.grade;
  const code = patch.code ?? row.code;
  const memo = patch.memo ?? "";
  const by = prefs.staffName || "운영자";
  const label = `학생 ${row.name}`;
  const gone = state === "withdrawn";

  /* 보호자는 회원 명부에 있다. 이름만 적어 두면 동명이인에서 갈리므로 상세로 건너뛰게 한다 */
  const guardian = findMember(row.guardianId);

  return (
    <>
      <PageHead
        title={row.name}
        meta={
          <>
            <span className="a2-mono text-(--a2-ink-2)">{row.id}</span>
            <Status tone={studentAccountTone[state]}>{userStateLabel[state].label}</Status>
            <Status tone={examTone[row.exam]}>{examStateLabel[row.exam].label}</Status>
            <span aria-hidden>·</span>
            <span>
              등록 <span className="a2-mono">{row.joinedAt}</span>
            </span>
          </>
        }
        actions={
          <>
            <Link href="/admin2/students" className="a2-btn">
              학생 목록
            </Link>
            {guardian && (
              <Link href={`/admin2/members/${row.guardianId}`} className="a2-btn">
                보호자 계정
              </Link>
            )}
          </>
        }
      />
<Body>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div className="grid content-start gap-3">
            <Panel title="신원" meta="고칠 수 없는 칸">
              <DescList
                rows={[
                  { k: "학생 ID", v: <span className="a2-mono">{row.id}</span> },
                  { k: "이름", v: <span className="font-semibold">{row.name}</span> },
                  { k: "학교", v: row.school },
                  {
                    k: "보호자",
                    v: guardian ? (
                      <Link
                        href={`/admin2/members/${row.guardianId}`}
                        className="inline-flex items-baseline gap-1.5 font-semibold text-(--a2-accent-2) underline"
                      >
                        {row.guardian}
                        <span className="a2-mono a2-t-xs">{row.guardianId}</span>
                      </Link>
                    ) : (
                      <span className="text-(--a2-ink-4)">
                        {row.guardian} <span className="a2-mono a2-t-xs">{row.guardianId}</span> — 명부에 없음
                      </span>
                    ),
                  },
                  {
                    k: "응시 상태",
                    v: <Status tone={examTone[row.exam]}>{examStateLabel[row.exam].label}</Status>,
                  },
                  { k: "등록일", v: <span className="a2-mono">{row.joinedAt}</span> },
                ]}
              />
            </Panel>

            <Panel
              title="접속코드"
              meta="8자리 · 이 코드로만 시험에 들어옵니다"
              actions={
                <button
                  type="button"
                  className="a2-btn a2-btn-sm"
                  disabled={gone}
                  onClick={() => setIssued(reissueCode(row.id, label, code, by))}
                >
                  재발급
                </button>
              }
            >
              <p className="a2-metric text-(--a2-ink)">{code}</p>
              {issued ? (
                <p className="a2-note mt-2" style={{ borderLeftColor: "var(--a2-ok)" }}>
                  <span>
                    새 코드를 냈습니다. 옛 코드는 이제 들어오지 않습니다 — 보호자에게 바뀐 코드를 알려 주세요.
                  </span>
                </p>
              ) : (
                <p className="a2-hint">
                  재발급하면 옛 코드는 곧바로 막히고, 옛 코드가 무엇이었는지는 아래 기록에 남습니다.
                </p>
              )}
            </Panel>

            {/* 고치는 칸 — 저장 단추가 없다. 고치는 즉시 저장한다(lib/directoryStore.ts) */}
            <Panel
              title="운영 정보"
              meta={patch.at ? `마지막 변경 ${patch.at} · ${patch.by}` : "고치면 바로 저장됩니다"}
            >
              <div className="grid gap-3 sm:grid-cols-[9rem_minmax(0,1fr)]">
                <label className="a2-field block">
                  <span className="a2-label">학년</span>
                  <select
                    className="a2-select"
                    value={grade}
                    disabled={gone}
                    onChange={(e) => patchInfo(row.id, { grade: e.target.value }, by)}
                  >
                    {GRADES.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                  <span className="a2-hint">진급·오등록 정정에 씁니다.</span>
                </label>

                <label className="a2-field block">
                  <span className="a2-label">운영 메모</span>
                  <textarea
                    className="a2-textarea"
                    value={memo}
                    disabled={gone}
                    placeholder="다음에 이 계정을 볼 사람에게 남기는 메모입니다. 개인정보는 적지 않습니다."
                    onChange={(e) => patchInfo(row.id, { memo: e.target.value }, by)}
                  />
                  <span className="a2-hint">
                    이 메모는 감사 로그에 남지 않습니다 — 계정을 막거나 여는 조치만 기록됩니다.
                  </span>
                </label>
              </div>
            </Panel>
          </div>

          <div className="grid content-start gap-3">
            <AccountActions
              id={row.id}
              name={row.name}
              state={state}
              tone={studentAccountTone[state]}
              changed={patch.state != null}
              at={patch.at}
              by={patch.by}
              onAct={(next, verb, reason) => actOnAccount(row.id, label, next, verb, reason, by)}
            />

            <RecordList
              id={row.id}
              server={auditLog}
              local={localLog}
              empty="아직 이 학생에 대한 기록이 없습니다."
            />
          </div>
        </div>

</Body>
      <SeedNote>
        이 학생·보호자·접속코드는 화면 설계를 위한 예시입니다. 실제 응시자가 아니며, 여기서 바꾼 값은 이 브라우저에만
        남습니다.
      </SeedNote>
    </>
  );
}
