import type { Metadata } from "next";
import OrgHome from "@/components/account/OrgHome";

export const metadata: Metadata = {
  title: "기관 대시보드 (시안 1)",
  robots: { index: false, follow: false },
};

/** ORG-01 기관 대시보드 — 시안 1 */
export default function OrgVariantPage() {
  return <OrgHome variant={1} />;
}
