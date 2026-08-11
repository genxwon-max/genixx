"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession } from "@/lib/authStore";
import { formatCode, reissueCode, useRoster } from "@/lib/roster";
import { useHydrated } from "@/lib/examStore";
import { phaseTone, progressOf } from "@/lib/progress";
import {
  ageFromBirth,
  consentRouteFor,
  consentRouteInfo,
  consentStages,
  notificationChannels,
  notificationKinds,
  type ConsentStageId,
} from "@/lib/account";
import { themeOf, type Variant } from "@/lib/authVariant";

/**
 * ACC-05 마이페이지 — 학부모 · 기관 공용 계정 허브.
 *
 * 학부모 홈(/my)·기관 대시보드(/org)와 역할이 다르다. 저 둘은 "아이가 지금 어디까지
 * 왔나"를 보는 자리고, 여기는 **계정 자체를 손보는 자리**다. 그래서 진행률·접속코드
 * 대신 회원정보·동의·수신·결제·탈퇴가 들어온다.
 *
 * 참고한 국내 서비스 —
 *  · 아이스크림 홈런(home-learn) : "학부모 아이디로 로그인" → 좌측 LNB 계정 허브.
 *    프로필 카드를 맨 위에 두고 메뉴를 2~3개 묶음으로 나눈다. 골격을 여기서 가져왔다.
 *  · 콴다과외(class.qanda.ai)      : 프로필 카드 + 상태 배지 + 카드형 리스트.
 *  · 매쓰플랫(mathflat)            : 좌측 고정 메뉴 + 우측 표. 구성원·명부 화면 참고.
 *  · 클리포(clipo.ai)              : 시안 2(둥글둥글)의 라운드·파랑 계열 근거.
 *
 * 화면 하나에 몰지 않고 좌측 메뉴로 갈랐다. 국내 교육 서비스의 마이페이지가 예외 없이
 * 이 구조라, 학부모가 처음 봐도 어디를 눌러야 하는지 헤매지 않는다.
 *
 * 섹션은 지금 화면 안에서 갈리지만(SignupType의 initialStage와 같은 방식) 개발 단계에서
 * 각각 실주소를 갖는다. 아래 menu의 `path`가 그 주소다.
 */

/** 기관담당자·교사는 같은 메뉴를 쓴다 (보이는 데이터만 승인 여부로 갈린다) */
export type Audience = "parent" | "org";

export type SectionId =
  | "profile"
  | "children"
  | "consent"
  | "org"
  | "members"
  | "billing"
  | "notify"
  | "inquiry"
  | "leave";

type Item = { id: SectionId; label: string; desc: string; path: string };
type Group = { title: string; items: Item[] };

const menus: Record<Audience, Group[]> = {
  parent: [
    {
      title: "내 계정",
      items: [
        { id: "profile", label: "회원정보", desc: "이름·연락처·비밀번호·연결된 계정", path: "/mypage/profile" },
        { id: "notify", label: "알림 설정", desc: "무엇을 어디로 받을지", path: "/mypage/notify" },
      ],
    },
    {
      title: "학생",
      items: [
        { id: "children", label: "학생 관리", desc: "프로필·접속코드", path: "/mypage/children" },
        { id: "consent", label: "동의 관리", desc: "항목별 동의와 철회", path: "/mypage/consent" },
      ],
    },
    {
      title: "이용",
      items: [
        { id: "billing", label: "이용권·결제", desc: "보유 응시권과 결제 내역", path: "/mypage/billing" },
        { id: "inquiry", label: "문의 내역", desc: "보낸 문의와 답변", path: "/mypage/inquiry" },
      ],
    },
  ],
  org: [
    {
      title: "내 계정",
      items: [
        { id: "profile", label: "회원정보", desc: "이름·연락처·비밀번호·연결된 계정", path: "/mypage/profile" },
        { id: "notify", label: "알림 설정", desc: "무엇을 어디로 받을지", path: "/mypage/notify" },
      ],
    },
    {
      title: "기관",
      items: [
        { id: "org", label: "기관 정보", desc: "기관명·사업자·승인 상태", path: "/mypage/org" },
        { id: "members", label: "구성원 관리", desc: "교사 초대와 승인", path: "/mypage/members" },
      ],
    },
    {
      title: "이용",
      items: [
        { id: "billing", label: "이용권·결제", desc: "보유 응시권과 결제 내역", path: "/mypage/billing" },
        { id: "inquiry", label: "문의 내역", desc: "보낸 문의와 답변", path: "/mypage/inquiry" },
      ],
    },
  ],
};

/* ─────────────── 화면 설계용 예시 데이터 ───────────────
   실제 값이 아니다. 연동 시 서버 응답으로 갈아끼운다. */

const demoMembers = [
  { name: "박정후", email: "park@example.ac.kr", role: "교사", state: "활성", at: "2026-03-02" },
  { name: "윤세라", email: "yoon@example.ac.kr", role: "교사", state: "활성", at: "2026-03-11" },
  { name: "정하람", email: "jung@example.ac.kr", role: "교사", state: "승인 대기", at: "2026-08-04" },
];

/** 학부모는 아이 수만큼 낱장으로, 기관은 묶음으로 산다 — 결제 수단도 그래서 갈린다 */
const demoPayments: Record<Audience, { at: string; item: string; method: string; state: string }[]> =
  {
    parent: [
      { at: "2026-07-14", item: "재능진단 응시권 1매", method: "카카오페이", state: "결제 완료" },
      { at: "2026-03-02", item: "학력진단 (무료 회차)", method: "—", state: "—" },
    ],
    org: [
      { at: "2026-07-14", item: "재능진단 응시권 20매", method: "세금계산서", state: "결제 완료" },
      { at: "2026-03-02", item: "재능진단 응시권 20매", method: "세금계산서", state: "결제 완료" },
      { at: "2026-03-02", item: "학력진단 (무료 회차)", method: "—", state: "—" },
    ],
  };

const demoInquiries: Record<Audience, { at: string; title: string; state: string }[]> = {
  parent: [
    { at: "2026-08-06", title: "접속코드를 다시 받고 싶습니다", state: "답변 완료" },
    { at: "2026-07-29", title: "리포트 발행 일정 문의", state: "답변 완료" },
    { at: "2026-08-10", title: "둘째 아이도 같은 계정에 넣을 수 있나요", state: "접수" },
  ],
  org: [
    { at: "2026-08-06", title: "명부 CSV 형식 문의", state: "답변 완료" },
    { at: "2026-07-29", title: "응시권 추가 구매와 세금계산서", state: "답변 완료" },
    { at: "2026-08-10", title: "교사 계정 승인이 지연됩니다", state: "접수" },
  ],
};

const socialProviders = [
  { id: "카카오", dot: "#FEE500" },
  { id: "네이버", dot: "#03C75A" },
  { id: "구글", dot: "#EA4335" },
];

/* ───────────────────────── 조각 ───────────────────────── */

/** 켜고 끄는 스위치 */
function Toggle({
  variant,
  on,
  label,
  disabled,
  onChange,
}: {
  variant: Variant;
  on: boolean;
  label: string;
  disabled?: boolean;
  onChange: () => void;
}) {
  const track = on
    ? variant === 1
      ? "bg-acc-primary"
      : "bg-soft-primary"
    : variant === 1
      ? "bg-acc-field"
      : "bg-slate-300";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${track}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${
          on ? "left-[1.375rem]" : "left-0.5"
        }`}
      />
    </button>
  );
}

/** 섹션 머리 */
function Head({ variant, title, lead }: { variant: Variant; title: string; lead: string }) {
  const t = themeOf(variant);
  return (
    <div className="mb-5">
      <h2 className="text-[21px] font-bold tracking-tight">{title}</h2>
      <p className={`mt-2 text-[14px] leading-[1.7] ${t.muted}`}>{lead}</p>
    </div>
  );
}

/** 이름표 + 값 한 줄. 바꿀 수 없는 항목은 오른쪽에 이유를 적는다. */
function Row({
  variant,
  label,
  value,
  note,
  action,
}: {
  variant: Variant;
  label: string;
  value: React.ReactNode;
  note?: string;
  action?: React.ReactNode;
}) {
  const t = themeOf(variant);
  const rule = variant === 1 ? "border-acc-divider" : "border-slate-100";
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 border-b py-4 last:border-b-0 ${rule}`}>
      <span className={`w-28 shrink-0 text-[13.5px] font-semibold ${t.muted}`}>{label}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold">{value}</span>
        {note && <span className={`mt-1 block text-[12.5px] leading-[1.6] ${t.muted}`}>{note}</span>}
      </span>
      {action}
    </div>
  );
}

/* ───────────────────────── 섹션들 ───────────────────────── */

function ProfileSection({ variant, audience }: { variant: Variant; audience: Audience }) {
  const t = themeOf(variant);
  const session = useSession();
  const [linked, setLinked] = useState<string[]>(["카카오"]);
  const rule = variant === 1 ? "border-acc-divider" : "border-slate-100";

  /** 로그인하지 않고 열어 봐도 화면이 비지 않게, 아이디 계정 하나를 예시로 세운다 */
  const loginId = session?.loginId ?? (session?.provider ? null : "genix_kim");
  /** 마지막 하나 남은 로그인 수단은 끊을 수 없다 — 끊으면 계정에 들어올 길이 사라진다 */
  const hasPassword = Boolean(loginId);
  const canUnlink = (id: string) => hasPassword || linked.filter((p) => p !== id).length > 0;

  return (
    <>
      <Head
        variant={variant}
        title="회원정보"
        lead="본인확인으로 받아 온 항목은 바꿀 수 없습니다. 바꾸시려면 휴대폰 본인확인을 다시 하셔야 합니다."
      />

      <section className={`${t.card} px-5 py-1 sm:px-6`}>
        <Row
          variant={variant}
          label="이름"
          value={session?.name ?? "김보호"}
          note="휴대폰 본인확인(NICE아이디)으로 확인된 이름입니다. 화면에서 고칠 수 없습니다."
        />
        <Row variant={variant} label="생년월일" value="1990-01-12" note="본인확인 결과값" />
        <Row
          variant={variant}
          label="휴대폰"
          value="010-1234-5678"
          note="응시 안내와 리포트 발행 알림이 이 번호로 갑니다."
          action={
            <button type="button" className={t.btnQuiet}>
              번호 바꾸기
            </button>
          }
        />
        <Row
          variant={variant}
          label="이메일"
          value={session?.email ?? "genix.kim@example.com"}
          note="연락용입니다. 로그인에는 쓰지 않습니다."
          action={
            <button type="button" className={t.btnQuiet}>
              변경
            </button>
          }
        />
        <Row
          variant={variant}
          label="로그인 아이디"
          value={loginId ?? "—"}
          note={
            hasPassword
              ? "아이디는 바꿀 수 없습니다."
              : "간편 로그인만 쓰고 계십니다. 아이디·비밀번호를 추가하면 두 가지 모두로 들어오실 수 있습니다."
          }
          action={
            hasPassword ? (
              <button type="button" className={t.btnQuiet}>
                비밀번호 변경
              </button>
            ) : (
              <button type="button" className={t.btnQuiet}>
                아이디 추가
              </button>
            )
          }
        />
        {audience === "org" && (
          <Row variant={variant} label="소속" value={session?.org ?? "제닉스 영재교육원"} note="기관 정보에서 바꿉니다." />
        )}
      </section>

      {/* 연결된 계정 — 케이스 C·D(계정 연동)의 결과가 여기에 쌓인다 */}
      <section className={`${t.card} mt-4 overflow-hidden`}>
        <div className={`border-b px-5 py-4 sm:px-6 ${rule}`}>
          <h3 className="text-[16px] font-bold">연결된 간편 로그인</h3>
          <p className={`mt-1 text-[13px] leading-[1.6] ${t.muted}`}>
            본인확인 결과가 같으면 여러 소셜 계정을 하나의 회원으로 묶습니다.
          </p>
        </div>
        <ul className={`divide-y ${variant === 1 ? "divide-acc-hairline" : "divide-slate-100"}`}>
          {socialProviders.map((p) => {
            const on = linked.includes(p.id);
            const blocked = on && !canUnlink(p.id);
            return (
              <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 sm:px-6">
                <span
                  aria-hidden
                  className="h-7 w-7 shrink-0 rounded-full border border-black/10"
                  style={{ background: p.dot }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold">{p.id}</span>
                  <span className={`mt-0.5 block text-[12.5px] ${t.muted}`}>
                    {on
                      ? blocked
                        ? "마지막 남은 로그인 수단이라 해제할 수 없습니다"
                        : "연결됨"
                      : "연결되어 있지 않습니다"}
                  </span>
                </span>
                <button
                  type="button"
                  disabled={blocked}
                  onClick={() =>
                    setLinked((prev) => (on ? prev.filter((x) => x !== p.id) : [...prev, p.id]))
                  }
                  className={`${t.btnQuiet} disabled:cursor-not-allowed disabled:opacity-45`}
                >
                  {on ? "연결 해제" : "연결하기"}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}

function ChildrenSection({ variant }: { variant: Variant }) {
  const t = themeOf(variant);
  const hydrated = useHydrated();
  const all = useRoster();
  const children = all.filter((s) => s.owner === "parent");
  const rule = variant === 1 ? "border-acc-divider" : "border-slate-100";

  return (
    <>
      <Head
        variant={variant}
        title="학생 관리"
        lead="아이마다 접속코드가 하나씩 있습니다. 코드가 새어 나간 것 같으면 바로 다시 발급하세요."
      />

      {!hydrated ? (
        <p className={`${t.card} p-8 text-center text-[14px] ${t.muted}`}>확인 중입니다…</p>
      ) : children.length === 0 ? (
        <div className={`${t.card} p-8 text-center`}>
          <p className="text-[17px] font-bold">아직 등록된 학생이 없습니다</p>
          <p className={`mt-2.5 text-[14px] leading-[1.7] ${t.muted}`}>
            등록은 법정대리인 동의부터 시작합니다.
          </p>
          <Link href="/my/children/consent" className={`${t.btnPrimary} mx-auto mt-6 max-w-xs`}>
            학생 등록 시작하기
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {children.map((s) => {
            const r = progressOf(s);
            const age = ageFromBirth(s.birth);
            const route = consentRouteFor(age);
            const info = route ? consentRouteInfo[route] : null;
            return (
              <li key={s.id} className={`${t.card} p-5`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[17px] font-bold">{s.name}</p>
                    <p className={`mt-1 text-[13px] ${t.muted}`}>
                      {s.grade} · 만 {age ?? "—"}세{info && ` · ${info.who} 동의`}
                    </p>
                  </div>
                  <span
                    className={`flex shrink-0 items-center gap-1.5 text-[13px] ${
                      phaseTone[r.phase].text
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`h-1.5 w-1.5 rounded-full ${phaseTone[r.phase].dot}`}
                    />
                    {r.phase}
                  </span>
                </div>
                <div className={`mt-4 flex flex-wrap items-center gap-3 border-t pt-4 ${rule}`}>
                  <span className="text-[15px] tracking-[0.06em] tabular-nums">
                    {formatCode(s.code)}
                  </span>
                  <button
                    type="button"
                    onClick={() => reissueCode(s.id)}
                    className={t.btnQuiet}
                  >
                    코드 재발급
                  </button>
                  <Link href="/my/children" className={`${t.btnQuiet} sm:ml-auto`}>
                    프로필 수정
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className={`${t.cardSoft} mt-4 p-5`}>
        <p className="text-[14px] font-bold">코드를 다시 발급하면 예전 코드는 즉시 막힙니다</p>
        <p className={`mt-1.5 text-[13px] leading-[1.7] ${t.muted}`}>
          응시 중인 아이의 코드를 바꾸면 그 자리에서 튕겨 나옵니다. 응시가 끝난 뒤에 바꾸시는 편이
          안전합니다.
        </p>
      </div>
    </>
  );
}

function ConsentSection({ variant }: { variant: Variant }) {
  const t = themeOf(variant);
  const rule = variant === 1 ? "border-acc-divider" : "border-slate-100";
  const [off, setOff] = useState<ConsentStageId[]>([]);

  return (
    <>
      <Head
        variant={variant}
        title="동의 관리"
        lead="선택 항목은 언제든 끄실 수 있습니다. 끄시면 그 목적의 처리를 멈추고 해당 데이터를 파기합니다."
      />

      <section className={`${t.card} overflow-hidden`}>
        <ul className={`divide-y ${variant === 1 ? "divide-acc-hairline" : "divide-slate-100"}`}>
          {consentStages.map((c) => {
            const on = c.required || !off.includes(c.id);
            return (
              <li key={c.id} className="flex flex-wrap items-start gap-x-4 gap-y-3 px-5 py-4 sm:px-6">
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-bold">{c.label}</span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11.5px] font-bold ${
                        c.required
                          ? variant === 1
                            ? "border-acc-primary-line bg-acc-primary-soft text-acc-primary"
                            : "border-blue-200 bg-blue-50 text-blue-700"
                          : variant === 1
                            ? "border-acc-line bg-acc-panel text-acc-muted"
                            : "border-slate-200 bg-slate-50 text-slate-500"
                      }`}
                    >
                      {c.required ? "필수" : "선택"}
                    </span>
                  </span>
                  <span className={`mt-1.5 block text-[13px] leading-[1.7] ${t.muted}`}>
                    {c.purpose} · {c.items}
                  </span>
                  <span className={`mt-1 block text-[12.5px] ${t.muted}`}>보유 기간 — {c.keep}</span>
                </span>
                <Toggle
                  variant={variant}
                  on={on}
                  disabled={c.required}
                  label={`${c.label} 동의`}
                  onChange={() =>
                    setOff((prev) => (prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id]))
                  }
                />
              </li>
            );
          })}
        </ul>
        <div className={`border-t px-5 py-4 sm:px-6 ${rule}`}>
          <p className={`text-[13px] leading-[1.7] ${t.muted}`}>
            필수 항목은 여기서 끌 수 없습니다. 끄시려면 탈퇴하셔야 하고, 그 경로는 아래
            「회원 탈퇴」에 있습니다.
          </p>
        </div>
      </section>

      <div className="mt-4 flex flex-wrap gap-2.5">
        <Link href="/my/children/consent-stages" className={t.btnQuiet}>
          동의 이력 보기
        </Link>
        <Link href="/legal/privacy" className={t.btnQuiet}>
          개인정보처리방침
        </Link>
      </div>
    </>
  );
}

function OrgSection({ variant }: { variant: Variant }) {
  const t = themeOf(variant);
  const session = useSession();
  const approved = session?.approved !== false;

  return (
    <>
      <Head
        variant={variant}
        title="기관 정보"
        lead="사업자 정보는 승인 심사에 쓰입니다. 바꾸시면 다시 확인 절차를 거칩니다."
      />

      {!approved && (
        <div
          className={`mb-4 p-5 ${
            variant === 1
              ? "border border-amber-300 bg-amber-50"
              : "rounded-[14px] border border-amber-200 bg-amber-50"
          }`}
        >
          <p className="text-[15px] font-bold text-amber-900">승인 심사 중입니다</p>
          <p className="mt-1.5 text-[13.5px] leading-[1.7] text-amber-900">
            승인 전에는 학생 데이터가 보이지 않고 구성원도 초대할 수 없습니다.
          </p>
        </div>
      )}

      <section className={`${t.card} px-5 py-1 sm:px-6`}>
        <Row variant={variant} label="기관명" value={session?.org ?? "제닉스 영재교육원"} />
        <Row variant={variant} label="기관 유형" value="학원" />
        <Row
          variant={variant}
          label="사업자번호"
          value="123-45-67890"
          note="승인 심사에 쓰입니다. 바꾸시면 재심사가 필요합니다."
          action={
            <button type="button" className={t.btnQuiet}>
              변경 신청
            </button>
          }
        />
        <Row variant={variant} label="주소" value="서울특별시 강남구 테헤란로 000" />
        <Row
          variant={variant}
          label="담당자"
          value={`${session?.name ?? "김담당"} · 010-1234-5678`}
          note="응시권 소진·정산 안내를 받는 사람입니다."
        />
        <Row
          variant={variant}
          label="승인 상태"
          value={approved ? "승인 완료" : "심사 중"}
          note={approved ? "2026-03-02 승인" : "영업일 기준 1~2일 걸립니다."}
        />
      </section>
    </>
  );
}

function MembersSection({ variant }: { variant: Variant }) {
  const t = themeOf(variant);
  const rule = variant === 1 ? "border-acc-divider" : "border-slate-100";

  return (
    <>
      <Head
        variant={variant}
        title="구성원 관리"
        lead="교사는 스스로 가입하지 않습니다. 여기서 초대하면 그 링크로만 계정이 만들어집니다."
      />

      <section className={`${t.card} overflow-hidden`}>
        <div className={`flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 sm:px-6 ${rule}`}>
          <div>
            <h3 className="text-[16px] font-bold">구성원 {demoMembers.length}명</h3>
            <p className={`mt-1 text-[13px] ${t.muted}`}>
              승인 대기 {demoMembers.filter((m) => m.state === "승인 대기").length}명
            </p>
          </div>
          <button type="button" className={t.btnQuiet}>
            교사 초대하기
          </button>
        </div>

        <ul className={`divide-y ${variant === 1 ? "divide-acc-hairline" : "divide-slate-100"}`}>
          {demoMembers.map((m) => {
            const waiting = m.state === "승인 대기";
            return (
              <li key={m.email} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 sm:px-6">
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-bold">
                    {m.name}
                    <span className={`ml-2 text-[13px] font-normal ${t.muted}`}>{m.role}</span>
                  </span>
                  <span className={`mt-0.5 block truncate text-[12.5px] ${t.muted}`}>{m.email}</span>
                </span>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[12px] font-bold ${
                    waiting
                      ? "border-amber-300 bg-amber-50 text-amber-700"
                      : variant === 1
                        ? "border-acc-line bg-acc-panel text-acc-muted"
                        : "border-slate-200 bg-slate-50 text-slate-500"
                  }`}
                >
                  {m.state}
                </span>
                <button type="button" className={t.btnQuiet}>
                  {waiting ? "승인" : "권한 변경"}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <div className={`${t.cardSoft} mt-4 p-5`}>
        <p className="text-[14px] font-bold">교사가 볼 수 있는 범위</p>
        <p className={`mt-1.5 text-[13px] leading-[1.7] ${t.muted}`}>
          교사는 담당 학급의 응시 진척과 관찰 설문만 봅니다. 답안과 결과 리포트는 보호자가 동의한
          범위 밖이라 열리지 않습니다.
        </p>
      </div>
    </>
  );
}

function BillingSection({ variant, audience }: { variant: Variant; audience: Audience }) {
  const t = themeOf(variant);
  const rule = variant === 1 ? "border-acc-divider" : "border-slate-100";

  return (
    <>
      <Head
        variant={variant}
        title="이용권·결제"
        lead="학력진단은 무료 회차로 제공됩니다. 응시권은 재능진단과 심화진단에 씁니다."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { k: "보유 응시권", v: audience === "org" ? "12매" : "1매" },
          { k: "사용", v: audience === "org" ? "28매" : "1매" },
          { k: "다음 회차", v: "26B" },
        ].map((s) => (
          <div key={s.k} className={`${t.card} p-5`}>
            <p className={`text-[13px] font-semibold ${t.muted}`}>{s.k}</p>
            <p className="mt-1.5 text-[24px] font-bold tabular-nums">{s.v}</p>
          </div>
        ))}
      </div>

      <section className={`${t.card} mt-4 overflow-hidden`}>
        <div className={`border-b px-5 py-4 sm:px-6 ${rule}`}>
          <h3 className="text-[16px] font-bold">결제 내역</h3>
          <p className={`mt-1 text-[13px] ${t.muted}`}>화면 설계용 예시입니다.</p>
        </div>
        <ul className={`divide-y ${variant === 1 ? "divide-acc-hairline" : "divide-slate-100"}`}>
          {demoPayments[audience].map((p, i) => (
            <li key={i} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-4 sm:px-6">
              <span className={`w-24 shrink-0 text-[13px] tabular-nums ${t.muted}`}>{p.at}</span>
              <span className="min-w-0 flex-1 text-[14.5px] font-semibold">{p.item}</span>
              <span className={`text-[13px] ${t.muted}`}>{p.method}</span>
              <span className="text-[13px] font-bold">{p.state}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function InquirySection({ variant, audience }: { variant: Variant; audience: Audience }) {
  const t = themeOf(variant);
  const rule = variant === 1 ? "border-acc-divider" : "border-slate-100";
  const rows = demoInquiries[audience];

  return (
    <>
      <Head variant={variant} title="문의 내역" lead="보내신 문의와 답변입니다." />

      <section className={`${t.card} overflow-hidden`}>
        <div className={`flex items-center justify-between gap-3 border-b px-5 py-4 sm:px-6 ${rule}`}>
          <h3 className="text-[16px] font-bold">문의 {rows.length}건</h3>
          <Link href="/support/inquiry" className={t.btnQuiet}>
            새 문의
          </Link>
        </div>
        <ul className={`divide-y ${variant === 1 ? "divide-acc-hairline" : "divide-slate-100"}`}>
          {rows.map((q, i) => (
            <li key={i} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-4 sm:px-6">
              <span className={`w-24 shrink-0 text-[13px] tabular-nums ${t.muted}`}>{q.at}</span>
              <span className="min-w-0 flex-1 text-[14.5px] font-semibold">{q.title}</span>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[12px] font-bold ${
                  q.state === "접수"
                    ? "border-amber-300 bg-amber-50 text-amber-700"
                    : variant === 1
                      ? "border-acc-line bg-acc-panel text-acc-muted"
                      : "border-slate-200 bg-slate-50 text-slate-500"
                }`}
              >
                {q.state}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function NotifySection({ variant }: { variant: Variant }) {
  const t = themeOf(variant);
  const rule = variant === 1 ? "border-acc-divider" : "border-slate-100";
  /** 켜져 있는 조합. "종류|채널" 로 담는다 */
  const [on, setOn] = useState<string[]>([
    "exam|카카오 알림톡",
    "exam|SMS",
    "report|카카오 알림톡",
    "report|이메일",
    "retest|카카오 알림톡",
  ]);
  const toggle = (k: string) =>
    setOn((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));

  return (
    <>
      <Head
        variant={variant}
        title="알림 설정"
        lead="응시 안내와 리포트 발행은 놓치면 회차를 통째로 넘기게 되어 최소 한 곳은 켜 두셔야 합니다."
      />

      <section className={`${t.card} overflow-hidden`}>
        <ul className={`divide-y ${variant === 1 ? "divide-acc-hairline" : "divide-slate-100"}`}>
          {notificationKinds.map((k) => {
            const picked = notificationChannels.filter((c) => on.includes(`${k.id}|${c}`));
            const lastOne = k.required && picked.length === 1;
            return (
              <li key={k.id} className="px-5 py-4 sm:px-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-bold">{k.label}</span>
                  {k.required && (
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11.5px] font-bold ${
                        variant === 1
                          ? "border-acc-primary-line bg-acc-primary-soft text-acc-primary"
                          : "border-blue-200 bg-blue-50 text-blue-700"
                      }`}
                    >
                      최소 1개
                    </span>
                  )}
                </div>
                <p className={`mt-1 text-[13px] ${t.muted}`}>{k.desc}</p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {notificationChannels.map((c) => {
                    const key = `${k.id}|${c}`;
                    const active = on.includes(key);
                    const locked = active && lastOne;
                    return (
                      <button
                        key={c}
                        type="button"
                        aria-pressed={active}
                        disabled={locked}
                        onClick={() => toggle(key)}
                        className={`h-9 px-3.5 text-[13.5px] font-semibold transition-colors disabled:cursor-not-allowed ${
                          variant === 1 ? "rounded border" : "rounded-full border"
                        } ${
                          active
                            ? variant === 1
                              ? "border-acc-primary bg-acc-primary-soft text-acc-primary"
                              : "border-soft-primary bg-soft-primary-soft text-soft-primary"
                            : variant === 1
                              ? "border-acc-field bg-white text-acc-muted hover:bg-acc-panel"
                              : "border-soft-line bg-white text-soft-muted hover:bg-slate-50"
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
        <div className={`border-t px-5 py-4 sm:px-6 ${rule}`}>
          <p className={`text-[13px] leading-[1.7] ${t.muted}`}>
            「이벤트·소식」은 마케팅 수신에 동의하셔야 보냅니다. 동의 여부는 「동의 관리」에서
            바꾸실 수 있습니다.
          </p>
        </div>
      </section>
    </>
  );
}

function LeaveSection({ variant, audience }: { variant: Variant; audience: Audience }) {
  const t = themeOf(variant);
  const [agreed, setAgreed] = useState(false);

  return (
    <>
      <Head
        variant={variant}
        title={audience === "org" ? "기관 탈퇴" : "회원 탈퇴"}
        lead={
          audience === "org"
            ? "탈퇴하면 소속 교사 계정이 함께 비활성화되고 학생 명부는 파기 절차로 넘어갑니다."
            : "탈퇴하면 학생 프로필과 응답 데이터가 파기 절차로 넘어갑니다."
        }
      />

      <section className={`${t.card} p-5 sm:p-6`}>
        <h3 className="text-[16px] font-bold">탈퇴하면 이렇게 됩니다</h3>
        <ul className={`mt-3 flex list-disc flex-col gap-2 pl-5 text-[14px] leading-[1.7] ${t.muted}`}>
          <li>발급된 접속코드가 즉시 막혀 응시 중인 검사는 이어서 볼 수 없습니다.</li>
          <li>이미 발행된 리포트는 열람할 수 없게 됩니다. 필요하시면 탈퇴 전에 내려받으세요.</li>
          <li>
            개인정보는 지체 없이 파기하고 결과를 알려 드립니다. 다만 법령이 보관을 요구하는 기록은
            그 기간 동안 분리 보관합니다.
          </li>
          <li>같은 본인확인 정보로 다시 가입하실 수 있으나, 이전 데이터는 되살아나지 않습니다.</li>
        </ul>

        <label className="mt-5 flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-current"
          />
          <span className="text-[14px] leading-[1.6]">
            위 내용을 확인했고, 데이터가 파기되는 것에 동의합니다.
          </span>
        </label>

        <div className="mt-5 flex flex-wrap gap-2.5">
          <Link href="/my/account/leave" className={`${t.btnQuiet} ${agreed ? "" : "pointer-events-none opacity-45"}`}>
            탈퇴 절차 계속하기
          </Link>
          <Link href="/support/inquiry" className={t.btnQuiet}>
            먼저 문의하기
          </Link>
        </div>
      </section>
    </>
  );
}

/* ───────────────────────── 껍데기 ───────────────────────── */

export default function MyPage({
  variant = 2,
  /** 검토·시안 반출용으로 바깥에서 첫 화면을 지정할 수 있다 (SignupType의 initialStage와 같은 방식) */
  initialSection = "profile",
  initialAudience,
}: {
  variant?: Variant;
  initialSection?: SectionId;
  initialAudience?: Audience;
}) {
  const t = themeOf(variant);
  const session = useSession();
  const hydrated = useHydrated();

  /** 로그인한 역할로 정한다. 교사도 기관 메뉴를 쓴다. */
  const fromSession: Audience =
    session?.role === "director" || session?.role === "teacher" ? "org" : "parent";
  const [override, setOverride] = useState<Audience | null>(initialAudience ?? null);
  const audience = override ?? fromSession;

  const [section, setSection] = useState<SectionId>(initialSection);
  const groups = menus[audience];
  const flat = groups.flatMap((g) => g.items);
  /**
   * 실제로 켜져 있는 항목. 탈퇴는 목록 밖에 따로 있고, 역할을 바꾸면 지금 보던 섹션이
   * 메뉴에서 사라질 수 있다(학생 관리 ↔ 기관 정보). 두 경우 모두 여기서 정리한다.
   */
  const active: SectionId =
    section === "leave" ? "leave" : (flat.find((i) => i.id === section)?.id ?? flat[0].id);

  const rule = variant === 1 ? "border-acc-divider" : "border-slate-100";
  const initial = (session?.name ?? "회원").slice(0, 1);

  return (
    <>
      <h1 className={t.heading}>마이페이지</h1>

          {/* 프로필 카드 — 홈런·콴다 모두 마이페이지 맨 위에 이 한 장을 둔다 */}
          <section
      className={`${t.card} mt-5 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-5 sm:p-6`}
          >
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <span
          aria-hidden
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-[22px] font-bold ${
            variant === 1
              ? "bg-acc-primary-soft text-acc-primary"
              : "bg-soft-primary-soft text-soft-primary"
          }`}
        >
          {hydrated ? initial : "…"}
        </span>

        <div className="min-w-0">
          <p className="text-[19px] font-bold">
            {session?.name ?? "김보호"}
            <span className={`ml-2 text-[14px] font-normal ${t.muted}`}>님</span>
          </p>
          <p
            className={`mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] ${t.muted}`}
          >
            <span
              className={`rounded-full border px-2 py-0.5 text-[12px] font-bold whitespace-nowrap ${
                variant === 1
                  ? "border-acc-primary-line bg-acc-primary-soft text-acc-primary"
                  : "border-blue-200 bg-blue-50 text-blue-700"
              }`}
            >
              {audience === "org" ? "기관 회원" : "학부모 회원"}
            </span>
            <span className="whitespace-nowrap">
              {session?.provider
                ? `${session.provider} 간편 로그인`
                : `아이디 ${session?.loginId ?? "genix_kim"}`}
            </span>
            <span aria-hidden className="hidden sm:inline">
              ·
            </span>
            <span className="whitespace-nowrap">휴대폰 본인확인 완료</span>
          </p>
        </div>
      </div>

      <Link
        href={audience === "org" ? "/org" : "/my"}
        className={`${t.btnQuiet} self-start sm:self-auto`}
      >
        {audience === "org" ? "기관 대시보드" : "학생 현황 보기"}
      </Link>
          </section>

          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:gap-7">
      {/* 좌측 메뉴 — 좁은 화면에서는 가로로 눕힌다 */}
      <nav aria-label="마이페이지 메뉴" className="lg:w-[15rem] lg:shrink-0">
        <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-5 lg:overflow-visible lg:pb-0">
          {groups.map((g) => (
            <li key={g.title} className="contents lg:block">
              <p
                className={`hidden px-1 pb-2 text-[12px] font-bold uppercase tracking-[0.12em] lg:block ${t.muted}`}
              >
                {g.title}
              </p>
              <ul className="contents lg:flex lg:flex-col lg:gap-1">
                {g.items.map((i) => {
                  const on = i.id === active;
                  return (
                    <li key={i.id} className="shrink-0">
                      <button
                        type="button"
                        onClick={() => setSection(i.id)}
                        aria-current={on ? "page" : undefined}
                        /* 좁은 화면에서는 가로 탭이라 밑줄, 넓은 화면에서는 세로 목록이라 왼쪽 막대 */
                        className={`w-full whitespace-nowrap px-4 py-3 text-left text-[14.5px] font-semibold transition-colors lg:whitespace-normal ${
                          variant === 1
                            ? on
                              ? "border-b-[3px] border-acc-primary bg-acc-primary-soft text-acc-primary lg:border-b-0 lg:border-l-[3px]"
                              : "border-b-[3px] border-transparent text-acc-body hover:bg-acc-panel lg:border-b-0 lg:border-l-[3px]"
                            : on
                              ? "rounded-[12px] bg-soft-primary-soft text-soft-primary"
                              : "rounded-[12px] text-soft-muted hover:bg-white"
                        }`}
                      >
                        {i.label}
                        <span
                          className={`mt-0.5 hidden text-[12px] font-normal lg:block ${
                            on ? "opacity-80" : t.muted
                          }`}
                        >
                          {i.desc}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
          <li className="shrink-0 lg:block lg:pt-2">
            <button
              type="button"
              onClick={() => setSection("leave")}
              aria-current={active === "leave" ? "page" : undefined}
              className={`w-full whitespace-nowrap px-4 py-3 text-left text-[13.5px] transition-colors lg:border-t lg:pt-4 ${rule} ${
                active === "leave" ? "font-bold underline" : `${t.muted} hover:underline`
              }`}
            >
              {audience === "org" ? "기관 탈퇴" : "회원 탈퇴"}
            </button>
          </li>
        </ul>
      </nav>

      {/* 우측 본문 */}
      <div className="min-w-0 flex-1">
        {active === "leave" ? (
          <LeaveSection variant={variant} audience={audience} />
        ) : active === "profile" ? (
          <ProfileSection variant={variant} audience={audience} />
        ) : active === "children" ? (
          <ChildrenSection variant={variant} />
        ) : active === "consent" ? (
          <ConsentSection variant={variant} />
        ) : active === "org" ? (
          <OrgSection variant={variant} />
        ) : active === "members" ? (
          <MembersSection variant={variant} />
        ) : active === "billing" ? (
          <BillingSection variant={variant} audience={audience} />
        ) : active === "notify" ? (
          <NotifySection variant={variant} />
        ) : (
          <InquirySection variant={variant} audience={audience} />
        )}
      </div>
          </div>

          {/* 검토용 — 로그인하지 않고도 두 역할을 견줘 볼 수 있게 둔다. 확정되면 지운다. */}
          <div
      className={`mt-8 flex flex-wrap items-center justify-center gap-2 text-[13px] ${t.muted}`}
          >
      <span>역할 미리보기</span>
      {(["parent", "org"] as const).map((a) => (
        <button
          key={a}
          type="button"
          onClick={() => setOverride(a)}
          className={`underline underline-offset-2 ${audience === a ? "font-bold" : ""}`}
        >
          {a === "parent" ? "학부모" : "기관"}
        </button>
        ))}
      </div>
    </>
  );
}
