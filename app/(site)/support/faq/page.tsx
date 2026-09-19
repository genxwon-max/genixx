import type { Metadata } from "next";
import SubHero from "@/components/site/SubHero";
import FaqGroups from "@/components/site/FaqGroups";
import { NextStep } from "@/components/site/Article";

export const metadata: Metadata = {
  title: "자주 묻는 질문",
  description: "진단·응시·결과 해석·개인정보·결제 5개 카테고리 FAQ. (PUB-06-1)",
};

/*
 * 질문과 답은 여기 있지 않다.
 *
 * 콘솔의 「자주 묻는 질문」(ADM-15-1)이 고치는 값이고, 이 화면은 그것을 읽어 그린다
 * (lib/contentStore.ts). 화면 파일에 박아 두었을 때는 오탈자 하나에 배포가 필요했고,
 * 무엇보다 운영자가 손댈 수 없는 글이었다. 씨앗이 옮겨 오기 전 글 그대로라 이 화면에
 * 나가는 말은 달라지지 않는다.
 */

export default function FaqPage() {
  return (
    <>
      <SubHero
        href="/support/faq"
        title="자주 묻는 질문"
        lead="다섯 가지 주제로 나누어 정리했습니다. 여기에 없는 내용은 1:1 문의로 남겨 주세요."
      />

      <div className="container-x section-y">
        <FaqGroups />
        <div className="mt-12 md:mt-16">
          <NextStep
            text="답을 찾지 못하셨나요? 영업일 기준 1~2일 안에 답변드립니다."
            href="/support/inquiry"
            label="1:1 문의하기"
          />
        </div>
      </div>
    </>
  );
}
