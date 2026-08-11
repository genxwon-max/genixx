import type { Metadata } from "next";
import SubPage from "@/components/site/SubPage";
import { pageContent, sectionsOf } from "@/lib/pageContent";

export function generateStaticParams() {
  return sectionsOf("/sample").map((section) => ({ section }));
}

export async function generateMetadata({
  params,
}: PageProps<"/sample/[section]">): Promise<Metadata> {
  const { section } = await params;
  const c = pageContent[`/sample/${section}`];
  return c ? { title: c.title, description: c.lead } : {};
}

export default async function SampleSectionPage({ params }: PageProps<"/sample/[section]">) {
  const { section } = await params;
  return <SubPage href={`/sample/${section}`} />;
}
