"use client";

import Link from "next/link";
import { useState } from "react";
import { ageFromBirth, consentRouteInfo } from "@/lib/account";
import { consentDone, useChildDraft, clearChildDraft, type ChildDraft } from "@/lib/childStore";
import { useHydrated } from "@/lib/examStore";
import { addStudents, formatCode } from "@/lib/roster";
import { useSession } from "@/lib/authStore";
import { ArrowRight } from "@/components/Icons";
import { labelText as fieldLabel, field as input } from "@/components/account/ui";
import { AccHead, btnGhost, btnPrimary, card, cardPad, childStepLabels, LegalNote, StepBar } from "./ui";

/**
 * ACC-03-2 기본정보 입력 (B01~B10).
 *
 * 사이트맵: "학년·지역·학교유형 등 + B10 가정 내 주사용 언어
 *            (다문화 가정 LANG 지필 해석 보정 변수)".
 *
 * 이 화면은 동의(B00)를 마친 뒤에만 열린다. 순서를 바꿀 수 있으면
 * 동의 없이 아이 정보가 먼저 쌓이게 되기 때문이다.
 */

const grades = ["초등 3학년", "초등 4학년", "초등 5학년", "초등 6학년", "중등 1학년", "중등 2학년", "중등 3학년"];
const regions = ["서울", "경기·인천", "강원", "충청·대전·세종", "전라·광주", "경상·대구·부산·울산", "제주"];
const schoolTypes = ["공립 초등학교", "사립 초등학교", "공립 중학교", "사립 중학교", "대안학교", "홈스쿨링", "기타"];
const languages = ["한국어", "한국어 + 다른 언어", "주로 다른 언어"];

export default function ChildNew() {
  const hydrated = useHydrated();
  const draft = useChildDraft();
  const session = useSession();

  const [form, setForm] = useState({
    name: "",
    grade: "",
    region: "",
    schoolType: "",
    language: "한국어",
    guardianPhone: "",
  });
  const [tried, setTried] = useState(false);
  // 등록을 마치면 draft를 비우기 때문에, 완료 화면에 필요한 값은 여기에 옮겨 담는다
  const [issued, setIssued] = useState<{
    name: string;
    code: string;
    route: ChildDraft["route"];
    age: number | null;
  } | null>(null);

  if (!hydrated) {
    return <p className="py-16 text-center text-[13px] text-soft-muted">확인 중입니다…</p>;
  }

  // 등록을 마친 뒤에는 완료 화면을 먼저 보여 준다.
  // (등록과 동시에 draft를 비우므로, 아래 동의 게이트보다 앞에 있어야 한다)
  if (issued) {
    return <IssuedView issued={issued} />;
  }

  // 동의 게이트 — B00을 건너뛰고 들어온 경우
  if (!consentDone(draft)) {
    return (
      <>
        <AccHead id="ACC-03-2" title="학생 등록" />
        <div className="mb-5">
          <StepBar current={0} labels={childStepLabels} />
        </div>
        <div className={`${card} ${cardPad}`}>
          <p className="text-[15px] font-bold text-soft-ink">
            먼저 법정대리인 동의를 받아야 합니다.
          </p>
          <p className="mt-2 text-[14px] leading-relaxed text-soft-muted">
            아이 정보를 받기 전에 누가 동의해야 하는지부터 정해야 합니다. 생년월일을 입력하시면
            만 14세 기준으로 안내해 드립니다.
          </p>
          <Link href="/my/children/consent" className={`${btnPrimary} mt-5 w-full`}>
            동의 단계로 가기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </>
    );
  }

  const age = ageFromBirth(draft.birth);
  const info = draft.route ? consentRouteInfo[draft.route] : null;
  const ready = form.name.trim().length >= 2 && form.grade && form.region && form.schoolType;

  const submit = () => {
    setTried(true);
    if (!ready) return;
    const [created] = addStudents(
      [
        {
          name: form.name.trim(),
          birth: draft.birth,
          grade: form.grade,
          guardianPhone: form.guardianPhone || undefined,
        },
      ],
      "parent",
      session?.name ?? "보호자",
    );
    // 지역·학교유형·주사용 언어는 프로필 레코드에 함께 저장되는 값이다.
    // (지금 단계에서는 명부에 필요한 항목만 보관한다)
    setIssued({ name: created.name, code: created.code, route: draft.route, age });
    clearChildDraft();
  };

  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <>
      <AccHead
        id="ACC-03-2"
        title="학생 등록"
        lead="진단 결과를 해석할 때 필요한 항목만 받습니다."
        back={{ href: "/my/children/consent", label: "동의 단계로" }}
      />

      <div className="mb-5">
        <StepBar current={1} labels={childStepLabels} />
      </div>

      {info && age !== null && (
        <p className="mb-4 rounded-lg border border-soft-line bg-slate-50 px-5 py-4 text-[14px] text-soft-ink">
          만 <b>{age}</b>세 · {info.label} — {info.who} 동의로 진행합니다.
        </p>
      )}

      <div className={`${card} ${cardPad} grid gap-5`}>
        <div>
          <label htmlFor="c-name" className={fieldLabel}>
            이름 <span className="text-rose-600">*</span>
          </label>
          <input
            id="c-name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="아이 이름"
            className={`mt-2 ${input}`}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="c-grade" className={fieldLabel}>
              학년 <span className="text-rose-600">*</span>
            </label>
            <select
              id="c-grade"
              value={form.grade}
              onChange={(e) => set("grade", e.target.value)}
              className={`mt-2 ${input}`}
            >
              <option value="">선택해 주세요</option>
              {grades.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="c-region" className={fieldLabel}>
              거주 지역 <span className="text-rose-600">*</span>
            </label>
            <select
              id="c-region"
              value={form.region}
              onChange={(e) => set("region", e.target.value)}
              className={`mt-2 ${input}`}
            >
              <option value="">선택해 주세요</option>
              {regions.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <p className="mt-1.5 text-[12px] text-soft-muted">시·도까지만 받습니다.</p>
          </div>
        </div>

        <div>
          <label htmlFor="c-school" className={fieldLabel}>
            학교 유형 <span className="text-rose-600">*</span>
          </label>
          <select
            id="c-school"
            value={form.schoolType}
            onChange={(e) => set("schoolType", e.target.value)}
            className={`mt-2 ${input}`}
          >
            <option value="">선택해 주세요</option>
            {schoolTypes.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <p className="mt-1.5 text-[12px] text-soft-muted">학교 이름은 받지 않습니다.</p>
        </div>

        {/* B10 — 다문화 가정 지필 해석 보정 변수 */}
        <div>
          <label htmlFor="c-lang" className={fieldLabel}>
            가정에서 주로 쓰는 언어
          </label>
          <select
            id="c-lang"
            value={form.language}
            onChange={(e) => set("language", e.target.value)}
            className={`mt-2 ${input}`}
          >
            {languages.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
          <p className="mt-1.5 text-[13px] leading-relaxed text-soft-muted">
            국어 지필 결과를 해석할 때 보정에 씁니다. 언어 환경 때문에 점수가 낮게 나온 것을
            &lsquo;언어 재능이 낮다&rsquo;고 읽지 않기 위한 항목입니다.
          </p>
        </div>

        <div>
          <label htmlFor="c-phone" className={fieldLabel}>
            보호자 연락처 <span className="font-normal text-soft-muted">(선택)</span>
          </label>
          <input
            id="c-phone"
            type="tel"
            value={form.guardianPhone}
            onChange={(e) => set("guardianPhone", e.target.value)}
            placeholder="010-1234-5678"
            className={`mt-2 ${input}`}
          />
        </div>
      </div>

      <div className="mt-4">
        <LegalNote title="여기서 받지 않는 것">
          <p>상세 주소, 학교 이름, 주민등록번호는 받지 않습니다.</p>
          <p>음성·영상·행동로그는 2단계 심화진단을 신청하실 때 따로 여쭤봅니다.</p>
        </LegalNote>
      </div>

      {tried && !ready && (
        <p role="alert" className="mt-4 text-[13px] font-bold text-rose-600">
          별표 표시된 항목을 모두 채워 주세요.
        </p>
      )}

      <button type="button" onClick={submit} className={`${btnPrimary} mt-5 w-full`}>
        등록하고 접속코드 받기
        <ArrowRight className="h-4 w-4" />
      </button>
    </>
  );
}

/** 등록 완료 — 발급된 접속코드와, 만 14세 이상일 때의 본인 동의 안내 */
function IssuedView({
  issued,
}: {
  issued: { name: string; code: string; route: ChildDraft["route"]; age: number | null };
}) {
  return (
    <>
      <AccHead id="ACC-03-2" title="학생 등록" lead="등록이 끝났습니다." />

      <div className="mb-5">
        <StepBar current={2} labels={childStepLabels} />
      </div>

      <div className={`${card} ${cardPad}`}>
        <p className="text-[15px] leading-relaxed text-soft-ink">
          <b>{issued.name}</b> 프로필이 만들어졌고 접속코드가 발급되었습니다.
        </p>
        <p className="mt-5 rounded-lg bg-slate-50 px-5 py-5 text-center">
          <span className="block text-[12px] font-bold text-soft-muted">접속코드</span>
          <span className="mt-1.5 block text-[30px] font-black tracking-[0.12em] tabular-nums text-soft-ink">
            {formatCode(issued.code)}
          </span>
        </p>
        <p className="mt-3 text-[13px] leading-relaxed text-soft-muted">
          코드만으로는 들어갈 수 없습니다. 아이의 <b>생년월일</b>과 함께 맞아야 통과합니다.
        </p>

        {issued.route === "self" && (
          <p className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 px-5 py-4 text-[14px] leading-relaxed text-emerald-900">
            만 {issued.age}세이므로 아이가 처음 접속하면 <b>본인 동의 화면</b>이 먼저 뜹니다. 아이가
            동의해야 응시가 시작됩니다.
          </p>
        )}

        <CopyCode code={issued.code} className="mt-4 w-full" />

        {/* 코드를 받은 다음 할 일은 「목록 보기」가 아니라 「진행 상황 보기」다.
            홈이 아이별 다음 단계를 한 줄로 알려 주는 자리라 그쪽으로 보낸다. */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link href="/my" className={`${btnPrimary} w-full`}>
            홈에서 진행 상황 보기
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/my/children/consent" className={`${btnGhost} w-full`}>
            학생 더 등록하기
          </Link>
        </div>
      </div>
    </>
  );
}

/**
 * 접속코드 복사 버튼.
 *
 * 코드를 받은 보호자가 바로 할 일은 아이에게 전달하는 것이다. 손으로 옮겨 적게
 * 두면 혼동하기 쉬운 글자(0·O 같은)를 빼 둔 뜻이 없어진다.
 */
function CopyCode({ code, className = "" }: { code: string; className?: string }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");

  const copy = async () => {
    const text = formatCode(code);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 보안 컨텍스트가 아니거나 권한이 없으면 clipboard가 거절한다. 예전 방식으로 한 번 더 시도한다.
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      if (!ok) {
        // 되지 않았으면 됐다고 하지 않는다. 손으로 옮겨 적어야 한다는 뜻이다.
        setState("failed");
        window.setTimeout(() => setState("idle"), 3000);
        return;
      }
    }
    setState("done");
    window.setTimeout(() => setState("idle"), 2000);
  };

  return (
    <button type="button" onClick={() => void copy()} className={`${btnGhost} ${className}`}>
      {state === "done" ? "복사했습니다" : state === "failed" ? "직접 입력해 주세요" : "코드 복사"}
    </button>
  );
}
