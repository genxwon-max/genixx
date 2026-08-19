"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAdminPrefs } from "@/lib/adminStore";
import { useHydrated } from "@/lib/examStore";
import {
  addItem,
  itemReady,
  missingFields,
  useItems,
  type ItemDraft,
  type ItemState,
} from "@/lib/itemStore";
import { LEVELS, levelSpecs } from "@/lib/blueprint";
import DataList, { Picker, type Column } from "./DataList";
import {
  actionCol,
  authorCol,
  codeCol,
  linkBtn,
  stateCol,
  stemCol,
  typeCol,
  whenCol,
} from "./itemColumns";
import { PageHead } from "./Parts";
import * as a from "./ui";

/** 손볼 것이 먼저 보여야 한다 — 반려 → 작성 중 → 검수 대기 → 승인 → 사용 중지 */
const order: Record<ItemState, number> = {
  rejected: 0,
  draft: 1,
  submitted: 2,
  approved: 3,
  retired: 4,
};

const stateOptions = [
  { value: "draft", label: "작성 중" },
  { value: "rejected", label: "반려됨" },
  { value: "submitted", label: "검수 대기" },
  { value: "approved", label: "승인됨" },
  { value: "retired", label: "사용 중지" },
];

const levelOptions = LEVELS.map((l) => ({ value: l, label: `${l} ${levelSpecs[l].name}` }));

const mineOptions = [{ value: "mine", label: "내가 쓴 것만" }];

/**
 * EXP-02 출제 워크벤치 — 문항 목록.
 *
 * 발주서 §8의 3단계(출제)와 5단계(검토의견 반영)가 벌어지는 자리다. 한 화면에
 * 편집기를 펼쳐 두면 문항이 스물을 넘는 순간 자기 것을 찾지 못하므로, 목록과
 * 문항 카드를 갈라 두고 목록에서 눌러 들어가게 한다.
 *
 * 목록 자체는 검수 워크벤치·문항 은행과 **같은 표**를 쓴다(DataList + itemColumns).
 * 셋은 같은 문항을 저마다 다른 일로 보는 화면이라, 겹치는 열이 화면마다 다르게
 * 생기면 매일 오가는 사람이 그때마다 눈을 다시 맞춰야 한다.
 *
 * 작성은 임시저장이다 — 폼에 친 글자는 즉시 브라우저에 저장되고, 제출을 눌러야
 * 검수 목록으로 넘어간다.
 */
export default function ItemList() {
  const router = useRouter();
  const prefs = useAdminPrefs();
  const hydrated = useHydrated();
  const items = useItems();

  const [query, setQuery] = useState("");
  const [state, setState] = useState("all");
  const [level, setLevel] = useState("all");
  const [who, setWho] = useState("all");

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    let list = items;

    if (needle) {
      list = list.filter(
        (i) =>
          i.code.toLowerCase().includes(needle) ||
          i.stem.toLowerCase().includes(needle) ||
          i.unit.toLowerCase().includes(needle) ||
          i.standardCode.toLowerCase().includes(needle) ||
          i.authorName.toLowerCase().includes(needle),
      );
    }
    if (state !== "all") list = list.filter((i) => i.state === state);
    if (level !== "all") list = list.filter((i) => i.level === level);
    if (who === "mine") list = list.filter((i) => i.author === prefs.loginId);

    return [...list].sort(
      (x, y) => order[x.state] - order[y.state] || y.updatedAt.localeCompare(x.updatedAt),
    );
  }, [items, query, state, level, who, prefs.loginId]);

  const filtering = query.trim() !== "" || state !== "all" || level !== "all" || who !== "all";
  const reset = () => {
    setQuery("");
    setState("all");
    setLevel("all");
    setWho("all");
  };

  const create = () => {
    const item = addItem(prefs.loginId ?? "", prefs.staffName || "출제자");
    router.push(`/admin/authoring/${item.id}`);
  };

  const columns: Column<ItemDraft>[] = [
    codeCol((i) => `/admin/authoring/${i.id}`),
    stemCol,
    typeCol,
    /* 재능 축은 여기 두지 않는다. 새 초안은 talent 기본값이 LANG으로 채워져 나가서,
       아무도 고른 적 없는 「언어-기호 LANG-01」이 고른 것처럼 보인다. 초안이 사는
       목록은 여기뿐이라 이 문제도 여기만의 것이다. 태그를 견주어 보는 일은 승인된
       것만 모인 문항 은행에서 한다 — 거기에는 그대로 있다. */
    authorCol,
    whenCol("최근 변경"),
    /* 상태 아래에 「무엇이 남았나」를 적는다 — 목록에서 손볼 양이 바로 읽혀야 한다 */
    stateCol((i) =>
      i.state !== "approved" && !itemReady(i)
        ? `${missingFields(i).length}칸 남음`
        : i.anchor
          ? "앵커"
          : null,
    ),
    actionCol("할 일", (i) =>
      linkBtn(
        `/admin/authoring/${i.id}`,
        i.state === "rejected"
          ? "수정하기"
          : i.state === "draft"
            ? "이어서 작성하기"
            : "상세보기",
        i.state === "rejected" || i.state === "draft",
      ),
    ),
  ];

  return (
    <div>
      {/* 설명 줄을 두지 않는다. 「임시저장되고 제출해야 검수로 넘어간다」는 매일
          오는 사람이 이미 아는 말이고, 정말 필요한 순간은 문항을 쓰는 중이라 그
          말은 문항 카드 안에 있어야 한다. 설명이 빠지면 버튼이 제목과 한 줄에 선다. */}
      <PageHead
        title="출제 워크벤치"
        action={
          <>
            <Link href="/admin/authoring/generate" className={a.btnGhost}>
              AI로 문항 출제
            </Link>
            <button type="button" onClick={create} className={a.btnPrimary}>
              + 새 문항 등록
            </button>
          </>
        }
      />

      {!hydrated ? (
        <p className="py-16 text-center adm-t-sm text-exam-muted">확인 중입니다…</p>
      ) : (
        <DataList
          rows={rows}
          totalCount={items.length}
          columns={columns}
          rowKey={(i) => i.id}
          rowHref={(i) => `/admin/authoring/${i.id}`}
          searchPlaceholder="문항 ID · 발문 · 단원 · 성취기준 · 출제자로 찾기"
          query={query}
          onQuery={setQuery}
          filtering={filtering}
          onReset={reset}
          emptyText="찾는 문항이 없습니다."
          filters={
            <>
              <Picker
                label="상태 전체"
                options={stateOptions}
                value={state}
                onChange={setState}
                className="w-full sm:w-36"
              />
              <Picker
                label="단계 전체"
                options={levelOptions}
                value={level}
                onChange={setLevel}
                className="w-full sm:w-44"
              />
              <Picker
                label="모든 출제자"
                options={mineOptions}
                value={who}
                onChange={setWho}
                className="w-full sm:w-40"
              />
            </>
          }
        />
      )}
    </div>
  );
}
