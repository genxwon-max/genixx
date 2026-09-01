"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { levelSpecs } from "@/lib/blueprint";
import { itemTone, n } from "@/lib/admin2";
import { useAdminPrefs } from "@/lib/adminStore";
import { addItem, missingFields, rejectLabel, stateLabel, typeLabel, useItems, type ItemDraft } from "@/lib/itemStore";
import DataTable, { type Col, type Filter } from "@/components/admin2/DataTable";
import { Kpi, PageHead, SeedNote, Status, Tag } from "@/components/admin2/ui";
import Generator from "./Generator";

/**
 * EXP-02 문항 출제 — 내 손이 가야 하는 문항만.
 *
 * 문항 은행(ADM-04)은 스물세 문항 전부를 보는 자리다. 이 화면은 그중 **아직 나가지 못한
 * 것**만 세운다 — 작성 중과 반려됨. 둘을 한 목록에 두는 것은 출제자가 하는 일이 같기
 * 때문이다: 열어서 채우고 제출한다. 반려됨이 위로 오는 것은 그쪽이 이미 한 번 검수를
 * 지나온 것이라 무엇을 고쳐야 하는지가 적혀 있어서다.
 *
 * 고치는 자리는 여기가 아니라 문항 상세(ADM-04-1)다. 목록에서 바로 고치게 하면 지문·보기·
 * 정답·채점 기준이 한 줄에 들어가지 않고, 무엇보다 제출 전 체크리스트를 짚는 자리가 사라진다.
 *
 * AI 생성은 별도 주소로 떼지 않고 이 화면 위에서 펼친다(Generator). 만들고 나면 바로 아래
 * 목록에 초안이 쌓이는 것을 같은 화면에서 본다.
 */

const dash = <span className="text-(--a2-ink-4)">—</span>;

/**
 * 왜 돌아왔는지.
 *
 * 두 군데를 본다. 검수판을 거친 반려는 검수 기록(reviews)에 사유 코드로 남고, 그 앞
 * 시절의 문항은 반려 메모(comments · kind reject)만 들고 있다. 기록을 먼저 보고 없으면
 * 메모로 내려간다 — 한쪽만 보면 「반려됨인데 사유 없음」인 줄이 생기고, 그 줄을 여는
 * 사람은 무엇을 고쳐야 하는지 모른 채 상세까지 들어가야 한다.
 *
 * 회차별로 쌓이므로 둘 다 맨 뒤엣것을 읽는다. 앞엣것을 읽으면 이미 고친 지적을 다시
 * 보여 주게 된다.
 */
function whyBack(i: ItemDraft) {
  const last = [...i.reviews].reverse().find((r) => r.verdict !== "approve");
  if (last?.code) return rejectLabel(last.code);
  const memo = [...i.comments].reverse().find((c) => c.kind === "reject");
  return memo?.code ? rejectLabel(memo.code) : (memo?.text ?? "사유 없음");
}

/** 반려됨이 먼저. 이미 검수를 지나와 무엇을 고칠지가 적힌 줄이라 손이 먼저 가야 한다 */
const STATE_ORDER: Record<string, number> = { rejected: 0, draft: 1 };

export default function AuthoringView() {
  const items = useItems();
  const prefs = useAdminPrefs();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const mine = useMemo(
    () =>
      items
        .filter((i) => i.state === "draft" || i.state === "rejected")
        .sort(
          (a, b) =>
            STATE_ORDER[a.state] - STATE_ORDER[b.state] || b.updatedAt.localeCompare(a.updatedAt),
        ),
    [items],
  );

  const drafts = mine.filter((i) => i.state === "draft").length;
  const rejected = mine.filter((i) => i.state === "rejected").length;
  const waiting = items.filter((i) => i.state === "submitted").length;
  const byAi = mine.filter((i) => i.origin === "ai").length;
  /* 제출까지 남은 칸이 없는 것 — 열어서 체크리스트만 짚으면 넘어가는 줄이다 */
  const ready = mine.filter((i) => i.state === "draft" && missingFields(i).length === 0).length;

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
        key: "state",
        head: "상태",
        width: "6rem",
        nowrap: true,
        value: (r) => stateLabel[r.state],
        sort: (r) => STATE_ORDER[r.state],
        cell: (r) => <Status tone={itemTone[r.state]}>{stateLabel[r.state]}</Status>,
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
        key: "type",
        head: "유형",
        width: "4.5rem",
        nowrap: true,
        hide: "md",
        value: (r) => typeLabel(r.type),
        cell: (r) => typeLabel(r.type),
      },
      {
        key: "stem",
        head: "발문",
        clip: true,
        value: (r) => r.stem,
        cell: (r) => (
          <span title={r.stem} className={r.stem ? "" : "text-(--a2-ink-4)"}>
            {r.stem || "아직 비어 있음"}
          </span>
        ),
      },
      {
        /* 반려됨은 왜 돌아왔는지가 이 줄에서 가장 급한 값이다. 작성 중에는 그 자리에
           「제출까지 남은 것」을 세운다 — 둘 다 「지금 뭘 해야 하나」의 답이다 */
        key: "todo",
        head: "할 일",
        width: "13rem",
        clip: true,
        value: (r) =>
          r.state === "rejected" ? whyBack(r) : missingFields(r).join(" · ") || "제출만 남음",
        cell: (r) => {
          if (r.state === "rejected") {
            return (
              <span className="a2-t-sm" style={{ color: "var(--a2-danger)" }} title={whyBack(r)}>
                {whyBack(r)}
              </span>
            );
          }
          const missing = missingFields(r);
          return missing.length === 0 ? (
            <span className="a2-t-sm" style={{ color: "var(--a2-ok)" }}>
              제출만 남음
            </span>
          ) : (
            <span className="a2-t-sm text-(--a2-ink-3)" title={missing.join(" · ")}>
              {missing.join(" · ")}
            </span>
          );
        },
      },
      {
        key: "origin",
        head: "출처",
        width: "5rem",
        nowrap: true,
        hide: "lg",
        value: (r) => (r.origin === "ai" ? "AI 초안" : "사람"),
        cell: (r) => (r.origin === "ai" ? <Tag accent>AI 초안</Tag> : dash),
      },
      {
        key: "updatedAt",
        head: "고친 때",
        width: "8rem",
        nowrap: true,
        hide: "md",
        value: (r) => r.updatedAt,
        cell: (r) => <span className="a2-mono a2-t-sm text-(--a2-ink-3)">{r.updatedAt}</span>,
      },
      {
        key: "act",
        head: "관리",
        width: "5.5rem",
        nowrap: true,
        cell: (r) => (
          <Link href={`/admin2/items/${r.id}`} className="a2-btn a2-btn-sm" aria-label={`${r.code || r.id} 이어 쓰기`}>
            이어 쓰기
          </Link>
        ),
      },
    ],
    [],
  );

  const filters = useMemo<Filter<ItemDraft>[]>(
    () => [
      {
        id: "state",
        label: "상태",
        options: [
          { value: "rejected", label: stateLabel.rejected },
          { value: "draft", label: stateLabel.draft },
        ],
        match: (r, v) => r.state === v,
      },
      {
        id: "subject",
        label: "과목",
        options: [...new Set(mine.map((i) => i.subject))].map((v) => ({ value: v, label: v })),
        match: (r, v) => r.subject === v,
      },
      {
        id: "origin",
        label: "출처",
        options: [
          { value: "ai", label: "AI 초안" },
          { value: "human", label: "사람" },
        ],
        match: (r, v) => (v === "ai" ? r.origin === "ai" : r.origin !== "ai"),
      },
    ],
    [mine],
  );

  return (
    <>
      <PageHead
        title="문항 출제"
        statCols={5}
        meta={
          <>
            <span>
              쓰는 중 <span className="a2-num text-(--a2-ink-2)">{n(mine.length)}</span>
            </span>
            <span aria-hidden>·</span>
            <span>발주서 §1 고정 매핑 · §9 제출 전 체크리스트</span>
          </>
        }
        actions={
          <>
            <Link href="/admin2/items" className="a2-btn">
              문항 은행
            </Link>
            <button type="button" className="a2-btn" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
              AI로 생성
            </button>
            <button
              type="button"
              className="a2-btn a2-btn-primary"
              onClick={() => {
                /* 빈 문항을 만들어 바로 상세로 보낸다. 목록에 빈 줄만 만들어 두면
                   「방금 만든 그것」을 다시 찾아야 한다 */
                const made = addItem(prefs.loginId || "super", prefs.staffName || "운영자");
                router.push(`/admin2/items/${made.id}`);
              }}
            >
              새 문항
            </button>
          </>
        }
        stats={
          <>
            <Kpi label={stateLabel.rejected} value={n(rejected)} unit="문항" sub="검수에서 돌아온 것 — 먼저 본다" />
            <Kpi label={stateLabel.draft} value={n(drafts)} unit="문항" sub={`이 중 제출만 남은 것 ${n(ready)}`} />
            <Kpi label="AI 초안" value={n(byAi)} unit="문항" sub="사람이 아직 안 읽은 것이 섞여 있다" />
            <Kpi
              label={stateLabel.submitted}
              value={n(waiting)}
              unit="문항"
              sub="넘겨 놓은 것"
              href="/admin2/review"
            />
            <Kpi label="한 번에 생성" value={n(20)} unit="문항" sub="초안이 스물을 넘으면 손볼 수 없다" />
          </>
        }
      />

      {open && (
        <Generator
          onCancel={() => setOpen(false)}
          onDone={(made) => {
            setOpen(false);
            /* 한 개면 바로 열어 준다. 여럿이면 목록에 두고 무엇이 들어왔는지 보게 한다 —
               스무 개를 만들어 놓고 첫 개만 열면 나머지 열아홉을 다시 찾아야 한다 */
            if (made.length === 1) router.push(`/admin2/items/${made[0].id}`);
          }}
        />
      )}

      <DataTable
        rows={mine}
        cols={cols}
        filters={filters}
        getKey={(r) => r.id}
        searchHint="문항 ID · 발문 · 단원"
        empty="쓰는 중인 문항이 없습니다. 새 문항을 만들거나 AI로 생성해 보세요."
        toolbarExtra={<span className="a2-t-xs text-(--a2-ink-4)">기본 차례 · 반려됨 먼저</span>}
      />

      <SeedNote>
        문항은 이 브라우저에만 저장됩니다(lib/itemStore.ts). AI 생성은 미리 써 둔 본에서 꺼내는 것이며, 붙일 때 생성
        모델 호출로 갈아 끼웁니다.
      </SeedNote>
    </>
  );
}
