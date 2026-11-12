import type { Metadata } from "next";
import SubPage from "@/components/design4/site/SubPage";
import { pageContent, sectionsOf } from "@/lib/pageContent";

export function generateStaticParams() {
  return sectionsOf("/support").map((section) => ({ section }));
}

export async function generateMetadata({
  params,
}: PageProps<"/design4/support/[section]">): Promise<Metadata> {
  const { section } = await params;
  const c = pageContent[`/support/${section}`];
  return c ? { title: c.title, description: c.lead } : {};
}

export default async function SupportSectionPage({ params }: PageProps<"/design4/support/[section]">) {
  const { section } = await params;
  return <SubPage href={`/support/${section}`} />;
}
