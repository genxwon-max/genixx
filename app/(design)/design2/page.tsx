import type { Metadata } from "next";
import Link from "next/link";
import DesignIndex from "@/components/design/DesignIndex";

export const metadata: Metadata = {
  title: "디자인 화면 목록 2",
  robots: { index: false, follow: false },
};

/**
 * 디자인 화면 목록 2 (/design2) — 원안지 양식(10.22) 수정분만 따로 모은 곳(2026-10-28 요청).
 *
 * 그 전까지의 디자인은 /design에 그대로 있다. 이 구역에 두는 화면은 lib/designScreens.ts에서
 * area: "design2"로 적는다.
 */
export default function Design2IndexPage() {
  return (
    <DesignIndex
      area="design2"
      title="디자인 화면 목록 2 — 원안지 양식(10.22) 수정분"
      lead={
        <>
          <p>
            「Genixx 지필 진단 문항 출제 원안지 양식(10.22)」에 맞춰 문항 상세에서 바뀐 것만 모았습니다 — 인지단계
            네 개 중 하나 고르기, 대상·교과·단원 한 줄과 성취기준 코드 자동 입력, Tag B 직접 입력, NCIC · 2022 확인,
            그림·삽화 사양, 인정 · 불인정 예, 이 문항의 특성, 제출 전 자가 체크리스트 12항.
          </p>
          <p className="mt-1.5">
            그 전 디자인은{" "}
            <Link href="/design" className="font-semibold text-blue-700 hover:underline">
              /design
            </Link>
            에 있습니다.
          </p>
        </>
      }
    />
  );
}
