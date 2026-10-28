import type { Metadata } from "next";
import Link from "next/link";
import DesignIndex from "@/components/design/DesignIndex";

export const metadata: Metadata = {
  title: "디자인 화면 목록 2",
  robots: { index: false, follow: false },
};

/**
 * 디자인 화면 목록 2 (/design2) — 2026-10-28 수정분만 따로 모은 곳(사용자 요청). 원안지 양식(10.22)에 맞춘
 * 문항 상세와, 같은 날 요청한 응시 화면의 문항 체크 · 문항 이동판.
 *
 * 그 전까지의 디자인은 /design에 그대로 있다. 이 구역에 두는 화면은 lib/designScreens.ts에서
 * area: "design2"로 적는다.
 */
export default function Design2IndexPage() {
  return (
    <DesignIndex
      area="design2"
      title="디자인 화면 목록 2 — 10월 28일 수정분"
      lead={
        <>
          <p>
            「Genixx 지필 진단 문항 출제 원안지 양식(10.22)」에 맞춰 문항 상세에서 바뀐 것만 모았습니다 — 인지단계
            네 개 중 하나 고르기, 대상·교과·단원 한 줄과 성취기준 코드 자동 입력, Tag B 직접 입력, NCIC · 2022 확인,
            그림·삽화 사양, 인정 · 불인정 예, 이 문항의 특성, 제출 전 자가 체크리스트 12항.
          </p>
          <p className="mt-1.5">
            CBT 응시 화면(비회원 셋트 · 회원 무료 진단 · 회원 유료 진단)에는 문항 번호 위에 작은 「체크」 단추를 달고, 오른쪽 문항 이동판을 바꿨습니다 — 푼 문항은
            검정, 안 푼 문항은 옅은 회색, 체크한 문항은 체크 표시, 판 아래에 푼 · 안 푼 · 체크한 문항 수. 하단 바의
            「이전 · 다음」은 작게 줄여 가운데로, 「제출하기」는 같은 줄 오른쪽 끝(문항 이동판 아래)으로 옮겼습니다.
            머리의 「나가기」는 걷고 하단 바 왼쪽 끝의 톱니바퀴(글자 크기 · 바탕색) 맨 아래로 옮겼고, 보기 번호 동그라미를
            조금 줄였습니다. 제출한 뒤의 해석 작성(자가성찰) 화면도 응시 화면과 같은 틀로 맞췄습니다. 응시 창을 열면 표지보다 먼저
            듣기 · 말하기 · 화면 사용법을 한 단계씩 확인하는 응시 전 점검이 섭니다. 학생 대시보드 「내 진단」의 진단 한 건은
            응시 현황을 표 대신 과목 카드로 바꾼 시안을 두었습니다(설문 표는 걷고 「제출 완료」의 확인 창에서 설문을 확인).
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
