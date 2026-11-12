import SubHero from "@/components/design4/site/SubHero";

/** /design4 커뮤니티 칸 제목 — 다른 하위 화면과 같은 머리(제목 + 회색 설명 상자)를 쓴다 */
export default function PageTitle({ title, lead }: { title: string; lead?: string }) {
  return <SubHero title={title} lead={lead} />;
}
