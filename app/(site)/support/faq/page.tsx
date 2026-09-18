import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/PageHero";
import FaqGroups from "@/components/site/FaqGroups";
import { ArrowRight } from "@/components/Icons";

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
      <PageHero
        eyebrow="자주 묻는 질문"
        title="궁금한 것부터 찾아보세요"
        desc="다섯 가지 주제로 나누어 정리했습니다. 여기에 없는 내용은 1:1 문의로 남겨 주세요."
        primary={{ label: "1:1 문의하기", href: "/support/inquiry" }}
      />

      <section className="section-y">
        <div className="container-x space-y-12">
          <FaqGroups />

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-brand-50/70 px-7 py-7">
            <p className="type-h3 font-black text-brand-950">답을 찾지 못하셨나요?</p>
            <Link
              href="/support/inquiry"
              className="btn btn-md bg-brand-900 text-white hover:bg-brand-800"
            >
              1:1 문의하기
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
