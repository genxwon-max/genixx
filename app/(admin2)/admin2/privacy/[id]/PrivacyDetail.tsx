"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  consentKinds,
  consentLabel,
  consentStateLabel,
  eventStateLabel,
  historyOf,
  purgeReasonLabel,
  purgeStateLabel,
  today,
  usePrivacy,
  type ConsentKind,
} from "@/lib/privacyStore";
import TableBox from "@/components/admin2/TableBox";
import { Body, FormRow, PageHead, Panel, Status, Tag } from "@/components/admin2/ui";

/**
 * ADM-10 개인정보 상세 — 이 회원이 무엇에 언제 동의했나.
 *
 * 목록은 「지금 어떤 상태인가」에 답한다. 여기서 답하는 것은 **증빙**이다 — 언제 누가
 * 어느 화면에서 눌렀는지가 전건으로 서 있어야, 정보주체가 물어 왔을 때나 감독기관이
 * 요구할 때 그대로 내놓을 수 있다. 그래서 지난 것을 지우지 않고 쌓기만 한다.
 *
 * 고치는 칸은 두지 않는다. 동의는 **정보주체가 누르는 것**이지 운영자가 대신 켜 주는
 * 값이 아니다 — 여기서 켤 수 있게 두면 그 순간 이 화면의 기록은 증빙이 아니게 된다.
 * 운영자가 하는 일은 파기뿐이고, 그것은 목록 화면의 스케줄러가 맡는다.
 *
 * 그 파기도 **여기 이력에 한 줄로 선다**. 우리가 한 일이라고 빼 두면 「철회 → 파기」가
 * 두 화면으로 갈라져, 물어 오는 사람 앞에서 표 둘을 번갈아 짚어야 한다.
 */

export default function PrivacyDetail({ id }: { id: string }) {
  const { rows } = usePrivacy();
  const row = useMemo(() => rows.find((v) => v.id === id) ?? null, [rows, id]);

  if (!row) {
    return (
      <>
        <PageHead
          title="찾지 못했습니다"
          back={
            <Link href="/admin2/privacy" className="a2-btn">
              ← 개인정보 관리
            </Link>
          }
        />
        <Body>
          <Panel title="없는 회원">
            <p className="a2-t-sm text-(--a2-ink-2)">
              <span className="a2-mono">{id}</span> 회원이 명부에 없습니다.
            </p>
          </Panel>
        </Body>
      </>
    );
  }

  const now = today();
  /* 동의와 파기를 한 줄기로 — 철회 바로 아래에 그 철회로 지운 줄이 붙는다 */
  const events = historyOf(row);
  /* 명부 화면은 학부모와 학생이 갈려 있다 — 번호 앞머리로 갈 곳을 고른다 */
  const memberHref = row.kind === "학생" ? `/admin2/students/${row.id}` : `/admin2/members/${row.id}`;

  /** 그 갈래의 마지막 기록 — 지금 상태가 언제 정해졌는지 */
  const lastOf = (k: ConsentKind) => [...row.log].reverse().find((l) => l.kind === k) ?? null;

  return (
    <>
      <PageHead
        title={row.name}
        back={
          <Link href="/admin2/privacy" className="a2-btn">
            ← 개인정보 관리
          </Link>
        }
        actions={
          <Link href={memberHref} className="a2-btn">
            회원 상세
          </Link>
        }
      />
      <Body>
        <div className="grid gap-3">
          <Panel title="회원" meta={row.id} flush>
            <div className="a2-form">
              <FormRow label="이름">
                <span className="a2-t-sm text-(--a2-ink)">{row.name}</span>
                <Tag>{row.kind}</Tag>
                {row.minor && <Tag accent>만 14세 미만</Tag>}
              </FormRow>
              <FormRow label="가입일">
                <span className="a2-mono a2-t-sm text-(--a2-ink-2)">{row.joinedAt}</span>
              </FormRow>
            </div>
          </Panel>

          {/* ① 지금 어떤 상태인가 */}
          <Panel title="동의 상태" flush>
            <div className="a2-form">
              {consentKinds.map((k) => {
                const v = row.consents[k.id];
                /* 학부모에게 법정대리인 동의는 없는 칸이다 — 「미동의」로 적으면
                   빠뜨린 것으로 읽힌다 */
                if (v === "none" && k.id === "guardian" && !row.minor) return null;
                const last = lastOf(k.id);
                const bad = v === "withdrawn" || (v === "none" && k.required);
                return (
                  <FormRow key={k.id} label={k.short}>
                    <Status tone={v === "granted" ? "ok" : v === "withdrawn" ? "danger" : "muted"}>
                      {consentStateLabel[v]}
                    </Status>
                    <span className="a2-t-sm text-(--a2-ink-3)">{consentLabel(k.id)}</span>
                    {last ? (
                      <span className="a2-t-xs text-(--a2-ink-4)">
                        <span className="a2-mono">{last.at}</span> · {last.by}
                      </span>
                    ) : (
                      <span className="a2-t-xs text-(--a2-ink-4)">받은 기록이 없습니다</span>
                    )}
                    {bad && k.id === "guardian" && (
                      <p className="a2-note w-full" style={{ borderLeftColor: "var(--a2-danger)" }}>
                        <span>
                          만 14세 미만인데 법정대리인 동의가 없습니다. 이 아이의 프로필은 열리지 않아야 합니다.
                        </span>
                      </p>
                    )}
                  </FormRow>
                );
              })}
            </div>
          </Panel>

          {/* ② 증빙 — 지난 것을 지우지 않고 쌓는다 */}
          <Panel title="동의 · 파기 이력" meta={`${events.length}건`} flush>
            <TableBox>
              <table className="a2-table">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: "11rem" }}>
                      시각
                    </th>
                    <th scope="col" style={{ width: "10rem" }}>
                      갈래
                    </th>
                    <th scope="col" style={{ width: "6rem" }}>
                      결과
                    </th>
                    <th scope="col" style={{ width: "8rem" }}>
                      누가
                    </th>
                    <th scope="col">경로 · 까닭</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e, k) => (
                    <tr key={`${e.at}-${e.what}-${k}`}>
                      <td className="a2-mono a2-nowrap a2-t-sm">{e.at}</td>
                      <td className="a2-td-key a2-nowrap">{e.what}</td>
                      <td className="a2-nowrap">
                        <Status
                          tone={
                            e.state === "granted" ? "ok" : e.state === "withdrawn" ? "danger" : "muted"
                          }
                        >
                          {eventStateLabel[e.state]}
                        </Status>
                      </td>
                      <td className="a2-nowrap a2-t-sm">{e.by}</td>
                      <td className="a2-t-sm text-(--a2-ink-2)">{e.via}</td>
                    </tr>
                  ))}
                  {events.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center text-(--a2-ink-4)">
                        <span className="block py-5">기록이 없습니다.</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TableBox>
          </Panel>

          {/* ③ 언제 지우는가 */}
          <Panel title="보관 · 파기" flush>
            <div className="a2-form">
              <FormRow label="보관 만료">
                <span
                  className="a2-mono a2-t-sm"
                  style={{ color: row.keepUntil <= now ? "var(--a2-danger)" : "var(--a2-ink-2)" }}
                >
                  {row.keepUntil}
                </span>
                {row.keepUntil <= now && (
                  <span className="a2-t-xs font-bold" style={{ color: "var(--a2-danger)" }}>
                    지났습니다
                  </span>
                )}
              </FormRow>

              <FormRow
                label="파기"
                hint={
                  row.purge === "queued"
                    ? "지우는 것은 파기 스케줄러에서 누릅니다 — 되돌릴 수 없는 일이라 한 자리에서만 실행합니다."
                    : undefined
                }
              >
                {row.purge === "none" ? (
                  <span className="a2-t-sm text-(--a2-ink-4)">파기할 까닭이 없습니다.</span>
                ) : (
                  <>
                    <Status tone={row.purge === "done" ? "muted" : "warn"}>
                      {purgeStateLabel[row.purge]}
                    </Status>
                    <span className="a2-t-sm text-(--a2-ink-2)">
                      {row.purgeReason ? purgeReasonLabel[row.purgeReason] : ""}
                    </span>
                    {row.purgedAt ? (
                      <span className="a2-t-xs text-(--a2-ink-4)">
                        <span className="a2-mono">{row.purgedAt}</span> · {row.purgedBy}
                      </span>
                    ) : (
                      <span className="a2-t-xs text-(--a2-ink-4)">
                        예정 <span className="a2-mono">{row.purgeDue ?? ""}</span>
                      </span>
                    )}
                  </>
                )}
              </FormRow>

              {row.purge === "done" && (
                <FormRow label="파기 까닭">
                  <span className="a2-t-sm text-(--a2-ink-2)">
                    {row.purgedWhy || "적어 둔 까닭이 없습니다."}
                  </span>
                </FormRow>
              )}

              <FormRow label="파기 범위">
                <span className="a2-t-sm text-(--a2-ink-2)">
                  계정 · 응답 · 설문 · 리포트. 통계에 들어간 값은 사람을 알아볼 수 없는 꼴로만 남습니다.
                </span>
                {/* 지운 뒤에 이 화면이 텅 비면 「했다는 것」을 못 보인다 */}
                <span className="a2-t-xs text-(--a2-ink-4) w-full">
                  동의와 파기 기록은 지우지 않습니다 — 언제 무엇을 지웠는지 대야 할 자리가 남습니다.
                </span>
              </FormRow>
            </div>
          </Panel>
        </div>
      </Body>
    </>
  );
}
