"use client";

import { useRef, useState } from "react";
import {
  addStudents,
  clearRoster,
  formatCode,
  parseRoster,
  removeStudent,
  reissueCode,
  toCsv,
  useRoster,
  type NewStudent,
  type Owner,
} from "@/lib/roster";
import { subjects } from "@/lib/exam";
import {
  submittedCount,
  surveyMeta,
  useExamStore,
  useHydrated,
  type SurveyKey,
} from "@/lib/examStore";
import { useSession } from "@/lib/authStore";
import { surveyWindow } from "@/lib/popup";
import SectionTitle from "./SectionTitle";
import Toast from "./Toast";
import {
  btnGhost,
  btnPrimary,
  btnSm,
  btnSmGhost,
  eyebrow,
  fieldLabel,
  govTable,
  input,
  panel,
  td,
  tdStrong,
  th,
} from "./ui";

type Mode = Owner;

const emptyForm: NewStudent = { name: "", birth: "", grade: "", klass: "", guardianPhone: "" };

const SAMPLE = `이름,생년월일,학년,반
김하늘,20160312,초등 4학년,A반
박서준,20160925,초등 4학년,A반
이지우,20170104,초등 3학년,B반`;

export default function StudentRegistrar({
  mode,
  /** 어느 탭으로 열지. 대시보드의 「개별 등록」·「일괄 등록」 버튼이 갈라 보낸다. */
  initialTab = "one",
  /**
   * 학부모 설문 안내 팝업을 띄울지. 등록하러 들어온 화면에서 설문 창이 먼저 덮으면
   * 하려던 일이 가려지므로, 일괄 등록 화면에서는 끈다.
   */
  surveyPrompt = true,
}: {
  mode: Mode;
  initialTab?: "one" | "bulk";
  surveyPrompt?: boolean;
}) {
  const hydrated = useHydrated();
  const session = useSession();
  const roster = useRoster();
  const records = useExamStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<"one" | "bulk">(initialTab);
  const [form, setForm] = useState<NewStudent>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [bulkText, setBulkText] = useState("");
  const [preview, setPreview] = useState<ReturnType<typeof parseRoster> | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  /** 학부모 접속 시 자동으로 뜨는 설문 안내 — 사용자가 닫기 전까지 노출 */
  const [promptDismissed, setPromptDismissed] = useState(false);

  const openSurvey = (key: SurveyKey, studentId: string) =>
    surveyWindow(`/survey/${key}?student=${studentId}`);

  const ownerName = session?.org ?? session?.name ?? (mode === "director" ? "우리학원" : "보호자");
  const mine = roster.filter((s) => s.owner === mode);

  const isDirector = mode === "director";
  const noun = "학생";

  const addOne = () => {
    if (!form.name.trim()) return setFormError("이름을 입력해 주세요.");
    if (form.birth.replace(/\D/g, "").length !== 8)
      return setFormError("생년월일을 8자리(YYYYMMDD)로 입력해 주세요.");
    if (!form.grade.trim()) return setFormError("학년을 입력해 주세요.");

    const [created] = addStudents([form], mode, ownerName);
    setForm(emptyForm);
    setFormError(null);
    setFlash(`${created.name} ${noun} 등록 완료 · 접속코드 ${formatCode(created.code)}`);
  };

  const runPreview = (text: string) => {
    setBulkText(text);
    setPreview(text.trim() ? parseRoster(text) : null);
  };

  const commitBulk = () => {
    if (!preview || preview.rows.length === 0) return;
    const created = addStudents(preview.rows, mode, ownerName);
    setBulkText("");
    setPreview(null);
    setFlash(`${created.length}명 등록 완료 · 접속코드가 각각 발급되었습니다.`);
  };

  const onFile = async (file: File) => {
    const text = await file.text();
    setTab("bulk");
    runPreview(text);
  };

  /** 학부모로 들어오면 아직 설문이 남은 학생을 바로 안내한다 */
  const pendingParent =
    !isDirector && hydrated
      ? mine.filter((s) => {
          const rec = records[s.id];
          return rec?.surveys?.mother !== "done" || rec?.surveys?.father !== "done";
        })
      : [];
  const showPrompt = surveyPrompt && !promptDismissed && pendingParent.length > 0;

  const downloadCsv = () => {
    const blob = new Blob([`﻿${toCsv(mine)}`], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `TalentMe_접속코드_${ownerName}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="container-x py-8 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-exam-text/80 pb-5">
        <div>
          <p className={eyebrow}>{isDirector ? "소속 관리" : "학생 프로필 관리"}</p>
          <h1 className="mt-2.5 text-[24px] font-black tracking-tight text-exam-text md:text-[28px]">
            학생 등록 관리
          </h1>
          <p className="mt-2 text-[12px] text-exam-muted">
            {ownerName} · 등록 {hydrated ? mine.length : 0}명
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={downloadCsv}
            disabled={mine.length === 0}
            className={`${btnGhost} disabled:cursor-not-allowed disabled:opacity-40`}
          >
            접속코드 CSV 내려받기
          </button>
        </div>
      </div>

      {/* 등록 방법 */}
      <section className="mt-7">
        <SectionTitle
          note={
            isDirector
              ? "한 명씩 추가하거나, 엑셀에서 복사해 붙여넣거나, CSV 파일을 올릴 수 있습니다."
              : "학생을 한 명씩 추가하거나, 여러 명을 한 번에 올릴 수 있습니다."
          }
        >
          {noun} 등록
        </SectionTitle>

        <div className={panel}>
          <div className="flex border-b border-exam-line">
            {[
              { id: "one" as const, label: `${noun} 한 명씩 추가` },
              { id: "bulk" as const, label: "여러 명 한 번에 (엑셀·CSV)" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-current={tab === t.id ? "true" : undefined}
                className={`px-5 py-3.5 text-[13px] font-bold transition-colors ${
                  tab === t.id
                    ? "border-b-2 border-brand-800 text-exam-text"
                    : "text-exam-muted hover:text-exam-text"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "one" ? (
            <div className="p-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label htmlFor="r-name" className={fieldLabel}>
                    이름 <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="r-name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="김하늘"
                    className={`mt-2 ${input}`}
                  />
                </div>
                <div>
                  <label htmlFor="r-birth" className={fieldLabel}>
                    생년월일 8자리 <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="r-birth"
                    inputMode="numeric"
                    maxLength={8}
                    value={form.birth}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, birth: e.target.value.replace(/\D/g, "") }))
                    }
                    placeholder="20160312"
                    className={`mt-2 tabular-nums ${input}`}
                  />
                </div>
                <div>
                  <label htmlFor="r-grade" className={fieldLabel}>
                    학년 <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="r-grade"
                    value={form.grade}
                    onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value }))}
                    placeholder="초등 4학년"
                    className={`mt-2 ${input}`}
                  />
                </div>
                <div>
                  <label htmlFor="r-extra" className={fieldLabel}>
                    {isDirector ? "반" : "보호자 연락처"}
                  </label>
                  <input
                    id="r-extra"
                    value={isDirector ? (form.klass ?? "") : (form.guardianPhone ?? "")}
                    onChange={(e) =>
                      setForm((f) =>
                        isDirector
                          ? { ...f, klass: e.target.value }
                          : { ...f, guardianPhone: e.target.value },
                      )
                    }
                    placeholder={isDirector ? "A반" : "010-1234-5678"}
                    className={`mt-2 ${input}`}
                  />
                </div>
              </div>

              {formError && (
                <p role="alert" className="mt-4 text-[13px] font-medium text-rose-600">
                  {formError}
                </p>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button type="button" onClick={addOne} className={btnPrimary}>
                  + {noun} 추가하고 코드 발급
                </button>
                <p className="text-[12px] text-exam-muted">
                  추가할 때마다 중복되지 않는 접속코드가 자동으로 발급됩니다.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className={btnPrimary}
                >
                  CSV 파일 올리기
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.txt,text/csv,text/plain"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onFile(f);
                    e.target.value = "";
                  }}
                />
                <button type="button" onClick={() => runPreview(SAMPLE)} className={btnGhost}>
                  예시 데이터 넣어보기
                </button>
              </div>

              <label htmlFor="bulk" className={`mt-5 block ${fieldLabel}`}>
                엑셀에서 복사한 내용을 그대로 붙여넣어도 됩니다
              </label>
              <p className="mt-1.5 text-[12px] text-exam-muted">
                열 순서: 이름, 생년월일(8자리), 학년, {isDirector ? "반" : "보호자 연락처"} · 쉼표
                / 탭 / 세미콜론 모두 인식하며 머리글 행은 자동으로 건너뜁니다.
              </p>
              <textarea
                id="bulk"
                rows={6}
                value={bulkText}
                onChange={(e) => runPreview(e.target.value)}
                placeholder={SAMPLE}
                className={`mt-2.5 font-mono text-[13px] leading-relaxed ${input}`}
              />

              {preview && (
                <div className="mt-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-[13px] font-bold text-exam-text">
                      인식된 {noun} <span className="tabular-nums">{preview.rows.length}</span>명
                      {preview.errors.length > 0 && (
                        <span className="ml-2 text-rose-600">
                          오류 {preview.errors.length}줄
                        </span>
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={commitBulk}
                      disabled={preview.rows.length === 0}
                      className={`${btnPrimary} disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      {preview.rows.length}명 등록하고 코드 일괄 발급
                    </button>
                  </div>

                  {preview.errors.length > 0 && (
                    <ul className="mt-3 space-y-1 rounded border border-rose-300 bg-rose-50 px-4 py-3">
                      {preview.errors.slice(0, 5).map((e) => (
                        <li key={e.line} className="text-[12px] text-rose-700">
                          {e.line}번째 줄 — {e.reason} <span className="opacity-70">({e.text})</span>
                        </li>
                      ))}
                      {preview.errors.length > 5 && (
                        <li className="text-[12px] text-rose-700">
                          외 {preview.errors.length - 5}줄
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 명부 */}
      <section className="mt-9">
        <SectionTitle
          note="접속코드와 생년월일을 함께 알려주면 학생이 바로 응시할 수 있습니다. 코드가 유출되면 재발급하세요."
          right={
            mine.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm("등록된 명부를 모두 지웁니다. 계속할까요?")) clearRoster();
                }}
                className="rounded border border-exam-line bg-exam-panel px-3.5 py-1.5 text-[12px] font-bold text-exam-muted transition-colors hover:bg-exam-raised"
              >
                전체 삭제 (시연용)
              </button>
            ) : undefined
          }
        >
          학생 목록
        </SectionTitle>

        <div className="overflow-x-auto">
          <table className={govTable}>
            <thead>
              <tr>
                <th className={th}>번호</th>
                <th className={th}>이름</th>
                <th className={th}>생년월일</th>
                <th className={th}>학년</th>
                <th className={th}>{isDirector ? "반" : "보호자 연락처"}</th>
                <th className={th}>접속코드</th>
                <th className={th}>응시 진행</th>
                <th className={th}>{isDirector ? "지도교사 관찰 설문" : "학부모 설문"}</th>
                <th className={th}>관리</th>
              </tr>
            </thead>
            <tbody>
              {!hydrated || mine.length === 0 ? (
                <tr>
                  <td className={`${td} py-10`} colSpan={9}>
                    등록된 {noun}가 없습니다. 위에서 추가해 주세요.
                  </td>
                </tr>
              ) : (
                mine.map((s, i) => {
                  const rec = records[s.id];
                  const done = rec ? submittedCount(rec) : 0;
                  const myKeys: SurveyKey[] = isDirector ? ["teacher"] : ["mother", "father"];
                  return (
                    <tr key={s.id}>
                      <td className={`${td} tabular-nums`}>{i + 1}</td>
                      <td className={tdStrong}>{s.name}</td>
                      <td className={`${td} tabular-nums`}>{s.birth}</td>
                      <td className={td}>{s.grade}</td>
                      <td className={td}>{(isDirector ? s.klass : s.guardianPhone) || "-"}</td>
                      <td className={`${tdStrong} tabular-nums tracking-wide`}>
                        {formatCode(s.code)}
                      </td>
                      <td className={`${td} tabular-nums`}>
                        <span className={done === subjects.length ? "font-bold text-emerald-700" : ""}>
                          {done} / {subjects.length}
                        </span>
                      </td>
                      <td className={td}>
                        <div className="flex flex-col items-center gap-1.5">
                          {myKeys.map((k) => {
                            const state = rec?.surveys?.[k] === "done";
                            return (
                              <span key={k} className="flex items-center gap-2">
                                {!isDirector && (
                                  <span className="w-9 text-right text-[12px] text-exam-muted">
                                    {surveyMeta[k].who}
                                  </span>
                                )}
                                <span
                                  className={`w-12 text-[12px] font-bold ${
                                    state ? "text-emerald-700" : "text-rose-600"
                                  }`}
                                >
                                  {state ? "제출완료" : "미제출"}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => openSurvey(k, s.id)}
                                  className={state ? btnSmGhost : btnSm}
                                >
                                  {state ? "다시 작성" : "설문 입력"}
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className={td}>
                        <div className="flex justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => reissueCode(s.id)}
                            className={btnSmGhost}
                          >
                            코드 재발급
                          </button>
                          <button
                            type="button"
                            onClick={() => removeStudent(s.id)}
                            className="inline-flex items-center rounded border border-rose-300 bg-exam-panel px-3 py-1.5 text-[12px] font-bold text-rose-600 transition-colors hover:bg-rose-50"
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 코드 규칙 안내 */}
      <section className="mt-9">
        <SectionTitle>접속코드 발급 규칙</SectionTitle>
        <div className={`grid gap-5 p-6 md:grid-cols-3 ${panel}`}>
          {[
            {
              t: "8자리 · 30종 문자",
              d: "0·O, 1·I·L, U처럼 헷갈리는 글자를 뺀 30개 문자로 8자리를 만듭니다. 조합은 약 6,561억 가지로, 5,000명은 물론 수십만 명 규모에서도 여유가 있습니다.",
            },
            {
              t: "발급 시 중복 검사",
              d: "무작위로 만든 뒤 이미 쓰인 코드와 대조해 겹치면 다시 만듭니다. 확률이 아니라 검사로 유일성을 보장합니다.",
            },
            {
              t: "코드 + 생년월일 2요소",
              d: "코드만으로는 로그인되지 않습니다. 생년월일이 함께 맞아야 통과하므로 코드를 잘못 배부해도 다른 학생 화면으로 들어갈 수 없습니다.",
            },
          ].map((c) => (
            <div key={c.t}>
              <p className="text-[14px] font-black text-exam-text">{c.t}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-exam-muted">{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-6 text-[12px] leading-relaxed text-exam-muted">
        학생에게는 <b className="text-exam-text">접속코드와 생년월일</b>만 전달하면 됩니다. 학생은
        학생 로그인 화면에서 코드를 입력해 바로 응시할 수 있고, 보호자도 같은 코드로 들어와 설문만
        진행할 수 있습니다.
        {isDirector
          ? " 지도교사 관찰 설문은 위 명부에서 학생별로 바로 입력할 수 있습니다."
          : " 학부모 설문은 위 목록에서 학생별로 어머니·아버지가 각각 입력합니다."}
      </p>

      {showPrompt && (
        <ParentSurveyPrompt
          students={pendingParent.map((s) => ({
            id: s.id,
            name: s.name,
            mother: records[s.id]?.surveys?.mother === "done",
            father: records[s.id]?.surveys?.father === "done",
          }))}
          onPick={(key, id) => {
            setPromptDismissed(true);
            openSurvey(key, id);
          }}
          onClose={() => setPromptDismissed(true)}
        />
      )}

      <Toast message={flash} onClose={() => setFlash(null)} />
    </div>
  );
}

/** 학부모 접속 시 학생별 설문을 바로 안내하는 창 */
function ParentSurveyPrompt({
  students,
  onPick,
  onClose,
}: {
  students: { id: string; name: string; mother: boolean; father: boolean }[];
  onPick: (key: SurveyKey, studentId: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="parent-survey-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-exam-text/40 p-5"
    >
      <div className="w-full max-w-md rounded-md border border-exam-line bg-exam-panel">
        <div className="border-b border-exam-line px-6 py-5">
          <p className={eyebrow}>ASM-05 · 학부모 설문</p>
          <h2 id="parent-survey-title" className="mt-2 text-[19px] font-black text-exam-text">
            학생의 특징을 알려 주세요
          </h2>
          <p className="mt-2.5 text-[13px] leading-relaxed text-exam-muted">
            평소 어떤 것에 몰입하는지, 어떤 방식으로 문제를 푸는지 등 가정에서 관찰한 모습을
            여쭙습니다. 어머니·아버지가 <b className="text-exam-text">각각</b> 제출하실 수 있습니다.
          </p>
        </div>

        <ul className="divide-y divide-exam-line">
          {students.map((s) => (
            <li key={s.id} className="px-6 py-4">
              <p className="text-[14px] font-black text-exam-text">{s.name}</p>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                {(
                  [
                    { key: "mother" as const, label: "어머니", done: s.mother },
                    { key: "father" as const, label: "아버지", done: s.father },
                  ] as const
                ).map((g) => (
                  <button
                    key={g.key}
                    type="button"
                    onClick={() => onPick(g.key, s.id)}
                    className={g.done ? btnGhost : btnPrimary}
                  >
                    {g.label} {g.done ? "다시 작성" : "설문하기"}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>

        <div className="border-t border-exam-line px-6 py-4 text-center">
          <button
            type="button"
            onClick={onClose}
            className="text-[13px] text-exam-muted hover:text-exam-text"
          >
            나중에 하기
          </button>
        </div>
      </div>
    </div>
  );
}
