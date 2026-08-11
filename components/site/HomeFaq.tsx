import Link from "next/link";
import Faq, { type FaqItem } from "@/components/Faq";
import SectionHead from "./SectionHead";
import { ArrowRight } from "@/components/Icons";

/** 홈에서 먼저 걸리는 질문들. 자세한 답변은 /support/faq 로 이어진다. */
const items: FaqItem[] = [
  {
    q: "무료 학력진단은 정말 아무 비용 없이 볼 수 있나요?",
    a: "네. 2026 파일럿 회차는 전면 무료입니다. 결제 수단을 등록하지 않아도 되고, 진단이 끝난 뒤 자동으로 유료로 전환되는 구조도 없습니다. 정식 서비스 요금은 파일럿이 끝난 뒤 별도로 공지합니다.",
  },
  {
    q: "학력진단과 재능진단은 뭐가 다른가요?",
    a: "학력진단은 지금 교과 내용을 어디까지 이해하고 있는지를 봅니다. 재능진단은 어떤 조건에서 몰입하고 어떤 방식으로 문제를 다루는지를 봅니다. GENIXX는 이 둘을 별개의 축으로 두고 교차해서 보기 때문에, 성적이 높지 않아도 특정 재능 축이 뚜렷하게 나타나는 경우를 놓치지 않습니다.",
  },
  {
    q: "결과에 등급이나 순위가 나오나요?",
    a: "아닙니다. A·B·C 같은 명사형 등급은 쓰지 않습니다. 또래와 줄을 세우는 대신 해당 발달 단계의 상한 대비 지금 어디쯤인지, 그리고 실제로 관찰된 행동이 무엇인지를 서술형으로 제시합니다. 이 원칙은 진단 윤리 헌장에 문서로 공개되어 있습니다.",
  },
  {
    q: "점수가 낮게 나온 영역은 우리 아이의 약점인가요?",
    a: "아닙니다. 낮게 나온 영역은 '없는 재능'이 아니라 '아직 발현되지 않은 영역'으로 표기합니다. 그 영역을 만날 기회가 적었을 수도 있고, 지금 발달 단계에서는 드러나기 어려울 수도 있습니다. 리포트에도 같은 문구가 그대로 들어갑니다.",
  },
  {
    q: "AI가 아이를 판정하는 건가요?",
    a: "AI는 판정하지 않습니다. AI가 지필·설문·면담 데이터를 1차로 분석해 제안값을 만들고, 교육전문가가 케이스 회의에서 이를 검토해 확정합니다. 전문가 승인 전에는 어떤 결과도 학부모 화면에 노출되지 않으며, 판정 컷 경계에 있는 사례는 확정하지 않고 다음 회차 재관찰로 넘깁니다.",
  },
  {
    q: "아이가 검사받는 데 시간이 얼마나 걸리나요?",
    a: "국어(언어)·수학·과학을 한 번에 몰아 보지 않고 과목별로 따로 응시합니다. 한 과목은 4문항에 제한 시간 40분이며, 하루에 한 과목씩 나눠 봐도 됩니다. 세 과목을 모두 제출해야 결과 분석이 시작됩니다.",
  },
  {
    q: "부모가 옆에서 도와줘도 되나요?",
    a: "본검사 중에는 개입할 수 없습니다. 아이가 스스로 답한 내용이어야 해석이 가능하기 때문입니다. 대신 학부모 설문에서 가정에서 관찰한 모습을 충분히 적어 주시면, 검사만으로는 보이지 않는 부분을 보완할 수 있습니다.",
  },
  {
    q: "학부모 설문을 꼭 해야 하나요?",
    a: "필수는 아닙니다. 응시 기록 화면에서 '학부모 설문 없이 검사 진행'을 선택하면 학생 응답만으로 분석합니다. 다만 리포트의 '발견의 순간'처럼 보호자 관찰을 바탕으로 하는 항목은 제공되지 않습니다.",
  },
  {
    q: "아이도 따로 계정을 만들어야 하나요?",
    a: "아닙니다. 학생은 독립 회원가입 경로가 없습니다. 학부모 계정 안의 프로필로 등록되고, 응시할 때는 보호자 화면에서 발급한 8자리 접속코드와 생년월일로 들어갑니다. 학생 화면에서는 결제 정보나 형제자매의 결과가 보이지 않습니다.",
  },
  {
    q: "아이의 답변은 누가 보게 되나요?",
    a: "보호자, 그리고 채점·판정에 참여하는 전문가만 열람합니다. 개인정보 열람 시에는 사유 입력이 강제되고 누가 언제 무엇을 봤는지 전건이 감사 로그로 남습니다. 동의를 철회하시면 즉시 파기 절차에 들어가고 처리 결과를 통지해 드립니다.",
  },
];

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
