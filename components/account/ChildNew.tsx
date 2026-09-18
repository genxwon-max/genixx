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
import { addStudents, formatCode, type ChildProfile } from "@/lib/roster";
import { useSession } from "@/lib/authStore";
import { ArrowRight } from "@/components/Icons";
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
 * 필수는 이름·생년월일·학교급·학년·아이 휴대전화 다섯이다. 생년월일은 만 14세
 * 기준으로 동의 주체를 가르는 값이고, 학교급·학년은 어느 학년대 설문을 낼지 정하는
 * 값이다. 휴대전화는 「없음」을 고를 수 있으나 고르기는 해야 한다 — 빈 칸과 없는 것은
 * 다르다.
 * 나머지는 결과를 더 잘 읽기 위한 값이므로, 지금 모르면 비워 두고 나중에 채우면 된다.
 * 항목 구분은 개인정보처리방침의 수집 항목 표와 맞춘다.
 */

/**
 * 학교급과 그 안의 학년.
 *
 * 2026 파일럿이 문항을 갖춘 구간은 초등 3학년 ~ 중학교 3학년이지만, 학교급은 초·중·고
 * 셋을 다 받는다. 형제자매를 한 계정에 모아 두는 일이 흔한데 큰아이가 고등학생이라고
 * 명부에 올리지도 못하면 보호자는 아이마다 다른 자리를 찾아야 한다.
 *
 * ⚠ 고등학생은 아직 접수할 평가가 없다. 차림표(lib/examCatalog.ts)의 학년 칸이 초3-4 ·
 *   초5-6 · 중1-2 셋뿐이라 「내 학년」으로 걸리는 카드가 없다. 설문은 나간다 —
 *   학년대(lib/surveyBands.ts)가 고등학생을 가장 위 칸(중2~3)으로 받는다.
 */
const schoolLevels = [
  { id: "초등", label: "초등학교", grades: [3, 4, 5, 6] },
  { id: "중등", label: "중학교", grades: [1, 2, 3] },
  { id: "고등", label: "고등학교", grades: [1, 2, 3] },
];
const genders = ["남자", "여자"];
const regions = [
  "서울",
  "경기·인천",
  "강원",
  "충청·대전·세종",
  "전라·광주",
  "경상·대구·부산·울산",
  "제주",
];
const interestAreas = [
  "읽기·글쓰기",
  "수학·논리",
  "과학·자연 탐구",
  "그리기·만들기",
  "음악",
  "운동·신체 활동",
  "코딩·디지털",
  "사회·역사",
  "외국어",
];
const learningKinds = [
  "영재교육원·영재학급",
  "경시·경진대회 참가",
  "학원·과외",
  "방과후 프로그램",
  "온라인 학습",
  "해외 거주·유학",
];
const OBSERVATION_MAX = 500;

/** 입력 칸과 같은 모양이되 높이만 여러 줄로 */
const textarea = `${input.replace("h-[3.25rem]", "")} min-h-[7.5rem] py-3 leading-relaxed`;

/**
 * 비었거나 틀린 필수 칸. 테두리 색을 덧붙이지 않고 바꿔 끼운다 — 같은 속성의 클래스가
 * 둘 다 있으면 어느 쪽이 이기는지는 CSS가 생성된 순서에 달려 있다.
 */
const inputBad = (on: boolean) =>
  on ? input.replace("border-soft-line", "border-[#e5484d]") : input;

const flip = (list: string[], v: string) =>
  list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

/** 눌러서 켜고 끄는 알약. 여러 개 고르는 항목과, 다시 누르면 풀리는 성별에 쓴다. */
function Chips({
  options,
  picked,
  onToggle,
  labelledBy,
}: {
  options: string[];
  picked: string[];
  onToggle: (v: string) => void;
  labelledBy: string;
}) {
  return (
    <div role="group" aria-labelledby={labelledBy} className="mt-2 flex flex-wrap gap-2">
      {options.map((o) => {
        const on = picked.includes(o);
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(o)}
            className={`h-10 rounded-full border px-4 text-[14px] font-semibold transition-colors ${
              on
                ? "border-soft-primary bg-soft-primary-soft text-soft-primary"
                : "border-soft-line bg-white text-soft-muted hover:bg-slate-50"
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

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
    region: "",
    observation: "",
    school: "",
    learningNote: "",
  });
  const [interests, setInterests] = useState<string[]>([]);
  const [learning, setLearning] = useState<string[]>([]);
  const [agreed, setAgreed] = useState<string[]>([]);
  const [kidsNoticeRead, setKidsNoticeRead] = useState(false);
  /** 만 14세 이상 자녀에게 보내는 가입 초대 링크를 복사했는가 */
  const [inviteCopied, setInviteCopied] = useState(false);
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
  const level = schoolLevels.find((l) => l.id === form.level);

  const upfront = consentStages.filter((s) => s.upfront);
  const allRequired = upfront.filter((s) => s.required).every((s) => agreed.includes(s.id));
  // 만 14세 미만은 아이 눈높이 고지문을 함께 보여 줬는지도 확인한다
  const kidsOk = route === "guardian" ? kidsNoticeRead : true;

  const nameOk = form.name.trim().length > 0;
  const gradeOk = !!level && form.grade !== "";
  /* 「있음」을 골랐으면 번호가 있어야 한다. 10~11자리 휴대전화만 받는다. */
  const phoneDigits = form.phone.replace(/\D/g, "");
  const phoneOk =
    form.hasPhone === "no" || (phoneDigits.length >= 10 && phoneDigits.length <= 11);
  const ready =
    nameOk && route !== null && !!level && gradeOk && phoneOk && allRequired && kidsOk;

  const problem = !nameOk
    ? "이름을 적어 주세요."
    : route === null
      ? "생년월일을 8자리로 정확히 입력해 주세요."
      : !level
        ? "학교급을 골라 주세요."
        : !gradeOk
          ? "학년을 골라 주세요."
          : !phoneOk
            ? "아이 휴대전화 번호를 정확히 입력해 주세요. 없으면 「없음」을 골라 주세요."
            : !kidsOk
              ? "아이에게 보여 줄 안내문을 확인해 주세요."
              : "필수 동의 항목에 체크해 주세요.";

  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const submit = () => {
    setTried(true);
    if (!ready || !route || !level) return;
    const text = (v: string) => v.trim() || undefined;
    const list = (v: string[]) => (v.length ? v : undefined);
    const profile: ChildProfile = {
      gender: form.gender || undefined,
      region: form.region || undefined,
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
            {digits.length === 8 && age === null ? (
              <p role="alert" className="mt-1.5 text-[12px] font-bold text-rose-600">
                날짜를 다시 확인해 주세요.
              </p>
            ) : (
              age !== null && (
                <p className="mt-1.5 text-[12px] text-soft-muted">
                  만 {age}세 — 아래에 동의 항목이 나왔습니다.
                </p>
              )
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
          <div className="grid gap-5 sm:grid-cols-2">
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

            <div>
              <label htmlFor="c-region" className={fieldLabel}>
                거주 지역
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
          </div>

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

      {/* ③ 동의 — 생년월일이 들어와야 누가 동의하는지 정해진다 */}
      {info && route && (
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

          {/* 만 14세 이상 — 본인 가입이 더 깔끔하다 */}
          {route === "self" && (
            <div className="mt-4 rounded-lg bg-slate-50 px-5 py-4">
              <p className="text-[14px] leading-relaxed text-soft-ink">
                만 {CONSENT_AGE}세 이상이라 법정대리인 동의를 받지 않습니다. 아이가{" "}
                <b>본인 계정으로 직접 가입</b>하는 쪽이 가장 깔끔합니다. 보호자가 대신 전체 계정을
                만드시기보다, 아이에게 가입을 안내하고 두 계정을 잇는 것을 권합니다.
              </p>
              <p className="mt-2 text-[14px] leading-relaxed text-soft-ink">
                지금 그대로 등록하셔도 됩니다. 그때는 아이가 접속코드로 처음 들어올 때{" "}
                <b>본인 동의 화면</b>이 먼저 뜨고, 아이가 동의해야 응시가 시작됩니다. 결과를
                보호자와 공유할지도 아이가 직접 정합니다.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}/signup/type?stage=age&type=student`;
                    void navigator.clipboard?.writeText(url);
                    setInviteCopied(true);
                  }}
                  className={btnGhost}
                >
                  {inviteCopied ? "초대 링크를 복사했습니다" : "학생에게 가입 초대 링크 복사"}
                </button>
                <Link
                  href="/signup/type?stage=age&type=student"
                  className="text-[13px] font-bold text-soft-primary-dark underline"
                >
                  학생 가입 화면 열기 ›
                </Link>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-soft-muted">
                아이가 이 링크로 본인 동의를 마치고 계정을 만들면, 발급된 접속코드로 이 계정과
                이어서 결과를 함께 보실 수 있습니다.
              </p>
            </div>
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
                      onChange={() => setAgreed((p) => flip(p, s.id))}
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
