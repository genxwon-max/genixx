import type { Metadata } from "next";
import MyPage, { type SectionId } from "@/components/account/MyPage";

export const metadata: Metadata = {
  title: "마이페이지",
  description: "회원정보·동의·수신·결제·탈퇴. (ACC-05)",
  robots: { index: false, follow: false },
};

const sections: SectionId[] = [
  "profile",
  "children",
  "consent",
  "org",
  "members",
  "billing",
  "notify",
  "inquiry",
  "withdraw",
  "leave",
];

/**
 * ACC-05 마이페이지 — 학부모·기관 공용 계정 허브.
 * ?section= 으로 첫 칸을 지정한다(옛 /my/account/leave · /my/children/withdraw가 이리로 넘어온다).
 */
export default async function MyPageRoute({ searchParams }: PageProps<"/mypage">) {
  const { section } = await searchParams;
  const initial = sections.find((s) => s === section) ?? "profile";
  return <MyPage key={initial} initialSection={initial} />;
}
