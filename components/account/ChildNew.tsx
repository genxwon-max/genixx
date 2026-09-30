"use client";

import Link from "next/link";
import { useState } from "react";
import { ageFromBirth, consentRouteFor, type ConsentRoute } from "@/lib/account";
import {
  OBSERVATION_MAX,
  genders,
  interestAreas,
  learningKinds,
  schoolLevels,
} from "@/lib/childOptions";
import { clearChildDraft } from "@/lib/childStore";
import { useHydrated } from "@/lib/examStore";
import AddressField, { emptyAddress, sidoOf, type AddressValue } from "./AddressField";
import Chips, { flip } from "./Chips";
import { addStudents, formatCode, type ChildProfile } from "@/lib/roster";
import { useSession } from "@/lib/authStore";
import { ArrowRight } from "@/components/Icons";
import { Button } from "@/components/ui/button";
import { labelText as fieldLabel, field as input } from "@/components/account/ui";
import { AccHead, btnGhost, btnPrimary, card, cardPad } from "./ui";

/**
 * ACC-03 학생 등록 — 한 화면, 한 폼.
 *
 * 예전에는 동의(B00) → 아이 정보(B01~B10) → 코드 발급을 세 화면으로 나눠 두었다.
 * 아이 한 명을 넣는 데 화면을 세 번 넘겨야 했고, 중간에 초안을 브라우저에 들고
 * 다녀야 했다. 지금은 한 폼에서 끝낸다.
 *
 * 동의 칸은 두지 않는다. 법정대리인 동의는 학부모 회원가입 때 휴대폰 본인인증과 함께
 * 이미 받았다(lib/account.ts purposeConsents). 아이를 올릴 때마다 만 14세 미만 안내문·
 * 동의 항목을 다시 펴 두었더니, 두 번째부터는 읽지 않고 체크하는 칸이 되었다.
 * 학부모가 올린 아이는 그래서 처음부터 동의 완료(consent "granted")로 선다(lib/roster.ts).
 *
 * 필수는 이름·생년월일·학교급·학년·아이 휴대전화 다섯이다. 생년월일은 만 14세
 * 기준으로 동의 주체를 가르는 값이고, 학교급·학년은 어느 학년대 설문을 낼지 정하는
 * 값이다. 휴대전화는 「없음」을 고를 수 있으나 고르기는 해야 한다 — 빈 칸과 없는 것은
 * 다르다.
 * 나머지는 결과를 더 잘 읽기 위한 값이므로, 지금 모르면 비워 두고 나중에 채우면 된다.
 * 항목 구분은 개인정보처리방침의 수집 항목 표와 맞춘다.
 *
 * 고르개 목록(학교급 · 관심 분야 …)은 여럿 등록(BulkRegister)과 함께 쓰도록
 * lib/childOptions.ts에 둔다.
 */

/** 입력 칸과 같은 모양이되 높이만 여러 줄로 */
const textarea = `${input.replace("h-[3.25rem]", "")} min-h-[7.5rem] py-3 leading-relaxed`;

/**
 * 비었거나 틀린 필수 칸. 테두리 색을 덧붙이지 않고 바꿔 끼운다 — 같은 속성의 클래스가
 * 둘 다 있으면 어느 쪽이 이기는지는 CSS가 생성된 순서에 달려 있다.
 */
const inputBad = (on: boolean) =>
  on ? input.replace("border-soft-line", "border-[#e5484d]") : input;

export default function ChildNew() {
  const hydrated = useHydrated();
  const session = useSession();

  const [form, setForm] = useState({
    name: "",
    birth: "",
    /** 아이가 자기 휴대전화를 가지고 있는가 — 기본은 있음 */
    hasPhone: "yes",
    phone: "",
    level: "",
    /** 학년 숫자만 — 학교급과 붙여서 「초등 4학년」으로 저장한다 */
    grade: "",
    gender: "",
    observation: "",
    school: "",
    learningNote: "",
  });
  /* 주소는 칸이 넷(우편번호 · 주소 · 상세 · 시·도)이라 한 덩이로 든다 */
  const [address, setAddress] = useState<AddressValue>(emptyAddress);
  const [interests, setInterests] = useState<string[]>([]);
  const [learning, setLearning] = useState<string[]>([]);
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
  const level = schoolLevels.find((l) => l.id === form.level);

  const nameOk = form.name.trim().length > 0;
  const gradeOk = !!level && form.grade !== "";
  /* 「있음」을 골랐으면 번호가 있어야 한다. 10~11자리 휴대전화만 받는다. */
  const phoneDigits = form.phone.replace(/\D/g, "");
  const phoneOk =
    form.hasPhone === "no" || (phoneDigits.length >= 10 && phoneDigits.length <= 11);
  const ready = nameOk && route !== null && !!level && gradeOk && phoneOk;

  const problem = !nameOk
    ? "이름을 적어 주세요."
    : route === null
      ? "생년월일을 8자리로 정확히 입력해 주세요."
      : !level
        ? "학교급을 골라 주세요."
        : !gradeOk
          ? "학년을 골라 주세요."
          : "아이 휴대전화 번호를 정확히 입력해 주세요. 없으면 「없음」을 골라 주세요.";

  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const submit = () => {
    setTried(true);
    if (!ready || !route || !level) return;
    const text = (v: string) => v.trim() || undefined;
    const list = (v: string[]) => (v.length ? v : undefined);
    const profile: ChildProfile = {
      gender: form.gender || undefined,
      region: sidoOf(address) || undefined,
      district: address.sigungu || undefined,
      zonecode: address.zonecode || undefined,
      address: address.address || undefined,
      addressDetail: text(address.detail),
      interests: list(interests),
      observation: text(form.observation),
      learning: list(learning),
      learningNote: text(form.learningNote),
    };
    const [created] = addStudents(
      [
        {
          name: form.name.trim(),
          birth: digits,
          phone: form.hasPhone === "yes" ? phoneDigits : undefined,
          school: text(form.school),
          grade: `${level.id} ${form.grade}학년`,
          profile,
        },
      ],
      "parent",
      session?.name ?? "보호자",
    );
    setIssued({ name: created.name, code: created.code, route, age });
    // 세 화면으로 나뉘어 있던 시절의 초안이 남아 있으면 여기서 치운다
    clearChildDraft();
  };

  return (
    <>
      <AccHead
        id="ACC-03"
        title="학생 등록"
        lead="필수 항목 다섯 가지만 있으면 등록됩니다. 선택 항목은 결과를 더 잘 읽기 위한 값이라 나중에 채우셔도 됩니다."
        back={{ href: "/my/children", label: "학생 목록으로" }}
      />

      {/* ① 필수 정보 */}
      <section className={`${card} ${cardPad}`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[17px] font-bold text-soft-ink">필수 정보</h2>
          <p className="text-[13px] text-soft-muted">다섯 가지 모두 입력해 주세요.</p>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="c-name" className={fieldLabel}>
              이름 <span className="text-rose-600">*</span>
            </label>
            <input
              id="c-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="예) 김하늘"
              aria-invalid={tried && !nameOk}
              className={`mt-2 ${inputBad(tried && !nameOk)}`}
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
              aria-invalid={tried && route === null}
              className={`mt-2 tabular-nums ${inputBad(tried && route === null)}`}
            />
            {digits.length === 8 && age === null && (
              <p role="alert" className="mt-1.5 text-[12px] font-bold text-rose-600">
                날짜를 다시 확인해 주세요.
              </p>
            )}
          </div>

          <div>
            <p id="c-level" className={fieldLabel}>
              학교급 <span className="text-rose-600">*</span>
            </p>
            <div role="group" aria-labelledby="c-level" className="mt-2 flex flex-wrap gap-2">
              {schoolLevels.map((l) => {
                const on = form.level === l.id;
                return (
                  <button
                    key={l.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setForm((p) => ({ ...p, level: l.id, grade: "" }))}
                    className={`h-[3.25rem] min-w-[5.5rem] flex-1 rounded-[12px] border px-2 text-[15px] font-semibold transition-colors ${
                      on
                        ? "border-soft-primary bg-soft-primary-soft text-soft-primary"
                        : tried && !level
                          ? "border-[#e5484d] bg-white text-soft-muted"
                          : "border-soft-line bg-white text-soft-muted hover:bg-slate-50"
                    }`}
                  >
                    {l.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="c-grade" className={fieldLabel}>
              학년 <span className="text-rose-600">*</span>
            </label>
            <select
              id="c-grade"
              value={form.grade}
              disabled={!level}
              onChange={(e) => set("grade", e.target.value)}
              aria-invalid={tried && !gradeOk}
              className={`mt-2 ${inputBad(tried && !!level && !gradeOk)} disabled:cursor-not-allowed disabled:bg-slate-50`}
            >
              <option value="">{level ? "학년을 고르세요" : "학교급을 먼저 고르세요"}</option>
              {level?.grades.map((g) => (
                <option key={g} value={g}>
                  {g}학년
                </option>
              ))}
            </select>
          </div>

          {/*
           * 아이 휴대전화.
           *
           * 초등 저학년은 자기 전화가 없는 일이 흔해서 「없음」을 고를 수 있게 둔다.
           * 비워 두는 것과 없다고 고르는 것은 다르다 — 빈 칸은 「아직 안 적었다」로
           * 읽혀 등록이 막히고, 없다고 고르면 그대로 넘어간다. 대부분은 가지고
           * 있으므로 기본은 「있음」이다.
           */}
          <div className="sm:col-span-2">
            <p id="c-has-phone" className={fieldLabel}>
              아이 휴대전화 <span className="text-rose-600">*</span>
            </p>
            <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
              <div role="group" aria-labelledby="c-has-phone" className="flex gap-2">
                {[
                  { id: "yes", label: "있음" },
                  { id: "no", label: "없음" },
                ].map((o) => {
                  const on = form.hasPhone === o.id;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setForm((p) => ({ ...p, hasPhone: o.id, phone: "" }))}
                      className={`h-[3.25rem] flex-1 rounded-[12px] border text-[15px] font-semibold transition-colors ${
                        on
                          ? "border-soft-primary bg-soft-primary-soft text-soft-primary"
                          : "border-soft-line bg-white text-soft-muted hover:bg-slate-50"
                      }`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>

              {form.hasPhone === "yes" && (
                <input
                  id="c-phone"
                  type="tel"
                  inputMode="numeric"
                  aria-label="아이 휴대전화 번호"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value.replace(/[^\d-]/g, "").slice(0, 13))}
                  placeholder="010-1234-5678"
                  aria-invalid={tried && !phoneOk}
                  className={`tabular-nums ${inputBad(tried && !phoneOk)}`}
                />
              )}
            </div>
            <p className="mt-1.5 text-[12px] text-soft-muted">
              {form.hasPhone === "yes"
                ? "접속코드와 응시 안내를 아이에게 바로 보낼 때 씁니다."
                : "없어도 등록과 응시에는 지장이 없습니다. 안내는 보호자 연락처로 갑니다."}
            </p>
          </div>
        </div>
      </section>

      {/* ② 선택 정보 */}
      <section className={`${card} mt-4 ${cardPad}`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[17px] font-bold text-soft-ink">선택 정보</h2>
        </div>

        <div className="mt-5 grid gap-6">
          <div>
            <p id="c-gender" className={fieldLabel}>
              성별
            </p>
            <Chips
              labelledBy="c-gender"
              options={genders}
              picked={form.gender ? [form.gender] : []}
              onToggle={(v) => set("gender", form.gender === v ? "" : v)}
            />
          </div>

          {/* 주소는 칸이 셋이라 한 줄을 통째로 쓴다 — 성별 옆에 끼우면 우편번호와
              상세주소가 반 칸에 눌려 들어간다 */}
          <AddressField
            id="c-address"
            label="거주지 주소"
            hint="주소 찾기를 누르면 창이 열립니다. 적지 않으셔도 등록됩니다."
            value={address}
            onChange={setAddress}
          />

          <div>
            <p id="c-interest" className={fieldLabel}>
              관심 분야 <span className="font-normal text-soft-muted">(여러 개 고를 수 있어요)</span>
            </p>
            <Chips
              labelledBy="c-interest"
              options={interestAreas}
              picked={interests}
              onToggle={(v) => setInterests((p) => flip(p, v))}
            />
          </div>

          <div>
            <label htmlFor="c-observe" className={fieldLabel}>
              보호자가 관찰한 자녀 특성{" "}
              <span className="font-normal text-soft-muted">(진단 목적)</span>
            </label>
            <textarea
              id="c-observe"
              value={form.observation}
              maxLength={OBSERVATION_MAX}
              onChange={(e) => set("observation", e.target.value)}
              placeholder="예) 궁금한 게 생기면 답을 찾을 때까지 계속 물어봐요. 블록으로 설명서에 없는 모양을 만들어요."
              className={`mt-2 ${textarea}`}
            />
            <p className="mt-1.5 text-right text-[12px] tabular-nums text-soft-muted">
              {form.observation.length}/{OBSERVATION_MAX}
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="c-school-name" className={fieldLabel}>
                학교명
              </label>
              <input
                id="c-school-name"
                value={form.school}
                onChange={(e) => set("school", e.target.value)}
                placeholder={`예) 목동${level?.label ?? "초등학교"}`}
                className={`mt-2 ${input}`}
              />
            </div>
          </div>

          <div>
            <p id="c-learning" className={fieldLabel}>
              학습 경험 <span className="font-normal text-soft-muted">(여러 개 고를 수 있어요)</span>
            </p>
            <Chips
              labelledBy="c-learning"
              options={learningKinds}
              picked={learning}
              onToggle={(v) => setLearning((p) => flip(p, v))}
            />
            <input
              aria-label="그 밖의 학습 경험"
              value={form.learningNote}
              onChange={(e) => set("learningNote", e.target.value)}
              placeholder="그 밖의 경험이 있으면 적어 주세요. 예) 수학 경시대회 장려상"
              className={`mt-3 ${input}`}
            />
          </div>
        </div>
      </section>

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
