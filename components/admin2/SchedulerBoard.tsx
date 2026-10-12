"use client";

import Link from "next/link";
import { useState } from "react";
import { n } from "@/lib/admin2";
import {
  leftDayChoices,
  memberYearChoices,
  type PurgePolicy,
} from "@/lib/purgePolicy";
import {
  dayChoices,
  hourChoices,
  hourLabel,
  hourOf,
  nextRelease,
  policyEffect,
  policyText,
  type SendPolicy,
  type SendRow,
} from "@/lib/reportRelease";
import { Body, FormRow, PageHead, Panel } from "./ui";

/**
 * ADM-13-2 스케줄러 — 사람이 누르지 않아도 정해 둔 때에 일어나는 일을 한곳에서 정한다.
 *
 * 스케줄러가 화면마다 흩어져 있었다. 리포트를 며칠 뒤에 내보낼지는 리포트 승인에, 개인정보를
 * 언제 파기 대기에 올릴지는 「파기 스케줄러」에 있어서, 「지금 무엇이 저절로 돌아가는가」를 알려면
 * 화면을 하나씩 열어 봐야 했다. 값을 여기로 모으고, 일하는 화면은 그 값을 읽기만 한다.
 *
 *   리포트 스케줄러    채점이 끝난 리포트를 며칠 뒤 몇 시에 발행하는가   → 리포트 승인(EXP-08)
 *   개인정보 스케줄러  보관기간이 지난 개인정보를 파기 대기에 올리는가   → 개인정보 파기(ADM-10-1)
 *
 * ── 판마다 따로 저장한다 ──
 * 두 스케줄러는 서로 상관없는 일이고 무게도 다르다. 리포트 쪽은 날을 당기면 예정 시각이 지난
 * 리포트가 **저장하는 순간 나간다** — 되돌릴 수 없다. 화면 아래의 저장 하나에 둘을 묶으면
 * 보관기간을 고치다가 리포트까지 내보내게 된다. 판마다 무엇이 달라지는지를 적고 따로 받는다.
 *
 * ── 여기서 지우거나 내보내지 않는다 ──
 * 이 화면이 정하는 것은 「언제」뿐이다. 먼저 내보낼 리포트를 고르는 일과 파기를 실행하는 일은
 * 그 대상을 보는 화면에서 한다 — 판 머리의 단추가 그 화면으로 간다.
 *
 * 새 스케줄러가 생기면 판을 하나 더 세운다. 판마다 「언제」를 정하는 칸이 맨 위에 오고, 그
 * 스케줄러에만 있는 부가 항목(발행 시각 · 보관기간)이 그 아래에 온다.
 *
 * 값을 읽고 저장하는 일은 부르는 쪽이 한다. 실제 화면(app/(admin2)/admin2/schedulers)은
 * 저장소를, 디자인 보기는 적어 둔 예시를 넘긴다.
 */

export type ReportDraft = { days: number; hour: number };

export type ReportSchedule = {
  policy: SendPolicy;
  /** 리포트 목록 — 지금 몇 건이 기다리는지와, 바꾸면 무엇이 달라지는지를 여기서 센다 */
  rows: SendRow[];
  /** 지금 — "2026-10-12 14:05" */
  now: string;
  /** 리포트 승인 화면 */
  href: string;
  /** 처음부터 골라져 있을 값 — 디자인 보기가 「고치는 중」을 그릴 때만 넘긴다 */
  draft?: ReportDraft;
  onSave: (next: ReportDraft) => void;
  onCancel?: () => void;
};

export type PurgeCount = { expired: number; withdrawn: number };

export type PrivacySchedule = {
  policy: PurgePolicy;
  /** 마지막으로 고친 때와 사람 — 한 번도 고치지 않았으면 없다 */
  setAt?: string;
  setBy?: string;
  /** 지금 파기 대기에 올라 있는 것 */
  queued: PurgeCount;
  /** 이렇게 바꾸면 파기 대기가 몇 건이 되는가 */
  preview: (next: PurgePolicy) => PurgeCount;
  /** 개인정보 파기 화면 */
  href: string;
  draft?: PurgePolicy;
  onSave: (next: PurgePolicy) => void;
  onCancel?: () => void;
};

export default function SchedulerBoard({
  report,
  privacy,
  children,
}: {
  report: ReportSchedule;
  privacy: PrivacySchedule;
  /** 판 아래에 붙일 것 — 예시 자료 고지 */
  children?: React.ReactNode;
}) {
  return (
    <>
      <PageHead title="스케줄러" />
      <Body className="grid gap-3">
        {/* 저장한 값이 바뀌면 판을 새로 세운다 — 저장한 값이 곧 「지금 골라져 있는 값」이다 */}
        <ReportPanel
          key={`${report.policy.days}-${hourOf(report.policy)}-${report.draft ? "d" : ""}`}
          {...report}
        />
        <PrivacyPanel
          key={`${privacy.policy.auto}-${privacy.policy.leftDays}-${privacy.policy.memberYears}-${privacy.draft ? "d" : ""}`}
          {...privacy}
        />
      </Body>
      {children}
    </>
  );
}

/** 판 맨 아래 — 마지막으로 고친 때, 그리고 취소 · 저장 */
function SaveRow({
  dirty,
  last,
  onCancel,
  onSave,
}: {
  dirty: boolean;
  /** 마지막으로 고친 때와 사람 */
  last?: string;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5 px-3 py-2.5">
      <span className="mr-auto a2-t-xs text-(--a2-ink-4)">
        {dirty
          ? "저장하지 않은 변경이 있습니다."
          : last
            ? `마지막 변경 ${last}`
            : "처음 정해 둔 값입니다."}
      </span>
      <button type="button" className="a2-btn" disabled={!dirty} onClick={onCancel}>
        취소
      </button>
      <button type="button" className="a2-btn a2-btn-primary" disabled={!dirty} onClick={onSave}>
        저장
      </button>
    </div>
  );
}

/* ───────────────────────── 리포트 스케줄러 ───────────────────────── */

function ReportPanel({ policy, rows, now, href, draft, onSave, onCancel }: ReportSchedule) {
  const saved = { days: policy.days, hour: hourOf(policy) };
  const [days, setDays] = useState(draft?.days ?? saved.days);
  const [hour, setHour] = useState(draft?.hour ?? saved.hour);
  const dirty = days !== saved.days || hour !== saved.hour;

  const waiting = rows.filter((r) => r.send === "waiting");
  const stopped = waiting.filter((r) => r.stop).length;
  const next = nextRelease(rows);
  const effect = policyEffect(rows, { days, hour }, now);
  /* 예전에 차림표보다 긴 일수를 저장해 둔 브라우저가 있을 수 있다 — 그 값도 고를 수 있게 둔다 */
  const dayList = [...new Set([...dayChoices, saved.days, days])].sort((a, b) => a - b);
  const hourList = [...new Set([...hourChoices, saved.hour, hour])].sort((a, b) => a - b);

  return (
    <Panel
      title="리포트 스케줄러"
      /* 좁은 화면에서는 설명을 접는다 — 판 이름이 설명에 밀려 「리포트…」로 잘린다 */
      meta={<span className="max-sm:hidden">채점이 끝난 리포트를 정해 둔 때에 자동으로 발행합니다</span>}
      actions={
        <Link href={href} className="a2-btn a2-btn-sm">
          리포트 승인
        </Link>
      }
      flush
    >
      <div className="a2-form" style={{ borderTop: 0 }}>
        <FormRow label="발행하는 날">
          <select
            className="a2-select"
            style={{ width: "11.5rem" }}
            aria-label="리포트를 발행하는 날"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            {dayList.map((d) => (
              <option key={d} value={d}>
                {policyText(d)}
              </option>
            ))}
          </select>
          <span className="a2-t-sm text-(--a2-ink-2)">자동으로 발행합니다.</span>
        </FormRow>

        <FormRow
          label="발행 시각"
          hint={
            days === 0
              ? "채점이 끝나는 대로 발행할 때는 시각을 기다리지 않습니다."
              : "결과 알림이 함께 나가는 시각입니다."
          }
        >
          <select
            className="a2-select"
            style={{ width: "7.5rem" }}
            aria-label="리포트를 발행하는 시각"
            value={hour}
            disabled={days === 0}
            onChange={(e) => setHour(Number(e.target.value))}
          >
            {hourList.map((h) => (
              <option key={h} value={h}>
                {hourLabel(h)}
              </option>
            ))}
          </select>
        </FormRow>

        <FormRow
          label="지금 상태"
          hint="예정일 전에 내보낼 리포트는 리포트 승인에서 그 리포트에 들어가 「지금 발행」을 누릅니다."
        >
          <span className="a2-t-sm text-(--a2-ink-2)">
            발행 예정 <b className="a2-num text-(--a2-ink)">{n(waiting.length - stopped)}건</b>
            {stopped > 0 && (
              <>
                {" "}
                · 확인 필요 <b className="a2-num text-(--a2-ink)">{n(stopped)}건</b>
              </>
            )}
          </span>
          {next && (
            <span className="a2-t-sm text-(--a2-ink-3)">
              다음 자동 발행 <span className="a2-mono">{next.at}</span> · {n(next.count)}건
            </span>
          )}
        </FormRow>
      </div>

      {dirty && (
        <div className="px-3 pt-2.5">
          <p
            className="a2-note"
            style={{ borderLeftColor: effect.release > 0 ? "var(--a2-warn)" : undefined }}
          >
            <span>
              저장하면 아직 발행하지 않은 리포트 <b>{n(effect.moved)}건</b>의 발행 예정 시각이
              바뀝니다.
              {effect.release > 0 && (
                <>
                  {" "}
                  이 가운데 <b>{n(effect.release)}건</b>은 새 예정 시각이 이미 지나, 저장하는 즉시
                  발행됩니다. 발행한 리포트는 되돌릴 수 없습니다.
                </>
              )}
            </span>
          </p>
        </div>
      )}

      <SaveRow
        dirty={dirty}
        last={policy.at ? `${policy.at} · ${policy.by ?? ""}` : undefined}
        onCancel={() => {
          setDays(saved.days);
          setHour(saved.hour);
          onCancel?.();
        }}
        onSave={() => onSave({ days, hour })}
      />
    </Panel>
  );
}

/* ───────────────────────── 개인정보 스케줄러 ───────────────────────── */

function PrivacyPanel({
  policy,
  setAt,
  setBy,
  queued,
  preview,
  href,
  draft,
  onSave,
  onCancel,
}: PrivacySchedule) {
  const [auto, setAuto] = useState(draft?.auto ?? policy.auto);
  const [leftDays, setLeftDays] = useState(draft?.leftDays ?? policy.leftDays);
  const [memberYears, setMemberYears] = useState(draft?.memberYears ?? policy.memberYears);
  const dirty =
    auto !== policy.auto || leftDays !== policy.leftDays || memberYears !== policy.memberYears;

  const after = dirty ? preview({ auto, leftDays, memberYears }) : queued;
  const leftList = [...new Set([...leftDayChoices, policy.leftDays, leftDays])].sort((a, b) => a - b);
  const memberList = [...new Set([...memberYearChoices, policy.memberYears, memberYears])].sort(
    (a, b) => a - b,
  );

  return (
    <Panel
      title="개인정보 스케줄러"
      meta={<span className="max-sm:hidden">보관기간이 지난 개인정보를 파기 대기에 올립니다</span>}
      actions={
        <Link href={href} className="a2-btn a2-btn-sm">
          개인정보 파기
        </Link>
      }
      flush
    >
      <div className="a2-form" style={{ borderTop: 0 }}>
        <FormRow label="자동 파기">
          <span className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <label className="a2-choice">
              <input
                type="radio"
                name="auto-purge"
                checked={auto}
                onChange={() => setAuto(true)}
              />
              보관기간이 지나면 파기 대기에 올립니다
            </label>
            <label className="a2-choice">
              <input
                type="radio"
                name="auto-purge"
                checked={!auto}
                onChange={() => setAuto(false)}
              />
              올리지 않습니다
            </label>
          </span>
        </FormRow>

        <FormRow
          label="보관기간"
          hint="개인정보 처리방침에 적힌 보관기간과 같아야 합니다."
        >
          <span className="a2-t-sm text-(--a2-ink-2)">탈퇴한 회원은 탈퇴</span>
          <select
            className="a2-select"
            style={{ width: "6rem" }}
            aria-label="탈퇴한 회원의 보관기간"
            value={leftDays}
            onChange={(e) => setLeftDays(Number(e.target.value))}
          >
            {leftList.map((d) => (
              <option key={d} value={d}>
                {d}일
              </option>
            ))}
          </select>
          <span className="a2-t-sm text-(--a2-ink-2)">뒤 · 그 밖의 회원은 가입</span>
          <select
            className="a2-select"
            style={{ width: "5.5rem" }}
            aria-label="그 밖의 회원의 보관기간"
            value={memberYears}
            onChange={(e) => setMemberYears(Number(e.target.value))}
          >
            {memberList.map((y) => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </select>
          <span className="a2-t-sm text-(--a2-ink-2)">뒤</span>
        </FormRow>

        <FormRow
          label="지금 상태"
          hint="파기 대기에 올라도 저절로 지워지지 않습니다. 개인정보 파기에서 사유를 적고 사람이 실행합니다. 철회 요청은 스케줄러와 상관없이 요청한 날 대기에 올라갑니다."
        >
          <span className="a2-t-sm text-(--a2-ink-2)">
            파기 대기{" "}
            <b className="a2-num text-(--a2-ink)">{n(queued.expired + queued.withdrawn)}건</b>
          </span>
          <span className="a2-t-sm text-(--a2-ink-3)">
            보관기간 도래 {n(queued.expired)}건 · 철회 요청 {n(queued.withdrawn)}건
          </span>
        </FormRow>
      </div>

      {dirty && (
        <div className="px-3 pt-2.5">
          <p className="a2-note">
            <span>
              {after.expired === queued.expired ? (
                <>
                  저장해도 파기 대기는 그대로입니다(보관기간 도래 <b>{n(queued.expired)}건</b>).
                </>
              ) : (
                <>
                  저장하면 보관기간이 지나 파기 대기에 오르는 개인정보가{" "}
                  <b>{n(queued.expired)}건</b>에서 <b>{n(after.expired)}건</b>으로 바뀝니다.
                </>
              )}{" "}
              지우는 일은 개인정보 파기에서 따로 실행합니다.
            </span>
          </p>
        </div>
      )}

      <SaveRow
        dirty={dirty}
        last={setAt ? `${setAt} · ${setBy ?? ""}` : undefined}
        onCancel={() => {
          setAuto(policy.auto);
          setLeftDays(policy.leftDays);
          setMemberYears(policy.memberYears);
          onCancel?.();
        }}
        onSave={() => onSave({ auto, leftDays, memberYears })}
      />
    </Panel>
  );
}
