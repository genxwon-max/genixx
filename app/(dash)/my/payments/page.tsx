import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PaymentHub from "@/components/account/PaymentHub";

export const metadata: Metadata = {
  title: "결제",
  description: "재능 진단과 면담을 결제합니다. 진단은 결제와 동시에 접수됩니다. (PAY-03)",
  robots: { index: false, follow: false },
};

/**
 * PAY-03 결제 — 회원 존 안에서 연다. 갈래는 둘, 진단평가와 면담(?tab=counsel).
 *
 * 응시권 결제(/exam/payment)는 응시 존 껍데기를 쓰는 옛 화면이라 상품 목록이 코드에
 * 박혀 있고 학생을 고를 수 없다. 이 자리는 **열려 있는 평가를 골라 아이 앞으로 접수까지**
 * 하는 곳이다. 여기서 학생을 고르고 「다음」을 누르면 상품 화면(/my/payments/checkout)이 선다.
 *
 * 아이를 ?students=로 들고 오면 이미 고른 것이라 상품 화면으로 곧장 넘긴다 — 예전 주소로
 * 들어와도 같은 곳에 닿게.
 */
export default async function MyPaymentsPage({ searchParams }: PageProps<"/my/payments">) {
  const { students, tab } = await searchParams;
  const carried = (Array.isArray(students) ? students.join(",") : (students ?? ""))
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (carried.length > 0) {
    redirect(`/my/payments/checkout?students=${carried.map(encodeURIComponent).join(",")}`);
  }

  return <PaymentHub tab={(Array.isArray(tab) ? tab[0] : tab) === "counsel" ? "counsel" : "exam"} />;
}
