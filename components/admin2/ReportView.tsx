"use client";

import Link from "next/link";
import { templateGrades } from "@/lib/reportAssets";
import {
  axisScoresOf,
  dueText,
  hourLabel,
  hourOf,
  policyFullText,
  unmeasuredAxes,
  type SendPolicy,
  type SendRow,
} from "@/lib/reportRelease";
import { Body, DescList, PageHead, Panel, Status, Tag } from "./ui";

/**
 * EXP-08 리포트 상세 — 이 회원의 진단과 리포트, 그리고 언제 나가는가.
 *
 * 판 다섯이 사람이 보는 차례 그대로 있다 —
 *
 *   진단 정보  이 아이가 무엇을 어떻게 봤나. 채점이 언제 끝났나
 *   발행       언제 저절로 나가는가, 지금 내보낼 것인가
 *   리포트     무엇이 담겼는지 한 줄. 읽고 고치는 것은 「리포트 보기」 안에서
 *   조립 내역  규칙마다 — 어느 문단을 넣었고 무엇을 보고 골랐는가, 넣지 않았으면 왜인가
 *   기록       조립 · 수정 · 발행
 *
 * ── 조립 내역을 따로 세운 까닭 ──
 * 리포트의 글은 규칙이 골라 세운 것이다(lib/reportAssembly.ts). 문장만 보여 주면 검토자는 읽기
 * 좋은 글인지만 보게 되고, 정작 이 아이 자료에서 나온 말인지는 확인할 수 없다. 규칙마다 본 값을
 * 적고, **붙지 않은 규칙도 까닭과 함께** 적는다 — 「낮게 나온 축 문단이 왜 없지」에 답할 자리가
 * 있어야 한다. 「리포트 보기」는 회원이 받는 꼴이라 이 정보를 두지 않는다.
 *
 * ── 가만히 두어도 나간다 ──
 * 예정일(채점 완료일 + 스케줄러의 일수)이 되면 스케줄러가 발행한다. 이 화면에서 사람이 하는
 * 일은 그 전에 읽어 보고, 고칠 것을 고치고, 먼저 내보내야 하면 「지금 발행」을 누르는 것이다.
 *
 * 검토가 필요한 표현이 남아 있으면 자동 발행에서 빠지고 「지금 발행」도 잠긴다. 그 표현을
 * 고쳐야 나간다 — 눌러 놓고 아무 일도 일어나지 않는 단추를 만들지 않는다.
 *
 * ⚠ 이미 발행한 리포트는 고치지 못한다. 보호자가 이미 읽은 글이라 뒤에서 바뀌면 안 된다.
 *
 * 값을 읽고 저장하는 일은 부르는 쪽이 한다. 실제 화면(app/(admin2)/…/ReportDetail.tsx)은
 * 저장소를, 디자인 보기는 적어 둔 예시를 넘긴다. 창(발행 확인 · 리포트 보기)을 여닫는 것도
 * 부르는 쪽이 정한다 — 디자인 보기는 창이 열린 화면을 주소로 가른다.
 */
export default function ReportView({
  row,
  policy,
  back,
  sheetHref,
  templatesHref = "/admin2/reports/templates",
  rulesHref,
  templateHrefOf,
  asking,
  onAsk,
  onAskClose,
  onPublish,
  onPreview,
  children,
}: {
  row: SendRow;
  policy: SendPolicy;
  back: React.ReactNode;
  /** 이 리포트가 나온 답안지 — 회원 채점의 정오표. 없으면 링크를 두지 않는다 */
  sheetHref?: string;
  /** 해석 템플릿 목록 */
  templatesHref?: string;
  /** 조립 규칙 화면 — 없으면 단추를 두지 않는다 */
  rulesHref?: string;
  /** 문단의 문구가 든 칸으로 가는 주소 — 없으면 링크를 두지 않는다 */
  templateHrefOf?: (source: string) => string | null;
  /** 「지금 발행」 확인 창이 열려 있는가 */
  asking: boolean;
  onAsk: () => void;
  onAskClose: () => void;
  onPublish: () => void;
  onPreview: () => void;
  /** 「리포트 보기」 창과 예시 자료 고지 */
  children?: React.ReactNode;
}) {
  const sent = row.send === "sent";
  const scores = axisScoresOf(row);
  /** 발행할 수 없는 사유 — 없으면 발행할 수 있다 */
  const stop = row.banned > 0 ? "검토가 필요한 표현이 있어 발행할 수 없습니다." : null;
  const left = dueText(row.daysLeft);
  const early = !!row.sendOn && row.daysLeft !== null && row.daysLeft > 0;

  return (
    <>
      <PageHead
        title={`${row.student} 리포트`}
        back={back}
        actions={
          sent ? (
            <Status tone="muted">
              {row.auto ? "자동 발행" : "직접 발행"} · {row.sentAt}
            </Status>
          ) : (
            <button
              type="button"
              className="a2-btn a2-btn-primary"
              disabled={!!stop}
              title={stop ?? undefined}
              onClick={onAsk}
            >
              지금 발행
            </button>
          )
        }
      />

      <Body className="grid gap-3">
        {!sent && row.banned > 0 && (
          <p className="a2-note" style={{ borderLeftColor: "var(--a2-danger)" }}>
            <span>
              검토가 필요한 표현이 {row.banned}개 있어 자동 발행되지 않습니다. 「리포트 보기」에서
              해당 문단을 고쳐 주세요.
            </span>
          </p>
        )}

        <Panel title="진단 정보" meta={row.id}>
          <div className="grid gap-3 lg:grid-cols-[1fr_18rem]">
            <DescList
              rows={[
                { k: "회원", v: `${row.student} · ${row.grade}` },
                { k: "진단명", v: row.round },
                {
                  k: "재능 유형",
                  v: (
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-(--a2-ink)">{row.typeName}</span>
                      <Tag accent>{row.typeCode}</Tag>
                    </span>
                  ),
                },
                {
                  k: "채점 완료",
                  v: (
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="a2-mono">{row.gradedAt ?? row.gradedOn ?? ""}</span>
                      {sheetHref && (
                        <Link href={sheetHref} className="a2-t-xs underline text-(--a2-ink-3)">
                          답안지 보기
                        </Link>
                      )}
                    </span>
                  ),
                },
                {
                  k: "검토",
                  v:
                    row.banned > 0 ? (
                      <Status tone="danger">검토필요 {row.banned}개</Status>
                    ) : row.cautions > 0 ? (
                      <Status tone="warn">검토중 {row.cautions}개</Status>
                    ) : (
                      <Status tone="ok">완료</Status>
                    ),
                },
              ]}
            />

            {/* 축 점수는 블록의 근거 줄에서 뽑아 온다 — 조립기가 본 값 그대로다 */}
            <div>
              <p className="a2-label mb-2">측정된 축</p>
              {scores.length === 0 ? (
                <p className="a2-t-sm text-(--a2-ink-3)">근거에 적힌 점수가 없습니다.</p>
              ) : (
                <ul className="grid gap-1.5">
                  {/* ⚠ ui.tsx의 Bar를 쓰지 않는다. 저것은 막대 옆에 제 손으로 「78%」를
                      찍는데 축 점수는 비율이 아니라 점수라, 옆에 적은 「78」과 겹쳐
                      「78% 78」이 나란히 보였다. 막대만 놓고 숫자는 한 번만 적는다 */}
                  {scores.map((s) => (
                    <li key={s.label} className="flex items-center gap-2">
                      <span className="w-16 shrink-0 a2-t-sm">{s.label}</span>
                      <span
                        className="a2-bar"
                        role="img"
                        aria-label={`${s.label} ${s.score}점`}
                        style={{ width: "100%" }}
                      >
                        <span style={{ width: `${s.score}%` }} />
                      </span>
                      <span className="a2-num w-7 shrink-0 text-right a2-t-sm text-(--a2-ink)">
                        {s.score}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 a2-t-xs text-(--a2-ink-4)">
                측정하지 않은 축 — {unmeasuredAxes.join(" · ")}
              </p>
            </div>
          </div>
        </Panel>

        <Panel
          title="발행"
          meta={sent ? "발행 완료" : `리포트 스케줄러 · ${policyFullText(policy)}`}
        >
          {sent ? (
            <p className="a2-t-sm text-(--a2-ink-2)">
              <span className="a2-mono">{row.sentAt}</span> 에{" "}
              {row.auto ? "자동으로 발행되었습니다." : `${row.sentBy} 님이 발행했습니다.`} 보호자
              화면에 공개되어 있습니다.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="a2-t-sm text-(--a2-ink-2)">
                예정일{" "}
                <span className="a2-mono font-semibold text-(--a2-ink)">{row.sendOn}</span>
              </span>
              <span className="a2-t-sm text-(--a2-ink-3)">{left}</span>
              <span className="a2-t-sm text-(--a2-ink-2)">
                {row.banned > 0
                  ? "검토가 필요한 표현이 있어 자동 발행되지 않습니다. 고친 뒤에 발행할 수 있습니다."
                  : row.due
                    ? "예정일이 지났습니다. 지금 발행하지 않아도 다음 자동 발행 때 나갑니다."
                    : policy.days === 0
                      ? "채점이 끝나는 대로 자동으로 발행됩니다."
                      : `이날 ${hourLabel(hourOf(policy))}에 자동으로 발행됩니다.`}
              </span>
              <button
                type="button"
                className="a2-btn a2-btn-primary ml-auto"
                disabled={!!stop}
                title={stop ?? undefined}
                onClick={onAsk}
              >
                지금 발행
              </button>
            </div>
          )}
        </Panel>

        <Panel
          title="리포트"
          meta={`문단 ${row.blocks.length}개`}
          actions={
            <>
              <Link href={templatesHref} className="a2-btn a2-btn-sm">
                해석 템플릿
              </Link>
              <button type="button" className="a2-btn a2-btn-sm a2-btn-primary" onClick={onPreview}>
                리포트 보기
              </button>
            </>
          }
        >
          {/* 판 안에서 블록을 펴서 고치던 것을 걷었다. 고치는 자리가 둘(판 · 미리보기)이면
              어느 쪽이 실제로 나가는 글인지 묻게 되고, 무엇보다 **고치는 사람이 보아야 하는
              것은 회원이 받는 꼴**이다. 읽는 것도 고치는 것도 「리포트 보기」 안에서 한다 */}
          <p className="a2-t-sm text-(--a2-ink-2)">
            {row.blocks.map((b) => b.section).join(" · ")}
          </p>
          <p className="mt-1 a2-t-xs text-(--a2-ink-4)">
            {sent
              ? "이미 발행한 리포트라 고칠 수 없습니다."
              : "「리포트 보기」에서 회원이 받는 형태로 보고, 그 안에서 고칩니다."}
          </p>
        </Panel>

        <AssemblyPanel
          row={row}
          sent={sent}
          rulesHref={rulesHref}
          templateHrefOf={templateHrefOf}
        />

        <Panel title="기록" meta={`${row.log.length}건`}>
          <ul className="grid gap-1.5">
            {row.log.map((l, k) => (
              <li
                key={`${l.at}-${k}`}
                className="flex flex-wrap items-center gap-x-2 border-l-2 border-(--a2-line-2) pl-2 a2-t-xs"
              >
                <span className="a2-mono text-(--a2-ink-4)">{l.at}</span>
                <span className="font-bold text-(--a2-ink-2)">{l.by}</span>
                <span className="text-(--a2-ink-2)">{l.text}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </Body>

      {children}

      {asking && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
          onClick={onAskClose}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="a2-send-title"
            className="a2-panel w-full max-w-[26rem] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="a2-send-title" className="a2-h">
              {row.student} 님의 리포트를 지금 발행합니다
            </h2>
            <p className="mt-2 a2-t-sm leading-[1.6] text-(--a2-ink-2)">
              발행하는 순간 보호자 화면에 공개됩니다. 되돌릴 수 없습니다.
              {early && (
                <>
                  {" "}
                  예정일(<span className="a2-mono">{row.sendOn}</span>)을 기다리지 않고 지금
                  나갑니다.
                </>
              )}
            </p>
            {row.cautions > 0 && (
              <p className="a2-note mt-3" style={{ borderLeftColor: "var(--a2-warn)" }}>
                <span>검토중인 표현이 {row.cautions}개 있습니다.</span>
              </p>
            )}
            <div className="mt-4 flex flex-wrap justify-end gap-1.5">
              <button type="button" className="a2-btn" onClick={onAskClose}>
                그만두기
              </button>
              <button type="button" className="a2-btn a2-btn-primary" onClick={onPublish}>
                발행
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** 「R-04 · 강하게 나타난 축」을 번호와 이름으로 가른다 */
function ruleParts(rule: string) {
  const cut = rule.indexOf(" · ");
  return cut < 0 ? { id: "", label: rule } : { id: rule.slice(0, cut), label: rule.slice(cut + 3) };
}

/**
 * 조립 내역 — 규칙이 차례대로 무엇을 넣었고, 무엇을 보고 골랐는가.
 *
 * 문단을 넣은 규칙이 위에, 넣지 않은 규칙이 아래에 있다. 넣지 않은 규칙에도 까닭을 적는다 —
 * 「측정한 축이 하나라 견줄 축이 없습니다」처럼, 문단이 없는 것이 규칙대로인지 빠뜨린 것인지를
 * 여기서 가린다.
 */
function AssemblyPanel({
  row,
  sent,
  rulesHref,
  templateHrefOf,
}: {
  row: SendRow;
  sent: boolean;
  rulesHref?: string;
  templateHrefOf?: (source: string) => string | null;
}) {
  const skipped = row.skipped ?? [];
  const total = row.blocks.length + skipped.length;

  return (
    <Panel
      title="조립 내역"
      meta={`규칙 ${total}개 가운데 ${row.blocks.length}개가 문단을 넣었습니다`}
      actions={
        rulesHref ? (
          <Link href={rulesHref} className="a2-btn a2-btn-sm">
            조립 규칙
          </Link>
        ) : undefined
      }
      flush
    >
      <div className="a2-table-wrap">
        <table className="a2-table">
          <thead>
            <tr>
              <th style={{ width: "12.5rem" }}>규칙</th>
              <th style={{ width: "13.5rem" }}>넣은 문단</th>
              <th>규칙이 본 값</th>
            </tr>
          </thead>
          <tbody>
            {row.blocks.map((b) => {
              const rule = ruleParts(b.rule);
              const href = b.source ? (templateHrefOf?.(b.source) ?? null) : null;
              const from = b.fellBack
                ? (templateGrades.find((g) => g.id === b.fellBack)?.short ?? b.fellBack)
                : null;
              return (
                <tr key={b.id}>
                  <td className="a2-td-key">
                    {rule.label}
                    {rule.id && (
                      <span className="mt-0.5 block a2-mono a2-t-xs font-normal text-(--a2-ink-4)">
                        {rule.id}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className="a2-t-sm text-(--a2-ink)">{b.title}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 a2-t-xs">
                      <span className="text-(--a2-ink-3)">{b.section}</span>
                      {b.override && <Status tone="info">수정됨</Status>}
                      {from && <Status tone="warn">{from} 문구로 대체</Status>}
                      {href && (
                        <Link href={href} className="underline text-(--a2-ink-3)">
                          문구 보기
                        </Link>
                      )}
                    </span>
                  </td>
                  <td className="a2-t-sm leading-[1.6] text-(--a2-ink-2)">{b.evidence}</td>
                </tr>
              );
            })}
            {skipped.map((s) => (
              <tr key={s.ruleId} data-on="false">
                <td className="a2-td-key">
                  {s.label}
                  <span className="mt-0.5 block a2-mono a2-t-xs font-normal text-(--a2-ink-4)">
                    {s.ruleId}
                  </span>
                </td>
                <td>
                  <Status tone="muted">제외</Status>
                </td>
                <td className="a2-t-sm leading-[1.6] text-(--a2-ink-3)">{s.why}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-(--a2-line) px-3 py-2 a2-t-xs text-(--a2-ink-4)">
        {sent
          ? "발행한 리포트라 더 이상 바뀌지 않습니다."
          : "발행하기 전에는 채점 · 조립 규칙 · 해석 템플릿을 고치면 이 리포트도 다시 조립됩니다."}
      </p>
    </Panel>
  );
}
