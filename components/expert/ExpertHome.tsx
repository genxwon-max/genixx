"use client";

import Link from "next/link";
import { counselModes, spanLabel } from "@/lib/counselors";
import { today } from "@/lib/calendar";
import { expertDuties, type ExpertAccount } from "@/lib/expertAccounts";
import { Head, cardBox } from "@/components/student/self";
import {
  bookerText,
  CaseTag,
  dayLabel,
  isDead,
  ExpertGate,
  ExpertPhoto,
  useExpertMe,
  useMyBookings,
} from "./me";

/**
 * EXP-01 전문가 홈 (/expert) — 전문가가 로그인하고 도착하는 자리.
 *
 * 승인 전과 후가 같은 주소다. 승인 전에는 신청이 어디까지 갔는지를, 승인 뒤에는 받은
 * 권한과 다가오는 면담을 편다. 주소를 나누면(예전의 /my/pending처럼) 승인이 난 순간에
 * 보던 화면이 낡은 화면이 되고, 사람이 새로 고쳐도 제자리다.
 *
 * 다른 화면으로 가는 바로가기 묶음은 두지 않는다 — 갈 곳은 왼쪽 레일에 있고, 여기에는
 * 지금 알아야 할 것(권한 · 다가오는 면담)을 그대로 편다.
 */
export default function ExpertHome() {
  const me = useExpertMe();
  const gate = ExpertGate({ title: "전문가 홈", me });
  if (gate) return gate;

  const account = me.account!;
  if (account.state !== "approved") return <Waiting account={account} />;
  return <Dashboard account={account} />;
}

/* ───────────────────────── 승인 전 ───────────────────────── */

function Waiting({ account }: { account: ExpertAccount }) {
  const rejected = account.state === "rejected";
  const steps = [
    { t: "가입 신청 접수", d: "가입 신청이 접수되었습니다.", done: true },
    {
      t: "운영진 확인",
      d: "소속과 경력을 확인합니다. 필요한 증빙은 등록하신 연락처로 따로 요청드립니다.",
      done: false,
    },
    {
      t: "권한 부여",
      d: "담당하실 역할(출제자 · 검토자 · 진단 위원 · 상담사)을 정해 계정을 활성화합니다.",
      done: false,
    },
  ];

  return (
    <>
      <Head
        title={rejected ? "가입 신청이 반려되었습니다" : "가입 승인을 기다리는 중입니다"}
        lead={
          rejected
            ? "아래 사유를 확인하신 뒤 서류를 갖춰 다시 신청하실 수 있습니다."
            : "보통 1~2 영업일이 걸립니다. 승인되면 이 화면이 바로 전문가 홈으로 바뀝니다."
        }
      />

      {rejected ? (
        <div className={`${cardBox} mt-7 p-6 sm:p-7`}>
          <p className="text-[13px] font-semibold text-soft-muted">반려 사유</p>
          <p className="mt-2 text-[15px] leading-[1.75] text-soft-ink">
            {account.decision?.reason ?? "사유가 적히지 않았습니다."}
          </p>
          {account.decision && (
            <p className="mt-3 text-[12.5px] tabular-nums text-soft-muted">{account.decision.at}</p>
          )}
        </div>
      ) : (
        <div className={`${cardBox} mt-7 p-6 sm:p-7`}>
          <ol className="space-y-5">
            {steps.map((s, i) => (
              <li key={s.t} className="flex gap-4">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[13px] font-bold tabular-nums ${
                    s.done
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-soft-line text-soft-muted"
                  }`}
                >
                  {i + 1}
                </span>
                <div>
                  <p
                    className={`text-[15px] font-bold ${s.done ? "text-soft-ink" : "text-soft-muted"}`}
                  >
                    {s.t}
                    {s.done && <span className="ml-2 text-[12px] text-emerald-600">완료</span>}
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-soft-muted">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      <dl className={`${cardBox} mt-4 divide-y divide-slate-100 px-6 text-[14px]`}>
        {[
          ["신청 번호", account.id],
          ["이름", account.profile.name || "—"],
          [
            "가입 수단",
            account.provider ? `${account.provider} 간편가입` : `아이디 가입 · ${account.loginId}`,
          ],
          ["신청 시각", account.appliedAt],
        ].map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-4 py-3.5">
            <dt className="shrink-0 text-[13px] font-semibold text-soft-muted">{k}</dt>
            <dd className="min-w-0 text-right text-soft-ink">{v}</dd>
          </div>
        ))}
      </dl>

      {!rejected && (
        <p className="mt-5 text-[13px] leading-[1.8] text-soft-muted">
          기다리시는 동안{" "}
          <Link href="/expert/profile" className="font-semibold text-soft-primary hover:underline">
            내 정보
          </Link>
          에서 사진·연혁·소개를 채워 두실 수 있습니다. 승인 전에는 학생 자료가 하나도 보이지
          않습니다.
        </p>
      )}
    </>
  );
}

/* ───────────────────────── 승인 뒤 ───────────────────────── */

function Dashboard({ account }: { account: ExpertAccount }) {
  const p = account.profile;
  const counselor = account.duties.includes("counselor");
  const bookings = useMyBookings(account);
  const now = today();
  const coming = bookings.filter((b) => !isDead(b.status) && b.status !== "done" && b.date >= now);
  const waiting = coming.filter((b) => b.status === "requested").length;
  const console_ = account.duties.some((d) => d !== "counselor");

  return (
    <>
      <Head title={`${p.name} 전문가님`} lead={[p.role, p.org].filter(Boolean).join(" · ")} />

      <section className={`${cardBox} mt-7 flex gap-5 p-6 sm:p-7`}>
        <ExpertPhoto photo={p.photo} name={p.name} size={84} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-soft-muted">내 권한</p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {expertDuties
              .filter((d) => account.duties.includes(d.id))
              .map((d) => (
                <li key={d.id}>
                  <p className="text-[15px] font-bold text-soft-ink">{d.label}</p>
                  <p className="mt-1 text-[13px] leading-[1.7] text-soft-muted">{d.desc}</p>
                </li>
              ))}
          </ul>
          {console_ && (
            <p className="mt-4 border-t border-slate-100 pt-4 text-[12.5px] leading-[1.75] text-soft-muted">
              문항 출제·검토와 답안 진단은 운영 콘솔에서 합니다. 콘솔 계정은 운영진이 권한에 맞춰
              따로 발급해 드립니다.
            </p>
          )}
        </div>
      </section>

      {counselor && (
        <section className="mt-8">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[18px] font-bold text-soft-ink">다가오는 면담</h2>
            <span className="text-[13px] tabular-nums text-soft-muted">
              {coming.length}건{waiting > 0 && ` · 수락 대기 ${waiting}건`}
            </span>
          </div>

          {coming.length === 0 ? (
            <p className={`${cardBox} mt-3 p-10 text-center text-[13.5px] leading-[1.75] text-soft-muted`}>
              아직 잡힌 면담이 없습니다. 보호자나 학생이 면담을 신청하면 여기에 표시됩니다.
            </p>
          ) : (
            <ul className={`${cardBox} mt-3 divide-y divide-slate-100 overflow-hidden`}>
              {coming.slice(0, 5).map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/expert/clients/${b.studentId}`}
                    className="grid grid-cols-[minmax(0,1fr)_1rem] items-center gap-x-3 px-5 py-4 transition-colors hover:bg-slate-50 sm:px-6"
                  >
                    <span className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                      <span className="min-w-0">
                        <span className="block text-[15.5px] font-bold text-soft-ink">
                          {b.studentName}
                        </span>
                        <span className="mt-0.5 block text-[13px] text-soft-muted">
                          신청 {bookerText(b)}
                        </span>
                      </span>
                      <span className="text-[13.5px] font-semibold tabular-nums text-soft-ink sm:text-right">
                        {dayLabel(b.date)} {b.start}
                        <span className="ml-2 font-normal text-soft-muted">
                          {spanLabel(b.span)} · {counselModes[b.mode]} ·{" "}
                        </span>
                        <CaseTag status={b.status} />
                      </span>
                    </span>
                    <span aria-hidden className="text-[20px] leading-none text-slate-300">
                      ›
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}
