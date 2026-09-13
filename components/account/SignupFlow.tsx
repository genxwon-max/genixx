"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ageFromBirth,
  CONSENT_AGE,
  MAJORITY_AGE,
  purposeConsents,
  signupTypeOf,
  type PurposeConsent,
} from "@/lib/account";
import { patchSignupDraft, useSignupDraft } from "@/lib/signupStore";
import { useHydrated } from "@/lib/examStore";
import { signIn } from "@/lib/authStore";
import { addStudents } from "@/lib/roster";
import { themeOf } from "@/lib/authVariant";

/**
 * ACC-01 회원가입 정보 입력 — 둥글둥글(시안 2). 한 장짜리 화면이다.
 *
 * 계정 확인은 앞에서 이미 끝나 있다. 간편 가입이면 제공자 화면에서, 아이디 가입이면
 * 이 화면에서 아이디를 직접 만든다. 그래서 단계 표시를 두지 않는다.
 *
 *   간편 가입 — 이메일(읽기 전용) · 이름 · 휴대폰 본인인증 · 약관
 *   아이디 가입 — 아이디 · 비밀번호 · 비밀번호 확인 · 이름 · 휴대폰 본인인증 · 약관
 *
 * 역할(학생·학부모·기관 담당자)은 묻지 않는다. 앞 화면(/signup/type)에서 이미 골랐다.
 * 그 자리에 **휴대폰 본인인증**이 들어간다.
 *
 * 본인인증은 **NICE아이디 휴대폰본인확인**으로 넘긴다. 주민등록번호는 우리 화면을
 * 지나가지 않고, 인증이 끝나면 확인된 휴대폰 번호와 생년월일만 돌려받아 저장한다
 * (개인정보보호법 제24조의2).
 * **만 나이 판정도 이 값으로 한다.** 스스로 고르게 하지 않는다.
 *
 * 나이는 두 군데서 갈린다 —
 *   · 학생이 만 14세 미만이면 **단독 가입을 여기서 멈추고** 법정대리인 동의 경로로 잇는다.
 *     "가입 불가"가 아니다. 앞 화면의 연령 확인을 지나왔더라도, 본인확인이 돌려준 값이
 *     최종 판정이므로 여기서 한 번 더 본다.
 *   · 학부모·법정대리인과 기관 담당자는 성년(만 19세)이어야 한다. 법정대리인 동의를 할
 *     사람이 미성년자일 수는 없기 때문이다.
 *
 * ⚠ 비밀번호는 화면 상태에만 두고 어디에도 저장하지 않는다 (인증 서버가 없는 시안이다).
 */

/** 시안 2「둥글둥글」로 확정했다. 가입 화면은 이 톤 하나만 쓴다. */
const t = themeOf(2);

const idRe = /^[a-z][a-z0-9_]{3,19}$/;

/**
 * 이미 쓰이고 있는 아이디 — 중복 확인이 실제로 걸리는 것을 보여 주려고 둔다.
 * 실제 연동에서는 서버에 물어본다.
 */
const takenIds = ["admin", "genixx", "genix", "parent", "teacher", "test", "master"];

/** 본인확인기관이 돌려줬다고 가정하는 값 — 시연에서 두 갈래를 다 볼 수 있게 둔다 */
type PassResult = { birth: string; phone: string };
const passDemo: { key: "adult" | "teen" | "child"; label: string; result: PassResult }[] = [
  { key: "adult", label: "성인", result: { birth: "19900112", phone: "01012345678" } },
  { key: "teen", label: "만 16세", result: { birth: "20090820", phone: "01055556666" } },
  { key: "child", label: "만 13세", result: { birth: "20130320", phone: "01098761234" } },
];

/** 간편 가입 제공자 표식 */
const providerMark: Record<string, { bg: string; fg: string; ch: string }> = {
  카카오: { bg: "bg-[#FEE500]", fg: "text-[#191600]", ch: "K" },
  네이버: { bg: "bg-[#03C75A]", fg: "text-white", ch: "N" },
  구글: { bg: "bg-white ring-1 ring-slate-200", fg: "text-[#4285F4]", ch: "G" },
};

/* ── 조각 ── */

/**
 * 제목 아래에 놓이는 단계 표식.
 * 이 화면은 한 장이라 칸이 하나뿐이지만, 지금 무엇을 하는 자리인지 이름을 붙여 둔다.
 */
function StepMark() {
  return (
    <div className="mt-5 flex flex-col items-center gap-2">
      <span
        aria-hidden
        className="flex h-12 w-12 items-center justify-center rounded-full bg-soft-primary text-white ring-4 ring-soft-primary-soft"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-[22px] w-[22px]">
          <path
            d="M4 20h4L19 9a2.5 2.5 0 0 0-3.5-3.5L4.5 16.5 4 20Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="text-[13px] font-bold text-soft-primary">정보 입력</span>
    </div>
  );
}

/** 라벨 + 입력 + 도움말/오류 */
function Row({
  id,
  label,
  hint,
  error,
  ok,
  children,
}: {
  id: string;
  label: string;
  hint?: React.ReactNode;
  error?: string;
  /** 통과했음을 알리는 초록 한 줄 */
  ok?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={`text-[14px] font-semibold ${t.muted}`}>
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className={`text-[13px] font-semibold ${t.required}`}>
          {error}
        </p>
      ) : ok ? (
        <p className="text-[13px] font-semibold text-emerald-600">✓ {ok}</p>
      ) : (
        hint && <p className={`text-[13px] leading-[1.6] ${t.muted}`}>{hint}</p>
      )}
    </div>
  );
}

/** 오른쪽에 붙는 네모 체크박스 */
function RightCheck({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1">
      <span className="text-[14px] leading-[1.6]">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span
        aria-hidden
        className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] text-[12px] font-black transition-colors ${
          checked
            ? "bg-soft-primary text-white"
            : "border border-soft-line bg-white text-transparent"
        }`}
      >
        ✓
      </span>
    </label>
  );
}

/* ── 본체 ── */

export default function SignupFlow() {
  const router = useRouter();
  const hydrated = useHydrated();
  const draft = useSignupDraft();

  const social = Boolean(draft.provider);

  /* 아이디 가입에서만 쓰는 값 */
  const [loginId, setLoginId] = useState("");
  /** 중복 확인 결과 — 아직 안 눌렀으면 none */
  const [idStatus, setIdStatus] = useState<"none" | "ok" | "taken">("none");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  const [name, setName] = useState("");

  /* 휴대폰 본인인증 (PASS) */
  const [passState, setPassState] = useState<"idle" | "opening" | "done">("idle");
  const [pass, setPass] = useState<PassResult | null>(null);

  const [agreed, setAgreed] = useState<string[]>([]);
  const [openBody, setOpenBody] = useState<string | null>(null);
  const [tried, setTried] = useState(false);

  if (!hydrated) {
    return <p className={`container-x py-20 text-center text-[14px] ${t.muted}`}>확인 중입니다…</p>;
  }

  if (!draft.type) {
    return (
      <div className={`min-h-full ${t.page}`}>
        <div className="container-x py-20 text-center">
          <p className="text-[16px] font-bold">회원 유형을 먼저 골라 주세요.</p>
          <Link href="/signup/type" className={`${t.btnQuiet} mt-5`}>
            유형 선택으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const type = signupTypeOf(draft.type);
  const mark = draft.provider ? providerMark[draft.provider] : null;

  /* ── 통과 조건 ── */
  const idOk = idRe.test(loginId);
  const pwKinds = [/[A-Z]/, /[a-z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(pw)).length;
  const pwOk = pw.length >= 8 && pwKinds >= 2;
  const pw2Ok = pw.length > 0 && pw === pw2;
  const nameOk = name.trim().length >= 2;

  const isStudent = draft.type === "student";
  const age = pass ? ageFromBirth(pass.birth) : null;
  /** 학생이 만 14세 미만 — 단독으로 가입을 끝낼 수 없다 */
  const needsGuardian = isStudent && age !== null && age < CONSENT_AGE;
  /** 학부모·기관은 성년이어야 한다 */
  const needsAdult = !isStudent && age !== null && age < MAJORITY_AGE;
  /** 만 14세 이상이지만 아직 미성년 — 가입은 되고 결제만 갈린다 */
  const minorContract = isStudent && age !== null && age >= CONSENT_AGE && age < MAJORITY_AGE;
  const blocked = needsGuardian || needsAdult;
  const phoneVerified = passState === "done" && pass !== null && !blocked;

  const requiredIds = purposeConsents.filter((c) => c.required).map((c) => c.id);
  const termsOk = requiredIds.every((id) => agreed.includes(id));
  const allOn = agreed.length === purposeConsents.length;

  const idAvailable = idStatus === "ok";
  const ready =
    (social || (idOk && idAvailable && pwOk && pw2Ok)) && nameOk && phoneVerified && termsOk;

  const toggle = (id: string) =>
    setAgreed((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const finishPass = (r: PassResult) => {
    setPass(r);
    setPassState("done");
  };

  const join = () => {
    setTried(true);
    if (!ready || !pass) return;
    // 비밀번호는 담지 않는다 — 이 프로젝트에는 인증 서버가 없다
    patchSignupDraft({
      name: name.trim(),
      // PASS가 확인해 돌려준 값을 그대로 저장한다
      phone: pass.phone,
      birth: pass.birth,
      loginId: social ? "" : loginId,
      consents: agreed,
      verified: true,
    });

    // 만 14세 이상 학생은 자기 이름으로 프로필을 갖는다. 보호자 계정 하위가 아니라
    // owner "self"로 명부에 오르고, 동의 상태는 「학생 본인 가입 완료」에서 시작한다.
    if (isStudent) {
      const [created] = addStudents(
        [{ name: name.trim(), birth: pass.birth }],
        "self",
        name.trim(),
      );
      signIn({
        role: "student",
        name: name.trim(),
        provider: draft.provider,
        email: draft.email || undefined,
        loginId: social ? undefined : loginId,
        studentId: created.id,
        approved: true,
      });
      router.push(type.next);
      return;
    }

    // 학부모는 여기서 세션을 만들지 않는다. 가입과 로그인은 다른 일이고, 방금 정한
    // 아이디·비밀번호를 한 번은 써 봐야 다음에 혼자 돌아올 수 있다. 가입 완료
    // 화면(/signup/done)이 로그인할지 묻는다.
    //
    // 학생은 위에서 이미 갈라져 나갔고(응시로 곧장 이어져야 한다), 교사·기관은
    // 승인 대기 화면이 자기 신청 상태를 보여 주는 자리라 세션이 있어야 한다.
    if (draft.type !== "parent") {
      signIn({
        role: draft.type === "teacher" ? "teacher" : "director",
        name: name.trim(),
        provider: draft.provider,
        email: draft.email || undefined,
        loginId: social ? undefined : loginId,
        approved: !type.needsApproval,
      });
    }
    router.push(type.needsApproval ? "/my/pending" : type.next);
  };

  return (
    <div className={`min-h-full ${t.page}`}>
      <div className="container-x py-10 pb-16">
        <div className={`mx-auto w-full max-w-[30rem] ${t.card} rounded-[18px] p-7 sm:p-9`}>
          <h1 className="text-center text-[26px] font-extrabold tracking-tight">회원가입</h1>
          <StepMark />

          <div className="mt-8 flex flex-col gap-6">
            {/* 계정 — 간편 가입은 읽기 전용, 아이디 가입은 직접 만든다 */}
            {social ? (
              <Row id="email" label="이메일" ok="계정이 인증되었습니다.">
                <div className="relative">
                  <input
                    id="email"
                    readOnly
                    value={draft.email || ""}
                    className={`${t.field} bg-slate-50 pr-12 text-slate-500`}
                  />
                  {mark && (
                    <span
                      aria-hidden
                      className={`absolute right-3.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-[8px] text-[13px] font-black ${mark.bg} ${mark.fg}`}
                    >
                      {mark.ch}
                    </span>
                  )}
                </div>
              </Row>
            ) : (
              <>
                <Row
                  id="loginId"
                  label="아이디"
                  error={
                    idStatus === "taken"
                      ? "이미 사용 중인 아이디입니다. 다른 아이디를 입력해 주세요."
                      : tried && !idOk
                        ? "영문 소문자로 시작하는 4~20자(영문 소문자·숫자·_)로 만들어 주세요."
                        : tried && !idAvailable
                          ? "중복 확인을 눌러 주세요."
                          : undefined
                  }
                  ok={idAvailable ? "사용할 수 있는 아이디입니다." : undefined}
                  hint="로그인할 때 쓰는 아이디입니다. 나중에 바꿀 수 없습니다."
                >
                  <div className="flex gap-2">
                    <input
                      id="loginId"
                      autoComplete="username"
                      value={loginId}
                      onChange={(e) => {
                        setLoginId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""));
                        // 아이디를 고치면 확인 결과를 지운다 — 확인한 값과 낼 값이 어긋나지 않도록
                        setIdStatus("none");
                      }}
                      placeholder="genix_parent"
                      className={`${t.field} ${idAvailable ? "bg-soft-primary-soft" : ""}`}
                    />
                    <button
                      type="button"
                      disabled={!idOk}
                      onClick={() => setIdStatus(takenIds.includes(loginId) ? "taken" : "ok")}
                      className={`${t.btnQuiet} shrink-0 disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      중복 확인
                    </button>
                  </div>
                </Row>

                <Row
                  id="pw"
                  label="비밀번호"
                  error={tried && !pwOk ? "조건을 채워 주세요." : undefined}
                  hint={
                    <>
                      최소 8자
                      <br />
                      영문 대문자, 소문자, 숫자, 기호 중 2가지 이상
                    </>
                  }
                >
                  <div className="relative">
                    <input
                      id="pw"
                      type={showPw ? "text" : "password"}
                      autoComplete="new-password"
                      value={pw}
                      onChange={(e) => setPw(e.target.value)}
                      placeholder="비밀번호를 입력하세요."
                      className={`${t.field} pr-12`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 보기"}
                      className={`absolute right-4 top-1/2 -translate-y-1/2 text-[15px] ${t.muted}`}
                    >
                      {showPw ? "🙈" : "👁"}
                    </button>
                  </div>
                </Row>

                <Row
                  id="pw2"
                  label="비밀번호 확인"
                  error={tried && !pw2Ok ? "비밀번호가 서로 다릅니다." : undefined}
                  ok={pw2Ok ? "비밀번호가 일치합니다." : undefined}
                >
                  <div className="relative">
                    <input
                      id="pw2"
                      type={showPw2 ? "text" : "password"}
                      autoComplete="new-password"
                      value={pw2}
                      onChange={(e) => setPw2(e.target.value)}
                      placeholder="비밀번호를 한번 더 입력해 주세요."
                      className={`${t.field} pr-12`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw2((v) => !v)}
                      aria-label={showPw2 ? "비밀번호 숨기기" : "비밀번호 보기"}
                      className={`absolute right-4 top-1/2 -translate-y-1/2 text-[15px] ${t.muted}`}
                    >
                      {showPw2 ? "🙈" : "👁"}
                    </button>
                  </div>
                </Row>
              </>
            )}

            <Row
              id="name"
              label="이름"
              error={tried && !nameOk ? "이름을 입력해 주세요." : undefined}
            >
              <input
                id="name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력하세요."
                className={t.field}
              />
            </Row>

            {/* 휴대폰 본인인증 — 역할 자리에 들어간다 */}
            <div className="flex flex-col gap-2">
              <p className={`text-[14px] font-semibold ${t.muted}`}>휴대폰 본인인증</p>

              {passState === "idle" && (
                <>
                  <button
                    type="button"
                    onClick={() => setPassState("opening")}
                    className={t.btnNeutral}
                  >
                    휴대폰 인증하기
                  </button>
                  {tried && (
                    <p role="alert" className={`text-[13px] font-semibold ${t.required}`}>
                      휴대폰 본인인증을 마쳐 주세요.
                    </p>
                  )}
                </>
              )}

              {passState === "opening" && (
                <div className="rounded-[14px] border border-soft-line p-5">
                  <p className="text-[14px] font-bold">본인확인 창에서 인증을 진행해 주세요</p>
                  <p className={`mt-1.5 text-[13px] leading-[1.7] ${t.muted}`}>
                    주민등록번호와 휴대폰 번호는 본인확인 창에서 입력합니다. 인증이 끝나면 확인된
                    휴대폰 번호와 생년월일만 이 화면으로 돌아옵니다.
                  </p>
                  {/* 시연용 — NICE아이디 휴대폰본인확인을 붙이면 이 블록은 지운다 */}
                  <p className={`mt-4 text-[12px] font-bold ${t.muted}`}>시연용 · 본인확인 응답</p>
                  <div className="mt-2 flex gap-2">
                    {passDemo.map((d) => (
                      <button
                        key={d.key}
                        type="button"
                        onClick={() => finishPass(d.result)}
                        className="flex-1 rounded-full border border-soft-line bg-white px-3 py-2.5 text-[12.5px] font-semibold transition-colors hover:bg-slate-50"
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPassState("idle")}
                    className={`mt-3 text-[13px] ${t.muted} hover:underline`}
                  >
                    취소
                  </button>
                </div>
              )}

              {/* 결과는 한 줄로만 알린다. 확인된 값은 화면에 늘어놓지 않는다 */}
              {passState === "done" && pass && !blocked && (
                <p className="text-[13px] font-semibold text-emerald-600">
                  ✓ 휴대폰 본인인증이 완료되었습니다.
                </p>
              )}

              {/* 학생이 만 14세 미만 — 가입을 막는 것이 아니라 동의 경로로 잇는다 */}
              {passState === "done" && pass && needsGuardian && (
                <div className="flex flex-col items-start gap-2.5 rounded-[14px] border border-soft-line bg-soft-primary-soft p-5">
                  <p className="text-[15px] font-bold">
                    만 {CONSENT_AGE}세 미만 학생은 혼자 회원가입을 완료할 수 없습니다
                  </p>
                  <p className={`text-[13px] leading-[1.7] ${t.muted}`}>
                    가입이 막힌 것이 아닙니다. 법정대리인의 동의가 완료되면 서비스를 이용할 수
                    있습니다. 아래 세 가지 중 하나를 고르시면 됩니다.
                  </p>
                  <div className="mt-1 flex w-full flex-col gap-2">
                    <Link href="/signup/guardian" className={t.btnPrimary}>
                      법정대리인에게 동의 요청 보내기
                    </Link>
                    <Link href="/signup/type?stage=method&type=parent" className={t.btnNeutral}>
                      법정대리인 계정으로 자녀 등록하기
                    </Link>
                    <Link href="/login/student" className={t.btnNeutral}>
                      기관에서 받은 응시코드 입력하기
                    </Link>
                  </div>
                  <p className={`text-[12.5px] leading-[1.7] ${t.muted}`}>
                    응시코드를 넣으면 먼저 보호자 동의 상태를 확인합니다. 동의가 끝나 있으면 바로
                    응시로 이어집니다.
                  </p>
                </div>
              )}

              {/* 학부모·기관 담당자가 미성년으로 확인된 경우 */}
              {passState === "done" && pass && needsAdult && (
                <div className="flex flex-col items-start gap-2">
                  <p className="text-[14px] font-bold">
                    {type.label} 계정은 성년만 만들 수 있습니다
                  </p>
                  <p className={`text-[13px] leading-[1.7] ${t.muted}`}>
                    법정대리인 동의와 기관 운영은 만 {MAJORITY_AGE}세 이상이어야 할 수 있습니다.
                    학생 본인이시라면 학생으로 가입해 주세요.
                  </p>
                  <Link href="/signup/type" className={`${t.btnQuiet} mt-2`}>
                    회원 유형 다시 고르기
                  </Link>
                </div>
              )}

              {/* 만 14세 이상 미성년 학생 — 가입은 되고 결제만 갈린다 */}
              {passState === "done" && pass && minorContract && (
                <div className="rounded-[14px] border border-soft-line bg-slate-50 p-4">
                  <p className="text-[13.5px] font-bold">결제는 보호자와 함께 진행합니다</p>
                  <p className={`mt-1.5 text-[13px] leading-[1.7] ${t.muted}`}>
                    무료 가입·응시는 본인이 하실 수 있습니다. 다만 만 {MAJORITY_AGE}세 미만은 민법상
                    미성년자라, 유료 상품 결제와 정기구독은 학부모 계정에서 진행하거나 법정대리인
                    동의를 따로 받습니다(민법 제5조).
                  </p>
                </div>
              )}
            </div>

            {/* 약관동의 */}
            <div className="flex flex-col gap-2">
              <p className={`text-[14px] font-semibold ${t.muted}`}>약관동의</p>
              <div className="rounded-[12px] border border-soft-line bg-white px-5 py-4">
                <div className="pb-3">
                  <RightCheck
                    checked={allOn}
                    onChange={(v) => setAgreed(v ? purposeConsents.map((c) => c.id) : [])}
                    label="모두 확인, 동의합니다."
                  />
                </div>
                <ul className="flex flex-col gap-1 border-t border-soft-line pt-3">
                  {purposeConsents.map((c: PurposeConsent) => (
                    <li key={c.id}>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <RightCheck
                            checked={agreed.includes(c.id)}
                            onChange={() => toggle(c.id)}
                            label={`${c.label} (${c.required ? "필수" : "선택"})`}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setOpenBody(openBody === c.id ? null : c.id)}
                          aria-expanded={openBody === c.id}
                          className={`shrink-0 text-[12px] ${t.muted} hover:underline`}
                        >
                          {openBody === c.id ? "접기" : "보기"}
                        </button>
                      </div>
                      {openBody === c.id && (
                        <div className="my-2 max-h-44 overflow-y-auto rounded-[10px] bg-slate-50 px-4 py-3">
                          {c.body.map((b) => (
                            <div key={b.h} className="mb-2.5 last:mb-0">
                              <p className="text-[12.5px] font-bold">{b.h}</p>
                              <p className={`mt-1 text-[12.5px] leading-[1.8] ${t.muted}`}>{b.p}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              {tried && !termsOk && (
                <p role="alert" className={`text-[13px] font-semibold ${t.required}`}>
                  필수 약관에 동의해 주세요.
                </p>
              )}
            </div>

            <button type="button" disabled={!ready} onClick={join} className={t.btnPrimary}>
              가입하기
            </button>
          </div>

          <p className={`mt-6 text-center text-[13px] ${t.muted}`}>
            <Link href="/signup/type" className="hover:underline">
              가입 수단 다시 고르기
            </Link>
            <span aria-hidden className="mx-2.5 text-soft-line">
              |
            </span>
            <Link href="/login" className="hover:underline">
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
