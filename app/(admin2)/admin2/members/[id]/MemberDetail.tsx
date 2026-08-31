"use client";

import Link from "next/link";
import { auditLog } from "@/lib/admin";
import { accountTone, examTone, n } from "@/lib/admin2";
import { useAdminPrefs, useLocalAudit } from "@/lib/adminStore";
import {
  REGIONS,
  examStateLabel,
  memberKindLabel,
  userStateLabel,
  type FoundMember,
} from "@/lib/adminUsers";
import { actOnAccount, patchInfo, usePatches, useStudents } from "@/lib/directoryStore";
import AccountActions from "@/components/admin2/AccountActions";
import RecordList from "@/components/admin2/RecordList";
import { Body, DescList, PageHead, Panel, SeedNote, Status, Tag } from "@/components/admin2/ui";
import TableBox from "@/components/admin2/TableBox";

/**
 * ADM-02-3 회원 상세 — 한 사람의 계정.
 *
 * ── 이 화면에서 고칠 수 있는 것 ──
 * 상태 · 지역 · 운영 메모, 셋뿐이다. 이름·메일·전화는 칸을 만들지 않았다. 원본이 이미
 * 가려진 채로 오는데(gm****@naver.com) 그것을 고치게 만들면 가려 둔 일이 뜻을 잃고,
 * 관리자가 남의 연락처를 바꿔 쓰는 길이 열린다. 정정은 본인이 하는 일이다.
 * 등록 학생 수·담당 학생 수도 고치지 못한다 — 다른 명부에서 세는 값이라 여기서 고치면
 * 그 명부와 갈린다.
 *
 * 정지·해제·삭제 판(AccountActions)과 기록 판(RecordList)은 학생 상세와 함께 쓴다.
 * 계정을 막고 여는 일은 갈래가 달라도 같은 일이고, 화면마다 따로 짜면 사유 목록이
 * 갈라지는 것부터 시작해 결국 다른 조치가 된다.
 */
export default function MemberDetail(found: FoundMember) {
  const { row } = found;
  const patches = usePatches();
  const localLog = useLocalAudit();
  const prefs = useAdminPrefs();
  const allStudents = useStudents();

  const patch = patches[row.id] ?? {};
  const state = patch.state ?? row.state;
  const region = patch.region ?? row.region;
  const memo = patch.memo ?? "";
  const by = prefs.staffName || "운영자";
  const label = `${memberKindLabel[found.kind]} ${row.name}`;
  const gone = state === "withdrawn";

  /* 씨앗 명부(adminUsers.students)가 아니라 「씨앗 + 고친 것」에서 고른다. 씨앗을 그대로
     쓰면 학생 상세에서 접속코드를 재발급하고 보호자 화면으로 돌아왔을 때 이 표만 옛
     코드를 세우고 있다 — 그 둘을 대조하려고 오는 화면에서 제일 하면 안 되는 일이다 */
  const kids = found.kind === "parent" ? allStudents.filter((s) => s.guardianId === row.id) : [];

  return (
    <>
      <PageHead
        title={row.name}
        meta={
          <>
            <span className="a2-mono text-(--a2-ink-2)">{row.id}</span>
            <Tag>{memberKindLabel[found.kind]}</Tag>
            <Status tone={accountTone[state]}>{userStateLabel[state].label}</Status>
            <span aria-hidden>·</span>
            <span>
              가입 <span className="a2-mono">{row.joinedAt}</span>
            </span>
          </>
        }
        actions={
          <>
            <Link href="/admin2/members" className="a2-btn">
              회원 목록
            </Link>
            {found.kind === "parent" && (
              <Link href="/admin2/students" className="a2-btn">
                학생·접속코드
              </Link>
            )}
          </>
        }
      />
<Body>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          {/* ── 왼쪽 ── */}
          <div className="grid content-start gap-3">
            <Panel title="신원" meta="고칠 수 없는 칸">
              <DescList
                rows={
                  found.kind === "parent"
                    ? [
                        { k: "회원 번호", v: <span className="a2-mono">{row.id}</span> },
                        { k: "이름", v: <span className="font-semibold">{row.name}</span> },
                        {
                          k: "연락처",
                          v: (
                            <span className="flex flex-wrap items-center gap-1.5">
                              <span className="a2-mono">{row.contact}</span>
                              <span className="a2-mono">{found.row.phone}</span>
                              <Tag>일부 가림</Tag>
                            </span>
                          ),
                        },
                        { k: "지역", v: region },
                        { k: "가입일", v: <span className="a2-mono">{row.joinedAt}</span> },
                        { k: "최근 접속", v: <span className="a2-mono">{found.row.lastSeen}</span> },
                        {
                          k: "등록 학생",
                          v: (
                            <span className="a2-num">
                              {n(kids.length)}
                              <span className="a2-t-sm text-(--a2-ink-3)">명</span>
                            </span>
                          ),
                        },
                      ]
                    : [
                        { k: "회원 번호", v: <span className="a2-mono">{row.id}</span> },
                        { k: "이름", v: <span className="font-semibold">{row.name}</span> },
                        {
                          k: "연락처",
                          v: (
                            <span className="flex flex-wrap items-center gap-1.5">
                              <span className="a2-mono">{row.contact}</span>
                              <Tag>일부 가림</Tag>
                            </span>
                          ),
                        },
                        { k: "학교", v: found.row.school },
                        { k: "지역", v: region },
                        {
                          k: "담당",
                          v: (
                            <span>
                              학급 <span className="a2-num">{n(found.row.classes)}</span>개 · 학생{" "}
                              <span className="a2-num">{n(found.row.charge)}</span>명
                            </span>
                          ),
                        },
                        { k: "가입일", v: <span className="a2-mono">{row.joinedAt}</span> },
                      ]
                }
              />
            </Panel>

            {/* 고치는 칸 — 저장 단추가 없다. 고치는 즉시 저장한다(lib/directoryStore.ts) */}
            <Panel
              title="운영 정보"
              meta={patch.at ? `마지막 변경 ${patch.at} · ${patch.by}` : "고치면 바로 저장됩니다"}
            >
              <div className="grid gap-3 sm:grid-cols-[13rem_minmax(0,1fr)]">
                <label className="a2-field block">
                  <span className="a2-label">지역</span>
                  <select
                    className="a2-select"
                    value={region}
                    disabled={gone}
                    onChange={(e) => patchInfo(row.id, { region: e.target.value }, by)}
                  >
                    {REGIONS.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                  <span className="a2-hint">이사·전근으로 실제로 바뀌는 칸입니다.</span>
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

            {found.kind === "parent" && (
              <Panel
                title="이 계정으로 등록된 학생"
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
                          응시 상태
                        </th>
                        <th scope="col" style={{ width: "5.5rem" }}>
                          관리
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {kids.map((s, i) => (
                        <tr key={s.id}>
                          <td className="a2-td-num a2-nowrap a2-t-sm text-(--a2-ink-3)">{kids.length - i}</td>
                          <td className="a2-mono a2-nowrap">{s.id}</td>
                          <td className="a2-td-key a2-nowrap">{s.name}</td>
                          <td className="a2-mono a2-nowrap">{s.code}</td>
                          <td className="a2-clip" title={s.school}>
                            {s.school}
                          </td>
                          <td className="a2-nowrap">{s.grade}</td>
                          <td className="a2-nowrap">
                            <Status tone={examTone[s.exam]}>{examStateLabel[s.exam].label}</Status>
                          </td>
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
          </div>

          {/* ── 오른쪽 ── */}
          <div className="grid content-start gap-3">
            <AccountActions
              id={row.id}
              name={row.name}
              state={state}
              tone={accountTone[state]}
              changed={patch.state != null}
              at={patch.at}
              by={patch.by}
              onAct={(next, verb, reason) => actOnAccount(row.id, label, next, verb, reason, by)}
            />

            <RecordList
              id={row.id}
              server={auditLog}
              local={localLog}
              empty="아직 이 회원에 대한 기록이 없습니다."
            />
          </div>
        </div>

</Body>
      <SeedNote>
        이 회원과 연락처는 화면 설계를 위한 예시입니다. 실존 인물이 아니며, 여기서 바꾼 상태·지역·메모는 이 브라우저에만
        남습니다.
      </SeedNote>
    </>
  );
}
