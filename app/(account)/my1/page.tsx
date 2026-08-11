import type { Metadata } from "next";
import ParentHome from "@/components/account/ParentHome";

export const metadata: Metadata = {
  title: "학부모 홈 (시안 1)",
  robots: { index: false, follow: false },
};

/** ACC-03 학부모 홈 — 시안 1 */
export default function MyVariantPage() {
  return <ParentHome variant={1} />;
}
