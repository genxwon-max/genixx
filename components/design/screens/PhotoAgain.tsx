"use client";

import Link from "next/link";
import { themeOf } from "@/lib/authVariant";
import { designLinks } from "@/lib/designScreens";
import AccountChrome from "@/components/account/AccountChrome";
import AnswerPhoto from "./AnswerPhoto";
import { photoFlow, retakeTips } from "./photoFlow";

/**
 * 사진 다시 올리기 — 최종 제출한 뒤 보호자 · 학생이 답 사진을 다시 올리는 화면 (2026-10-21) — 디자인.
 *
 * 운영자가 「다시 올려 달라고 요청」을 보내면 두 자리에서 이 화면이 열린다 —
 *
 *   보호자   알림톡 · 메일 · 앱 알림의 단추가 여는 링크 (실제 주소 /answer/photo?req=…).
 *            로그인하지 않고 휴대전화에서 바로 연다. 아래 PhotoAgainLink가 그 화면이다.
 *   학생     대시보드 「내 진단」의 그 진단에서 「사진 다시 올리기」
 *            (/student/exams/[회차]/[학년]/photo · ./StudentExamBoard.tsx).
 *
 * 두 자리가 같은 몸통(PhotoAgainBody)을 쓴다. 차례는 무엇을 다시 찍나(문항 · 처음 사진 · 이유) →
 * 지켜야 할 것(처음에 쓴 그 종이를 그대로) → 다시 찍는 법 → 올리기다. 올리기는 사진 찍기 · 앨범에서
 * 고르기 → 크게 보고 확인 → 보내기의 세 걸음이고, 보낸 뒤에는 고칠 수 없다.
 *
 * 링크로 할 수 있는 일은 이 문항 하나의 사진을 기한 안에 한 번 보내는 것뿐이다. 그래서 법정대리인
 * 동의 화면과 달리 본인확인을 다시 묻지 않는다. 한 사람이 보내면 다른 사람의 링크는 「이미 보냈습니다」가
 * 된다. 예시 값은 ./photoFlow.ts.
 */

const t = themeOf(2);

export type AgainStage = "before" | "picked" | "error" | "sent" | "done" | "expired";

export type AgainLinks = {
  /** 사진을 고르면 가는 곳 — 고른 뒤 */
  picked: string;
  /** 「다른 사진으로 바꾸기」 — 올리기 전 */
  before: string;
  /** 「이 사진으로 보내기」 — 보낸 뒤 */
  sent: string;
  /** 다 끝난 뒤 나가는 곳 */
  out: { href: string; label: string };
};

const { student, question, request, first, again } = photoFlow;

const card = "rounded-[14px] border border-soft-line bg-white";
const pad = "p-5 sm:p-6";

/** 「2026-10-15 20:12」 → 「10월 15일(목) 20:12」 — 예시 날짜는 이 넷뿐이다 */
const day: Record<string, string> = {
  "2026-10-10": "10월 10일(토)",
  "2026-10-15": "10월 15일(목)",
};
const when = (at: string) => {
  const [d, time] = at.split(" ");
  return `${day[d] ?? d} ${time}`;
};

export function PhotoAgainBody({
  stage,
  who,
  links,
}: {
  stage: AgainStage;
  /** 보는 사람 — 글이 조금 다르다 */
  who: "guardian" | "student";
  links: AgainLinks;
}) {
  const ended = stage === "sent" || stage === "done" || stage === "expired";
  const guardian = who === "guardian";

  if (ended) return <Ended stage={stage} guardian={guardian} out={links.out} />;

  /* 사진을 고른 뒤에는 고른 사진을 요청 바로 아래로 올린다 — 휴대전화에서 찍고 돌아오면 그 사진부터
     보여야 한다. 지킬 것과 찍는 법은 확인할 것 세 줄(처음에 쓴 그 종이입니다 …)이 대신한다 */
  const picked = stage === "picked";
  const upload = (
    <section className={`${card} ${pad}`} aria-label="사진 올리기">
      {picked ? (
        <Picked links={links} />
      ) : (
        <>
          <div className="grid place-items-center gap-3 rounded-[12px] border-2 border-dashed border-soft-line bg-slate-50 px-4 py-8 text-center">
            <CameraIcon className="h-8 w-8 text-soft-muted" />
            <p className="text-[15px] font-bold text-soft-ink">종이를 다시 찍어 올려 주세요</p>
            <div className="flex flex-wrap justify-center gap-2.5">
              <Link href={links.picked} className={t.btnAction}>
                사진 찍기
              </Link>
              <Link href={links.picked} className={t.btnOutline}>
                앨범에서 고르기
              </Link>
            </div>
            <p className="text-[12.5px] text-soft-muted">사진은 한 장만 보낼 수 있습니다 · JPG · PNG · HEIC</p>
          </div>
          {stage === "error" && (
            <p
              role="alert"
              className="mt-3 rounded-[12px] border border-rose-200 bg-rose-50 px-4 py-3 text-[13.5px] leading-[1.7] text-rose-700"
            >
              <b>사진 파일만 올릴 수 있습니다.</b> 고르신 파일(수학숙제.pdf)은 사진이 아닙니다. 종이를 카메라로 찍거나
              앨범에서 사진을 골라 주세요.
            </p>
          )}
        </>
      )}
      <p className="mt-3 text-[12.5px] leading-[1.7] text-soft-muted">
        {guardian
          ? `${student.name} 학생의 대시보드에도 같은 요청이 표시됩니다. 둘 중 한 사람만 올리면 됩니다.`
          : "보호자에게도 알림톡으로 같은 요청이 갔습니다. 둘 중 한 사람만 올리면 됩니다."}
      </p>
    </section>
  );

  return (
    <div className="grid gap-4">
      {/* 무엇을 다시 찍나 */}
      <section className={`${card} ${pad}`}>
        <p className="flex flex-wrap items-center gap-2 text-[12.5px] font-semibold text-soft-muted">
          <span className="rounded-full bg-soft-primary-soft px-2.5 py-0.5 text-soft-primary">{question.label}</span>
          {photoFlow.diag.name}
        </p>
        <h2 className="mt-3 text-[18px] font-bold leading-[1.5] text-soft-ink">
          {guardian
            ? `${student.name} 학생의 ${question.label} 답 사진을 채점자가 읽지 못했습니다`
            : `${question.label} 답 사진을 채점자가 읽지 못했습니다`}
        </h2>
        {/* 운영팀이 남긴 말은 운영자가 요청 창에서 고쳐 쓸 수 있는 글이라 이유와 따로 적는다 */}
        <dl className="mt-4 grid gap-x-4 gap-y-2.5 border-t border-slate-100 pt-4 text-[14px] leading-[1.7] sm:grid-cols-[6.5rem_1fr]">
          <dt className="font-semibold text-soft-muted">이유</dt>
          <dd className="text-soft-ink">{photoFlow.flagged.reason}</dd>
          <dt className="font-semibold text-soft-muted">운영팀이 남긴 말</dt>
          <dd className="text-soft-ink">{request.message}</dd>
          <dt className="font-semibold text-soft-muted">올릴 기한</dt>
          <dd>
            <b className="text-[#b45309]">{request.dueText}까지</b>
          </dd>
        </dl>
      </section>

      {picked && upload}

      {/* 문항과 처음 올린 사진 */}
      <section className={`${card} ${pad}`}>
        <h2 className="text-[15px] font-bold text-soft-ink">다시 찍을 문항</h2>
        <p className="mt-2 text-[14.5px] leading-[1.75] text-soft-ink">{question.stem}</p>
        <figure className="mt-4">
          <span className="block overflow-hidden rounded-[10px] border border-soft-line bg-slate-50 sm:max-w-[20rem]">
            <AnswerPhoto look="blurred" />
          </span>
          <figcaption className="mt-1.5 text-[12.5px] text-soft-muted">
            처음 올린 사진 · {when(first.at)}
          </figcaption>
        </figure>
      </section>

      {!picked && (
        <>
          {/* 지킬 것 — 다시 받는 사진에 답을 새로 쓰면 안 된다 */}
          <p className="rounded-[14px] border border-amber-200 bg-amber-50 px-5 py-4 text-[14px] leading-[1.75] text-amber-900">
            <b>처음에 쓴 그 종이를 그대로 찍어 주세요.</b> 답을 고치거나 새로 쓰면 안 됩니다. 채점자가 처음 사진과
            같은 종이인지 함께 봅니다.
          </p>

          {/* 다시 찍는 법 */}
          <section className={`${card} ${pad}`}>
            <h2 className="text-[15px] font-bold text-soft-ink">다시 찍는 법</h2>
            <ol className="mt-3 grid gap-3">
              {retakeTips.map((tip, i) => (
                <li key={tip.head} className="flex gap-3">
                  <span
                    aria-hidden
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-soft-primary-soft text-[12.5px] font-bold text-soft-primary"
                  >
                    {i + 1}
                  </span>
                  <span className="text-[14px] leading-[1.7] text-soft-ink">
                    <b>{tip.head}</b> — <span className="text-soft-muted">{tip.body}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          {upload}
        </>
      )}
    </div>
  );
}

/** 사진을 고른 뒤 — 보내기 전에 크게 보고 확인한다. 보낸 뒤에는 바꿀 수 없다 */
function Picked({ links }: { links: AgainLinks }) {
  return (
    <div>
      <h2 className="text-[15px] font-bold text-soft-ink">보내기 전에 확인해 주세요</h2>
      <figure className="mt-3">
        <span className="block overflow-hidden rounded-[10px] border-2 border-soft-primary bg-slate-50">
          <AnswerPhoto />
        </span>
        <figcaption className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-[12.5px] text-soft-muted">방금 고른 사진 · {again.size}</span>
          <span className="ml-auto flex gap-1.5">
            <button type="button" className="rounded-full border border-soft-line bg-white px-3 py-1.5 text-[12.5px] font-semibold text-soft-ink hover:bg-slate-50">
              왼쪽으로 돌리기
            </button>
            <button type="button" className="rounded-full border border-soft-line bg-white px-3 py-1.5 text-[12.5px] font-semibold text-soft-ink hover:bg-slate-50">
              오른쪽으로 돌리기
            </button>
          </span>
        </figcaption>
      </figure>
      <ul className="mt-4 grid gap-1.5 text-[14px] text-soft-ink">
        {["종이의 네 귀퉁이가 모두 보입니다", "글씨와 그림을 또렷하게 읽을 수 있습니다", "처음에 쓴 그 종이입니다"].map((c) => (
          <li key={c} className="flex items-start gap-2">
            <span aria-hidden className="mt-[3px] font-bold text-emerald-600">
              ✓
            </span>
            {c}
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
        <Link href={links.before} className={t.btnQuiet}>
          다른 사진으로 바꾸기
        </Link>
        <Link href={links.sent} className={t.btnAction}>
          이 사진으로 보내기
        </Link>
      </div>
      <p className="mt-3 text-[12.5px] leading-[1.7] text-soft-muted">
        보낸 뒤에는 사진을 바꿀 수 없습니다. 글씨가 잘 보이는지 사진을 키워 확인해 주세요.
      </p>
    </div>
  );
}

/** 보낸 뒤 · 이미 보낸 링크 · 기한이 지난 링크 */
function Ended({
  stage,
  guardian,
  out,
}: {
  stage: "sent" | "done" | "expired";
  guardian: boolean;
  out: AgainLinks["out"];
}) {
  if (stage === "expired") {
    return (
      <section className={`${card} ${pad} text-center`}>
        <p className="text-[18px] font-bold text-soft-ink">사진을 올릴 수 있는 기한이 지났습니다</p>
        <p className="mx-auto mt-2 max-w-md text-[14px] leading-[1.75] text-soft-muted">
          {request.dueText}까지였습니다. {question.label}은 지금 올라와 있는 사진으로 채점합니다. 궁금한 점은 1:1
          문의로 남겨 주세요.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2.5">
          <Link href="/support/inquiry" className={t.btnOutline}>
            1:1 문의하기
          </Link>
          <Link href={out.href} className={t.btnQuiet}>
            {out.label}
          </Link>
        </div>
      </section>
    );
  }

  const sent = stage === "sent";
  return (
    <section className={`${card} ${pad}`}>
      <div className="text-center">
        <span
          aria-hidden
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-[22px] font-bold text-emerald-600"
        >
          ✓
        </span>
        <p className="mt-3 text-[18px] font-bold text-soft-ink">
          {sent ? "사진을 보냈습니다" : "이미 사진을 보냈습니다"}
        </p>
        <p className="mx-auto mt-2 max-w-md text-[14px] leading-[1.75] text-soft-muted">
          {sent
            ? guardian
              ? `보내 주신 사진으로 채점을 이어서 합니다. 채점이 모두 끝나면 ${student.name} 학생의 결과가 발행되고, 발행되면 알려 드립니다.`
              : "보낸 사진으로 채점을 이어서 합니다. 채점이 모두 끝나면 결과가 발행되고 「진단 결과」에서 볼 수 있습니다."
            : `${when(again.at)}에 ${guardian ? "보내 주신" : "보호자가 보낸"} 사진으로 채점을 이어서 하고 있습니다. 다시 보내야 하면 1:1 문의로 알려 주세요.`}
        </p>
      </div>
      <figure className="mx-auto mt-5 max-w-[20rem]">
        <span className="block overflow-hidden rounded-[10px] border border-soft-line bg-slate-50">
          <AnswerPhoto />
        </span>
        <figcaption className="mt-1.5 text-center text-[12.5px] text-soft-muted">
          {question.label} · {when(again.at)}에 보낸 사진
        </figcaption>
      </figure>
      <div className="mt-6 flex flex-wrap justify-center gap-2.5">
        <Link href={out.href} className={t.btnAction}>
          {out.label}
        </Link>
      </div>
      {sent && (
        <p className="mt-4 text-center text-[12.5px] leading-[1.7] text-soft-muted">
          잘못 보냈다면 기한({request.dueText}) 안에 1:1 문의로 알려 주세요.
        </p>
      )}
    </section>
  );
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M4 8h3l2-2.5h6L17 8h3v11H4z" />
      <circle cx="12" cy="13.2" r="3.6" />
    </svg>
  );
}

/* ───────────────────────── 보호자 · 링크로 연 화면 ───────────────────────── */

/**
 * 보호자가 알림톡 · 메일 · 앱 알림의 단추로 여는 화면 (실제 주소 /answer/photo?req=…).
 *
 * 계정 존의 껍데기(머리 · 바닥)를 쓴다 — 법정대리인 동의처럼 문자로 받은 링크가 도착하는 자리다.
 * 휴대전화에서 여는 일이 대부분이라 한 줄로 쌓는다.
 */
export default function PhotoAgainLink({ state }: { state: string }) {
  const to = designLinks("answer-photo");
  const stage: AgainStage =
    state === "picked" || state === "error" || state === "sent" || state === "done" || state === "expired" ? state : "before";
  const ended = stage === "sent" || stage === "done" || stage === "expired";

  return (
    <AccountChrome>
      <div className={`min-h-full ${t.page}`}>
        <div className="container-x py-10 pb-16">
          <div className="mx-auto w-full max-w-[34rem]">
            {!ended && (
              <header className="mb-5">
                <h1 className={t.heading}>답 사진을 다시 올려 주세요</h1>
                <p className={`${t.lead} mt-2`}>
                  {student.name} 학생 · {photoFlow.diag.name} · {request.dueShort} 23:59까지
                </p>
              </header>
            )}
            <PhotoAgainBody
              stage={stage}
              who="guardian"
              links={{ picked: to("picked"), before: to(), sent: to("sent"), out: { href: "/", label: "GENIXX 홈으로" } }}
            />
          </div>
        </div>
      </div>
    </AccountChrome>
  );
}
