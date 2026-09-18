"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signupTypeOf } from "@/lib/account";
import { useHydrated } from "@/lib/examStore";
import { clearSignupDraft, getSignupDraft } from "@/lib/signupStore";
import { themeOf } from "@/lib/authVariant";

/**
 * ACC-01-3 가입 완료 — 학부모·법정대리인 경로의 마지막 화면.
 *
 * **가입과 로그인은 다른 일이다.** 예전에는 「가입하기」를 누른 순간 세션까지 만들어
 * 회원 화면으로 밀어 넣었는데, 그러면 방금 정한 아이디와 비밀번호를 한 번도 써 보지
 * 않은 채로 서비스에 들어간다. 다음에 혼자 돌아올 때 쓸 열쇠를 시험해 보지 못하는
 * 것이다. 그래서 여기서 멈추고 **묻는다** — 지금 로그인하시겠습니까.
 * (세션을 만들지 않는 쪽은 components/account/SignupFlow.tsx의 join()이다.)
 *
 * 화면에 세우는 것은 셋뿐이다.
 *   ① 무엇이 끝났는지 — 완료 표시와 방금 만든 계정의 요약
 *   ② 지금 무엇을 할지 — 로그인 / 나중에
 *   ③ 로그인한 뒤에 무엇이 기다리는지 — 자녀 등록 → 접속코드 → 응시
 *
 * ⚠ **결제 단계는 여기 없다.** 2026 파일럿 회차 응시권은 0원이고(components/account/
 *   PaymentForm.tsx의 products, app/(site)/service/pricing), 결제 화면은
 *   응시권을 고르는 PAY-03(/exam/payment)에 따로 있다. 학부모 메뉴에는 응시권 항목
 *   자체가 없다(components/account/DashShell.tsx parentMenu). 가입 직후에 결제를
 *   붙이면 무료라고 공지한 회차에 없는 관문을 세우는 셈이라, 대신 「받지 않는다」고
 *   적어 둔다 — 묻지 않는 것보다 묻지 않겠다고 말하는 편이 낫다.
 *
 * 다음 단계는 **누를 수 없는 안내로** 둔다. 아직 로그인 전이라 /my/children/new로
 * 보내 봐야 빈손으로 돌아온다.
 */

/** 시안 2「둥글둥글」로 확정했다. 가입 화면은 이 톤 하나만 쓴다. */
const t = themeOf(2);

/** 본인확인이 돌려준 번호는 앞뒤만 남긴다. 확인용이지 열람용이 아니다 */
function maskPhone(raw: string) {
  const d = raw.replace(/\D/g, "");
  if (d.length < 10) return "";
  return `${d.slice(0, 3)}-****-${d.slice(-4)}`;
}

function ymd(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}. ${p(d.getMonth() + 1)}. ${p(d.getDate())}`;
}

/** 로그인한 뒤에 이어지는 길. 순서를 보여 줄 뿐 여기서 누르지는 않는다 */
const afterLogin = [
  {
    title: "자녀 등록",
    desc: "이름과 생년월일을 넣고 법정대리인 동의를 확인합니다. 학교·학년은 나중에 채우셔도 됩니다.",
  },
  {
    title: "접속코드 발급",
    desc: "자녀마다 8자리 접속코드가 나옵니다. 아이에게 건네주는 열쇠입니다.",
  },
  {
    title: "무료 학력진단 응시",
    desc: "접속코드와 생년월일을 넣으면 아이가 응시 화면으로 들어갑니다.",
  },
];

/** 라벨 / 값 한 줄 */
function InfoRow({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-soft-line/70 py-3 last:border-b-0">
      <dt className={`shrink-0 text-[13px] font-semibold ${t.muted}`}>{k}</dt>
      <dd className="min-w-0 truncate text-right text-[14px] font-semibold text-soft-ink">{v}</dd>
    </div>
  );
}

export default function SignupDone() {
  const router = useRouter();
  const hydrated = useHydrated();
  const [joinedAt] = useState(() => new Date());

  /**
   * 가입 임시값은 여기서 **한 번만 읽고 손에 쥔다.** 구독하지 않는 이유가 있다 —
   * 이 화면을 떠날 때 저장소를 비우는데(이름·휴대폰·생년월일이 브라우저에 남을
   * 이유가 없다), 구독하고 있으면 비우는 순간 화면이 같이 지워진다.
   */
  const [draft] = useState(() => getSignupDraft());
  const info = draft.type ? draft : null;

  const leave = (href: string) => {
    clearSignupDraft();
    router.push(href);
  };

  if (!hydrated) {
    return <p className={`container-x py-20 text-center text-[14px] ${t.muted}`}>확인 중입니다…</p>;
  }

  const type = info ? signupTypeOf(info.type) : null;
  const social = Boolean(info?.provider);
  /**
   * 간편 가입은 제공자 버튼이 있는 기본 화면으로, 아이디 가입은 아이디 폼을 펼친
   * 채로 보낸다. 어느 쪽으로 가입했는지 모르는 채 들어온 사람은 기본 화면으로 둔다.
   */
  const loginHref = info && !social ? "/login?view=id" : "/login";
  const phone = info ? maskPhone(info.phone) : "";

  return (
    <div className={`min-h-full ${t.page}`}>
      <div className="container-x pt-11 pb-20">
        <p className={t.crumb}>홈 &gt; 회원가입 &gt; 가입 완료</p>

        <div className={`mt-7 ${t.column} flex flex-col gap-5`}>
          {/* ① 끝났다는 것과, 방금 만든 계정 */}
          <section className={`${t.card} p-7 sm:p-9`}>
            <div className="text-center">
              <span
                aria-hidden
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-[24px] text-emerald-600"
              >
                ✓
              </span>
              <h1 className="mt-5 text-[24px] font-extrabold tracking-tight">
                가입이 완료되었습니다
              </h1>
              <p className={`mt-3 text-[14px] leading-[1.7] ${t.muted}`}>
                {info?.name ? `${info.name}님, ` : ""}
                GENIXX 회원이 되셨습니다. 아직 로그인 전입니다.
              </p>
            </div>

            {info && (
              <dl className="mt-6 rounded-[12px] bg-slate-50 px-5 py-1.5">
                <InfoRow k="회원 유형" v={type?.label ?? "-"} />
                <InfoRow
                  k={social ? "이메일" : "아이디"}
                  v={(social ? info.email : info.loginId) || "-"}
                />
                <InfoRow
                  k="가입 수단"
                  v={info.provider ? `${info.provider} 간편가입` : "아이디 가입"}
                />
                {phone && <InfoRow k="본인확인" v={`${phone} 인증 완료`} />}
                <InfoRow k="가입일" v={ymd(joinedAt)} />
              </dl>
            )}

            <div className="mt-7 border-t border-soft-line pt-6">
              <p className="text-center text-[16px] font-bold">지금 로그인하시겠습니까?</p>
              <p className={`mt-2 text-center text-[13px] leading-[1.7] ${t.muted}`}>
                {!info
                  ? "가입하신 계정으로 로그인해 주세요."
                  : social
                    ? `가입에 쓰신 ${info.provider} 계정으로 그대로 들어가시면 됩니다.`
                    : "방금 만드신 아이디와 비밀번호로 처음 로그인해 보세요."}
              </p>
              <div className="mt-5 flex flex-col gap-2.5">
                <button type="button" onClick={() => leave(loginHref)} className={t.btnPrimary}>
                  로그인하기
                </button>
                <button type="button" onClick={() => leave("/")} className={t.btnNeutral}>
                  나중에 하기
                </button>
              </div>
            </div>
          </section>

          {/* ② 로그인한 뒤에 기다리는 것 */}
          <section className={`${t.card} p-6 sm:p-7`}>
            <h2 className="text-[16px] font-bold">로그인하면 이어지는 순서</h2>
            <ol className="mt-4 flex flex-col gap-4">
              {afterLogin.map((s, i) => (
                <li key={s.title} className="flex gap-3.5">
                  <span
                    aria-hidden
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-soft-primary-soft text-[13px] font-black text-soft-primary"
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14.5px] font-bold">{s.title}</span>
                    <span className={`mt-1 block text-[13px] leading-[1.7] ${t.muted}`}>
                      {s.desc}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
            <p
              className={`mt-5 border-t border-soft-line pt-4 text-[12.5px] leading-[1.7] ${t.muted}`}
            >
              가입 단계에서는 아이 정보를 받지 않았습니다. 자녀를 등록하실 때, 그때 필요한 항목만
              단계적으로 여쭤봅니다.
            </p>
          </section>

          {/* ③ 결제 — 받지 않는다고 적어 두는 자리 */}
          <section className={`${t.cardSoft} p-6`}>
            <h2 className="text-[15px] font-bold text-soft-primary-dark">
              2026 파일럿 회차는 전면 무료입니다
            </h2>
            <p className="mt-2 text-[13px] leading-[1.8] text-soft-ink">
              가입과 응시에 결제 정보를 받지 않습니다. 카드번호나 계좌를 요구하는 안내를 받으셨다면
              저희가 보낸 것이 아닙니다. 정식 서비스 요금은 파일럿이 끝난 뒤 요금 안내에 올립니다.
            </p>
            <Link
              href="/service/pricing"
              className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-soft-primary hover:underline"
            >
              요금 안내 보기 <span aria-hidden>→</span>
            </Link>
          </section>

          <p className={`text-center text-[13px] ${t.muted}`}>
            가입 확인이 어려우시면{" "}
            <Link href="/support/inquiry" className="font-semibold hover:underline">
              고객지원
            </Link>
            으로 문의해 주세요.
          </p>
        </div>
      </div>
    </div>
  );
}
