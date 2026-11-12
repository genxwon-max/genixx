import type { Metadata } from "next";
import SubPage from "@/components/design4/site/SubPage";
import { pageContent, sectionsOf } from "@/lib/pageContent";

export function generateStaticParams() {
  return sectionsOf("/sample").map((section) => ({ section }));
}

export async function generateMetadata({
  params,
}: PageProps<"/design4/sample/[section]">): Promise<Metadata> {
  const { section } = await params;
  const c = pageContent[`/sample/${section}`];
  return c ? { title: c.title, description: c.lead } : {};
}

export default async function SampleSectionPage({ params }: PageProps<"/design4/sample/[section]">) {
  const { section } = await params;
  return <SubPage href={`/sample/${section}`} />;
}
