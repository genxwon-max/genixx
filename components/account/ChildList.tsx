"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ageFromBirth } from "@/lib/account";
import { formatCode, useRoster, type Student } from "@/lib/roster";
import { subjects } from "@/lib/exam";
import { getRecord, surveyKeys, useExamStore, useHydrated } from "@/lib/examStore";
import { phaseTone, progressOf, type Phase } from "@/lib/progress";
import { ticketsLeft, useTickets, walletOf } from "@/lib/ticketStore";
import { ArrowRight } from "@/components/Icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PickBox, phoneText, SendCodesButton, usePicked } from "./SendCodes";
import { AccHead, btnPrimary, card, listTd, listTh } from "./ui";

/** 한 쪽에 담는 학생 수. 25명을 넘으면 쪽을 나눈다. */
const PER_PAGE = 25;

/** 상태로 걸러내기. 값은 lib/progress.ts의 Phase를 그대로 쓴다. */
const phaseOptions: { value: "all" | Phase; label: string }[] = [
  { value: "all", label: "상태 전체" },
  { value: "미응시", label: "미응시" },
  { value: "응시중", label: "응시중" },
  { value: "제출완료", label: "제출완료" },
  { value: "검사완료", label: "검사완료" },
];

type SortKey = "recent" | "name" | "grade";

const sortOptions: { value: SortKey; label: string }[] = [
  { value: "recent", label: "최근 등록순" },
  { value: "name", label: "이름순" },
  { value: "grade", label: "학년순" },
];

/**
 * 목록 줄 안의 버튼 모양.
 *
 * 색·높이·상태는 shadcn Button이 토큰에서 가져온다. 여기서는 계정 존의 알약
 * 모양과 줄에 맞는 글자 크기만 얹는다 — 관리자·응시 존은 각진 모서리를 쓰므로
 * rounded-full은 부품 기본값이 아니라 이 화면의 선택이다.
 */
const rowShape = "rounded-full text-[13px] font-semibold";

/** 「20150311」 → 「2015.03.11」 */
const birthText = (b: string) =>
  b.length === 8 ? `${b.slice(0, 4)}.${b.slice(4, 6)}.${b.slice(6)}` : b;

/**
 * ACC-03 학생(자녀) 프로필 관리.
 *
 * 보호자가 여기서 하는 일은 셋이다 — 아이마다 **응시권을 결제**하고, **접속코드를
 * 아이에게 넘기고**, 진행 상황을 본다. 한 명씩 큰 카드로 세우면 그 셋이 세로로 흩어져
 * 서로 견줄 수 없으므로, 한 명이 한 줄인 **표**로 세운다. 견줄 값이 칸으로 맞으면
 * 「누구 응시권이 비었는지」가 한눈에 보인다.
 *
 * 문자 보내기는 줄마다 두지 않고 **체크해서 한 번에** 보낸다. 형제자매가 둘·셋이면
 * 줄마다 같은 버튼을 세 번 누르게 되기 때문이다. 반대로 코드 재발급처럼 되돌릴 수
 * 없는 일은 목록에서 빼고 학생 상세(/my/children/[id])로 내렸다 — 옆줄과 한 칸 차이로
 * 붙어 있으면 잘못 누른다.
 */
export default function ChildList() {
  const hydrated = useHydrated();
  const all = useRoster();
  // 상태로 거르려면 응시 기록이 바뀔 때도 다시 그려야 한다. 값 자체는 progressOf가 읽는다.
  const store = useExamStore();
  const tickets = useTickets();

  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState<"all" | Phase>("all");
  const [sort, setSort] = useState<SortKey>("recent");
  const pick = usePicked();

  const children = useMemo(() => all.filter((s) => s.owner === "parent"), [all]);

  /**
   * 아이별 진행 단계.
   *
   * progressOf는 응시 기록을 스토어에서 직접 읽는다(React 밖). 그래서 store 자체는
   * 여기서 쓰이지 않지만, 기록이 바뀌었을 때 다시 계산하게 하려면 의존성에 있어야
   * 한다. 빼면 설문을 내고 돌아와도 「응시중」에 그대로 남는다.
   */
  const phaseById = useMemo(
    () => new Map(children.map((c) => [c.id, progressOf(c).phase])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [children, store],
  );

  const rows = useMemo(() => {
    // 접속코드는 화면에 1234-ABCD로 보이지만 저장은 붙여서 한다. 어느 쪽으로 쳐도 찾히게 한다.
    const needle = query.trim().toLowerCase().replace(/-/g, "");
    let list = children;

    if (needle) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(needle) ||
          c.code.toLowerCase().includes(needle) ||
          (c.school ?? "").toLowerCase().includes(needle) ||
          (c.grade ?? "").toLowerCase().includes(needle),
      );
    }
    if (phase !== "all") {
      list = list.filter((c) => phaseById.get(c.id) === phase);
    }

    const sorted = [...list];
    if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name, "ko"));
    else if (sort === "grade")
      // 학년은 선택 항목이다. 비어 있는 아이는 뒤로 보낸다 — 맨 앞에 몰리면
      // 학년순으로 세운 뜻이 없어진다.
      sorted.sort(
        (a, b) =>
          (a.grade ? 0 : 1) - (b.grade ? 0 : 1) ||
          (a.grade ?? "").localeCompare(b.grade ?? "", "ko") ||
          a.name.localeCompare(b.name, "ko"),
      );
    else sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return sorted;
  }, [children, query, phase, sort, phaseById]);

  if (!hydrated) {
    return <p className="py-16 text-center text-[13px] text-soft-muted">확인 중입니다…</p>;
  }

  // 아이를 지우거나 검색으로 줄어들면 마지막 쪽이 사라진다. 상태를 고치지 않고 그릴 때 눌러 둔다.
  const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const current = Math.min(page, pages);
  const start = (current - 1) * PER_PAGE;
  const shown = rows.slice(start, start + PER_PAGE);
  const filtering = query.trim() !== "" || phase !== "all";

  /* 고른 사람은 지금 걸러 놓은 목록 안에서만 센다. 검색으로 가려진 아이까지 함께
     보내면 화면에 없는 사람에게 문자가 나간다. */
  const chosen = rows.filter((c) => pick.has(c.id));
  const allShownPicked = shown.length > 0 && shown.every((c) => pick.has(c.id));

  return (
    <>
      {/* 등록 버튼은 학부모 홈과 같은 자리(제목 오른쪽)에 둔다 */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <AccHead id="ACC-03" title="학생 프로필" back={{ href: "/my", label: "홈으로" }} />
        </div>
        {children.length > 0 && (
          <Link href="/my/children/new" className={`${btnPrimary} mt-8 shrink-0`}>
            + 학생 등록
          </Link>
        )}
      </div>

      {children.length === 0 ? (
        <div className={`${card} p-10 text-center`}>
          <p className="text-[16px] font-black text-soft-ink">아직 등록된 학생이 없습니다</p>
          <p className="mt-2.5 text-[14px] leading-relaxed text-soft-muted">
            이름과 생년월일만 있으면 등록됩니다. 생년월일에 따라 누가 동의해야 하는지 폼에서
            바로 안내해 드립니다.
          </p>
          <Link href="/my/children/new" className={`${btnPrimary} mt-6`}>
            학생 등록 시작하기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <>
          {/* 조회 조건.
              입력·선택 부품의 바탕이 투명이라 대시보드 바탕(#f4f6fb)에 잠겨 보였다.
              흰 면에 얹고 컨트롤도 흰색으로 세워, 「지금 쳐 넣는 자리」로 읽히게 한다.
              어느 것을 바꾸든 1쪽으로 돌아간다 — 3쪽을 보던 중에 검색하면 결과가
              있는데도 빈 쪽이 나오기 때문이다. */}
          <div className={`${card} mb-3 flex flex-col gap-2 p-3 sm:flex-row sm:items-center`}>
            <div className="relative flex-1">
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-soft-muted"
              />
              <Input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="이름 · 접속코드 · 학교 · 학년으로 찾기"
                aria-label="학생 찾기"
                className="rounded-full bg-white pl-10 text-[14px]"
              />
            </div>

            {/* 좁은 화면에서 둘이 각자 한 줄을 먹지 않도록 묶어 둔다 */}
            <div className="flex gap-2">
              <Select
                items={phaseOptions}
                value={phase}
                onValueChange={(v) => {
                  setPhase(v as "all" | Phase);
                  setPage(1);
                }}
              >
                <SelectTrigger
                  aria-label="진행 상태로 거르기"
                  className="flex-1 rounded-full bg-white sm:w-40 sm:flex-none"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {phaseOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                items={sortOptions}
                value={sort}
                onValueChange={(v) => {
                  setSort(v as SortKey);
                  setPage(1);
                }}
              >
                <SelectTrigger
                  aria-label="정렬"
                  className="flex-1 rounded-full bg-white sm:w-36 sm:flex-none"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 센 수와 골라 둔 사람에게 할 일을 한 줄에 둔다 */}
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2.5">
            <p className="text-[13px] text-soft-muted">
              {filtering ? `${children.length}명 중 ${rows.length}명` : `총 ${rows.length}명`}
              {pages > 1 && ` · ${start + 1}–${start + shown.length}번째`}
              {chosen.length > 0 && (
                <b className="ml-2 text-soft-primary">{chosen.length}명 선택</b>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              <SendCodesButton chosen={chosen} onSent={pick.clear} className={rowShape} />
              {/* 못 누를 때는 링크를 씌우지 않는다 — disabled를 준 <a>는 그대로 눌린다 */}
              {chosen.length === 0 ? (
                <Button disabled className={rowShape}>
                  응시권 결제
                </Button>
              ) : (
                <Button
                  nativeButton={false}
                  /* 체크해 둔 아이를 결제 화면까지 데리고 간다 — 저쪽에서 다시 고르게 하면
                     같은 목록을 두 번 훑는다 */
                  render={
                    <Link href={`/my/payments?students=${chosen.map((c) => c.id).join(",")}`} />
                  }
                  className={rowShape}
                >
                  응시권 결제 {chosen.length}명
                </Button>
              )}
            </div>
          </div>

          <div className={`${card} overflow-x-auto`}>
            <table className="w-full min-w-[920px] border-collapse">
              <caption className="sr-only">등록한 학생과 응시권·진행 상황</caption>
              <colgroup>
                <col className="w-[44px]" />
                <col className="w-[13%]" />
                <col className="w-[15%]" />
                <col className="w-[12%]" />
                <col className="w-[13%]" />
                <col className="w-[13%]" />
                <col className="w-[9%]" />
                <col className="w-[8%]" />
                <col className="w-[8%]" />
                <col className="w-[10%]" />
                <col className="w-[8%]" />
              </colgroup>
              <thead>
                <tr>
                  <th className={listTh}>
                    <PickBox
                      checked={allShownPicked}
                      onChange={() =>
                        pick.setMany(
                          shown.map((c) => c.id),
                          !allShownPicked,
                        )
                      }
                      disabled={shown.length === 0}
                      label="이 쪽의 학생 모두 선택"
                    />
                  </th>
                  <th className={listTh}>이름</th>
                  <th className={listTh}>학교 · 학년</th>
                  <th className={listTh}>생년월일</th>
                  <th className={listTh}>접속코드</th>
                  <th className={listTh}>보호자 연락처</th>
                  <th className={listTh}>응시권</th>
                  <th className={listTh}>시험</th>
                  <th className={listTh}>설문</th>
                  <th className={listTh}>상태</th>
                  <th className={listTh}>관리</th>
                </tr>
              </thead>
              <tbody>
                {shown.length === 0 ? (
                  <tr>
                    <td colSpan={11} className={`${listTd} py-14`}>
                      <p className="text-[14px] font-bold text-soft-ink">찾는 학생이 없습니다</p>
                      <p className="mt-1.5 text-[13px] text-soft-muted">
                        검색어나 상태를 바꿔 보세요. 등록된 학생은 {children.length}명입니다.
                      </p>
                    </td>
                  </tr>
                ) : (
                  shown.map((c) => (
                    <ChildRow
                      key={c.id}
                      student={c}
                      left={ticketsLeft(walletOf(tickets, c.id))}
                      picked={pick.has(c.id)}
                      onToggle={() => pick.toggle(c.id)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pages > 1 && <Pager page={current} pages={pages} onGo={setPage} />}
        </>
      )}

    </>
  );
}

/* ───────────────────────── 목록 한 줄 ───────────────────────── */

/**
 * 학생 한 명.
 *
 * 진행 상황은 아이마다 따로 저장되므로(lib/examStore.ts) 줄마다 자기 기록을 읽는다.
 * 줄에서 할 수 있는 일은 **고르는 것**과 **상세로 들어가는 것**뿐이다. 코드 재발급·최종
 * 제출처럼 되돌릴 수 없는 일은 상세로 내렸다.
 */
function ChildRow({
  student,
  left,
  picked,
  onToggle,
}: {
  student: Student;
  /** 남은 응시권 매수 */
  left: number;
  picked: boolean;
  onToggle: () => void;
}) {
  const record = getRecord(student.id);
  const age = ageFromBirth(student.birth);
  const submitted = subjects.filter((s) => record.subjects[s.id].status === "submitted").length;
  const surveysDone = surveyKeys.filter((k) => record.surveys[k] === "done").length;
  const { phase } = progressOf(student);
  const tone = phaseTone[phase];

  return (
    <tr className={picked ? "bg-soft-primary-soft/50" : undefined}>
      <td className={listTd}>
        <PickBox checked={picked} onChange={onToggle} label={`${student.name} 선택`} />
      </td>

      <td className={`${listTd} text-left`}>
        <Link
          href={`/my/children/${student.id}`}
          className="text-[14px] font-black text-soft-ink hover:underline"
        >
          {student.name}
        </Link>
      </td>

      <td className={`${listTd} text-left`}>
        {student.school ?? "—"}
        {student.grade && <span className="block text-[12px]">{student.grade}</span>}
      </td>

      <td className={`${listTd} tabular-nums`}>
        {birthText(student.birth)}
        <span className="block text-[12px]">만 {age ?? "—"}세</span>
      </td>

      {/* 코드와 복사 버튼은 붙여 둔다. 코드를 보는 이유가 곧 아이에게 넘기는 것이다. */}
      <td className={listTd}>
        <span className="block font-black tracking-[0.06em] tabular-nums text-soft-ink">
          {formatCode(student.code)}
        </span>
        <CopyCode code={student.code} />
      </td>

      <td className={`${listTd} tabular-nums`}>
        {student.guardianPhone ? phoneText(student.guardianPhone) : "—"}
      </td>

      {/* 응시권이 없으면 접수 자체가 안 된다 — 0매는 색으로 세우고 결제로 바로 잇는다 */}
      <td className={listTd}>
        {left > 0 ? (
          <span className="font-semibold text-soft-ink tabular-nums">{left}매</span>
        ) : (
          <Link
            href={`/my/payments?students=${student.id}`}
            className="font-semibold text-rose-600 hover:underline"
          >
            결제 필요
          </Link>
        )}
      </td>

      <td className={`${listTd} tabular-nums ${submitted === subjects.length ? "text-emerald-600" : ""}`}>
        {submitted}/{subjects.length}
      </td>
      <td
        className={`${listTd} tabular-nums ${surveysDone === surveyKeys.length ? "text-emerald-600" : ""}`}
      >
        {surveysDone}/{surveyKeys.length}
      </td>

      <td className={listTd}>
        <span className={`inline-flex items-center gap-1.5 font-semibold ${tone.text}`}>
          <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
          {phase}
        </span>
      </td>

      <td className={listTd}>
        <Link
          href={`/my/children/${student.id}`}
          className="font-semibold text-soft-primary hover:underline"
        >
          상세
        </Link>
      </td>
    </tr>
  );
}

/* ───────────────────────── 쪽 넘김 ───────────────────────── */

function Pager({ page, pages, onGo }: { page: number; pages: number; onGo: (p: number) => void }) {
  // 쪽이 많아도 번호를 다 늘어놓지 않는다. 지금 쪽 둘레로 최대 다섯 개만 보인다.
  const from = Math.max(1, Math.min(page - 2, pages - 4));
  const to = Math.min(pages, from + 4);
  const nums = [];
  for (let i = from; i <= to; i += 1) nums.push(i);

  // 지금 쪽은 채운 버튼, 나머지는 외곽선. 색만으로 나누지 않도록 aria-current도 함께 둔다.
  const step = `${rowShape} min-w-11`;

  return (
    <nav aria-label="쪽 넘김" className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
      <Button
        variant="outline"
        onClick={() => onGo(page - 1)}
        disabled={page === 1}
        className={step}
      >
        이전
      </Button>
      {nums.map((n) => (
        <Button
          key={n}
          variant={n === page ? "default" : "outline"}
          onClick={() => onGo(n)}
          aria-current={n === page ? "page" : undefined}
          className={step}
        >
          {n}
        </Button>
      ))}
      <Button
        variant="outline"
        onClick={() => onGo(page + 1)}
        disabled={page === pages}
        className={step}
      >
        다음
      </Button>
    </nav>
  );
}

/* ───────────────────────── 코드 복사 ───────────────────────── */

/**
 * 접속코드 복사 버튼.
 *
 * 코드를 받은 보호자가 바로 할 일은 아이에게 전달하는 것이다. 손으로 옮겨 적게
 * 두면 혼동하기 쉬운 글자(0·O 같은)를 빼 둔 뜻이 없어진다.
 */
export function CopyCode({ code }: { code: string }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");

  const copy = async () => {
    const text = formatCode(code);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 보안 컨텍스트가 아니거나 권한이 없으면 clipboard가 거절한다. 예전 방식으로 한 번 더 시도한다.
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      if (!ok) {
        // 되지 않았으면 됐다고 하지 않는다. 손으로 옮겨 적어야 한다는 뜻이다.
        setState("failed");
        window.setTimeout(() => setState("idle"), 3000);
        return;
      }
    }
    setState("done");
    window.setTimeout(() => setState("idle"), 2000);
  };

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="mt-0.5 text-[12px] font-medium text-soft-muted underline-offset-2 hover:text-soft-ink hover:underline"
    >
      {state === "done" ? "복사했습니다" : state === "failed" ? "직접 입력해 주세요" : "코드 복사"}
    </button>
  );
}
