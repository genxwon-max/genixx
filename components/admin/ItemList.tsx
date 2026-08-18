"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useAdminPrefs } from "@/lib/adminStore";
import { useHydrated } from "@/lib/examStore";
import {
  addItem,
  itemReady,
  missingFields,
  stateLabel,
  stateTone,
  useItems,
  type ItemDraft,
  type ItemState,
} from "@/lib/itemStore";
import { LEVELS, levelSpecs, talents, type Level } from "@/lib/blueprint";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHead } from "./Parts";
import * as a from "./ui";

/** 한 쪽에 담는 문항 수 */
const PER_PAGE = 10;

/** 손볼 것이 먼저 보여야 한다 — 반려 → 작성 중 → 검수 대기 → 승인 → 사용 중지 */
const order: Record<ItemState, number> = {
  rejected: 0,
  draft: 1,
  submitted: 2,
  approved: 3,
  retired: 4,
};

const stateOptions: { value: "all" | ItemState; label: string }[] = [
  { value: "all", label: "상태 전체" },
  { value: "draft", label: "작성 중" },
  { value: "rejected", label: "반려됨" },
  { value: "submitted", label: "검수 대기" },
  { value: "approved", label: "승인됨" },
  { value: "retired", label: "사용 중지" },
];

const levelOptions: { value: "all" | Level; label: string }[] = [
  { value: "all", label: "단계 전체" },
  ...LEVELS.map((l) => ({ value: l, label: `${l} ${levelSpecs[l].name}` })),
];

const mineOptions = [
  { value: "all", label: "모든 출제자" },
  { value: "mine", label: "내가 쓴 것만" },
];

/**
 * EXP-02 출제 워크벤치 — 문항 목록.
 *
 * 발주서 §8의 3단계(출제)와 5단계(검토의견 반영)가 벌어지는 자리다. 한 화면에
 * 편집기를 펼쳐 두면 문항이 스물을 넘는 순간 자기 것을 찾지 못하므로, 목록과
 * 문항 카드를 갈라 두고 목록에서 눌러 들어가게 한다.
 *
 * 작성은 임시저장이다 — 폼에 친 글자는 즉시 브라우저에 저장되고, 제출을 눌러야
 * 검수 목록으로 넘어간다.
 */
export default function ItemList() {
  const router = useRouter();
  const prefs = useAdminPrefs();
  const hydrated = useHydrated();
  const items = useItems();

  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [state, setState] = useState<"all" | ItemState>("all");
  const [level, setLevel] = useState<"all" | Level>("all");
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

  if (!hydrated) {
    return <p className="py-16 text-center adm-t-sm text-exam-muted">확인 중입니다…</p>;
  }

  const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const current = Math.min(page, pages);
  const start = (current - 1) * PER_PAGE;
  const shown = rows.slice(start, start + PER_PAGE);
  const filtering = query.trim() !== "" || state !== "all" || level !== "all" || who !== "all";

  const create = () => {
    const item = addItem(prefs.loginId ?? "", prefs.staffName || "출제자");
    router.push(`/admin/authoring/${item.id}`);
  };

  return (
    <div>
      <PageHead
        id="EXP-02"
        title="출제 워크벤치"
        lead="발주서 Ver.4.1의 문항 카드 양식으로 씁니다. 쓰는 동안은 임시저장되고, 제출해야 검수로 넘어갑니다."
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

      {/* 찾기와 분류 */}
      <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-exam-muted"
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="문항 ID · 발문 · 단원 · 성취기준 · 출제자로 찾기"
            aria-label="문항 찾기"
            className="pl-10"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Picker
            label="상태로 거르기"
            options={stateOptions}
            value={state}
            onChange={(v) => {
              setState(v as "all" | ItemState);
              setPage(1);
            }}
          />
          <Picker
            label="인지단계로 거르기"
            options={levelOptions}
            value={level}
            onChange={(v) => {
              setLevel(v as "all" | Level);
              setPage(1);
            }}
          />
          <Picker
            label="출제자로 거르기"
            options={mineOptions}
            value={who}
            onChange={(v) => {
              setWho(v);
              setPage(1);
            }}
          />
        </div>
      </div>

      <p className="mb-2.5 adm-t-sm text-exam-muted">
        {filtering ? `${items.length}건 중 ${rows.length}건` : `전체 ${rows.length}건`}
        {pages > 1 && ` · ${start + 1}–${start + shown.length}번째`}
      </p>

      {shown.length === 0 ? (
        <div className="border-y border-exam-line py-12 text-center">
          <p className="adm-t-md font-bold text-exam-text">찾는 문항이 없습니다</p>
          <p className="mt-1.5 adm-t-sm text-exam-muted">
            검색어나 분류를 바꿔 보세요. 등록된 문항은 {items.length}건입니다.
          </p>
        </div>
      ) : (
        <ul className="border-b border-exam-line">
          {shown.map((i) => (
            <Row key={i.id} item={i} />
          ))}
        </ul>
      )}

      {pages > 1 && <Pager page={current} pages={pages} onGo={setPage} />}
    </div>
  );
}

/* ───────────────────────── 목록 한 줄 ───────────────────────── */

function Row({ item }: { item: ItemDraft }) {
  const missing = missingFields(item);
  const talent = talents.find((t) => t.id === item.talent);

  return (
    <li className="border-t border-exam-line">
      {/* 좁은 폭에서는 뒤쪽 열부터 접는다. 문항을 고르는 데 반드시 필요한 것은
          ID·발문·상태 셋이고, 나머지는 넓을 때 곁들이는 정보다. */}
      <Link
        href={`/admin/authoring/${item.id}`}
        className="flex items-center gap-x-4 px-1 py-3 transition-colors hover:bg-slate-50"
      >
        <span className="w-[8.5rem] shrink-0">
          <span className="block adm-t-md font-black tabular-nums text-exam-text">
            {item.code || "ID 미정"}
          </span>
          {/* AI가 낸 초안인지 목록에서 바로 보이게 한다 — 손볼 양이 다르다 */}
          {item.origin === "ai" && (
            <span className="mt-0.5 block adm-t-xs font-bold text-violet-700">AI 출제</span>
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate adm-t-md font-bold text-exam-text">
            {item.stem || "발문을 아직 쓰지 않았습니다"}
          </span>
          <span className="mt-0.5 block truncate adm-t-xs text-exam-muted">
            {[
              item.subject,
              item.unit || "단원 미정",
              item.standardCode || "성취기준 없음",
              item.authorName,
            ].join(" · ")}
          </span>
        </span>

        <span className="hidden w-[6.5rem] shrink-0 adm-t-xs text-exam-muted md:block">
          {item.level} {levelSpecs[item.level].name}
        </span>
        <span className="hidden w-[8.5rem] shrink-0 adm-t-xs text-exam-muted xl:block">
          {talent?.name} · {item.subskill}
        </span>

        <span className="w-[6.5rem] shrink-0 text-right">
          <span className={`adm-t-sm font-bold ${stateTone[item.state]}`}>
            {stateLabel[item.state]}
          </span>
          <span className="mt-0.5 block adm-t-xs text-exam-muted">
            {item.state !== "approved" && !itemReady(item)
              ? `${missing.length}칸 남음`
              : item.anchor
                ? "앵커"
                : ""}
          </span>
        </span>
      </Link>
    </li>
  );
}

/* ───────────────────────── 조각 ───────────────────────── */

function Picker({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select items={options} value={value} onValueChange={(v) => onChange(String(v ?? "all"))}>
      <SelectTrigger aria-label={label} className="flex-1 sm:w-40 sm:flex-none">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Pager({ page, pages, onGo }: { page: number; pages: number; onGo: (p: number) => void }) {
  const from = Math.max(1, Math.min(page - 2, pages - 4));
  const to = Math.min(pages, from + 4);
  const nums = [];
  for (let i = from; i <= to; i += 1) nums.push(i);

  return (
    <nav aria-label="쪽 넘김" className="mt-5 flex flex-wrap items-center justify-center gap-1.5">
      <Button variant="outline" onClick={() => onGo(page - 1)} disabled={page === 1}>
        이전
      </Button>
      {nums.map((n) => (
        <Button
          key={n}
          variant={n === page ? "default" : "outline"}
          onClick={() => onGo(n)}
          aria-current={n === page ? "page" : undefined}
          className="min-w-11"
        >
          {n}
        </Button>
      ))}
      <Button variant="outline" onClick={() => onGo(page + 1)} disabled={page === pages}>
        다음
      </Button>
    </nav>
  );
}
