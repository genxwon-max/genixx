"use client";

import { useState } from "react";
import { can } from "@/lib/admin";
import { recordAction, useAdminPrefs } from "@/lib/adminStore";
import {
  guards,
  patchSecurity,
  useSecurity,
  useSecurityLog,
  type GuardId,
  type SecuritySettings,
} from "@/lib/securityStore";
import { Callout, TableCard } from "./Parts";
import * as a from "./ui";

/**
 * 응시 화면 보호 (ADM-05-3).
 *
 * 원래 문항 은행(ADM-04-4) 안에 있었다. 문항 유출을 막는 장치라 그리로 갔던 것인데,
 * 실제로 바꾸는 것은 **응시 환경**이다. 문항 하나 찾으러 온 사람이 화면 열 장을
 * 내려가다 보안 스위치를 지나야 할 까닭이 없고, 제한 시간·자동 제출과 같은 자리에
 * 있어야 「이번 회차의 응시 조건」을 한 번에 볼 수 있다. 그래서 회차 쪽으로 옮겼다.
 *
 * 정의서에는 ADM-05-1(시험 설정)·-2(변경 기록)까지만 있어 번호를 새로 딴다.
 * 시험 설정 화면 안에 넣지 않고 따로 세운 것은, 그 화면이 이미 다섯 장 길이라
 * 여기에 또 붙이면 옮긴 뜻이 사라지기 때문이다.
 *
 * ⚠ 이 화면의 결론을 먼저 적어 둔다 — **차단은 보조이고, 대비책은 회전이다.**
 *   화면 안에서 하는 차단은 전부 우회할 수 있다. 오른쪽 단추를 막아도 스크린샷은
 *   찍히고, 옆에서 휴대폰으로 찍는 것은 어떤 코드로도 못 막는다. 그래서 스위치마다
 *   「막는 것」과 「못 막는 것」을 나란히 적는다. 막힌 줄 알고 있다가 문항이 새어
 *   나가면, 무엇이 뚫린 것인지 아무도 설명하지 못한다.
 *
 * 켜고 끄는 것은 문항 검수 권한을 가진 사람이 한다. 회차를 다루는 권한(round.manage)은
 * 출제자에게도 있는데, 자기가 낸 문항의 노출 조건을 자기가 정하게 두지 않는다.
 */
export default function ScreenGuardPanel() {
  const settings = useSecurity();
  const log = useSecurityLog();
  const prefs = useAdminPrefs();
  const [ask, setAsk] = useState<null | { what: string; patch: Partial<SecuritySettings> }>(null);

  const may = can(prefs.role, "item.review");
  const by = prefs.staffName || "운영자";

  const toggle = (id: GuardId) => {
    const spec = guards.find((g) => g.id === id)!;
    const next = !settings.guards[id];
    setAsk({
      what: `${spec.label} ${next ? "켬" : "끔"}`,
      patch: { guards: { ...settings.guards, [id]: next } },
    });
  };

  return (
    <>
      <Callout tone="info" title="차단은 보조입니다. 대비책은 회전입니다.">
        화면 안에서 하는 차단은 모두 우회할 수 있습니다. 옆에서 휴대폰으로 찍는 것은 어떤 코드로도
        막지 못합니다. 그러니 「막았다」고 여기지 마시고, 같은 문항이 같은 자리에 되풀이해 나가지
        않게 하는 쪽을 함께 보셔야 합니다 — 그것은 문항 은행의 「문항 회전」에서 봅니다.
      </Callout>

      <ul className="mt-6 space-y-3">
        {guards.map((g) => {
          const on = settings.guards[g.id];
          return (
            <li key={g.id} className={`${a.panel} p-5`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="adm-t-md font-bold text-exam-text">
                    {g.label}
                    <span className={`ml-2 adm-t-sm ${on ? "text-emerald-700" : "text-exam-muted"}`}>
                      {on ? "켜져 있음" : "꺼져 있음"}
                    </span>
                  </p>
                  <p className={`${a.bodyText} mt-1.5`}>
                    <b className="text-exam-text">막는 것</b> — {g.blocks}
                  </p>
                  <p className="mt-1 adm-t-md text-rose-700">
                    <b>못 막는 것</b> — {g.cannot}
                  </p>
                  <p className={`${a.hint} mt-1`}>치르는 대가 — {g.cost}</p>
                </div>
                {may && (
                  <button
                    type="button"
                    onClick={() => toggle(g.id)}
                    className={on ? a.btnGhost : a.btnPrimary}
                  >
                    {on ? "끄기" : "켜기"}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className={`${a.panel} mt-4 p-5`}>
        <p className={a.label}>전체화면</p>
        <p className={`${a.bodyText} mt-1`}>
          응시를 시작할 때 전체화면을 권합니다. <b className="text-exam-text">강제하지 않습니다</b>{" "}
          — 브라우저가 거부할 수 있고, 학생이 나가더라도 시험을 멈추면 그 학생만 손해입니다.
        </p>
      </div>

      <p className={`${a.hint} mt-4`}>
        켜 둔 것은 응시 화면에 곧바로 적용됩니다. 마지막 변경 {settings.updatedAt} ·{" "}
        {settings.updatedBy}
        {!may && " · 바꾸는 것은 문항 검수 권한이 있는 사람이 합니다"}
      </p>

      <div className="mt-8">
        <TableCard
          title={`변경 기록 ${log.length}건`}
          caption="회차마다 응시 조건이 달랐다면 그 차이를 나중에 설명할 수 있어야 합니다."
        >
          {log.length === 0 ? (
            <p className={`${a.bodyText} px-5 py-8`}>아직 바꾼 적이 없습니다.</p>
          ) : (
            <table className={a.table}>
              <thead>
                <tr>
                  <th className={a.th}>시각</th>
                  <th className={a.th}>사람</th>
                  <th className={a.th}>바꾼 것</th>
                  <th className={a.th}>까닭</th>
                </tr>
              </thead>
              <tbody>
                {log.map((e) => (
                  <tr key={e.id}>
                    <td className={a.tdTight}>{e.at}</td>
                    <td className={a.tdStrongTight}>{e.by}</td>
                    <td className={a.td}>{e.text}</td>
                    <td className={`${a.td} min-w-[18rem]`}>{e.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </TableCard>
      </div>

      {ask && (
        <ReasonBox
          what={ask.what}
          onClose={() => setAsk(null)}
          onConfirm={(reason) => {
            patchSecurity(ask.patch, by, ask.what, reason);
            recordAction("응시 화면 보호", ask.what, reason, by);
            setAsk(null);
          }}
        />
      )}
    </>
  );
}

/** 응시 조건이 바뀌는 일이라 까닭을 받는다 */
function ReasonBox({
  what,
  onConfirm,
  onClose,
}: {
  what: string;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const short = reason.trim().length < 10;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sec-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg border border-exam-line bg-white p-6 sm:p-8">
        <h2 id="sec-title" className={a.pageTitle}>
          {what}
        </h2>
        <p className={`${a.bodyText} mt-2.5`}>
          응시 환경이 바뀝니다. 회차마다 조건이 달랐다면 그 차이를 나중에 설명할 수 있어야 하므로
          까닭을 받습니다. 기록과 감사 로그에 남습니다.
        </p>

        <div className="mt-5">
          <label htmlFor="sec-reason" className={a.label}>
            까닭을 적어 주세요
          </label>
          <textarea
            id="sec-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="10자 이상 적어 주세요"
            className={`${a.input} mt-2 resize-none`}
          />
          <p className={`mt-1.5 adm-t-sm font-bold ${short ? "text-rose-700" : "text-emerald-700"}`}>
            {short ? `${10 - reason.trim().length}자 더 적어 주세요` : "충분히 입력되었습니다"}
          </p>
        </div>

        <div className="mt-7 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={short}
            onClick={() => onConfirm(reason.trim())}
            className={short ? a.btnDisabled : a.btnPrimary}
          >
            기록을 남기고 바꾸기
          </button>
          <button type="button" onClick={onClose} className={a.btnGhost}>
            그만두기
          </button>
        </div>
      </div>
    </div>
  );
}
