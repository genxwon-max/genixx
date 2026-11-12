import type { Metadata } from "next";
import SubPage from "@/components/design4/site/SubPage";
import { pageContent, sectionsOf } from "@/lib/pageContent";

export function generateStaticParams() {
  return sectionsOf("/about").map((section) => ({ section }));
}

export async function generateMetadata({
  params,
}: PageProps<"/design4/about/[section]">): Promise<Metadata> {
  const { section } = await params;
  const c = pageContent[`/about/${section}`];
  return c ? { title: c.title, description: c.lead } : {};
}

export default async function AboutSectionPage({ params }: PageProps<"/design4/about/[section]">) {
  const { section } = await params;
  return <SubPage href={`/about/${section}`} />;
}
