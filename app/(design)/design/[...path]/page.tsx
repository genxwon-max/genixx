import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { designPaths, findDesign } from "@/lib/designScreens";
import Approvals from "@/components/design/screens/Approvals";
import { MyBell, MyNotifications, StudentBell } from "@/components/design/screens/Bells";
import { ConsoleLogin, ExpertWaitingScreen } from "@/components/design/screens/ConsoleEntry";
import ConsoleMe from "@/components/design/screens/ConsoleMe";
import ConsultProducts from "@/components/design/screens/ConsultProducts";
import ExpertSignup from "@/components/design/screens/ExpertSignup";
import Experts from "@/components/design/screens/Experts";
import InterviewRecord from "@/components/design/screens/InterviewRecord";
import Mails from "@/components/design/screens/Mails";
import Metrics from "@/components/design/screens/Metrics";
import MyInterview, { StudentInterview } from "@/components/design/screens/MyInterview";
import StudentNew from "@/components/design/screens/StudentNew";
import "@/app/(admin2)/admin2.css";

/**
 * 디자인 보기 (/design/…) — 화면 한 장, 상태 하나마다 주소 하나.
 *
 * 어떤 주소가 어떤 화면의 어떤 상태인지는 lib/designScreens.ts가 정한다. 이 파일은 주소를
 * 받아 그 화면 컴포넌트에 상태를 넘길 뿐이다. 목록에 없는 주소는 열리지 않는다.
 *
 * 운영 콘솔 화면은 콘솔의 글꼴과 색(.a2 · admin2.css)을 입어야 해서 여기서 한 번 감싼다.
 */
const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const screens: Record<string, React.ComponentType<{ state: string }>> = {
  "expert-signup": ExpertSignup,
  "expert-waiting": ExpertWaitingScreen,
  approvals: Approvals,
  "console-login": ConsoleLogin,
  "console-me": ConsoleMe,
  "student-new": StudentNew,
  "consult-products": ConsultProducts,
  metrics: Metrics,
  "interview-record": InterviewRecord,
  "my-interview": MyInterview,
  "student-interview": StudentInterview,
  "my-bell": MyBell,
  "my-notifications": MyNotifications,
  "student-bell": StudentBell,
  experts: Experts,
  mail: Mails,
};

export const dynamicParams = false;

export function generateStaticParams() {
  return designPaths.map((path) => ({ path }));
}

export async function generateMetadata({
  params,
}: PageProps<"/design/[...path]">): Promise<Metadata> {
  const { path } = await params;
  const hit = findDesign(path.join("/"));
  return {
    title: hit ? `${hit.screen.name} · ${hit.state.name}` : "디자인",
    robots: { index: false, follow: false },
  };
}

export default async function DesignPage({ params }: PageProps<"/design/[...path]">) {
  const { path } = await params;
  const hit = findDesign(path.join("/"));
  const Screen = hit ? screens[hit.screen.id] : undefined;
  if (!hit || !Screen) notFound();

  const body = <Screen state={hit.state.slug} />;
  return hit.screen.zone === "admin2" ? <div className={`a2 ${mono.variable}`}>{body}</div> : body;
}
