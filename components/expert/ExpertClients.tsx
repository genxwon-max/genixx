"use client";

import Link from "next/link";
import { useState } from "react";
import { ageFromBirth } from "@/lib/account";
import { recordAccess } from "@/lib/adminStore";
import {
  acceptCase,
  blankLog,
  caseStatusLabel,
  caseSteps,
  declineCase,
  saveCaseLog,
  startCase,
} from "@/lib/counselCaseStore";
import { counselModes, spanLabel } from "@/lib/counselors";
import { editions } from "@/lib/diagReport";
import { regId, type RegRef } from "@/lib/examStore";
import { DefTable } from "@/components/account/ui";
import { StageTag, TierChip, useDiags } from "@/components/student/diag";
import { Head, btnGo, btnQuiet, cardBox } from "@/components/student/self";
import {
  bookerText,
  CaseTag,
  dayLabel,
  ExpertGate,
  isDead,
  useClient,
  useExpertMe,
  useMyBookings,
  type ClientBooking,
  type ClientStudent,
} from "./me";

/**
 * EXP-06-3 상담 관리 (/expert/clients) — 상담사에게 면담을 신청한 학부모·학생.
 *
 * 목록 → 상세다. 목록은 **신청 한 건이 한 줄**이고(누가 · 누구 이야기로 · 언제 · 지금
 * 어느 자리), 줄을 누르면 그 학생의 자리(/expert/clients/[student])로 들어가 신청을
 * 수락·거절하고, 상담을 시작하고, 상담일지를 쓴다.
 *
 *   신청 → 확정 → 진행중 → 완료        (lib/counselCaseStore.ts)
 *
 * ── 볼 수 있는 것은 나에게 신청한 학생뿐이고, 그것도 걸음마다 다르다 ──
 * 상담사 권한은 「학생 자료 열람」 권한이 아니다. 면담을 맡았기 때문에 그 면담에 필요한
 * 만큼을 본다.
 *   · 신청만 들어온 단계 — 수락할지 정하는 데 필요한 것(학교 · 학년 · 상담 목적)만
 *   · 수락한 뒤 — 생년월일 · 보호자 · 진단 보고서가 열린다
 *   · 보호자 연락처 — 가려 두고, 「연락처 보기」를 눌러야 펴지며 열람 기록이 남는다
 * 거절하거나 취소된 신청만 남은 학생은 주소를 직접 쳐도 열리지 않는다(components/expert/me.tsx).
 */

const need = { duty: "counselor" as const, label: "상담사" };

const count = (rows: ClientBooking[], s: ClientBooking["status"]) =>
  rows.filter((b) => b.status === s).length;

export default function ExpertClients() {
  const me = useExpertMe();
  const bookings = useMyBookings(me.account);
  const gate = ExpertGate({ title: "상담 관리", me, need });
  if (gate) return gate;

  return (
    <>
      <Head
        title="상담 관리"
        lead="나에게 결과 해석 면담을 신청한 학부모와 학생입니다. 항목을 누르면 신청을 수락·거절하고, 상담일지를 쓸 수 있습니다."
        right={
          <span className="text-[13px] tabular-nums text-soft-muted">
            신청 {count(bookings, "requested")} · 확정 {count(bookings, "confirmed")} · 진행중{" "}
            {count(bookings, "ongoing")} · 완료 {count(bookings, "done")}
          </span>
        }
      />

      {bookings.length === 0 ? (
        <div className={`${cardBox} mt-7 p-10 text-center`}>
          <p className="text-[15px] font-bold text-soft-ink">아직 들어온 면담 신청이 없습니다</p>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-[1.75] text-soft-muted">
            보호자나 학생이 면담 신청 화면에서 나를 고르면 여기에 표시됩니다. 상담할 수 있는 날과
            시간은 「상담 일정」에서 정합니다.
          </p>
          <Link href="/expert/schedule" className={`${btnGo} mt-5`}>
            상담 일정 정하기
          </Link>
        </div>
      ) : (
        <ul className={`${cardBox} mt-7 divide-y divide-slate-100 overflow-hidden`}>
          {bookings.map((b) => {
            const dead = isDead(b.status);
            const body = (
              <>
                <span className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                  <span className="min-w-0">
                    <span
                      className={`flex flex-wrap items-center gap-2 text-[15.5px] font-bold ${dead ? "text-slate-400" : "text-soft-ink"}`}
                    >
                      {b.studentName}
                      {b.demo && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11.5px] font-bold text-slate-500">
                          예시
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-[13px] text-soft-muted">
                      신청 {bookerText(b)}
                    </span>
                  </span>
                  <span className="flex flex-col gap-0.5 sm:w-60 sm:shrink-0 sm:items-end sm:text-right">
                    <span className="text-[13.5px] font-semibold tabular-nums text-soft-ink">
                      {dayLabel(b.date)} {b.start}
                    </span>
                    <span className="text-[12.5px] text-soft-muted">
                      {spanLabel(b.span)} · {counselModes[b.mode]} · <CaseTag status={b.status} />
                    </span>
                  </span>
                </span>
                <span aria-hidden className="text-[20px] leading-none text-slate-300">
                  {dead ? "" : "›"}
                </span>
              </>
            );
            const row = "grid grid-cols-[minmax(0,1fr)_1rem] items-center gap-x-3 px-5 py-4 sm:px-6";
            return (
              <li key={b.id}>
                {/* 거절·취소된 신청은 열 곳이 없다 — 면담이 없으면 그 학생을 볼 까닭도 없다 */}
                {dead ? (
                  <div className={row}>{body}</div>
                ) : (
                  <Link
                    href={`/expert/clients/${b.studentId}`}
                    className={`${row} transition-colors hover:bg-slate-50`}
                  >
                    {body}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

/* ───────────────────────── 학생 한 사람 ───────────────────────── */

const back = { href: "/expert/clients", label: "상담 관리" };

/** 「20180314」 → 「2018.03.14」 */
function birthText(birth: string | undefined) {
  if (!birth || birth.length !== 8) return null;
  return `${birth.slice(0, 4)}.${birth.slice(4, 6)}.${birth.slice(6)}`;
}

/** 가운데를 가린 연락처 — 「010-****-2267」 */
function maskPhone(v: string) {
  const d = v.replace(/\D/g, "");
  return d.length < 10 ? "***" : `${d.slice(0, 3)}-****-${d.slice(-4)}`;
}

/** 보고서 새 창 — 결과 화면(components/exam/ResultView.tsx의 ReportLinks)과 같은 주소 */
function openReport(edition: "summary" | "full", query: string) {
  window.open(`/report/${edition}${query}`, "_blank", "noopener");
}

export function ExpertClientDetail({ studentId }: { studentId: string }) {
  const me = useExpertMe();
  const { student, bookings } = useClient(me.account, studentId);
  const gate = ExpertGate({ title: "학생 정보", me, need });
  if (gate) return gate;

  if (!student) {
    return (
      <>
        <Head back={back} title="볼 수 없는 학생입니다" />
        <div className={`${cardBox} mt-7 p-10 text-center`}>
          <p className="mx-auto max-w-md text-[13.5px] leading-[1.75] text-soft-muted">
            나에게 면담을 신청한 학생만 볼 수 있습니다. 신청을 거절했거나 취소되었거나, 주소가
            바뀌었을 수 있습니다.
          </p>
          <Link href={back.href} className={`${btnGo} mt-5`}>
            상담 관리 목록으로
          </Link>
        </div>
      </>
    );
  }

  const actor = me.account!.profile.name;

  return (
    <>
      <Head
        back={back}
        title={student.name}
        lead={[student.school, student.grade].filter(Boolean).join(" · ")}
      />

      <h2 className="mt-8 text-[18px] font-bold text-soft-ink">면담 신청</h2>
      <ul className="mt-3 flex flex-col gap-3">
        {bookings.map((b) => (
          <BookingCard key={b.id} b={b} guardianName={student.guardianName} />
        ))}
      </ul>

      <h2 className="mt-8 text-[18px] font-bold text-soft-ink">학생 정보</h2>
      <StudentInfo student={student} bookings={bookings} actor={actor} />

      <h2 className="mt-8 text-[18px] font-bold text-soft-ink">진단 결과 · 보고서</h2>
      {!student.accepted ? (
        <p className={`${cardBox} mt-3 p-8 text-center text-[13.5px] leading-[1.75] text-soft-muted`}>
          진단 보고서는 신청을 수락한 뒤에 열립니다.
        </p>
      ) : student.demo ? (
        <DemoReports />
      ) : (
        <Reports student={student} />
      )}
    </>
  );
}

/* ───────────────────────── 신청 한 건 — 수락 · 거절 · 시작 · 일지 ───────────────────────── */

/** 네 걸음을 한 줄로 — 지금 자리까지 색을 채운다 */
function Steps({ status }: { status: ClientBooking["status"] }) {
  const at = caseSteps.indexOf(status);
  return (
    <ol className="mt-4 flex items-center gap-1.5" aria-label="상담 진행 단계">
      {caseSteps.map((s, i) => (
        <li key={s} className="flex flex-1 items-center gap-1.5">
          <span
            aria-current={i === at ? "step" : undefined}
            className={`w-full rounded-full px-2 py-1.5 text-center text-[12px] font-bold ${
              i === at
                ? "bg-soft-primary text-white"
                : i < at
                  ? "bg-soft-primary-soft text-soft-primary"
                  : "bg-slate-100 text-slate-400"
            }`}
          >
            {caseStatusLabel[s]}
          </span>
        </li>
      ))}
    </ol>
  );
}

const area =
  "w-full rounded-[12px] border border-soft-line bg-white px-4 py-3 text-[14.5px] leading-[1.7] text-soft-ink outline-none transition-colors placeholder:text-slate-400 focus:border-soft-primary focus:ring-2 focus:ring-soft-primary-soft";

const declineReasons = [
  "그 시간에 다른 일정이 생겼습니다",
  "제 담당 분야의 상담이 아닙니다",
  "이해관계가 있어 맡기 어렵습니다",
];

function BookingCard({ b, guardianName }: { b: ClientBooking; guardianName?: string }) {
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState(declineReasons[0]);
  const dead = isDead(b.status);

  return (
    <li className={`${cardBox} p-5 sm:p-6`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-[15.5px] font-bold tabular-nums text-soft-ink">
          {dayLabel(b.date)} {b.start}
          <span className="ml-2 text-[13px] font-normal text-soft-muted">
            {spanLabel(b.span)} · {counselModes[b.mode]}
          </span>
        </p>
        <CaseTag status={b.status} />
      </div>
      <p className="mt-1 text-[13px] text-soft-muted">신청 {bookerText(b, guardianName)}</p>

      {!dead && <Steps status={b.status} />}

      <p className="mt-4 text-[12.5px] font-semibold text-soft-muted">상담 목적 · 신청할 때 남긴 메시지</p>
      <p className="mt-1.5 rounded-[10px] bg-slate-50 px-4 py-3 text-[13.5px] leading-[1.75] text-soft-ink">
        {b.note || <span className="text-soft-muted">남긴 메시지가 없습니다.</span>}
      </p>

      {b.status === "declined" && (
        <p className="mt-3 text-[13px] leading-[1.7] text-soft-muted">
          거절 사유 — {b.kase?.declineReason ?? "적지 않음"}
        </p>
      )}

      {b.status === "requested" &&
        (declining ? (
          <div className="mt-4 rounded-[12px] border border-soft-line p-4">
            <label htmlFor={`why-${b.id}`} className="text-[13px] font-semibold text-soft-ink">
              거절 사유
            </label>
            <select
              id={`why-${b.id}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-2 h-11 w-full rounded-[10px] border border-soft-line bg-white px-3 text-[14px] text-soft-ink"
            >
              {declineReasons.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <p className="mt-2 text-[12.5px] leading-[1.7] text-soft-muted">
              거절하면 잡혀 있던 시간이 다시 열리고, 신청자에게는 「상담사 사정으로 취소 · 환불」로
              안내됩니다. 되돌릴 수 없습니다.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className={btnGo} onClick={() => declineCase(b.id, reason)}>
                거절하기
              </button>
              <button type="button" className={btnQuiet} onClick={() => setDeclining(false)}>
                돌아가기
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className={btnGo} onClick={() => acceptCase(b.id)}>
              수락
            </button>
            <button type="button" className={btnQuiet} onClick={() => setDeclining(true)}>
              거절
            </button>
          </div>
        ))}

      {b.status === "confirmed" && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" className={btnGo} onClick={() => startCase(b.id)}>
            상담 시작
          </button>
          <span className="text-[12.5px] text-soft-muted">
            시작하면 상담일지를 쓸 수 있습니다.
          </span>
        </div>
      )}

      {(b.status === "ongoing" || b.status === "done") && (
        /* key에 저장 시각을 넣는다 — 저장한 뒤 편집기가 저장분으로 다시 선다 */
        <LogPanel key={`${b.status}-${b.kase?.log?.savedAt ?? ""}`} b={b} />
      )}
    </li>
  );
}

/** 상담일지 — 진행중에는 쓰는 판, 완료 뒤에는 읽는 판(고치기를 누르면 다시 쓰는 판) */
function LogPanel({ b }: { b: ClientBooking }) {
  const saved = b.kase?.log ?? null;
  const [editing, setEditing] = useState(b.status === "ongoing");
  const [draft, setDraft] = useState(saved ?? blankLog());
  const [tried, setTried] = useState(false);
  const ok = draft.summary.trim().length > 0;

  const fields: { k: "summary" | "advice" | "followUp"; label: string; hint: string; rows: number }[] = [
    { k: "summary", label: "상담 내용", hint: "무슨 이야기를 나눴는지 적습니다.", rows: 5 },
    { k: "advice", label: "권고 사항", hint: "가정·학교에 권한 것", rows: 3 },
    { k: "followUp", label: "후속 조치", hint: "다음에 볼 것 · 이어서 할 일", rows: 3 },
  ];

  if (!editing) {
    return (
      <div className="mt-5 border-t border-slate-100 pt-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className="text-[14.5px] font-bold text-soft-ink">상담일지</p>
          <span className="text-[12.5px] tabular-nums text-soft-muted">{saved?.savedAt} 저장</span>
        </div>
        <dl className="mt-3 flex flex-col gap-3">
          {fields.map((f) => (
            <div key={f.k}>
              <dt className="text-[12.5px] font-semibold text-soft-muted">{f.label}</dt>
              <dd className="mt-1 whitespace-pre-wrap text-[14px] leading-[1.75] text-soft-ink">
                {saved?.[f.k] || <span className="text-soft-muted">—</span>}
              </dd>
            </div>
          ))}
        </dl>
        <button type="button" className={`${btnQuiet} mt-4`} onClick={() => setEditing(true)}>
          일지 고치기
        </button>
      </div>
    );
  }

  const save = (finish: boolean) => {
    setTried(true);
    if (finish && !ok) return;
    saveCaseLog(b.id, draft, finish);
  };

  return (
    <div className="mt-5 border-t border-slate-100 pt-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-[14.5px] font-bold text-soft-ink">상담일지</p>
        {saved?.savedAt && (
          <span className="text-[12.5px] tabular-nums text-soft-muted">{saved.savedAt} 저장</span>
        )}
      </div>
      <div className="mt-3 flex flex-col gap-4">
        {fields.map((f) => (
          <div key={f.k} className="flex flex-col gap-1.5">
            <label htmlFor={`${f.k}-${b.id}`} className="text-[13px] font-semibold text-soft-ink">
              {f.label}
              <span className="ml-2 font-normal text-soft-muted">{f.hint}</span>
            </label>
            <textarea
              id={`${f.k}-${b.id}`}
              rows={f.rows}
              className={area}
              value={draft[f.k]}
              onChange={(e) => setDraft((d) => ({ ...d, [f.k]: e.target.value }))}
            />
          </div>
        ))}
      </div>
      {tried && !ok && (
        <p role="alert" className="mt-2 text-[13px] text-[#e5484d]">
          상담 내용을 적어야 완료할 수 있습니다.
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {b.status === "done" ? (
          <>
            <button type="button" className={btnGo} onClick={() => save(true)}>
              일지 저장
            </button>
            <button type="button" className={btnQuiet} onClick={() => setEditing(false)}>
              그만두기
            </button>
          </>
        ) : (
          <>
            <button type="button" className={btnGo} onClick={() => save(true)}>
              일지 저장하고 상담 완료
            </button>
            <button type="button" className={btnQuiet} onClick={() => save(false)}>
              임시 저장
            </button>
          </>
        )}
      </div>
      <p className="mt-3 text-[12.5px] leading-[1.7] text-soft-muted">
        상담일지는 나와 운영 책임자만 봅니다. 보호자·학생에게는 보이지 않습니다.
      </p>
    </div>
  );
}

/* ───────────────────────── 학생 정보 — 걸음에 따라 열린다 ───────────────────────── */

function StudentInfo({
  student,
  bookings,
  actor,
}: {
  student: ClientStudent;
  bookings: ClientBooking[];
  actor: string;
}) {
  const [phoneOpen, setPhoneOpen] = useState(false);
  const age = student.birth ? ageFromBirth(student.birth) : null;
  const profile = student.roster?.profile;
  const guardian =
    student.guardianName ||
    bookings.find((b) => b.bookerRole !== "student" && b.bookerName)?.bookerName;

  const basic = [
    { k: "이름", v: student.name },
    { k: "학교", v: student.school || "—" },
    { k: "학년", v: student.grade || "—" },
  ];

  if (!student.accepted) {
    return (
      <>
        <div className={`mt-3 overflow-hidden ${cardBox}`}>
          <DefTable rows={basic} />
        </div>
        <p className="mt-3 text-[12.5px] leading-[1.75] text-soft-muted">
          신청 단계에서는 수락 여부를 정하는 데 필요한 정보만 보입니다. 생년월일 · 보호자 정보 ·
          진단 보고서는 신청을 수락한 뒤에 열립니다.
        </p>
      </>
    );
  }

  return (
    <>
      <div className={`mt-3 overflow-hidden ${cardBox}`}>
        <DefTable
          rows={[
            ...basic,
            {
              k: "생년월일",
              v: birthText(student.birth) ? (
                <>
                  {birthText(student.birth)}
                  {age !== null && <span className="ml-2 text-soft-muted">만 {age}세</span>}
                </>
              ) : (
                "—"
              ),
            },
            { k: "보호자", v: guardian || "—" },
            {
              k: "보호자 연락처",
              v: !student.guardianPhone ? (
                "—"
              ) : phoneOpen ? (
                <span className="tabular-nums">{student.guardianPhone}</span>
              ) : (
                <span className="flex flex-wrap items-center gap-3">
                  <span className="tabular-nums">{maskPhone(student.guardianPhone)}</span>
                  <button
                    type="button"
                    className="text-[13px] font-semibold text-soft-primary hover:underline"
                    onClick={() => {
                      /* 열람은 기록으로 남긴다 — 관리자 감사 기록(ADM-12)에서 함께 보인다 */
                      recordAccess(
                        `학생 ${student.id} · ${student.name} 보호자 연락처`,
                        "결과 해석 면담 진행",
                        `${actor} (상담사)`,
                      );
                      setPhoneOpen(true);
                    }}
                  >
                    연락처 보기
                  </button>
                </span>
              ),
            },
            ...(profile?.interests?.length
              ? [{ k: "관심 분야", v: profile.interests.join(" · ") }]
              : []),
            ...(profile?.observation ? [{ k: "보호자가 본 아이", v: profile.observation }] : []),
          ]}
        />
      </div>
      <p className="mt-3 text-[12.5px] leading-[1.75] text-soft-muted">
        이 정보는 담당하는 면담을 위해서만 사용합니다. 연락처를 확인하면 열람 기록이 남습니다.
      </p>
    </>
  );
}

/* ───────────────────────── 보고서 ───────────────────────── */

/** 보고서 단추 둘 — 요약본과 정밀본. 상담사는 정밀본을 「받기」 없이 연다(LiveReport) */
function ReportButtons({ query }: { query: string }) {
  return (
    <span className="flex flex-wrap gap-2">
      <button type="button" className={btnQuiet} onClick={() => openReport("summary", query)}>
        {editions.summary.label}
      </button>
      <button type="button" className={btnGo} onClick={() => openReport("full", query)}>
        {editions.full.label}
      </button>
    </span>
  );
}

/** 이 학생이 접수한 진단 — 발행된 것만 보고서가 열린다 */
function Reports({ student }: { student: ClientStudent }) {
  const diags = useDiags(student.id);

  if (diags.length === 0) {
    return (
      <p className={`${cardBox} mt-3 p-10 text-center text-[13.5px] leading-[1.75] text-soft-muted`}>
        이 학생이 접수한 진단이 아직 없습니다.
      </p>
    );
  }

  const query = (ref: RegRef) =>
    `?student=${encodeURIComponent(student.id)}&reg=${encodeURIComponent(regId(ref))}`;

  return (
    <ul className={`${cardBox} mt-3 divide-y divide-slate-100`}>
      {diags.map((d) => (
        <li
          key={d.id}
          className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
        >
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2 text-[15.5px] font-bold text-soft-ink">
              {d.name}
              <TierChip tier={d.reg.tier} />
            </span>
            <span className="mt-1 block">
              <StageTag stage={d.stage} />
            </span>
          </span>
          {d.stage === "published" ? (
            <ReportButtons query={query(d.ref)} />
          ) : (
            <span className="text-[12.5px] text-soft-muted">보고서가 아직 발행되지 않았습니다</span>
          )}
        </li>
      ))}
    </ul>
  );
}

/** 시연용 예시 신청 — 명부에 없는 학생이라 예시 보고서를 붙인다 */
function DemoReports() {
  return (
    <>
      <ul className={`${cardBox} mt-3`}>
        <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="min-w-0">
            <span className="block text-[15.5px] font-bold text-soft-ink">예시 진단 보고서</span>
            <span className="mt-1 block">
              <StageTag stage="published" />
            </span>
          </span>
          <ReportButtons query="?sample=1" />
        </li>
      </ul>
      <p className="mt-3 text-[12.5px] leading-[1.75] text-soft-muted">
        시연 계정에 넣어 둔 예시 신청입니다. 이 브라우저에 응시 기록이 없는 학생이라 예시 보고서를
        붙였습니다. 실제 신청에는 그 학생이 접수한 진단과 발행된 보고서가 표시됩니다.
      </p>
    </>
  );
}
