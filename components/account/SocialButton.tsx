import Link from "next/link";
import { Google_Sans } from "next/font/google";

/**
 * 간편 로그인 버튼 — 카카오 · 네이버 · 구글이 정해 둔 양식.
 *
 * 세 곳 모두 로그인 버튼의 색 · 로고 · 문구를 가이드로 정해 두었다. 색을 비슷하게 칠하고
 * 글자만 얹은 버튼은 그 양식이 아니므로, 버튼은 반드시 이 파일의 것을 쓴다. 높이(52px)와
 * 모서리(12px), 글자 크기(16px)는 세 버튼이 같다 — 어느 한 곳이 더 눈에 띄면 안 된다는 것이
 * 세 가이드에 공통으로 있다.
 *
 * 카카오 — developers.kakao.com/docs/latest/ko/kakaologin/design-guide
 *   · 컨테이너 #FEE500 · 심볼 #000000 · 레이블 #000000 85%. 다른 색은 쓸 수 없다.
 *   · 심볼은 말풍선 하나뿐이다. 모양 · 비율 · 색을 바꾸거나 빼거나 다른 그림으로 바꿀 수 없다.
 *   · 모서리 12px. 가로로 늘릴 때는 심볼과 레이블을 함께 가운데에 두거나 심볼만 왼쪽에 둔다.
 *   · 레이블 높이는 컨테이너 높이의 1/3을 넘지 않는다(52px에 16px).
 *   · 문구는 「카카오 로그인」(짧게는 「로그인」)이다. 회원가입 화면에서도 같은 버튼을 쓴다.
 *     「카카오로 시작하기」는 카카오싱크를 붙인 서비스만 쓰는 다른 버튼이다.
 *
 * 네이버 — developers.naver.com/docs/login/bi/bi.md
 *   · 배경 #03A94D · 로고와 레이블 #FFFFFF. 예전 녹색(#03C75A)에서 바뀌었다.
 *   · N 로고는 16px 이상, 글자는 로고 높이보다 작게. 모양을 바꾸거나 다른 것과 합칠 수 없다.
 *   · 가운데 정렬일 때 로고와 레이블 사이는 8px.
 *   · 문구는 네이버로 로그인하는 목적에 맞으면 바꿀 수 있다(예: 「네이버로 간편가입」).
 *
 * 구글 — developers.google.com/identity/branding-guidelines
 *   · 밝은 테마: 채우기 #FFFFFF · 테두리 #747775 1px · 글자 #1F1F1F, Google Sans Medium.
 *   · G 로고는 표준 색 그대로, 흰 바탕 위에. 크기 비율과 색을 바꾸거나 단색으로 쓸 수 없다.
 *   · 로고 왼쪽 12px · 로고와 글자 사이 10px · 글자 오른쪽 12px.
 *   · 문구는 「Google 계정으로 로그인 / 가입 / 계속」 가운데 하나. 「Google」 한 단어만 쓰지 않는다.
 *
 * 누르면 무엇을 할지는 쓰는 쪽이 정한다 — href를 주면 링크, onClick을 주면 버튼이다.
 */

export type SocialProvider = "kakao" | "naver" | "google";
/** 버튼이 놓인 자리 — 로그인 화면인지 회원가입 화면인지에 따라 문구가 달라진다 */
export type SocialIntent = "login" | "signup";

/** 구글 버튼의 글자. 한글은 이 글꼴에 없으므로 본문 글꼴로 넘어간다 */
const googleSans = Google_Sans({
  variable: "--font-google-sans",
  subsets: ["latin"],
  weight: "500",
  display: "swap",
});

const labels: Record<SocialProvider, Record<SocialIntent, string>> = {
  kakao: { login: "카카오 로그인", signup: "카카오 로그인" },
  naver: { login: "네이버 로그인", signup: "네이버로 회원가입" },
  google: { login: "Google 계정으로 로그인", signup: "Google 계정으로 가입" },
};

/** 세션과 가입 초안이 제공자를 한글 이름으로 들고 있다(lib/authStore.ts) */
const byName: Record<string, SocialProvider> = { 카카오: "kakao", 네이버: "naver", 구글: "google" };

export function socialProviderOf(name: string | null | undefined): SocialProvider | null {
  return (name && byName[name]) || null;
}

/* ───────────────────────── 로고 ───────────────────────── */

/** 카카오 말풍선 심볼 */
function KakaoSymbol({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 18" aria-hidden className={className}>
      <path
        fill="#000000"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.00002 0.599976C4.02917 0.599976 0 3.71296 0 7.55228C0 9.94002 1.5584 12.0452 3.93152 13.2969L2.93303 16.9452C2.84481 17.2675 3.21341 17.5244 3.49646 17.3378L7.87334 14.4488C8.2427 14.4845 8.61808 14.5053 9.00002 14.5053C13.9705 14.5053 17.9999 11.3924 17.9999 7.55228C17.9999 3.71296 13.9705 0.599976 9.00002 0.599976Z"
      />
    </svg>
  );
}

/** 네이버 N 로고 — 색은 놓이는 바탕에 따라 흰색 또는 녹색 */
function NaverLogo({ className, color = "#FFFFFF" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={className}>
      <path
        fill={color}
        d="M10.8491 8.56267L4.91687 0H0V16H5.15088V7.436L11.0831 16H16V0H10.8491V8.56267Z"
      />
    </svg>
  );
}

/** 구글 G 로고 — 표준 색 */
function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={className}>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
      <path fill="none" d="M0 0h48v48H0z" />
    </svg>
  );
}

/* ───────────────────────── 버튼 ───────────────────────── */

/** 세 버튼이 함께 쓰는 틀 — 높이 · 모서리 · 글자 크기 */
const frame =
  "flex h-[3.25rem] w-full items-center justify-center rounded-[12px] px-3 text-[16px] leading-none transition";

const skin: Record<SocialProvider, string> = {
  kakao: "gap-2 bg-[#FEE500] font-medium text-black/85 hover:brightness-95",
  naver: "gap-2 bg-[#03A94D] font-semibold text-white hover:brightness-95",
  google: `${googleSans.variable} gap-2.5 border border-[#747775] bg-white font-medium text-[#1F1F1F] hover:shadow-[0_1px_2px_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)]`,
};

/** 구글 버튼만 글꼴이 정해져 있다 — 영문은 Google Sans, 한글은 본문 글꼴 */
const googleFont = {
  fontFamily: "var(--font-google-sans), var(--font-noto-kr), system-ui, sans-serif",
};

/**
 * 「아이디로 로그인」처럼 간편 로그인 버튼 아래에 나란히 서는 버튼.
 * 높이와 모서리를 위 세 버튼에 맞춘다 — 하나만 알약 모양이면 한 묶음으로 읽히지 않는다.
 */
export const plainStackButton =
  "flex h-[3.25rem] w-full items-center justify-center rounded-[12px] border border-soft-line bg-white text-[16px] font-medium text-soft-ink transition-colors hover:bg-slate-50";

export default function SocialButton({
  provider,
  intent = "login",
  href,
  onClick,
}: {
  provider: SocialProvider;
  intent?: SocialIntent;
  /** 주면 링크로 그린다 — 상태마다 주소가 따로 있는 디자인 화면에서 쓴다 */
  href?: string;
  onClick?: () => void;
}) {
  const body = (
    <>
      {provider === "kakao" && <KakaoSymbol className="h-[1.2em] w-[1.2em] shrink-0" />}
      {provider === "naver" && <NaverLogo className="h-[18px] w-[18px] shrink-0" />}
      {provider === "google" && <GoogleLogo className="h-5 w-5 shrink-0" />}
      <span>{labels[provider][intent]}</span>
    </>
  );
  const className = `${frame} ${skin[provider]}`;
  const style = provider === "google" ? googleFont : undefined;

  return href ? (
    <Link href={href} className={className} style={style}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className} style={style}>
      {body}
    </button>
  );
}

/* ───────────────────────── 표식 ───────────────────────── */

/**
 * 어느 계정으로 들어왔는지 알려 주는 작은 표식 — 가입 화면의 이메일 칸, 내 정보의 연결된 계정.
 * 버튼이 아니라 표시일 뿐이지만 로고와 바탕색은 버튼과 같은 규정을 따른다.
 */
export function SocialMark({
  provider,
  round = false,
  className = "",
}: {
  provider: SocialProvider;
  /** 둥근 표식 — 네이버가 아이콘형으로 정해 둔 모양 */
  round?: boolean;
  className?: string;
}) {
  const tile = {
    kakao: "bg-[#FEE500]",
    naver: "bg-[#03A94D]",
    google: "border border-[#747775] bg-white",
  }[provider];

  return (
    <span
      aria-hidden
      className={`flex h-7 w-7 shrink-0 items-center justify-center ${round ? "rounded-full" : "rounded-[8px]"} ${tile} ${className}`}
    >
      {provider === "kakao" && <KakaoSymbol className="h-4 w-4" />}
      {provider === "naver" && <NaverLogo className="h-4 w-4" />}
      {provider === "google" && <GoogleLogo className="h-[18px] w-[18px]" />}
    </span>
  );
}
