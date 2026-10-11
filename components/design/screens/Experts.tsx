import Link from "next/link";
import {
  counselFee,
  counselModes,
  counselTopics,
  counselors,
  feeText,
  topicList,
  type Counselor,
} from "@/lib/counselors";
import { designLinks } from "@/lib/designScreens";
import { peopleDisclaimer } from "@/lib/people";
import { ArrowRight } from "@/components/Icons";
import PersonAvatar from "@/components/site/PersonAvatar";
import SiteFrame from "../SiteFrame";

/**
 * 상담 전문가 소개 (실제 주소 /experts · /experts/[id] · WBS R.1.8) — 디자인.
 *
 * 로그인하지 않아도 보는 공개 화면이다. 면담 신청 화면(/my/interviews/counselor)의 전문가
 * 카드는 로그인한 뒤에야 보여서, 「어떤 사람이 결과를 설명해 주는가」를 가입 전에 알 길이 없었다.
 *
 * 콘솔의 상담사 관리에서 「노출」을 켠 전문가만 여기에 표시된다. 값(전문 분야 · 방식 · 길이 ·
 * 가격)은 면담 신청 화면이 쓰는 것과 같은 명부(lib/counselors.ts)에서 가져온다.
 *
 * 비회원과 회원은 머리글과 「면담 신청」 단추가 가는 곳이 다르다 — 비회원은 로그인 안내 창,
 * 회원은 면담 신청 화면. 회원이라도 발행된 진단 결과가 없으면 신청할 수 없다는 창이 뜬다.
 */

const to = designLinks("experts");

const dayKo = ["일", "월", "화", "수", "목", "금", "토"];

function Hero({
  crumbs,
  children,
}: {
  crumbs: { label: string; href?: string }[];
  children: React.ReactNode;
}) {
  return (
    <section className="bg-gradient-to-b from-brand-50 via-[#f4f7ff] to-white">
      <div className="container-x py-10 md:py-14">
        <nav aria-label="현재 위치" className="type-meta flex flex-wrap items-center gap-2 text-slate-500">
          <Link href="/" className="hover:text-brand-700">
            홈
          </Link>
          {crumbs.map((c) => (
            <span key={c.label} className="flex items-center gap-2">
              <span aria-hidden>›</span>
              {c.href ? (
                <Link href={c.href} className="hover:text-brand-700">
                  {c.label}
                </Link>
              ) : (
                <span className="font-medium text-brand-700">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
        {children}
      </div>
    </section>
  );
}

function Chips({ c }: { c: Counselor }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {c.topics.map((v) => (
        <li key={v} className="type-tag rounded-full bg-brand-50 px-2.5 py-1 text-brand-700">
          {counselTopics[v]}
        </li>
      ))}
      {c.modes.map((m) => (
        <li key={m} className="type-tag rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-600">
          {counselModes[m]}
        </li>
      ))}
    </ul>
  );
}

export default function Experts({ state }: { state: string }) {
  const member = state.startsWith("member");
  const rest = member ? state.slice("member".length).replace(/^\//, "") : state;
  const base = member ? "member" : "";
  /** 같은 사람(비회원 · 회원)의 화면 안에서 옮겨 가는 주소 */
  const go = (tail = "") => to([base, tail].filter(Boolean).join("/"));

  if (rest === "" || rest === "empty") return <List member={member} empty={rest === "empty"} go={go} />;
  return <Detail member={member} popup={rest.split("/")[1] ?? null} go={go} />;
}

/* ───────────────────────── 목록 ───────────────────────── */

function List({ member, empty, go }: { member: boolean; empty: boolean; go: (tail?: string) => string }) {
  const list = empty ? [] : counselors;

  return (
    <SiteFrame as={member ? "member" : "guest"}>
      <Hero crumbs={[{ label: "상담 전문가" }]}>
        <h1 className="type-h2 mt-3 max-w-3xl font-black text-brand-950">상담 전문가</h1>
        <p className="type-body mt-2 max-w-2xl text-slate-600">
          진단 결과를 함께 읽고, 결과가 뜻하는 것과 다음에 해 볼 일을 안내하는 전문가입니다. 원하는
          전문가와 시간을 골라 면담을 신청할 수 있습니다.
        </p>
      </Hero>

      <div className="container-x section-y">
        {/* 고르개 — 무엇을 물으러 왔나 · 어떻게 만나나 */}
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border-y border-brand-100 py-4">
          <div role="group" aria-label="상담 주제" className="flex flex-wrap items-center gap-2">
            <span className="type-meta mr-1 font-bold text-brand-950">상담 주제</span>
            {["전체", ...topicList.map((v) => counselTopics[v])].map((label, i) => (
              <button
                key={label}
                type="button"
                aria-pressed={i === 0}
                className={`type-meta rounded-full border px-3.5 py-1.5 font-bold transition-colors ${
                  i === 0
                    ? "border-brand-900 bg-brand-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div role="group" aria-label="면담 방식" className="flex flex-wrap items-center gap-2">
            <span className="type-meta mr-1 font-bold text-brand-950">방식</span>
            {["전체", "화상", "전화", "대면"].map((label, i) => (
              <button
                key={label}
                type="button"
                aria-pressed={i === 0}
                className={`type-meta rounded-full border px-3.5 py-1.5 font-bold transition-colors ${
                  i === 0
                    ? "border-brand-900 bg-brand-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="type-meta ml-auto text-slate-500">전문가 {list.length}명</p>
        </div>

        {empty ? (
          <div className="mt-10 rounded-2xl border border-brand-100 bg-white px-6 py-20 text-center shadow-card">
            <p className="type-h3 font-black text-brand-950">소개할 전문가를 준비하고 있습니다</p>
            <p className="type-body mx-auto mt-3 max-w-md text-slate-600">
              면담을 맡을 전문가 명단을 확정하는 중입니다. 준비되면 이 화면에 소개하고 공지사항으로도
              알려 드리겠습니다.
            </p>
            <Link
              href="/community/notice"
              className="btn btn-md mt-6 border border-brand-200 text-brand-800 hover:bg-brand-50"
            >
              공지사항 보기
            </Link>
          </div>
        ) : (
          <ul className="mt-10 grid gap-5 md:grid-cols-2">
            {list.map((c) => (
              <li key={c.id}>
                <Link
                  href={go("kim-jiwon")}
                  className="group flex h-full gap-5 rounded-2xl border border-brand-100 bg-white p-6 shadow-card transition hover:border-brand-300"
                >
                  <PersonAvatar person={c.person} size={72} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-baseline gap-x-2.5">
                      <span className="type-h3 font-black text-brand-950 group-hover:text-brand-700">
                        {c.person.name}
                      </span>
                      <span className="type-meta text-slate-500">{c.person.role}</span>
                    </p>
                    <p className="type-body mt-2 text-slate-700">{c.focus}</p>
                    <div className="mt-3">
                      <Chips c={c} />
                    </div>
                    <p className="type-meta mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-bold text-brand-950">
                      {c.spans.map((v) => feeText(v, counselFee, c)).join(" · ")}
                      <span className="ml-auto inline-flex items-center gap-1 font-bold text-brand-700">
                        자세히 보기
                        <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                      </span>
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* 면담이 어떻게 진행되는지 — 세 단계 */}
        <div className="mt-16 md:mt-20">
          <h2 className="type-h2 font-black text-brand-950">면담은 이렇게 진행됩니다</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              { t: "진단 결과 확인", d: "전문가가 확정한 진단 결과가 발행되면 면담을 신청할 수 있습니다." },
              { t: "전문가 · 시간 선택", d: "상담 주제와 방식에 맞는 전문가를 고르고, 비어 있는 시간을 골라 결제합니다." },
              { t: "30분 또는 60분 면담", d: "화상 · 전화 · 대면 가운데 고른 방식으로 결과지를 함께 읽습니다. 녹음하지 않습니다." },
            ].map((s, i) => (
              <li key={s.t} className="rounded-2xl border border-brand-100 bg-white p-6 shadow-card">
                <span className="type-caption flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 font-bold text-brand-700">
                  {i + 1}
                </span>
                <h3 className="type-h4 mt-4 font-black text-brand-950">{s.t}</h3>
                <p className="type-body mt-1.5 text-slate-600">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-5 rounded-2xl bg-brand-950 px-7 py-8 text-white md:px-10">
          <div>
            <p className="type-h3 font-black">
              {member ? "발행된 진단 결과로 면담을 신청해 보세요" : "면담은 로그인한 뒤 신청할 수 있습니다"}
            </p>
            <p className="type-body mt-1.5 text-brand-200">
              {member
                ? "면담 화면에서 학생을 고르면 그 학생의 결과로 신청합니다."
                : "보호자 계정으로 로그인하고, 학생의 진단 결과가 발행되면 신청할 수 있습니다."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {member ? (
              <Link href="/my/interviews" className="btn btn-md bg-white text-brand-900 hover:bg-brand-50">
                면담 신청하기
              </Link>
            ) : (
              <>
                <Link href="/login" className="btn btn-md bg-white text-brand-900 hover:bg-brand-50">
                  로그인
                </Link>
                <Link href="/signup/type" className="btn btn-md border border-white/40 text-white hover:bg-white/10">
                  회원가입
                </Link>
              </>
            )}
          </div>
        </div>

        {!empty && (
          <p className="type-caption mt-6 rounded-2xl border border-dashed border-amber-300 bg-amber-50/70 px-5 py-4 text-amber-900">
            {peopleDisclaimer}
          </p>
        )}
      </div>
    </SiteFrame>
  );
}

/* ───────────────────────── 상세 ───────────────────────── */

function Detail({
  member,
  popup,
  go,
}: {
  member: boolean;
  popup: string | null;
  go: (tail?: string) => string;
}) {
  const c = counselors[0];
  const p = c.person;
  const others = counselors.slice(1, 5);

  return (
    <SiteFrame as={member ? "member" : "guest"}>
      <Hero crumbs={[{ label: "상담 전문가", href: go() }, { label: p.name }]}>
        <div className="mt-5 flex flex-wrap items-start gap-6">
          <PersonAvatar person={p} size={96} className="shadow-card" />
          <div className="min-w-0 flex-1">
            <h1 className="type-h2 font-black text-brand-950">{p.name}</h1>
            <p className="type-lead mt-2 font-bold text-brand-700">{p.role}</p>
            <p className="type-meta mt-1 text-slate-500">{p.org}</p>
            <p className="type-lead mt-5 max-w-2xl text-slate-600">{c.focus}</p>
            <div className="mt-5">
              <Chips c={c} />
            </div>
          </div>
        </div>
      </Hero>

      <section className="section-y">
        <div className="container-x grid gap-10 lg:grid-cols-[1fr_340px] lg:gap-14">
          <div className="space-y-10">
            <div>
              <h2 className="type-h2 font-black text-brand-950">소개</h2>
              <p className="type-lead mt-4 text-slate-600">{p.bio}</p>
            </div>

            <div>
              <h2 className="type-h2 font-black text-brand-950">이런 이야기를 나눕니다</h2>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  { t: counselTopics.report, d: "결과지의 여덟 축과 재능 유형이 무엇을 뜻하는지 하나씩 읽어 드립니다." },
                  { t: counselTopics.career, d: "심화 과정을 권할 때와 조금 더 지켜볼 때를 나누어 말씀드립니다." },
                ].map((r) => (
                  <li key={r.t} className="rounded-2xl border border-brand-100 bg-white p-5 shadow-card">
                    <h3 className="type-h4 font-black text-brand-950">{r.t}</h3>
                    <p className="type-body mt-1.5 text-slate-600">{r.d}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="type-h2 font-black text-brand-950">주요 이력</h2>
              <ol className="mt-5 space-y-3">
                {p.career.map((line, i) => (
                  <li key={line} className="flex gap-4 rounded-2xl border border-brand-100 bg-white p-5 shadow-card">
                    <span className="type-caption flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 font-bold text-brand-700">
                      {p.career.length - i}
                    </span>
                    <p className="type-body text-slate-700">{line}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-2xl border border-brand-100 bg-white p-6 shadow-card">
              <h2 className="type-h4 font-black text-brand-950">면담 안내</h2>
              <dl className="mt-4 space-y-3">
                {[
                  { k: "면담 방식", v: c.modes.map((m) => counselModes[m]).join(" · ") },
                  { k: "면담 시간 · 가격", v: c.spans.map((v) => feeText(v, counselFee, c)).join(" · ") },
                  { k: "면담하는 날", v: `${c.days.map((d) => dayKo[d]).join(" · ")}요일 ${c.from} ~ ${c.to}` },
                ].map((r) => (
                  <div key={r.k}>
                    <dt className="type-caption font-bold text-slate-500">{r.k}</dt>
                    <dd className="type-meta mt-0.5 font-bold text-brand-950">{r.v}</dd>
                  </div>
                ))}
              </dl>
              <Link
                href={member ? "/my/interviews" : go("kim-jiwon/login")}
                className="btn btn-md mt-5 w-full bg-brand-900 text-white shadow-card hover:bg-brand-800"
              >
                이 전문가에게 면담 신청
              </Link>
              <p className="type-caption mt-3 text-slate-500">
                면담은 학생의 진단 결과가 발행된 뒤에 신청할 수 있습니다. 비어 있는 시간은 신청 화면에서
                확인합니다.
              </p>
            </div>

            <div className="rounded-2xl border border-brand-100 bg-white p-6 shadow-card">
              <h2 className="type-h4 font-black text-brand-950">다른 전문가</h2>
              <ul className="mt-4 space-y-1">
                {others.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={go("kim-jiwon")}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-brand-50"
                    >
                      <PersonAvatar person={s.person} size={36} />
                      <span className="min-w-0 flex-1">
                        <span className="type-h4 block truncate font-bold text-brand-950">{s.person.name}</span>
                        <span className="type-caption block truncate text-slate-500">
                          {s.topics.map((v) => counselTopics[v]).join(" · ")}
                        </span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <p className="type-caption rounded-2xl border border-dashed border-amber-300 bg-amber-50/70 px-5 py-4 text-amber-900">
              {peopleDisclaimer}
            </p>

            <Link href={go()} className="btn btn-md w-full border border-brand-200 text-brand-800 hover:bg-brand-50">
              전문가 전체 보기
            </Link>
          </aside>
        </div>
      </section>

      {popup === "login" && (
        <SiteDialog
          title="로그인한 뒤 신청할 수 있습니다"
          actions={
            <>
              <Link href={go("kim-jiwon")} className="btn btn-md border border-brand-200 text-brand-800 hover:bg-brand-50">
                닫기
              </Link>
              <Link href="/signup/type" className="btn btn-md border border-brand-200 text-brand-800 hover:bg-brand-50">
                회원가입
              </Link>
              <Link href="/login" className="btn btn-md bg-brand-900 text-white hover:bg-brand-800">
                로그인
              </Link>
            </>
          }
        >
          면담은 보호자 계정으로 로그인하고, 학생의 진단 결과가 발행된 뒤에 신청할 수 있습니다. 로그인하면
          <b className="text-brand-950"> {p.name} 전문가</b>를 고른 채로 면담 신청 화면이 열립니다.
        </SiteDialog>
      )}

      {popup === "no-report" && (
        <SiteDialog
          title="발행된 진단 결과가 아직 없습니다"
          actions={
            <>
              <Link href={go("kim-jiwon")} className="btn btn-md border border-brand-200 text-brand-800 hover:bg-brand-50">
                닫기
              </Link>
              <Link href="/my" className="btn btn-md bg-brand-900 text-white hover:bg-brand-800">
                진행 상황 보기
              </Link>
            </>
          }
        >
          면담은 진단 결과를 함께 읽는 자리라, 결과가 발행된 학생만 신청할 수 있습니다. 등록하신 학생
          2명은 모두 응시 중이거나 결과를 기다리고 있습니다. 결과가 발행되면 알림으로 알려 드립니다.
        </SiteDialog>
      )}
    </SiteFrame>
  );
}

/** 공개 사이트의 안내 창 — 흰 판에 남색 단추 */
function SiteDialog({
  title,
  children,
  actions,
}: {
  title: string;
  children: React.ReactNode;
  actions: React.ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-brand-950/45 p-5"
    >
      <div className="w-full max-w-[28rem] rounded-2xl bg-white p-7 shadow-float">
        <h2 className="type-h3 font-black text-brand-950">{title}</h2>
        <p className="type-body mt-3 text-slate-600">{children}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">{actions}</div>
      </div>
    </div>
  );
}
