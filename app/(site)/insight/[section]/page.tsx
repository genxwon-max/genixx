import type { Metadata } from "next";
import SubPage from "@/components/site/SubPage";
import { pageContent, sectionsOf } from "@/lib/pageContent";

export function generateStaticParams() {
  return sectionsOf("/insight").map((section) => ({ section }));
}

export async function generateMetadata({
  params,
}: PageProps<"/insight/[section]">): Promise<Metadata> {
  const { section } = await params;
  const c = pageContent[`/insight/${section}`];
  return c ? { title: c.title, description: c.lead } : {};
}

export default async function InsightSectionPage({ params }: PageProps<"/insight/[section]">) {
  const { section } = await params;
  return <SubPage href={`/insight/${section}`} />;
}
