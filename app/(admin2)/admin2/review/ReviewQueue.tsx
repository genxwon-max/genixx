"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { gradeText, levelSpecs } from "@/lib/blueprint";
import { n } from "@/lib/admin2";
import { downloadAuditCsv, printAudit } from "@/lib/auditReport";
import {
  AI_AUDIT_MAX,
  aiAuditable,
  aiVerdictLabel,
  formTextOf,
  humanReviewable,
  reviewChecks,
  runAiAudit,
  stateLabel,
  typeTextOf,
  useItems,
  type ItemDraft,
} from "@/lib/itemStore";
import DataTable, { type Col, type Filter } from "@/components/admin2/DataTable";
import { Body, PageHead, Status, Tab, Tag } from "@/components/admin2/ui";

/**
 * EXP-03 문항 검수 — 넘어온 것만 세운다.
 *
 * 이 화면은 목록이고, 실제 검수(3단 짚기 · 사유 코드 · 승인/반려)는 문항 상세의 오른쪽
 * 검수판에서 한다. 목록에서 승인 단추를 열지 않는 까닭은 하나다 — 검수는 발문·보기·정답·
 * 채점 기준을 **읽고** 하는 일이고, 한 줄짜리 목록에서 누르는 승인은 읽지 않은 승인이다.
 *
 * 그래서 이 화면이 답해야 하는 것은 「무엇부터 여나」뿐이다. 오래 기다린 것이 위로 온다 —
 * 넘긴 사람은 검수를 기다리는 동안 다음 문항을 못 쓰고, 회차 편성은 승인된 문항에서만
 * 고를 수 있다.
 *
 * ── 머리는 지표 띠가 아니라 탭 줄이다 ──
 * 숫자 다섯을 읽기만 하는 띠로 두었을 때는, 「짚는 중 2」를 보고 나서 그 둘을 찾으러
 * 아래 거르개로 내려가야 했다. 지금은 숫자가 곧 조회 조건이다 — 누르면 표가 그 묶음만
 * 남는다. 그래서 표의 출처 거르개도 걷었다. 같은 조건을 두 군데서 걸면 서로 부딪친다.
 *
 * 승인됨·반려됨 탭은 이미 판정이 끝난 것이라 검수할 수 없다. 그 줄에서는 관리 단추도
 * 「검수하기」가 아니라 「문항 열기」로 바뀐다 — 누를 수 없는 일을 같은 글자로 세워 두면
 * 눌러 놓고 왜 안 되는지 상세까지 들어가 확인하게 된다.
 *
 * ⚠ 쓰다 만 검수(reviewDraft)가 있는 줄을 따로 표시한다. 그 줄은 누군가 이미 열어서 짚기
 *   시작한 것이라, 모르고 다시 열면 짚어 둔 것을 덮어쓴다.
 */

const dash = <span className="text-(--a2-ink-4)">—</span>;

/**
 * 3단 중 몇을 짚어 두었나 — 쓰다 만 검수의 진척.
 *
 * ok가 null인 칸은 아직 안 본 것이다. 「걸림(false)」과 「안 봄(null)」은 다른 상태라
 * 참인 것만 세면 걸린 칸을 안 짚은 것으로 세게 된다.
 */
function progressOf(i: ItemDraft) {
  return i.reviewDraft?.checks.filter((c) => c.ok !== null).length ?? 0;
}

type TabId = "ai" | "human" | "started" | "approved" | "rejected";

export default function ReviewQueue() {
  const items = useItems();
  const [tab, setTab] = useState<TabId>("ai");

  /* 오래 기다린 것이 위로. 넘긴 시각을 따로 들고 있지 않으므로 마지막으로 고친 때를
     쓴다 — 제출이 곧 마지막 손질이라 실제로 같은 값이다 */
  const waiting = useMemo(
    () =>
      items
        .filter((i) => i.state === "submitted")
        .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt)),
    [items],
  );

  /* 판정이 끝난 것 — 최근에 판정한 것이 위로. 검수하러 온 사람이 「방금 내가 넘긴 것」을
     되짚는 자리라, 오래된 것부터 세우는 대기 목록과 차례가 반대다 */
  const judgedRows = useMemo(
    () =>
      items
        .filter((i) => i.state === "approved" || i.state === "rejected")
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [items],
  );

  /*
   * 탭이 곧 검수 흐름이다(2026-09-21 협의) —
   *   출제 → AI 검수 → 검수자(승인 · 반려) → 문항 은행 / 반려면 출제로 되돌아가 다시 AI 검수.
   *
   * 「AI 검수 대기」는 이번 제출분을 AI가 아직 안 본 것, 「검수자 대기」는 AI 결과가 붙어 사람이
   * 볼 차례인 것이다. AI를 두 번 다 쓴 문항은 곧장 검수자 대기에 선다(lib/itemStore.ts humanReviewable).
   * 「AI 초안」 탭은 걷고 출처 거르개로 옮겼다 — 흐름 탭 사이에 출처 탭이 끼면 어느 탭이 차례인지 흐려진다.
   */
  const tabs = useMemo(
    () => [
      {
        id: "ai" as TabId,
        label: "AI 검수 대기",
        rows: waiting.filter(aiAuditable),
        empty: "AI 검수를 기다리는 문항이 없습니다.",
      },
      {
        id: "human" as TabId,
        label: "검수자 대기",
        rows: waiting.filter(humanReviewable),
        empty: "검수자의 판단을 기다리는 문항이 없습니다.",
      },
      {
        id: "started" as TabId,
        label: "짚는 중",
        rows: waiting.filter((i) => i.reviewDraft),
        empty: "누군가 열어 둔 검수가 없습니다.",
      },
      {
        id: "approved" as TabId,
        label: stateLabel.approved,
        rows: judgedRows.filter((i) => i.state === "approved"),
        empty: "승인한 문항이 없습니다.",
      },
      {
        id: "rejected" as TabId,
        label: stateLabel.rejected,
        rows: judgedRows.filter((i) => i.state === "rejected"),
        empty: "돌려보낸 문항이 없습니다.",
      },
    ],
    [waiting, judgedRows],
  );

  const current = tabs.find((t) => t.id === tab) ?? tabs[0];
  const rows = current.rows;

  /*
   * AI 검수를 돌린다 (EXP-03-2).
   *
   * 대상은 **AI 검수 대기 전부**다 — 지금 보고 있는 탭이 아니라 돌릴 수 있는 문항 전체. 탭마다
   * 대상이 달라지면 같은 단추가 화면마다 다른 일을 한다.
   *
   * AI는 결론을 내지 않는다. 결과만 붙이고 문항은 검수자 대기로 넘어간다 — 상태가 바뀌지 않으므로
   * 묻지 않고 돌린다. 한 문항에 두 번까지다(AI_AUDIT_MAX).
   *
   * 돌린 뒤에는 그 묶음의 결과를 인쇄 · 다운로드할 수 있다. 문항마다의 결과는 문항 상세의
   * 검수판에서도 뽑는다.
   */
  const [audited, setAudited] = useState<{ text: string; ids: string[] } | null>(null);
  const queue = useMemo(() => waiting.filter(aiAuditable), [waiting]);
  const batch = useMemo(
    () => (audited ? items.filter((i) => audited.ids.includes(i.id)) : []),
    [audited, items],
  );

  const audit = () => {
    if (queue.length === 0) return;
    const r = runAiAudit(queue.map((i) => i.id));
    setAudited({
      text:
        `${n(r.done)}건을 AI로 검수했습니다 — 통과 권고 ${n(r.approved)} · 확인 필요 ${n(r.held)} · 반려 권고 ${n(r.rejected)}. ` +
        "상태는 바꾸지 않았고, 모두 검수자 대기로 넘어갔습니다.",
      ids: r.ids,
    });
    setTab("human");
  };

  const cols = useMemo<Col<ItemDraft>[]>(
    () => [
      {
        key: "code",
        head: "문항 ID",
        width: "8.5rem",
        nowrap: true,
        value: (r) => r.code || r.id,
        cell: (r) => (
          <Link href={`/admin2/items/${r.id}`} className="a2-mono font-semibold text-(--a2-ink) hover:underline">
            {r.code || <span className="text-(--a2-ink-4)">ID 미정</span>}
          </Link>
        ),
      },
      {
        key: "subject",
        head: "과목",
        width: "4rem",
        nowrap: true,
        value: (r) => r.subject,
        cell: (r) => <Tag>{r.subject}</Tag>,
      },
      {
        key: "grade",
        head: "학년",
        width: "4.5rem",
        nowrap: true,
        hide: "md",
        value: (r) => gradeText(r.gradeNo),
        sort: (r) => r.gradeNo,
        cell: (r) => gradeText(r.gradeNo),
      },
      {
        key: "level",
        head: "단계",
        width: "4rem",
        nowrap: true,
        value: (r) => r.level,
        cell: (r) => (
          <span className="a2-mono" title={levelSpecs[r.level].name}>
            {r.level}
          </span>
        ),
      },
      {
        key: "form",
        head: "구성",
        width: "6.5rem",
        nowrap: true,
        value: (r) => formTextOf(r),
        cell: (r) =>
          r.form === "set" ? <Tag accent>{formTextOf(r)}</Tag> : <span className="a2-t-sm text-(--a2-ink-3)">단일</span>,
      },
      {
        key: "type",
        head: "유형",
        width: "7rem",
        nowrap: true,
        hide: "lg",
        value: (r) => typeTextOf(r),
        cell: (r) => (
          <span title={typeTextOf(r)} className="a2-clip">
            {typeTextOf(r)}
          </span>
        ),
      },
      {
        key: "stem",
        head: "발문",
        clip: true,
        value: (r) => r.stem,
        cell: (r) => <span title={r.stem}>{r.stem}</span>,
      },
      {
        key: "author",
        head: "출제자",
        width: "6rem",
        nowrap: true,
        hide: "md",
        value: (r) => r.authorName,
        cell: (r) => r.authorName,
      },
      {
        /* AI 초안은 검수자가 그런 줄 알고 봐야 한다. 특히 태깅 — 축은 사람이 고르고
           문항은 생성되므로 둘이 어긋날 수 있고, 그것을 잡는 자리가 2차 태깅이다 */
        key: "origin",
        head: "출처",
        width: "5rem",
        nowrap: true,
        value: (r) => (r.origin === "ai" ? "AI 초안" : "사람"),
        cell: (r) => (r.origin === "ai" ? <Tag accent>AI 초안</Tag> : dash),
      },
      {
        /*
         * 검수가 어디까지 왔나.
         *
         * 셋 가운데 하나가 선다 — 사람이 열어 짚고 있으면 「짚는 중」, AI 검수가 돌았으면
         * 「AI 검수 완료」, 아무것도 없으면 「아직」.
         *
         * 사람이 먼저다. AI가 돌고 나서 사람이 열어 짚기 시작한 줄에 「AI 검수 완료」가 서
         * 있으면, 그 줄을 다시 열어도 되는 줄로 읽어 짚어 둔 것을 덮어쓴다.
         */
        key: "progress",
        head: "검수",
        width: "9rem",
        nowrap: true,
        value: (r) =>
          r.reviewDraft
            ? `짚는 중 ${progressOf(r)}`
            : r.aiAudit
              ? `AI ${aiVerdictLabel[r.aiAudit.verdict]}`
              : aiAuditable(r)
                ? "AI 검수 전"
                : "",
        sort: (r) => (r.reviewDraft ? -progressOf(r) - 10 : r.aiAudit ? -1 : 0),
        cell: (r) =>
          r.reviewDraft ? (
            <span className="a2-t-sm" style={{ color: "var(--a2-warn)" }}>
              짚는 중 {progressOf(r)}/{reviewChecks.length}
            </span>
          ) : r.aiAudit ? (
            <span title={`${r.aiAudit.at} · 규칙 위반 ${r.aiAudit.blocks} · 확인 필요 ${r.aiAudit.warns}`}>
              <Status
                tone={r.aiAudit.verdict === "reject" ? "danger" : r.aiAudit.verdict === "hold" ? "warn" : "ok"}
              >
                AI {aiVerdictLabel[r.aiAudit.verdict]}
              </Status>
            </span>
          ) : aiAuditable(r) ? (
            <span className="a2-t-sm text-(--a2-ink-4)">AI 검수 전</span>
          ) : (
            dash
          ),
      },
      {
        /* AI 검수는 한 문항에 두 번까지다 — 몇 번 썼는지가 늘 보여야 두 번째를 아껴 쓴다 */
        key: "aiCount",
        head: "AI 횟수",
        width: "5rem",
        nowrap: true,
        hide: "md",
        value: (r) => `${r.aiAuditCount ?? 0}/${AI_AUDIT_MAX}`,
        sort: (r) => r.aiAuditCount ?? 0,
        cell: (r) => (
          <span
            className="a2-mono a2-t-sm"
            style={{ color: (r.aiAuditCount ?? 0) >= AI_AUDIT_MAX ? "var(--a2-danger)" : "var(--a2-ink-3)" }}
          >
            {r.aiAuditCount ?? 0}/{AI_AUDIT_MAX}
          </span>
        ),
      },
      {
        key: "updatedAt",
        head: "넘어온 때",
        width: "8rem",
        nowrap: true,
        value: (r) => r.updatedAt,
        cell: (r) => <span className="a2-mono a2-t-sm text-(--a2-ink-3)">{r.updatedAt}</span>,
      },
      {
        key: "act",
        head: "관리",
        width: "5.5rem",
        nowrap: true,
        cell: (r) =>
          /* 판정이 끝난 줄은 검수할 것이 없다. 같은 글자의 단추를 세워 두면 눌러 놓고
             왜 검수판이 안 열리는지 상세까지 들어가 확인하게 된다 */
          humanReviewable(r) ? (
            <Link
              href={`/admin2/items/${r.id}`}
              className="a2-btn a2-btn-sm a2-btn-primary"
              aria-label={`${r.code || r.id} 검수하기`}
            >
              검수하기
            </Link>
          ) : (
            <Link
              href={`/admin2/items/${r.id}`}
              className="a2-btn a2-btn-sm"
              aria-label={`${r.code || r.id} 문항 열기`}
            >
              문항 열기
            </Link>
          ),
      },
    ],
    [],
  );

  const filters = useMemo<Filter<ItemDraft>[]>(
    () => [
      {
        id: "origin",
        label: "출처",
        options: [
          { value: "ai", label: "AI 초안" },
          { value: "human", label: "사람" },
        ],
        match: (r, v) => (v === "ai" ? r.origin === "ai" : r.origin !== "ai"),
      },
      {
        id: "subject",
        label: "과목",
        options: [...new Set(rows.map((i) => i.subject))].map((v) => ({ value: v, label: v })),
        match: (r, v) => r.subject === v,
      },
      {
        id: "level",
        label: "단계",
        options: [...new Set(rows.map((i) => i.level))]
          .sort()
          .map((v) => ({ value: v, label: `${v} ${levelSpecs[v].name}` })),
        match: (r, v) => r.level === v,
      },
    ],
    [rows],
  );

  return (
    <>
      <PageHead
        title="문항 검수"
        actions={
          <button
            type="button"
            className="a2-btn a2-btn-primary"
            disabled={queue.length === 0}
            title={
              queue.length === 0
                ? "AI 검수를 기다리는 문항이 없습니다"
                : `AI 검수는 한 문항에 ${AI_AUDIT_MAX}번까지 돌릴 수 있습니다`
            }
            onClick={audit}
          >
            AI 문항 검수
            {queue.length > 0 && <span className="a2-num"> {n(queue.length)}</span>}
          </button>
        }
        tabsLabel="상태별 조회 조건"
        tabs={tabs.map((t) => (
          <Tab
            key={t.id}
            label={t.label}
            count={n(t.rows.length)}
            active={tab === t.id}
            onClick={() => setTab(t.id)}
          />
        ))}
      />

      {/* 돌린 결과는 한 줄로 적고 닫을 수 있게 둔다. 표가 그 자리에서 다시 서므로
          무엇이 어디로 갔는지는 이 줄에만 남는다 */}
      {audited && (
        <Body className="pb-0">
          <p className="a2-note" style={{ borderLeftColor: "var(--a2-info)" }}>
            <span>{audited.text}</span>
            <span className="ml-auto flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                className="a2-btn a2-btn-sm"
                disabled={batch.length === 0}
                onClick={() => printAudit(batch)}
              >
                결과 인쇄
              </button>
              <button
                type="button"
                className="a2-btn a2-btn-sm"
                disabled={batch.length === 0}
                onClick={() => downloadAuditCsv(batch)}
              >
                결과 다운로드
              </button>
              <button
                type="button"
                className="text-(--a2-ink-4) hover:text-(--a2-ink)"
                onClick={() => setAudited(null)}
                aria-label="닫기"
              >
                ×
              </button>
            </span>
          </p>
        </Body>
      )}

      {/* 탭을 바꾸면 표를 새로 세운다 — 걸어 둔 검색어·거르개는 그 목록에 맞춰 다시
          고르는 것이 맞다. 조건은 위에 그대로 적혀 있는데 왜 0줄인지는 안 적혀 있다 */}
      <DataTable
        key={tab}
        rows={rows}
        cols={cols}
        filters={filters}
        getKey={(r) => r.id}
        searchHint="문항 ID · 발문 · 출제자"
        empty={current.empty}
        showCount={false}
      />
    </>
  );
}
