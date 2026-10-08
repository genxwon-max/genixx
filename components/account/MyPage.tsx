"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut, useSession } from "@/lib/authStore";
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
  | "withdraw"
  | "leave";

type Item = { id: SectionId; label: string; desc: string; path: string };
type Group = { title: string; items: Item[] };

const menus: Record<Audience, Group[]> = {
  parent: [
    {
      title: "내 계정",
      items: [
        {
          id: "profile",
          label: "회원정보",
          desc: "이름·연락처·비밀번호·연결된 계정",
          path: "/mypage/profile",
        },
        { id: "notify", label: "알림 설정", desc: "무엇을 어디로 받을지", path: "/mypage/notify" },
      ],
    },
    {
      title: "학생",
      items: [
        { id: "children", label: "학생 관리", desc: "프로필·접속코드", path: "/mypage/children" },
        { id: "consent", label: "동의 관리", desc: "항목별 동의와 철회", path: "/mypage/consent" },
        {
          id: "withdraw",
          label: "자료 파기 요청",
          desc: "동의 철회와 아이 자료 파기",
          path: "/mypage/withdraw",
        },
      ],
    },
    {
      title: "이용",
      items: [
        {
          id: "billing",
          label: "이용권·결제",
          desc: "보유 응시권과 결제 내역",
          path: "/mypage/billing",
        },
        { id: "inquiry", label: "문의 내역", desc: "보낸 문의와 답변", path: "/mypage/inquiry" },
      ],
    },
  ],
  org: [
    {
      title: "내 계정",
      items: [
        {
          id: "profile",
          label: "회원정보",
          desc: "이름·연락처·비밀번호·연결된 계정",
          path: "/mypage/profile",
        },
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
        {
          id: "billing",
          label: "이용권·결제",
          desc: "보유 응시권과 결제 내역",
          path: "/mypage/billing",
        },
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
  {
    name: "정하람",
    email: "jung@example.ac.kr",
    role: "교사",
    state: "승인 대기",
    at: "2026-08-04",
  },
];

/** 학부모는 아이 수만큼 낱장으로, 기관은 묶음으로 산다 — 결제 수단도 그래서 갈린다 */
const demoPayments: Record<
  Audience,
  { at: string; item: string; method: string; state: string }[]
> = {
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
function Head({ variant, title, lead }: { variant: Variant; title: string; lead?: string }) {
  const t = themeOf(variant);
  return (
    <div className="mb-4">
      <h2 className="text-[20px] font-bold tracking-tight">{title}</h2>
      {lead && <p className={`mt-1.5 text-[14px] leading-[1.7] ${t.muted}`}>{lead}</p>}
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
    <div className={`flex items-center gap-4 border-b py-4 last:border-b-0 ${rule}`}>
      <span className={`w-24 shrink-0 text-[14px] ${t.muted} sm:w-32`}>{label}</span>
      <span className="min-w-0 flex-1">
        <span className="block break-all text-[15.5px] font-semibold">{value}</span>
        {note && (
          <span className={`mt-1 block text-[13px] leading-[1.6] ${t.muted}`}>{note}</span>
        )}
      </span>
      {action}
    </div>
  );
}

/* ───────────────────────── 섹션들 ───────────────────────── */

function ProfileSection({
  variant,
  audience,
  onLeave,
}: {
  variant: Variant;
  audience: Audience;
  onLeave: () => void;
}) {
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
      <Head variant={variant} title="회원정보" />

      <section className={`${t.card} px-5 py-1 sm:px-6`}>
        <Row variant={variant} label="이름" value={session?.name ?? "김보호"} />
        <Row variant={variant} label="생년월일" value="1990-01-12" />
        <Row
          variant={variant}
          label="휴대폰"
          value="010-1234-5678"
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
          note={hasPassword ? undefined : "간편 로그인만 쓰고 계십니다."}
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
          <Row
            variant={variant}
            label="소속"
            value={session?.org ?? "제닉스 영재교육원"}
          />
        )}
      </section>
      <p className={`mt-2 px-1 text-[13px] ${t.muted}`}>
        이름·생년월일은 본인확인 결과라 바꿀 수 없습니다.
      </p>

      {/* 연결된 계정 — 케이스 C·D(계정 연동)의 결과가 여기에 쌓인다 */}
      <section className={`${t.card} mt-4 overflow-hidden`}>
        <div className={`border-b px-5 py-4 sm:px-6 ${rule}`}>
          <h3 className="text-[16px] font-bold">연결된 간편 로그인</h3>
        </div>
        <ul className={`divide-y ${variant === 1 ? "divide-acc-hairline" : "divide-slate-100"}`}>
          {socialProviders.map((p) => {
            const on = linked.includes(p.id);
            const blocked = on && !canUnlink(p.id);
            return (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 sm:px-6"
              >
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

      {/* 탈퇴는 내 정보의 맨 끝에 둔다 — 메뉴에 나란히 세우면 다른 설정과 같은 무게로 읽힌다 */}
      <div className={`mt-10 flex items-center justify-between gap-3 border-t pt-5 ${rule}`}>
        <span className={`text-[13.5px] ${t.muted}`}>더 이상 이용하지 않으시나요?</span>
        <button
          type="button"
          onClick={onLeave}
          className={`text-[13.5px] font-semibold ${t.muted} underline underline-offset-2 hover:text-rose-600`}
        >
          {audience === "org" ? "기관 탈퇴하기" : "회원 탈퇴하기"}
        </button>
      </div>
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
            이름과 생년월일만 있으면 등록됩니다. 동의는 같은 화면에서 받습니다.
          </p>
          <Link href="/my/children/new" className={`${t.btnPrimary} mx-auto mt-6 max-w-xs`}>
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
                      {s.grade ? `${s.grade} · ` : ""}만 {age ?? "—"}세
                      {info && ` · ${info.who} 동의`}
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
                  <button type="button" onClick={() => reissueCode(s.id)} className={t.btnQuiet}>
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
          응시 중인 아이의 코드를 바꾸면 응시 화면에서 바로 로그아웃됩니다. 응시가 끝난 뒤에 바꾸시는 편이
          안전합니다.
        </p>
      </div>
    </>
  );
}

function ConsentSection({ variant, onWithdraw }: { variant: Variant; onWithdraw: () => void }) {
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
              <li
                key={c.id}
                className="flex flex-wrap items-start gap-x-4 gap-y-3 px-5 py-4 sm:px-6"
              >
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
                  {/* 한 줄로 쓰임새만 적는다. 수집 항목과 보관 기간까지 늘어놓으면 기본정보 한
                      항목이 세 줄을 먹는다 — 그 둘은 아래 「동의 이력 보기」 화면에 편다 */}
                  <span className={`mt-1 block text-[13px] leading-[1.6] ${t.muted}`}>
                    {c.purpose}
                  </span>
                </span>
                <Toggle
                  variant={variant}
                  on={on}
                  disabled={c.required}
                  label={`${c.label} 동의`}
                  onChange={() =>
                    setOff((prev) =>
                      prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id],
                    )
                  }
                />
              </li>
            );
          })}
        </ul>
        <div className={`border-t px-5 py-4 sm:px-6 ${rule}`}>
          <p className={`text-[13px] leading-[1.7] ${t.muted}`}>
            필수 항목은 끌 수 없습니다. 철회하시려면 「회원 탈퇴」를 이용해 주세요.
          </p>
        </div>
      </section>

      <div className="mt-4 flex flex-wrap gap-2.5">
        <Link href="/my/children/consent-stages" className={t.btnQuiet}>
          동의 이력 보기
        </Link>
        <button type="button" onClick={onWithdraw} className={t.btnQuiet}>
          자료 파기 요청
        </button>
        <a
          href="/legal/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className={t.btnQuiet}
        >
          개인정보처리방침
        </a>
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
        <div
          className={`flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 sm:px-6 ${rule}`}
        >
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
              <li
                key={m.email}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 sm:px-6"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-bold">
                    {m.name}
                    <span className={`ml-2 text-[13px] font-normal ${t.muted}`}>{m.role}</span>
                  </span>
                  <span className={`mt-0.5 block truncate text-[12.5px] ${t.muted}`}>
                    {m.email}
                  </span>
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
          교사는 담당 학급의 응시 진행 상황과 관찰 설문만 봅니다. 답안과 결과 리포트는 보호자가 동의한
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
        <div
          className={`flex items-center justify-between gap-3 border-b px-5 py-4 sm:px-6 ${rule}`}
        >
          <h3 className="text-[16px] font-bold">문의 {rows.length}건</h3>
          <a href="/support/inquiry" target="_blank" rel="noopener noreferrer" className={t.btnQuiet}>
            새 문의
          </a>
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
  const [saved, setSaved] = useState(false);
  const toggle = (k: string) => {
    setSaved(false);
    setOn((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  };

  return (
    <>
      <Head variant={variant} title="알림 설정" lead="어떤 소식을 어디로 받을지 고르실 수 있습니다." />

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
            「이벤트·소식」은 마케팅 수신에 동의하셔야 보냅니다.
          </p>
        </div>
      </section>

      <div className="mt-4 flex items-center justify-end gap-3">
        {saved && (
          <span role="status" className="text-[13px] font-semibold text-emerald-700">
            저장했습니다
          </span>
        )}
        <button type="button" onClick={() => setSaved(true)} className={t.btnAction}>
          저장하기
        </button>
      </div>
    </>
  );
}

/**
 * 자료 파기 요청 (옛 /my/children/withdraw, ACC-03-4).
 * 따로 떨어진 화면이던 것을 내 정보 안으로 들였다 — 무엇을 지울지 고르고, 한 번 더 묻고,
 * 접수한다. 접수와 동시에 열람이 막히고 파기 결과는 등록한 연락처로 알린다.
 */
function WithdrawSection({ variant }: { variant: Variant }) {
  const t = themeOf(variant);
  const hydrated = useHydrated();
  const children = useRoster().filter((s) => s.owner === "parent");
  const [picked, setPicked] = useState<string[]>([]);
  const [scope, setScope] = useState<"optional" | "all">("all");
  const [asking, setAsking] = useState(false);
  const [done, setDone] = useState(false);
  const rule = variant === 1 ? "border-acc-divider" : "border-slate-100";

  if (done) {
    return (
      <>
        <Head variant={variant} title="자료 파기 요청" />
        <section className={`${t.card} p-6 text-center sm:p-8`}>
          <p className="text-[18px] font-bold">요청을 접수했습니다</p>
          <p className={`mt-2 text-[14px] leading-[1.7] ${t.muted}`}>
            지금부터 전문가·교사의 열람이 막힙니다. 파기가 끝나면 등록하신 연락처로 결과를
            알려 드립니다.
          </p>
          <button
            type="button"
            onClick={() => {
              setDone(false);
              setPicked([]);
            }}
            className={`${t.btnQuiet} mt-5`}
          >
            확인
          </button>
        </section>
      </>
    );
  }

  return (
    <>
      <Head
        variant={variant}
        title="자료 파기 요청"
        lead="동의를 철회하고 아이 자료를 지웁니다. 이유를 적지 않으셔도 됩니다."
      />

      <section className={`${t.card} overflow-hidden`}>
        <div className={`border-b px-5 py-4 sm:px-6 ${rule}`}>
          <h3 className="text-[15px] font-bold">1. 누구의 자료인가요?</h3>
        </div>
        {!hydrated ? (
          <p className={`px-5 py-6 text-[14px] sm:px-6 ${t.muted}`}>확인 중입니다…</p>
        ) : children.length === 0 ? (
          <p className={`px-5 py-6 text-[14px] sm:px-6 ${t.muted}`}>등록된 학생이 없습니다.</p>
        ) : (
          <ul className="flex flex-wrap gap-2 px-5 py-4 sm:px-6">
            {children.map((s) => {
              const on = picked.includes(s.id);
              return (
                <li key={s.id}>
                  <label
                    className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-[14px] font-semibold ${
                      on
                        ? "border-soft-primary bg-soft-primary-soft text-soft-primary"
                        : "border-soft-line bg-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() =>
                        setPicked((prev) =>
                          on ? prev.filter((x) => x !== s.id) : [...prev, s.id],
                        )
                      }
                      className="h-4 w-4 accent-[#365eef]"
                    />
                    {s.name}
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        <div className={`border-t px-5 py-4 sm:px-6 ${rule}`}>
          <h3 className="text-[15px] font-bold">2. 무엇을 지울까요?</h3>
          <div className="mt-3 flex flex-col gap-2">
            {(
              [
                ["optional", "선택 동의만 철회", "연구·마케팅 동의를 철회하고 그 목적의 자료만 지웁니다."],
                ["all", "모든 자료 파기", "답안·설문·녹취·리포트를 모두 지웁니다. 되살릴 수 없습니다."],
              ] as const
            ).map(([id, label, desc]) => (
              <label
                key={id}
                className={`flex cursor-pointer items-start gap-3 rounded-[12px] border p-4 ${
                  scope === id ? "border-soft-primary bg-soft-primary-soft" : "border-soft-line"
                }`}
              >
                <input
                  type="radio"
                  name="withdraw-scope"
                  checked={scope === id}
                  onChange={() => setScope(id)}
                  className="mt-1 h-4 w-4 accent-[#365eef]"
                />
                <span>
                  <span className="block text-[14.5px] font-bold">{label}</span>
                  <span className={`mt-0.5 block text-[13px] ${t.muted}`}>{desc}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          disabled={picked.length === 0}
          onClick={() => setAsking(true)}
          className={`${t.btnAction} disabled:cursor-not-allowed disabled:opacity-45`}
        >
          파기 요청하기
        </button>
      </div>

      {asking && (
        <Confirm
          variant={variant}
          title="자료 파기를 요청할까요?"
          body={
            scope === "all"
              ? "선택한 아이의 모든 자료가 지워지고 되살릴 수 없습니다."
              : "선택 동의가 철회되고 그 목적의 자료가 지워집니다."
          }
          onNo={() => setAsking(false)}
          onYes={() => {
            setAsking(false);
            setDone(true);
          }}
        />
      )}
    </>
  );
}

/** 예 / 아니오 확인 창 */
function Confirm({
  variant,
  title,
  body,
  onYes,
  onNo,
  danger,
}: {
  variant: Variant;
  title: string;
  body: string;
  onYes: () => void;
  onNo: () => void;
  danger?: boolean;
}) {
  const t = themeOf(variant);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onNo}
    >
      <div
        className="w-full max-w-sm rounded-[16px] bg-white p-6 text-center shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p id="confirm-title" className="text-[17px] font-bold text-soft-ink">
          {title}
        </p>
        <p className={`mt-2 text-[14px] leading-[1.7] ${t.muted}`}>{body}</p>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button type="button" onClick={onNo} className={`${t.btnQuiet} w-full`}>
            아니오
          </button>
          <button
            type="button"
            onClick={onYes}
            className={`inline-flex h-[3rem] w-full items-center justify-center rounded-full text-[15px] font-semibold text-white ${
              danger ? "bg-rose-600 hover:bg-rose-700" : "bg-soft-primary hover:bg-soft-primary-dark"
            }`}
          >
            예
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 회원 탈퇴 (옛 /my/account/leave, ACC-04-2).
 * 내 정보 맨 끝 「탈퇴하기」 → 이 화면(정말 탈퇴하시겠어요?) → 「탈퇴하기」 → 예/아니오 → 탈퇴.
 */
function LeaveSection({
  variant,
  audience,
  onCancel,
}: {
  variant: Variant;
  audience: Audience;
  onCancel: () => void;
}) {
  const t = themeOf(variant);
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [done, setDone] = useState(false);
  const what = audience === "org" ? "기관 탈퇴" : "회원 탈퇴";

  if (done) {
    return (
      <section className={`${t.card} p-6 text-center sm:p-8`}>
        <p className="text-[18px] font-bold">탈퇴가 완료되었습니다</p>
        <p className={`mt-2 text-[14px] leading-[1.7] ${t.muted}`}>
          그동안 이용해 주셔서 감사합니다. 파기 결과는 등록하신 연락처로 알려 드립니다.
        </p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className={`${t.btnAction} mt-5`}
        >
          홈으로
        </button>
      </section>
    );
  }

  return (
    <>
      <Head variant={variant} title="정말 탈퇴하시겠어요?" />

      <section className={`${t.card} p-5 sm:p-6`}>
        <h3 className="text-[16px] font-bold">탈퇴하면 이렇게 됩니다</h3>
        <ul
          className={`mt-3 flex list-disc flex-col gap-2 pl-5 text-[14px] leading-[1.7] ${t.muted}`}
        >
          <li>발급된 접속코드가 즉시 막혀 응시 중인 진단은 이어서 볼 수 없습니다.</li>
          <li>이미 발행된 리포트는 열람할 수 없게 됩니다. 필요하시면 탈퇴 전에 내려받으세요.</li>
          <li>
            개인정보는 지체 없이 파기하고 결과를 알려 드립니다. 다만 법령이 보관을 요구하는 기록은
            그 기간 동안 분리 보관합니다.
          </li>
          <li>같은 본인확인 정보로 다시 가입하실 수 있으나, 이전 데이터는 되살아나지 않습니다.</li>
        </ul>

      </section>

      <div className="mt-4 flex flex-wrap justify-end gap-2.5">
        <button type="button" onClick={onCancel} className={t.btnQuiet}>
          취소
        </button>
        <button
          type="button"
          onClick={() => setAsking(true)}
          className="inline-flex h-[3rem] items-center justify-center rounded-full bg-rose-600 px-6 text-[15px] font-semibold text-white transition-colors hover:bg-rose-700"
        >
          탈퇴하기
        </button>
      </div>

      {asking && (
        <Confirm
          variant={variant}
          danger
          title={`${what}하시겠습니까?`}
          body="탈퇴하면 되돌릴 수 없습니다."
          onNo={() => setAsking(false)}
          onYes={() => {
            setAsking(false);
            setDone(true);
            /* 예를 누른 순간 로그아웃한다 — 완료 화면에서 다른 곳으로 나가도 계정이 살아 있지 않게 */
            signOut();
          }}
        />
      )}
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

  const initial = (session?.name ?? "회원").slice(0, 1);

  return (
    <>
      <h1 className="text-[24px] font-bold tracking-tight text-soft-ink">마이페이지</h1>

      {/* 프로필 카드 — 홈런·콴다 모두 마이페이지 맨 위에 이 한 장을 둔다 */}
      <section
        className={`${t.card} mt-4 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-5 sm:p-6`}
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

      <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:gap-8">
        {/* 좌측 메뉴 — 좁은 화면에서는 가로로 눕힌다. 항목 밑 설명 줄은 걷었다 —
            메뉴 한 칸에 두 줄씩 서니 무엇을 눌러야 할지보다 글이 먼저 읽혔다 */}
        <nav aria-label="마이페이지 메뉴" className="lg:w-[12.5rem] lg:shrink-0">
          <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-5 lg:overflow-visible lg:pb-0">
            {groups.map((g) => (
              <li key={g.title} className="contents lg:block">
                <p
                  className={`hidden px-4 pb-1.5 text-[12.5px] font-semibold lg:block ${t.muted}`}
                >
                  {g.title}
                </p>
                <ul className="contents lg:flex lg:flex-col lg:gap-1">
                  {g.items.map((i) => {
                    /* 탈퇴는 회원정보 맨 끝에서 들어가는 칸이라 그동안 회원정보를 켜 둔다 */
                    const on = i.id === (active === "leave" ? "profile" : active);
                    return (
                      <li key={i.id} className="shrink-0">
                        <button
                          type="button"
                          onClick={() => setSection(i.id)}
                          aria-current={on ? "page" : undefined}
                          /* 좁은 화면에서는 가로 탭이라 밑줄, 넓은 화면에서는 세로 목록이라 왼쪽 막대 */
                          className={`w-full whitespace-nowrap px-4 py-2.5 text-left text-[15px] font-semibold transition-colors lg:whitespace-normal ${
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
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </nav>

        {/* 우측 본문 */}
        <div className="min-w-0 flex-1">
          {active === "leave" ? (
            <LeaveSection
              variant={variant}
              audience={audience}
              onCancel={() => setSection("profile")}
            />
          ) : active === "profile" ? (
            <ProfileSection
              variant={variant}
              audience={audience}
              onLeave={() => setSection("leave")}
            />
          ) : active === "children" ? (
            <ChildrenSection variant={variant} />
          ) : active === "consent" ? (
            <ConsentSection variant={variant} onWithdraw={() => setSection("withdraw")} />
          ) : active === "withdraw" ? (
            <WithdrawSection variant={variant} />
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
