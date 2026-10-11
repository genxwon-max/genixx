"use client";

import Link from "next/link";
import { themeOf } from "@/lib/authVariant";
import { designLinks } from "@/lib/designScreens";
import { phaseTone, subjectTone } from "@/lib/progress";
import SectionTitle from "@/components/exam/SectionTitle";
import { AccHead, card, listTd, listTh } from "@/components/account/ui";
import { Head, btnGo, btnQuiet, cardBox } from "@/components/student/self";
import { Button } from "@/components/ui/button";
import DashFrame, { AlertRow, BellPanel, type Alert } from "../DashFrame";

/**
 * 알림 — 머리글의 종 · 알림 목록 · 알림 전체 보기 (WBS 7.1.1 · M.2.14) — 디자인.
 *
 * 종은 회원 대시보드의 상단 바에 늘 있다. 읽지 않은 알림이 있으면 빨간 숫자를 달고, 누르면
 * 그 아래에 최근 알림이 펼쳐진다. 더 오래된 알림은 「전체 보기」(/my/notifications)에서 본다.
 *
 * 종 아래에 깔린 홈 화면은 지금의 보호자 홈(/my) · 학생 홈(/student)을 예시 값으로 옮긴 것이다.
 * 이 화면에서 새로 정하는 것은 종과 알림 목록뿐이다.
 *
 * 학생에게는 진단 · 결과 · 설문 알림만 간다. 결제와 면담 알림은 만 14세 이상 학생에게만 간다 —
 * 그 메뉴가 만 14세 이상에게만 있기 때문이다.
 */

const t = themeOf(2);

/* ───────────────────────── 알림 예시 ───────────────────────── */

const parentAlerts: Alert[] = [
  { kind: "결과", title: "김도현 학생의 진단 결과가 발행되었습니다", body: "2026 3분기 초4 진단 결과를 지금 확인할 수 있습니다.", at: "방금 전", unread: true },
  { kind: "면담", title: "면담 예약이 확정되었습니다", body: "10.15(목) 14:00 · 김지원 전문가 · 화상 면담", at: "2시간 전", unread: true },
  { kind: "결제", title: "결제가 완료되었습니다", body: "결과 해석 면담 60분 · 100,000원", at: "2시간 전", unread: true },
  { kind: "설문", title: "보호자 설문이 아직 남아 있습니다", body: "김서아 학생의 설문 3개 가운데 1개를 작성하셨습니다.", at: "어제" },
  { kind: "진단", title: "김서아 학생이 국어 응시를 마쳤습니다", body: "남은 과목은 수학 · 과학입니다. 10.31(토)까지 응시할 수 있습니다.", at: "10.08" },
];

const parentOlder: Alert[] = [
  { kind: "진단", title: "2026 4분기 초3 진단 응시가 시작되었습니다", body: "김서아 학생이 접속코드로 들어가 응시할 수 있습니다.", at: "10.06" },
  { kind: "결제", title: "결제가 완료되었습니다", body: "2026 4분기 초3 진단 응시권 · 39,000원", at: "10.05" },
  { kind: "학생", title: "김서아 학생이 등록되었습니다", body: "접속코드가 발급되었습니다. 「학생」 화면에서 확인할 수 있습니다.", at: "10.05" },
  { kind: "안내", title: "서비스 점검 안내", body: "10.12(월) 02:00 ~ 04:00에는 응시와 결제를 할 수 없습니다.", at: "10.02" },
];

const studentAlerts: Alert[] = [
  { kind: "진단", title: "2026 4분기 초4 진단이 열렸습니다", body: "10.31(토)까지 응시할 수 있습니다.", at: "방금 전", unread: true },
  { kind: "진단", title: "수학을 아직 끝내지 않았습니다", body: "풀던 곳부터 이어서 응시할 수 있습니다. 남은 문항 8개", at: "3시간 전", unread: true },
  { kind: "설문", title: "학생 설문을 작성해 주세요", body: "설문 3개 가운데 1개를 작성했습니다.", at: "어제" },
  { kind: "결과", title: "진단 결과가 나왔습니다", body: "2026 3분기 초4 진단 결과를 볼 수 있습니다.", at: "10.02" },
];

const teenAlerts: Alert[] = [
  { kind: "면담", title: "면담 예약이 확정되었습니다", body: "10.15(목) 14:00 · 김지원 전문가 · 화상 면담", at: "1시간 전", unread: true },
  { kind: "결제", title: "결제가 완료되었습니다", body: "결과 해석 면담 60분 · 100,000원 · 보호자 확인 이정민", at: "1시간 전", unread: true },
  { kind: "결과", title: "진단 결과가 나왔습니다", body: "2026 3분기 중2 진단 결과를 볼 수 있습니다.", at: "10.08" },
  { kind: "설문", title: "학생 설문을 모두 제출했습니다", body: "설문 3개를 모두 작성했습니다.", at: "10.06" },
];

/* ───────────────────────── 보호자 ───────────────────────── */

export function MyBell({ state }: { state: string }) {
  const to = designLinks("my-bell");
  const open = state === "alerts" || state === "alerts-empty";
  const none = state === "alerts-empty" || state === "read";
  return (
    <DashFrame
      who="parent"
      at="/my"
      unread={none ? 0 : 3}
      bellHref={open ? to(none ? "read" : "") : to(none ? "alerts-empty" : "alerts")}
      bellOpen={open}
      panel={
        open ? (
          <BellPanel
            alerts={none ? [] : parentAlerts}
            allHref="/design/my/notifications"
            settingsHref="/my/account/notification"
          />
        ) : undefined
      }
    >
      <ParentHomeCopy />
    </DashFrame>
  );
}

const children = [
  { name: "김도현", age: 10, grade: "초등 4학년", code: "H7KM-2QXP", subjects: ["완료", "완료", "완료"] as const, surveys: 3, phase: "최종제출" as const },
  { name: "김서아", age: 9, grade: "초등 3학년", code: "R4TN-8WCE", subjects: ["완료", "진행중", "미완료"] as const, surveys: 1, phase: "응시중" as const },
];

/** 보호자 홈(/my)을 예시 값으로 옮긴 것 — components/account/ParentHome.tsx와 같은 표 */
function ParentHomeCopy() {
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-soft-line pb-5">
        <div className="min-w-[16rem] flex-1">
          <h1 className="text-[26px] font-bold tracking-tight text-soft-ink sm:text-[28px]">
            김지은님, 안녕하세요
          </h1>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/my/children/new" className={t.btnOutline}>
            + 학생 개별 등록
          </Link>
          <Link href="/my/children/bulk" className={t.btnAction}>
            + 학생 일괄 등록
          </Link>
        </div>
      </header>

      <section className="mt-7">
        <SectionTitle
          right={
            <Button variant="outline" disabled className="rounded-full text-[13px] font-semibold">
              문자로 코드 보내기
            </Button>
          }
        >
          등록 학생 2명
        </SectionTitle>

        <div className={`${t.card} overflow-x-auto`}>
          <table className="w-full min-w-[820px] border-collapse">
            <caption className="sr-only">등록한 학생과 과목별 진행 상황</caption>
            <thead>
              <tr>
                <th className={`${listTh} w-[44px]`}>
                  <input type="checkbox" aria-label="학생 모두 선택" className="h-[17px] w-[17px] align-middle" />
                </th>
                {["이름", "학교 · 학년", "접속코드", "국어", "수학", "과학", "설문", "상태", "관리"].map((h) => (
                  <th key={h} className={listTh}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {children.map((c) => {
                const tone = phaseTone[c.phase];
                return (
                  <tr key={c.name}>
                    <td className={listTd}>
                      <input type="checkbox" aria-label={`${c.name} 선택`} className="h-[17px] w-[17px] align-middle" />
                    </td>
                    <td className={`${listTd} text-left`}>
                      <span className="text-[14px] font-black text-soft-ink">{c.name}</span>
                      <span className="mt-0.5 block text-[12px]">만 {c.age}세</span>
                    </td>
                    <td className={`${listTd} text-left`}>
                      서울한빛초등학교
                      <span className="block text-[12px]">{c.grade}</span>
                    </td>
                    <td className={`${listTd} font-semibold tracking-[0.06em] tabular-nums text-soft-ink`}>{c.code}</td>
                    {c.subjects.map((s, i) => (
                      <td key={i} className={`${listTd} ${subjectTone[s]}`}>
                        {s}
                      </td>
                    ))}
                    <td className={listTd}>
                      <span className={`font-semibold ${c.surveys === 3 ? "text-emerald-600" : "text-soft-muted"}`}>
                        {c.surveys}/3
                      </span>
                    </td>
                    <td className={listTd}>
                      <span className={`inline-flex items-center gap-1.5 font-semibold ${tone.text}`}>
                        <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                        {c.phase}
                      </span>
                    </td>
                    <td className={listTd}>
                      <span className="font-semibold text-soft-primary">상세</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

/* ───────────────────────── 알림 전체 보기 ───────────────────────── */

const chip = (on: boolean) =>
  `inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-[13.5px] font-semibold transition-colors ${
    on
      ? "border-soft-primary bg-soft-primary text-white"
      : "border-soft-line bg-white text-soft-muted hover:text-soft-ink"
  }`;

export function MyNotifications({ state }: { state: string }) {
  const empty = state === "empty";
  const today = parentAlerts.slice(0, 3);
  const week = parentAlerts.slice(3);

  return (
    <DashFrame who="parent" at="/my" unread={empty ? 0 : 3} bellHref={empty ? "/design/my/alerts-empty" : "/design/my/alerts"}>
      <AccHead title="알림" back={{ href: "/design/my", label: "홈" }} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="알림 종류" className="flex flex-wrap gap-2">
          {[
            ["전체", empty ? 0 : 9],
            ["읽지 않음", empty ? 0 : 3],
            ["진단", empty ? 0 : 2],
            ["결제", empty ? 0 : 2],
            ["결과", empty ? 0 : 1],
            ["설문", empty ? 0 : 1],
            ["면담", empty ? 0 : 1],
          ].map(([label, count], i) => (
            <button key={label} type="button" aria-pressed={i === 0} className={chip(i === 0)}>
              {label}
              <span className={`tabular-nums ${i === 0 ? "text-white/80" : "text-slate-400"}`}>{count}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 text-[13.5px] font-semibold">
          <button type="button" disabled={empty} className={empty ? "text-slate-300" : "text-soft-primary hover:underline"}>
            모두 읽음으로 표시
          </button>
          <Link href="/my/account/notification" className="text-soft-muted hover:text-soft-ink">
            알림 설정
          </Link>
        </div>
      </div>

      {empty ? (
        <div className={`${card} mt-5 px-5 py-16 text-center`}>
          <p className="text-[15px] font-bold text-soft-ink">받은 알림이 없습니다</p>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-[1.7] text-soft-muted">
            진단 일정, 결제, 결과 발행, 면담 소식이 생기면 여기에 표시됩니다. 문자 · 알림톡 · 이메일로
            받을 알림은 알림 설정에서 고를 수 있습니다.
          </p>
          <Link href="/my/account/notification" className={`${t.btnOutline} mt-5`}>
            알림 설정
          </Link>
        </div>
      ) : (
        <>
          {[
            { label: "오늘", list: today },
            { label: "이번 주", list: week },
            { label: "이전", list: parentOlder },
          ].map((g) => (
            <section key={g.label} className="mt-6">
              <h2 className="mb-2 pl-1 text-[13px] font-bold text-soft-muted">{g.label}</h2>
              <ul className={`${card} overflow-hidden`}>
                {g.list.map((a) => (
                  <AlertRow key={a.title + a.at} a={a} roomy />
                ))}
              </ul>
            </section>
          ))}
          <p className="mt-5 text-center">
            <button type="button" className={t.btnQuiet}>
              이전 알림 더 보기
            </button>
          </p>
          <p className="mt-4 text-center text-[12.5px] text-soft-muted">알림은 받은 날부터 90일 동안 보관합니다.</p>
        </>
      )}
    </DashFrame>
  );
}

/* ───────────────────────── 학생 ───────────────────────── */

export function StudentBell({ state }: { state: string }) {
  const to = designLinks("student-bell");
  const teen = state.startsWith("teen");
  const open = state.endsWith("alerts") || state === "alerts-empty";
  const none = state === "alerts-empty";
  const openSlug = teen ? "teen/alerts" : none ? "alerts-empty" : "alerts";
  const closedSlug = teen ? "teen" : "";

  return (
    <DashFrame
      who={teen ? "teen" : "student"}
      at="/student"
      unread={none ? 0 : 2}
      bellHref={to(open ? closedSlug : openSlug)}
      bellOpen={open}
      panel={
        open ? (
          <BellPanel alerts={none ? [] : teen ? teenAlerts : studentAlerts} />
        ) : undefined
      }
    >
      <StudentHomeCopy teen={teen} />
    </DashFrame>
  );
}

/** 학생 홈(/student)을 예시 값으로 옮긴 것 — components/student/StudentHome.tsx와 같은 구성 */
function StudentHomeCopy({ teen }: { teen: boolean }) {
  const subjects = teen
    ? (["완료", "완료", "완료"] as const)
    : (["완료", "진행중", "미완료"] as const);
  const phase = teen ? ("최종제출" as const) : ("응시중" as const);
  const tone = phaseTone[phase];

  return (
    <>
      <Head
        title={`${teen ? "이하윤" : "이서준"}님, 안녕하세요`}
        right={
          <Link href="/exam/apply" className={btnQuiet}>
            진단 접수하기
          </Link>
        }
      />

      <section className={`mt-7 p-6 sm:p-7 ${cardBox}`}>
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-[15rem] flex-1">
            <p className="text-[12.5px] font-semibold text-soft-muted">지금 할 일</p>
            <p className="mt-2 text-[17px] font-bold leading-[1.6] text-soft-ink sm:text-[18px]">
              {teen ? "최종 제출을 마쳤습니다. 결과는 「진단 결과」에서 봅니다." : "2과목이 남았습니다."}
            </p>
            <p className="mt-2 text-[13px] text-soft-muted">
              {teen ? "2026 3분기 중2 진단" : "2026 4분기 초4 진단"}
            </p>
          </div>
          <Link href={teen ? "/student/results" : "/student/exams"} className={btnGo}>
            {teen ? "결과 보기" : "진단 보기"} →
          </Link>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="text-[17px] font-bold tracking-tight text-soft-ink">내 진행 상황</h2>
          <span className={`inline-flex items-center gap-1.5 text-[13px] font-semibold ${tone.text}`}>
            <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
            {phase}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {["국어", "수학", "과학"].map((s, i) => (
            <div key={s} className={`${cardBox} p-5`}>
              <p className="text-[13px] font-semibold text-soft-muted">{s}</p>
              <p className={`mt-1.5 text-[19px] font-bold ${subjectTone[subjects[i]]}`}>{subjects[i]}</p>
            </div>
          ))}
          <div className={`${cardBox} p-5`}>
            <p className="text-[13px] font-semibold text-soft-muted">설문</p>
            <p className="mt-1.5 text-[19px] font-bold tabular-nums text-soft-ink">
              {teen ? "3/3" : "1/3"}
              <span className="ml-1.5 align-[2px] text-[12px] font-semibold text-soft-primary">보기</span>
            </p>
          </div>
        </div>
      </section>

      {!teen && (
        <p className="mt-6 text-[13px] leading-[1.8] text-soft-muted">
          응시권 결제와 면담 신청은 보호자 화면에 있습니다. 만 14세 미만은 돈이 드는 일을 직접 하지 않도록
          법이 정해 두었기 때문입니다. 볼 진단이 아직 없으면 보호자에게 말해 주세요.
        </p>
      )}
    </>
  );
}
