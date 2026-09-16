"use client";

import Link from "next/link";
import { useState } from "react";
import { useExamRecord, useHydrated, surveyKeys, type SurveyKey } from "@/lib/examStore";
import { recordSurveySend, useRoster } from "@/lib/roster";
import { surveyWindow } from "@/lib/popup";
import { ArrowRight } from "@/components/Icons";
import { Button } from "@/components/ui/button";
import Toast from "@/components/exam/Toast";
import { phoneText } from "./SendCodes";
import { AccHead, btnPrimary, card, field as input } from "./ui";

/**
 * ASM-05 학생 한 명의 설문 (/my/surveys/[id]).
 *
 * 목록에서 곧바로 문항 창을 띄우던 것을 여기로 내렸다. 설문은 **내는 사람이 따로 있는**
 * 일이라 그렇다 — 어머니·아버지·교사 셋은 서로 다른 사람이고, 보호자가 그 자리에 앉아
 * 셋을 대신 채우는 화면이 되면 관찰이 한 사람의 것으로 쏠린다.
 *
 * 그래서 설문마다 길을 둘 둔다 —
 *   · **문자로 보내기** — 그 사람의 휴대전화로 링크를 보낸다. 받은 사람이 자기 폰에서
 *     연다. 링크는 로그인 없이 열리므로 아버지·교사에게 계정을 만들라고 하지 않아도 된다.
 *   · **지금 작성** — 지금 로그인한 사람이 이 자리에서 바로 연다(예전과 같은 창).
 *
 * 한 번 보낸 번호는 그 설문 자리에 적어 둔다(lib/roster.ts surveySends). 다시 보낼 때
 * 번호를 또 치지 않아도 되고, 「아버지 설문을 어디로 보냈더라」가 화면에 남는다.
 */
/** 줄머리에 적는 짧은 이름. 저장소의 who는 「담당 교사·교수」처럼 길어 줄을 넘긴다. */
const shortWho: Record<SurveyKey, string> = {
  mother: "어머니",
  father: "아버지",
  teacher: "교사",
};

export default function SurveyDetail({ id }: { id: string }) {
  const hydrated = useHydrated();
  const roster = useRoster();
  const record = useExamRecord(id);
  const [toast, setToast] = useState<string | null>(null);

  const student = roster.find((s) => s.id === id) ?? null;

  if (!hydrated) {
    return <p className="py-16 text-center text-[13px] text-soft-muted">확인 중입니다…</p>;
  }

  if (!student) {
    return (
      <>
        <AccHead
          id="ASM-05"
          title="학생을 찾을 수 없습니다"
          back={{ href: "/my/surveys", label: "설문 목록으로" }}
        />
        <div className={`${card} p-10 text-center`}>
          <p className="text-[14px] leading-relaxed text-soft-muted">
            지워졌거나 이 계정의 학생이 아닙니다. 목록에서 다시 골라 주세요.
          </p>
          <Link href="/my/surveys" className={`${btnPrimary} mt-6`}>
            설문 목록으로
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </>
    );
  }

  const done = surveyKeys.filter((k) => record.surveys[k] === "done").length;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <AccHead
            id="ASM-05"
            title={`${student.name} 학생 설문`}
            back={{ href: "/my/surveys", label: "설문 목록으로" }}
          />
        </div>
        <p
          className={`mt-8 shrink-0 text-[13px] font-semibold ${
            done === surveyKeys.length ? "text-emerald-600" : "text-soft-muted"
          }`}
        >
          {done}/{surveyKeys.length} 제출
          {student.grade && <span className="ml-2 font-normal">{student.grade}</span>}
        </p>
      </div>

      <div className={`${card} divide-y divide-slate-100`}>
        {surveyKeys.map((key) => (
          <SurveyRow
            key={key}
            surveyKey={key}
            who={shortWho[key]}
            studentId={student.id}
            submitted={record.surveys[key] === "done"}
            sent={student.surveySends?.[key] ?? null}
            /* 어머니·아버지 설문은 등록할 때 받아 둔 보호자 연락처에서 출발한다.
               교사는 우리가 알 수 없는 번호라 비워 두고 직접 받는다. */
            fallbackPhone={key === "teacher" ? "" : (student.guardianPhone ?? "")}
            onFail={() => setToast("휴대전화 번호를 정확히 입력해 주세요.")}
            onSent={(phone) => {
              recordSurveySend(student.id, key, phone);
              setToast(`${phoneText(phone)}로 설문 링크를 보냈습니다.`);
            }}
          />
        ))}
      </div>

      <p className="mt-4 text-[12.5px] leading-[1.7] text-soft-muted">
        문자로 보낸 링크는 로그인 없이 열립니다. 아버지·교사께 계정을 따로 만들어 달라고
        하지 않으셔도 됩니다. 평소 모습 그대로 답하시면 되고, 보호자의 양육 태도를
        평가하거나 리포트에 출력하지 않습니다. 교사 설문이 없어도 나머지 축으로 해석은
        진행됩니다.
      </p>

      <Toast message={toast} onClose={() => setToast(null)} />
    </>
  );
}

/* ───────────────────────── 설문 한 줄 ───────────────────────── */

/**
 * 설문 하나 — 이름 · 상태 · 번호 · [발송] · [작성]이 한 줄에 선다.
 *
 * 설명을 줄마다 달지 않는다. 셋이 서로 다른 사람이라는 것과 링크가 로그인 없이 열린다는
 * 것은 표 아래에 한 번만 적으면 되고, 여기에서 볼 것은 「어디로 보낼까」와 「보냈나」다.
 */
function SurveyRow({
  surveyKey,
  who,
  studentId,
  submitted,
  sent,
  fallbackPhone,
  onSent,
  onFail,
}: {
  surveyKey: SurveyKey;
  who: string;
  studentId: string;
  submitted: boolean;
  /** 마지막으로 문자를 보낸 기록 */
  sent: { phone: string; at: string } | null;
  fallbackPhone: string;
  onSent: (phone: string) => void;
  onFail: () => void;
}) {
  const [phone, setPhone] = useState(phoneText(sent?.phone || fallbackPhone));
  const [bad, setBad] = useState(false);

  const digits = phone.replace(/\D/g, "");
  const ok = digits.length >= 10 && digits.length <= 11;

  const send = () => {
    if (!ok) {
      /* 줄을 늘리지 않고 알림으로 말한다 — 빨간 테두리만 두면 색을 못 보는 사람에게는
         아무 일도 일어나지 않은 것과 같다 */
      setBad(true);
      onFail();
      return;
    }
    setBad(false);
    /* ⚠ 문자는 아직 나가지 않는다. 붙일 때 이 자리에서 발송 API를 부르고, 그 결과가
       돌아온 뒤에 onSent로 기록을 남긴다 — 보내지 못했는데 「보냈다」가 남으면 안 된다. */
    onSent(digits);
  };

  const pill = "h-11 shrink-0 rounded-full px-5 text-[14px] font-semibold";

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5 px-5 py-4">
      <p className="w-[4.5rem] shrink-0 text-[15px] font-black text-soft-ink">{who}</p>

      <p className="w-[7.5rem] shrink-0 text-[13px]">
        <span className={submitted ? "font-semibold text-emerald-600" : "text-soft-muted"}>
          {submitted ? "제출됨" : "미제출"}
        </span>
        {/* 아직 안 냈어도 보내 두었으면 기다리는 중인 것이다 */}
        {!submitted && sent && (
          <span className="ml-1.5 tabular-nums text-soft-muted">
            {new Date(sent.at).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}{" "}
            발송
          </span>
        )}
      </p>

      <input
        type="tel"
        inputMode="numeric"
        aria-label={`${who} 휴대전화 번호`}
        value={phone}
        onChange={(e) => {
          setPhone(e.target.value.replace(/[^\d-]/g, "").slice(0, 13));
          setBad(false);
        }}
        placeholder="010-1234-5678"
        aria-invalid={bad}
        className={`h-11 min-w-[10rem] flex-1 tabular-nums ${
          bad ? input.replace("border-soft-line", "border-[#e5484d]") : input
        }`.replace("h-[3.25rem] ", "")}
      />

      <Button variant="outline" onClick={send} className={pill}>
        {sent ? "재발송" : "발송"}
      </Button>
      <Button
        onClick={() => surveyWindow(`/survey/${surveyKey}?student=${studentId}`)}
        className={pill}
      >
        작성
      </Button>
    </div>
  );
}
