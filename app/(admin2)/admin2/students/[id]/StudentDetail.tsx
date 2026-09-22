"use client";

import Link from "next/link";
import { useState } from "react";
import { auditLog } from "@/lib/admin";
import { examTone, studentAccountTone } from "@/lib/admin2";
import { useAdminPrefs, useLocalAudit } from "@/lib/adminStore";
import { GRADES, examStateLabel, findMember, type StudentRow } from "@/lib/adminUsers";
import { actOnAccount, patchInfo, reissueCode, usePatches } from "@/lib/directoryStore";
import {
  Field,
  LeaveDialog,
  PageSaveBar,
  useEditDraft,
  useUnsavedGuard,
} from "@/components/admin2/EditGuard";
import { AccountStateBar } from "@/components/admin2/AccountActions";
import { Body, PageHead, Panel, Status } from "@/components/admin2/ui";
import RecordList from "@/components/admin2/RecordList";

/**
 * ADM-02-1-1 학생 상세.
 *
 * 회원 상세(ADM-02-3)와 같은 틀을 쓴다 — 왼쪽 위 되돌아가기, 오른쪽 위 계정 상태,
 * 본문은 위에서 아래로 한 줄(기본정보 → 접속코드 → 기록), 저장은 화면 오른쪽 아래.
 * 같은 콘솔에서 같은 성격의 화면이 서로 다른 자리를 쓰면, 한 화면을 익혀도 다음 화면에서
 * 다시 찾아야 한다.
 *
 * ── 관리자는 다 고친다 ──
 * 이름 · 학교 · 학년 · 생성 날짜를 연다. 예전에는 학년과 메모만 열어 두었는데, 오탈자
 * 하나를 못 고쳐 보호자에게 다시 등록하게 만드는 쪽이 더 이상하다.
 *
 * 셋은 잠근다 —
 *   · **학생 ID**    바꾸면 다른 사람이 된다.
 *   · **응시 상태**  응시가 만들어 내는 값이라 여기서 손대면 실제 응시와 갈린다.
 *   · **보호자**     계정을 옮기는 일이라 이 화면에서 조용히 할 일이 아니다. 이름 대신
 *                    상세로 건너뛰는 링크를 둔다(동명이인에서 이름만으로는 갈린다).
 *
 * 생년월일은 여기에도 두지 않는다 — 목록에 두지 않기로 한 값이고(students/page.tsx),
 * 상세에 두면 목록에서 뺀 뜻이 사라진다.
 *
 * ── 보호자 연락처 ──
 * 보호자 이름 아래에 전화와 메일을 **가리지 않고** 편다. 이 화면에 오는 까닭 절반이
 * 「코드가 안 먹는다」는 문의이고, 그때 필요한 것이 보호자에게 거는 전화다. 이름만 적어
 * 두면 회원 상세로 한 번 건너갔다 돌아와야 한다. 목록은 계속 가린다(lib/adminUsers.ts).
 *
 * ── 접속코드 재발급 ──
 * 코드는 직접 타자로 고치지 않는다. 아무 여덟 자나 넣으면 다른 학생의 코드와 부딪칠 수
 * 있어서, 새 코드는 발급기가 낸다. 그리고 **옛 코드를 감사 기록에 남긴다** — 「코드가
 * 안 먹는다」는 문의가 왔을 때 그 사람이 들고 있는 것이 재발급 전 코드인지 확인할 자리가
 * 그것뿐이다.
 */
export default function StudentDetail({ row }: { row: StudentRow }) {
  const patches = usePatches();
  const localLog = useLocalAudit();
  const prefs = useAdminPrefs();
  const [issued, setIssued] = useState<string | null>(null);

  const patch = patches[row.id] ?? {};
  const state = patch.state ?? row.state;
  const code = patch.code ?? row.code;
  const by = prefs.staffName || "운영자";
  /* 제목과 감사 기록에 적히는 이름은 **저장된** 이름이다 */
  const name = patch.name ?? row.name;
  const label = `학생 ${name}`;
  const gone = state === "withdrawn";

  const info = useEditDraft({
    name: patch.name ?? row.name,
    school: patch.school ?? row.school,
    grade: patch.grade ?? row.grade,
    joinedAt: patch.joinedAt ?? row.joinedAt,
    memo: patch.memo ?? "",
  });
  const saveInfo = () => patchInfo(row.id, info.value, by);
  const guard = useUnsavedGuard(info.dirty, saveInfo);

  /* 보호자는 회원 명부에 있다. 이름만 적어 두면 동명이인에서 갈리므로 상세로 건너뛰게 한다 */
  const guardian = findMember(row.guardianId);

  return (
    <>
      <PageHead
        title={name}
        back={
          <Link href="/admin2/students" className="a2-btn">
            ← 이전으로
          </Link>
        }
        actions={
          <AccountStateBar
            name={name}
            id={row.id}
            state={state}
            tone={studentAccountTone[state]}
            onAct={(next, verb, reason) => actOnAccount(row.id, label, next, verb, reason, by)}
          />
        }
      />

      <Body>
        <div className="grid gap-3">
          <Panel
            title="기본정보"
            meta={patch.at ? `마지막 변경 ${patch.at} · ${patch.by}` : undefined}
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <Field label="학생 ID" value={row.id} readOnly mono />
              <Field
                label="이름"
                value={info.value.name}
                disabled={gone}
                onChange={(v) => info.set("name", v)}
              />
              <Field
                label="학교"
                value={info.value.school}
                disabled={gone}
                onChange={(v) => info.set("school", v)}
              />

              <label className="a2-field block">
                <span className="a2-label">학년</span>
                <select
                  className="a2-select"
                  value={info.value.grade}
                  disabled={gone}
                  onChange={(e) => info.set("grade", e.target.value)}
                >
                  {GRADES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>

              <Field
                label="생성 날짜"
                type="date"
                value={info.value.joinedAt}
                disabled={gone}
                onChange={(v) => info.set("joinedAt", v)}
              />

              <label className="a2-field block sm:col-span-2 xl:col-span-1">
                <span className="a2-label">보호자</span>
                <div className="flex min-h-8 flex-col justify-center gap-0.5">
                  {guardian ? (
                    <>
                      <Link
                        href={`/admin2/members/${row.guardianId}`}
                        className="inline-flex w-fit items-baseline gap-1.5 font-semibold text-(--a2-accent-2) underline"
                      >
                        {row.guardian}
                        <span className="a2-mono a2-t-xs">{row.guardianId}</span>
                      </Link>
                      {guardian.kind === "parent" && (
                        <span className="flex flex-wrap items-center gap-x-2 a2-mono a2-t-xs text-(--a2-ink-3)">
                          <a href={`tel:${guardian.row.phone.replace(/-/g, "")}`} className="underline">
                            {guardian.row.phone}
                          </a>
                          <span aria-hidden>·</span>
                          <a href={`mailto:${guardian.row.contact}`} className="underline">
                            {guardian.row.contact}
                          </a>
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="a2-t-sm text-(--a2-ink-4)">
                      {row.guardian} <span className="a2-mono a2-t-xs">{row.guardianId}</span> —
                      명부에 없음
                    </span>
                  )}
                </div>
              </label>

              <label className="a2-field block">
                <span className="a2-label">응시 상태</span>
                <div className="flex h-8 items-center">
                  <Status tone={examTone[row.exam]}>{examStateLabel[row.exam].label}</Status>
                  <span className="ml-2 a2-t-sm text-(--a2-ink-3)">
                    응시 누적 <span className="a2-num text-(--a2-ink)">{row.attempts}</span>회
                  </span>
                </div>
              </label>
            </div>

            <label className="a2-field mt-3 block">
              <span className="a2-label">운영 메모</span>
              <textarea
                className="a2-textarea"
                value={info.value.memo}
                disabled={gone}
                placeholder="다음에 이 계정을 볼 사람에게 남기는 메모입니다. 개인정보는 적지 않습니다."
                onChange={(e) => info.set("memo", e.target.value)}
              />
            </label>
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
                  새 코드를 냈습니다. 옛 코드는 이제 들어오지 않습니다 — 보호자에게 바뀐 코드를
                  알려 주세요.
                </span>
              </p>
            ) : (
              <p className="a2-hint">
                재발급하면 옛 코드는 곧바로 막히고, 옛 코드가 무엇이었는지는 아래 기록에 남습니다.
              </p>
            )}
          </Panel>

          {/* 기록은 맨 아래. 오늘 할 일이 아니라 되짚어 볼 때 여는 것이다 */}
          <RecordList
            id={row.id}
            server={auditLog}
            local={localLog}
            empty="아직 이 학생에 대한 기록이 없습니다."
          />
        </div>

        <PageSaveBar
          dirty={info.dirty}
          onSave={saveInfo}
          onCancel={info.reset}
          disabled={gone}
          note={gone ? "탈퇴한 계정은 고칠 수 없습니다." : undefined}
        />
      </Body>

      <LeaveDialog guard={guard} />
    </>
  );
}
