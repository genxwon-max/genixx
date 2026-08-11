import type { Metadata } from "next";
import Link from "next/link";
import Faq, { type FaqItem } from "@/components/Faq";
import PageHero from "@/components/PageHero";
import { ArrowRight } from "@/components/Icons";

export const metadata: Metadata = {
  title: "자주 묻는 질문",
  description: "진단·응시·결과 해석·개인정보·결제 5개 카테고리 FAQ. (PUB-06-1)",
};

const groups: { name: string; items: FaqItem[] }[] = [
  {
    name: "진단",
    items: [
      {
        q: "학력진단과 재능진단은 어떻게 다른가요?",
        a: "학력진단은 교과 성취 수준을 봅니다. 재능진단은 어떤 조건에서 몰입하고 어떤 방식으로 문제를 다루는지를 봅니다. 두 축은 서로 독립적이어서, 성적이 높지 않아도 특정 재능 축이 강하게 나타나는 경우가 흔합니다.",
      },
      {
        q: "몇 학년부터 볼 수 있나요?",
        a: "2026 파일럿 회차는 초등 3~4학년을 대상으로 합니다. 이후 학년은 문항 이독성 검증을 마친 뒤 순차적으로 확대합니다.",
      },
      {
        q: "결과에 등급이 나오나요?",
        a: "명사형 등급(A/B/C)은 사용하지 않습니다. 해당 발달 단계 상한 대비 현재 위치와, 관찰된 행동을 서술형으로 제시합니다.",
      },
    ],
  },
  {
    name: "응시",
    items: [
      {
        q: "한 번에 다 봐야 하나요?",
        a: "아닙니다. 본검사(세션 1)와 소개·설문(세션 2)은 별도 접속으로 나누어 진행합니다. 연속으로 보면 70분이 넘어 집중도가 떨어지기 때문입니다.",
      },
      {
        q: "중간에 인터넷이 끊기면요?",
        a: "응답은 자동 저장되며 재접속 시 이어서 진행할 수 있습니다. 남은 시간은 서버 기준으로 관리됩니다.",
      },
      {
        q: "부모가 옆에서 도와줘도 되나요?",
        a: "본검사 중에는 개입할 수 없습니다. 아이가 스스로 답한 내용이어야 해석이 가능하기 때문입니다. 대신 학부모 설문에서 관찰한 내용을 충분히 적어 주세요.",
      },
      {
        q: "포기하면 어떻게 되나요?",
        a: "해당 회차의 응시 기회가 소모되고 지금까지의 답안은 저장되지 않습니다. 남은 기회가 있으면 다시 응시할 수 있습니다.",
      },
    ],
  },
  {
    name: "결과 해석",
    items: [
      {
        q: "낮게 나온 영역은 약점인가요?",
        a: "아닙니다. 점수가 낮은 영역은 아직 발현되지 않은 영역입니다. 그 영역을 만날 기회가 적었을 수도 있고, 지금 발달 단계에서는 드러나기 어려울 수도 있습니다.",
      },
      {
        q: "결과는 언제 나오나요?",
        a: "AI 1차 분석에 1~2일, 이후 전문가 협진 판정과 리포트 승인을 거칩니다. 승인 전에는 어떤 결과도 공개되지 않습니다.",
      },
    ],
  },
  {
    name: "개인정보",
    items: [
      {
        q: "아이의 답변은 누가 보나요?",
        a: "보호자, 그리고 채점·판정에 참여하는 전문가만 열람합니다. 개인정보 열람은 사유 입력이 강제되고 전건이 감사 로그로 남습니다.",
      },
      {
        q: "동의를 철회하면 데이터는 어떻게 되나요?",
        a: "철회 요청 즉시 파기 큐에 등록되고, 처리 결과를 통지해 드립니다.",
      },
    ],
  },
  {
    name: "결제",
    items: [
      {
        q: "파일럿 회차도 비용이 드나요?",
        a: "2026 파일럿 회차는 전면 무료입니다. 정식 서비스 요금은 파일럿 종료 후 공지합니다.",
      },
      {
        q: "환불은 어떻게 하나요?",
        a: "리포트 발행 전에는 전액 환불됩니다. 발행 후에는 디지털 콘텐츠 제공이 완료된 것으로 보아 환불이 제한됩니다.",
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <>
      <PageHero
        eyebrow="PUB-06-1 · 자주 묻는 질문"
        title="궁금한 것부터 찾아보세요"
        desc="다섯 가지 주제로 나누어 정리했습니다. 여기에 없는 내용은 1:1 문의로 남겨 주세요."
        primary={{ label: "1:1 문의하기", href: "/support/inquiry" }}
      />

      <section className="section-y">
        <div className="container-x max-w-3xl space-y-12">
          {groups.map((g) => (
            <div key={g.name} id={g.name} className="scroll-mt-24">
              <h2 className="type-h2 font-black text-brand-950">{g.name}</h2>
              <div className="mt-5">
                <Faq items={g.items} />
              </div>
            </div>
          ))}

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
