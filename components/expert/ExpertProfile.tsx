"use client";

import { useRef, useState } from "react";
import { dutyLabel, type ExpertAccount, type ExpertProfile as Profile } from "@/lib/expertAccounts";
import { canonProfile, saveExpertProfile } from "@/lib/expertAccountStore";
import { Field, field as fieldCls } from "@/components/account/ui";
import { Head, btnGo, btnQuiet, cardBox } from "@/components/student/self";
import { ExpertGate, ExpertPhoto, useExpertMe } from "./me";

/**
 * EXP-02 전문가 내 정보 (/expert/profile) — 이름 · 사진 · 연혁 · 소개를 본인이 고친다.
 *
 * 승인 전에도 열린다. 운영진이 확인하는 동안 채워 둘 수 있어야 하고, 승인되는 날 빈
 * 카드로 보호자 앞에 서지 않는다.
 *
 * ── 고친 것은 보호자가 보는 카드까지 간다 ──
 * 상담사 권한이 있으면 여기서 저장한 이름·직함·연혁·사진이 면담 신청 화면의 상담사
 * 카드에 그대로 선다(lib/expertAccountStore.ts의 saveExpertProfile). 그래서 저장 단추
 * 옆에 그 사실을 한 줄로 적어 둔다 — 「내 메모」인 줄 알고 적은 글이 공개 카드에 뜨면
 * 안 된다.
 *
 * ── 사진은 브라우저에서 줄여 담는다 ──
 * 올린 파일을 그대로 저장하지 않고 정사각 320px로 잘라 줄인다. 이 시안에는 파일 서버가
 * 없어 사진이 계정과 함께 브라우저 저장소에 들어가는데, 휴대전화 사진 한 장(수 MB)이면
 * 저장소가 넘친다.
 */

const PHOTO_PX = 320;

/** 고른 파일을 정사각으로 잘라 줄인 data URL로 바꾼다. 그림이 아니면 null */
function shrinkPhoto(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) return resolve(null);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const canvas = document.createElement("canvas");
      canvas.width = PHOTO_PX;
      canvas.height = PHOTO_PX;
      const ctx = canvas.getContext("2d");
      URL.revokeObjectURL(url);
      if (!ctx || side === 0) return resolve(null);
      /* 가운데를 정사각으로 — 세로 사진은 위아래를, 가로 사진은 좌우를 덜어 낸다 */
      ctx.drawImage(
        img,
        (img.naturalWidth - side) / 2,
        (img.naturalHeight - side) / 2,
        side,
        side,
        0,
        0,
        PHOTO_PX,
        PHOTO_PX,
      );
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

const area =
  "w-full rounded-[12px] border border-soft-line bg-white px-4 py-3 text-[15px] leading-[1.7] text-soft-ink outline-none transition-colors placeholder:text-slate-400 focus:border-soft-primary focus:ring-2 focus:ring-soft-primary-soft";

export default function ExpertProfile() {
  const me = useExpertMe();
  const gate = ExpertGate({ title: "내 정보", me });
  if (gate) return gate;
  /* key를 계정 번호로 — 다른 계정으로 갈아탔을 때 앞 사람의 초안이 남지 않게 */
  return <Editor key={me.account!.id} account={me.account!} />;
}

function Editor({ account }: { account: ExpertAccount }) {
  const [draft, setDraft] = useState<Profile>(account.profile);
  /* 연혁·전문 분야는 글 상자에서 고친다 — 줄 끝의 빈 줄까지 그대로 들고 있어야 치는
     도중에 줄이 사라지지 않는다 */
  const [careerText, setCareerText] = useState(account.profile.career.join("\n"));
  const [tagText, setTagText] = useState(account.profile.tags.join(", "));
  const [tried, setTried] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const next = canonProfile({
    ...draft,
    career: careerText.split("\n"),
    tags: tagText.split(/[,·\n]/),
  });
  const dirty = JSON.stringify(next) !== JSON.stringify(canonProfile(account.profile));
  const nameOk = next.name.length >= 2;
  const counselor = account.state === "approved" && account.duties.includes("counselor");

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setSavedAt(null);
  };

  const pickPhoto = async (f: File | undefined) => {
    if (!f) return;
    const url = await shrinkPhoto(f);
    if (!url) {
      setPhotoError("이미지 파일(JPG · PNG)을 골라 주세요.");
      return;
    }
    setPhotoError(null);
    set("photo", url);
  };

  const save = () => {
    setTried(true);
    if (!nameOk) return;
    saveExpertProfile(account.id, next);
    const d = new Date();
    setSavedAt(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
  };

  return (
    <>
      <Head
        title="내 정보"
        lead={
          counselor
            ? "여기 적은 이름·사진·연혁·소개는 보호자가 면담을 신청할 때 보는 상담사 카드에 그대로 표시됩니다."
            : "이름·사진·연혁·소개를 채워 주세요. 승인 전에도 고칠 수 있습니다."
        }
      />

      {/* 계정 — 고치는 칸이 아니라 확인하는 칸 */}
      <dl className={`${cardBox} mt-7 divide-y divide-slate-100 px-6 text-[14px]`}>
        {[
          [
            "계정",
            account.provider
              ? `${account.provider} 간편가입 · ${account.email}`
              : `아이디 ${account.loginId}`,
          ],
          [
            "가입 승인",
            account.state === "approved"
              ? `승인됨 · ${account.decision?.at ?? ""}`
              : account.state === "rejected"
                ? "반려됨"
                : "승인 대기",
          ],
          [
            "권한",
            account.state === "approved"
              ? account.duties.map(dutyLabel).join(" · ")
              : "아직 없음",
          ],
        ].map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-4 py-3.5">
            <dt className="shrink-0 text-[13px] font-semibold text-soft-muted">{k}</dt>
            <dd className="min-w-0 text-right text-soft-ink">{v}</dd>
          </div>
        ))}
      </dl>

      <div className={`${cardBox} mt-4 flex flex-col gap-6 p-6 sm:p-8`}>
        {/* 사진 */}
        <div className="flex flex-wrap items-center gap-5">
          <ExpertPhoto photo={draft.photo} name={draft.name} size={96} />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-soft-ink">프로필 사진</p>
            <p className="mt-1 text-[13px] leading-[1.7] text-soft-muted">
              정사각형으로 잘려 등록됩니다. 올리지 않으면 이름 글자로 대신 표시됩니다.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                ref={file}
                type="file"
                accept="image/*"
                className="sr-only"
                aria-label="프로필 사진 파일"
                onChange={(e) => {
                  void pickPhoto(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <button type="button" className={btnQuiet} onClick={() => file.current?.click()}>
                {draft.photo ? "사진 바꾸기" : "사진 올리기"}
              </button>
              {draft.photo && (
                <button
                  type="button"
                  className={`${btnQuiet} text-soft-muted`}
                  onClick={() => set("photo", "")}
                >
                  사진 지우기
                </button>
              )}
            </div>
            {photoError && (
              <p role="alert" className="mt-2 text-[13px] text-[#e5484d]">
                {photoError}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="ex-name"
            label="이름"
            required
            error={tried && !nameOk ? "이름을 입력해 주세요." : undefined}
          >
            <input
              id="ex-name"
              className={fieldCls}
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              autoComplete="name"
            />
          </Field>
          <Field id="ex-role" label="직함">
            <input
              id="ex-role"
              className={fieldCls}
              value={draft.role}
              onChange={(e) => set("role", e.target.value)}
              placeholder="예) 교육과정 자문위원"
            />
          </Field>
          <Field id="ex-org" label="소속">
            <input
              id="ex-org"
              className={fieldCls}
              value={draft.org}
              onChange={(e) => set("org", e.target.value)}
              autoComplete="organization"
            />
          </Field>
          <Field id="ex-tags" label="전문 분야" hint="여럿이면 쉼표로 나눠 적습니다.">
            <input
              id="ex-tags"
              className={fieldCls}
              value={tagText}
              onChange={(e) => {
                setTagText(e.target.value);
                setSavedAt(null);
              }}
              placeholder="예) 초등 수학, 문항 개발"
            />
          </Field>
        </div>

        <Field id="ex-headline" label="한 줄 소개" hint="이름 바로 아래에 서는 한 문장입니다.">
          <input
            id="ex-headline"
            className={fieldCls}
            value={draft.headline}
            onChange={(e) => set("headline", e.target.value)}
          />
        </Field>

        <Field id="ex-career" label="연혁" hint="한 줄에 하나씩 적습니다. 위에서부터 차례대로 섭니다.">
          <textarea
            id="ex-career"
            rows={5}
            className={area}
            value={careerText}
            onChange={(e) => {
              setCareerText(e.target.value);
              setSavedAt(null);
            }}
            placeholder={"교육학 박사 (전공)\n○○초등학교 교사 12년\n○○교육청 자문위원 (현)"}
          />
        </Field>

        <Field id="ex-bio" label="소개 내용" hint="어떤 일을 해 왔고 무엇을 맡는지 자유롭게 적습니다.">
          <textarea
            id="ex-bio"
            rows={6}
            className={area}
            value={draft.bio}
            onChange={(e) => set("bio", e.target.value)}
          />
        </Field>

        <div className="flex flex-wrap items-center gap-3 border-t border-soft-line pt-6">
          <button
            type="button"
            className={`${btnGo} disabled:cursor-not-allowed disabled:bg-soft-line`}
            disabled={!dirty}
            onClick={save}
          >
            저장
          </button>
          <button
            type="button"
            className={`${btnQuiet} disabled:cursor-not-allowed disabled:opacity-40`}
            disabled={!dirty}
            onClick={() => {
              setDraft(account.profile);
              setCareerText(account.profile.career.join("\n"));
              setTagText(account.profile.tags.join(", "));
              setTried(false);
            }}
          >
            되돌리기
          </button>
          <span role="status" className="text-[13px] text-soft-muted">
            {savedAt && !dirty
              ? `${savedAt}에 저장했습니다.`
              : dirty
                ? "저장하지 않은 변경이 있습니다."
                : ""}
          </span>
        </div>
      </div>
    </>
  );
}
