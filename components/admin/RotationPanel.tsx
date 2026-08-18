"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { can, rounds } from "@/lib/admin";
import { recordAction, useAdminPrefs } from "@/lib/adminStore";
import { useForms, type ExamForm } from "@/lib/formStore";
import { useItems } from "@/lib/itemStore";
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
 * 문항 회전 · 보안 (ADM-04-4).
 *
 * 이 화면의 결론을 먼저 적어 둔다 — **차단은 보조이고, 대비책은 회전이다.**
 *
 * 화면 안에서 하는 차단은 전부 우회할 수 있다. 오른쪽 단추를 막아도 스크린샷은
 * 찍히고, 옆에서 휴대폰으로 찍는 것은 어떤 코드로도 못 막는다. 그래서 스위치마다
 * 「막는 것」과 「못 막는 것」을 나란히 적는다. 막힌 줄 알고 있다가 문항이 새어
 * 나가면, 무엇이 뚫린 것인지 아무도 설명하지 못한다.
 *
 * 그 대신 회전을 본다. 같은 문항이 같은 자리에 계속 나오면 몇 회차 만에 답이 돌고,
 * 그때부터 그 문항은 아이의 힘이 아니라 정보를 잰다. 노출 이력은 확정된 검사지에서
 * 읽어 오므로 따로 적어 둘 것이 없다.
 */
export default function RotationPanel() {
  const items = useItems();
  const forms = useForms();
  const settings = useSecurity();
  const log = useSecurityLog();
  const prefs = useAdminPrefs();

  const [ask, setAsk] = useState<null | { what: string; patch: Partial<SecuritySettings> }>(null);

  const may = can(prefs.role, "item.review");
  const by = prefs.staffName || "운영자";

  /* 확정된 검사지만 실제로 나간 것이다. 초안은 아직 아무도 보지 않았다. */
  const live = useMemo(() => forms.filter((f) => f.state === "confirmed"), [forms]);

  const exposure = useMemo(() => {
    const map = new Map<string, ExamForm[]>();
    for (const f of live) {
      for (const id of f.itemIds) map.set(id, [...(map.get(id) ?? []), f]);
    }
    return map;
  }, [live]);

  const used = items
    .filter((i) => exposure.has(i.id))
    .map((i) => {
      const on = exposure.get(i.id)!;
      const labels = on.map((f) => rounds.find((r) => r.id === f.round)?.label ?? f.round);
      /* 앵커는 회전에서 뺀다 — 회차마다 똑같이 들어가야 등화의 기준이 된다 */
      const rest = i.anchor ? false : on.length >= settings.maxRuns;
      return { item: i, runs: on.length, labels, rest };
    })
    .sort((x, y) => y.runs - x.runs);

  const resting = used.filter((u) => u.rest);
  const pool = items.filter((i) => i.state === "approved");
  const neverUsed = pool.filter((i) => !exposure.has(i.id));

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
        않게 하는 쪽을 보셔야 합니다.
      </Callout>

      {/* ── 1. 노출 이력 ── */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="확정되어 나간 검사지" value={`${live.length}건`} note="초안은 세지 않습니다" />
        <Stat
          label="한 번이라도 나간 문항"
          value={`${used.length}건`}
          note={`승인 문항 ${pool.length}건 중`}
        />
        <Stat
          label="쉬어야 하는 문항"
          value={`${resting.length}건`}
          note={`앵커를 뺀 문항이 ${settings.maxRuns}회 연달아 나갔습니다`}
          tone={resting.length > 0 ? "warn" : "good"}
        />
      </div>

      <div className="mt-5">
        <TableCard
          title={`노출 이력 ${used.length}건`}
          caption="확정된 검사지에서 읽어 옵니다. 앵커는 회전 대상이 아닙니다 — 회차마다 똑같이 들어가야 회차 사이를 견주는 기준이 됩니다."
        >
          {used.length === 0 ? (
            <p className={`${a.bodyText} px-5 py-8`}>
              아직 확정된 검사지가 없어 나간 문항이 없습니다.
            </p>
          ) : (
            <table className={a.table}>
              <thead>
                <tr>
                  <th className={a.th}>문항번호</th>
                  <th className={a.th}>단계</th>
                  <th className={a.th}>나간 횟수</th>
                  <th className={a.th}>나간 회차</th>
                  <th className={a.th}>정답률</th>
                  <th className={a.th}>앵커</th>
                  <th className={a.th}>다음 회차</th>
                </tr>
              </thead>
              <tbody>
                {used.map(({ item, runs, labels, rest }) => (
                  <tr key={item.id}>
                    <td className={a.tdStrong}>
                      <Link
                        href={`/admin/items/${item.id}`}
                        className="font-bold text-brand-700 underline underline-offset-4"
                      >
                        {item.code || item.id}
                      </Link>
                    </td>
                    <td className={a.td}>{item.level}</td>
                    <td className={a.tdNum}>{runs}회</td>
                    <td className={a.td}>{labels.join(", ")}</td>
                    <td className={a.tdNum}>
                      {item.correctRate === null ? "출제 전" : `${item.correctRate}%`}
                    </td>
                    <td className={a.td}>{item.anchor ? "앵커" : "—"}</td>
                    <td className={a.td}>
                      {item.anchor ? (
                        <span className="font-bold text-brand-700">계속 넣습니다</span>
                      ) : rest ? (
                        <span className="font-bold text-amber-700">한 회차 쉬게 하세요</span>
                      ) : (
                        <span className={a.hint}>넣어도 됩니다</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </TableCard>
      </div>

      {resting.length > 0 && (
        <div className="mt-4">
          <Callout tone="warn" title={`쉬게 할 문항 ${resting.length}건`}>
            {resting.map((r) => r.item.code || r.item.id).join(", ")} — 다음 회차 검사지를 조립할
            때 빼 주세요. 대신 넣을 문항은 아직 한 번도 나가지 않은 {neverUsed.length}건 중에서
            고르시면 됩니다.
          </Callout>
        </div>
      )}

      {/* ── 2. 응시자별 동적 할당 ── */}
      <Allocation pool={pool.length} settings={settings} onAsk={setAsk} may={may} />

      {/* ── 3. 화면 보호 ── */}
      <section className={`${a.panel} mt-6 p-6`}>
        <h3 className={a.cardTitle}>화면 보호</h3>
        <p className={`${a.hint} mt-1.5`}>
          켜 두면 응시 화면에 곧바로 적용됩니다. 항목마다 막는 것과 못 막는 것을 함께 적었습니다 —
          못 막는 쪽을 모르면 뚫렸을 때 무엇이 뚫린 것인지 알 수 없습니다.
        </p>

        <ul className="mt-4 space-y-3">
          {guards.map((g) => {
            const on = settings.guards[g.id];
            return (
              <li key={g.id} className="rounded-md border border-exam-line p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="adm-t-md font-bold text-exam-text">
                      {g.label}
                      <span
                        className={`ml-2 adm-t-sm ${on ? "text-emerald-700" : "text-exam-muted"}`}
                      >
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

        <div className="mt-4 border-t border-exam-line pt-4">
          <p className={a.label}>전체화면</p>
          <p className={`${a.bodyText} mt-1`}>
            응시를 시작할 때 전체화면을 권합니다. <b className="text-exam-text">강제하지 않습니다</b>{" "}
            — 브라우저가 거부할 수 있고, 학생이 나가더라도 시험을 멈추면 그 학생만 손해입니다.
          </p>
        </div>

        <p className={`${a.hint} mt-4`}>
          마지막 변경 {settings.updatedAt} · {settings.updatedBy}
          {!may && " · 바꾸는 것은 검수 권한이 있는 사람이 합니다"}
        </p>
      </section>

      {/* ── 4. 기록 ── */}
      <div className="mt-6">
        <TableCard
          title={`설정 변경 기록 ${log.length}건`}
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
                    <td className={`${a.td} whitespace-nowrap`}>{e.at}</td>
                    <td className={a.tdStrong}>{e.by}</td>
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
            recordAction("응시 보안 설정", ask.what, reason, by);
            setAsk(null);
          }}
        />
      )}
    </>
  );
}

function Stat({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  tone?: "good" | "warn";
}) {
  const color = tone === "good" ? "text-emerald-700" : tone === "warn" ? "text-amber-700" : "";
  return (
    <div className={`${a.panel} p-4`}>
      <p className={a.label}>{label}</p>
      <p className={`${a.metric} mt-1 ${color}`}>{value}</p>
      <p className={`${a.hint} mt-0.5`}>{note}</p>
    </div>
  );
}

/**
 * 응시자별 동적 할당.
 *
 * 한 응시자가 푸는 문항을 은행에서 그때그때 뽑아 배정한다. 옆자리와 겹치되 같지는
 * 않게 하는 것이 목적이다 — 전부 같으면 한 사람이 새어 나가게 하면 전부 새고, 전부
 * 다르면 점수를 견줄 수 없다. 그래서 앵커 자리는 모두에게 똑같이 넣고, 나머지만
 * 돌린다.
 *
 * 아래 숫자는 지금 은행 크기로 계산한 것이다. 실제 배정은 응시가 시작될 때 이뤄진다.
 */
function Allocation({
  pool,
  settings,
  onAsk,
  may,
}: {
  pool: number;
  settings: ReturnType<typeof useSecurity>;
  onAsk: (v: { what: string; patch: Partial<SecuritySettings> }) => void;
  may: boolean;
}) {
  const [perStudent, setPer] = useState(settings.perStudent);
  const [shared, setShared] = useState(settings.shared);

  const rotating = Math.max(0, perStudent - shared);
  /** 돌릴 자리에 넣을 수 있는 문항 — 앵커를 뺀 나머지 */
  const rotatePool = Math.max(0, pool - shared);
  /** 두 응시자가 겹치는 문항 수의 기대값 */
  const overlap =
    rotatePool > 0 ? shared + (rotating * rotating) / rotatePool : perStudent;
  const enough = rotatePool >= rotating * 2;
  const changed = perStudent !== settings.perStudent || shared !== settings.shared;

  return (
    <section className={`${a.panel} mt-6 p-6`}>
      <h3 className={a.cardTitle}>응시자별 동적 할당</h3>
      <p className={`${a.hint} mt-1.5`}>
        전부 같은 문항을 주면 한 사람이 흘렸을 때 전부 새고, 전부 다른 문항을 주면 점수를 견줄 수
        없습니다. 앵커 자리는 모두에게 똑같이 넣고 나머지만 돌립니다.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-4">
        <label className="block">
          <span className={a.label}>한 사람이 푸는 문항</span>
          <input
            type="number"
            min={1}
            max={30}
            value={perStudent}
            onChange={(e) => setPer(Number(e.target.value))}
            disabled={!may}
            className={`${a.input} mt-1.5 w-28`}
          />
        </label>
        <label className="block">
          <span className={a.label}>모두에게 같은 문항</span>
          <input
            type="number"
            min={0}
            max={perStudent}
            value={shared}
            onChange={(e) => setShared(Number(e.target.value))}
            disabled={!may}
            className={`${a.input} mt-1.5 w-28`}
          />
        </label>
        {may && changed && (
          <button
            type="button"
            onClick={() =>
              onAsk({
                what: `할당 규칙 ${settings.perStudent}중 ${settings.shared} → ${perStudent}중 ${shared}`,
                patch: { perStudent, shared },
              })
            }
            className={a.btnPrimary}
          >
            이 규칙으로 바꾸기
          </button>
        )}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <Stat
          label="돌리는 자리"
          value={`${rotating}문항`}
          note={`고정 ${shared} + 회전 ${rotating}`}
        />
        <Stat
          label="회전에 쓸 수 있는 문항"
          value={`${rotatePool}건`}
          note={enough ? "두 배 이상 — 넉넉합니다" : "돌릴 자리의 두 배가 안 됩니다"}
          tone={enough ? "good" : "warn"}
        />
        <Stat
          label="두 응시자가 겹치는 문항"
          value={`${overlap.toFixed(1)}문항`}
          note={`${perStudent}문항 중 · 기대값`}
        />
      </div>

      {!enough && (
        <div className="mt-4">
          <Callout tone="warn" title="지금 은행으로는 돌릴 수 없습니다">
            회전 자리 {rotating}문항을 채우려면 승인 문항이 적어도 {rotating * 2 + shared}건은
            있어야 옆자리와 다른 조합이 나옵니다. 지금은 {pool}건입니다. 출제 워크벤치에서 더
            만들어 검수를 지나야 합니다.
          </Callout>
        </div>
      )}

      <p className={`${a.hint} mt-4`}>
        여기 숫자는 지금 은행 크기로 셈한 것입니다. 실제 배정은 응시가 시작되는 순간에 이뤄지고,
        누가 어떤 조합을 받았는지는 이벤트 로그(ADM-11)에 남습니다.
      </p>
    </section>
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
