"use client";

import { useRouter } from "next/navigation";
import type { CatalogRound } from "@/lib/catalogRounds";
import { designLinks } from "@/lib/designScreens";
import type { TrackId } from "@/lib/examCatalog";
import {
  ApplyConfirmView,
  ApplyDoneView,
  applyAction,
  type ApplyAction,
} from "@/components/exam/ApplyFlow";
import { BrowseTitle, CatalogView, tryAction } from "@/components/exam/ExamCatalog";
import ExamPaper from "@/components/exam/ExamPaper";
import StudentOnly from "@/components/exam/StudentOnly";
import { Head } from "@/components/student/self";
import DashFrame, { dashPeople } from "../DashFrame";
import { ExamSiteFrame } from "../ExamFrame";
import { flowRound, flowRounds, flowStudent, flowWallets } from "./studentFlow";

/**
 * 진단 목록 두 화면 — 디자인.
 *
 *   진단 접수      /student/apply   학생 대시보드에서 골라 접수한다 (WBS v4/new/22)
 *   진단 둘러보기   /exam            로그인하지 않은 사람이 골라 1셋트를 풀어 본다
 *
 * 접수 · 응시 · 정답과 해설 · 결과를 학생 대시보드 한 곳으로 모으면서(2026-10-12) 응시 존의
 * 「접수하기」 탭이 「진단 접수」로 옮겨 왔고, 응시 존에는 가입 전 사람의 둘러보기만 남았다.
 * 두 화면은 같은 목록(components/exam/ExamCatalog.tsx의 CatalogView)을 쓴다 — 줄 끝의 단추와
 * 모양만 다르다. 응시 존은 모서리를 세우고, 대시보드는 둥근 판과 알약 단추다.
 *
 * 목록과 접수 창은 실제 화면의 조각을 그대로 쓰고, 회차 · 응시권 · 접수 기록만 여기서 적어
 * 넘긴다(./studentFlow.ts). 검색 · 학년 고르기 · 보기 방식 · 쪽 넘김은 실제처럼 눌린다 —
 * 저장소를 읽지 않으므로 새로 고치면 주소가 가리키는 처음 모양으로 돌아온다.
 *
 * ── 접수되는 유형은 고르는 것이 아니다 ──
 * 응시권이 한 매라도 있으면 유료 진단으로, 없으면 무료 진단으로 접수된다. 그래서 접수 창은
 * 두 벌이다 — 응시권이 있는 학생의 창(…/confirm · …/done)과 없는 학생의 창(…/confirm/free ·
 * …/done/free). 목록은 두 학생에게 똑같이 보이고, 접수한 뒤의 줄만 「유료 진단 접수」 ·
 * 「무료 진단 접수」로 갈린다.
 */

/** 접수하는 진단 — 예시 한 건으로 굳혔다: 2026 4분기 · 초등 4학년 */
const ROUND = flowRound("2026-4");
const TRACK = flowStudent.track;

/** 「내 진단에서 보기」 · 「이 진단으로 가기」가 가는 디자인 주소 — 디자인이 있는 진단만 */
const examDesign: Record<string, string> = {
  "2026-4/e4/paid": "/design/student/exams/2026-4/e4",
  "2026-4/e4/free": "/design/student/exams/2026-4/e4/free",
  "2026-3/e4/paid": "/design/student/exams/2026-3/e4",
  "2026-1/e4/free": "/design/student/exams/2026-1/e4",
};

/** 실제 주소로 가는 단추를 디자인 주소로 돌린다 — 디자인이 없는 진단은 실제 주소 그대로 둔다 */
function inDesign(action: ApplyAction, round: CatalogRound, track: TrackId): ApplyAction {
  if (action.kind !== "done") return action;
  const href = examDesign[`${round.id}/${track}/${action.tier}`];
  return href ? { ...action, href } : action;
}

/* ───────────────────────── 진단 접수 ───────────────────────── */

export function StudentApplyScreen({ state }: { state: string }) {
  const router = useRouter();
  const to = designLinks("student-apply");

  /* 응시권이 없는 학생의 흐름인가 — 꼬리가 free로 끝나는 상태들 */
  const free = state.endsWith("free");
  const after = state.startsWith("done") || state.startsWith("applied");
  const guardian = state === "guardian";
  const wallet = after
    ? free
      ? flowWallets.appliedFree
      : flowWallets.appliedPaid
    : free
      ? flowWallets.noTicket
      : flowWallets.ticket;

  return (
    <DashFrame who="student" at="/student/apply" unread={2} bellHref="/design/student/alerts">
      <Head
        title="진단 접수"
        lead="분기와 학년을 골라 접수합니다. 응시권이 있으면 유료 진단으로, 없으면 무료 진단으로 접수되고, 접수한 진단은 「내 진단」에서 응시합니다."
      />

      <CatalogView
        /* 상태가 바뀌면 걸어 둔 조건도 그 상태의 처음 모양으로 돌아가야 한다 */
        key={state}
        rounds={flowRounds}
        skin="dash"
        mine={TRACK}
        actionOf={(round, track) => inDesign(applyAction(round, track, wallet, guardian), round, track)}
        /* 어느 줄을 눌러도 예시로 굳힌 진단의 접수 창이 뜬다 */
        onApply={() => router.push(to(free ? "confirm/free" : "confirm"))}
        initial={
          state === "card" ? { view: "card" } : state === "empty" ? { query: "중학교" } : undefined
        }
      />

      {state.startsWith("confirm") && (
        <ApplyConfirmView
          round={ROUND}
          track={TRACK}
          tier={free ? "free" : "paid"}
          left={free ? 0 : 1}
          onClose={() => router.push(to())}
          onConfirm={() => router.push(to(free ? "done/free" : "done"))}
        />
      )}

      {state.startsWith("done") && (
        <ApplyDoneView
          round={ROUND}
          track={TRACK}
          tier={free ? "free" : "paid"}
          onClose={() => router.push(to(free ? "applied/free" : "applied"))}
          goHref={examDesign[`${ROUND.id}/${TRACK}/${free ? "free" : "paid"}`]}
        />
      )}
    </DashFrame>
  );
}

/* ───────────────────────── 진단 둘러보기 ───────────────────────── */

export function ExamBrowseScreen({ state }: { state: string }) {
  /* 학생 — 실제 화면은 이 문장을 잠깐 보여 주고 곧바로 「내 진단」으로 넘긴다 */
  if (state === "student") {
    return (
      <ExamSiteFrame as="member">
        <ExamPaper>
          <div className="py-20 text-center text-[13px] text-exam-muted">내 진단으로 이동합니다…</div>
        </ExamPaper>
      </ExamSiteFrame>
    );
  }

  /* 보호자 — 응시할 사람이 아니라 학생 관리로 가는 길을 적는다 */
  if (state === "parent") {
    return (
      <ExamSiteFrame as="member" member={{ name: dashPeople.parent.name, home: "/design/my" }}>
        <ExamPaper>
          <StudentOnly role="parent" />
        </ExamPaper>
      </ExamSiteFrame>
    );
  }

  return (
    <ExamSiteFrame as="guest">
      <ExamPaper>
        <BrowseTitle />
        <CatalogView
          key={state}
          rounds={flowRounds}
          skin="exam"
          mine={null}
          /* 실제로는 고른 진단의 셋트가 뜬다. 디자인은 예시로 굳힌 셋트 화면 하나를 연다 */
          actionOf={() => tryAction("/design/exam/session/trial")}
          initial={
            state === "card" ? { view: "card" } : state === "empty" ? { query: "중학교" } : undefined
          }
        />
      </ExamPaper>
    </ExamSiteFrame>
  );
}
