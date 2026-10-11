"use client";

import Link from "next/link";
import { themeOf } from "@/lib/authVariant";
import { designLinks } from "@/lib/designScreens";
import { company } from "@/lib/site";
import { AccHead, card } from "@/components/account/ui";
import DashFrame, { SoftDialog, softBtn, type DashWho } from "../DashFrame";

/**
 * 면담 일정 상세 (실제 주소 /my/interviews/[예약번호] · /student/interviews/[예약번호] · WBS M.2.9) — 디자인.
 *
 * 면담 화면의 「면담 내역」에서 한 줄을 누르면 오는 자리다. 내역 표는 일시 · 전문가 · 방식만
 * 보여 주므로, **어디로 가야 하는지**(화상 링크 · 장소 · 전화)와 결제 · 취소는 여기에 둔다.
 *
 * 화면은 위에서부터 언제 누구와 → 어떻게 만나나 → 무엇을 물었나 → 얼마를 냈나 → 바꾸려면 차례다.
 * 「어떻게 만나나」 카드만 면담 방식에 따라 바뀐다.
 *
 * 상담사가 적는 결과 기록은 보호자 화면에 보이지 않는다(상담사와 운영 책임자만 본다).
 */

const t = themeOf(2);

type Slug =
  | ""
  | "video-open"
  | "onsite"
  | "phone"
  | "pay-wait"
  | "assigning"
  | "done"
  | "canceled"
  | "cancel"
  | "receipt";

type Tone = "ok" | "wait" | "muted";

const toneCls: Record<Tone, { text: string; dot: string }> = {
  ok: { text: "text-emerald-600", dot: "bg-emerald-500" },
  wait: { text: "text-amber-600", dot: "bg-amber-500" },
  muted: { text: "text-slate-500", dot: "bg-slate-400" },
};

function StatusChip({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const c = toneCls[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[13.5px] font-bold ${c.text}`}>
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {children}
    </span>
  );
}

function Line({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0 last:pb-0 first:pt-0">
      <dt className="shrink-0 text-[13.5px] text-soft-muted">{k}</dt>
      <dd className="text-right text-[14px] font-semibold text-soft-ink">{children}</dd>
    </div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[16px] font-bold tracking-tight text-soft-ink">{children}</h2>;
}

/* ───────────────────────── 화면 ───────────────────────── */

export default function MyInterview({ state }: { state: string }) {
  return <Detail who="parent" slug={state as Slug} />;
}

export function StudentInterview({ state }: { state: string }) {
  return <Detail who="teen" slug={state as Slug} />;
}

function Detail({ who, slug }: { who: DashWho; slug: Slug }) {
  const teen = who === "teen";
  const zone = teen ? "/student" : "/my";
  const to = designLinks(teen ? "student-interview" : "my-interview");
  const student = teen ? "이하윤 · 중학 2학년" : "김도현 · 초등 4학년";
  const diag = teen ? "2026 3분기 중2 진단" : "2026 3분기 초4 진단";
  const code = teen ? "CS-2610-0021" : "CS-2610-0012";
  const order = teen ? "GX2026-000163" : "GX2026-000149";

  /* 팝업은 「예약 확정 · 화상」 화면 위에 뜬다 */
  const base: Slug = slug === "cancel" || slug === "receipt" ? "" : slug;
  const mode = base === "onsite" ? "대면" : base === "phone" ? "전화" : "화상";
  const past = base === "done";
  const canceled = base === "canceled";
  const payWait = base === "pay-wait";
  const assigning = base === "assigning";
  const when = past ? "2026.10.08(목) 14:00 – 15:00" : "2026.10.15(목) 14:00 – 15:00";

  return (
    <DashFrame
      who={who}
      at={`${zone}/interviews`}
      unread={teen ? 2 : 3}
      bellHref={teen ? "/design/student/teen/alerts" : "/design/my/alerts"}
    >
      <AccHead title="면담 일정" back={{ href: `${zone}/interviews`, label: "면담" }} />

      {/* ── 언제 누구와 ── */}
      <section className={`${card} p-6 sm:p-7`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {canceled ? (
            <StatusChip tone="muted">취소됨</StatusChip>
          ) : past ? (
            <StatusChip tone="muted">면담 완료</StatusChip>
          ) : payWait ? (
            <StatusChip tone="wait">결제 대기</StatusChip>
          ) : assigning ? (
            <StatusChip tone="wait">전문가 배정 중</StatusChip>
          ) : (
            <StatusChip tone="ok">예약 확정</StatusChip>
          )}
          <span className="text-[12.5px] text-soft-muted">
            예약번호 <b className="font-semibold tabular-nums text-soft-ink">{code}</b>
          </span>
        </div>

        <p
          className={`mt-4 text-[24px] font-bold leading-tight tracking-tight tabular-nums sm:text-[28px] ${
            canceled ? "text-slate-400 line-through" : "text-soft-ink"
          }`}
        >
          {when}
        </p>
        <p className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[14px] text-soft-muted">
          <span>60분 · {mode} 면담</span>
          {!past && !canceled && !payWait && (
            <span className="rounded-full bg-soft-primary-soft px-2.5 py-0.5 text-[12px] font-semibold text-soft-primary">
              4일 남음
            </span>
          )}
        </p>

        <div className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
          {/* 전문가 */}
          <div className="flex items-start gap-3.5">
            {assigning ? (
              <span
                aria-hidden
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] border border-dashed border-soft-line bg-slate-50 text-[20px] text-slate-300"
              >
                ?
              </span>
            ) : (
              <span
                aria-hidden
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] bg-soft-primary-soft text-[17px] font-bold text-soft-primary"
              >
                지원
              </span>
            )}
            <div className="min-w-0">
              <p className="text-[12.5px] font-semibold text-soft-muted">전문가</p>
              {assigning ? (
                <>
                  <p className="mt-0.5 text-[15.5px] font-bold text-soft-ink">배정하고 있습니다</p>
                  <p className="mt-1 text-[13px] leading-[1.7] text-soft-muted">
                    「전문가 배정 요청」으로 신청하셨습니다. 영업일 기준 하루 안에 배정해 문자로 알려 드립니다.
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-0.5 text-[15.5px] font-bold text-soft-ink">
                    김지원 <span className="text-[12.5px] font-normal text-soft-muted">책임연구원 · 진단 총괄</span>
                  </p>
                  <p className="mt-1 text-[13px] leading-[1.7] text-soft-muted">
                    결과지의 여덟 축을 「집에서 무엇을 바꿀지」로 옮겨 드립니다.
                  </p>
                </>
              )}
            </div>
          </div>
          {/* 학생 */}
          <div className="sm:border-l sm:border-slate-100 sm:pl-5">
            <p className="text-[12.5px] font-semibold text-soft-muted">{teen ? "신청한 사람" : "학생"}</p>
            <p className="mt-0.5 text-[15.5px] font-bold text-soft-ink">{student}</p>
            <p className="mt-1 text-[13px] leading-[1.7] text-soft-muted">
              함께 볼 결과 ·{" "}
              <Link href={teen ? "/student/results" : "/exam/result"} className="font-semibold text-soft-primary hover:underline">
                {diag}
              </Link>
            </p>
          </div>
        </div>

        {payWait && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-amber-200 bg-amber-50 p-4">
            <p className="text-[13.5px] leading-[1.7] text-amber-900">
              <b>결제를 마쳐야 예약이 확정됩니다.</b> 고르신 시간은 15분 동안 잡아 둡니다.
              <span className="mt-0.5 block tabular-nums">
                남은 시간 <b>11분 42초</b> — 시간이 지나면 다른 분이 예약할 수 있습니다.
              </span>
            </p>
            <Link href={`${zone}/interviews/pay`} className={t.btnAction}>
              결제하기
            </Link>
          </div>
        )}
      </section>

      {/* ── 어떻게 만나나 ── */}
      {!canceled && !past && (
        <section className={`${card} mt-4 p-6 sm:p-7`}>
          <CardTitle>{mode === "대면" ? "오시는 곳" : mode === "전화" ? "전화 면담" : "화상 면담 입장"}</CardTitle>

          {(payWait || assigning) && (
            <p className="mt-3 text-[14px] leading-[1.8] text-soft-muted">
              {payWait
                ? "결제를 마치면 화상 면담 링크를 여기에 안내해 드립니다."
                : "전문가가 배정되면 화상 면담 링크를 여기에 안내해 드립니다."}
            </p>
          )}

          {!payWait && !assigning && mode === "화상" && (
            <>
              <p className="mt-3 text-[14px] leading-[1.8] text-soft-ink">
                {base === "video-open" ? (
                  "지금 들어오실 수 있습니다. 전문가는 면담 시각에 맞춰 들어옵니다."
                ) : (
                  <>
                    아래 링크로 <b>면담 10분 전(13:50)</b>부터 들어오실 수 있습니다. 같은 링크를 문자로도 보내
                    드렸습니다.
                  </>
                )}
              </p>
              <p className="mt-3 flex flex-wrap items-center gap-2 rounded-[12px] border border-soft-line bg-slate-50 px-4 py-3 text-[13.5px]">
                <span className="min-w-0 flex-1 truncate tabular-nums text-soft-ink">
                  https://meet.genixx.kr/{code.toLowerCase()}
                </span>
                <button type="button" className="shrink-0 font-semibold text-soft-primary hover:underline">
                  링크 복사
                </button>
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                {base === "video-open" ? (
                  <button type="button" className={t.btnAction}>
                    화상 면담 입장하기
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled
                      className="inline-flex h-[3rem] cursor-not-allowed items-center justify-center rounded-full border border-soft-line bg-slate-50 px-6 text-[15px] font-semibold text-slate-400"
                    >
                      화상 면담 입장하기
                    </button>
                    <span className="text-[13px] text-soft-muted">10.15(목) 13:50부터 누를 수 있습니다</span>
                  </>
                )}
              </div>
              <ul className="mt-5 space-y-1.5 border-t border-slate-100 pt-4 text-[13px] leading-[1.7] text-soft-muted">
                <li>· 카메라와 마이크가 되는 컴퓨터나 휴대전화에서 들어와 주세요. 따로 설치할 프로그램은 없습니다.</li>
                <li>· 진단 결과지를 함께 보며 이야기합니다. 결과 화면을 미리 열어 두시면 좋습니다.</li>
                <li>· 면담은 녹음하거나 녹화하지 않습니다.</li>
              </ul>
            </>
          )}

          {mode === "대면" && (
            <>
              <p className="mt-3 text-[15px] font-bold text-soft-ink">GENIXX 재능연구소 2층 면담실 A</p>
              <p className="mt-1 text-[14px] leading-[1.8] text-soft-muted">{company.address}</p>
              {/* 지도 자리 — 실제 서비스에서는 지도 서비스의 지도가 들어온다 */}
              <div
                role="img"
                aria-label="면담 장소 지도"
                className="relative mt-4 h-52 overflow-hidden rounded-[12px] border border-soft-line bg-[#e9eef5]"
                style={{
                  backgroundImage:
                    "linear-gradient(#dbe3ee 1px, transparent 1px), linear-gradient(90deg, #dbe3ee 1px, transparent 1px)",
                  backgroundSize: "44px 44px",
                }}
              >
                <span className="absolute left-0 top-[46%] h-3 w-full bg-white/80" />
                <span className="absolute left-[38%] top-0 h-full w-3 bg-white/80" />
                <span className="absolute left-[58%] top-[30%] flex -translate-x-1/2 -translate-y-full flex-col items-center">
                  <span className="rounded-full bg-soft-primary px-3 py-1 text-[12px] font-bold text-white shadow">
                    GENIXX 재능연구소
                  </span>
                  <span className="h-3 w-3 -translate-y-1.5 rotate-45 bg-soft-primary" />
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2.5">
                <button type="button" className={t.btnOutline}>
                  지도 앱에서 보기
                </button>
                <button type="button" className={t.btnQuiet}>
                  주소 복사
                </button>
              </div>
              <ul className="mt-5 space-y-1.5 border-t border-slate-100 pt-4 text-[13px] leading-[1.7] text-soft-muted">
                <li>· 면담 10분 전까지 2층 안내 데스크로 와 주세요. 예약번호를 말씀하시면 됩니다.</li>
                <li>· 건물 뒤 주차장을 2시간 무료로 쓰실 수 있습니다.</li>
                <li>· 학생과 함께 오셔도 되고 보호자만 오셔도 됩니다.</li>
              </ul>
            </>
          )}

          {mode === "전화" && (
            <>
              <p className="mt-3 text-[14px] leading-[1.8] text-soft-ink">
                예약한 시각에 전문가가 아래 번호로 전화를 드립니다.
              </p>
              <p className="mt-3 flex flex-wrap items-center gap-2 rounded-[12px] border border-soft-line bg-slate-50 px-4 py-3">
                <span className="text-[13px] text-soft-muted">받으실 번호</span>
                <b className="text-[16px] tabular-nums text-soft-ink">010-4821-7730</b>
                <button type="button" className="ml-auto text-[13.5px] font-semibold text-soft-primary hover:underline">
                  번호 바꾸기
                </button>
              </p>
              <ul className="mt-5 space-y-1.5 border-t border-slate-100 pt-4 text-[13px] leading-[1.7] text-soft-muted">
                <li>· 발신 번호는 {company.tel}입니다. 모르는 번호로 표시될 수 있습니다.</li>
                <li>· 5분 안에 두 번 전화드려도 받지 않으시면 문자로 다시 연락드립니다.</li>
                <li>· 면담은 녹음하지 않습니다.</li>
              </ul>
            </>
          )}
        </section>
      )}

      {/* ── 취소된 면담 ── */}
      {canceled && (
        <section className={`${card} mt-4 p-6 sm:p-7`}>
          <CardTitle>취소 · 환불</CardTitle>
          <dl className="mt-4">
            <Line k="취소한 때">
              <span className="tabular-nums">2026.10.11(일) 09:24</span>
            </Line>
            <Line k="취소한 사람">신청하신 분 (직접 취소)</Line>
            <Line k="환불 금액">
              <span className="tabular-nums">100,000원</span> <span className="font-normal text-soft-muted">(전액)</span>
            </Line>
            <Line k="환불 상태">
              <span className="text-amber-600">환불 처리 중</span>{" "}
              <span className="font-normal text-soft-muted">· 영업일 기준 3~5일</span>
            </Line>
          </dl>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <Link href={`${zone}/interviews`} className={t.btnAction}>
              다시 신청하기
            </Link>
          </div>
        </section>
      )}

      {/* ── 끝난 면담 ── */}
      {past && (
        <section className={`${card} mt-4 p-6 sm:p-7`}>
          <CardTitle>면담을 마쳤습니다</CardTitle>
          <p className="mt-3 text-[14px] leading-[1.8] text-soft-muted">
            2026.10.08(목) 15:00에 화상 면담이 끝났습니다. 면담에서 나눈 이야기를 더 묻고 싶으시면 같은
            전문가에게 다시 신청하실 수 있습니다.
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link href={`${zone}/interviews`} className={t.btnAction}>
              다시 신청하기
            </Link>
            <Link href="/support/inquiry" target="_blank" rel="noopener noreferrer" className={t.btnQuiet}>
              1:1 문의
            </Link>
          </div>
        </section>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* ── 무엇을 물었나 ── */}
        <section className={`${card} p-6 sm:p-7`}>
          <CardTitle>신청 내용</CardTitle>
          <p className="mt-4 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-soft-primary-soft px-2.5 py-0.5 text-[12px] font-semibold text-soft-primary">
              결과지 해석
            </span>
          </p>
          <p className="mt-3 text-[14px] leading-[1.8] text-soft-ink">
            지난번과 재능 유형이 다르게 나왔는데 왜 그런지 알고 싶습니다. 수학을 어려워하게 된 건지도
            궁금합니다.
          </p>
          <p className="mt-3 text-[12.5px] text-soft-muted">
            신청한 때 <span className="tabular-nums">2026.10.01(목) 10:02</span>
          </p>
        </section>

        {/* ── 얼마를 냈나 ── */}
        <section className={`${card} p-6 sm:p-7`}>
          <CardTitle>{payWait ? "결제 예정" : "결제"}</CardTitle>
          <dl className="mt-4">
            <Line k="상품">결과 해석 면담 60분</Line>
            <Line k={payWait ? "결제할 금액" : "결제 금액"}>
              <span className="tabular-nums">100,000원</span>
            </Line>
            {!payWait && (
              <>
                <Line k="결제 수단">신용카드 · KB국민 1234</Line>
                <Line k="결제한 때">
                  <span className="tabular-nums">2026.10.01(목) 10:05</span>
                </Line>
                <Line k="주문번호">
                  <span className="tabular-nums">{order}</span>
                </Line>
                {teen && <Line k="보호자 확인">이정민 · 010-9034-1182</Line>}
              </>
            )}
          </dl>
          {!payWait && (
            <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-[13.5px] font-semibold">
              <Link href={to("receipt")} className="text-soft-primary hover:underline">
                영수증 보기
              </Link>
              <Link href={`${zone}/payments?tab=counsel`} className="text-soft-muted hover:text-soft-ink">
                결제 내역
              </Link>
            </div>
          )}
        </section>
      </div>

      {/* ── 바꾸려면 ── */}
      {!canceled && !past && (
        <section className={`${card} mt-4 p-6 sm:p-7`}>
          <CardTitle>일정 변경 · 취소</CardTitle>
          <ul className="mt-3 space-y-1.5 text-[13.5px] leading-[1.75] text-soft-muted">
            <li>· 날짜나 시간을 바꾸려면 이 예약을 취소한 뒤 새로 신청해 주세요.</li>
            <li>
              · <b className="text-soft-ink">면담 하루 전(10.14 14:00)까지</b> 취소하면 전액 환불됩니다. 그 뒤에는{" "}
              <Link
                href="/legal/refund"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-soft-primary hover:underline"
              >
                환불 정책
              </Link>
              에 따라 처리됩니다.
            </li>
            <li>· 전문가 사정으로 시간이 바뀌면 문자로 먼저 연락드립니다.</li>
          </ul>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link
              href={to("cancel")}
              className="inline-flex h-[3rem] items-center justify-center rounded-full border border-[#e7b9b9] bg-white px-6 text-[15px] font-semibold text-[#c8382c] transition-colors hover:bg-[#fdf2f2]"
            >
              {payWait ? "신청 취소" : "예약 취소"}
            </Link>
            <Link href="/support/inquiry" target="_blank" rel="noopener noreferrer" className={t.btnQuiet}>
              1:1 문의
            </Link>
          </div>
        </section>
      )}

      {slug === "cancel" && (
        <SoftDialog
          title="이 면담을 취소할까요?"
          actions={
            <>
              <Link href={to()} className={softBtn.cancel}>
                그대로 두기
              </Link>
              <Link href={teen ? to() : to("canceled")} className={softBtn.danger}>
                취소하기
              </Link>
            </>
          }
        >
          <p>
            <b className="text-soft-ink">2026.10.15(목) 14:00 · 김지원 전문가</b> 면담이 취소되고, 그 시간은
            다른 분이 예약할 수 있게 됩니다.
          </p>
          <dl className="mt-4 rounded-[12px] bg-slate-50 px-4 py-3 text-[13.5px]">
            <div className="flex justify-between gap-3 py-1">
              <dt>결제 금액</dt>
              <dd className="font-semibold tabular-nums text-soft-ink">100,000원</dd>
            </div>
            <div className="flex justify-between gap-3 py-1">
              <dt>환불 금액</dt>
              <dd className="font-bold tabular-nums text-soft-primary">100,000원 (전액)</dd>
            </div>
          </dl>
          <p className="mt-3 text-[13px]">환불은 결제하신 수단으로 영업일 기준 3~5일 안에 처리됩니다.</p>
        </SoftDialog>
      )}

      {slug === "receipt" && (
        <SoftDialog
          title="영수증"
          wide
          actions={
            <>
              <Link href={to()} className={softBtn.cancel}>
                닫기
              </Link>
              <button type="button" className={softBtn.primary}>
                인쇄하기
              </button>
            </>
          }
        >
          <dl className="text-[13.5px]">
            {[
              ["주문번호", order],
              ["결제한 때", "2026.10.01(목) 10:05"],
              ["상품", "결과 해석 면담 60분"],
              ["면담 일시", "2026.10.15(목) 14:00 · 김지원 전문가"],
              ["학생", student],
              ["결제 수단", "신용카드 · KB국민 1234 · 일시불"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-slate-100 py-2.5">
                <dt className="shrink-0">{k}</dt>
                <dd className="text-right font-semibold tabular-nums text-soft-ink">{v}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-4 py-2.5">
              <dt>공급가액 · 부가세</dt>
              <dd className="text-right tabular-nums text-soft-ink">90,909원 · 9,091원</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 rounded-[12px] bg-slate-50 px-4 py-3">
              <dt className="font-bold text-soft-ink">합계</dt>
              <dd className="text-[18px] font-bold tabular-nums text-soft-ink">100,000원</dd>
            </div>
          </dl>
          <p className="mt-4 text-[12.5px] leading-[1.7]">
            {company.name} · {company.address}
            <br />
            카드 매출전표는 카드사에서 따로 발급됩니다.
          </p>
        </SoftDialog>
      )}
    </DashFrame>
  );
}
