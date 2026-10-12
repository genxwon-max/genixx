import Link from "next/link";
import {
  accessReasons,
  can,
  currentRound,
  maySelfReview,
  permissionIds,
  staffRoles,
  stubSections,
  userActions,
} from "@/lib/admin";
import { queueCounts } from "@/lib/admin2";
import { designLinks } from "@/lib/designScreens";
import { assessment, levels, questionCountText, subjects, totalQuestions } from "@/lib/exam";
import { company } from "@/lib/site";
import { Body, DescList, FormRow, PageHead, Panel, SeedNote, Tag } from "@/components/admin2/ui";
import ConsoleFrame from "../ConsoleFrame";

/**
 * 시스템 설정 — 면담 설정 (실제 주소 /admin2/settings · WBS L.2.14) — 디자인.
 *
 * 지금 화면(app/(admin2)/admin2/settings)은 읽기 전용 요약 네 판이다. 그 네 판은 그대로 두고 맨 위에
 * 「면담 설정」을 더했다 — 이 화면에서 처음으로 값을 수정하는 판이다.
 *
 *  · 자동 배정 — 켜 두면 신청자가 상담사를 고르지 않은 신청(「관리자 배정 요청」)을 결제가 끝나는
 *    대로 배정한다. 기준은 분야 일치 → 그 시간에 가능 → 이번 주 배정이 가장 적은 사람. 끄면 모든
 *    신청이 배정 대기로 들어온다.
 *  · 결과 기록 기한 — 면담이 끝난 뒤 며칠 안에 상담사가 기록을 내야 하는가 (기본값 1일)
 *  · 자동 종료 — 기록을 제출한 뒤 며칠이 지나면 승인 없이 종료하는가 (기본값 7일)
 *
 * 값을 바꾸면 다른 상세 화면처럼 화면 아래 저장 줄이 켜지고, 바뀐 칸에 「수정됨」이 붙는다.
 *
 * 아래 네 판의 값은 실제 화면과 같은 파일(lib/exam.ts · lib/admin.ts · lib/site.ts)에서 읽는다.
 * 브라우저 저장소 파일(lib/expertStore.ts · lib/itemStore.ts)에 있는 값만 이 파일에 적어 넣었다.
 */

const to = designLinks("settings-interview");

type Slug = "interview" | "interview/edit" | "interview/manual" | "interview/error" | "interview/saved";

const valuesOf: Record<Slug, { auto: boolean; due: string; close: string; saved: string }> = {
  interview: { auto: true, due: "1", close: "7", saved: "2026-10-10 17:20" },
  "interview/edit": { auto: true, due: "2", close: "10", saved: "2026-10-10 17:20" },
  "interview/manual": { auto: false, due: "1", close: "7", saved: "2026-10-05 09:20" },
  "interview/error": { auto: true, due: "0", close: "7", saved: "2026-10-10 17:20" },
  "interview/saved": { auto: true, due: "2", close: "10", saved: "2026-10-12 10:52" },
};

/** 자동 배정이 상담사 한 명을 고르는 순서 */
const criteria = [
  { k: "분야 일치", v: "신청한 상담 주제를 맡는 상담사" },
  { k: "그 시간에 가능", v: "근무 시간 안이고, 휴무일이 아니며, 다른 면담과 겹치지 않는 상담사" },
  { k: "이번 주 배정이 가장 적은 사람", v: "건수가 같으면 마지막 배정이 가장 오래된 상담사" },
];

const red = { color: "var(--a2-danger)" };

/** 설정 한 줄 — 이름 : 값 : 그 값이 있는 파일 (실제 화면의 rows.tsx와 같다) */
function row(k: string, v: React.ReactNode, src: string) {
  return {
    k,
    v: (
      <span className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 flex-1">{v}</span>
        <span className="a2-mono a2-t-xs shrink-0 text-(--a2-ink-4)">{src}</span>
      </span>
    ),
  };
}

const limits = Array.from(new Set(subjects.map((s) => s.limitMin)));
const limitText = limits.length === 1 ? `${limits[0]}분` : limits.map((v) => `${v}분`).join(" · ");
const totalMin = subjects.reduce((sum, s) => sum + s.limitMin, 0);
const systemRoles = staffRoles.filter((r) => can(r.id, "system.manage")).map((r) => r.short);
const selfReview = staffRoles.filter((r) => maySelfReview(r.id)).map((r) => r.short);
const stub = stubSections.settings;

function Edited() {
  return (
    <span className="a2-t-xs font-bold" style={{ color: "var(--a2-warn)" }}>
      수정됨
    </span>
  );
}

export default function SettingsInterview({ state }: { state: string }) {
  const slug = state as Slug;
  const v = valuesOf[slug];
  const edit = slug === "interview/edit";
  const bad = slug === "interview/error";

  return (
    <ConsoleFrame at="/admin2/settings">
      <PageHead title="시스템 설정" />

      <Body>
        {slug === "interview/saved" && (
          <p className="a2-note mb-3" style={{ borderLeftColor: "var(--a2-ok)" }}>
            <span>
              <b className="text-(--a2-ink)">면담 설정을 저장했습니다.</b> 결과 기록 기한 2일 · 자동 종료 10일 — 지금부터
              끝나는 면담에 적용됩니다.
            </span>
          </p>
        )}

        {/* ── 면담 설정 — 이 화면에서 수정하는 유일한 판 ── */}
        <Panel title="면담 설정" lead flush className="mb-3">
          <div className="a2-form">
            <FormRow
              label="자동 배정"
              hint="맞는 상담사가 없으면 배정하지 않고 배정 대기로 둡니다. 숨김 상태인 상담사는 배정하지 않습니다. 이미 배정 대기에 있는 신청은 켜도 자동으로 배정하지 않습니다. 끔으로 두어도 면담 상세의 추천 순서와 「자동 배정」 버튼은 같은 기준을 씁니다."
            >
              <span className="flex flex-wrap items-center gap-x-5 gap-y-1">
                {["켬", "끔"].map((k) => (
                  <label key={k} className="a2-choice">
                    <input type="radio" name="auto-assign" defaultChecked={(k === "켬") === v.auto} />
                    {k}
                  </label>
                ))}
              </span>
              {!v.auto && (
                <p className="a2-note w-full" style={{ borderLeftColor: "var(--a2-warn)" }}>
                  <span>
                    <b className="text-(--a2-ink)">자동 배정이 꺼져 있습니다.</b> 신청자가 상담사를 고르지 않은 신청은
                    모두 배정 대기로 들어오고, 운영자가 면담 상세에서 한 건씩 배정해야 합니다. 지금 배정 대기 3건 —{" "}
                    <Link href="/design/admin2/interviews/CS-2610-0019" className="font-bold text-(--a2-accent-2) underline">
                      배정 대기 신청 보기
                    </Link>
                  </span>
                </p>
              )}
              <div className="w-full">
                <p className="a2-t-sm leading-[1.7] text-(--a2-ink-2)">
                  켜 두면 신청자가 상담사를 고르지 않은 신청(「관리자 배정 요청」)을 결제가 끝나는 대로 아래 순서로
                  배정합니다.
                </p>
                <ol className="mt-1.5 grid gap-1">
                  {criteria.map((s, i) => (
                    <li key={s.k} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span
                        aria-hidden
                        className="a2-mono a2-t-xs flex h-5 w-5 shrink-0 items-center justify-center rounded-(--a2-radius) bg-(--a2-ink) font-bold text-white"
                      >
                        {i + 1}
                      </span>
                      <b className="a2-t-sm text-(--a2-ink)">{s.k}</b>
                      <span className="a2-t-sm text-(--a2-ink-2)">{s.v}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </FormRow>

            <FormRow
              label="결과 기록 기한"
              req
              hint={
                bad ? (
                  <span style={red}>1일에서 7일 사이의 숫자를 입력해 주세요.</span>
                ) : (
                  "기한이 지나면 상담사와 운영자에게 알림이 갑니다. 1일에서 7일 사이 · 기본값은 1일입니다."
                )
              }
            >
              <span className="a2-t-sm text-(--a2-ink-2)">면담이 끝난 뒤</span>
              <input
                aria-label="결과 기록 기한"
                inputMode="numeric"
                className="a2-input a2-mono text-right"
                style={{ maxWidth: "4.5rem", ...(bad ? { borderColor: "var(--a2-danger)" } : {}) }}
                defaultValue={v.due}
              />
              <span className="a2-t-sm text-(--a2-ink-2)">일 안에 제출</span>
              {(edit || bad) && <Edited />}
            </FormRow>

            <FormRow
              label="자동 종료"
              req
              hint="운영자가 승인하지 않아도 이 기간이 지나면 면담이 종료됩니다. 1일에서 30일 사이 · 기본값은 7일입니다."
            >
              <span className="a2-t-sm text-(--a2-ink-2)">기록을 제출한 뒤</span>
              <input
                aria-label="자동 종료"
                inputMode="numeric"
                className="a2-input a2-mono text-right"
                style={{ maxWidth: "4.5rem" }}
                defaultValue={v.close}
              />
              <span className="a2-t-sm text-(--a2-ink-2)">일이 지나면 승인 없이 종료</span>
              {edit && <Edited />}
            </FormRow>
          </div>
          <p className="px-3 py-2 a2-t-xs text-(--a2-ink-4)">
            바꾼 값은 저장한 뒤에 끝나는 면담부터 적용됩니다. 이미 끝나서 기한이 정해진 면담은 바뀌지 않습니다.
            누가 언제 바꿨는지는 감사 로그에 남습니다.
          </p>
        </Panel>

        {/* ── 아래는 실제 화면 그대로 — 읽기 전용 요약 ── */}
        <div className="grid gap-3 xl:grid-cols-2">
          <Panel title="진단 설정" meta="응시 화면이 읽는 규격">
            <DescList
              rows={[
                row("검사 이름", `${assessment.name} (${assessment.ko})`, "lib/exam.ts"),
                row("응시 화면 회차 표기", assessment.round, "lib/exam.ts"),
                row("응시 화면 마감", <span className="a2-mono">{assessment.deadline}</span>, "lib/exam.ts"),
                row(
                  "운영 회차",
                  <>
                    {currentRound.label} <span className="a2-mono">{currentRound.period}</span>
                  </>,
                  "lib/admin.ts",
                ),
                row(
                  "과목",
                  <span className="flex flex-wrap gap-1">
                    {subjects.map((s) => (
                      <Tag key={s.id}>{s.short}</Tag>
                    ))}
                  </span>,
                  "lib/exam.ts",
                ),
                row("과목별 문항", <span className="a2-num">{questionCountText()}</span>, "lib/exam.ts"),
                row("과목당 제한 시간", <span className="a2-num">{limitText}</span>, "lib/exam.ts"),
                row(
                  "회차 전체",
                  <span className="a2-num">
                    {subjects.length}과목 · {totalQuestions()}문항 · {totalMin}분
                  </span>,
                  "lib/exam.ts",
                ),
                row("문항 위계", levels.map((l) => `${l.id} ${l.name}`).join(" · "), "lib/exam.ts"),
              ]}
            />
          </Panel>

          <Panel title="판정·품질 기준" meta="AI 제안값을 사람에게 넘기는 선">
            <DescList
              rows={[
                row(
                  "저신뢰 자동 라우팅",
                  <>
                    확신도 <span className="a2-num">0.75</span> 미만은 사람에게
                  </>,
                  "lib/expertStore.ts",
                ),
                row(
                  "AI-인간 일치도 목표",
                  <>
                    ICC ≥ <span className="a2-num">0.80</span>
                  </>,
                  "lib/expertStore.ts",
                ),
                row("개방형 코딩 표본", <span className="a2-num">10–20%</span>, "lib/expertStore.ts"),
                row(
                  "판정 컷 경계선",
                  <>
                    θ <span className="a2-num">±0.25</span> 안이면 확정하지 않고 유보
                  </>,
                  "lib/expertStore.ts",
                ),
                row("채점 루브릭", <span className="a2-num">완전정답 2 · 부분정답 1 · 오답 0</span>, "lib/expertStore.ts"),
                row(
                  "개방형 코딩 부호",
                  <>
                    <span className="a2-num">9</span>가지 (&lsquo;불명&rsquo; 포함)
                  </>,
                  "lib/expertStore.ts",
                ),
                row(
                  "크로스 판정 셀",
                  <>
                    <span className="a2-num">6</span>칸
                  </>,
                  "lib/expertStore.ts",
                ),
                row(
                  "면담 프로토콜",
                  <>
                    고정 질문 <span className="a2-num">7</span>문항 · 선발 사유 <span className="a2-num">5</span>단
                  </>,
                  "lib/expertStore.ts",
                ),
                row("자가 검수 허용 역할", selfReview.join(" · "), "lib/admin.ts"),
                /* 승인 · 문항은 브라우저 저장소에서 세는 값이라 콘솔 메뉴의 숫자와 같게 적어 둔다 */
                row(
                  "대기 건수 집계",
                  <>
                    판정 <span className="a2-num">{queueCounts.cases}</span> · 승인 <span className="a2-num">3</span> ·
                    문항 <span className="a2-num">4</span> · 문의 <span className="a2-num">{queueCounts.inquiries}</span>{" "}
                    · 리포트 <span className="a2-num">{queueCounts.reports}</span>
                  </>,
                  "lib/admin2.ts",
                ),
              ]}
            />
          </Panel>

          <Panel title="권한·개인정보" meta="열람 규칙은 화면이 아니라 코드가 강제한다">
            <DescList
              rows={[
                row(
                  "이 화면 권한",
                  <>
                    <span className="a2-mono">system.manage</span> · {systemRoles.join(" · ")}
                  </>,
                  "lib/admin.ts",
                ),
                row(
                  "권한·역할",
                  <>
                    권한 <span className="a2-num">{permissionIds.length}</span>개 · 역할{" "}
                    <span className="a2-num">{staffRoles.length}</span>가지
                  </>,
                  "lib/admin.ts",
                ),
                row("목록의 학생 표기", "이름 대신 회차 내 응시번호", "lib/admin.ts"),
                row("연락처 표기", "마스킹된 값만. 원문 칸을 두지 않는다", "lib/admin.ts"),
                row("개인정보 열람", "사유 입력 강제 · 전건 감사 로그", "lib/admin.ts"),
                row(
                  "표준 열람 사유",
                  <span className="flex flex-wrap gap-1">
                    {accessReasons.map((r) => (
                      <Tag key={r}>{r}</Tag>
                    ))}
                  </span>,
                  "lib/admin.ts",
                ),
                row(
                  "계정 정지 사유",
                  <>
                    <span className="a2-num">{userActions.suspend.reasons.length}</span>가지 · 되돌릴 수 있음
                  </>,
                  "lib/admin.ts",
                ),
                row(
                  "계정 삭제 사유",
                  <>
                    <span className="a2-num">{userActions.delete.reasons.length}</span>가지 · 되돌릴 수 없음
                  </>,
                  "lib/admin.ts",
                ),
              ]}
            />
          </Panel>

          <Panel title="기관 정보" meta="공개 존 푸터와 같은 출처">
            <DescList
              rows={[
                row("상호", company.name, "lib/site.ts"),
                row("대표", company.ceo, "lib/site.ts"),
                row("사업자등록번호", <span className="a2-mono">{company.bizNo}</span>, "lib/site.ts"),
                row("주소", company.address, "lib/site.ts"),
                row("대표전화", <span className="a2-mono">{company.tel}</span>, "lib/site.ts"),
                row("이메일", <span className="a2-mono">{company.email}</span>, "lib/site.ts"),
                row("상담 시간", company.hours, "lib/site.ts"),
              ]}
            />
          </Panel>
        </div>

        <Panel className="mt-3" title="아직 값이 없는 항목" meta={stub.id}>
          <ul className="space-y-1 a2-t-sm text-(--a2-ink-2)">
            {stub.todo.map((t) => (
              <li key={t} className="flex gap-2">
                <span aria-hidden className="a2-dot mt-1.5 shrink-0 text-(--a2-ink-4)" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </Panel>

        {/* 저장 줄 — 면담 설정을 손대면 켜진다 */}
        <div className="sticky bottom-0 z-10 -mx-3 mt-3 border-t border-(--a2-line) bg-(--a2-panel)/95 px-3 py-2.5 backdrop-blur">
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <span className="mr-auto a2-t-xs text-(--a2-ink-4)" style={bad ? red : undefined}>
              {edit
                ? "저장하지 않은 변경이 있습니다."
                : bad
                  ? "결과 기록 기한을 확인해 주세요. 0일로는 저장할 수 없습니다."
                  : `면담 설정 마지막 수정 ${v.saved} · 박서준`}
            </span>
            {edit || bad ? (
              <Link href={to("interview")} className="a2-btn">
                취소
              </Link>
            ) : (
              <button type="button" className="a2-btn" disabled>
                취소
              </button>
            )}
            {edit ? (
              <Link href={to("interview/saved")} className="a2-btn a2-btn-primary">
                저장
              </Link>
            ) : (
              <button type="button" className="a2-btn a2-btn-primary" disabled>
                저장
              </button>
            )}
          </div>
        </div>
      </Body>

      <SeedNote>
        회차·건수는 화면 설계를 위한 예시입니다(lib/admin.ts). 임계값과 기관 정보는 실제로 코드에 설정된 값이며,
        고치려면 해당 파일을 바꿔 배포해야 합니다. 면담 설정만 이 화면에서 바로 수정합니다.
      </SeedNote>
    </ConsoleFrame>
  );
}
