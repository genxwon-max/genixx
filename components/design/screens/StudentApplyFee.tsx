"use client";

import { useRouter } from "next/navigation";
import { examFee, type CatalogRound } from "@/lib/catalogRounds";
import { via2 } from "@/lib/designScreens";
import { applyAction, type ApplyAction } from "@/components/exam/ApplyFlow";
import { CatalogView, type FeeFilter } from "@/components/exam/ExamCatalog";
import { Head } from "@/components/student/self";
import DashFrame from "../DashFrame";
import { inDesign } from "./Catalogs";
import { flowRound, flowStudent, flowWallets } from "./studentFlow";

/**
 * 진단 접수 (실제 주소 /student/apply) — 검색 칸에 응시료 고르개(전체 · 무료 · 유료)를 얹은 시안
 * (/design3, 2026-11-09 사용자 요청 「조회 조건에 체크 버튼으로 전체 · 무료 · 유료」).
 *
 * 목록은 /design/student/apply와 같은 조각(components/exam/ExamCatalog.tsx의 CatalogView)에 feeFilter만
 * 켠 것이다. 무료 · 유료는 목록의 「응시료」 칸이 가르는 값 그대로다 — 응시료가 0원(무료)인 회차와 아닌 회차.
 *
 * /design의 예시 회차(./studentFlow.ts)는 모두 39,000원이라 무료를 고르면 목록이 빈다. 그래서 여기서만
 * 응시료가 0원인 회차를 섞었다 — 지금 접수 중인 「2026 가을 무료」 회차 하나와 지난 분기 둘(2026 2분기 ·
 * 2025 4분기). 학생 · 응시권 · 접수 기록은 /design과 같다(응시권 1매 남음).
 */

const free = (r: CatalogRound): CatalogRound => ({ ...r, price: 0, salePrice: null });

const rounds: CatalogRound[] = [
  flowRound("2027-1"),
  free({
    ...flowRound("2026-4"),
    id: "2026-F",
    label: "2026 가을 무료",
    opensOn: "2026-10-01",
    closesOn: "2026-11-30",
  }),
  flowRound("2026-4"),
  flowRound("2026-3"),
  free(flowRound("2026-2")),
  flowRound("2026-1"),
  free(flowRound("2025-4")),
  flowRound("2025-3"),
];

const feeOf: Record<string, FeeFilter> = { "": "all", free: "free", paid: "paid" };

/** 접수한 줄의 「내 진단에서 보기」 — /design2에 그 진단의 카드 화면이 있으면 그쪽으로(via2) */
const toDesign2 = (a: ApplyAction): ApplyAction => (a.kind === "done" ? { ...a, href: via2(a.href) } : a);

export default function StudentApplyFee({ state }: { state: string }) {
  const router = useRouter();

  return (
    <DashFrame who="student" at="/student/apply" unread={2} bellHref={via2("/design/student/alerts")}>
      <Head
        title="진단 접수"
        lead="분기와 학년을 골라 접수합니다. 응시권이 있으면 유료 진단으로, 없으면 무료 진단으로 접수되고, 접수한 진단은 「내 진단」에서 응시합니다."
      />

      <CatalogView
        /* 상태가 바뀌면 걸어 둔 조건도 그 상태의 처음 모양으로 돌아가야 한다 */
        key={state}
        rounds={rounds}
        skin="dash"
        mine={flowStudent.track}
        feeFilter
        initial={{ fee: feeOf[state] ?? "all" }}
        actionOf={(round, track) =>
          toDesign2(inDesign(applyAction(round, track, flowWallets.ticket, false), round, track))
        }
        /* 접수 창 — 응시료가 0원인 회차는 무료 진단의 창. /design2에 없으면 /design의 창이다 */
        onApply={(round) =>
          router.push(via2(`/design/student/apply/${examFee(round) === 0 ? "confirm/free" : "confirm"}`))
        }
      />
    </DashFrame>
  );
}
