"use client";

import Link from "next/link";
import { useState } from "react";
import { ageFromBirth } from "@/lib/account";
import { recordAccess } from "@/lib/adminStore";
import {
  acceptCase,
  blankLog,
  caseStatusLabel,
  declineCase,
  saveCaseLog,
  startCase,
} from "@/lib/counselCaseStore";
import { counselModes, spanLabel } from "@/lib/counselors";
import { editions } from "@/lib/diagReport";
import { regId } from "@/lib/examStore";
import { Body, DescList, FormRow, PageHead, Panel, Status, Tag } from "@/components/admin2/ui";
import {
  bookerText,
  dayLabel,
  isDead,
  useClient,
  type ClientBooking,
  type ClientStudent,
} from "@/components/expert/me";
import { useDiags } from "@/components/student/diag";
import { caseTone, NotCounselor, useConsoleCounselor } from "../shared";

/**
 * EXP-06-3-1 내 상담 상세 — 학생 한 사람.
 *
 * 위에서 아래로 한 줄이다 — 면담 신청(수락 · 거절 · 상담 시작 · 상담일지) → 학생 정보 → 진단
 * 보고서. 신청마다 판 하나를 세우고, 그 판 안에서 지금 할 수 있는 일만 단추로 낸다.
 *
 *   신청 → 확정 → 진행중 → 완료        (lib/counselCaseStore.ts)
 *
 * ── 걸음마다 열리는 정보가 다르다 ──
 * 신청 단계에는 수락할지 정하는 데 필요한 것(학교 · 학년 · 상담 목적)만 보이고, 수락한 뒤에
 * 생년월일 · 보호자 · 진단 보고서가 열린다. 보호자 연락처는 가려 두고, 「연락처 보기」를
 * 누르면 펴지며 열람 기록이 남는다. 전문가 자리(/expert/clients)와 같은 규칙이다.
 */

const declineReasons = [
  "그 시간에 다른 일정이 생겼습니다",
  "제 담당 분야의 상담이 아닙니다",
  "이해관계가 있어 맡기 어렵습니다",
];

const maskPhone = (v: string) => {
  const d = v.replace(/\D/g, "");
  return d.length < 10 ? "***" : `${d.slice(0, 3)}-****-${d.slice(-4)}`;
};

const birthText = (b?: string) =>
  b && b.length === 8 ? `${b.slice(0, 4)}.${b.slice(4, 6)}.${b.slice(6)}` : null;

export default function CounselDetail({ studentId }: { studentId: string }) {
  const account = useConsoleCounselor();
  const { student, bookings } = useClient(account, studentId);

  if (!account) return <NotCounselor title="내 상담" />;

  const back = (
    <Link href="/admin2/counsel" className="a2-btn">
      ← 내 상담
    </Link>
  );

  if (!student) {
    return (
      <>
        <PageHead title="열 수 없는 학생입니다" back={back} />
        <Body>
          <Panel title="나에게 면담을 신청한 학생만 볼 수 있습니다">
            <p className="a2-t-sm text-(--a2-ink-2)">
              신청을 거절했거나 취소되었거나, 주소가 바뀌었을 수 있습니다.
            </p>
          </Panel>
        </Body>
      </>
    );
  }

  return (
    <>
      <PageHead title={student.name} back={back} />
      <Body className="flex flex-col gap-3">
        {bookings.map((b) => (
          <BookingPanel key={b.id} b={b} guardianName={student.guardianName} />
        ))}
        <StudentPanel student={student} bookings={bookings} actor={account.profile.name} />
        <ReportPanel student={student} />
      </Body>
    </>
  );
}

/* ───────────────────────── 신청 한 건 ───────────────────────── */

function BookingPanel({ b, guardianName }: { b: ClientBooking; guardianName?: string }) {
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState(declineReasons[0]);

  return (
    <Panel
      title={`${dayLabel(b.date)} ${b.start}`}
      meta={`${spanLabel(b.span)} · ${counselModes[b.mode]}`}
      actions={
        <>
          <Status tone={caseTone[b.status]}>{caseStatusLabel[b.status]}</Status>
          {b.status === "requested" && !declining && (
            <>
              <button type="button" className="a2-btn a2-btn-primary" onClick={() => acceptCase(b.id)}>
                수락
              </button>
              <button type="button" className="a2-btn a2-btn-danger" onClick={() => setDeclining(true)}>
                거절
              </button>
            </>
          )}
          {b.status === "confirmed" && (
            <button type="button" className="a2-btn a2-btn-primary" onClick={() => startCase(b.id)}>
              상담 시작
            </button>
          )}
        </>
      }
    >
      <DescList
        rows={[
          { k: "신청자", v: bookerText(b, guardianName) },
          {
            k: "상담 목적",
            v: b.note || <span className="text-(--a2-ink-4)">남긴 메시지가 없습니다.</span>,
          },
          ...(b.status === "declined"
            ? [{ k: "거절 사유", v: b.kase?.declineReason ?? "—" }]
            : []),
          ...(b.demo ? [{ k: "구분", v: <Tag>예시</Tag> }] : []),
        ]}
      />

      {declining && b.status === "requested" && (
        <div className="mt-3 border-t border-(--a2-line) pt-3">
          <label className="a2-field block" style={{ maxWidth: "24rem" }}>
            <span className="a2-label">거절 사유</span>
            <select className="a2-select" value={reason} onChange={(e) => setReason(e.target.value)}>
              {declineReasons.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <p className="a2-hint mt-2">
            거절하면 잡혀 있던 시간이 다시 열리고, 신청자에게는 「상담사 사정으로 취소 · 환불」로
            안내됩니다. 되돌릴 수 없습니다.
          </p>
          <div className="mt-2 flex gap-1.5">
            <button type="button" className="a2-btn a2-btn-danger" onClick={() => declineCase(b.id, reason)}>
              거절하기
            </button>
            <button type="button" className="a2-btn" onClick={() => setDeclining(false)}>
              취소
            </button>
          </div>
        </div>
      )}

      {(b.status === "ongoing" || b.status === "done") && !isDead(b.status) && (
        /* key에 저장 시각을 넣는다 — 저장한 뒤 편집기가 저장분으로 다시 선다 */
        <LogForm key={`${b.status}-${b.kase?.log?.savedAt ?? ""}`} b={b} />
      )}
    </Panel>
  );
}

/** 상담일지 — 진행중에는 쓰는 폼, 완료 뒤에는 읽는 표(수정을 누르면 다시 폼) */
function LogForm({ b }: { b: ClientBooking }) {
  const saved = b.kase?.log ?? null;
  const [editing, setEditing] = useState(b.status === "ongoing");
  const [draft, setDraft] = useState(saved ?? blankLog());
  const ok = draft.summary.trim().length > 0;

  const fields = [
    { k: "summary" as const, label: "상담 내용", rows: 5, req: true },
    { k: "advice" as const, label: "권고 사항", rows: 3, req: false },
    { k: "followUp" as const, label: "후속 조치", rows: 3, req: false },
  ];

  return (
    <div className="mt-3 border-t border-(--a2-line) pt-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="a2-h">상담일지</h3>
        <span className="a2-t-xs text-(--a2-ink-4)">
          {saved?.savedAt ? `${saved.savedAt} 저장` : "아직 저장하지 않았습니다"}
        </span>
      </div>

      {editing ? (
        <>
          <div className="a2-form">
            {fields.map((f) => (
              <FormRow key={f.k} label={f.label} req={f.req}>
                <textarea
                  className="a2-textarea"
                  rows={f.rows}
                  value={draft[f.k]}
                  onChange={(e) => setDraft((d) => ({ ...d, [f.k]: e.target.value }))}
                />
              </FormRow>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {b.status === "done" ? (
              <>
                <button
                  type="button"
                  className="a2-btn a2-btn-primary"
                  disabled={!ok}
                  onClick={() => saveCaseLog(b.id, draft, true)}
                >
                  일지 저장
                </button>
                <button type="button" className="a2-btn" onClick={() => setEditing(false)}>
                  취소
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="a2-btn a2-btn-primary"
                  disabled={!ok}
                  onClick={() => saveCaseLog(b.id, draft, true)}
                >
                  일지 저장하고 상담 완료
                </button>
                <button type="button" className="a2-btn" onClick={() => saveCaseLog(b.id, draft, false)}>
                  임시 저장
                </button>
              </>
            )}
            <span className="a2-t-xs text-(--a2-ink-4)">
              {ok ? "상담일지는 나와 운영 책임자만 봅니다." : "상담 내용을 적어야 완료할 수 있습니다."}
            </span>
          </div>
        </>
      ) : (
        <>
          <DescList rows={fields.map((f) => ({ k: f.label, v: saved?.[f.k] || "—" }))} />
          <button type="button" className="a2-btn mt-2" onClick={() => setEditing(true)}>
            일지 수정
          </button>
        </>
      )}
    </div>
  );
}

/* ───────────────────────── 학생 정보 ───────────────────────── */

function StudentPanel({
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
    { k: "이름", v: <span className="font-semibold">{student.name}</span> },
    { k: "학교", v: student.school || "—" },
    { k: "학년", v: student.grade || "—" },
  ];

  if (!student.accepted) {
    return (
      <Panel title="학생 정보" meta="신청 단계 — 일부만 보입니다">
        <DescList rows={basic} />
        <p className="a2-hint mt-2">
          생년월일 · 보호자 정보 · 진단 보고서는 신청을 수락한 뒤에 열립니다.
        </p>
      </Panel>
    );
  }

  return (
    <Panel title="학생 정보" meta="담당하는 면담을 위해서만 사용합니다">
      <DescList
        rows={[
          ...basic,
          {
            k: "생년월일",
            v: birthText(student.birth)
              ? `${birthText(student.birth)}${age !== null ? ` · 만 ${age}세` : ""}`
              : "—",
          },
          { k: "보호자", v: guardian || "—" },
          {
            k: "보호자 연락처",
            v: !student.guardianPhone ? (
              "—"
            ) : phoneOpen ? (
              <span className="a2-mono">{student.guardianPhone}</span>
            ) : (
              <span className="flex flex-wrap items-center gap-2">
                <span className="a2-mono">{maskPhone(student.guardianPhone)}</span>
                <button
                  type="button"
                  className="a2-btn a2-btn-sm"
                  onClick={() => {
                    /* 열람은 감사 로그에 남는다 */
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
                <span className="a2-t-xs text-(--a2-ink-4)">열람 기록이 남습니다</span>
              </span>
            ),
          },
          ...(profile?.interests?.length ? [{ k: "관심 분야", v: profile.interests.join(" · ") }] : []),
          ...(profile?.observation ? [{ k: "보호자가 본 아이", v: profile.observation }] : []),
        ]}
      />
    </Panel>
  );
}

/* ───────────────────────── 진단 보고서 ───────────────────────── */

const openReport = (edition: "summary" | "full", query: string) =>
  window.open(`/report/${edition}${query}`, "_blank", "noopener");

function ReportButtons({ query }: { query: string }) {
  return (
    <span className="flex gap-1.5">
      <button type="button" className="a2-btn a2-btn-sm" onClick={() => openReport("summary", query)}>
        {editions.summary.label}
      </button>
      <button type="button" className="a2-btn a2-btn-sm a2-btn-primary" onClick={() => openReport("full", query)}>
        {editions.full.label}
      </button>
    </span>
  );
}

function ReportPanel({ student }: { student: ClientStudent }) {
  const diags = useDiags(student.id);

  if (!student.accepted) {
    return (
      <Panel title="진단 보고서">
        <p className="a2-t-sm text-(--a2-ink-3)">진단 보고서는 신청을 수락한 뒤에 열립니다.</p>
      </Panel>
    );
  }

  if (student.demo) {
    return (
      <Panel title="진단 보고서" meta="예시 신청 — 예시 보고서를 붙였습니다">
        <DescList rows={[{ k: "예시 진단 보고서", v: <ReportButtons query="?sample=1" /> }]} />
      </Panel>
    );
  }

  return (
    <Panel title="진단 보고서" meta="발행된 진단만 열립니다">
      {diags.length === 0 ? (
        <p className="a2-t-sm text-(--a2-ink-3)">이 학생이 접수한 진단이 아직 없습니다.</p>
      ) : (
        <DescList
          rows={diags.map((d) => ({
            k: d.name,
            v:
              d.stage === "published" ? (
                <ReportButtons
                  query={`?student=${encodeURIComponent(student.id)}&reg=${encodeURIComponent(regId(d.ref))}`}
                />
              ) : (
                <span className="text-(--a2-ink-4)">보고서가 아직 발행되지 않았습니다</span>
              ),
          }))}
        />
      )}
    </Panel>
  );
}
