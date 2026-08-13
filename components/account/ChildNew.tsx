"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ageFromBirth,
  CONSENT_AGE,
  consentRouteFor,
  consentRouteInfo,
  consentStages,
  type ConsentRoute,
} from "@/lib/account";
import { clearChildDraft } from "@/lib/childStore";
import { useHydrated } from "@/lib/examStore";
import { addStudents, formatCode } from "@/lib/roster";
import { useSession } from "@/lib/authStore";
import { ArrowRight, CheckIcon } from "@/components/Icons";
import { Button } from "@/components/ui/button";
import { labelText as fieldLabel, field as input } from "@/components/account/ui";
import { AccHead, btnGhost, btnPrimary, card, cardPad, LegalNote } from "./ui";

/**
 * ACC-03 학생 등록 — 한 화면, 한 폼.
 *
 * 예전에는 동의(B00) → 아이 정보(B01~B10) → 코드 발급을 세 화면으로 나눠 두었다.
 * 아이 한 명을 넣는 데 화면을 세 번 넘겨야 했고, 중간에 초안을 브라우저에 들고
 * 다녀야 했다. 지금은 한 폼에서 끝낸다.
 *
 * 순서를 합쳐도 「동의 없이 아이 정보를 갖지 않는다」는 원칙은 그대로다. 폼에 친
 * 글자는 어디에도 저장되지 않고, 저장되는 시점은 필수 동의에 체크하고 등록을
 * 누른 그 한 번뿐이다(개인정보보호법 제22조의2).
 *
 * 반드시 받는 것은 이름과 생년월일 둘뿐이다. 생년월일은 만 14세 기준으로 동의
 * 주체를 가르는 값이라 뺄 수 없다. 학교·학년을 비롯한 나머지는 결과를 더 잘
 * 읽기 위한 값이므로, 지금 모르면 비워 두고 나중에 채우면 된다.
 */

const grades = [
  "초등 3학년",
  "초등 4학년",
  "초등 5학년",
  "초등 6학년",
  "중등 1학년",
  "중등 2학년",
  "중등 3학년",
];
const regions = [
  "서울",
  "경기·인천",
  "강원",
  "충청·대전·세종",
  "전라·광주",
  "경상·대구·부산·울산",
  "제주",
];
const schoolTypes = [
  "공립 초등학교",
  "사립 초등학교",
  "공립 중학교",
  "사립 중학교",
  "대안학교",
  "홈스쿨링",
  "기타",
];
const languages = ["한국어", "한국어 + 다른 언어", "주로 다른 언어"];

/** 선택 항목의 라벨 뒤에 붙는 표시 */
function Opt() {
  return <span className="font-normal text-soft-muted">(선택)</span>;
}

export default function ChildNew() {
  const hydrated = useHydrated();
  const session = useSession();

  const [form, setForm] = useState({
    name: "",
    birth: "",
    school: "",
    grade: "",
    region: "",
    schoolType: "",
    language: "한국어",
    guardianPhone: "",
  });
  const [agreed, setAgreed] = useState<string[]>([]);
  const [kidsNoticeRead, setKidsNoticeRead] = useState(false);
  const [tried, setTried] = useState(false);
  const [issued, setIssued] = useState<{
    name: string;
    code: string;
    route: ConsentRoute;
    age: number | null;
  } | null>(null);

  if (!hydrated) {
    return <p className="py-16 text-center text-[13px] text-soft-muted">확인 중입니다…</p>;
  }

  if (issued) return <IssuedView issued={issued} />;

  const digits = form.birth.replace(/\D/g, "");
  const age = ageFromBirth(digits);
  const route = consentRouteFor(age);
  const info = route ? consentRouteInfo[route] : null;

  const upfront = consentStages.filter((s) => s.upfront);
  const allRequired = upfront.filter((s) => s.required).every((s) => agreed.includes(s.id));
  // 만 14세 미만은 아이 눈높이 고지문을 함께 보여 줬는지도 확인한다
  const kidsOk = route === "guardian" ? kidsNoticeRead : true;

  const nameOk = form.name.trim().length >= 2;
  const ready = nameOk && route !== null && allRequired && kidsOk;

  const problem = !nameOk
    ? "아이 이름을 두 글자 이상 적어 주세요."
    : route === null
      ? "생년월일을 8자리로 정확히 입력해 주세요."
      : !kidsOk
        ? "아이에게 보여 줄 안내문을 확인해 주세요."
        : "필수 동의 항목에 체크해 주세요.";

  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const toggle = (id: string) =>
    setAgreed((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = () => {
    setTried(true);
    if (!ready || !route) return;
    const [created] = addStudents(
      [
        {
          name: form.name.trim(),
          birth: digits,
          school: form.school.trim() || undefined,
          grade: form.grade || undefined,
          guardianPhone: form.guardianPhone.trim() || undefined,
        },
      ],
      "parent",
      session?.name ?? "보호자",
    );
    // 지역·학교유형·주사용 언어는 프로필 레코드에 함께 저장되는 값이다.
    // (지금 단계에서는 명부에 필요한 항목만 보관한다)
    setIssued({ name: created.name, code: created.code, route, age });
    // 세 화면으로 나뉘어 있던 시절의 초안이 남아 있으면 여기서 치운다
    clearChildDraft();
  };

  return (
    <>
      <AccHead
        id="ACC-03"
        title="학생 등록"
        lead="이름과 생년월일만 있으면 등록됩니다. 나머지는 결과를 더 잘 읽기 위한 값이라 나중에 채우셔도 됩니다."
        back={{ href: "/my/children", label: "학생 목록으로" }}
      />

      {/* ① 아이 정보 */}
      <div className={`${card} ${cardPad} grid gap-5`}>
        <div className="grid gap-5 sm:grid-cols-2">
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

          <div>
            <label htmlFor="c-birth" className={fieldLabel}>
              생년월일 <span className="text-rose-600">*</span>{" "}
              <span className="font-normal text-soft-muted">(8자리)</span>
            </label>
            <input
              id="c-birth"
              inputMode="numeric"
              value={form.birth}
              onChange={(e) => set("birth", e.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="20150312"
              className={`mt-2 tabular-nums ${input}`}
            />
            {digits.length === 8 && age === null ? (
              <p role="alert" className="mt-1.5 text-[12px] font-bold text-rose-600">
                날짜를 다시 확인해 주세요.
              </p>
            ) : (
              <p className="mt-1.5 text-[12px] text-soft-muted">
                {age !== null
                  ? `만 ${age}세 — 아래에 동의 항목이 나왔습니다.`
                  : "만 14세 기준으로 누가 동의해야 하는지가 갈립니다."}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="c-school-name" className={fieldLabel}>
              학교 <Opt />
            </label>
            <input
              id="c-school-name"
              value={form.school}
              onChange={(e) => set("school", e.target.value)}
              placeholder="예) 목동초등학교"
              className={`mt-2 ${input}`}
            />
          </div>

          <div>
            <label htmlFor="c-grade" className={fieldLabel}>
              학년 <Opt />
            </label>
            <select
              id="c-grade"
              value={form.grade}
              onChange={(e) => set("grade", e.target.value)}
              className={`mt-2 ${input}`}
            >
              <option value="">고르지 않음</option>
              {grades.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="c-region" className={fieldLabel}>
              거주 지역 <Opt />
            </label>
            <select
              id="c-region"
              value={form.region}
              onChange={(e) => set("region", e.target.value)}
              className={`mt-2 ${input}`}
            >
              <option value="">고르지 않음</option>
              {regions.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <p className="mt-1.5 text-[12px] text-soft-muted">시·도까지만 받습니다.</p>
          </div>

          <div>
            <label htmlFor="c-school" className={fieldLabel}>
              학교 유형 <Opt />
            </label>
            <select
              id="c-school"
              value={form.schoolType}
              onChange={(e) => set("schoolType", e.target.value)}
              className={`mt-2 ${input}`}
            >
              <option value="">고르지 않음</option>
              {schoolTypes.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <p className="mt-1.5 text-[12px] text-soft-muted">
              결과 해석의 기준 집단을 고를 때 씁니다.
            </p>
          </div>
        </div>

        {/* B10 — 다문화 가정 지필 해석 보정 변수 */}
        <div>
          <label htmlFor="c-lang" className={fieldLabel}>
            가정에서 주로 쓰는 언어 <Opt />
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
            보호자 연락처 <Opt />
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

      {/* ② 동의 — 생년월일이 들어와야 누가 동의하는지 정해진다 */}
      {info && route ? (
        <div className={`${card} mt-4 ${cardPad}`}>
          <p className="text-[15px] font-black text-soft-ink">
            만 {age}세 — {info.label} · {info.who} 동의
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-soft-muted">{info.summary}</p>

          {/* 만 14세 미만 — 아동 눈높이 고지문 병행 제시 */}
          {route === "guardian" && (
            <div className="mt-5">
              <p className="text-[14px] font-bold text-soft-ink">아이에게 보여 줄 안내문</p>
              <div className="mt-2.5 rounded-lg bg-slate-50 p-5 text-[14px] leading-[1.9] text-soft-ink">
                <p>· 네가 푼 문제와 답을 선생님들이 보고, 네가 뭘 잘하는지 찾아볼 거야.</p>
                <p>· 점수로 등수를 매기지 않아. 잘하는 걸 찾는 게 목적이야.</p>
                <p>· 네 이름과 답은 선생님과 부모님만 볼 수 있어.</p>
                <p>· 그만하고 싶으면 언제든 부모님께 말하면 돼. 지울 수 있어.</p>
              </div>
              <label className="mt-3 flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={kidsNoticeRead}
                  onChange={(e) => setKidsNoticeRead(e.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-[#365eef]"
                />
                <span className="text-[14px] leading-relaxed text-soft-ink">
                  위 내용을 아이에게 읽어 주었거나 보여 주었습니다.
                </span>
              </label>
            </div>
          )}

          {/* 만 14세 이상 — 본인 동의 예약 안내 */}
          {route === "self" && (
            <p className="mt-4 rounded-lg bg-slate-50 px-5 py-4 text-[14px] leading-relaxed text-soft-ink">
              만 {CONSENT_AGE}세 이상이라 법정대리인 동의를 받지 않습니다. 대신 아이가 접속코드로
              처음 들어올 때 <b>본인 동의 화면</b>이 먼저 뜨고, 아이가 동의해야 응시가 시작됩니다.
              보호자는 결제와 리포트 열람 주체로 그대로 남습니다.
            </p>
          )}

          <ul className="mt-5 border-t border-soft-line">
            {upfront.map((s) => {
              const on = agreed.includes(s.id);
              return (
                <li key={s.id} className="border-b border-soft-line">
                  <label className="flex cursor-pointer gap-3.5 py-4">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(s.id)}
                      className="mt-1 h-5 w-5 shrink-0 accent-[#365eef]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[15px] font-bold text-soft-ink">{s.label}</span>
                        <span
                          className={`text-[12px] font-bold ${
                            s.required ? "text-rose-600" : "text-soft-muted"
                          }`}
                        >
                          {s.required ? "필수" : "선택"}
                        </span>
                      </span>
                      <span className="mt-1.5 block text-[13px] leading-relaxed text-soft-muted">
                        목적 {s.purpose} · 항목 {s.items}
                      </span>
                      <span className="mt-1 block text-[13px] text-soft-muted">보관 {s.keep}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          <p className="mt-4 text-[13px] leading-relaxed text-soft-muted">
            음성·영상·행동로그가 들어가는 2단계 심화진단과 면담 녹화는 지금 받지 않습니다. 해당
            시점에 따로 여쭤봅니다.{" "}
            <Link
              href="/my/children/consent-stages"
              className="font-bold text-soft-primary-dark underline"
            >
              단계별 동의 관리
            </Link>
          </p>
        </div>
      ) : (
        <p className="mt-4 rounded-lg border border-soft-line bg-slate-50 px-5 py-4 text-[13px] leading-relaxed text-soft-muted">
          생년월일을 입력하시면 <b className="text-soft-ink">누가 동의해야 하는지</b>와 동의 항목이
          여기에 나타납니다. 만 14세를 기준으로 보호자 동의와 학생 본인 동의가 갈립니다.
        </p>
      )}

      {info && (
        <div className="mt-4">
          <LegalNote title={`${info.label} 처리 기준`} basis={info.basis}>
            <ul className="list-disc space-y-1 pl-5">
              {info.extra.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </LegalNote>
        </div>
      )}

      <div className="mt-4">
        <LegalNote title="여기서 받지 않는 것">
          <p>상세 주소와 주민등록번호는 받지 않습니다.</p>
          <p>음성·영상·행동로그는 2단계 심화진단을 신청하실 때 따로 여쭤봅니다.</p>
        </LegalNote>
      </div>

      {tried && !ready && (
        <p role="alert" className="mt-4 text-[13px] font-bold text-rose-600">
          {problem}
        </p>
      )}

      <button type="button" onClick={submit} className={`${btnPrimary} mt-5 w-full`}>
        등록하고 접속코드 받기
        <ArrowRight className="h-4 w-4" />
      </button>

      <Link href="/my/children" className={`${btnGhost} mt-2 w-full`}>
        나중에 하기
      </Link>

      <p className="mt-5 flex items-start gap-2 text-[13px] leading-relaxed text-soft-muted">
        <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        동의는 언제든 철회할 수 있습니다. 철회하시면 파기 절차가 자동으로 시작되고 처리 결과를 알려
        드립니다.
      </p>
    </>
  );
}

/**
 * 등록 완료 — 발급된 접속코드 하나만 크게 보여 준다.
 *
 * 등록을 마친 보호자가 지금 할 일은 코드를 아이에게 넘기는 것 하나뿐이다.
 * 그 외의 것을 같이 세우면 정작 옮겨 적어야 할 여덟 글자가 묻힌다.
 */
function IssuedView({
  issued,
}: {
  issued: { name: string; code: string; route: ConsentRoute; age: number | null };
}) {
  return (
    <>
      <AccHead id="ACC-03" title="학생 등록" lead="등록이 끝났습니다." />

      <div className={`${card} ${cardPad}`}>
        <p className="text-[15px] leading-relaxed text-soft-ink">
          <b>{issued.name}</b> 프로필이 만들어졌습니다.
        </p>

        <p className="mt-5 rounded-lg bg-slate-50 px-5 py-6 text-center">
          <span className="block text-[12px] font-bold text-soft-muted">접속코드</span>
          <span className="mt-1.5 block text-[34px] font-black tracking-[0.12em] tabular-nums text-soft-ink">
            {formatCode(issued.code)}
          </span>
        </p>

        <CopyCode code={issued.code} className="mt-4 w-full" />

        <p className="mt-3 text-[13px] leading-relaxed text-soft-muted">
          코드만으로는 들어갈 수 없습니다. 아이의 <b>생년월일</b>과 함께 맞아야 통과합니다.
        </p>

        {issued.route === "self" && (
          <p className="mt-4 rounded-lg bg-slate-50 px-5 py-4 text-[14px] leading-relaxed text-soft-ink">
            만 {issued.age}세이므로 아이가 처음 접속하면 <b>본인 동의 화면</b>이 먼저 뜹니다. 아이가
            동의해야 응시가 시작됩니다.
          </p>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link href="/my/children" className={`${btnPrimary} w-full`}>
            학생 목록으로
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/my/children/new" className={`${btnGhost} w-full`}>
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
    <Button variant="outline" onClick={() => void copy()} className={`rounded-full ${className}`}>
      {state === "done" ? "복사했습니다" : state === "failed" ? "직접 입력해 주세요" : "코드 복사"}
    </Button>
  );
}
