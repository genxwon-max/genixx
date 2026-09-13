"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { levelSpecs } from "@/lib/blueprint";
import { itemTone, n } from "@/lib/admin2";
import { useAdminPrefs } from "@/lib/adminStore";
import { addItem, formTextOf, stateLabel, typeTextOf, useItems, type ItemDraft } from "@/lib/itemStore";
import DataTable, { type Col, type Filter } from "@/components/admin2/DataTable";
import { PageHead, Status, Tab, Tag } from "@/components/admin2/ui";
import Generator from "./Generator";

/**
 * EXP-02 문항 출제 — 내 손이 가야 하는 문항만.
 *
 * 문항 은행(ADM-04)은 스물세 문항 전부를 보는 자리다. 이 화면은 그중 **아직 나가지 못한
 * 것**만 세운다 — 작성 중과 반려됨. 둘을 한 목록에 두는 것은 출제자가 하는 일이 같기
 * 때문이다: 열어서 채우고 제출한다. 반려됨이 위로 오는 것은 그쪽이 이미 한 번 검수를
 * 지나온 것이라 무엇을 고쳐야 하는지가 적혀 있어서다.
 *
 * ── 머리 아래는 읽는 띠가 아니라 **누르는 탭 줄**이다 ──
 * 처음에는 지표 칸 다섯 장(반려됨·작성 중·AI 초안·검수 대기·한 번에 생성)을 대시보드로
 * 세워 두었다. 「반려됨 1」을 보고 나서 그 하나를 찾으러 아래 거르개로 다시 내려가야 했고,
 * 칸마다 이름·숫자·설명 석 줄이 들어가 다섯 칸이 화면 절반을 먹었다. 조건을 고르는 데
 * 필요한 것은 「무엇이 몇 개인가」뿐이라, 두 값만 남긴 탭 줄 하나로 눕혔다.
 * 누르면 아래 표가 그 상태만 남는다.
 *
 * 그래서 상태·출처는 표 위 거르개에서 뺐다. 같은 조건을 두 군데서 걸 수 있으면 띠에서
 * 「반려됨」을 고른 채 거르개에서 「작성 중」을 고르는 순간 0줄이 나오고, 사람은 어느 쪽이
 * 이겼는지 모른다. 띠가 상태를 맡고, 거르개는 과목처럼 상태와 겹치지 않는 것만 맡는다.
 *
 * 「검수 대기」 칸만 성격이 다르다 — 내 손을 떠난 것이라 작성 중·반려됨과 같은 목록에
 * 섞지 않고, 그 탭에서만 따로 세운다. 그 줄에서는 이어 쓸 수 없으므로 관리 단추도
 * 검수판으로 가는 문으로 바뀐다.
 *
 * 고치는 자리는 여기가 아니라 문항 상세(ADM-04-1)다. 목록에서 바로 고치게 하면 지문·보기·
 * 정답·채점 기준이 한 줄에 들어가지 않고, 무엇보다 문항을 한 번도 열어 보지 않고 검수로
 * 넘기는 길이 생긴다 — 제출 단추는 상세에만 있다.
 *
 * AI 생성은 별도 주소로 떼지 않고 이 화면 위에서 펼친다(Generator). 만들고 나면 바로 아래
 * 목록에 초안이 쌓이는 것을 같은 화면에서 본다.
 */

/** 반려됨이 먼저. 이미 검수를 지나와 무엇을 고칠지가 적힌 줄이라 손이 먼저 가야 한다 */
const STATE_ORDER: Record<string, number> = { rejected: 0, draft: 1 };

/**
 * 지표 띠의 칸 = 조회 조건.
 *
 * 「전체」를 맨 앞에 둔다. 조건을 걸었다가 푸는 자리가 없으면 다시 누를 것을 찾아
 * 새로고침하게 된다.
 */
type TabId = "all" | "rejected" | "draft" | "ai" | "submitted";

export default function AuthoringView() {
  const items = useItems();
  const prefs = useAdminPrefs();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabId>("all");

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

  /* 내 손을 떠난 것 — 검수 대기 탭에서만 선다. 최근에 넘긴 것이 위로 온다 */
  const submitted = useMemo(
    () =>
      items
        .filter((i) => i.state === "submitted")
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [items],
  );

  const drafts = mine.filter((i) => i.state === "draft").length;
  const rejected = mine.filter((i) => i.state === "rejected").length;
  const byAi = mine.filter((i) => i.origin === "ai").length;

  /**
   * 탭 하나가 곧 하나의 목록이다. 이름·개수·빈 목록 문구를 한자리에 적어 둔다 —
   * 흩어 두면 탭을 늘릴 때 어느 하나를 빠뜨린다.
   *
   * 탭마다 설명을 달지 않는다. 조건을 고르는 데 필요한 것은 「무엇이 몇 개인가」뿐이고,
   * 나머지는 목록 자체가 말한다.
   */
  const tabs = useMemo(
    () => [
      {
        id: "all" as const,
        label: "전체",
        count: mine.length,
        rows: mine,
        empty: "쓰는 중인 문항이 없습니다. 새 문항을 만들거나 AI로 생성해 보세요.",
      },
      {
        id: "rejected" as const,
        label: stateLabel.rejected,
        count: rejected,
        rows: mine.filter((i) => i.state === "rejected"),
        empty: "검수에서 돌아온 문항이 없습니다.",
      },
      {
        id: "draft" as const,
        label: stateLabel.draft,
        count: drafts,
        rows: mine.filter((i) => i.state === "draft"),
        empty: "작성 중인 문항이 없습니다.",
      },
      {
        id: "ai" as const,
        label: "AI 초안",
        count: byAi,
        rows: mine.filter((i) => i.origin === "ai"),
        empty: "AI로 만든 초안이 없습니다. 위의 「AI로 생성」으로 만들 수 있습니다.",
      },
      {
        id: "submitted" as const,
        label: stateLabel.submitted,
        count: submitted.length,
        rows: submitted,
        empty: "검수로 넘긴 문항이 없습니다.",
      },
    ],
    [mine, submitted, rejected, drafts, byAi],
  );

  const current = tabs.find((t) => t.id === tab) ?? tabs[0];
  const rows = current.rows;

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
        /* 세트는 안에 든 유형을 모아 적어 「객관식 · 서술형」처럼 길어진다 */
        width: "7rem",
        nowrap: true,
        hide: "md",
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
        cell: (r) => (
          <span title={r.stem} className={r.stem ? "" : "text-(--a2-ink-4)"}>
            {r.stem || "아직 비어 있음"}
          </span>
        ),
      },
      {
        /* 난이도 b — 단계(S1~S4)가 「무엇을 재는가」라면 b는 「얼마나 어려운가」다.
           둘은 같이 움직이지만 같지 않다. 같은 S2 안에서도 b가 -1.2와 0.4면 검사지에
           나란히 담을 수 없다. 음수가 쉬운 쪽이므로 정렬은 값 그대로 둔다 */
        key: "b",
        head: "난이도",
        width: "5rem",
        num: true,
        nowrap: true,
        value: (r) => r.b,
        cell: (r) => <span className="a2-num a2-t-sm">{r.b.toFixed(1)}</span>,
      },
      {
        key: "author",
        head: "출제자",
        width: "6rem",
        nowrap: true,
        hide: "md",
        value: (r) => r.authorName,
        cell: (r) => (
          <span className="a2-t-sm text-(--a2-ink-2)" title={r.author}>
            {r.authorName}
          </span>
        ),
      },
      {
        key: "createdAt",
        head: "등록일",
        width: "8rem",
        nowrap: true,
        hide: "md",
        value: (r) => r.createdAt,
        cell: (r) => <span className="a2-mono a2-t-sm text-(--a2-ink-3)">{r.createdAt}</span>,
      },
      {
        key: "act",
        head: "관리",
        width: "6.5rem",
        nowrap: true,
        cell: (r) =>
          /* 넘긴 문항은 여기서 고칠 수 없다. 이어 쓰기 단추를 그대로 두면 눌러 놓고
             왜 안 고쳐지는지 상세까지 들어가 확인하게 된다 */
          r.state === "submitted" ? (
            <Link
              href="/admin2/review"
              className="a2-btn a2-btn-sm"
              aria-label={`${r.code || r.id} 검수판에서 보기`}
            >
              검수판에서
            </Link>
          ) : (
            <Link
              href={`/admin2/items/${r.id}`}
              className="a2-btn a2-btn-sm"
              aria-label={`${r.code || r.id} 수정하기`}
            >
              수정하기
            </Link>
          ),
      },
    ],
    [],
  );

  /* 상태와 출처는 위 지표 띠가 맡는다. 같은 조건을 두 군데서 걸면 서로 부딪친다 —
     화면 머리 주석 참고. 여기에는 띠와 겹치지 않는 것만 남긴다 */
  const filters = useMemo<Filter<ItemDraft>[]>(
    () => [
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
          .map((v) => ({ value: v, label: `${v} · ${levelSpecs[v].name}` })),
        match: (r, v) => r.level === v,
      },
    ],
    [rows],
  );

  return (
    <>
      <PageHead
        /* 판을 편 동안에는 제목도 그 일을 말한다. 「문항 출제」 아래에 「AI 문항 생성」이
           또 서면 제목이 둘이 되고, 지금 무엇을 하는 중인지는 둘 다 아닌 자리에서 읽힌다 */
        title={open ? "AI 문항 출제" : "문항 출제"}
        actions={
          <>
            <Link href="/admin2/items" className="a2-btn">
              문항 은행
            </Link>
            <button type="button" className="a2-btn" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
              AI 문항 출제
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
        tabsLabel="상태별 조회 조건"
        /* 생성 판을 편 동안에는 상태 탭을 접는다. 그 줄은 **아래 목록을 고르는** 자리인데,
           지금 하는 일은 목록을 고르는 것이 아니라 문항을 만드는 것이다. 띄워 두면 조건을
           바꿔 놓고 왜 화면이 그대로인지를 한 번 겪는다 */
        tabs={
          open
            ? undefined
            : tabs.map((t) => (
                <Tab
                  key={t.id}
                  label={t.label}
                  count={n(t.count)}
                  active={tab === t.id}
                  onClick={() => setTab(t.id)}
                />
              ))
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

      {/* 탭을 바꾸면 표를 새로 세운다 — 검색어와 거르개는 그 목록에 맞춰 다시 고르는
          것이 맞다. 「반려됨에서 수학만」을 걸어 둔 채 검수 대기로 넘어가면, 걸린 조건은
          위에 그대로 적혀 있는데 왜 0줄인지는 안 적혀 있다 */}
      {/* 줄 수는 끈다 — 탭의 개수 알약과 쪽 넘김 줄의 「1–3 / 3」이 이미 같은 수를 적는다 */}
      {/* 판을 편 동안에는 목록을 접는다. 만드는 동안 아래에 표가 깔려 있으면 채워야 할
          칸이 화면 밖으로 밀리고, 정작 그 표는 아직 만들지도 않은 문항을 보여 준다 */}
      {!open && (
        <DataTable
          key={tab}
          rows={rows}
          cols={cols}
          filters={filters}
          getKey={(r) => r.id}
          searchHint="문항 ID · 발문 · 단원"
          empty={current.empty}
          showCount={false}
        />
      )}
    </>
  );
}
