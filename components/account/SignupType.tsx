"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signupTypes, type SignupTypeId } from "@/lib/account";
import { patchSignupDraft, useSignupDraft } from "@/lib/signupStore";
import { themeOf, type Variant } from "@/lib/authVariant";
import AuthTabs, { VariantSwitch } from "./AuthTabs";
import { ArrowBadge, OrgArt, PersonalArt } from "./AuthArt";

/**
 * ACC-01-1 회원유형 선택 → 가입 수단 선택.
 *
 * clipo.ai의 "로그인 유형을 선택하세요" 화면 구성을 따른다 — 큰 카드 두 장을
 * 좌우로 놓고, 제목 옆에 원형 화살표, 아래에 일러스트를 깐다. 카드를 누르면
 * 곧바로 다음 화면으로 넘어가고, 한 화면에 선택지를 겹쳐 두지 않는다.
 *
 * 화면 순서 —
 *   ① 개인 / 기관        (좌우 카드)
 *   ② 교사 / 기관담당자   (기관을 고른 경우에만, 역시 좌우 카드)
 *   ③ 가입 수단          (카카오·네이버·구글·이메일)
 *
 * 사이트맵 5장의 3분기(학부모 / 교사 / 기관담당자)를 두 단으로 편 것이고,
 * 학생은 독립 가입 경로가 없어 어디에도 없다.
 */

/** 「로 / 으로」를 받침에 맞춰 고른다 (ㄹ 받침은 '로') */
function ro(word: string) {
  const last = word.charCodeAt(word.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return "로";
  const jong = (last - 0xac00) % 28;
  return jong === 0 || jong === 8 ? "로" : "으로";
}

export type Stage = "bucket" | "role" | "method";

const methods: { id: string; label: string; tone: "kakao" | "naver" | "plain" }[] = [
  { id: "카카오", label: "카카오로 회원가입", tone: "kakao" },
  { id: "네이버", label: "네이버로 회원가입", tone: "naver" },
  { id: "구글", label: "구글로 회원가입", tone: "plain" },
  { id: "", label: "아이디로 회원가입", tone: "plain" },
];

/** 좌우로 놓이는 큰 선택 카드 (clipo의 "로그인 유형을 선택하세요" 카드 구성) */
function PickCard({
  variant,
  title,
  desc,
  art,
  onClick,
}: {
  variant: Variant;
  title: string;
  desc: string;
  art: React.ReactNode;
  onClick: () => void;
}) {
  const t = themeOf(variant);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex flex-col p-6 text-left transition-all sm:p-7 ${
        variant === 1
          ? "border border-acc-line bg-white hover:border-acc-primary hover:shadow-[0_6px_20px_rgba(11,77,143,0.1)]"
          : "rounded-[16px] border border-soft-line bg-white hover:border-soft-primary hover:shadow-[0_8px_24px_rgba(54,94,239,0.12)]"
      }`}
    >
      <span className="flex items-center gap-2.5">
        <span className="text-[21px] font-extrabold tracking-tight">{title}</span>
        <ArrowBadge color={variant === 1 ? "#0b4d8f" : "#365eef"} />
      </span>
      <span className={`mt-3 text-[14px] leading-[1.6] ${t.muted}`}>{desc}</span>
      <span className="mt-6 block" aria-hidden>
        {art}
      </span>
    </button>
  );
}

export default function SignupType({
  variant = 1,
  /** 어느 단계로 열지. 디자인 검토·시안 반출용으로 URL(?stage=)에서 지정할 수 있다. */
  initialStage = "bucket",
  initialType = null,
}: {
  variant?: Variant;
  initialStage?: Stage;
  initialType?: SignupTypeId | null;
}) {
  const t = themeOf(variant);
  const router = useRouter();
  const draft = useSignupDraft();
  const accent = variant === 1 ? "#0b4d8f" : "#365eef";

  const [stage, setStage] = useState<Stage>(initialStage);
  const [picked, setPicked] = useState<SignupTypeId | null>(initialType ?? draft.type);

  const chosen = picked ? signupTypes.find((s) => s.id === picked)! : null;
  const orgTypes = signupTypes.filter((s) => s.id !== "parent");

  const start = (provider: string) => {
    if (!picked) return;
    patchSignupDraft({
      type: picked,
      ...(provider
        ? { provider, name: "김보호", email: "genix.kim@example.com" }
        : { provider: null }),
    });
    // 시안 2는 간편·이메일이 같은 화면으로 모인다. 간편 가입은 제공자가 계정을 이미
    // 확인해 주므로 ① 인증 칸을 건너뛰고 ② 정보 입력부터 시작한다.
    if (variant === 2) {
      router.push("/signup2/join");
      return;
    }
    router.push("/signup/consent");
  };

  return (
    <div className={`min-h-full ${t.page}`}>
      <div className="container-x py-11 pb-16">
        <p className={t.crumb}>홈 &gt; 회원가입</p>

        {/* 탭은 좁은 폼 폭에 맞춰 가운데 */}
        <div className={`mt-6 ${t.column}`}>
          <AuthTabs variant={variant} />
        </div>

        {stage === "method" ? (
          /* ③ 가입 수단 */
          <div className={`mt-9 ${t.column} flex flex-col gap-6`}>
            <button
              type="button"
              onClick={() => setStage(picked === "parent" ? "bucket" : "role")}
              className={`self-start text-[13px] font-semibold ${t.muted} hover:underline`}
            >
              ← 이전으로
            </button>

            <div className="flex flex-col gap-2">
              <h1 className={t.heading}>
                {chosen?.label}
                {ro(chosen?.label ?? "")} 회원가입하기
              </h1>
              <p className={t.lead}>가입에 사용할 계정을 선택해 주세요.</p>
            </div>

            <div className="flex flex-col gap-2.5">
              {methods.map((m) => (
                <button
                  key={m.label}
                  type="button"
                  onClick={() => start(m.id)}
                  className={
                    m.tone === "kakao"
                      ? `${t.btnSocial} bg-[#FEE500] text-[#191600]`
                      : m.tone === "naver"
                        ? `${t.btnSocial} bg-[#03C75A] text-white`
                        : t.btnNeutral
                  }
                >
                  {m.label}
                </button>
              ))}
            </div>

            <p className={`text-[13px] leading-[1.7] ${t.muted}`}>
              소셜 계정만으로는 보호자 여부와 휴대폰 명의가 확인되지 않아, 다음 단계에서 휴대폰
              본인인증을 1회 진행합니다.
            </p>

            {chosen?.needsApproval && (
              <div className={`${t.cardSoft} p-5`}>
                <p className="text-[14px] font-bold">소속 승인이 끝나야 활성화됩니다</p>
                <p className={`mt-1.5 text-[13px] leading-[1.7] ${t.muted}`}>
                  가입 후 기관 관리자의 확인을 거칩니다. 승인 전에는 학생 데이터에 접근할 수
                  없습니다.
                </p>
              </div>
            )}
          </div>
        ) : (
          /* ① 개인 / 기관  ·  ② 교사 / 기관담당자 */
          <div className="mx-auto mt-10 w-full max-w-[52rem]">
            {stage === "role" && (
              <button
                type="button"
                onClick={() => setStage("bucket")}
                className={`mb-5 text-[13px] font-semibold ${t.muted} hover:underline`}
              >
                ← 이전으로
              </button>
            )}

            <h1 className={`${t.heading} text-center`}>
              {stage === "bucket" ? "어떤 회원으로 가입하시나요?" : "기관 내 역할을 선택하세요"}
            </h1>
            <p className={`${t.lead} mt-2.5 text-center`}>
              {stage === "bucket"
                ? "고른 유형에 따라 이후 단계와 받는 권한이 달라집니다."
                : "역할에 따라 접근할 수 있는 범위가 다릅니다."}
            </p>

            <div className="mt-9 grid gap-5 sm:grid-cols-2">
              {stage === "bucket" ? (
                <>
                  <PickCard
                    variant={variant}
                    title="개인"
                    desc="자녀의 진단을 신청하고 결과를 봅니다"
                    art={<PersonalArt className="h-32 w-full" accent={accent} />}
                    onClick={() => {
                      setPicked("parent");
                      setStage("method");
                    }}
                  />
                  <PickCard
                    variant={variant}
                    title="기관"
                    desc="학교·학원·교육청 단위로 운영합니다"
                    art={<OrgArt className="h-32 w-full" accent={accent} />}
                    onClick={() => {
                      setPicked(null);
                      setStage("role");
                    }}
                  />
                </>
              ) : (
                orgTypes.map((s) => (
                  <PickCard
                    key={s.id}
                    variant={variant}
                    title={s.label}
                    desc={s.tagline}
                    art={
                      s.id === "teacher" ? (
                        <PersonalArt className="h-32 w-full" accent={accent} />
                      ) : (
                        <OrgArt className="h-32 w-full" accent={accent} />
                      )
                    }
                    onClick={() => {
                      setPicked(s.id);
                      setStage("method");
                    }}
                  />
                ))
              )}
            </div>

            <div className={`${t.cardSoft} mx-auto mt-6 max-w-[52rem] p-5`}>
              <p className="text-[14px] font-bold">학생은 회원가입을 하지 않습니다</p>
              <p className={`mt-1.5 text-[13px] leading-[1.7] ${t.muted}`}>
                학생은 보호자 계정 안의 프로필로 등록되고, 응시할 때는 발급된 접속코드와 생년월일로
                들어갑니다.
              </p>
            </div>
          </div>
        )}

        <div className={t.column}>
          <VariantSwitch variant={variant} kind="signup" />
        </div>
      </div>
    </div>
  );
}
