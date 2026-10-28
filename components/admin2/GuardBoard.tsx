"use client";

import Link from "next/link";
import { useState } from "react";
import {
  guards,
  type GuardId,
  type SecurityLogEntry,
  type SecuritySettings,
} from "@/lib/securityStore";
import ReasonDialog from "./ReasonDialog";
import TableBox from "./TableBox";
import { Body, PageHead, Panel, Status } from "./ui";

/**
 * ADM-05-3 응시 화면 보호 — 응시 화면에서 문항이 밖으로 나가는 것을 늦추는 장치를 켜고 끈다.
 *
 * 옛 콘솔의 /admin/rounds/security(ScreenGuardPanel)가 9월 27일 콘솔을 걷어 낼 때 함께 사라졌던 것을
 * 다시 세웠다(2026-10-28). 그동안 설정(lib/securityStore.ts)은 남아 응시 화면(components/exam/ExamGuard.tsx)이
 * 계속 읽었지만 바꿀 자리가 없었다.
 *
 * ── 결론을 먼저 — 차단은 보조이고, 대비책은 회전이다 ──
 * 화면 안에서 하는 차단은 모두 우회할 수 있다. 오른쪽 클릭을 막아도 스크린샷은 찍히고, 옆에서 휴대폰으로
 * 찍는 것은 어떤 코드로도 못 막는다. 그래서 장치마다 「막는 것」과 「못 막는 것」을 나란히 적는다 — 막힌
 * 줄 알고 있다가 문항이 새어 나가면 무엇이 뚫렸는지 아무도 설명하지 못한다.
 *
 * 켜고 끄는 것은 문항 검수 권한(item.review)이 한다 — 회차를 다루는 권한은 출제자에게도 있는데, 자기가
 * 낸 문항의 노출 조건을 자기가 정하게 두지 않는다. 응시 조건이 바뀌는 일이라 사유를 받아 이 화면의
 * 변경 기록과 감사 로그에 남긴다.
 *
 * 읽는 쪽과 그리는 쪽을 갈랐다. 실제 화면(app/(admin2)/admin2/security/SecurityView.tsx)이 설정과 기록을
 * 넘기고, 디자인 보기(/design2/admin2/security)는 값을 적어 넘긴다.
 */

export type GuardAsk = { id: GuardId; next: boolean } | null;

export default function GuardBoard({
  settings,
  log,
  may,
  onChange,
  ask: startAsk = null,
  rotationHref = "/admin2/rotation",
}: {
  settings: SecuritySettings;
  log: SecurityLogEntry[];
  /** 켜고 끌 수 있는가 — 문항 검수 권한 */
  may: boolean;
  /** 사유를 받은 뒤 — what은 「글 복사 · 드래그 막기 켬」 꼴 */
  onChange: (id: GuardId, next: boolean, what: string, reason: string) => void;
  /** 처음부터 열린 사유 창 — 디자인 보기만 넘긴다 */
  ask?: GuardAsk;
  rotationHref?: string;
}) {
  const [ask, setAsk] = useState<GuardAsk>(startAsk);
  const asking = ask ? guards.find((g) => g.id === ask.id)! : null;
  const what = asking && ask ? `${asking.label} ${ask.next ? "켬" : "끔"}` : "";

  return (
    <>
      <PageHead title="응시 화면 보호" />
      <Body className="grid gap-3">
        <p className="a2-note">
          <span>
            <b>차단은 보조입니다. 대비책은 회전입니다.</b> 화면 안에서 하는 차단은 모두 우회할 수
            있고, 옆에서 휴대폰으로 찍는 것은 어떤 코드로도 막지 못합니다. 같은 문항이 같은 자리에
            되풀이해 나가지 않게 하는 쪽을 함께 보셔야 합니다 —{" "}
            <Link
              href={rotationHref}
              className="font-semibold text-(--a2-accent) underline underline-offset-2"
            >
              문항 회전
            </Link>
            에서 봅니다.
          </span>
        </p>

        <Panel
          title="보호 장치"
          meta={`마지막 변경 ${settings.updatedAt} · ${settings.updatedBy}`}
          actions={!may ? <Status tone="muted">보기만 할 수 있습니다</Status> : undefined}
          flush
        >
          <ul className="divide-y divide-(--a2-line)">
            {guards.map((g) => {
              const on = settings.guards[g.id];
              return (
                <li key={g.id} className="flex flex-wrap items-start justify-between gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-baseline gap-2 a2-t-md font-bold">
                      {g.label}
                      <Status tone={on ? "ok" : "muted"}>{on ? "켜져 있음" : "꺼져 있음"}</Status>
                    </p>
                    <dl className="mt-1.5 grid gap-0.5 a2-t-sm">
                      <div>
                        <dt className="inline font-semibold">막는 것 — </dt>
                        <dd className="inline text-(--a2-ink-2)">{g.blocks}</dd>
                      </div>
                      <div>
                        <dt className="inline font-semibold text-(--a2-danger)">못 막는 것 — </dt>
                        <dd className="inline text-(--a2-danger)">{g.cannot}</dd>
                      </div>
                      <div className="text-(--a2-ink-3)">
                        <dt className="inline">치르는 대가 — </dt>
                        <dd className="inline">{g.cost}</dd>
                      </div>
                    </dl>
                  </div>
                  {may && (
                    <button
                      type="button"
                      className={on ? "a2-btn" : "a2-btn a2-btn-primary"}
                      onClick={() => setAsk({ id: g.id, next: !on })}
                    >
                      {on ? "끄기" : "켜기"}
                    </button>
                  )}
                </li>
              );
            })}
            <li className="p-3">
              <p className="a2-t-md font-bold">전체화면</p>
              <p className="mt-1.5 a2-t-sm text-(--a2-ink-2)">
                응시를 시작하면 전체화면으로 바뀌고, 전체화면을 끄거나 ESC를 누르면 나갈지 묻습니다.
                브라우저가 전체화면을 거부해도 시험은 이어집니다. 이 동작은 여기서 켜고 끄지
                않습니다.
              </p>
            </li>
          </ul>
        </Panel>

        <Panel
          title="변경 기록"
          meta="회차마다 응시 조건이 달랐다면 그 차이를 나중에 설명할 수 있어야 합니다"
          flush
        >
          {log.length === 0 ? (
            <p className="p-3 a2-t-sm text-(--a2-ink-3)">아직 바꾼 적이 없습니다.</p>
          ) : (
            <TableBox>
              <table className="a2-table">
                <thead>
                  <tr>
                    <th>시각</th>
                    <th>사람</th>
                    <th>바꾼 것</th>
                    <th>사유</th>
                  </tr>
                </thead>
                <tbody>
                  {log.map((e) => (
                    <tr key={e.id}>
                      <td className="a2-mono a2-nowrap">{e.at}</td>
                      <td className="a2-nowrap">{e.by}</td>
                      <td className="a2-nowrap">{e.text}</td>
                      <td className="min-w-[16rem]">{e.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableBox>
          )}
        </Panel>
      </Body>

      {ask && asking && (
        <ReasonDialog
          title={what}
          lead="응시 환경이 바뀝니다. 켜고 끈 것은 응시 화면에 곧바로 적용되고, 회차마다 조건이 달랐다면 그 차이를 나중에 설명할 수 있어야 하므로 사유를 받습니다. 변경 기록과 감사 로그에 남습니다."
          lines={[
            `${asking.label} — ${ask.next ? "꺼져 있음 → 켜져 있음" : "켜져 있음 → 꺼져 있음"}`,
          ]}
          confirmLabel="기록을 남기고 바꾸기"
          onClose={() => setAsk(null)}
          onConfirm={(reason) => {
            onChange(ask.id, ask.next, what, reason);
            setAsk(null);
          }}
        />
      )}
    </>
  );
}
