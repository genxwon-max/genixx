"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { roleOf } from "@/lib/admin";
import { patchAdminPrefs, useAdminPrefs } from "@/lib/adminStore";
import { dutyLabel, type ExpertAccount } from "@/lib/expertAccounts";
import { canonProfile, saveExpertProfile, useExpertAccounts } from "@/lib/expertAccountStore";
import { consoleLoginOf, isExpertConsoleLogin } from "@/lib/expertConsole";
import { shrinkPhoto } from "@/lib/photo";
import { roleFor, useScreenAccess } from "@/lib/screenAccessStore";
import { LeaveDialog, PageSaveBar, useEditDraft, useUnsavedGuard } from "@/components/admin2/EditGuard";
import { Body, DescList, FormRow, PageHead, Panel, Tag } from "@/components/admin2/ui";

/**
 * ADM-00 내 정보.
 *
 * 콘솔 로그인은 「누구로 들어왔나」 한 줄뿐이라(lib/adminStore.ts), 그 아이디로 사람을 다시
 * 찾는다 — ex.로 시작하면 전문가 계정이고(lib/expertConsole.ts), 아니면 운영자 계정이다.
 *
 * 전문가의 프로필은 회원 자리의 「내 정보」(/expert/profile)와 **같은 값**을 고친다. 저장소가
 * 하나라(lib/expertAccountStore.ts) 어느 쪽에서 고쳐도 다른 쪽에 그대로 보인다.
 */

const lines = (v: string[]) => v.join("\n");

export default function MyInfo() {
  const prefs = useAdminPrefs();
  const experts = useExpertAccounts();
  const access = useScreenAccess();

  const expert = isExpertConsoleLogin(prefs.loginId)
    ? (experts.find((a) => consoleLoginOf(a) === prefs.loginId) ?? null)
    : null;

  if (expert) return <ExpertInfo key={expert.id} account={expert} />;

  /* 운영자 계정 — 읽기만 한다 */
  const group = roleFor(access, prefs.loginId);
  return (
    <>
      <PageHead title="내 정보" />
      <Body>
        <Panel title="계정">
          <DescList
            rows={[
              { k: "이름", v: <span className="font-semibold">{prefs.staffName || "—"}</span> },
              { k: "아이디", v: <span className="a2-mono">{prefs.loginId}</span> },
              { k: "역할", v: <Tag>{roleOf(prefs.role).label}</Tag> },
              { k: "화면 권한", v: prefs.role === "super" ? "모든 화면" : (group?.name ?? "—") },
            ]}
          />
          <p className="a2-hint mt-2">
            운영자 계정의 이름과 역할은 슈퍼 관리자가{" "}
            <Link href="/admin2/staff" className="underline">
              운영자·권한
            </Link>
            에서 정합니다.
          </p>
        </Panel>
      </Body>
    </>
  );
}

function ExpertInfo({ account }: { account: ExpertAccount }) {
  const p = account.profile;
  const draft = useEditDraft({
    name: p.name,
    photo: p.photo,
    role: p.role,
    org: p.org,
    headline: p.headline,
    bio: p.bio,
    /* 연혁 · 전문 분야는 글 상자에서 고친다 — 치는 도중의 빈 줄까지 그대로 들고 있는다 */
    career: lines(p.career),
    tags: p.tags.join(", "),
  });
  const v = draft.value;
  const [photoError, setPhotoError] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const next = canonProfile({
    name: v.name,
    photo: v.photo,
    role: v.role,
    org: v.org,
    headline: v.headline,
    bio: v.bio,
    career: v.career.split("\n"),
    tags: v.tags.split(/[,·\n]/),
  });
  const nameOk = next.name.length >= 2;
  const counselor = account.duties.includes("counselor");

  const save = () => {
    if (!nameOk) return false;
    saveExpertProfile(account.id, next);
    /* 다듬은 꼴을 초안에 되돌려 넣는다 — 줄 끝 빈 칸 하나로 저장 줄이 켜져 있지 않게 */
    draft.patch({ ...next, career: lines(next.career), tags: next.tags.join(", ") });
    /* 상단 바의 이름도 함께 바꾼다 */
    patchAdminPrefs({ staffName: next.name });
    return true;
  };

  const guard = useUnsavedGuard(draft.dirty, save, draft.reset);

  const pickPhoto = async (f: File | undefined) => {
    if (!f) return;
    const url = await shrinkPhoto(f);
    if (!url) return setPhotoError("이미지 파일(JPG · PNG)을 골라 주세요.");
    setPhotoError(null);
    draft.set("photo", url);
  };

  return (
    <>
      <PageHead
        title="내 정보"
        actions={
          <Link href="/expert" className="a2-btn">
            전문가 홈
          </Link>
        }
      />

      <Body className="flex flex-col gap-3">
        <Panel title="계정" meta={account.id}>
          <DescList
            rows={[
              {
                k: "가입 수단",
                v: account.provider ? (
                  `${account.provider} 간편가입`
                ) : (
                  <>
                    아이디 가입 · <span className="a2-mono">{account.loginId}</span>
                  </>
                ),
              },
              { k: "가입 승인", v: `승인됨 · ${account.decision?.at ?? ""}` },
              {
                k: "권한",
                v: (
                  <span className="flex flex-wrap gap-1">
                    {account.duties.map((d) => (
                      <Tag key={d}>{dutyLabel(d)}</Tag>
                    ))}
                  </span>
                ),
              },
            ]}
          />
          <p className="a2-hint mt-2">권한은 운영진이 가입 승인에서 정합니다.</p>
        </Panel>

        <Panel
          title="프로필"
          meta={counselor ? "보호자가 보는 상담사 카드에 그대로 표시됩니다" : undefined}
          flush
        >
          <div className="a2-form">
            <FormRow label="사진" hint={photoError ?? "정사각형으로 잘려 등록됩니다."}>
              <span className="flex flex-wrap items-center gap-2.5">
                {v.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={v.photo}
                    alt=""
                    className="h-14 w-14 rounded-(--a2-radius) border border-(--a2-line) object-cover"
                  />
                ) : (
                  <span className="flex h-14 w-14 items-center justify-center rounded-(--a2-radius) border border-(--a2-line) bg-(--a2-bg) a2-t-sm font-bold text-(--a2-ink-3)">
                    {v.name.slice(0, 1) || "?"}
                  </span>
                )}
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
                <button type="button" className="a2-btn" onClick={() => file.current?.click()}>
                  {v.photo ? "사진 바꾸기" : "사진 올리기"}
                </button>
                {v.photo && (
                  <button type="button" className="a2-btn" onClick={() => draft.set("photo", "")}>
                    사진 지우기
                  </button>
                )}
              </span>
            </FormRow>

            <FormRow label="이름" req hint={nameOk ? undefined : "이름을 두 글자 이상 적어 주세요."}>
              <input
                className="a2-input"
                style={{ maxWidth: "14rem" }}
                value={v.name}
                onChange={(e) => draft.set("name", e.target.value)}
              />
            </FormRow>

            <FormRow label="직함">
              <input
                className="a2-input"
                style={{ maxWidth: "22rem" }}
                value={v.role}
                onChange={(e) => draft.set("role", e.target.value)}
                placeholder="예) 교육과정 자문위원"
              />
            </FormRow>

            <FormRow label="소속">
              <input
                className="a2-input"
                style={{ maxWidth: "22rem" }}
                value={v.org}
                onChange={(e) => draft.set("org", e.target.value)}
              />
            </FormRow>

            <FormRow label="전문 분야" hint="여럿이면 쉼표로 나눠 적습니다.">
              <input
                className="a2-input"
                value={v.tags}
                onChange={(e) => draft.set("tags", e.target.value)}
                placeholder="예) 초등 수학, 문항 개발"
              />
            </FormRow>

            <FormRow label="한 줄 소개">
              <input
                className="a2-input"
                value={v.headline}
                onChange={(e) => draft.set("headline", e.target.value)}
              />
            </FormRow>

            <FormRow label="연혁" hint="한 줄에 하나씩 적습니다.">
              <textarea
                className="a2-textarea"
                rows={5}
                value={v.career}
                onChange={(e) => draft.set("career", e.target.value)}
                placeholder={"교육학 박사 (전공)\n○○초등학교 교사 12년"}
              />
            </FormRow>

            <FormRow label="소개 내용">
              <textarea
                className="a2-textarea"
                rows={6}
                value={v.bio}
                onChange={(e) => draft.set("bio", e.target.value)}
              />
            </FormRow>
          </div>
        </Panel>

        <PageSaveBar dirty={draft.dirty} onSave={save} onCancel={draft.reset} disabled={!nameOk} />
      </Body>

      <LeaveDialog guard={guard} />
    </>
  );
}
