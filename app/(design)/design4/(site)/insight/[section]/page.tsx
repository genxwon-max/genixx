import type { Metadata } from "next";
import SubPage from "@/components/design4/site/SubPage";
import { pageContent, sectionsOf } from "@/lib/pageContent";

export function generateStaticParams() {
  return sectionsOf("/insight").map((section) => ({ section }));
}

export async function generateMetadata({
  params,
}: PageProps<"/design4/insight/[section]">): Promise<Metadata> {
  const { section } = await params;
  const c = pageContent[`/insight/${section}`];
  return c ? { title: c.title, description: c.lead } : {};
}

export default async function InsightSectionPage({ params }: PageProps<"/design4/insight/[section]">) {
  const { section } = await params;
  return <SubPage href={`/insight/${section}`} />;
}
