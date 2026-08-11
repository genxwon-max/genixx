"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CONSENT_AGE, signupTypeOf } from "@/lib/account";
import { patchSignupDraft, stepGuard, useSignupDraft } from "@/lib/signupStore";
import { useHydrated } from "@/lib/examStore";
import { signIn } from "@/lib/authStore";
import {
  btnOutline,
  btnPrimary,
  DefTable,
  field,
  NoteBox,
  Req,
  SectionTitle,
  StepBar,
  StepFooter,
} from "./ui";

/**
 * ACC-01-2 본인확인 + ACC-03-1 법정대리인 동의 (원본 3d).
 *
 * 원본이 이 둘을 한 화면에 묶었다. 보호자 본인확인이 곧 법정대리인 신원 확인의
 * 근거이므로(개인정보보호법 제22조의2), 인증 직후 같은 화면에서 만 14세 미만
 * 자녀에 대한 법정대리인 동의를 받는 흐름이다.
 *
 * 입력은 정의형 표(라벨 칸 / 입력 칸)로 둔다. 공공 포털이 가입 폼에 쓰는 형식이다.
 */

const relations = ["모", "부", "기타 법정대리인"];
const regions = [
  "서울",
  "경기·인천",
  "강원",
  "충청·대전·세종",
  "전라·광주",
  "경상·대구·부산·울산",
  "제주",
];

/** 표의 라벨 칸 */
function Th({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <div className="border-b border-acc-divider bg-acc-panel px-4.5 py-4 text-[14.5px] font-semibold text-acc-ink sm:px-4.5">
      {children} {required && <Req />}
    </div>
  );
}
/** 표의 값 칸 */
function Td({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-b border-acc-divider px-4.5 py-3.5 sm:border-l">
      {children}
    </div>
  );
}

export default function SignupVerify() {
  const router = useRouter();
  const hydrated = useHydrated();
  const draft = useSignupDraft();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [relation, setRelation] = useState(relations[0]);
  const [region, setRegion] = useState("");
  const [guardianOk, setGuardianOk] = useState(false);
  const [tried, setTried] = useState(false);

  if (!hydrated) {
    return <p className="container-x py-20 text-center text-[14px] text-acc-muted">확인 중입니다…</p>;
  }

  const guard = stepGuard(draft, "verify");
  if (!guard.ok) {
    return (
      <div className="container-x py-20 text-center">
        <p className="text-[16px] font-bold text-acc-ink">{guard.why}</p>
        <Link href={guard.back} className={`${btnOutline} mt-5`}>
          앞 단계로 돌아가기
        </Link>
      </div>
    );
  }

  const type = signupTypeOf(draft.type!);
  const isParent = draft.type === "parent";
  const phoneOk = phone.replace(/\D/g, "").length >= 10;
  const codeOk = code.replace(/\D/g, "").length === 6;
  const ready = name.trim().length >= 2 && codeOk && (!isParent || guardianOk);

  const submit = () => {
    setTried(true);
    if (!ready) return;
    patchSignupDraft({ verified: true, phone, name: name.trim() });
    signIn({
      role: draft.type === "parent" ? "parent" : draft.type === "teacher" ? "teacher" : "director",
      name: name.trim(),
      provider: draft.provider,
      email: draft.email || undefined,
      approved: !type.needsApproval,
    });
    router.push(type.needsApproval ? "/my/pending" : "/signup/done");
  };

  return (
    <div className="container-x py-10 pb-14">
      <div className="mx-auto flex w-full max-w-[67.5rem] flex-col gap-8">
        <StepBar current={2} />

        <div className="grid gap-9 lg:grid-cols-[1fr_20rem] lg:items-start">
          {/* 본문 */}
          <div className="flex flex-col gap-6">
            <SectionTitle
              title={isParent ? "보호자 본인확인" : "본인확인"}
              id="ACC-01-2"
              note={
                <>
                  <Req /> 필수 입력
                </>
              }
            />

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setSent(true)}
                className="flex h-[3.625rem] flex-1 items-center justify-center rounded bg-acc-primary text-[16px] font-bold text-white transition-colors hover:bg-acc-primary-dark"
              >
                PASS 앱 인증
              </button>
              <button
                type="button"
                onClick={() => setSent(true)}
                className="flex h-[3.625rem] flex-1 items-center justify-center rounded border border-acc-field bg-white text-[15px] font-semibold text-acc-body transition-colors hover:bg-acc-panel"
              >
                문자(SMS) 인증
              </button>
              <button
                type="button"
                onClick={() => setSent(true)}
                className="flex h-[3.625rem] flex-1 items-center justify-center rounded border border-acc-field bg-white text-[15px] font-semibold text-acc-body transition-colors hover:bg-acc-panel"
              >
                카카오·네이버 인증서
              </button>
            </div>

            {/* 입력 표 */}
            <div className="border-t-2 border-acc-ink">
              <div className="grid grid-cols-1 sm:grid-cols-[170px_1fr]">
                <Th required>이름</Th>
                <Td>
                  <input
                    aria-label="이름"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="홍길동"
                    className={`${field} sm:w-[17.5rem]`}
                  />
                </Td>

                <Th required>휴대폰 번호</Th>
                <Td>
                  <div className="flex flex-wrap gap-2">
                    <input
                      aria-label="휴대폰 번호"
                      inputMode="numeric"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                      placeholder="01012345678"
                      className={`${field} sm:w-[17.5rem]`}
                    />
                    <button
                      type="button"
                      disabled={!phoneOk}
                      onClick={() => setSent(true)}
                      className="h-12 shrink-0 rounded bg-acc-ink px-4.5 text-[14px] font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {sent ? "재발송" : "인증번호 요청"}
                    </button>
                  </div>
                  <p className="text-[13px] text-acc-muted">- 없이 숫자만 입력하세요.</p>
                </Td>

                <Th required>인증번호</Th>
                <Td>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative sm:w-[17.5rem]">
                      <input
                        aria-label="인증번호"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="______"
                        disabled={!sent}
                        className={`${field} pr-16 tracking-[0.2em] disabled:bg-acc-panel`}
                      />
                      {sent && (
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-acc-required tabular-nums">
                          02:47
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-[13px] text-acc-muted">
                    {sent
                      ? "문자가 오지 않으면 스팸 차단 설정을 확인해 주세요. 시연에서는 아무 6자리나 통과합니다."
                      : "먼저 인증번호를 요청해 주세요."}
                  </p>
                </Td>

                {isParent && (
                  <>
                    <Th required>자녀와의 관계</Th>
                    <Td>
                      <div className="flex flex-wrap gap-5">
                        {relations.map((r) => (
                          <label
                            key={r}
                            className="flex cursor-pointer items-center gap-2 text-[15px] text-acc-ink"
                          >
                            <input
                              type="radio"
                              name="relation"
                              checked={relation === r}
                              onChange={() => setRelation(r)}
                              className="h-[18px] w-[18px] accent-[#0b4d8f]"
                            />
                            {r}
                          </label>
                        ))}
                      </div>
                    </Td>
                  </>
                )}

                <Th>거주 지역</Th>
                <Td>
                  <select
                    aria-label="거주 지역"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className={`${field} sm:w-[17.5rem]`}
                  >
                    <option value="">시·도 선택</option>
                    {regions.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                  <p className="text-[13px] text-acc-muted">
                    선택 항목입니다. 상세 주소는 수집하지 않습니다.
                  </p>
                </Td>
              </div>
            </div>

            {/* 만 14세 미만 법정대리인 동의 (B00) */}
            {isParent && (
              <section className="border border-acc-primary">
                <h3 className="border-b border-acc-primary-line bg-acc-primary-soft px-5 py-4 text-[16px] font-bold text-acc-primary-dark">
                  만 {CONSENT_AGE}세 미만 자녀 법정대리인 동의 (B00) <Req />
                </h3>
                <DefTable
                  rows={[
                    {
                      k: "수집 항목",
                      v: "자녀 이름 또는 별명, 생년월일, 학교급, 학년, 진단 응답 데이터",
                    },
                    { k: "이용 목적", v: "진단 수행, 결과 해석 및 성장 가이드 제공" },
                    { k: "보유 기간", v: "5년 후 자동 파기. 철회 요청 시 즉시 파기 큐에 등록" },
                    { k: "제3자 제공", v: "없음" },
                    {
                      k: "철회 방법",
                      v: "[내 정보 > 자녀 프로필 > 동의 철회·데이터 파기 요청]에서 언제든 철회 가능",
                    },
                  ]}
                />
                <div className="flex flex-col gap-2.5 border-t border-acc-primary-line bg-acc-panel px-5 py-4">
                  <label className="flex cursor-pointer items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={guardianOk}
                      onChange={(e) => setGuardianOk(e.target.checked)}
                      className="mt-0.5 h-[22px] w-[22px] shrink-0 rounded-[3px] accent-[#0b4d8f]"
                    />
                    <span className="text-[14.5px] leading-[1.7] text-acc-ink">
                      위 내용을 확인하고, 만 {CONSENT_AGE}세 미만 자녀의 개인정보 수집·이용에
                      법정대리인으로서 동의합니다.{" "}
                      <span className="font-bold text-acc-required">(필수)</span>
                    </span>
                  </label>
                  <p className="text-[13px] leading-[1.7] text-acc-muted">
                    동의 일시와 본인인증 결과값이 동의 증빙으로 기록됩니다.{" "}
                    <Link
                      href="/legal/privacy-kids"
                      className="font-semibold text-acc-primary hover:underline"
                    >
                      아동용 눈높이 고지문 보기 ›
                    </Link>
                  </p>
                  <p className="text-[13px] leading-[1.7] text-acc-muted">
                    자녀가 만 {CONSENT_AGE}세 이상이면 이 동의는 받지 않습니다. 자녀를 등록하실 때
                    생년월일로 판단해 학생 본인 동의로 대체합니다.
                  </p>
                </div>
              </section>
            )}

            {tried && !ready && (
              <p role="alert" className="text-center text-[14px] font-bold text-acc-required">
                {name.trim().length < 2
                  ? "이름을 입력해 주세요."
                  : !codeOk
                    ? "인증번호 6자리를 입력해 주세요."
                    : "법정대리인 동의에 체크해 주세요."}
              </p>
            )}

            <StepFooter back={{ href: "/signup/consent" }}>
              <button type="button" onClick={submit} className={btnPrimary}>
                인증하고 가입 완료
              </button>
            </StepFooter>
          </div>

          {/* 오른쪽 안내 */}
          <aside className="flex flex-col gap-4">
            <NoteBox title="왜 본인인증이 필요한가요?" tone="ink">
              <p>
                소셜 로그인만으로는 실제 보호자 여부와 휴대폰 명의를 확인할 수 없습니다.
                개인정보보호법 제22조의2에 따라 만 {CONSENT_AGE}세 미만 아동의 개인정보 처리에는
                법정대리인 확인이 필요합니다.
              </p>
              <p>인증은 본인확인기관을 통해 최초 1회만 진행하며, 통신사 정보는 저장하지 않습니다.</p>
            </NoteBox>

            <section className="border border-acc-line bg-white p-5">
              <h3 className="text-[15px] font-bold text-acc-ink">가입 후 진행 순서</h3>
              <ol className="mt-3 flex flex-col gap-2.5">
                {[
                  "자녀 프로필 등록 (이름·생년월일·학교급·학년)",
                  "무료 학력진단 응시",
                  "재능진단 신청 및 세션 배정",
                ].map((t, i) => (
                  <li key={t} className="flex gap-2.5 text-[14px]">
                    <span
                      className={`font-bold ${i === 0 ? "text-acc-primary" : "text-acc-placeholder"}`}
                    >
                      {i + 1}
                    </span>
                    <span className={`leading-[1.6] ${i === 0 ? "text-acc-body" : "text-acc-muted"}`}>
                      {t}
                    </span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="border border-acc-line bg-acc-panel p-5">
              <h3 className="text-[15px] font-bold text-acc-ink">도움이 필요하신가요?</h3>
              <p className="mt-2.5 text-[13.5px] leading-[1.8] text-acc-muted">
                인증이 계속 실패하는 경우{" "}
                <Link href="/support/inquiry" className="font-semibold text-acc-primary hover:underline">
                  고객지원(1:1 문의)
                </Link>
                으로 알려주세요. 학부모 설명회 영상에서 가입 절차를 5분 안에 확인할 수 있습니다.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
