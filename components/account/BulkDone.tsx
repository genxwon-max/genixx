"use client";

import Link from "next/link";
import { useState } from "react";
import { ageFromBirth, CONSENT_AGE } from "@/lib/account";
import { themeOf } from "@/lib/authVariant";
import { useHydrated } from "@/lib/examStore";
import { useBulkDraft } from "@/lib/flowDraft";
import { formatCode, useRoster } from "@/lib/roster";
import { ArrowRight } from "@/components/Icons";
import Toast from "@/components/exam/Toast";
import { bulkSteps } from "./BulkRegister";
import { CopyCode } from "./ChildList";
import ConfirmDialog from "./ConfirmDialog";
import { phoneText } from "./SendCodes";
import { StepBar } from "./StepFlow";
import { AccHead, listTd, listTh } from "./ui";

const t = themeOf(2);

/** 「20150311」 → 「2015.03.11」 */
const birthText = (b: string) =>
  b.length === 8 ? `${b.slice(0, 4)}.${b.slice(4, 6)}.${b.slice(6)}` : b;

/**
 * ACC-03 학생 일괄 등록 ② 접속코드 받기 (/my/children/bulk/done).
 *
 * 등록을 마친 보호자가 지금 할 일은 코드를 아이들에게 넘기는 것 하나다. 그래서 이 화면에는
 * 아이마다 이름 · 학년 · 생년월일과 **큰 코드**를 한 줄씩 세우고, 넘기는 길 셋(복사 · 문자 ·
 * CSV)만 둔다. 예전에는 「3명 등록 완료」 알림만 잠깐 떴다 사라져, 누구에게 어떤 코드가
 * 나갔는지 보려면 아래 명부 표를 뒤져야 했다.
 *
 * 누구를 등록했는지는 앞 걸음이 남긴 ID(lib/flowDraft.ts)로 명부에서 읽는다. 주소에는 싣지
 * 않는다 — 학생 ID에는 접속코드가 들어 있다(lib/roster.ts addStudents).
 */
export default function BulkDone() {
  const hydrated = useHydrated();
  const roster = useRoster();
  const draft = useBulkDraft();
  const [ask, setAsk] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  if (!hydrated) {
    return <p className="py-16 text-center text-[13px] text-soft-muted">확인 중입니다…</p>;
  }

  const issued = draft.issued.flatMap((id) => roster.filter((s) => s.id === id));

  if (issued.length === 0) {
    return (
      <>
        <AccHead id="ACC-03" title="학생 일괄 등록" back={{ href: "/my", label: "홈으로" }} />
        <StepBar steps={bulkSteps} current={1} />
        <div className={`${t.card} p-10 text-center`}>
          <p className="text-[15px] font-bold text-soft-ink">방금 등록한 학생이 없습니다</p>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-[1.75] text-soft-muted">
            명단을 등록하면 여기에 아이마다 접속코드가 표시됩니다. 이미 등록한 아이의 코드는 학생
            목록에서 볼 수 있습니다.
          </p>
          <div className="mx-auto mt-6 grid max-w-[24rem] gap-2.5 sm:grid-cols-2">
            <Link href="/my/children/bulk" className={t.btnPrimary}>
              명단 입력으로
            </Link>
            <Link href="/my/children" className={t.btnNeutral}>
              학생 목록
            </Link>
          </div>
        </div>
      </>
    );
  }

  const withPhone = issued.filter((s) => s.phone);
  const teens = issued.filter((s) => (ageFromBirth(s.birth) ?? 0) >= CONSENT_AGE);

  const downloadCsv = () => {
    const head = "이름,생년월일,학년,접속코드";
    const body = issued
      .map((s) => [s.name, s.birth, s.grade ?? "", formatCode(s.code)].join(","))
      .join("\n");
    const blob = new Blob([`﻿${head}\n${body}`], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    a.download = `TalentMe_접속코드_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <AccHead
        id="ACC-03"
        title="학생 일괄 등록"
        lead={`${issued.length}명을 등록했습니다. 아이마다 접속코드를 전해 주세요.`}
        back={{ href: "/my", label: "홈으로" }}
      />

      <StepBar steps={bulkSteps} current={1} />

      <section aria-labelledby="bulk-codes" className={`${t.card} overflow-hidden`}>
        <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
          <h2 id="bulk-codes" className="text-[17px] font-bold text-soft-ink">
            발급한 접속코드 <span className="tabular-nums text-soft-muted">{issued.length}</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={downloadCsv} className={t.btnQuiet}>
              CSV로 내려받기
            </button>
            {/* 아이 휴대전화가 있는 아이에게만 보낸다. 없는 아이는 보호자가 전한다 */}
            <button
              type="button"
              onClick={() => setAsk(true)}
              disabled={withPhone.length === 0}
              className={`${t.btnAction} disabled:cursor-not-allowed disabled:bg-soft-line`}
            >
              아이 휴대전화로 보내기
            </button>
          </div>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse">
            <caption className="sr-only">방금 등록한 학생과 발급한 접속코드</caption>
            <thead>
              <tr>
                <th className={`${listTh} pl-6 text-left`}>이름</th>
                <th className={listTh}>학년</th>
                <th className={listTh}>생년월일</th>
                <th className={listTh}>아이 휴대전화</th>
                <th className={`${listTh} pr-6`}>접속코드</th>
              </tr>
            </thead>
            <tbody>
              {issued.map((s) => (
                <tr key={s.id}>
                  <td className={`${listTd} pl-6 text-left`}>
                    <Link
                      href={`/my/children/${s.id}`}
                      className="text-[14px] font-black text-soft-ink hover:underline"
                    >
                      {s.name}
                    </Link>
                  </td>
                  <td className={listTd}>{s.grade ?? "—"}</td>
                  <td className={`${listTd} tabular-nums`}>{birthText(s.birth)}</td>
                  <td className={`${listTd} tabular-nums`}>{s.phone ? phoneText(s.phone) : "없음"}</td>
                  <td className={`${listTd} pr-6`}>
                    <span className="block text-[18px] font-black tracking-[0.08em] tabular-nums text-soft-ink">
                      {formatCode(s.code)}
                    </span>
                    <CopyCode code={s.code} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-4 rounded-[14px] border border-soft-line bg-soft-primary-soft p-5 sm:p-6">
        <h2 className="text-[15px] font-bold text-soft-ink">아이에게 전할 때</h2>
        <ul className="mt-2.5 space-y-1.5 text-[13.5px] leading-[1.75] text-soft-ink">
          <li>
            · 아이는 학생 로그인에서 <b>접속코드와 생년월일</b>을 함께 넣고 들어옵니다. 코드만으로는
            들어갈 수 없습니다.
          </li>
          {teens.length > 0 && (
            <li>
              · 만 14세 이상인 아이({teens.map((s) => s.name).join(" · ")})는 처음 접속할 때 본인
              동의 화면이 먼저 뜹니다.
            </li>
          )}
          <li>· 재능 진단 접수는 「결제」 메뉴에서 아이를 골라 합니다.</li>
          <li>· 코드를 잃어버리면 학생 상세에서 다시 발급할 수 있습니다.</li>
        </ul>
      </section>

      <div className="mx-auto mt-7 grid max-w-[30rem] gap-2.5 sm:grid-cols-2">
        <Link href="/my/children" className={`${t.btnPrimary} gap-1.5`}>
          학생 목록으로
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link href="/my/children/bulk" className={t.btnNeutral}>
          더 등록하기
        </Link>
      </div>

      {ask && (
        <ConfirmDialog
          title={`${withPhone.length}명에게 접속코드를 보낼까요?`}
          confirmLabel="보내기"
          body={
            <>
              아이 휴대전화로 이름과 접속코드를 보냅니다.
              <br />
              <b className="text-soft-ink">
                {withPhone.map((s) => `${s.name}(${phoneText(s.phone)})`).join(" · ")}
              </b>
              {withPhone.length < issued.length && (
                <>
                  <br />
                  <br />
                  휴대전화가 없는 아이(
                  <b className="text-soft-ink">
                    {issued
                      .filter((s) => !s.phone)
                      .map((s) => s.name)
                      .join(" · ")}
                  </b>
                  )에게는 코드를 직접 전해 주세요.
                </>
              )}
            </>
          }
          onCancel={() => setAsk(false)}
          onConfirm={() => {
            /* ⚠ 문자는 아직 나가지 않는다. 붙일 때 이 자리에서 발송 API를 부른다 */
            setAsk(false);
            setToast(`${withPhone.length}명에게 접속코드를 보냈습니다.`);
          }}
        />
      )}

      <Toast message={toast} onClose={() => setToast(null)} />
    </>
  );
}
