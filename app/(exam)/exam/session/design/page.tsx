import { redirect } from "next/navigation";
import { designs } from "@/lib/examDesign";

/** 유형을 적지 않은 주소 — 첫 유형으로 보낸다 */
export default function ExamDesignIndexPage() {
  redirect(`/exam/session/design/${designs[0].id}`);
}
