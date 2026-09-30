"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ageFromBirth, isMinorForContract } from "@/lib/account";
import { examDiscounted, examFee, useCatalogRounds } from "@/lib/catalogRounds";
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
import { raiseTier, useHydrated } from "@/lib/examStore";
import { patchPayDraft, usePayDraft } from "@/lib/flowDraft";
import {
  orderMethods,
  orderWon,
  placeOrder,
  useOrders,
  type GuardianCheck,
  type OrderMethod,
} from "@/lib/orderStore";
import {
  paidPrice,
  productKindLabel,
  productKinds,
  useProducts,
  type ProductKind,
} from "@/lib/productStore";
import { useRoster, type Student } from "@/lib/roster";
import { grantTickets, spendTicket, usedInRound, useTickets, walletOf } from "@/lib/ticketStore";
import { useSession } from "@/lib/authStore";
import { themeOf, type Variant } from "@/lib/authVariant";
import SectionTitle from "@/components/exam/SectionTitle";
import { CheckIcon } from "@/components/Icons";
import GuardianPhoneCheck from "./GuardianPhoneCheck";
import { StepBar, StepNav, type Step } from "./StepFlow";
import StudentPick from "./StudentPick";
import { card } from "./ui";

/**
 * 결제 › 진단평가 — **학생을 먼저 고르고**, 그 아이가 볼 평가를 고른다.
 *
 * 걸음마다 주소가 따로다 —
 *   /my/payments           ① 학생 선택(step="student")
 *   /my/payments/checkout  ② 상품 고르기 · 결제(step="product")
 *   /my/payments/done      결제 완료(PayDone)
 * 한 화면에 이어 붙였을 때는 학생을 고를 때마다 아래 목록이 바뀌어, 무엇이 바뀌었는지 보려면
 * 스크롤을 내려야 했다. ①에서 고른 아이는 lib/flowDraft.ts가 ②로 이어 준다. 학생 목록에서
 * 체크해 넘어오면(/checkout?students=) 이미 고른 것이므로 ②부터 선다 — ①로는 단계 표시나
 * [이전]으로 돌아간다. ②에 고른 아이 없이 들어오면 ①로 돌려보낸다.
 *
 * ── 왜 학생이 먼저인가 ──
 * 평가는 해마다 네 분기, 분기마다 학년 수만큼 열린다. 학년이 넷이면 한 해에 열여섯 줄이고,
 * 해가 쌓이면 곧 백 줄이 된다. 그 목록을 통째로 펴 놓고 「학년이 맞지 않습니다」를 스무 줄
 * 적는 것은 보호자에게 우리 사정을 읽게 하는 일이다.
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
 * 결제가 끝나면 응시권을 한 매 발급하고 그 자리에서 이 평가에 쓰며, 응시 기록의 갈래를 유료로
 * 올린다(grantTickets → spendTicket → raiseTier).
 * 결제만 되고 접수가 남으면, 보호자는 돈을 낸 뒤에도 아이가 왜 시험을 못 보는지 모른 채 학생
 * 화면을 뒤지게 된다.
 *
 * 평가는 초3~6 학년마다 따로 열린다(lib/examCatalog.ts). 칸이 넷이든 아홉이든 이 화면에
 * 서는 줄 수는 같다 — 아이의 학년이 평가 하나를 가리키기 때문이다.
 *
 * ── 학생이 자기 몫을 살 때 ──
 * 만 14세 이상 학생은 이 판을 자기 자리(/student/payments)에서 연다. 그때는 selfId가
 * 넘어오고 고를 아이가 자기 하나뿐이라 ① 학생 칸이 서지 않는다 — 자기 이름 앞에 체크
 * 상자를 놓는 것은 고르는 일이 아니다. 대신 만 19세 미만이면 결제 앞에 **보호자 휴대전화
 * 인증**을 받는다(GuardianPhoneCheck). 개인정보 동의는 만 14세부터 본인이 하지만 재산상
 * 의무가 붙는 계약은 만 19세 미만일 때 취소될 수 있다(민법 제5조 · lib/account.ts).
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

/** 보호자 결제의 두 걸음 — 단계 표시와 [이전]·[다음]이 가리키는 주소 */
const payStepHref = { student: "/my/payments", product: "/my/payments/checkout" } as const;

export default function ExamPayPanel({
  /** 이 주소가 세우는 걸음. 학생 본인 자리에는 고를 아이가 없어 늘 "product"다 */
  step = "product",
  /** 학생 목록에서 체크해 넘어온 아이 — /my/payments/checkout?students=S-1,S-2 */
  seed,
  /**
   * 학생 본인이 자기 몫을 결제하는 자리에서 넘어오는 학생 ID(/student/payments).
   * 있으면 명부 대신 이 학생 하나만 세우고, 끝난 뒤 돌아가는 길도 학생 자리로 둔다.
   */
  selfId,
  variant = 2,
}: {
  step?: "student" | "product";
  seed?: string[];
  selfId?: string;
  variant?: Variant;
}) {
  const t = themeOf(variant);
  const router = useRouter();
  const hydrated = useHydrated();
  const session = useSession();
  const roster = useRoster();
  const rounds = useCatalogRounds();
  const tickets = useTickets();

  const isOrg = session?.role === "director" || session?.role === "teacher";
  const mine = useMemo(
    () =>
      selfId
        ? roster.filter((s) => s.id === selfId)
        : roster.filter((s) => (isOrg ? s.owner === "director" : s.owner === "parent")),
    [roster, isOrg, selfId],
  );

  const products = useProducts();
  /* 고른 아이는 걸음을 건너 이어져야 한다 — 이 화면의 상태가 아니라 저장소에 둔다.
     학생 목록에서 체크해 넘어왔으면 주소가 말하는 아이가 먼저다 */
  const draft = usePayDraft();
  const seedKey = seed?.join(",") ?? "";
  const pickedIds = seedKey ? seedKey.split(",") : draft.students;
  const picked = new Set(pickedIds);
  useEffect(() => {
    if (seedKey) patchPayDraft({ students: seedKey.split(",") });
  }, [seedKey]);
  /**
   * 상품 카테고리 — 관리자 상품 목록(PAY-01)의 종류를 그대로 쓴다.
   * 응시권은 회차(평가)에서 값을 읽고, 나머지는 판매중인 상품을 그대로 세운다.
   * 판매중인 상품이 하나도 없는 종류는 칸을 세우지 않는다.
   */
  const [cat, setCat] = useState<ProductKind>("assessment");
  const [pickedProduct, setPickedProduct] = useState("");
  const [year, setYear] = useState("");
  const [quarter, setQuarter] = useState<number | 0>(0);
  const [past, setPast] = useState(false);
  const [pickedExam, setPickedExam] = useState("");
  const [method, setMethod] = useState<OrderMethod>("card");
  const [agree, setAgree] = useState(false);
  /** 만 19세 미만 학생이 스스로 결제할 때 받는 보호자 휴대전화 확인 */
  const [guardian, setGuardian] = useState<GuardianCheck | null>(null);
  /** 결제를 마치고 영수증으로 넘어가는 사이 — 방금 접수한 아이를 「이미 접수」로 읽지 않게 */
  const [paid, setPaid] = useState(false);

  /* 고른 아이들. 첫 아이의 학년 칸이 이 결제의 학년이 된다.
     학생 본인 자리에서는 고를 것이 없다 — 자기 하나가 늘 잡혀 있다 */
  const chosen = selfId ? mine : mine.filter((s) => picked.has(s.id));

  const selling = products.filter((p) => p.state === "selling" && p.kind !== "assessment");
  const cats = productKinds.filter(
    (k) => k === "assessment" || selling.some((p) => p.kind === k),
  );
  const isExam = cat === "assessment";
  const catItems = selling.filter((p) => p.kind === cat);
  const product = !isExam ? (catItems.find((p) => p.id === pickedProduct) ?? null) : null;

  /* 학생 본인이 미성년인가 — 결제 단추 앞에 보호자 휴대전화 인증을 세운다 */
  const needGuardian = !!selfId && isMinorForContract(ageFromBirth(mine[0]?.birth ?? ""));
  const track: TrackId | null = chosen.length > 0 ? trackOfStudent(chosen[0]) : null;

  /** 이 아이를 함께 고를 수 있는가 — 고를 수 있으면 null */
  function studentBlock(s: Student): string | null {
    if (!isExam) return null;
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

  /**
   * 한 사람 몫 — **고른 평가의 응시료**다(lib/catalogRounds.ts).
   *
   * 예전에는 상품 차림표(PAY-01)의 응시권 상품 값을 읽었다. 그러면 회차가 넷이든 열이든
   * 값이 하나여서, 분기마다 값을 달리 받으려면 상품을 회차 수만큼 세우고 이름으로 맞춰야
   * 한다. 값은 회차가 든다 — 관리자가 회차를 만들 때 정가와 할인가를 함께 적는다(ADM-05).
   *
   * 고르기 전에는 0이다. 목록의 줄마다 제 값을 적으므로 여기서 어림값을 보일 까닭이 없다.
   */
  const unit = isExam ? (exam ? examFee(exam.round) : 0) : product ? paidPrice(product) : 0;

  const usedOf = (s: Student, roundId: string) =>
    usedInRound(walletOf(tickets, s.id), roundId);

  /**
   * 고른 평가에 이 아이를 넣을 수 없는 까닭 — 넣을 수 있으면 null.
   *
   * 학년은 평가를 고르기 전에도 본다. 다른 상품 칸에서 학년이 다른 형제를 함께 고른 뒤 응시권
   * 칸으로 돌아오거나, 학생 목록에서 학년이 섞인 채 넘어오면 첫 아이의 학년 평가가 서는데,
   * 그대로 두면 다른 학년 아이 몫까지 그 평가로 결제된다.
   */
  function applyBlock(s: Student): string | null {
    if (!isExam || !track) return null;
    if (trackOfStudent(s) !== track) return "학년이 달라 따로 결제합니다";
    if (!exam) return null;
    const used = usedOf(s, exam.round.id);
    if (used?.track === track) return "이미 접수한 평가입니다";
    if (used) return `이 분기에 ${trackLabel(used.track)}로 접수했습니다`;
    return null;
  }

  const payable = chosen.filter((s) => !applyBlock(s));
  const total = unit * payable.length;
  const canPay =
    (isExam ? !!exam && exam.round.availability === "open" : !!product) &&
    payable.length > 0 &&
    agree &&
    (!needGuardian || !!guardian);

  /* ①에서는 아이만 바꾼다. 고른 평가·동의는 ② 화면에 살고, ②는 올 때마다 새로 선다 */
  const toggle = (id: string) =>
    patchPayDraft({
      students: picked.has(id) ? pickedIds.filter((x) => x !== id) : [...pickedIds, id],
    });

  /** 단계 표시와 「다음」 위에 적는 고른 학생 */
  const chosenText =
    chosen.length === 0
      ? ""
      : chosen.length === 1
        ? chosen[0].name
        : `${chosen[0].name} 외 ${chosen.length - 1}명`;
  /** 첫 아이와 학년이 달라 이 평가에 함께 넣지 못하는 아이 */
  const offTrack = isExam && track ? chosen.filter((s) => trackOfStudent(s) !== track) : [];

  /* ②에 고른 아이 없이 들어오면(주소로 바로 들어온 경우) ①로 돌려보낸다 */
  const bounce = !selfId && step === "product" && hydrated && chosen.length === 0 && !paid;
  useEffect(() => {
    if (bounce) router.replace(payStepHref.student);
  }, [bounce, router]);

  /** 영수증 — 결제 화면을 갈아 끼운다. 뒤로 가기가 이미 결제한 화면으로 돌아가지 않게 */
  const toReceipt = (orderId: string) => {
    setPaid(true);
    router.replace(`${selfId ? "/student" : "/my"}/payments/done?order=${orderId}`);
  };

  function pay() {
    if (!isExam) {
      if (!product || payable.length === 0) return;
      const order = placeOrder({
        productId: product.id,
        productName: product.name,
        grantsTicket: false,
        students: payable.map((s) => ({ id: s.id, name: s.name })),
        unit,
        method,
        guardian: (needGuardian && guardian) || undefined,
      });
      toReceipt(order.id);
      return;
    }
    if (!exam || !track || payable.length === 0) return;
    const order = placeOrder({
      productId: `EX-${exam.round.id}-${track}`,
      productName: `${exam.name} 응시권`,
      grantsTicket: true,
      students: payable.map((s) => ({ id: s.id, name: s.name })),
      unit,
      method,
      guardian: (needGuardian && guardian) || undefined,
    });
    /* 발급하고 그 자리에서 이 평가에 쓴다 — 결제만 되고 접수가 남으면 아이는 시험을 못 본다 */
    for (const s of payable) {
      grantTickets(s.id, 1);
      spendTicket(s.id, exam.round.id, track);
      /* 결제로 들어온 접수는 유료시험이다 — 응시 기록의 갈래도 함께 올려야 문항이 열린다 */
      raiseTier(s.id, "paid");
    }
    toReceipt(order.id);
  }

  /* 학생 본인 자리에는 걸음이 하나뿐이라 단계 표시를 세우지 않는다 */
  const steps: Step[] = [
    { label: "학생 선택", href: payStepHref.student, value: chosenText },
    { label: "상품 고르기 · 결제", href: payStepHref.product },
  ];

  if (paid || bounce || (!selfId && step === "product" && !hydrated)) {
    return (
      <p className={`${card} px-5 py-14 text-center text-[13px] text-soft-muted`}>
        {paid ? "결제를 마쳤습니다. 확인 화면으로 넘어갑니다…" : "확인 중입니다…"}
      </p>
    );
  }

  /* ① 학생 — 학년이 정해지면 볼 수 있는 평가가 정해진다. 고르고 「다음」을 눌러야 ②가 선다 */
  if (step === "student" && !selfId) {
    return (
      <>
        <StepBar steps={steps} current={0} />
        <section>
          <SectionTitle note="같은 학년의 학생은 함께 결제할 수 있습니다.">결제할 학생</SectionTitle>

          {!hydrated ? (
            <p className={`${card} px-5 py-10 text-center text-[13px] text-soft-muted`}>
              확인 중입니다…
            </p>
          ) : mine.length === 0 ? (
            <div className={`${card} px-5 py-10 text-center`}>
              <p className="text-[15px] font-bold text-soft-ink">아직 등록된 학생이 없습니다</p>
              <p className="mt-2 text-[13px] leading-[1.7] text-soft-muted">
                상품은 학생 앞으로 결제됩니다. 학생을 먼저 등록해 주세요.
              </p>
              <Link href="/my/children/new" className={`${t.btnAction} mt-5`}>
                등록하러 가기
              </Link>
            </div>
          ) : (
            <>
              <StudentPick
                multiple
                name="pay-student"
                students={mine}
                isOn={(s) => picked.has(s.id)}
                onPick={(s) => toggle(s.id)}
                blockOf={studentBlock}
                noteOf={(s) => {
                  const mineTrack = trackOfStudent(s);
                  return isExam && mineTrack ? `${trackLabel(mineTrack)} 평가 대상` : "";
                }}
              />
              <StepNav
                nextHref={payStepHref.product}
                nextDisabled={chosen.length === 0}
                note={
                  chosen.length === 0 ? (
                    "결제할 학생을 골라 주세요"
                  ) : (
                    <>
                      <b className="text-soft-primary">{chosen.map((s) => s.name).join(" · ")}</b>{" "}
                      {chosen.length}명 선택
                    </>
                  )
                }
                variant={variant}
              />
            </>
          )}
        </section>
      </>
    );
  }

  return (
    <>
      {!selfId && <StepBar steps={steps} current={1} />}
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div>
          {/* ② 상품 — 카테고리(관리자 상품 종류)로 나눈다. 응시권은 그 학년 평가만, 해와 분기로 */}
          <section>
            <SectionTitle>상품 고르기</SectionTitle>

            {cats.length > 1 && (
              <div role="tablist" aria-label="상품 카테고리" className="mb-3 flex flex-wrap gap-1.5">
                {cats.map((k) => {
                  const on = cat === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      role="tab"
                      aria-selected={on}
                      onClick={() => {
                        setCat(k);
                        setPickedExam("");
                        setPickedProduct("");
                        setAgree(false);
                      }}
                      className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                        on
                          ? "border-soft-primary bg-soft-primary text-white"
                          : "border-soft-line bg-white text-soft-muted hover:border-soft-primary"
                      }`}
                    >
                      {productKindLabel[k]}
                    </button>
                  );
                })}
              </div>
            )}

            {!isExam ? (
              catItems.length === 0 ? (
                <p className={`${card} px-5 py-10 text-center text-[13px] text-soft-muted`}>
                  지금 판매 중인 상품이 없습니다.
                </p>
              ) : (
                <ul className={`${card} divide-y divide-slate-100`}>
                  {catItems.map((p) => {
                    const on = pickedProduct === p.id;
                    const price = paidPrice(p);
                    return (
                      <li key={p.id}>
                        <label
                          className={`flex cursor-pointer items-start gap-3.5 p-4 transition-colors sm:p-5 ${
                            on ? "bg-soft-primary-soft" : "hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="product"
                            checked={on}
                            onChange={() => {
                              setPickedProduct(p.id);
                              setAgree(false);
                            }}
                            className="mt-1 h-4 w-4 accent-[#365eef]"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[15px] font-bold text-soft-ink">{p.name}</span>
                            {p.summary && (
                              <span className="mt-1 block text-[12.5px] leading-[1.7] text-soft-muted">
                                {p.summary}
                              </span>
                            )}
                          </span>
                          <span className="shrink-0 text-right tabular-nums">
                            {price !== p.price && (
                              <span className="block text-[12px] text-slate-400 line-through">
                                {orderWon(p.price)}
                              </span>
                            )}
                            <span className="text-[14px] font-bold text-soft-ink">{orderWon(price)}</span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )
            ) : !track ? (
              <p className={`${card} px-5 py-10 text-center text-[13px] leading-[1.8] text-soft-muted`}>
                {!selfId
                  ? `${chosen[0]?.name ?? "고른"} 학생의 학년${chosen[0]?.grade ? `(${chosen[0].grade})` : ""}에 열린 평가가 아직 없습니다. 이전 걸음에서 학생을 다시 고르거나 다른 상품을 골라 주세요.`
                  : !hydrated
                    ? "확인 중입니다…"
                    : mine.length === 0
                      ? "명부에서 내 이름을 찾지 못해 평가를 세울 수 없습니다. 접속코드로 다시 들어와 주세요."
                      : "내 학년에 열린 평가가 아직 없습니다. 학년이 비어 있거나 틀렸으면 나를 등록한 보호자·선생님께 말해 주세요."}
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

                {/* 평가는 첫 아이의 학년 것이 선다 — 학년이 다른 아이는 여기서 빠진다고 먼저 말한다 */}
                {offTrack.length > 0 && (
                  <p className="mb-2.5 text-[12.5px] font-semibold leading-[1.7] text-amber-700">
                    {offTrack.map((s) => `${s.name}(${s.grade ?? "학년 없음"})`).join(" · ")} 학생은{" "}
                    {trackLabel(track)} 평가를 함께 결제할 수 없습니다. 따로 결제해 주세요.
                  </p>
                )}

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
                              {/* 이 평가에 넣을 수 없는 아이가 있으면 줄에서 알린다. 학년이 다른
                                  아이는 목록 위에서 이미 말했다 */}
                              {on &&
                                chosen
                                  .filter((s) => !offTrack.includes(s) && applyBlock(s))
                                  .map((s) => (
                                    <span
                                      key={s.id}
                                      className="mt-1 block text-[12px] font-semibold text-amber-700"
                                    >
                                      {s.name} — {applyBlock(s)}
                                    </span>
                                  ))}
                            </span>
                            {/* 값은 회차마다 다르다 — 줄마다 제 값을 적는다. 할인 중이면
                                정가를 위에 얹어 무엇이 깎인 값인지 보인다 */}
                            <span className="shrink-0 text-right tabular-nums">
                              {examDiscounted(v.round) && open && (
                                <span className="block text-[12px] text-slate-400 line-through">
                                  {orderWon(v.round.price)}
                                </span>
                              )}
                              <span className="text-[14px] font-bold text-soft-ink">
                                {open ? orderWon(examFee(v.round)) : "—"}
                              </span>
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
          </section>

          {/* ④ 보호자 확인 — 만 19세 미만 학생이 스스로 결제할 때만 */}
          {needGuardian && mine[0] && (
            <GuardianPhoneCheck
              student={mine[0]}
              value={guardian}
              onChange={setGuardian}
              variant={variant}
            />
          )}
        </div>

        {/* 결제 요약 */}
        <aside className="lg:sticky lg:top-[5rem] lg:self-start">
          <div className={card}>
            <p className="border-b border-soft-line px-5 py-4 text-[14px] font-bold text-soft-ink">
              결제 금액
            </p>
            <dl className="space-y-2.5 px-5 py-4 text-[13.5px]">
              <Line
                k="상품"
                v={
                  isExam
                    ? exam
                      ? `${exam.season.year}년 ${quarterLabel(exam.season.quarter)} 평가`
                      : "—"
                    : (product?.name ?? "—")
                }
              />
              {isExam && <Line k="학년" v={track ? trackLabel(track) : "—"} />}
              <Line
                k={selfId ? "응시자" : "학생"}
                v={payable.length > 0 ? payable.map((s) => s.name).join(" · ") : "—"}
              />
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
                  ? selfId
                    ? "명부에서 내 이름을 찾지 못했습니다"
                    : "학생을 골라 주세요"
                  : !(isExam ? exam : product)
                    ? "상품을 골라 주세요"
                    : payable.length === 0
                      ? selfId
                        ? "이미 접수한 평가입니다"
                        : "접수할 수 있는 학생이 없습니다"
                      : needGuardian && !guardian
                        ? "보호자 확인을 마쳐 주세요"
                        : total === 0
                          ? selfId
                            ? "무료로 접수하기"
                            : `${payable.length}명 무료로 접수하기`
                          : `${orderWon(total)} 결제하기`}
              </button>
              {isExam && (
                <p className="mt-2.5 text-[11.5px] leading-[1.7] text-soft-muted">
                  결제와 동시에 접수됩니다. 응시 시작 전에는 전액 환불됩니다.
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
      {!selfId && <StepNav backHref={payStepHref.student} variant={variant} />}
    </>
  );
}

/**
 * 결제 완료 (/my/payments/done?order=) — 영수증.
 *
 * 결제 화면이 결제를 마치면 이 주소로 갈아 끼운다. 주문 번호가 없으면 가장 최근 결제를
 * 세운다. 면담 결제는 면담 화면의 영수증(/my/interviews/done)이 맡는다 — 사람과 시각이
 * 함께 적혀야 뜻이 있는 영수증이라서.
 */
export function PayDone({
  orderId,
  selfId,
  variant = 2,
}: {
  orderId?: string;
  selfId?: string;
  variant?: Variant;
}) {
  const t = themeOf(variant);
  const hydrated = useHydrated();
  const orders = useOrders();
  const base = selfId ? "/student/payments" : "/my/payments";

  /* 학생 본인 자리에서는 내 이름이 든 주문만 — 한 브라우저에 형제의 주문이 함께 남는다 */
  const paidOrders = orders.filter(
    (o) =>
      !o.productId.startsWith("CS-") && (!selfId || o.students.some((s) => s.id === selfId)),
  );
  const order = paidOrders.find((o) => o.id === orderId) ?? paidOrders[0] ?? null;

  if (!hydrated) {
    return (
      <p className={`${card} px-5 py-14 text-center text-[13px] text-soft-muted`}>
        확인 중입니다…
      </p>
    );
  }

  if (!order) {
    return (
      <section className={`${card} px-5 py-14 text-center`}>
        <p className="text-[15px] font-bold text-soft-ink">아직 결제한 내역이 없습니다</p>
        <p className="mt-2 text-[13px] leading-[1.7] text-soft-muted">
          결제를 마치면 이 자리에 주문 내용이 섭니다.
        </p>
        <Link href={base} className={`${t.btnAction} mt-5`}>
          결제하러 가기
        </Link>
      </section>
    );
  }

  return (
    <section className={`${card} p-7 text-center sm:p-9`}>
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
        <CheckIcon className="h-7 w-7" />
      </span>
      <h2 className="mt-5 text-[20px] font-bold text-soft-ink">
        {order.grantsTicket ? "결제가 끝나고 접수까지 되었습니다" : "결제가 끝났습니다"}
      </h2>
      <p className="mt-2.5 text-[13.5px] leading-[1.8] text-soft-muted">
        주문번호 <b className="tabular-nums text-soft-ink">{order.id}</b> · {order.productName} ·{" "}
        {orderWon(order.amount)}
        <br />
        {order.students.map((s) => s.name).join(" · ")} · 총 {order.students.length}명
        {/* 미성년 학생 본인 결제면 누가 확인했는지 남긴다 */}
        {order.guardian && (
          <>
            <br />
            보호자 확인 {order.guardian.name} · <span className="tabular-nums">{order.guardian.phone}</span>
          </>
        )}
      </p>
      {order.grantsTicket && (
        <p className="mt-3 text-[12.5px] leading-[1.7] text-soft-muted">
          {selfId
            ? "이제 「평가 보기」에서 과목을 열면 바로 응시할 수 있습니다."
            : "이제 학생이 접속코드로 로그인해 「응시하기」에서 과목별로 응시합니다. 코드를 아직 넘기지 않으셨다면 학생 목록에서 문자로 보내실 수 있습니다."}
        </p>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-2.5">
        <Link href={selfId ? "/student/exams" : "/my/children"} className={t.btnAction}>
          {selfId ? "평가 보러 가기" : "학생 목록으로"}
        </Link>
        {/* 같은 아이로 다른 상품을 — 고른 아이는 저장소에 남아 있어 상품 화면으로 바로 간다 */}
        <Link href={selfId ? base : payStepHref.product} className={t.btnOutline}>
          다른 상품 결제하기
        </Link>
      </div>
      <p className="mt-4 text-[12.5px] text-soft-muted">
        지난 결제는{" "}
        <Link href={base} className="font-semibold text-soft-primary hover:underline">
          결제
        </Link>{" "}
        화면의 결제 내역에서 보실 수 있습니다.
      </p>
    </section>
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
