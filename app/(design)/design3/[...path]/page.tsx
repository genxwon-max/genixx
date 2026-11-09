import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { designPathsOf, findDesign } from "@/lib/designScreens";
import FormsMinutes from "@/components/design/screens/FormsMinutes";
import StudentApplyFee from "@/components/design/screens/StudentApplyFee";
import StudentDashboard from "@/components/design/screens/StudentDashboard";
import StudentsCreate from "@/components/design/screens/StudentsCreate";
import "@/app/(admin2)/admin2.css";

/**
 * 디자인 보기 3 (/design3/…) — /design2/[...path]와 같은 일을 한다. 주소를 받아 그 화면 컴포넌트에
 * 상태를 넘긴다. 어떤 주소가 어느 화면인지는 lib/designScreens.ts(area: "design3")가 정한다.
 */
const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const screens: Record<string, React.ComponentType<{ state: string }>> = {
  "student-dashboard": StudentDashboard,
  "student-apply-fee": StudentApplyFee,
  "admin-forms-minutes": FormsMinutes,
  "admin-students-create": StudentsCreate,
};

export const dynamicParams = false;

export function generateStaticParams() {
  return designPathsOf("design3").map((path) => ({ path }));
}

export async function generateMetadata({
  params,
}: PageProps<"/design3/[...path]">): Promise<Metadata> {
  const { path } = await params;
  const hit = findDesign(path.join("/"), "design3");
  return {
    title: hit ? `${hit.screen.name} · ${hit.state.name}` : "디자인",
    robots: { index: false, follow: false },
  };
}

export default async function Design3Page({ params }: PageProps<"/design3/[...path]">) {
  const { path } = await params;
  const hit = findDesign(path.join("/"), "design3");
  const Screen = hit ? screens[hit.screen.id] : undefined;
  if (!hit || !Screen) notFound();

  const body = <Screen state={hit.state.slug} />;
  return hit.screen.zone === "admin2" ? <div className={`a2 ${mono.variable}`}>{body}</div> : body;
}
