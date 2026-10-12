"use client";

import Link from "next/link";
import { themeOf } from "@/lib/authVariant";
import { designLinks } from "@/lib/designScreens";
import { phaseTone, subjectTone } from "@/lib/progress";
import SectionTitle from "@/components/exam/SectionTitle";
import { listTd, listTh } from "@/components/account/ui";
import { Button } from "@/components/ui/button";
import DashFrame from "../DashFrame";

/**
 * 보호자 홈의 면담 상태 (실제 주소 /my · WBS M.2.13) — 디자인.
 *
 * 지금의 보호자 홈은 학생마다 과목 · 설문 · 단계만 보여 준다. 면담을 신청했는지, 언제 누구와
 * 하는지는 「면담」 메뉴에 들어가야 알 수 있다. 여기서는 표의 학생 줄 바로 아래에 **면담 줄**을
 * 붙여, 그 학생의 면담이 어디까지 왔는지를 홈에서 바로 읽게 한다.
 *
 * 바로가기 상자를 따로 두지 않고 표 안에 둔 것은 면담이 학생 한 명의 결과지를 놓고 하는
 * 일이기 때문이다. 학생 줄에 붙어 있으면 누구의 면담인지 다시 찾지 않아도 된다. 열로 세우지
 * 않은 것은 일시 · 방식 · 상담 전문가 · 버튼이 한 칸에 들어가지 않아서다.
 *
 * 면담 줄이 보여 주는 것은 여섯 가지다 — 예약 확정 · 오늘 면담 · 결제 대기 · 상담 전문가
 * 배정 중 · 면담 완료 · 신청한 면담 없음. 줄 전체가 그 면담의 상세(/my/interviews/[예약번호])로
 * 이어지고, 지금 들어갈 수 있는 오늘 면담만 파란 바탕으로 띄운다.
 *
 * 면담은 발행된 결과가 있어야 신청할 수 있다. 결과가 아직 없는 학생의 줄에는 버튼 대신
 * 신청할 수 없는 사유를 한 줄로 적는다.
 *
 * 머리와 표는 알림 디자인(Bells.tsx)에 있는 보호자 홈 사본과 같다. 새로 정한 것은 면담 줄뿐이다.
 */

const t = themeOf(2);
const detail = designLinks("my-interview");

type Tone = "ok" | "wait" | "now" | "muted";

/** 면담 상태 표시 — 표의 「상태」 칸처럼 점 하나와 글자색만 쓴다 */
const toneCls: Record<Tone, { text: string; dot: string }> = {
  ok: { text: "text-emerald-700", dot: "bg-emerald-500" },
  wait: { text: "text-amber-700", dot: "bg-amber-500" },
  now: { text: "text-soft-primary", dot: "bg-soft-primary" },
  muted: { text: "text-slate-500", dot: "bg-slate-400" },
};

type Counsel = {
  /** 면담 상태 — 신청한 면담이 없으면 비운다 */
  tone?: Tone;
  status?: string;
  when?: string;
  /** 방식 · 상담 전문가 */
  how?: string;
  /** 알약으로 띄우는 짧은 말 — 며칠 뒤인지 · 결제 기한 */
  tag?: string;
  note?: string;
  /** 누르면 가는 곳과 줄 끝에 적는 말 */
  href?: string;
  go?: string;
  /** 지금 해야 할 일이면 줄 끝의 말을 버튼 모양으로 그린다 */
  solid?: boolean;
};

const slot = "2026.10.15(목) 14:00 – 15:00";
const how = "화상 · 상담 전문가 김지원";

/** 결과가 발행된 학생(김도현)의 면담 줄 — 상태마다 한 가지 */
const counselOf: Record<string, Counsel> = {
  counsel: { tone: "ok", status: "예약 확정", when: slot, how, tag: "4일 뒤", href: detail(), go: "면담 일정 보기" },
  "counsel/today": {
    tone: "now",
    status: "오늘",
    when: "14:00 – 15:00",
    how,
    note: "지금 입장할 수 있습니다",
    href: detail("video-open"),
    go: "입장",
    solid: true,
  },
  /* 고른 시간은 결제를 마칠 때까지 15분 동안만 잡아 둔다 — 기한을 홈에서도 보여 준다 */
  "counsel/pay-wait": {
    tone: "wait",
    status: "결제 대기",
    when: slot,
    how,
    tag: "결제 기한 오늘 10:17",
    href: detail("pay-wait"),
    go: "결제하기",
    solid: true,
  },
  "counsel/assigning": {
    tone: "wait",
    status: "상담 전문가 배정 중",
    when: slot,
    how: "화상",
    note: "배정되면 문자로 알려 드립니다",
    href: detail("assigning"),
    go: "면담 일정 보기",
  },
  "counsel/done": {
    tone: "muted",
    status: "완료",
    when: "2026.10.08(목) 14:00 – 15:00",
    how,
    href: detail("done"),
    /* 상담사가 적는 결과 기록(권고 사항)은 보호자 화면에 보이지 않는다(MyInterview.tsx) —
       끝난 면담의 일시 · 방식 · 상담 전문가를 다시 보는 길만 둔다 */
    go: "면담 내역 보기",
  },
  "counsel/none": {
    note: "신청한 내역이 없습니다. 2026 3분기 초4 진단 결과로 신청할 수 있습니다.",
    href: "/my/interviews",
    go: "면담 신청",
    solid: true,
  },
};

/** 결과가 아직 발행되지 않은 학생(김서아) — 신청할 수 없는 사유만 적는다 */
const noResult: Counsel = {
  note: "결과지를 함께 읽는 자리라, 진단 결과가 발행된 뒤에 신청할 수 있습니다.",
};

const students = [
  { name: "김도현", age: 10, grade: "초등 4학년", code: "H7KM-2QXP", subjects: ["완료", "완료", "완료"] as const, surveys: 3, phase: "최종제출" as const, published: true },
  { name: "김서아", age: 9, grade: "초등 3학년", code: "R4TN-8WCE", subjects: ["완료", "진행중", "미완료"] as const, surveys: 1, phase: "응시중" as const, published: false },
];

/**
 * 학생 줄 아래의 면담 줄.
 *
 * 표는 좁은 화면에서 가로로 넘친다. 면담 줄까지 표 폭만큼 길어지면 「입장」이 화면 밖에
 * 놓이므로, 표를 담은 상자의 보이는 폭(100cqw)을 넘지 않게 묶어 그 안에서 줄을 바꾼다.
 */
function CounselLine({ c }: { c: Counsel }) {
  const tone = c.tone && toneCls[c.tone];
  const box = `flex min-h-12 max-w-[calc(100cqw-2rem)] flex-wrap items-center gap-x-3 gap-y-1 rounded-[12px] border px-3.5 py-2 text-[13px] text-soft-muted ${
    c.tone === "now" ? "border-soft-primary bg-soft-primary-soft" : "border-transparent bg-slate-50"
  }`;
  const body = (
    <>
      <span className="shrink-0 text-[12.5px] font-semibold">면담</span>
      {tone && (
        <span className={`inline-flex shrink-0 items-center gap-1.5 font-bold ${tone.text}`}>
          <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
          {c.status}
        </span>
      )}
      {c.when && <span className="font-semibold tabular-nums text-soft-ink">{c.when}</span>}
      {c.how && <span>{c.how}</span>}
      {c.tag && (
        <span
          className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${
            c.tone === "wait" ? "bg-amber-100 text-amber-800" : "bg-soft-primary-soft text-soft-primary"
          }`}
        >
          {c.tag}
        </span>
      )}
      {c.note && <span className={c.tone === "now" ? "font-semibold text-soft-ink" : undefined}>{c.note}</span>}
      {c.go && (
        <span
          className={`ml-auto shrink-0 font-semibold ${
            c.solid ? "rounded-full bg-soft-primary px-3.5 py-1.5 text-[12.5px] text-white" : "text-soft-primary"
          }`}
        >
          {c.go}
          {!c.solid && " ›"}
        </span>
      )}
    </>
  );

  return c.href ? (
    <Link href={c.href} className={`${box} transition-shadow hover:shadow-[0_2px_10px_rgba(0,0,0,0.06)]`}>
      {body}
    </Link>
  ) : (
    <p className={box}>{body}</p>
  );
}

export default function MyCounselStatus({ state }: { state: string }) {
  return (
    <DashFrame who="parent" at="/my" unread={3} bellHref="/design/my/alerts">
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

        <div className={`${t.card} @container overflow-x-auto`}>
          <table className="w-full min-w-[820px] border-collapse">
            <caption className="sr-only">등록한 학생의 과목별 진행 상황과 면담 상태</caption>
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
            {students.map((c) => {
              const tone = phaseTone[c.phase];
              return (
                <tbody key={c.name}>
                  {/* 학생 줄과 면담 줄이 한 덩이로 읽히도록, 줄 사이 선은 면담 줄 아래에만 긋는다 */}
                  <tr className="[&>td]:border-b-0">
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
                  <tr>
                    <td colSpan={10} className="border-b border-slate-100 px-4 pb-3.5">
                      <CounselLine c={c.published ? counselOf[state] : noResult} />
                    </td>
                  </tr>
                </tbody>
              );
            })}
          </table>
        </div>
      </section>
    </DashFrame>
  );
}
