import Image from "next/image";
import RadarChart from "./RadarChart";
import StudentFigure from "./art/StudentFigure";
import { BotIcon, ChartUpIcon } from "./Icons";
import { findPublicImage } from "@/lib/assets";

const sample = [
  { label: "창의력", value: 88 },
  { label: "문제해결력", value: 74 },
  { label: "의사소통력", value: 66 },
  { label: "자기주도성", value: 79 },
  { label: "융합사고력", value: 71 },
  { label: "리터러시", value: 62 },
  { label: "디지털역량", value: 84 },
];

/**
 * 히어로 비주얼.
 * - public/hero-visual.*  : 카드까지 포함된 완성 이미지 → 그대로 사용
 * - public/hero-student.* : 학생 사진(누끼)만 → 아래 카드 구성과 합성
 * - 둘 다 없으면 SVG 일러스트로 대체
 */
export default function HeroVisual() {
  const composed = findPublicImage("hero-visual");
  if (composed) {
    return (
      <figure className="relative overflow-hidden rounded-3xl bg-white shadow-float ring-1 ring-brand-100/80">
        <Image
          src={composed.src}
          alt="지능 검사 결과 그래프를 함께 보며 이야기하는 선생님과 학생. 8가지 핵심 지능 영역 분석과 맞춤 학습 방향 안내"
          width={composed.width}
          height={composed.height}
          sizes="(max-width: 639px) 92vw, (max-width: 1279px) 780px, 1000px"
          quality={90}
          priority
          className="h-auto w-full"
        />
      </figure>
    );
  }

  const student = findPublicImage("hero-student");

  return (
    <div className="@container relative aspect-[7/4.1] w-full">
      {/* 배경 원 */}
      <span
        aria-hidden
        className="absolute left-[24%] top-[4%] aspect-square w-[46%] rounded-full bg-[#dbe5f9]/75"
      />
      <span
        aria-hidden
        className="absolute bottom-[16%] left-[8%] aspect-square w-[13%] rounded-full bg-[#e5ecfb]"
      />

      {/* 학생 */}
      <div className="absolute bottom-0 left-1/2 w-[38%] -translate-x-1/2">
        {student ? (
          <Image
            src={student.src}
            alt="교복을 입고 밝게 웃는 학생"
            width={student.width}
            height={student.height}
            sizes="(max-width: 1024px) 40vw, 250px"
            priority
            className="h-auto w-full"
          />
        ) : (
          <StudentFigure className="h-auto w-full" />
        )}
      </div>

      {/* 책상 */}
      <span
        aria-hidden
        className="absolute bottom-[3%] left-[12%] right-[10%] h-[2.5%] rounded-full bg-white/70"
      />

      {/* AI 재능 분석 결과 카드 */}
      <div className="absolute left-0 top-[9%] w-[42%] rounded-[clamp(10px,2.4cqw,20px)] bg-white/95 p-[clamp(8px,2.2cqw,18px)] shadow-float backdrop-blur">
        <p className="text-center text-[clamp(9px,2.1cqw,14px)] font-bold text-brand-900">
          AI 재능 분석 결과
        </p>
        <RadarChart data={sample} size={260} labelSize={11} className="mt-[2%]" />
      </div>

      {/* 성장 잠재력 카드 */}
      <div className="absolute right-0 top-[4%] flex w-[31%] items-center justify-between gap-[3%] rounded-[clamp(8px,2cqw,16px)] bg-white p-[clamp(7px,1.9cqw,15px)] shadow-float">
        <div className="min-w-0">
          <p className="text-[clamp(7px,1.5cqw,11px)] font-medium text-slate-500">성장 잠재력</p>
          <p className="mt-[2px] text-[clamp(10px,2.4cqw,17px)] font-black text-emerald-600">
            상위 12%
          </p>
        </div>
        <ChartUpIcon className="w-[22%] shrink-0 text-emerald-500" />
      </div>

      {/* 맞춤 프로젝트 추천 카드 */}
      <div className="absolute right-0 top-[45%] flex w-[34%] items-center justify-between gap-[3%] rounded-[clamp(8px,2cqw,16px)] bg-white p-[clamp(7px,1.9cqw,15px)] shadow-float">
        <div className="min-w-0">
          <p className="text-[clamp(7px,1.5cqw,11px)] font-medium text-slate-500">
            맞춤 프로젝트 추천
          </p>
          <p className="mt-[2px] text-[clamp(10px,2.4cqw,17px)] font-black text-brand-900">
            AI 로봇 개발자
          </p>
        </div>
        <BotIcon className="w-[20%] shrink-0 text-brand-500" />
      </div>
    </div>
  );
}
