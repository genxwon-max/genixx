"use client";

import Link from "next/link";
import { auditLog } from "@/lib/admin";
import { accountTone, n } from "@/lib/admin2";
import { useAdminPrefs, useLocalAudit } from "@/lib/adminStore";
import { REGIONS, memberKindLabel, type FoundMember } from "@/lib/adminUsers";
import { actOnAccount, patchInfo, usePatches, useStudents } from "@/lib/directoryStore";
import {
  Field,
  LeaveDialog,
  PageSaveBar,
  useEditDraft,
  useUnsavedGuard,
} from "@/components/admin2/EditGuard";
import { AccountStateBar } from "@/components/admin2/AccountActions";
import RecordList from "@/components/admin2/RecordList";
import { Body, PageHead, Panel } from "@/components/admin2/ui";
import TableBox from "@/components/admin2/TableBox";

/**
 * ADM-02-3 회원 상세 — 한 사람의 계정.
 *
 * ── 한 줄로 세운다 ──
 * 좌우 두 칸으로 나눠 두었을 때, 오른쪽에는 계정 상태와 기록이 서고 왼쪽에는 고치는
 * 칸이 섰다. 그러면 고치다가 눈이 자꾸 오른쪽으로 끌려가고, 좁은 화면에서는 그 둘이
 * 세로로 접히면서 순서가 뒤바뀐다. 위에서 아래로 한 줄이면 읽는 차례가 하나다 —
 * 기본정보 → 등록된 학생 → 기록.
 *
 * ── 계정 상태를 머리에 올린 까닭 ──
 * 이 화면에서 사람이 제일 먼저 확인하는 것은 「이 계정이 살아 있는가」다. 그 답이
 * 오른쪽 판 하나를 찾아봐야 나오면 늦다. 제목 옆에 배지로 세우고, 비활성·삭제를 그
 * 자리에서 누른다. 원래 그 자리에 있던 「회원 목록」·「학생·접속코드」는 나가는 문일
 * 뿐이라 왼쪽 되돌아가기 하나로 합쳤다.
 *
 * ── 관리자는 다 고친다 ──
 * 예전에는 상태·지역·메모 셋만 열어 두고 이름·연락처는 잠갔다(가려진 값을 고치게
 * 만들면 가려 둔 일이 뜻을 잃는다는 이유였다). 운영자가 오탈자 하나를 못 고쳐 본인에게
 * 연락해 바꾸게 하는 쪽이 더 이상해서 전부 연다.
 *
 * 딱 둘만 잠긴다 —
 *   · **회원 번호**  바꾸면 다른 사람이 된다. 식별자는 고치는 값이 아니다.
 *   · **최근 접속**  사람이 손대는 값이 아니라 시스템이 남긴 기록이다. 고치게 두면
 *                    「마지막으로 언제 들어왔나」를 다시는 믿을 수 없다.
 *   · 등록 학생 수도 칸을 만들지 않는다 — 학생 명부에서 세는 값이라 여기서 고치면
 *     바로 아래 표와 갈린다. 그 표가 곧 그 수다.
 */
export default function MemberDetail(found: FoundMember) {
  const { row } = found;
  const patches = usePatches();
  const localLog = useLocalAudit();
  const prefs = useAdminPrefs();
  const allStudents = useStudents();

  const patch = patches[row.id] ?? {};
  const state = patch.state ?? row.state;
  const by = prefs.staffName || "운영자";
  /* 제목과 감사 기록에 적히는 이름은 **저장된** 이름이다. 고치는 중인 이름을 제목에
     비추면 저장하지 않고 나간 뒤에도 그 이름으로 기록이 남은 줄 알게 된다 */
  const name = patch.name ?? row.name;
  const label = `${memberKindLabel[found.kind]} ${name}`;
  const gone = state === "withdrawn";
  const isParent = found.kind === "parent";

  /* 갈래마다 칸이 다르다. 초안은 그 갈래가 쓰는 칸만 담는다 — 없는 칸을 빈 값으로
     담아 두면 교사를 저장할 때 학부모 전용 칸이 빈 문자열로 함께 나간다 */
  const info = useEditDraft(
    isParent
      ? {
          name: patch.name ?? row.name,
          contact: patch.contact ?? row.contact,
          phone: patch.phone ?? found.row.phone,
          region: patch.region ?? row.region,
          joinedAt: patch.joinedAt ?? row.joinedAt,
          memo: patch.memo ?? "",
        }
      : {
          name: patch.name ?? row.name,
          contact: patch.contact ?? row.contact,
          school: patch.school ?? found.row.school,
          region: patch.region ?? row.region,
          classes: patch.classes ?? found.row.classes,
          charge: patch.charge ?? found.row.charge,
          joinedAt: patch.joinedAt ?? row.joinedAt,
          memo: patch.memo ?? "",
        },
  );
  const saveInfo = () => patchInfo(row.id, info.value, by);
  const guard = useUnsavedGuard(info.dirty, saveInfo);

  /* 씨앗 명부(adminUsers.students)가 아니라 「씨앗 + 고친 것」에서 고른다. 씨앗을 그대로
     쓰면 학생 상세에서 접속코드를 재발급하고 보호자 화면으로 돌아왔을 때 이 표만 옛
     코드를 세우고 있다 — 그 둘을 대조하려고 오는 화면에서 제일 하면 안 되는 일이다 */
  const kids = isParent ? allStudents.filter((s) => s.guardianId === row.id) : [];

  return (
    <>
      <PageHead
        title={name}
        back={
          <Link href="/admin2/members" className="a2-btn">
            ← 이전으로
          </Link>
        }
        actions={
          <AccountStateBar
            name={name}
            id={row.id}
            state={state}
            tone={accountTone[state]}
            onAct={(next, verb, reason) => actOnAccount(row.id, label, next, verb, reason, by)}
          />
        }
      />

      <Body>
        <div className="grid gap-3">
          <Panel
            title="기본정보"
            meta={patch.at ? `마지막 변경 ${patch.at} · ${patch.by}` : memberKindLabel[found.kind]}
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <Field label="회원 번호" value={row.id} readOnly mono />
              <Field
                label="이름"
                value={String(info.value.name ?? "")}
                disabled={gone}
                onChange={(v) => info.set("name", v)}
              />
              <Field
                label="이메일"
                type="email"
                value={String(info.value.contact ?? "")}
                disabled={gone}
                onChange={(v) => info.set("contact", v)}
              />
              {isParent && (
                <Field
                  label="연락처"
                  type="tel"
                  value={String(info.value.phone ?? "")}
                  disabled={gone}
                  onChange={(v) => info.set("phone", v)}
                />
              )}
              {!isParent && (
                <Field
                  label="소속 학교"
                  value={String(info.value.school ?? "")}
                  disabled={gone}
                  onChange={(v) => info.set("school", v)}
                />
              )}

              <label className="a2-field block">
                <span className="a2-label">지역</span>
                <select
                  className="a2-select"
                  value={String(info.value.region ?? "")}
                  disabled={gone}
                  onChange={(e) => info.set("region", e.target.value)}
                >
                  {REGIONS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>

              {!isParent && (
                <Field
                  label="담당 학급 수"
                  type="number"
                  value={Number(info.value.classes ?? 0)}
                  disabled={gone}
                  onChange={(v) => info.set("classes", Number(v))}
                />
              )}
              {!isParent && (
                <Field
                  label="담당 학생 수"
                  type="number"
                  value={Number(info.value.charge ?? 0)}
                  disabled={gone}
                  onChange={(v) => info.set("charge", Number(v))}
                />
              )}
              <Field
                label="가입일"
                type="date"
                value={String(info.value.joinedAt ?? "")}
                disabled={gone}
                onChange={(v) => info.set("joinedAt", v)}
              />
              {isParent && <Field label="최근 접속" value={found.row.lastSeen} readOnly mono />}
            </div>

            <label className="a2-field mt-3 block">
              <span className="a2-label">운영 메모</span>
              <textarea
                className="a2-textarea"
                value={String(info.value.memo ?? "")}
                disabled={gone}
                placeholder="다음에 이 계정을 볼 사람에게 남기는 메모입니다. 개인정보는 적지 않습니다."
                onChange={(e) => info.set("memo", e.target.value)}
              />
            </label>
          </Panel>

          {isParent && (
            <Panel
              title="등록된 학생"
              meta={`${n(kids.length)}명`}
              flush
              actions={
                <Link href="/admin2/students" className="a2-btn a2-btn-sm">
                  학생 목록
                </Link>
              }
            >
              <TableBox>
                <table className="a2-table">
                  <thead>
                    <tr>
                      <th scope="col" className="a2-th-num" style={{ width: "3rem" }}>
                        No
                      </th>
                      <th scope="col" style={{ width: "6.5rem" }}>
                        학생 ID
                      </th>
                      <th scope="col" style={{ width: "5.5rem" }}>
                        이름
                      </th>
                      <th scope="col" style={{ width: "7rem" }}>
                        접속코드
                      </th>
                      <th scope="col">학교</th>
                      <th scope="col" style={{ width: "4rem" }}>
                        학년
                      </th>
                      <th scope="col" style={{ width: "6.5rem" }}>
                        생성 날짜
                      </th>
                      <th scope="col" style={{ width: "5.5rem" }}>
                        관리
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {kids.map((s, i) => (
                      <tr key={s.id}>
                        <td className="a2-td-num a2-nowrap a2-t-sm text-(--a2-ink-3)">
                          {kids.length - i}
                        </td>
                        <td className="a2-mono a2-nowrap">{s.id}</td>
                        <td className="a2-td-key a2-nowrap">{s.name}</td>
                        <td className="a2-mono a2-nowrap">{s.code}</td>
                        <td className="a2-clip" title={s.school}>
                          {s.school}
                        </td>
                        <td className="a2-nowrap">{s.grade}</td>
                        <td className="a2-mono a2-nowrap">{s.joinedAt}</td>
                        <td className="a2-nowrap">
                          <Link href={`/admin2/students/${s.id}`} className="a2-btn a2-btn-sm">
                            수정하기
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {kids.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center text-(--a2-ink-4)">
                          <span className="block py-6">
                            아직 등록된 학생이 없습니다. 가입만 하고 아이를 등록하지 않은 계정입니다.
                          </span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </TableBox>
            </Panel>
          )}

          {/* 기록은 맨 아래. 오늘 할 일이 아니라 되짚어 볼 때 여는 것이다 */}
          <RecordList
            id={row.id}
            server={auditLog}
            local={localLog}
            empty="아직 이 회원에 대한 기록이 없습니다."
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
