import { redirect } from "next/navigation";
import { firstPageOf } from "@/lib/nav";

/** 갈래 첫 화면으로 보낸다 — 헤더·푸터의 갈래 이름이 여기로 온다(lib/nav.ts firstPageOf) */
export default function PartnerPage() {
  redirect(firstPageOf("/partner"));
}
