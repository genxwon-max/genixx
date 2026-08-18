"use client";

import { useState } from "react";
import { can } from "@/lib/admin";
import { recordAction, useAdminPrefs } from "@/lib/adminStore";
import { ANCHOR_RATIO, talentOf } from "@/lib/blueprint";
import { roundsOf, useForms } from "@/lib/formStore";
import { setAnchor, useItems, type ItemDraft } from "@/lib/itemStore";
import { ItemCode, LevelText, RateText, StateText } from "./itemColumns";
import { Callout, TableCard } from "./Parts";
import * as a from "./ui";

/**
 * 앵커 문항 (ADM-04-2).
 *
 * 앵커는 회차가 달라도 같은 잣대로 재기 위해 두는 기준 문항이다. 26A와 26B의 점수를
 * 견주려면 두 회차에 똑같이 들어간 문항이 있어야 하고(등화), 그 문항이 흔들리면
 * 회차 사이의 성장 그래프가 통째로 흔들린다.
 *
 * 그래서 두 가지를 화면에 세운다.
 *
 *  1) **비율** — 발주서 §7.1의 30%를 채우고 있는가. 단계별로 나눠 본다. 한 단계에만
 *     앵커가 몰리면 그 단계 밖에서는 등화가 되지 않는다.
 *  2) **공개 여부** — 밖으로 나간 적이 있는 문항은 앵커가 될 수 없다. 답이 알려진
 *     문항은 기준 노릇을 못 한다. 지정 버튼 자체를 막고 까닭을 적어 둔다.
 *
 * 노출 이력은 따로 저장하지 않고 확정된 검사지에서 뽑아 온다. 두 군데 적으면 언젠가
 * 어긋나고, 어긋난 순간 어느 쪽이 맞는지 아무도 답할 수 없다.
 */
export default function AnchorPanel() {
  const items = useItems();
  const forms = useForms();
  const prefs = useAdminPrefs();
  const [ask, setAsk] = useState<{ item: ItemDraft; on: boolean } | null>(null);

  const mayEdit = can(prefs.role, "item.review");
  const by = prefs.staffName || "운영자";

  /* 앵커 비율은 「확정된 문항」을 모수로 본다. 아직 검수도 안 지난 초안까지 세면
     비율이 저절로 낮아 보이고, 그 숫자로는 아무 판단도 할 수 없다. */
  const confirmed = items.filter((i) => i.state === "approved" || i.state === "retired");
  const anchors = confirmed.filter((i) => i.anchor);
  const ratio = confirmed.length > 0 ? anchors.length / confirmed.length : 0;
  const target = Math.ceil(confirmed.length * ANCHOR_RATIO);

  /* 앵커로 삼을 수 있는데 아직 아닌 것 */
  const candidates = items.filter((i) => i.state === "approved" && !i.anchor && !i.disclosed);
  const blocked = items.filter((i) => i.state === "approved" && !i.anchor && i.disclosed);
  const retiredAnchors = anchors.filter((i) => i.state === "retired");
  /* 앵커로 삼은 뒤에 공개되는 일도 있다. 지정 때만 막으면 그 뒤는 못 잡는다. */
  const leaked = anchors.filter((i) => i.disclosed);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="앵커 문항"
          value={`${anchors.length}건`}
          note={`확정 문항 ${confirmed.length}건 중`}
        />
        <Stat
          label="지금 비율"
          value={`${Math.round(ratio * 100)}%`}
          note={`목표 ${Math.round(ANCHOR_RATIO * 100)}% · ${target}건`}
          tone={ratio >= ANCHOR_RATIO ? "good" : "warn"}
        />
        <Stat
          label="앵커로 삼을 수 있는 문항"
          value={`${candidates.length}건`}
          note={blocked.length > 0 ? `공개되어 못 쓰는 것 ${blocked.length}건 별도` : "승인된 문항"}
        />
      </div>

      {ratio < ANCHOR_RATIO && (
        <div className="mt-5">
          <Callout tone="warn" title={`앵커가 ${target - anchors.length}건 모자랍니다`}>
            앵커가 모자라면 회차 사이의 점수를 견줄 수 없습니다. 아래에서 승인된 문항을 앵커로
            삼으시면 됩니다. 앵커는 사후 공개하지 않고 오래 씁니다.
          </Callout>
        </div>
      )}

      {retiredAnchors.length > 0 && (
        <div className="mt-5">
          <Callout tone="warn" title="사용 중지된 문항이 앵커로 남아 있습니다">
            {retiredAnchors.map((i) => i.code || i.id).join(", ")} — 회차에 나가지 않는 문항은 등화
            기준이 되지 못합니다. 앵커에서 빼거나 다시 쓰기로 되돌려 주세요.
          </Callout>
        </div>
      )}

      {leaked.length > 0 && (
        <div className="mt-5">
          <Callout tone="warn" title="공개된 문항이 앵커로 남아 있습니다">
            {leaked.map((i) => i.code || i.id).join(", ")} — 답이 알려진 문항은 회차 간 잣대가 되지
            못합니다. 앵커에서 빼고 다른 문항으로 채워 주세요.
          </Callout>
        </div>
      )}

      <div className="mt-6">
        <TableCard
          title={`앵커로 지정된 문항 ${anchors.length}건`}
          caption="노출 이력은 확정된 검사지에서 읽어 옵니다. 앵커는 여러 회차에 되풀이해 나가는 것이 정상입니다 — 막아야 하는 것은 되풀이가 아니라 공개입니다."
        >
          {anchors.length === 0 ? (
            <p className={`${a.bodyText} px-5 py-8`}>아직 앵커로 지정된 문항이 없습니다.</p>
          ) : (
            <Table
              rows={anchors}
              forms={forms}
              mayEdit={mayEdit}
              onToggle={(item) => setAsk({ item, on: false })}
              actionLabel="앵커에서 빼기"
            />
          )}
        </TableCard>
      </div>

      <div className="mt-6">
        <TableCard
          title={`앵커로 삼을 수 있는 문항 ${candidates.length}건`}
          caption="승인되었고 샘플·설명회 자료로 공개된 적이 없는 문항입니다. 회차에 나갔던 것은 상관없습니다 — 앵커는 원래 되풀이해 나갑니다."
        >
          {candidates.length === 0 ? (
            <p className={`${a.bodyText} px-5 py-8`}>
              지금 앵커로 삼을 수 있는 문항이 없습니다. 승인된 문항이 더 있어야 합니다.
            </p>
          ) : (
            <Table
              rows={candidates}
              forms={forms}
              mayEdit={mayEdit}
              onToggle={(item) => setAsk({ item, on: true })}
              actionLabel="앵커로 삼기"
            />
          )}
        </TableCard>
      </div>

      {blocked.length > 0 && (
        <div className="mt-6">
          <TableCard
            title={`공개되어 앵커로 쓸 수 없는 문항 ${blocked.length}건`}
            caption="샘플 문항·설명회 자료로 나간 적이 있는 문항입니다. 답이 알려진 문항은 회차 간 잣대가 되지 못합니다."
          >
            <Table rows={blocked} forms={forms} mayEdit={false} />
          </TableCard>
        </div>
      )}

      {!mayEdit && (
        <p className={`${a.hint} mt-3`}>
          앵커 지정·해제는 검수 권한이 있는 사람이 합니다. 지금은 보기만 할 수 있습니다.
        </p>
      )}

      {ask && (
        <AnchorBox
          item={ask.item}
          on={ask.on}
          onClose={() => setAsk(null)}
          onConfirm={(reason) => {
            setAnchor(ask.item.id, ask.on, by, prefs.role, reason);
            recordAction(
              `${ask.item.code || ask.item.id} 문항`,
              ask.on ? "앵커 지정" : "앵커 해제",
              reason,
              by,
            );
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
  const color = tone === "good" ? "text-emerald-700" : tone === "warn" ? "text-rose-700" : "";
  return (
    <div className={`${a.panel} p-4`}>
      <p className={a.label}>{label}</p>
      <p className={`${a.metric} mt-1 ${color}`}>{value}</p>
      <p className={`${a.hint} mt-0.5`}>{note}</p>
    </div>
  );
}

function Table({
  rows,
  forms,
  mayEdit,
  onToggle,
  actionLabel,
}: {
  rows: ItemDraft[];
  forms: ReturnType<typeof useForms>;
  mayEdit: boolean;
  onToggle?: (item: ItemDraft) => void;
  actionLabel?: string;
}) {
  return (
    <table className={a.table}>
      <thead>
        <tr>
          <th className={a.th}>문항번호</th>
          <th className={a.th}>과목 · 학년군</th>
          <th className={a.th}>단계</th>
          <th className={a.th}>재능 축</th>
          <th className={a.th}>난이도 b</th>
          <th className={a.th}>정답률</th>
          <th className={a.th}>나간 회차</th>
          <th className={a.th}>상태</th>
          {mayEdit && <th className={a.th}>할 일</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((i) => {
          const went = roundsOf(i.id, forms);
          return (
            <tr key={i.id}>
              <td className={a.tdStrongTight}>
                <ItemCode item={i} />
              </td>
              <td className={a.tdTight}>
                {i.subject} · {i.band === "3-4" ? "3~4학년군" : "5~6학년군"}
              </td>
              <td className={a.tdTight}>
                <LevelText item={i} />
              </td>
              <td className={a.tdTight}>{talentOf(i.talent).name}</td>
              <td className={a.tdNum}>{i.b}</td>
              <td className={`${a.tdNum} ${a.nowrap}`}>
                <RateText item={i} />
              </td>
              <td className={a.td}>{went.length === 0 ? "아직 없음" : went.join(", ")}</td>
              <td className={a.tdTight}>
                <StateText item={i} note={i.disclosed ? "공개됨" : null} />
              </td>
              {mayEdit && (
                <td className={a.td}>
                  {onToggle && (
                    <button
                      type="button"
                      onClick={() => onToggle(i)}
                      className={a.btnRowGhost}
                    >
                      {actionLabel}
                    </button>
                  )}
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** 앵커로 삼거나 뺄 때 까닭을 받는다 — 등화 기준이 바뀌는 일이라 가볍지 않다 */
function AnchorBox({
  item,
  on,
  onConfirm,
  onClose,
}: {
  item: ItemDraft;
  on: boolean;
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
      aria-labelledby="anchor-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg border border-exam-line bg-white p-6 sm:p-8">
        <h2 id="anchor-title" className={a.pageTitle}>
          {on ? "이 문항을 앵커로 삼습니다" : "이 문항을 앵커에서 뺍니다"}
        </h2>
        <p className={`${a.bodyText} mt-2.5`}>
          {item.code || item.id} · {item.stem}
        </p>
        <p className={`${a.bodyText} mt-2`}>
          {on
            ? "앵커는 여러 회차에 되풀이해 넣어 회차 사이의 점수를 견주는 기준이 됩니다. 삼은 뒤에는 샘플·설명회 자료로 공개하지 않습니다."
            : "빼면 다음 회차부터 이 문항은 등화 기준에서 제외됩니다. 이미 나간 회차의 등화는 그대로입니다."}
        </p>

        <div className="mt-5">
          <label htmlFor="anchor-reason" className={a.label}>
            까닭을 적어 주세요
          </label>
          <p className={`${a.hint} mt-1`}>
            {on
              ? "예: S1 앵커가 한 건뿐이라 같은 단계에서 하나 더 세웁니다"
              : "예: 2027 개정으로 성취기준이 바뀌어 기준으로 쓸 수 없습니다"}
          </p>
          <textarea
            id="anchor-reason"
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
            기록을 남기고 {on ? "앵커로 삼기" : "앵커에서 빼기"}
          </button>
          <button type="button" onClick={onClose} className={a.btnGhost}>
            그만두기
          </button>
        </div>
      </div>
    </div>
  );
}
