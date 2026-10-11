"use client";

import { type ProviderId, socialProviders } from "@/lib/signup";
import SocialButton, { type SocialIntent } from "./SocialButton";

/**
 * 간편 로그인 버튼 묶음 — 카카오 · 네이버 · 구글을 차례로 세운다.
 * 버튼 하나하나의 모양과 문구는 각 회사가 정해 둔 양식이다(SocialButton.tsx).
 */
export default function SocialButtons({
  onPick,
  intent = "login",
}: {
  onPick: (id: ProviderId) => void;
  intent?: SocialIntent;
}) {
  return (
    <div className="grid gap-2.5">
      {socialProviders.map((p) => (
        <SocialButton key={p.id} provider={p.id} intent={intent} onClick={() => onPick(p.id)} />
      ))}
    </div>
  );
}
