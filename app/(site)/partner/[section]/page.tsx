import type { Metadata } from "next";
import SubPage from "@/components/site/SubPage";
import { pageContent, sectionsOf } from "@/lib/pageContent";

export function generateStaticParams() {
  return sectionsOf("/partner").map((section) => ({ section }));
}

export async function generateMetadata({
  params,
}: PageProps<"/partner/[section]">): Promise<Metadata> {
  const { section } = await params;
  const c = pageContent[`/partner/${section}`];
  return c ? { title: c.title, description: c.lead } : {};
}

export default async function PartnerSectionPage({ params }: PageProps<"/partner/[section]">) {
  const { section } = await params;
  return <SubPage href={`/partner/${section}`} />;
}
