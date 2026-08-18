import Link from "next/link";
import {
  AnchorSection,
  Foldable,
  PageHead,
  PlannedSection,
} from "@/components/admin/Parts";
import AnchorPanel from "@/components/admin/AnchorPanel";
import FormBuilder from "@/components/admin/FormBuilder";
import ItemBank from "@/components/admin/ItemBank";
import PermissionGate from "@/components/admin/PermissionGate";
import * as a from "@/components/admin/ui";

export const metadata = { title: "문항 은행 · GENIXX 관리자" };

/** 문항이 거치는 단계. 순서를 그림 대신 글자로 적는다. */
const flow = [
  { step: "1", label: "작성", desc: "출제위원이 학년별 성취기준에 맞춰 만듭니다" },
  { step: "2", label: "교차 검수", desc: "작성자가 아닌 다른 사람이 반드시 봅니다" },
  { step: "3", label: "승인", desc: "승인된 문항만 회차에 배치할 수 있습니다" },
  { step: "4", label: "출제 후 점검", desc: "정답률이 너무 높거나 낮으면 사용을 멈춥니다" },
];

export default function ItemsPage() {
  return (
    <>
      <PageHead
        id="ADM-05"
        title="문항 은행"
        lead="검수를 지나 확정된 문항이 모이는 자리입니다. 여기서는 고르고 훑기만 합니다 — 만들고 고치는 일은 출제 워크벤치에서 합니다."
        action={
          /* 만드는 길은 하나여야 한다. 은행에도 만들기 버튼을 세워 두면 두 갈래가
             있는 줄 알게 되므로, 여기서는 그 자리로 보내기만 한다. */
          <Link href="/admin/authoring" className={a.btnPrimary}>
            출제 워크벤치에서 새로 만들기 →
          </Link>
        }
      />

      <PermissionGate need="item.review">
        {/* 단계 설명은 처음 한 번 읽으면 되는 글이다. 매일 오는 사람에게 화면 위쪽
            네 칸을 계속 내주지 않도록 접어 두고, 필요할 때만 펼치게 한다. */}
        <div className="mb-5">
          <Foldable title="문항이 거치는 네 단계">
            <ol>
              {flow.map((f) => (
                <li key={f.step} className="flex flex-wrap items-baseline gap-x-2.5 py-1.5">
                  <span className="adm-t-sm tabular-nums text-exam-muted">{f.step}</span>
                  <span className="adm-t-md font-bold text-exam-text">{f.label}</span>
                  <span className="adm-t-sm text-exam-muted">{f.desc}</span>
                </li>
              ))}
            </ol>
          </Foldable>
        </div>

        <AnchorSection
          id="ADM-04-1"
          title="문항 CRUD · 버전"
          lead="확정된 문항을 좌표·태그·난이도·상태로 훑습니다. 정답률이 90%를 넘거나 40% 아래로 떨어지면 변별이 되지 않아 다시 봅니다."
        >
          <ItemBank />
        </AnchorSection>

        <div className="mt-8 space-y-8">
          <AnchorSection
            id="ADM-04-2"
            title="앵커 문항"
            lead="회차가 달라도 같은 잣대로 재려면, 공개하지 않고 오래 쓰는 기준 문항이 필요합니다. 두 회차에 똑같이 들어간 문항이 있어야 점수를 견줄 수 있습니다(등화)."
          >
            <AnchorPanel />
          </AnchorSection>

          <AnchorSection
            id="ADM-04-3"
            title="검사지 조립"
            lead="승인된 문항을 골라 한 회차의 검사지를 만듭니다. 기계가 조합을 제안하고 사람이 확정합니다."
          >
            <FormBuilder />
          </AnchorSection>

          <PlannedSection
            id="ADM-04-4"
            title="문항 회전 · 보안"
            lead="같은 문항이 같은 자리에 계속 나오면 문항이 새어 나갑니다."
            todo={[
              "응시자별 동적 할당 — 57문항 중 55문항처럼 겹치되 같지 않게",
              "캡처·드래그 차단과 그 한계를 함께 적기 (막을 수 있는 것과 없는 것)",
              "문항별 노출 횟수와 마지막 사용 회차 — 회전 판단의 근거",
            ]}
          />
        </div>
      </PermissionGate>
    </>
  );
}
