import { permanentRedirect, notFound } from "next/navigation";
import { isSubjectId } from "@/lib/exam";

/**
 * 옛 응시 주소 (/exam/session/[과목]) — 유료시험 주소로 넘긴다.
 *
 * 갈래가 주소에 적히기 전에는 이 주소 하나가 무료도 되고 유료도 되었다(저장된
 * record.tier가 갈랐다). 지금은 /exam/session/paid/[과목]이 그 자리다. 남아 있는 링크와
 * 즐겨찾기가 404를 만나지 않게 여기서 넘겨준다.
 *
 * 과목이 아닌 것(/exam/session/paid 한 칸짜리 주소 따위)은 여기로 떨어지지 않게 막는다 —
 * 넘겨 보내면 제자리를 맴돈다.
 */
export default async function LegacySubjectSessionPage({
  params,
}: PageProps<"/exam/session/[subject]">) {
  const { subject } = await params;
  if (!isSubjectId(subject)) notFound();
  permanentRedirect(`/exam/session/paid/${subject}`);
}
