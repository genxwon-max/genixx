import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: "GENIXX 관리자",
  // 내부 콘솔이므로 검색엔진에 노출하지 않는다
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/">) {
  return <AdminShell>{children}</AdminShell>;
}
