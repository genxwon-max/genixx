import type { Metadata } from "next";
import SubPage from "@/components/site/SubPage";
import { pageContent, sectionsOf } from "@/lib/pageContent";

export function generateStaticParams() {
  return sectionsOf("/service").map((section) => ({ section }));
}

export async function generateMetadata({
  params,
}: PageProps<"/service/[section]">): Promise<Metadata> {
  const { section } = await params;
  const c = pageContent[`/service/${section}`];
  return c ? { title: c.title, description: c.lead } : {};
}

export default async function ServiceSectionPage({ params }: PageProps<"/service/[section]">) {
  const { section } = await params;
  return <SubPage href={`/service/${section}`} />;
}
