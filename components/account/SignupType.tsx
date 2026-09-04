"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  bucketOf,
  CONSENT_AGE,
  personalRoleIds,
  signupTypes,
  type PersonalRoleId,
  type SignupBucketId,
  type SignupTypeId,
} from "@/lib/account";
import { patchSignupDraft } from "@/lib/signupStore";
import { themeOf } from "@/lib/authVariant";
import AuthTabs, { BackRow } from "./AuthTabs";
import { ArrowBadge, OrgArt, PersonalArt, StudentArt } from "./AuthArt";

/**
 * ACC-01-1 회원유형 선택 → 가입 수단 선택.
 *
 * 화면 순서 —
 *   ① 갈래     (개인 / 기관)
 *   ② 역할     (개인이면 → 만 14세 이상 학생 / 학부모·법정대리인)
 *   ③ 가입 수단 (카카오·네이버·구글·아이디)
 *
 * 예전에는 학생·학부모·기관을 첫 화면에 나란히 세웠다. 사람은 자기 역할을 들고
 * 들어오지 "개인"이라는 분류를 들고 들어오지 않는다는 이유였는데, 기관 담당자와 개인
 * 회원은 받는 화면도 권한도 정산도 통째로 다르다. 큰 갈림길을 먼저 묻고 나면 개인
 * 쪽에는 학생과 학부모의 차이만 남아, 두 카드에 설명을 제대로 실을 수 있다.
 *
 * **두 개인 갈래는 그 뒤로 같은 길을 간다.** 학생에게만 있던 연령 확인 단계는 없앴다.
 * 「만 14세 이상 학생」이라고 적힌 카드를 고르는 것이 곧 본인의 신고이고, 실제 판정은
 * 뒤따르는 휴대폰 본인인증이 돌려주는 생년월일로 한다. 손으로 적어 넣는 생년월일은
 * 아무렇게나 적을 수 있는 숫자였고, 본인확인기관이 확인해 준 값이 언제나 그보다 낫다.
 *
 * **세 단계 모두 고를 것만 세운다.** 갈림길에는 카드만, 가입 수단 화면에는 단추와
 * 되돌아갈 길만 둔다. 만 14세 미만 안내·법정대리인 자격·기관 승인 대기 같은 이야기를
 * 여기 쌓아 두면 무엇을 고르는 자리인지가 흐려진다. 그 셋은 모두 **고른 뒤에 실제로
 * 걸리는 곳**에서 다시 말한다 — 연령 판정과 법정대리인 경로는 /signup/join의 휴대폰
 * 본인인증이, 기관 승인 대기는 가입 직후 도착하는 /my/pending이 맡는다.
 *
 * 세 단계가 **같은 껍데기를 쓴다.** 되돌아가기 줄은 첫 단계에서도 빈 줄로 자리를
 * 지키므로, 단계를 넘어가도 제목과 카드가 제자리에 그대로 있다. 위아래 여백을 넉넉히
 * 두는 것도 같은 이유다 — 화면이 짧아졌다 길어졌다 하며 흔들리지 않게.
 *
 * 교사는 여기 없다. 교사 계정은 기관 담당자가 소속을 만든 뒤 초대하는 쪽이 맞아서
 * 가입 입구에서는 묻지 않는다.
 *
 * 어느 갈래를 고르든 **가입 화면은 /signup/join 한 곳뿐이다.** 예전에는 약관 동의와
 * 본인확인을 각각 별도 주소(/signup/consent · /signup/verify)로 나눈 다단계 흐름이
 * 함께 있었는데, 같은 가입을 두 길로 만들어 두면 어느 쪽이 정본인지 알 수 없게 된다.
 * 한 장짜리 화면으로 확정하고 나머지는 지웠다.
 */

/** 시안 2「둥글둥글」로 확정했다. 가입 화면은 이 톤 하나만 쓴다. */
const t = themeOf(2);
const ACCENT = "#365eef";

/** 「로 / 으로」를 받침에 맞춰 고른다 (ㄹ 받침은 로) */
function ro(word: string) {
  const last = word.charCodeAt(word.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return "로";
  const jong = (last - 0xac00) % 28;
  return jong === 0 || jong === 8 ? "로" : "으로";
}

export type Stage = "bucket" | "person" | "method";

const methods: { id: string; label: string; tone: "kakao" | "naver" | "plain" }[] = [
  { id: "카카오", label: "카카오로 회원가입", tone: "kakao" },
  { id: "네이버", label: "네이버로 회원가입", tone: "naver" },
  { id: "구글", label: "구글로 회원가입", tone: "plain" },
  { id: "", label: "아이디로 회원가입", tone: "plain" },
];

type Card = { title: string; desc: string; art: React.ReactNode };

/** ① 첫 갈림길 — 개인 / 기관 */
const bucketCards: Record<SignupBucketId, Card> = {
  personal: {
    title: "개인 회원으로 가입",
    desc: "학생 본인 또는 학부모·법정대리인 계정입니다",
    art: <PersonalArt className="h-28 w-full" accent={ACCENT} />,
  },
  org: {
    title: "기관 회원으로 가입",
    desc: "학교·학원·교육청 단위로 학생을 등록하고 운영합니다",
    art: <OrgArt className="h-28 w-full" accent={ACCENT} />,
  },
};

/** ② 개인 갈래 안의 두 역할 */
const personCards: Record<PersonalRoleId, Card> = {
  student: {
    title: `만 ${CONSENT_AGE}세 이상 학생`,
    desc: "본인 휴대폰 인증만으로 가입합니다. 법정대리인 동의를 따로 받지 않습니다",
    art: <StudentArt className="h-28 w-full" accent={ACCENT} />,
  },
  parent: {
    title: "학부모·법정대리인",
    desc: `자녀를 등록하고 동의하고 결과를 봅니다. 만 ${CONSENT_AGE}세 미만 자녀는 이 계정으로 등록합니다`,
    art: <PersonalArt className="h-28 w-full" accent={ACCENT} />,
  },
};

/** 좌우로 놓이는 큰 선택 카드 (clipo의 "로그인 유형을 선택하세요" 카드 구성) */
function PickCard({ title, desc, art, onClick }: Card & { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col rounded-[16px] border border-soft-line bg-white p-6 text-left transition-all hover:border-soft-primary hover:shadow-[0_8px_24px_rgba(54,94,239,0.12)] sm:p-7"
    >
      <span className="flex items-start justify-between gap-2.5">
        <span className="text-[19px] font-extrabold leading-snug tracking-tight">{title}</span>
        <ArrowBadge color={ACCENT} />
      </span>
      <span className={`mt-2.5 text-[13.5px] leading-[1.6] ${t.muted}`}>{desc}</span>
      <span className="mt-5 block" aria-hidden>
        {art}
      </span>
    </button>
  );
}

export default function SignupType({
  /** 어느 단계로 열지. 디자인 검토·시안 반출용으로 URL(?stage=)에서 지정할 수 있다. */
  initialStage = "bucket",
  initialType = null,
}: {
  initialStage?: Stage;
  initialType?: SignupTypeId | null;
}) {
  const router = useRouter();

  const [stage, setStage] = useState<Stage>(initialStage);
  // ?type=이 들어오면 그 역할이 속한 갈래를 되짚어 둔다 — 뒤로 가기가 엉뚱한 곳으로 가지 않도록
  const [bucket, setBucket] = useState<SignupBucketId | null>(bucketOf(initialType));
  const [picked, setPicked] = useState<SignupTypeId | null>(initialType);

  const chosen = picked ? signupTypes.find((s) => s.id === picked)! : null;

  /** ② 역할 확정. 학생 카드를 누른 것이 곧 「만 14세 이상」 신고다 */
  const pick = (id: SignupTypeId) => {
    setPicked(id);
    patchSignupDraft({ type: id, selfAgeOk: id === "student" });
    setStage("method");
  };

  /** ① 개인 / 기관. 기관은 역할이 하나뿐이라 곧바로 가입 수단으로 넘어간다 */
  const pickBucket = (id: SignupBucketId) => {
    setBucket(id);
    if (id === "org") {
      pick("org");
      return;
    }
    setPicked(null);
    setStage("person");
  };

  const start = (provider: string) => {
    if (!picked) return;
    patchSignupDraft({
      type: picked,
      selfAgeOk: picked === "student",
      ...(provider
        ? { provider, name: "김보호", email: "genix.kim@example.com" }
        : { provider: null }),
    });
    // 간편·아이디가 같은 화면으로 모인다. 간편 가입은 제공자가 계정을 이미 확인해
    // 주므로 인증 칸을 건너뛰고 정보 입력부터 시작한다.
    router.push("/signup/join");
  };

  /** 기관은 역할 단계를 지나오지 않았으므로 첫 갈림길로 돌아간다 */
  const back = () => {
    if (stage === "method") setStage(bucket === "org" ? "bucket" : "person");
    else setStage("bucket");
  };

  /** 카드를 세우는 두 단계는 넓은 폭, 가입 수단은 폼 폭 */
  const shell = stage === "method" ? t.column : "mx-auto w-full max-w-[46rem]";

  const cards =
    stage === "person"
      ? personalRoleIds.map((id) => ({
          key: id as string,
          card: personCards[id],
          onClick: () => pick(id),
        }))
      : (["personal", "org"] as SignupBucketId[]).map((id) => ({
          key: id as string,
          card: bucketCards[id],
          onClick: () => pickBucket(id),
        }));

  return (
    <div className={`min-h-full ${t.page}`}>
      <div className="container-x pt-14 pb-24">
        <p className={t.crumb}>홈 &gt; 회원가입</p>

        {/* 탭은 좁은 폼 폭에 맞춰 가운데 */}
        <div className={`mt-7 ${t.column}`}>
          <AuthTabs />
        </div>

        <div className={`${shell} mt-12`}>
          <BackRow onClick={stage === "bucket" ? undefined : back} />

          {stage === "method" ? (
            /* ③ 가입 수단 */
            <div className="mt-7 flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <h1 className={t.heading}>
                  {chosen?.label}
                  {ro(chosen?.label ?? "")} 회원가입하기
                </h1>
                <p className={t.lead}>가입에 사용할 계정을 선택해 주세요.</p>
              </div>

              <div className="flex flex-col gap-4">
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

                {/* 가입 수단 바로 아래. 이미 계정이 있는 사람이 여기까지 와서
                    막히는 자리라, 되돌아갈 길 셋을 한 줄로 붙여 둔다 */}
                <div className={`flex justify-center gap-4 text-[14px] ${t.muted}`}>
                  <Link href="/login" className="hover:underline">
                    로그인
                  </Link>
                  <span aria-hidden>|</span>
                  <Link href="/login/recover" className="hover:underline">
                    아이디 찾기
                  </Link>
                  <span aria-hidden>|</span>
                  <Link href="/login/recover" className="hover:underline">
                    비밀번호 찾기
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            /* ①·② 카드로 고르는 두 단계 — 제목만 다르고 자리는 같다 */
            <>
              <h1 className={`${t.heading} mt-7 text-center`}>
                {stage === "person" ? "누가 가입하시나요?" : "어떤 유형으로 가입하시나요?"}
              </h1>

              <div className="mt-10 grid gap-5 sm:grid-cols-2">
                {cards.map((c) => (
                  <PickCard key={c.key} {...c.card} onClick={c.onClick} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
