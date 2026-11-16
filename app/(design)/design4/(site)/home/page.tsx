import type { Metadata } from "next";
import Home4 from "@/components/design4/Home4";

export const metadata: Metadata = {
  title: "홈페이지 시안 4",
  robots: { index: false, follow: false },
};

/** 홈페이지 시안 4 (/design4/home) — 로그인 전. 화면 설명은 components/design4/Home4.tsx에 있다. */
export default function Design4HomePage() {
  return <Home4 />;
}
