"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { maskName } from "@/lib/adminUsers";
import { interviewTone } from "@/lib/admin2";
import { recordAccess, useAdminPrefs } from "@/lib/adminStore";
import { rounds } from "@/lib/admin";
import { useHydrated } from "@/lib/examStore";
import { reasonOf, topReason, useExpert } from "@/lib/expertStore";
import { channels, relations } from "@/lib/interviews";
import {
  clearSchedule,
  declineRequest,
  deskLabel,
  diffDays,
  interviewActions,
  seatOf,
  today,
  undoDecline,
  useInterview,
  useInterviewDesk,
  type Interview,
} from "@/lib/interviewStore";
import { Body, PageHead, Panel, SeedNote, Status, Tag } from "@/components/admin2/ui";
import SlotForm from "./SlotForm";

/**
 * EXP-06 면담 상세.
 *
 * 바깥 조각은 찾기와 「없는 면담」만 하고 초안을 들지 않는다. 찾은 뒤 안쪽 Desk가 판을
 * 세우고 거기에 key를 다시 준다 — 초안 훅을 이른 반환보다 위에 두려고 조각을 가른 것이다.
 *
 * ⚠ 폼은 useHydrated() 뒤에 세운다. useEditDraft가 useState(saved)로 **첫 렌더의 값을
 *   붙드는데**, 서버가 그린 씨앗 값으로 초안이 잡히면 저장분이 들어와도 초안은 그대로라
 *   dirty가 거짓으로 켜진다.
 *
 * ── 개인정보 ──
 * 신청자 이름·전화·메일을 **온전히 편다.** 한 사람을 붙들고 일하는 자리이고, 전화를 걸어
 * 시간을 맞추는 것이 이 화면이 하는 일이다. 「연락처 펴기」 단추를 세우지 않았다 — 이
 * 화면을 여는 까닭이 곧 그것이라 하루에 열 번 누르는 관문이 되고, 무엇보다 그 단추를 안
 * 누르고 화면만 열어 두는 길이 감사에 구멍으로 남는다. 대신 **판이 처음 그려질 때 한 번**
 * 열람을 남긴다(lib/adminStore.ts의 recordAccess).
 *
 * ⚠ 감사에 적는 이름은 가려서 넣는다. 감사 로그는 목록으로 펴 보는 화면이라 거기서 다시
 *   가려야 한다.
 *
 * ⚠ 학생 실명은 이 화면에도 세우지 않는다. seat이 이 콘솔의 학생 표기다.
 */
export default function InterviewDetail({ id }: { id: string }) {
  const row = useInterview(id);

  if (!row) {
    return (
      <>
        <PageHead
          title="찾지 못했습니다"
          back={
            <Link href="/admin2/interviews" className="a2-btn">
              ← 면담 신청
            </Link>
          }
        />
        <Body>
          <Panel title="없는 면담">
            <p className="a2-t-sm text-(--a2-ink-2)">
              <span className="a2-mono">{id}</span> 면담이 목록에 없습니다. 주소를 잘못 눌렀거나
              다른 브라우저에서 지운 건일 수 있습니다.
            </p>
          </Panel>
        </Body>
      </>
    );
  }

  return <Desk key={row.id} row={row} />;
}

/** 되돌릴 수 없는 동작 둘 — 초안에 넣지 않고 제 판을 세워 까닭을 받는다 */
type Ask = "decline" | "clear" | null;

function Desk({ row }: { row: Interview }) {
  const hydrated = useHydrated();
  const rows = useInterviewDesk();
  const { staffName } = useAdminPrefs();
  const by = staffName || "운영자";

  const [ask, setAsk] = useState<Ask>(null);
  const [why, setWhy] = useState("");
  const [done, setDone] = useState<string | null>(null);

  /* 감사 로그가 이 줄을 부르는 이름.
     여기서는 seatOf를 쓰지 않는다 — 응시번호가 없을 때 seatOf는 면담 번호를 돌려주는데,
     이 문자열은 면담 번호를 이미 앞에 달고 있어 「IV-2603-R18 · IV-2603-R18」이 된다.
     번호가 없으면 그 자리를 비운다.
     효과 밖에서 미리 뽑아 두는 까닭은 의존 목록이다 — 효과 안에서 row를 통째로 읽으면
     저장소가 조금만 움직여도 열람 기록이 다시 도는 모양이 된다 */
  const logTarget = row.seat ? `${row.id} · ${row.seat}` : row.id;

  /* 연락처를 펴는 순간 남긴다. 이 화면을 여는 것 자체가 열람이다.
     ⚠ 개발 모드에서 효과가 두 번 도므로(StrictMode) 표식으로 한 번만 남긴다 */
  const logged = useRef(false);
  useEffect(() => {
    if (!hydrated || !row.request || logged.current) return;
    logged.current = true;
    recordAccess(
      `${logTarget} ${maskName(row.request.applicant.name)}`,
      "면담 일정 조율",
      by,
    );
  }, [hydrated, row.request, logTarget, by]);

  const round = rounds.find((r) => r.id === row.round);
  const top = topReason(row.reasons);

  /* 프로토콜 기록과 코딩은 Interview에 펴 담지 않았다 — 일곱 문항이 목록·달력의 모든
     줄에 딸려 다니면 그 값이 화면 수만큼 복사된다. 실제로 그리는 이 한 자리에서만 읽는다 */
  const { interviews } = useExpert();
  const kase = interviews.find((c) => c.id === row.id) ?? null;
  const coded = kase?.coded ?? null;

  /**
   * 기록 한 줄 — 언제 · 무엇을 · 왜 · 누가.
   *
   * 두 저장소에서 모은다. 일정 처리는 이 콘솔의 log가 들고(lib/interviewStore.ts), 코딩
   * 확정은 전문가 콘솔이 든다(lib/expertStore.ts). 사람에게는 한 면담에 일어난 한 줄기라
   * 화면에서 합쳐 세운다 — 판을 둘로 가르면 「그래서 이 면담이 어떻게 됐나」를 두 군데를
   * 오가며 맞춰 보게 된다.
   *
   * 시각 꼴이 둘 다 "YYYY-MM-DD HH:MM"이라 글자로 견주면 그대로 시간 순이다. 오래된 것이
   * 위 — 이 목록은 훑어 내려가며 읽는 이력이지 「가장 최근」을 집어 오는 자리가 아니다.
   */
  const records = [
    ...row.log.map((l) => ({
      at: l.at,
      what: interviewActions[l.action],
      why: l.text,
      by: l.by,
      strong: false,
    })),
    ...(coded
      ? [{ at: coded.at, what: "코딩 확정", why: coded.summary, by: coded.by, strong: true }]
      : []),
  ].sort((a, b) => a.at.localeCompare(b.at));

  const back = (
    <Link href="/admin2/interviews" className="a2-btn">
      ← 면담 신청
    </Link>
  );

  const head = (
    <PageHead
      title={`${seatOf(row)} 면담`}
      back={back}
      actions={
        <>
          {row.date && (
            <Link href={`/admin2/interviews/calendar?on=${row.date}`} className="a2-btn">
              달력에서 보기
            </Link>
          )}
          {(row.state === "scheduled" || row.state === "recorded" || row.state === "coded") && (
            <Link href="/admin/interview" className="a2-btn">
              전문가 콘솔에서 기록
            </Link>
          )}
          {row.state === "declined" && (
            <button
              type="button"
              className="a2-btn"
              onClick={() => {
                undoDecline(row, by);
                setDone("반려를 물렀습니다. 다시 대상 목록에 섭니다.");
              }}
            >
              반려 무르기
            </button>
          )}
          {row.state === "applied" && (
            <button
              type="button"
              className="a2-btn a2-btn-danger"
              onClick={() => {
                setWhy("");
                setAsk("decline");
              }}
            >
              반려
            </button>
          )}
          {row.state === "scheduled" && (
            <button
              type="button"
              className="a2-btn a2-btn-danger"
              onClick={() => {
                setWhy("");
                setAsk("clear");
              }}
            >
              일정 지우기
            </button>
          )}
        </>
      }
    />
  );

  /* 저장분은 브라우저에만 있어 서버에서 그릴 값이 없다. 머리는 먼저 그려 화면이
     통째로 비지 않게 하고, 판은 하이드레이션 뒤에 세운다 */
  if (!hydrated) return head;

  const min = ask === "decline" ? 10 : 5;
  const ok = why.trim().length >= min;

  return (
    <>
      {head}
      <Body className="grid gap-3">
        {done && (
          <p className="a2-note" style={{ borderLeftColor: "var(--a2-ok)" }}>
            <span>{done}</span>
          </p>
        )}

        {/* 되돌릴 수 없는 둘 — 누르면 이 판이 서서 까닭을 받는다 */}
        {ask && (
          <Panel title={ask === "decline" ? "이 신청을 반려합니다" : "잡아 둔 일정을 지웁니다"}>
            <div className="grid gap-2">
              <p className="a2-t-sm text-(--a2-ink-2)">
                {ask === "decline"
                  ? "반려한 까닭은 신청자에게 그대로 나갑니다. 무엇 때문에 받지 않는지 적어 주세요."
                  : "이미 알린 일정입니다. 「왜 없어졌나」에 답할 수 있게 까닭을 적어 주세요. 지우면 상태가 선발됨으로 돌아갑니다."}
              </p>
              <textarea
                className="a2-textarea"
                rows={3}
                value={why}
                autoFocus
                placeholder={
                  ask === "decline"
                    ? "예: 응시 기록이 없어 면담 대상이 아닙니다. 다음 회차 접수 안내를 보냈습니다."
                    : "예: 보호자 사정으로 취소되었습니다. 다시 잡기로 했습니다."
                }
                onChange={(e) => setWhy(e.target.value)}
              />
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                <span className="mr-auto a2-t-xs text-(--a2-ink-4)">
                  {ok ? "" : `까닭을 ${min}자 이상 적어 주세요.`}
                </span>
                <button type="button" className="a2-btn" onClick={() => setAsk(null)}>
                  그만두기
                </button>
                <button
                  type="button"
                  className="a2-btn a2-btn-danger"
                  disabled={!ok}
                  onClick={() => {
                    const run = ask === "decline" ? declineRequest : clearSchedule;
                    if (!run(row, by, why)) return;
                    setAsk(null);
                    setDone(
                      ask === "decline"
                        ? "반려했습니다. 목록에서 회색으로 남습니다."
                        : "일정을 지웠습니다. 다시 잡아 주세요.",
                    );
                  }}
                >
                  {ask === "decline" ? "반려하기" : "일정 지우기"}
                </button>
              </div>
            </div>
          </Panel>
        )}

        {/* ① 이 면담 — 읽기만. 선발 사유가 곧 「무엇을 물어야 하는가」라 일정 폼 바로 위에 둔다 */}
        <Panel title="이 면담" meta={row.id} flush>
          <div className="a2-form">
            <Row label="회차">{round?.label ?? row.round}</Row>
            {/* 검사를 치르기 전에 들어온 신청에는 번호가 없다. 면담 번호로 메우지
                않는다 — 그 값은 이 판 머리에 이미 서 있다 */}
            <Row label="응시번호">
              {row.seat ? (
                <span className="a2-mono font-semibold text-(--a2-ink)">{row.seat}</span>
              ) : (
                <span className="a2-t-sm text-(--a2-ink-4)">아직 없습니다 (미응시)</span>
              )}
            </Row>
            <Row label="학년">{row.grade}</Row>
            <Row label="출처">
              {row.source === "request" ? <Tag accent>보호자·교사 신청</Tag> : <Tag>자동 선발</Tag>}
            </Row>
            <Row label="상태">
              <Status tone={interviewTone[row.state]}>{deskLabel[row.state]}</Status>
              {row.state === "declined" && row.declineWhy && (
                <span className="a2-t-sm text-(--a2-ink-2)">{row.declineWhy}</span>
              )}
            </Row>
            <Row label="선발 사유">
              <span className="grid w-full gap-1.5">
                <span className="flex flex-wrap items-center gap-1.5">
                  {row.reasons.map((id) => (
                    <Tag key={id} accent={reasonOf(id).rank <= 2}>
                      {reasonOf(id).label}
                    </Tag>
                  ))}
                </span>
                <span className="a2-hint">{top.why}</span>
              </span>
            </Row>
            {row.rawAt && (
              <Row label="옛 일정">
                <p className="a2-note w-full">
                  <span>
                    전문가 콘솔에 「{row.rawAt}」로 적혀 있었습니다. 날짜로 읽히지 않아 달력에
                    세우지 못합니다 — 아래에 날짜와 시각으로 다시 적어 주세요.
                  </span>
                </p>
              </Row>
            )}
          </div>
        </Panel>

        {/* ② 신청 — 신청이 있을 때만. 빈 판을 세우지 않는다 */}
        {row.request && (
          <Panel title="신청" meta={row.request.id} flush>
            <div className="a2-form">
              <Row label="신청자">
                <span className="font-semibold text-(--a2-ink)">{row.request.applicant.name}</span>
                <Tag>{relations[row.request.applicant.relation]}</Tag>
              </Row>
              <Row label="연락처">
                <span className="a2-mono">{row.request.applicant.phone}</span>
              </Row>
              <Row label="메일">
                <span className="a2-mono">{row.request.applicant.mail}</span>
              </Row>
              <Row label="신청 통로">{channels[row.request.channel]}</Row>
              <Row label="신청 일시">
                <span className="a2-mono">{row.request.appliedAt}</span>
                <span className="a2-t-sm text-(--a2-ink-3)">
                  {diffDays(row.request.appliedAt.slice(0, 10), today())}일 지남
                </span>
              </Row>
              <Row label="신청 글">
                <div className="a2-preview w-full a2-t-sm leading-[1.7] text-(--a2-ink-2)">
                  {row.request.want}
                </div>
              </Row>
            </div>
          </Panel>
        )}

        {/* ③ 이 화면의 본체 */}
        <SlotForm row={row} rows={rows} by={by} />

        {/*
         * ④ 기록 — 이 면담에 **무슨 일이 있었나** 한 줄씩.
         *
         * 여기 프로토콜 일곱 문항을 읽기로 펴 두었다가 걷어 냈다. 그것은 면담에서 오간
         * 말이지 이 화면에서 한 일이 아니고, 쓰는 자리도 저쪽(전문가 콘솔)이라 여기서는
         * 빈 상자 일곱이 서 있는 날이 대부분이었다. 「아직 적힌 기록이 없습니다」로 시작해
         * 왜 여기서 못 쓰는지를 설명하던 줄도 함께 없앴다 — 설명해야 하는 자리라면 그
         * 자리가 잘못 놓인 것이다.
         *
         * 남긴 것은 **언제 · 무엇을 · 왜 · 누가** 넷뿐이다. 판 안에 이름표 칸(Row)을 두지
         * 않고 목록만 세운다 — 줄이 열 개가 넘어도 같은 꼴로 이어지고, 이름표가 첫 줄
         * 옆에만 붙어 나머지를 딸린 것처럼 보이게 하지 않는다.
         *
         * 코딩 확정은 저쪽 저장소에 있지만 「언제 무엇을 왜」에 그대로 들어맞아 한 줄로
         * 끼워 넣는다. 이 줄이 없으면 면담이 끝났다는 사실 자체가 이 화면에서 사라진다.
         */}
        <Panel title="기록" meta={`${records.length}건`}>
          {records.length === 0 ? (
            <p className="a2-t-sm text-(--a2-ink-3)">아직 기록이 없습니다.</p>
          ) : (
            <ul className="grid gap-1.5">
              {records.map((r, k) => (
                <li
                  key={`${r.at}-${k}`}
                  className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b border-(--a2-line) pb-1.5 last:border-b-0 last:pb-0"
                >
                  <span className="a2-mono a2-t-xs text-(--a2-ink-4)">{r.at}</span>
                  <Tag accent={r.strong}>{r.what}</Tag>
                  <span className="a2-t-sm text-(--a2-ink-2)">{r.why}</span>
                  <span className="ml-auto a2-t-xs text-(--a2-ink-4)">{r.by}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </Body>

      <SeedNote>
        신청과 일정은 이 브라우저에만 저장됩니다(lib/interviewStore.ts). 면담 케이스·선발
        사유·코딩 확정은 전문가 콘솔의 저장소를 그대로 씁니다(lib/expertStore.ts). 사람
        데이터는 전부 화면 설계를 위한 예시입니다.
      </SeedNote>
    </>
  );
}

/* FormRow를 쓰면 req·hint를 넘기지 않는 자리에서도 이름이 길어진다. 이 화면은 읽기만 하는
   줄이 열 개가 넘어 짧은 이름 하나로 줄여 둔다 — 생김새는 같다(.a2-form-row) */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="a2-form-row">
      <div className="a2-form-label">{label}</div>
      <div className="a2-form-field">{children}</div>
    </div>
  );
}

