import type { Metadata } from "next";
import SubPage from "@/components/site/SubPage";
import { pageContent, sectionsOf } from "@/lib/pageContent";

export function generateStaticParams() {
  return sectionsOf("/legal").map((doc) => ({ doc }));
}

export async function generateMetadata({ params }: PageProps<"/legal/[doc]">): Promise<Metadata> {
  const { doc } = await params;
  const c = pageContent[`/legal/${doc}`];
  return c ? { title: c.title, description: c.lead } : {};
}

export default async function LegalDocPage({ params }: PageProps<"/legal/[doc]">) {
  const { doc } = await params;
  return <SubPage href={`/legal/${doc}`} />;
}
