"use client";

import Link from "next/link";
import Faq, { type FaqItem } from "@/components/Faq";
import { renderDetail } from "@/lib/richText";
import { homeFaqs, useContent } from "@/lib/contentStore";
import SectionHead from "./SectionHead";
import { ArrowRight } from "@/components/Icons";

/*
 * 홈에서 먼저 걸리는 질문들 — **목록은 여기 있지 않다.**
 *
 * 홈과 고객지원(PUB-06-1)이 각자 제 목록을 들고 있었다. 겹치는 여섯 개는 같은 질문에
 * 서로 다른 답이 적혀 있었고, 한쪽만 고쳐지는 날이 오는 것은 시간 문제였다. 지금은
 * 콘솔이 고치는 목록 하나에서(lib/contentStore.ts · ADM-15-1) 「홈에도 보임」을 켠
 * 것만 가져다 쓴다.
 *
 * ⚠ 저장소가 브라우저에 있어 이 조각은 클라이언트에서 돈다. 서버가 그리는 첫 화면에는
 *   씨앗이 나가고, 그 씨앗이 합치기 전 홈에 있던 글 그대로다.
 */

/** FAQ만으로 해결되지 않을 때 이어서 보는 자료 */
const guides = [
  {
    tag: "안내 영상",
    label: "학부모 설명회",
    desc: "5~7분 분량으로 진단 흐름을 먼저 봅니다",
    href: "/support/orientation",
  },
  {
    tag: "해석 가이드",
    label: "샘플 리포트 읽는 법",
    desc: "좌표와 유형 표기를 어떻게 읽는지",
    href: "/sample/report",
  },
  {
    tag: "윤리 기준",
    label: "진단 윤리 헌장",
    desc: "등급을 쓰지 않는 이유와 데이터 취급 원칙",
    href: "/about/charter",
  },
];

export default function HomeFaq() {
  const content = useContent();
  const items: FaqItem[] = homeFaqs(content).map((f) => ({
    q: f.q,
    a: f.a.mode === "text" ? f.a.body : "",
    html: f.a.mode === "text" ? undefined : renderDetail(f.a.mode, f.a.body, f.a.images),
  }));

  return (
    <section className="section-y bg-brand-50/50">
      <div className="container-x">
        {/* 머리말은 위, 질문 목록은 아래 전체 폭으로 */}
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHead
            eyebrow="자주 묻는 질문"
            title="시작하기 전에 가장 많이 묻는 것들"
            lead="비용, 결과를 읽는 법, 아이가 실제로 하는 일까지. 여기에 없는 내용은 언제든 문의로 남겨 주세요."
          />
          <div className="flex flex-wrap gap-2">
            <Link
              href="/support/faq"
              className="btn btn-md bg-brand-900 text-white hover:bg-brand-800"
            >
              전체 FAQ 보기
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/support/inquiry"
              className="btn btn-md border border-brand-200 bg-white text-brand-800 hover:border-brand-400"
            >
              1:1 문의
            </Link>
          </div>
        </div>

        <div className="mt-10">
          <Faq items={items} />

          {/* 커리어넷처럼 FAQ 아래에 참고자료 묶음을 둔다 */}
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-3">
            {guides.map((g) => (
              <li key={g.href}>
                <Link
                  href={g.href}
                  className="group flex h-full flex-col rounded-2xl border border-brand-100 bg-white p-5 transition-colors hover:border-brand-300"
                >
                  <span className="type-eyebrow text-brand-500">{g.tag}</span>
                  <span className="type-h4 mt-2 font-black text-brand-950">{g.label}</span>
                  <span className="type-meta mt-1 flex-1 text-slate-500">{g.desc}</span>
                  <span className="type-meta mt-3 inline-flex items-center gap-1.5 font-bold text-brand-700">
                    바로가기
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
