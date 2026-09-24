"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useCatalogRounds } from "@/lib/catalogRounds";
import {
  availabilityLabel,
  dotDate,
  evalName,
  quarterLabel,
  QUARTERS,
  seasonOf,
  trackFromGrade,
  trackLabel,
  type Availability,
  type TrackId,
} from "@/lib/examCatalog";
import { useHydrated } from "@/lib/examStore";
import { orderMethods, orderWon, placeOrder, useOrders, type OrderMethod } from "@/lib/orderStore";
import { paidPrice, useProducts } from "@/lib/productStore";
import { useRoster, type Student } from "@/lib/roster";
import { grantTickets, spendTicket, usedInRound, useTickets, walletOf } from "@/lib/ticketStore";
import { useSession } from "@/lib/authStore";
import { themeOf, type Variant } from "@/lib/authVariant";
import SectionTitle from "@/components/exam/SectionTitle";
import { CheckIcon } from "@/components/Icons";
import { card } from "./ui";

/**
 * 결제 › 진단평가 — **학생을 먼저 고르고**, 그 아이가 볼 평가를 고른다.
 *
 * ── 왜 학생이 먼저인가 ──
 * 평가는 해마다 네 분기, 분기마다 학년 수만큼 열린다. 학년이 초1~중3으로 갈리면 한 해에만
 * 서른 줄이 넘고, 해가 쌓이면 백 줄이 된다. 그 목록을 통째로 펴 놓고 「학년이 맞지 않습니다」를
 * 스무 줄 적는 것은 보호자에게 우리 사정을 읽게 하는 일이다.
 *
 * 아이를 먼저 고르면 학년이 정해지고, 남는 것은 **그 아이가 볼 수 있는 평가 네 개(분기)**뿐이다.
 * 고를 수 없는 줄이 아예 서지 않으므로 목록이 해마다 길어지지 않는다. 학년 고르개를 따로 두지
 * 않는 까닭도 같다 — 아이의 학년은 명부에 이미 있고, 보호자가 그것을 다시 고를 이유가 없다.
 *
 * ── 조회는 해와 분기로 ──
 * 남는 축은 시간뿐이다. 연도를 고르고 분기(1~4)로 좁힌다. 지난 평가는 기본으로 접어 둔다 —
 * 이 화면을 여는 까닭은 거의 늘 「이번에 볼 것」이라서.
 *
 * ── 형제자매 ──
 * 같은 학년 칸의 아이는 함께 고를 수 있다. 학년이 다르면 볼 평가가 다르므로 잠그고 까닭을
 * 적는다 — 그때는 아이마다 따로 결제한다.
 *
 * ── 결제가 곧 접수 ──
 * 결제가 끝나면 응시권을 한 매 발급하고 그 자리에서 이 평가에 쓴다(grantTickets → spendTicket).
 * 결제만 되고 접수가 남으면, 보호자는 돈을 낸 뒤에도 아이가 왜 시험을 못 보는지 모른 채 학생
 * 화면을 뒤지게 된다.
 *
 * 평가는 초1~중3 학년마다 따로 열린다(lib/examCatalog.ts). 칸이 셋이든 아홉이든 이 화면에
 * 서는 줄 수는 같다 — 아이의 학년이 평가 하나를 가리키기 때문이다.
 *
 * ⚠ 시연 화면이다. 실제 결제창은 열리지 않고 카드번호 같은 결제 정보도 받지 않는다.
 */

const methodOrder: OrderMethod[] = ["card", "kakao", "naver", "transfer"];

const stateRank: Record<Availability, number> = { open: 0, soon: 1, ended: 2 };

const stateTone: Record<Availability, string> = {
  open: "text-soft-primary",
  soon: "text-amber-700",
  ended: "text-slate-400",
};

/** 이 아이가 볼 수 있는 학년 칸 — 없으면 아직 평가가 열리지 않은 학년이다 */
const trackOfStudent = (s: Student) => trackFromGrade(s.grade);

export default function ExamPayPanel({
  initial = [],
  variant = 2,
}: {
  initial?: string[];
  variant?: Variant;
}) {
  const t = themeOf(variant);
  const hydrated = useHydrated();
  const session = useSession();
  const roster = useRoster();
  const rounds = useCatalogRounds();
  const products = useProducts();
  const tickets = useTickets();
  const orders = useOrders();

  const isOrg = session?.role === "director" || session?.role === "teacher";
  const mine = useMemo(
    () => roster.filter((s) => (isOrg ? s.owner === "director" : s.owner === "parent")),
    [roster, isOrg],
  );

  const [picked, setPicked] = useState<Set<string>>(new Set(initial));
  const [year, setYear] = useState("");
  const [quarter, setQuarter] = useState<number | 0>(0);
  const [past, setPast] = useState(false);
  const [pickedExam, setPickedExam] = useState("");
  const [method, setMethod] = useState<OrderMethod>("card");
  const [agree, setAgree] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  /** 응시권 값 — 관리자 차림표의 응시권 상품을 그대로 읽는다 */
  const ticketProduct = products.find((p) => p.state === "selling" && p.kind === "assessment");
  const unit = ticketProduct ? paidPrice(ticketProduct) : 0;

  /* 고른 아이들. 첫 아이의 학년 칸이 이 결제의 학년이 된다 */
  const chosen = mine.filter((s) => picked.has(s.id));
  const track: TrackId | null = chosen.length > 0 ? trackOfStudent(chosen[0]) : null;

  /** 이 아이를 함께 고를 수 있는가 — 고를 수 있으면 null */
  function studentBlock(s: Student): string | null {
    const mineTrack = trackOfStudent(s);
    if (!mineTrack) {
      return s.grade ? `${s.grade}은 아직 평가가 열리지 않았습니다` : "학년이 비어 있습니다";
    }
    if (track && mineTrack !== track && !picked.has(s.id)) {
      return `${s.grade} — 학년이 달라 따로 결제합니다`;
    }
    return null;
  }

  /* 이 학년 칸의 평가만. 줄 수가 한 해 네 개라 손으로 기억해 둘 만큼 무겁지 않다 */
  const items = !track
    ? []
    : rounds
        .map((round) => ({
          round,
          season: seasonOf(round),
          key: `${round.id}:${track}`,
          name: evalName(round.id, track, round.label),
        }))
        .sort(
          (a, b) =>
            stateRank[a.round.availability] - stateRank[b.round.availability] ||
            b.round.opensOn.localeCompare(a.round.opensOn),
        );

  const years = [...new Set(items.map((v) => v.season.year))].sort((a, b) => b.localeCompare(a));

  /* 처음 펴는 해는 지금 접수 중인 평가가 있는 해. 없으면 가장 최근 해 */
  const openYear = items.find((v) => v.round.availability === "open")?.season.year;
  const activeYear = year || openYear || years[0] || "";

  const found = items.filter(
    (v) =>
      v.season.year === activeYear &&
      (quarter === 0 || v.season.quarter === quarter) &&
      (past || v.round.availability !== "ended"),
  );

  const exam = items.find((v) => v.key === pickedExam) ?? null;

  const usedOf = (s: Student, roundId: string) =>
    usedInRound(walletOf(tickets, s.id), roundId);

  /** 고른 평가에 이 아이를 넣을 수 없는 까닭 — 넣을 수 있으면 null */
  function applyBlock(s: Student): string | null {
    if (!exam || !track) return null;
    const used = usedOf(s, exam.round.id);
    if (used?.track === track) return "이미 접수한 평가입니다";
    if (used) return `이 분기에 ${trackLabel(used.track)}로 접수했습니다`;
    return null;
  }

  const payable = chosen.filter((s) => !applyBlock(s));
  const total = unit * payable.length;
  const canPay =
    !!exam && exam.round.availability === "open" && payable.length > 0 && agree;

  const toggle = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    /* 아이가 바뀌면 학년 칸이 바뀔 수 있다 — 고른 평가를 들고 가면 남의 학년 평가가 된다 */
    setPickedExam("");
    setAgree(false);
  };

  function pay() {
    if (!exam || !track || payable.length === 0) return;
    const order = placeOrder({
      productId: `EX-${exam.round.id}-${track}`,
      productName: `${exam.name} 응시권`,
      grantsTicket: true,
      students: payable.map((s) => ({ id: s.id, name: s.name })),
      unit,
      method,
    });
    /* 발급하고 그 자리에서 이 평가에 쓴다 — 결제만 되고 접수가 남으면 아이는 시험을 못 본다 */
    for (const s of payable) {
      grantTickets(s.id, 1);
      spendTicket(s.id, exam.round.id, track);
    }
    setDone(order.id);
  }

  const paidOrder = done ? (orders.find((o) => o.id === done) ?? null) : null;

  if (paidOrder) {
    return (
      <section className={`${card} p-7 text-center sm:p-9`}>
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckIcon className="h-7 w-7" />
        </span>
        <h2 className="mt-5 text-[20px] font-bold text-soft-ink">
          결제가 끝나고 접수까지 되었습니다
        </h2>
        <p className="mt-2.5 text-[13.5px] leading-[1.8] text-soft-muted">
          주문번호 <b className="tabular-nums text-soft-ink">{paidOrder.id}</b> ·{" "}
          {paidOrder.productName} · {orderWon(paidOrder.amount)}
          <br />
          {paidOrder.students.map((s) => s.name).join(" · ")} · 총 {paidOrder.students.length}명
        </p>
        <p className="mt-3 text-[12.5px] leading-[1.7] text-soft-muted">
          이제 학생이 접속코드로 로그인해 「응시하기」에서 과목별로 응시합니다. 코드를 아직
          넘기지 않으셨다면 학생 목록에서 문자로 보내실 수 있습니다.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          <Link href="/my/children" className={t.btnAction}>
            학생 목록으로
          </Link>
          <button
            type="button"
            onClick={() => {
              setDone(null);
              setPickedExam("");
              setAgree(false);
            }}
            className={t.btnOutline}
          >
            다른 평가 결제하기
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div>
        {/* ① 학생 — 학년이 정해지면 볼 수 있는 평가가 정해진다 */}
        <section>
          <SectionTitle note="아이의 학년에 맞는 평가만 아래에 섭니다.">
            평가를 볼 학생
          </SectionTitle>

          {!hydrated ? (
            <p className={`${card} px-5 py-10 text-center text-[13px] text-soft-muted`}>
              확인 중입니다…
            </p>
          ) : mine.length === 0 ? (
            <div className={`${card} px-5 py-10 text-center`}>
              <p className="text-[15px] font-bold text-soft-ink">아직 등록된 학생이 없습니다</p>
              <p className="mt-2 text-[13px] leading-[1.7] text-soft-muted">
                응시권은 학생 앞으로 발급됩니다. 학생을 먼저 등록해 주세요.
              </p>
              <Link href="/my/children/new" className={`${t.btnAction} mt-5`}>
                등록하러 가기
              </Link>
            </div>
          ) : (
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {mine.map((s) => {
                const on = picked.has(s.id);
                const block = studentBlock(s);
                const mineTrack = trackOfStudent(s);
                return (
                  <li key={s.id}>
                    <label
                      className={`flex cursor-pointer items-start gap-3 rounded-[14px] border p-4 transition-colors ${
                        on
                          ? "border-2 border-soft-primary bg-soft-primary-soft"
                          : block
                            ? "cursor-not-allowed border-soft-line bg-slate-50"
                            : "border-soft-line bg-white hover:border-soft-primary"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={!!block}
                        onChange={() => toggle(s.id)}
                        className="mt-0.5 h-4 w-4 accent-[#365eef]"
                      />
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block text-[15px] font-bold ${block ? "text-slate-400" : "text-soft-ink"}`}
                        >
                          {s.name}
                          {s.grade && (
                            <span className="ml-1.5 text-[12.5px] font-semibold text-soft-muted">
                              {s.grade}
                            </span>
                          )}
                        </span>
                        <span className="mt-1 block text-[12.5px] leading-[1.7] text-soft-muted">
                          {block ?? (mineTrack ? `${trackLabel(mineTrack)} 평가 대상` : "")}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ② 평가 — 그 학년 것만, 해와 분기로 */}
        <section className="mt-8">
          <SectionTitle
            note={
              track
                ? `${trackLabel(track)} 평가입니다. 학년마다 따로 열리고, 분기에 한 번입니다.`
                : "학생을 고르면 그 학년의 평가가 섭니다."
            }
          >
            평가 고르기
          </SectionTitle>

          {!track ? (
            <p className={`${card} px-5 py-10 text-center text-[13px] text-soft-muted`}>
              먼저 위에서 학생을 골라 주세요.
            </p>
          ) : (
            <>
              <div className={`${card} flex flex-wrap items-center gap-x-4 gap-y-3 p-4 sm:p-5`}>
                <span className="flex items-center gap-2">
                  <label htmlFor="pay-year" className="text-[12.5px] font-semibold text-soft-muted">
                    연도
                  </label>
                  <select
                    id="pay-year"
                    value={activeYear}
                    onChange={(e) => {
                      setYear(e.target.value);
                      setPickedExam("");
                    }}
                    className="h-10 rounded-[10px] border border-soft-line bg-white px-3 text-[13.5px] text-soft-ink outline-none focus:border-soft-primary"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}년
                      </option>
                    ))}
                  </select>
                </span>

                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-0.5 text-[12.5px] font-semibold text-soft-muted">분기</span>
                  {[0, ...QUARTERS].map((q) => {
                    const on = quarter === q;
                    return (
                      <button
                        key={q}
                        type="button"
                        onClick={() => {
                          setQuarter(q);
                          setPickedExam("");
                        }}
                        aria-pressed={on}
                        className={`rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                          on
                            ? "border-soft-primary bg-soft-primary text-white"
                            : "border-soft-line bg-white text-soft-muted hover:border-soft-primary"
                        }`}
                      >
                        {q === 0 ? "전체" : quarterLabel(q)}
                      </button>
                    );
                  })}
                </span>

                <label className="ml-auto flex cursor-pointer items-center gap-2 text-[12.5px] font-semibold text-soft-muted">
                  <input
                    type="checkbox"
                    checked={past}
                    onChange={(e) => {
                      setPast(e.target.checked);
                      setPickedExam("");
                    }}
                    className="h-4 w-4 accent-[#365eef]"
                  />
                  지난 평가도 보기
                </label>
              </div>

              <p className="mb-2.5 mt-3 text-[13px] text-soft-muted">
                {activeYear}년 {quarter === 0 ? "전체 분기" : quarterLabel(quarter)} ·{" "}
                <b className="text-soft-ink">{found.length}개</b>
              </p>

              {found.length === 0 ? (
                <p className={`${card} px-5 py-10 text-center text-[13px] text-soft-muted`}>
                  이 조건에 열린 평가가 없습니다. 다른 분기나 연도를 보아 주세요.
                </p>
              ) : (
                <ul className={`${card} divide-y divide-slate-100`}>
                  {found.map((v) => {
                    const on = pickedExam === v.key;
                    const open = v.round.availability === "open";
                    return (
                      <li key={v.key}>
                        <label
                          className={`flex items-start gap-3.5 p-4 transition-colors sm:p-5 ${
                            on ? "bg-soft-primary-soft" : open ? "hover:bg-slate-50" : ""
                          } ${open ? "cursor-pointer" : "cursor-not-allowed"}`}
                        >
                          <input
                            type="radio"
                            name="exam"
                            checked={on}
                            disabled={!open}
                            onChange={() => {
                              setPickedExam(v.key);
                              setAgree(false);
                            }}
                            className="mt-1 h-4 w-4 accent-[#365eef]"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span
                                className={`text-[15px] font-bold ${open ? "text-soft-ink" : "text-slate-400"}`}
                              >
                                {v.season.year}년 {quarterLabel(v.season.quarter)} 평가
                              </span>
                              <span className="rounded-full border border-soft-line bg-white px-2 py-0.5 text-[11.5px] font-semibold text-soft-muted">
                                {trackLabel(track)}
                              </span>
                              <span
                                className={`text-[12px] font-semibold ${stateTone[v.round.availability]}`}
                              >
                                {availabilityLabel[v.round.availability]}
                              </span>
                            </span>
                            <span className="mt-1.5 block text-[12.5px] leading-[1.7] text-soft-muted">
                              접수 {dotDate(v.round.opensOn)} – {dotDate(v.round.closesOn)}
                              {v.round.subjects.length > 0 && (
                                <>
                                  {" · "}
                                  {v.round.subjects.map((s) => s.name).join(" · ")} (
                                  {v.round.subjects.reduce((m, s) => m + s.minutes, 0)}분)
                                </>
                              )}
                            </span>
                            {/* 이 평가에 넣을 수 없는 아이가 있으면 줄에서 알린다 */}
                            {on &&
                              chosen
                                .filter((s) => applyBlock(s))
                                .map((s) => (
                                  <span
                                    key={s.id}
                                    className="mt-1 block text-[12px] font-semibold text-amber-700"
                                  >
                                    {s.name} — {applyBlock(s)}
                                  </span>
                                ))}
                          </span>
                          <span className="shrink-0 text-[14px] font-bold tabular-nums text-soft-ink">
                            {open ? orderWon(unit) : "—"}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </section>

        {/* ③ 결제 수단 */}
        <section className="mt-8">
          <SectionTitle>결제 수단</SectionTitle>
          <div className="grid gap-2 sm:grid-cols-4">
            {methodOrder.map((m) => {
              const on = method === m;
              return (
                <label
                  key={m}
                  className={`flex cursor-pointer items-center justify-center rounded-[12px] border px-3 py-3.5 text-[13.5px] font-semibold transition-colors ${
                    on
                      ? "border-soft-primary bg-soft-primary-soft text-soft-ink"
                      : "border-soft-line bg-white text-soft-muted hover:border-soft-primary"
                  }`}
                >
                  <input
                    type="radio"
                    name="method"
                    checked={on}
                    onChange={() => setMethod(m)}
                    className="sr-only"
                  />
                  {orderMethods[m]}
                </label>
              );
            })}
          </div>
          <p className="mt-2.5 text-[12.5px] leading-[1.7] text-soft-muted">
            시연용 화면이라 실제 결제창은 열리지 않으며, 카드번호 등 결제 정보는 이 화면이 받지
            않습니다.
          </p>
        </section>
      </div>

      {/* 결제 요약 */}
      <aside className="lg:sticky lg:top-[5rem] lg:self-start">
        <div className={card}>
          <p className="border-b border-soft-line px-5 py-4 text-[14px] font-bold text-soft-ink">
            결제 금액
          </p>
          <dl className="space-y-2.5 px-5 py-4 text-[13.5px]">
            <Line
              k="평가"
              v={exam ? `${exam.season.year}년 ${quarterLabel(exam.season.quarter)}` : "—"}
            />
            <Line k="학년" v={track ? trackLabel(track) : "—"} />
            <Line k="학생" v={payable.length > 0 ? payable.map((s) => s.name).join(" · ") : "—"} />
            <Line k="한 사람 몫" v={orderWon(unit)} />
            <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
              <dt className="font-semibold text-soft-ink">최종 결제금액</dt>
              <dd className="text-[17px] font-bold tabular-nums text-soft-ink">
                {orderWon(total)}
              </dd>
            </div>
          </dl>

          <div className="border-t border-slate-100 px-5 py-4">
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#365eef]"
              />
              <span className="text-[12.5px] leading-[1.7] text-soft-muted">
                <b className="text-soft-ink">(필수)</b> 결제 내용과{" "}
                <Link href="/legal/refund" className="underline">
                  환불·청약철회 규정
                </Link>
                을 확인했습니다.
              </span>
            </label>

            <button type="button" onClick={pay} disabled={!canPay} className={`${t.btnPrimary} mt-4`}>
              {chosen.length === 0
                ? "학생을 골라 주세요"
                : !exam
                  ? "평가를 골라 주세요"
                  : payable.length === 0
                    ? "접수할 수 있는 학생이 없습니다"
                    : total === 0
                      ? `${payable.length}명 무료로 접수하기`
                      : `${orderWon(total)} 결제하기`}
            </button>
            <p className="mt-2.5 text-[11.5px] leading-[1.7] text-soft-muted">
              결제와 동시에 접수됩니다. 응시를 시작하기 전에는 전액 환불되며, 시작한 뒤에는 환불이
              제한됩니다.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-soft-muted">{k}</dt>
      <dd className="text-right font-semibold text-soft-ink">{v}</dd>
    </div>
  );
}
