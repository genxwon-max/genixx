"use client";

import { useState } from "react";
import { useAdminPrefs } from "@/lib/adminStore";
import {
  addComment,
  addItem,
  assetKindOf,
  attachAsset,
  itemReady,
  itemTypes,
  MAX_ASSET_BYTES,
  missingFields,
  patchItem,
  rejectLabel,
  removeAsset,
  reviseApproved,
  stateLabel,
  stateTone,
  submitItem,
  typeLabel,
  useItems,
  withdrawItem,
  type ItemAsset,
  type ItemDraft,
  type ItemState,
  type ItemType,
} from "@/lib/itemStore";
import { useHydrated } from "@/lib/examStore";
import { PageHead, Badge } from "./Parts";
import * as a from "./ui";

/**
 * EXP-02 출제 워크벤치.
 *
 * 왼쪽에 내 문항, 오른쪽에 편집기를 둔다. 반려된 문항이 맨 위로 올라오고, 검수 코멘트가
 * 편집기 머리에 붙는다 — 무엇을 고쳐야 하는지 보지 않고 고칠 수는 없기 때문이다.
 *
 * 고칠 수 있는 범위는 상태로 갈린다 —
 *  · 작성 중·반려됨 — 바로 고친다.
 *  · 검수 대기      — 잠근다. 검수자가 본 것과 승인되는 것이 달라지면 안 된다(EXP-02-5).
 *                     대신 「제출 회수」로 되돌려 고칠 수 있다. 검수가 시작되기 전이라면
 *                     회수가 반려보다 서로 덜 번거롭다.
 *  · 승인됨         — 원본은 건드리지 않고 새 버전을 뜬다. 이미 검사지에 들어간 문항의
 *                     내용이 바뀌면 앞 회차 응답과 대조가 어긋난다.
 *
 * 내 문항만 보인다. 남이 쓴 문항은 여기 없다.
 */

const tabs: { id: ItemState | "all"; label: string }[] = [
  { id: "rejected", label: "반려함" },
  { id: "draft", label: "작성 중" },
  { id: "submitted", label: "검수 대기" },
  { id: "approved", label: "승인됨" },
  { id: "all", label: "전체" },
];

export default function AuthoringBench() {
  const prefs = useAdminPrefs();
  const hydrated = useHydrated();
  const all = useItems();
  const [tab, setTab] = useState<ItemState | "all">("rejected");
  const [openId, setOpenId] = useState<string | null>(null);

  const mine = all.filter((i) => i.author === prefs.loginId);
  const shown = tab === "all" ? mine : mine.filter((i) => i.state === tab);
  const current = mine.find((i) => i.id === openId) ?? shown[0] ?? null;

  const countOf = (state: ItemState) => mine.filter((i) => i.state === state).length;

  return (
    <>
      <PageHead
        id="EXP-02"
        title="출제 워크벤치"
        lead="발주 사양에 맞춰 문항을 쓰고 제출합니다. 반려된 문항은 사유와 함께 여기로 돌아옵니다."
        action={
          <button
            type="button"
            onClick={() => {
              const item = addItem(prefs.loginId ?? "", prefs.staffName);
              setTab("draft");
              setOpenId(item.id);
            }}
            className={a.btnPrimary}
          >
            새 문항 만들기
          </button>
        }
      />

      {!hydrated ? (
        <p className={`${a.panel} p-8 text-center ${a.bodyText}`}>확인 중입니다…</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[20rem_1fr]">
          {/* ── 왼쪽: 내 문항 ── */}
          <section className={`${a.panel} self-start overflow-hidden`}>
            <div className="flex flex-wrap gap-1 border-b border-exam-line p-2">
              {tabs.map((t) => {
                const n = t.id === "all" ? mine.length : countOf(t.id as ItemState);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTab(t.id);
                      setOpenId(null);
                    }}
                    aria-current={tab === t.id ? "true" : undefined}
                    className={`min-h-[2.5rem] rounded-md px-3 adm-t-sm font-bold transition-colors ${
                      tab === t.id
                        ? "bg-brand-900 text-white"
                        : "text-exam-text hover:bg-exam-raised"
                    }`}
                  >
                    {t.label}
                    <span className="ml-1.5 tabular-nums">{n}</span>
                  </button>
                );
              })}
            </div>

            {shown.length === 0 ? (
              <p className={`px-5 py-8 text-center ${a.bodyText}`}>이 칸에 있는 문항이 없습니다.</p>
            ) : (
              <ul>
                {shown.map((i) => (
                  <li key={i.id} className="border-b border-exam-line last:border-b-0">
                    <button
                      type="button"
                      onClick={() => setOpenId(i.id)}
                      aria-current={current?.id === i.id ? "true" : undefined}
                      className={`w-full px-4 py-3.5 text-left transition-colors ${
                        current?.id === i.id ? "bg-brand-50" : "hover:bg-exam-raised"
                      }`}
                    >
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="adm-t-md font-bold text-exam-text">
                          {i.code || "코드 없음"}
                        </span>
                        <Badge label={stateLabel[i.state]} className={stateTone[i.state]} />
                      </span>
                      <span className="mt-1 block adm-t-sm text-exam-muted">
                        {typeLabel(i.type)} · {i.subject} · {i.grade} · {i.level}
                      </span>
                      <span className="mt-0.5 block truncate adm-t-sm text-exam-muted">
                        {i.stem || "발문을 아직 쓰지 않았습니다"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ── 오른쪽: 편집기 ── */}
          {current ? (
            <Editor key={current.id} item={current} />
          ) : (
            <section className={`${a.panel} p-8 text-center`}>
              <p className={a.cardTitle}>왼쪽에서 문항을 고르세요</p>
              <p className={`${a.bodyText} mt-2`}>
                또는 오른쪽 위 「새 문항 만들기」로 새로 시작하실 수 있습니다.
              </p>
            </section>
          )}
        </div>
      )}
    </>
  );
}

const rubricPlaceholder = [
  "완전정답 — 근거 두 가지를 모두 들고 자기 말로 설명한다",
  "부분정답 — 근거를 하나만 들거나 설명이 짧다",
  "오답 — 근거가 글에 없거나 묻는 바와 다르다",
].join("\n");

function Editor({ item }: { item: ItemDraft }) {
  const prefs = useAdminPrefs();
  const locked = item.state === "submitted" || item.state === "approved";
  const ready = itemReady(item);
  const missing = missingFields(item);
  const set = (patch: Partial<ItemDraft>) => patchItem(item.id, patch);
  const lastReject = [...item.comments].reverse().find((c) => c.kind === "reject");
  const [reply, setReply] = useState("");

  return (
    <section className={`${a.panel} p-5 sm:p-6`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-exam-line pb-4">
        <div>
          <h2 className={a.cardTitle}>
            {item.code || "새 문항"}
            {item.version > 1 && (
              <span className="ml-2 adm-t-sm font-bold text-exam-muted">v{item.version}</span>
            )}
          </h2>
          <p className="mt-1 adm-t-sm text-exam-muted">
            {item.id} · {typeLabel(item.type)} · 마지막 수정 {item.updatedAt}
            {item.revisionOf ? ` · ${item.revisionOf} 수정본` : ""}
          </p>
        </div>
        <Badge label={stateLabel[item.state]} className={stateTone[item.state]} />
      </div>

      {/* 반려 사유는 편집기 맨 위에 붙인다 — 보지 않고 고칠 수는 없다 */}
      {item.state === "rejected" && lastReject && (
        <div className="mt-5 rounded-lg border border-rose-300 bg-rose-50 p-5">
          <p className="adm-t-md font-black text-rose-900">
            반려 — {rejectLabel(lastReject.code!)}
          </p>
          <p className="mt-2 adm-t-md leading-relaxed text-rose-900">{lastReject.text}</p>
          <p className="mt-2 adm-t-sm text-rose-800">
            {lastReject.by} · {lastReject.at}
          </p>
        </div>
      )}

      {/* 잠긴 상태에서도 손쓸 길을 남긴다 — 회수하거나 새 버전을 뜬다 */}
      {locked && (
        <div className="mt-5 rounded-lg border border-exam-line bg-exam-panel p-5">
          <p className="adm-t-md font-bold text-exam-text">
            {item.state === "submitted" ? "검수 중이라 잠겨 있습니다" : "승인된 문항입니다"}
          </p>
          <p className={`${a.bodyText} mt-1.5`}>
            {item.state === "submitted"
              ? "검수자가 본 것과 승인되는 것이 달라지지 않게 잠가 둡니다. 고치시려면 회수해 주세요 — 검수가 시작되기 전이라면 반려보다 서로 덜 번거롭습니다."
              : "이미 검사지에 들어갔을 수 있어 원본은 고치지 않습니다. 고치시려면 새 버전을 뜨세요. 원본은 그대로 남습니다."}
          </p>
          <button
            type="button"
            onClick={() => {
              if (item.state === "submitted") withdrawItem(item.id);
              else reviseApproved(item.id);
            }}
            className={`${a.btnGhost} mt-4`}
          >
            {item.state === "submitted" ? "제출 회수하고 고치기" : "새 버전으로 고치기"}
          </button>
        </div>
      )}

      <fieldset disabled={locked} className="mt-5 grid gap-5 disabled:opacity-60">
        {/* ── 유형 — 채점 방식이 갈리므로 먼저 정한다 ── */}
        <div>
          <span className={a.label}>문제 유형</span>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {itemTypes.map((t) => (
              <li key={t.id}>
                <label
                  className={`flex h-full cursor-pointer flex-col gap-1 rounded-lg border p-3.5 transition-colors ${
                    item.type === t.id
                      ? "border-brand-700 bg-brand-50"
                      : "border-exam-line bg-white hover:bg-exam-raised"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`type-${item.id}`}
                      checked={item.type === t.id}
                      onChange={() => set({ type: t.id as ItemType })}
                      className="h-5 w-5"
                    />
                    <span className="adm-t-md font-bold text-exam-text">{t.label}</span>
                  </span>
                  <span className="adm-t-sm text-exam-muted">{t.desc}</span>
                  <span className="mt-auto pt-1 adm-t-xs font-bold text-brand-700">
                    {t.scoring}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <label className="block">
            <span className={a.label}>문항 코드</span>
            <input
              value={item.code}
              onChange={(e) => set({ code: e.target.value })}
              placeholder="KOR-3-015"
              className={`mt-2 ${a.input}`}
            />
          </label>
          <label className="block">
            <span className={a.label}>과목</span>
            <select
              value={item.subject}
              onChange={(e) => set({ subject: e.target.value as ItemDraft["subject"] })}
              className={`mt-2 ${a.select}`}
            >
              {["국어", "수학", "과학"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={a.label}>학년</span>
            <select
              value={item.grade}
              onChange={(e) => set({ grade: e.target.value })}
              className={`mt-2 ${a.select}`}
            >
              {["초등 3학년", "초등 4학년", "초등 5학년", "초등 6학년"].map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={a.label}>S위계</span>
            <select
              value={item.level}
              onChange={(e) => set({ level: e.target.value as ItemDraft["level"] })}
              className={`mt-2 ${a.select}`}
            >
              <option value="S1">S1 지각</option>
              <option value="S2">S2 이해</option>
              <option value="S3">S3 생성</option>
              <option value="S4">S4 창의</option>
            </select>
          </label>
        </div>

        <label className="block">
          <span className={a.label}>
            지문·자료 <span className="font-normal text-exam-muted">(없으면 비워 둡니다)</span>
          </span>
          <textarea
            value={item.passage}
            onChange={(e) => set({ passage: e.target.value })}
            rows={3}
            className={`mt-2 ${a.input}`}
          />
        </label>

        <AssetBox item={item} disabled={locked} />

        <label className="block">
          <span className={a.label}>발문</span>
          <textarea
            value={item.stem}
            onChange={(e) => set({ stem: e.target.value })}
            rows={2}
            placeholder="무엇을 묻는지 한 문장으로 씁니다."
            className={`mt-2 ${a.input}`}
          />
        </label>

        {/* ── 유형별 답안 칸 ── */}
        {item.type === "choice" && (
          <div>
            <span className={a.label}>보기와 정답</span>
            <p className="mt-1 adm-t-sm text-exam-muted">
              왼쪽 동그라미가 정답입니다. 정답은 하나만 고를 수 있습니다.
            </p>
            <ul className="mt-2 space-y-2">
              {item.choices.map((c, idx) => (
                <li key={idx} className="flex items-center gap-3">
                  <label className="flex shrink-0 items-center gap-2">
                    <input
                      type="radio"
                      name={`answer-${item.id}`}
                      checked={item.answer === idx}
                      onChange={() => set({ answer: idx })}
                      className="h-5 w-5"
                    />
                    <span className="adm-t-sm font-bold text-exam-text">{idx + 1}</span>
                    <span className="sr-only">{idx + 1}번을 정답으로</span>
                  </label>
                  <input
                    value={c}
                    onChange={(e) =>
                      set({ choices: item.choices.map((x, j) => (j === idx ? e.target.value : x)) })
                    }
                    className={a.input}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}

        {item.type === "short" && (
          <label className="block">
            <span className={a.label}>허용 답안</span>
            <input
              value={item.shortAnswers}
              onChange={(e) => set({ shortAnswers: e.target.value })}
              placeholder="늘어난다, 커진다, 증가한다"
              className={`mt-2 ${a.input}`}
            />
            <span className="mt-2 block adm-t-sm leading-relaxed text-exam-muted">
              쉼표로 나눠 적습니다. 아이들은 같은 뜻을 여러 말로 쓰기 때문에, 맞는 표현을 미리
              넓게 열어 두어야 사람이 하나하나 확인하는 일이 줄어듭니다.
            </span>
          </label>
        )}

        {(item.type === "descriptive" || item.type === "essay") && (
          <label className="block">
            <span className={a.label}>채점 기준 (루브릭)</span>
            <textarea
              value={item.rubric}
              onChange={(e) => set({ rubric: e.target.value })}
              rows={5}
              placeholder={rubricPlaceholder}
              className={`mt-2 ${a.input}`}
            />
            <span className="mt-2 block adm-t-sm leading-relaxed text-exam-muted">
              단계마다 무엇이 있어야 그 단계인지 적습니다. 3학년 서술은 문법이 덜 갖춰진 것이
              보통이라, 맞춤법이 아니라 내용으로 가르는 기준이어야 합니다.
            </span>
          </label>
        )}

        <label className="block">
          <span className={a.label}>해설</span>
          <textarea
            value={item.explain}
            onChange={(e) => set({ explain: e.target.value })}
            rows={2}
            placeholder="왜 그 답이 맞는지 적습니다."
            className={`mt-2 ${a.input}`}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={a.label}>Tag A — 학력 내용축</span>
            <input
              value={item.tagA}
              onChange={(e) => set({ tagA: e.target.value })}
              placeholder="읽기 — 추론"
              className={`mt-2 ${a.input}`}
            />
          </label>
          <label className="block">
            <span className={a.label}>Tag B — 재능·인지과정축</span>
            <input
              value={item.tagB}
              onChange={(e) => set({ tagB: e.target.value })}
              placeholder="언어 — 범주화"
              className={`mt-2 ${a.input}`}
            />
          </label>
        </div>
        <p className="rounded-md bg-exam-panel px-4 py-3 adm-t-sm leading-relaxed text-exam-muted">
          두 축은 따로 붙입니다. 같은 문항이 학력에서는 「읽기 추론」이고 재능에서는 「언어
          범주화」일 수 있습니다. 검수 2차에서 이 태깅을 교차 검증합니다.
        </p>
      </fieldset>

      {!locked && (
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-exam-line pt-5">
          <button
            type="button"
            disabled={!ready}
            onClick={() => submitItem(item.id)}
            className={ready ? a.btnPrimary : a.btnDisabled}
          >
            검수에 제출하기
          </button>
          <span className={a.bodyText}>
            {ready
              ? "제출하면 검수자에게 넘어갑니다. 검수 전이라면 회수해서 고칠 수 있습니다."
              : `아직 비어 있습니다 — ${missing.join(" · ")}`}
          </span>
        </div>
      )}

      {/* ── 코멘트 ── */}
      <div className="mt-6 border-t border-exam-line pt-5">
        <h3 className={a.cardTitle}>검수 이력과 코멘트</h3>
        {item.comments.length === 0 ? (
          <p className={`${a.bodyText} mt-2`}>아직 오간 말이 없습니다.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {item.comments.map((c, i) => (
              <li
                key={i}
                className={`rounded-md px-4 py-3.5 ${
                  c.kind === "reject" ? "bg-rose-50" : "bg-exam-panel"
                }`}
              >
                <p className="adm-t-sm font-bold text-exam-text">
                  {c.by} · {c.at}
                  {c.kind === "reject" && c.code && (
                    <span className="ml-2 text-rose-700">반려 — {rejectLabel(c.code)}</span>
                  )}
                  {c.kind === "approve" && <span className="ml-2 text-emerald-700">승인</span>}
                  {c.kind === "note" && <span className="ml-2 text-exam-muted">코멘트</span>}
                </p>
                <p className="mt-1.5 adm-t-md leading-relaxed text-exam-muted">{c.text}</p>
              </li>
            ))}
          </ul>
        )}

        {/* 반려 사유에 답을 적을 자리 — 무엇을 고쳤는지 검수자가 바로 알 수 있게 */}
        <div className="mt-4">
          <label className="block">
            <span className={a.label}>코멘트 남기기</span>
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={2}
              placeholder="무엇을 어떻게 고쳤는지 적어 두면 검수가 빨라집니다."
              className={`mt-2 ${a.input}`}
            />
          </label>
          <button
            type="button"
            disabled={reply.trim().length < 2}
            onClick={() => {
              addComment(item.id, prefs.staffName, prefs.role, reply.trim());
              setReply("");
            }}
            className={`mt-3 ${reply.trim().length < 2 ? a.btnDisabled : a.btnGhost}`}
          >
            코멘트 남기기
          </button>
        </div>
      </div>
    </section>
  );
}

/**
 * 파일 붙이기 — 지문 이미지, 원본 시험지 PDF, 문항 목록 엑셀.
 *
 * 정의서 EXP-02-3이 「자료(그림·표)」를 편집 대상으로 두고 있고, 실제 출제는 종이
 * 시험지나 엑셀 목록에서 옮겨 오는 일이 많다. 파일을 붙여 두면 검수자가 원본과 대조할
 * 수 있다.
 */
function AssetBox({ item, disabled }: { item: ItemDraft; disabled: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const kindLabel = { image: "이미지", pdf: "PDF", sheet: "엑셀·CSV" } as const;

  const take = (files: FileList | null) => {
    if (!files) return;
    setError(null);
    Array.from(files).forEach((file) => {
      const kind = assetKindOf(file);
      if (!kind) {
        setError(`${file.name} — 이미지·PDF·엑셀(CSV)만 붙일 수 있습니다.`);
        return;
      }
      if (file.size > MAX_ASSET_BYTES) {
        setError(`${file.name} — 2MB를 넘습니다. 줄여서 올려 주세요.`);
        return;
      }
      const asset: ItemAsset = {
        id: `${Date.now().toString(36)}-${file.name}`,
        name: file.name,
        kind,
        size: file.size,
        at: new Date().toISOString().slice(0, 16).replace("T", " "),
      };
      // 이미지는 미리보기가 있어야 검수자가 파일을 열지 않고도 본다
      if (kind === "image") {
        const reader = new FileReader();
        reader.onload = () => attachAsset(item.id, { ...asset, dataUrl: String(reader.result) });
        reader.readAsDataURL(file);
      } else {
        attachAsset(item.id, asset);
      }
    });
  };

  return (
    <div>
      <span className={a.label}>
        붙임 파일{" "}
        <span className="font-normal text-exam-muted">(지문 그림 · 원본 시험지 · 문항 목록)</span>
      </span>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <label className={disabled ? a.btnDisabled : `${a.btnGhost} cursor-pointer`}>
          파일 고르기
          <input
            type="file"
            multiple
            disabled={disabled}
            accept="image/*,application/pdf,.xlsx,.xls,.csv"
            onChange={(e) => {
              take(e.target.files);
              e.target.value = "";
            }}
            className="sr-only"
          />
        </label>
        <span className={a.bodyText}>이미지 · PDF · 엑셀(CSV), 한 파일 2MB까지</span>
      </div>

      {error && (
        <p role="alert" className="mt-3 adm-t-sm font-bold text-rose-700">
          {error}
        </p>
      )}

      {item.assets.length > 0 && (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {item.assets.map((f) => (
            <li
              key={f.id}
              className="flex items-center gap-3 rounded-md border border-exam-line bg-white p-3"
            >
              {f.kind === "image" && f.dataUrl ? (
                // 사람이 올린 자료라 빌드 시점에 알 수 없다 — next/image 최적화 대상이 아니다
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={f.dataUrl}
                  alt={f.name}
                  className="h-14 w-14 shrink-0 rounded object-cover"
                />
              ) : (
                <span
                  aria-hidden
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-exam-raised adm-t-xs font-bold text-exam-muted"
                >
                  {kindLabel[f.kind]}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate adm-t-sm font-bold text-exam-text">{f.name}</span>
                <span className="block adm-t-xs text-exam-muted">
                  {kindLabel[f.kind]} · {Math.max(1, Math.round(f.size / 1024))}KB
                </span>
              </span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeAsset(item.id, f.id)}
                  className={a.btnRowGhost}
                >
                  떼기
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
