import { notFound } from "next/navigation";
import ConsoleAs from "../ConsoleAs";

/* 서버가 읽는 목록이라 여기 둔다 — "use client" 파일의 값은 서버로 넘어오지 않는다 */
const consoleAsIds = ["admin", "author", "reviewer", "grader", "counselor"] as const;

export const metadata = { title: "권한별로 보기" };

/** 디자인 확인용 — /admin2/as/admin · author · reviewer · grader */
export default async function ConsoleAsPage({ params }: { params: Promise<{ who: string }> }) {
  const { who } = await params;
  const hit = consoleAsIds.find((w) => w === who);
  if (!hit) notFound();
  return <ConsoleAs key={hit} who={hit} me={false} />;
}
