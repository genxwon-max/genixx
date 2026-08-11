"use client";

import { type ProviderId, socialProviders } from "@/lib/signup";

/**
 * 간편 로그인 버튼.
 * 높이·모서리를 입력칸·제출 버튼과 맞춰 한 덩어리로 읽히게 한다.
 */
export default function SocialButtons({
  onPick,
  suffix = "로 시작하기",
}: {
  onPick: (id: ProviderId) => void;
  suffix?: string;
}) {
  return (
    <div className="grid gap-2.5">
      {socialProviders.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onPick(p.id)}
          className={`flex min-h-[3.125rem] items-center justify-center gap-2.5 rounded-lg px-5 text-[15px] font-bold transition ${p.className}`}
        >
          <span
            aria-hidden
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${p.markClass}`}
          >
            {p.mark}
          </span>
          {p.label.replace("로 시작하기", suffix)}
        </button>
      ))}
    </div>
  );
}
