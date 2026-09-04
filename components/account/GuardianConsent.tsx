"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ageFromBirth,
  CONSENT_AGE,
  consentRouteInfo,
  MAJORITY_AGE,
} from "@/lib/account";
import {
  declineRequest,
  findGuardianRequest,
  grantRequest,
  maskPhone,
  useGuardianRequests,
} from "@/lib/guardianRequest";
import {
  addStudents,
  declineGuardianConsent,
  findById,
  formatCode,
  grantGuardianConsent,
} from "@/lib/roster";
import { useHydrated } from "@/lib/examStore";
import { themeOf, type Variant } from "@/lib/authVariant";

/**
 * ACC-03-1 법정대리인 동의 — 문자·알림톡으로 받은 링크가 도착하는 자리.
 *
 * 학생이 요청했든 기관이 요청했든, 동의를 누르는 사람은 **언제나 법정대리인 본인**이다.
 * 그래서 이 화면은 요청을 만든 쪽에서 열 수 없고, 링크의 토큰(?req=)으로만 열린다.
 *
 * 순서 —
 *   ① 본인확인   성년인지, 그리고 본인이 맞는지 확인한다. 법정대리인 신원 확인의 근거다.
 *   ② 관계 확인   친권자인지 미성년후견인인지 고른다.
 *   ③ 자녀별 동의 수집 항목과 이용 목적을 보고 동의한다.
 *   ④ 자녀 등록   **동의가 끝난 뒤에야** 아이 이름과 생년월일을 받는다.
 *
 * ④를 뒤에 둔 것이 이 화면의 핵심이다. 동의를 받기 전에는 법정대리인의 성명과
 * 연락처만 들고 있었고, 아이 정보는 여기서 처음 저장된다.
 *
 * 기관이 임시등록해 둔 학생과 이어진 요청이면 ④는 건너뛴다. 이미 명부에 있는 학생의
 * 상태가 「보호자 동의 대기」에서 「보호자 동의 완료」로 바뀔 뿐이다.
 */

const relations = [
  "어머니(친권자)",
  "아버지(친권자)",
  "미성년후견인",
  "기타 법정대리인",
];

/** 본인확인기관이 돌려줬다고 가정하는 값 — 성년/미성년 두 갈래를 다 볼 수 있게 둔다 */
const passDemo: { key: string; label: string; birth: string; phone: string }[] = [
  { key: "adult", label: "인증 완료 (성인)", birth: "19860420", phone: "01012345678" },
  { key: "minor", label: "인증 완료 (만 17세)", birth: "20080711", phone: "01098761234" },
];

const collectRows: { k: string; v: string }[] = [
  {
    k: "수집 항목",
    v: "[필수] 학생 이름, 생년월일, 진단 응답 데이터 [선택] 학교, 학년",
  },
  { k: "이용 목적", v: "학력·재능 진단의 실시와 결과 리포트 작성·제공" },
  { k: "보유·이용 기간", v: "수집일로부터 5년. 철회 시 지체 없이 파기" },
  { k: "제3자 제공", v: "없음. 본인확인기관에는 인증 목적의 최소 정보만 전달됩니다." },
  {
    k: "철회 방법",
    v: "받으신 링크 또는 [내 정보 > 자녀 프로필]에서 언제든 철회할 수 있습니다.",
  },
];

type Phase = "verify" | "consent" | "child" | "done" | "declined";

export default function GuardianConsent({
  reqId,
  variant = 2,
}: {
  reqId?: string;
  variant?: Variant;
}) {
  const t = themeOf(variant);
  const hydrated = useHydrated();
  // 목록을 구독해 둬야 동의 직후 화면이 다시 그려진다
  useGuardianRequests();

  const [phase, setPhase] = useState<Phase>("verify");
  const [passOpen, setPassOpen] = useState(false);
  const [verified, setVerified] = useState<{ birth: string; phone: string } | null>(null);
  const [relation, setRelation] = useState(relations[0]);
  const [agreed, setAgreed] = useState(false);
  const [kidsRead, setKidsRead] = useState(false);
  const [tried, setTried] = useState(false);
  const [child, setChild] = useState({ name: "", birth: "", school: "", grade: "" });
  const [issued, setIssued] = useState<{ name: string; code: string } | null>(null);

  if (!hydrated) {
    return <p className={`container-x py-20 text-center text-[14px] ${t.muted}`}>확인 중입니다…</p>;
  }

  const req = reqId ? findGuardianRequest(reqId) : null;

  if (!req) {
    return (
      <Shell variant={variant}>
        <h1 className={t.heading}>동의 링크를 찾을 수 없습니다</h1>
        <p className={`${t.lead} mt-3`}>
          링크가 만료되었거나 이미 처리된 요청일 수 있습니다. 요청을 보낸 학생 또는 기관에 다시
          발송을 요청해 주세요.
        </p>
        <Link href="/" className={`${t.btnQuiet} mt-6`}>
          홈으로
        </Link>
      </Shell>
    );
  }

  const linked = req.studentId ? findById(req.studentId) : null;
  const alreadyDecided = req.status === "granted" || req.status === "declined";

  const guardianAge = verified ? ageFromBirth(verified.birth) : null;
  const isAdult = guardianAge !== null && guardianAge >= MAJORITY_AGE;

  const childDigits = child.birth.replace(/\D/g, "");
  const childAge = ageFromBirth(childDigits);
  const childNameOk = child.name.trim().length >= 2;
  const childBirthOk = childDigits.length === 8 && childAge !== null;

  const from =
    req.origin === "org"
      ? `${req.originName ?? "기관"}이(가) 보낸 요청`
      : req.origin === "parent"
        ? "보호자 계정에서 만든 요청"
        : "학생이 직접 보낸 요청";

  /* ── 이미 처리된 요청 ── */
  if (alreadyDecided && phase === "verify") {
    return (
      <Shell variant={variant}>
        <h1 className={t.heading}>
          이미 {req.status === "granted" ? "동의가 완료된" : "처리된"} 요청입니다
        </h1>
        <p className={`${t.lead} mt-3`}>
          {req.status === "granted"
            ? "이 요청에는 이미 동의하셨습니다. 학생 계정은 활성화되어 있습니다."
            : "이 요청은 동의하지 않음으로 처리되었습니다. 다시 진행하시려면 새 요청을 받아 주세요."}
        </p>
        <Link href="/" className={`${t.btnQuiet} mt-6`}>
          홈으로
        </Link>
      </Shell>
    );
  }

  /* ── 완료 ── */
  if (phase === "done") {
    return (
      <Shell variant={variant}>
        <span
          aria-hidden
          className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-[22px] text-emerald-600"
        >
          ✓
        </span>
        <h1 className={`${t.heading} mt-4`}>동의가 완료되었습니다</h1>
        <p className={`${t.lead} mt-3`}>
          {issued
            ? `${issued.name} 학생의 프로필이 활성화되었습니다.`
            : `${linked ? `${linked.name} 학생` : "학생"}의 프로필이 활성화되었습니다.`}{" "}
          이제 배정된 평가에 응시할 수 있습니다.
        </p>

        <div className={`${t.cardSoft} mt-6 p-5`}>
          <p className="text-[14px] font-bold">응시 방법</p>
          <p className={`mt-1.5 text-[13px] leading-[1.7] ${t.muted}`}>
            학생은 아래 접속코드와 생년월일로 응시 화면에 들어갑니다.
          </p>
          <p className="mt-3 text-[22px] font-black tracking-[0.14em] tabular-nums">
            {formatCode(issued?.code ?? linked?.code ?? "--------")}
          </p>
        </div>

        <div className={`${t.card} mt-4 p-5`}>
          <p className="text-[14px] font-bold">동의 증빙으로 남는 것</p>
          <ul className={`mt-2 flex flex-col gap-1.5 text-[13px] leading-[1.7] ${t.muted}`}>
            <li>· 동의 일시와 동의문 버전</li>
            <li>· 본인확인 결과값(휴대전화 본인인증)</li>
            <li>· 확인된 관계 — {relation}</li>
          </ul>
          <p className={`mt-3 text-[13px] leading-[1.7] ${t.muted}`}>
            동의는 언제든 철회할 수 있고, 철회하시면 응시와 결과 접근이 즉시 멈추고 파기 절차가
            시작됩니다.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-2.5">
          <Link href="/login/student" className={t.btnQuiet}>
            학생 응시 화면으로
          </Link>
          <Link href="/signup/type?stage=method&type=parent" className={t.btnQuiet}>
            보호자 계정 만들기
          </Link>
        </div>
      </Shell>
    );
  }

  /* ── 거절 ── */
  if (phase === "declined") {
    return (
      <Shell variant={variant}>
        <h1 className={t.heading}>동의하지 않음으로 처리했습니다</h1>
        <p className={`${t.lead} mt-3`}>
          학생 계정은 활성화되지 않습니다. 요청을 보낸 쪽에는 「동의 거절」 상태만 전달되며, 이
          화면에서 입력하신 값은 저장되지 않습니다.
        </p>
        <div className={`${t.cardSoft} mt-6 p-5`}>
          <p className={`text-[13px] leading-[1.7] ${t.muted}`}>
            기관이 임시등록해 둔 정보가 있다면 삭제 또는 비활성 처리 대상이 됩니다. 마음이 바뀌시면
            요청을 다시 받아 진행하실 수 있습니다.
          </p>
        </div>
        <Link href="/" className={`${t.btnQuiet} mt-6`}>
          홈으로
        </Link>
      </Shell>
    );
  }

  /* ── ① 본인확인 ── */
  if (phase === "verify") {
    return (
      <Shell variant={variant}>
        <p className={`text-[13px] font-bold ${t.muted}`}>{from}</p>
        <h1 className={`${t.heading} mt-2`}>법정대리인 동의를 요청받으셨습니다</h1>
        <p className={`${t.lead} mt-3`}>
          {req.childLabel ? `「${req.childLabel}」` : "자녀"} 님이 만 {CONSENT_AGE}세 미만이라,
          법정대리인의 동의가 있어야 개인정보를 처리할 수 있습니다(개인정보보호법 제22조의2).
        </p>

        <div className={`${t.card} mt-6 p-5`}>
          <dl className="flex flex-col gap-2.5 text-[13.5px]">
            <div className="flex gap-3">
              <dt className={`w-24 shrink-0 font-semibold ${t.muted}`}>받는 분</dt>
              <dd className="font-bold">{req.guardianName}</dd>
            </div>
            <div className="flex gap-3">
              <dt className={`w-24 shrink-0 font-semibold ${t.muted}`}>연락처</dt>
              <dd className="tabular-nums">{maskPhone(req.guardianPhone)}</dd>
            </div>
            {linked && (
              <div className="flex gap-3">
                <dt className={`w-24 shrink-0 font-semibold ${t.muted}`}>대상 학생</dt>
                <dd className="font-bold">{linked.name}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <p className={t.fieldLabel}>① 본인확인</p>
          {!passOpen && !verified && (
            <button type="button" onClick={() => setPassOpen(true)} className={t.btnNeutral}>
              휴대폰 본인확인 진행하기
            </button>
          )}

          {passOpen && !verified && (
            <div className={`${t.card} p-5`}>
              <p className="text-[14px] font-bold">본인확인 창에서 인증을 진행해 주세요</p>
              <p className={`mt-1.5 text-[13px] leading-[1.7] ${t.muted}`}>
                주민등록번호는 본인확인 창에서만 입력됩니다. 인증이 끝나면 확인된 생년월일과
                휴대폰 번호만 이 화면으로 돌아옵니다.
              </p>
              <p className={`mt-4 text-[12px] font-bold ${t.muted}`}>시연용 · 본인확인 응답</p>
              <div className="mt-2 flex gap-2">
                {passDemo.map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => {
                      setVerified({ birth: d.birth, phone: d.phone });
                      setPassOpen(false);
                    }}
                    className="flex-1 rounded-full border border-soft-line bg-white px-3 py-2.5 text-[12.5px] font-semibold transition-colors hover:bg-slate-50"
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {verified && !isAdult && (
            <div className={`${t.card} border-2 p-5`}>
              <p className={`text-[14px] font-bold ${t.required}`}>
                법정대리인은 성년이어야 합니다
              </p>
              <p className={`mt-1.5 text-[13px] leading-[1.7] ${t.muted}`}>
                확인된 나이가 만 {MAJORITY_AGE}세 미만입니다. 친권자 또는 미성년후견인 본인의
                명의로 다시 인증해 주세요.
              </p>
              <button
                type="button"
                onClick={() => {
                  setVerified(null);
                  setPassOpen(true);
                }}
                className={`${t.btnQuiet} mt-3`}
              >
                다시 인증하기
              </button>
            </div>
          )}

          {verified && isAdult && (
            <>
              <p className="text-[13px] font-semibold text-emerald-600">
                ✓ 본인확인이 완료되었습니다.
              </p>

              <div className="mt-3 flex flex-col gap-2">
                <p className={t.fieldLabel}>② 학생과의 관계</p>
                <select
                  aria-label="학생과의 관계"
                  value={relation}
                  onChange={(e) => setRelation(e.target.value)}
                  className={t.field}
                >
                  {relations.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
                <p className={`text-[13px] leading-[1.7] ${t.muted}`}>
                  친권자인 부모나 미성년후견인처럼 법적으로 대리권이 있는 분만 동의할 수 있습니다.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPhase("consent")}
                className={`${t.btnPrimary} mt-2`}
              >
                동의 내용 확인하기
              </button>
            </>
          )}
        </div>

        <div className={`${t.cardSoft} mt-6 p-5`}>
          <p className="text-[14px] font-bold">{consentRouteInfo.guardian.who} 동의가 필요한 이유</p>
          <ul className={`mt-2 flex flex-col gap-1.5 text-[13px] leading-[1.7] ${t.muted}`}>
            {consentRouteInfo.guardian.extra.map((e) => (
              <li key={e}>· {e}</li>
            ))}
          </ul>
        </div>
      </Shell>
    );
  }

  /* ── ③ 자녀별 동의 ── */
  if (phase === "consent") {
    const ok = agreed && kidsRead;
    return (
      <Shell variant={variant}>
        <button
          type="button"
          onClick={() => setPhase("verify")}
          className={`self-start text-[13px] font-semibold ${t.muted} hover:underline`}
        >
          ← 이전으로
        </button>

        <h1 className={`${t.heading} mt-4`}>수집·이용 내용을 확인해 주세요</h1>
        <p className={`${t.lead} mt-3`}>
          {linked ? `${linked.name} 학생` : req.childLabel ? `「${req.childLabel}」` : "자녀"}{" "}
          한 명에 대한 동의입니다. 자녀가 여러 명이면 각각 따로 동의를 받습니다.
        </p>

        <div className={`${t.card} mt-6 overflow-hidden`}>
          <dl className="divide-y divide-slate-100">
            {collectRows.map((r) => (
              <div key={r.k} className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:gap-4">
                <dt className={`w-32 shrink-0 text-[13.5px] font-semibold ${t.muted}`}>{r.k}</dt>
                <dd className="text-[13.5px] leading-[1.7]">{r.v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-5 flex flex-col gap-3">
          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={kidsRead}
              onChange={(e) => setKidsRead(e.target.checked)}
              className="mt-0.5 h-[20px] w-[20px] shrink-0"
            />
            <span className="text-[14px] leading-[1.6]">
              아이가 읽을 수 있는{" "}
              <Link
                href="/legal/privacy-kids"
                className="font-bold underline underline-offset-2"
              >
                눈높이 고지문
              </Link>
              을 확인했습니다.
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-[20px] w-[20px] shrink-0"
            />
            <span className="text-[14px] leading-[1.6]">
              위 내용을 확인하고, 만 {CONSENT_AGE}세 미만 자녀의 개인정보 수집·이용에{" "}
              <b>법정대리인으로서 동의</b>합니다. <span className={t.required}>(필수)</span>
            </span>
          </label>

          {tried && !ok && (
            <p role="alert" className={`text-[13px] font-semibold ${t.required}`}>
              두 항목을 모두 확인해 주세요.
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => {
              setTried(true);
              if (!ok) return;
              // 기관이 임시등록해 둔 학생이면 상태만 바꾸고 끝난다.
              // 학생이 직접 요청한 경우에는 이제서야 자녀 정보를 받는다.
              if (req.studentId) {
                grantRequest(req.id, "휴대전화 본인인증", relation);
                grantGuardianConsent(req.studentId);
                setPhase("done");
              } else {
                // 앞 단계에서 켠 오류 표시를 끄고 넘어간다 — 빈 폼에 빨간 글씨부터
                // 보여 주면 방금 한 동의가 잘못된 것처럼 읽힌다
                setTried(false);
                setPhase("child");
              }
            }}
            className={t.btnPrimary}
          >
            동의합니다
          </button>
          <button
            type="button"
            onClick={() => {
              declineRequest(req.id);
              if (req.studentId) declineGuardianConsent(req.studentId);
              setPhase("declined");
            }}
            className={t.btnNeutral}
          >
            동의하지 않습니다
          </button>
        </div>
      </Shell>
    );
  }

  /* ── ④ 자녀 등록 (동의가 끝난 뒤에야 받는다) ── */
  return (
    <Shell variant={variant}>
      <h1 className={t.heading}>자녀 정보를 등록해 주세요</h1>
      <p className={`${t.lead} mt-3`}>
        동의가 확인되었습니다. <b>이제서야</b> 아이 정보를 받습니다. 반드시 필요한 것은 이름과
        생년월일 둘뿐이고, 학교·학년은 나중에 채우셔도 됩니다.
      </p>

      <div className="mt-6 flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="c-name" className={t.fieldLabel}>
            자녀 이름
          </label>
          <input
            id="c-name"
            value={child.name}
            onChange={(e) => setChild((c) => ({ ...c, name: e.target.value }))}
            placeholder="김하늘"
            className={t.field}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="c-birth" className={t.fieldLabel}>
            자녀 생년월일 8자리
          </label>
          <input
            id="c-birth"
            inputMode="numeric"
            maxLength={8}
            value={child.birth}
            onChange={(e) =>
              setChild((c) => ({ ...c, birth: e.target.value.replace(/\D/g, "").slice(0, 8) }))
            }
            placeholder="20160312"
            className={`${t.field} tabular-nums`}
          />
          {childBirthOk && childAge !== null && childAge >= CONSENT_AGE && (
            <p className={`text-[13px] leading-[1.7] ${t.muted}`}>
              만 {childAge}세로 확인됩니다. 만 {CONSENT_AGE}세 이상이면 학생 본인이 직접 가입할 수
              있습니다. 그대로 등록하셔도 되고, 학생에게 가입 초대를 보내셔도 됩니다.
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="c-school" className={t.fieldLabel}>
              학교 <span className={`font-normal ${t.muted}`}>(선택)</span>
            </label>
            <input
              id="c-school"
              value={child.school}
              onChange={(e) => setChild((c) => ({ ...c, school: e.target.value }))}
              placeholder="목동초등학교"
              className={t.field}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="c-grade" className={t.fieldLabel}>
              학년 <span className={`font-normal ${t.muted}`}>(선택)</span>
            </label>
            <input
              id="c-grade"
              value={child.grade}
              onChange={(e) => setChild((c) => ({ ...c, grade: e.target.value }))}
              placeholder="초등 4학년"
              className={t.field}
            />
          </div>
        </div>

        {tried && (!childNameOk || !childBirthOk) && (
          <p role="alert" className={`text-[13px] font-semibold ${t.required}`}>
            {!childNameOk
              ? "자녀 이름을 두 글자 이상 적어 주세요."
              : "생년월일을 8자리(YYYYMMDD)로 정확히 입력해 주세요."}
          </p>
        )}

        <button
          type="button"
          onClick={() => {
            setTried(true);
            if (!childNameOk || !childBirthOk) return;
            const [created] = addStudents(
              [
                {
                  name: child.name.trim(),
                  birth: childDigits,
                  school: child.school.trim() || undefined,
                  grade: child.grade.trim() || undefined,
                  guardianName: req.guardianName,
                  guardianPhone: req.guardianPhone,
                },
              ],
              "parent",
              req.guardianName,
            );
            grantGuardianConsent(created.id);
            grantRequest(req.id, "휴대전화 본인인증", relation);
            setIssued({ name: created.name, code: created.code });
            setPhase("done");
          }}
          className={t.btnPrimary}
        >
          등록하고 접속코드 받기
        </button>
      </div>
    </Shell>
  );
}

/** 화면 껍데기 — 좁은 한 단 */
function Shell({ variant, children }: { variant: Variant; children: React.ReactNode }) {
  const t = themeOf(variant);
  return (
    <div className={`min-h-full ${t.page}`}>
      <div className="container-x py-11 pb-16">
        <div className={`${t.column} flex flex-col`}>{children}</div>
      </div>
    </div>
  );
}
