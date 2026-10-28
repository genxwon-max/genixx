import type { Metadata } from "next";
import Link from "next/link";
import DesignIndex from "@/components/design/DesignIndex";

export const metadata: Metadata = {
  title: "디자인 화면 목록",
  robots: { index: false, follow: false },
};

/** 디자인 화면 목록 (/design) — 상태마다 나눈 주소를 한 장에 모은다 */
export default function DesignIndexPage() {
  return (
    <DesignIndex
      area="design"
      title="디자인 화면 목록"
      lead={
        <>
          <p>
            화면마다, 상태마다 주소를 따로 두었습니다. 로그인 전 · 로그인 후처럼 보는 사람에 따라 달라지는
            화면과 팝업이 열린 화면 · 닫힌 화면도 주소가 다릅니다. 화면의 값은 모두 예시로 적어 둔 것이고,
            단추는 다른 상태로 넘어가는 것만 눌립니다.
          </p>
          <p className="mt-1.5">
            원안지 양식(10.22)으로 고친 문항 상세는{" "}
            <Link href="/design2" className="font-semibold text-blue-700 hover:underline">
              /design2
            </Link>
            에 따로 모았습니다.
          </p>
        </>
      }
    />
  );
}
