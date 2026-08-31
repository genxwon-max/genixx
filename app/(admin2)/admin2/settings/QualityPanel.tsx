"use client";

import { maySelfReview, staffRoles } from "@/lib/admin";
import { queueCounts } from "@/lib/admin2";
import { useItems } from "@/lib/itemStore";
import {
  BORDER,
  ICC_TARGET,
  ROUTE_CUT,
  SAMPLE_MAX,
  SAMPLE_MIN,
  crossCells,
  openCodes,
  pickReasons,
  protocol,
  rubric,
} from "@/lib/expertStore";
import { DescList, Panel } from "@/components/admin2/ui";
import { row } from "./rows";

/**
 * 판정·품질 기준 — 이 판만 클라이언트다.
 *
 * 기준값(ROUTE_CUT · ICC_TARGET · BORDER …)이 lib/expertStore.ts에 있는데 그 파일은
 * 맨 위에 "use client"가 박혀 있다. 서버 컴포넌트에서 곧장 가져오면 상수가 아니라
 * 클라이언트 참조가 넘어와 화면에 그릴 수 없다. 그렇다고 숫자를 이 파일에 옮겨 적으면
 * 저쪽 임계값을 고친 날 설정 화면만 옛 숫자를 계속 보여 준다 — 설정 화면에서 그것이
 * 가장 나쁜 고장이다. 그래서 값을 베끼는 대신 판 하나를 경계 너머로 보냈다.
 *
 * 여기 값은 전부 기준(임계값·목표치)이라 회차가 지나도 움직이지 않는다. 움직이는
 * 것은 「지금 이 기준에 얼마나 닿았나」이고, 그것은 채점·협진 워크벤치의 몫이라
 * 이 화면에 끌어오지 않았다.
 */

/* 루브릭은 label만 쓰고 tone(text-emerald-700 …)은 버린다 — 저쪽 색은 /admin 팔레트라
   이 콘솔의 회색 열 단계와 섞이면 표 한 장에 두 벌의 색이 선다. */
const rubricText = (["full", "partial", "none"] as const)
  .map((k) => `${rubric[k].label} ${rubric[k].point}`)
  .join(" · ");

/* 자가 검수를 손으로 「관리자」라고 적지 않는다. 규칙은 함수 하나(maySelfReview)이고,
   나중에 다른 역할이 열리면 이 줄이 저절로 따라 바뀌어야 한다. */
const selfReview = staffRoles.filter((r) => maySelfReview(r.id)).map((r) => r.short);

export default function QualityPanel() {
  const itemsWaiting = useItems().filter((i) => i.state === "submitted").length;

  return (
    <Panel title="판정·품질 기준" meta="AI 제안값을 사람에게 넘기는 선">
      <DescList
        rows={[
          row(
            "저신뢰 자동 라우팅",
            <>
              확신도 <span className="a2-num">{ROUTE_CUT.toFixed(2)}</span> 미만은 사람에게
            </>,
            "lib/expertStore.ts",
          ),
          row(
            "AI-인간 일치도 목표",
            <>
              ICC ≥ <span className="a2-num">{ICC_TARGET.toFixed(2)}</span>
            </>,
            "lib/expertStore.ts",
          ),
          row(
            "개방형 코딩 표본",
            <span className="a2-num">
              {Math.round(SAMPLE_MIN * 100)}–{Math.round(SAMPLE_MAX * 100)}%
            </span>,
            "lib/expertStore.ts",
          ),
          /* 부호를 함께 적는다 — ±0.25는 「위아래 어느 쪽이든」이라는 뜻이고,
             0.25라고만 적으면 컷 위쪽만 유보하는 것으로 읽힌다. */
          row(
            "판정 컷 경계선",
            <>
              θ <span className="a2-num">±{BORDER.toFixed(2)}</span> 안이면 확정하지 않고 유보
            </>,
            "lib/expertStore.ts",
          ),
          row("채점 루브릭", <span className="a2-num">{rubricText}</span>, "lib/expertStore.ts"),
          row(
            "개방형 코딩 부호",
            <>
              <span className="a2-num">{openCodes.length}</span>가지 (&lsquo;불명&rsquo; 포함)
            </>,
            "lib/expertStore.ts",
          ),
          row(
            "크로스 판정 셀",
            <>
              <span className="a2-num">{crossCells.length}</span>칸
            </>,
            "lib/expertStore.ts",
          ),
          row(
            "면담 프로토콜",
            <>
              고정 질문 <span className="a2-num">{protocol.length}</span>문항 · 선발 사유{" "}
              <span className="a2-num">{pickReasons.length}</span>단
            </>,
            "lib/expertStore.ts",
          ),
          row("자가 검수 허용 역할", selfReview.join(" · "), "lib/admin.ts"),
          /* 왼쪽 기둥에 서는 숫자가 어떤 규칙으로 세어지는지. 다섯 다 목록에서 상태로
             걸러 센 값이라 목록이 바뀌면 기둥도 따라 바뀐다. 문항만 브라우저 저장소에서
             세므로 이 판이 클라이언트인 김에 여기서 함께 센다. */
          row(
            "대기 건수 집계",
            <>
              판정 <span className="a2-num">{queueCounts.cases}</span> · 승인{" "}
              <span className="a2-num">{queueCounts.approvals}</span> · 문항{" "}
              <span className="a2-num">{itemsWaiting}</span> · 문의{" "}
              <span className="a2-num">{queueCounts.inquiries}</span> · 리포트{" "}
              <span className="a2-num">{queueCounts.reports}</span>
            </>,
            "lib/admin2.ts",
          ),
        ]}
      />
    </Panel>
  );
}
