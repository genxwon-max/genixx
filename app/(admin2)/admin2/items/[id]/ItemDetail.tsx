"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { gradeBands, submitChecklist, type GradeBand } from "@/lib/blueprint";
import { itemTone } from "@/lib/admin2";
import { useAdminPrefs } from "@/lib/adminStore";
import { roundsOf, useForms } from "@/lib/formStore";
import {
  addComment,
  allDifficultiesPicked,
  allLevelsAllowed,
  allStandardsOk,
  blankQuestion,
  codePrefix,
  difficultyLabel,
  itemForms,
  missingFields,
  patchItem,
  rejectLabel,
  restoreItem,
  retireItem,
  reviseApproved,
  setAnchor,
  stateLabel,
  submitItem,
  summaryOf,
  typeTextOf,
  useItems,
  withdrawItem,
  type ItemDraft,
  type ItemForm,
  type Question,
} from "@/lib/itemStore";
import {
  LeaveDialog,
  PageSaveBar,
  useUnsavedGuard,
} from "@/components/admin2/EditGuard";
import {
  Body,
  DescList,
  FormRow,
  PageHead,
  Panel,
  SeedNote,
  Status,
  Tag,
} from "@/components/admin2/ui";
import ReviewPanel from "./ReviewPanel";
import {
  BodyEditor,
  QuestionBodyRows,
  QuestionList,
  QuestionTagRows,
} from "./QuestionEditor";

/**
 * ADM-04-1 문항 상세 — 등록 · 수정 · 검수를 한 장에서.
 *
 * 기존 콘솔은 이 셋을 세 화면으로 갈라 두었다(출제 워크벤치 · 문항 카드 · 검수
 * 워크벤치). 역할이 넷이라 서로의 화면을 안 보는 것이 옳았기 때문이다. 이 콘솔은
 * **슈퍼 관리자 한 사람**만 쓰므로 가릴 것이 없고, 오히려 「고쳐 놓고 바로 승인」이
 * 한 화면에서 끝나야 한다.
 *
 * ── 차례 ──
 *   ① 문항 구성  단일인가 세트인가
 *   ② 분류      단일일 때만. 어디에 붙고 얼마나 어려운 문항인가
 *   ③ 문항      무슨 자료를 읽히고 무엇을 묻나 (세트는 목록 → 문항 상세)
 *   ④ 제출 준비  검수자에게 미리 할 말 · 내보내기 전에 짚을 것
 * 그 아래는 되짚어 보는 것 — 상태 · 검수 · 이력 · 메모.
 *
 * 문항 구성이 맨 앞인 것은 그 하나가 **아래를 통째로 바꾸기** 때문이다. 세트면 함께
 * 읽을 보기가 있어야 하고, 문항이 하나가 아니라 목록이 되고, 문항마다 따로 들어가 볼
 * 것이 생긴다. 다 채워 놓고 뒤늦게 세트로 돌리면 지금까지 적은 것이 어느 문항의
 * 것인지부터 다시 정해야 한다.
 *
 * ── 분류는 세트 바깥에 세우지 않는다 ──
 * 분류는 묶음이 아니라 **문항**에 붙는다(lib/itemStore.ts의 Question). 단일이면 문항이
 * 하나뿐이라 바깥에 세워도 뜻이 통하지만, 세트에서는 성취기준도 단계도 난이도도
 * 문항마다 다르다 — 바깥에 한 벌 세워 두면 어느 문항의 것인지 말할 수 없는 값이 된다.
 * 그래서 세트에서는 이 판을 아예 세우지 않고, 문항 하나로 들어간 화면에 세운다. 거기서
 * 과목·학년군·단원·문항 ID(세트가 함께 쓰는 것)와 성취기준·재능 축·단계·난이도(그
 * 문항만의 것)가 한 판에 서고, 어느 쪽이 함께 걸리는 값인지 맨 위에 적어 둔다.
 *
 * ── 이름표는 왼쪽, 예외 없이 ──
 * 칸 위에 이름을 얹으면 한 줄이 두 줄을 먹어서, 분류만으로 화면 한 장이 넘어갔다.
 * 옆으로 돌리면 훑을 때 눈이 왼쪽 한 줄만 타고 내려가면 되고, 무엇을 안 채웠는지도
 * 한눈에 보인다(components/admin2/ui.tsx의 FormRow · admin2.css의 a2-form-lg).
 *
 * 그래서 판이 줄었다. 난이도·문항 구성·지문은 각각 판 하나에 칸 하나뿐이었는데, 이름표를
 * 왼쪽으로 돌리자 판 제목과 이름표가 같은 말을 두 번 하게 됐다. 난이도는 분류 줄에,
 * 지문은 문항 판의 첫 줄로 들어갔고, 유의사항과 체크리스트는 「제출 준비」 한 판으로
 * 합쳤다. 맨 위 문항 구성은 판 제목 없이 줄 하나만 세운다.
 *
 * ── 세트는 목록 ──
 * 세트 안의 문항을 죄다 펼쳐 놓으면 셋만 되어도 화면이 스무 칸을 넘어가 지금 몇 번을
 * 고치는지 알 수 없다. 문항 은행이 「목록에서 골라 상세로 들어간다」로 푸는 것과 같은
 * 문제라 같은 방식으로 푼다. 들어간 화면도 이 컴포넌트가 그리므로 초안(draft)이 그대로
 * 남는다 — 주소를 나누면 들어가는 순간 안 저장한 것이 날아간다.
 *
 * 고칠 수 있는 때를 상태가 정한다 — 작성 중 · 반려됨만 열린다. 검수 대기와 승인됨은
 * 잠근다. 제출한 뒤에 내용이 바뀌면 검수자가 본 것과 승인된 것이 달라지고, 승인 뒤에
 * 바뀌면 그 문항으로 이미 판정한 아이의 결과를 설명할 수 없다.
 *
 * 저장은 **저장을 누를 때만** 한다. 잊는 것은 나가는 길목에서 막는다
 * (components/admin2/EditGuard.tsx).
 *
 * ⚠ 검수로 제출하는 것은 **저장된 문항**을 보낸다. 그래서 손댄 채로는 제출할 수 없게
 *   막는다 — 화면에 보이는 것과 검수자가 받는 것이 다르면 그 검수는 무의미하다.
 */

/** 한 세트에 담을 수 있는 문항 수 — 넘으면 아이가 한 자리에서 다 못 푼다 */
const SET_MAX = 8;

export default function ItemDetail({ id }: { id: string }) {
  const items = useItems();
  const forms = useForms();
  const prefs = useAdminPrefs();
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [memo, setMemo] = useState("");
  /** 고치는 중인 값. null이면 손대지 않았다는 뜻이다 */
  const [draft, setDraft] = useState<Partial<ItemDraft> | null>(null);
  /** 세트에서 들어가 있는 문항. null이면 목록을 보고 있다 */
  const [openQ, setOpenQ] = useState<string | null>(null);

  const item = items.find((i) => i.id === id);
  /** 화면이 그리는 값 — 저장된 문항 위에 고치는 중인 값을 덮는다 */
  const view = item && draft ? { ...item, ...draft } : item;

  const dirty = draft !== null;
  const cancel = () => setDraft(null);
  /* 파생값(거울·요약·표시용 태그)은 저장소가 만든다(lib/itemStore.ts의 derive).
     한동안 여기서 syncTags를 불렀는데, 초안에는 questions만 들어 있고 납작한 분류 칸은
     저장된 옛 값이라, 방금 고친 성취기준이 아니라 고치기 전 값으로 태그가 만들어졌다 —
     태그가 언제나 저장 한 번을 뒤따라왔다. */
  const save = () => {
    if (!item || !draft) return;
    patchItem(item.id, draft);
    setDraft(null);
  };
  const guard = useUnsavedGuard(dirty, save);

  if (!item || !view) {
    return (
      <>
        <PageHead
          title="문항을 찾지 못했습니다"
          back={
            <Link href="/admin2/items" className="a2-btn">
              ← 이전으로
            </Link>
          }
        />
        <Body>
          <Panel title="없는 문항">
            <p className="a2-t-sm text-(--a2-ink-2)">
              <span className="a2-mono">{id}</span> 문항이 이 브라우저의
              저장소에 없습니다. 다른 기기에서 만든 문항이거나 주소가
              잘못되었습니다.
            </p>
          </Panel>
        </Body>
      </>
    );
  }

  const editable = view.state === "draft" || view.state === "rejected";
  const locked = !editable;
  const by = prefs.staffName || "운영자";
  /** 화면에 적는 「남은 것」은 지금 보이는 값 기준. 제출 문턱은 저장된 값 기준이다 */
  const missing = missingFields(view);
  const ready = missingFields(item).length === 0;
  const shipped = roundsOf(view.id, forms);

  /** 고친 값을 초안에 담아 둔다. 저장소로 나가는 것은 save()뿐이다 */
  const set = (patch: Partial<ItemDraft>) => {
    if (!editable) return;
    setDraft((d) => ({ ...(d ?? {}), ...patch }));
  };

  const qs = view.questions;
  /* 요약(단계·b·배점)은 저장할 때 만들어지므로, 고치는 중인 화면은 그 자리에서 다시
     구해야 한다. 안 그러면 문항을 더하거나 단계를 올린 것이 저장 전까지 안 보인다 */
  const sum = summaryOf(qs);
  /* 코드는 저장할 때 다시 매겨진다. 지금 고친 값으로 앞부분이 달라지면 미리 알려 준다 —
     저장하고 나서야 번호가 바뀐 것을 알면 어느 문항이 어느 것인지 헷갈린다 */
  const nextPrefix = codePrefix(view);
  const willRecode = !view.code.startsWith(`${nextPrefix}-`);
  const setQuestions = (next: Question[]) => set({ questions: next });
  const setQuestion = (k: number, next: Question) =>
    setQuestions(qs.map((x, n) => (n === k ? next : x)));
  /** 세트를 단일로 되돌리면 저장할 때 2번 이후가 떨어진다. 미리 알려 준다 */
  const dropping = view.form === "single" ? qs.length - 1 : 0;

  const saveBar = editable ? (
    <PageSaveBar dirty={dirty} onSave={save} onCancel={cancel} />
  ) : null;

  /* 세트가 통째로 함께 쓰는 칸. 단일이면 문항 상세의 분류 판에, 세트면 문항 하나로
     들어간 화면의 분류 판에 선다 — 어느 쪽이든 「이 문항이 어디에 붙나」의 앞머리다.
     세트 바깥 화면에는 세우지 않는다. 거기서는 어느 문항의 분류인지 말할 수가 없다. */
  const sharedTagRows = (
    <>
      <FormRow label="과목" req>
        <select
          className="a2-select a2-input-lg"
          value={view.subject}
          disabled={locked}
          onChange={(e) =>
            set({ subject: e.target.value as ItemDraft["subject"] })
          }
        >
          {["국어", "수학", "과학"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </FormRow>

      <FormRow label="학년군" req>
        <select
          className="a2-select a2-input-lg"
          value={view.band}
          disabled={locked}
          onChange={(e) => {
            const band = e.target.value as GradeBand;
            set({
              band,
              grade: band === "3-4" ? "초등 3~4학년군" : "초등 5~6학년군",
            });
          }}
        >
          {gradeBands.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </select>
      </FormRow>

      <FormRow label="단원" req>
        <input
          className="a2-input a2-input-lg"
          value={view.unit}
          disabled={locked}
          onChange={(e) => set({ unit: e.target.value })}
          placeholder="낱말의 의미 관계"
        />
      </FormRow>

      <FormRow label="단원 번호">
        <input
          className="a2-input a2-input-lg a2-mono"
          value={view.unitNo}
          disabled={locked}
          onChange={(e) => set({ unitNo: e.target.value })}
          placeholder="02"
        />
      </FormRow>

      {/* 손으로 적는 칸이 아니다. 코드에 담기는 것이 전부 이 화면의 다른 칸에
                    이미 있어서, 적게 하면 그 둘이 어긋나기만 한다(lib/itemStore.ts 문항 ID) */}
      <FormRow
        label="문항 ID"
        hint={
          willRecode ? (
            <>
              저장하면 <b className="a2-mono text-(--a2-ink)">{nextPrefix}</b>로
              시작하는 번호로 다시 매겨집니다.
            </>
          ) : (
            "연월일 · 학년 · 과목 · 문항 유형 · 단계 · 일련번호 — 자동으로 매깁니다."
          )
        }
      >
        <span className="a2-mono a2-t-md font-bold text-(--a2-ink)">
          {view.code || "저장하면 매겨집니다"}
        </span>
      </FormRow>
    </>
  );

  /* ── 세트에서 문항 하나로 들어간 화면 ──
     목록으로 돌아가는 것은 주소가 아니라 이 상태 하나다. 초안이 그대로 남아야 하므로
     라우터를 태우지 않는다 — 태우면 들어가는 순간 안 저장한 것을 물어봐야 한다 */
  const openIndex = openQ ? qs.findIndex((q) => q.id === openQ) : -1;
  if (view.form === "set" && openIndex >= 0) {
    return (
      <>
        <PageHead
          title={`문항 ${openIndex + 1}`}
          back={
            <button
              type="button"
              className="a2-btn"
              onClick={() => setOpenQ(null)}
            >
              ← 문항 목록
            </button>
          }
          actions={
            <span className="a2-t-xs text-(--a2-ink-4)">
              <span className="a2-mono">{view.code || "문항 ID 미정"}</span> ·
              세트 {qs.length}문
            </span>
          }
        />
        <Body>
          <div className="grid gap-4">
            <Panel title="분류" flush>
              <p className="a2-note m-4 mb-0">
                <span>
                  과목 · 학년군 · 단원 · 문항 ID는 <b>세트 전체</b>가 함께
                  씁니다. 여기서 고치면 같은 세트의 다른 문항에도 그대로
                  걸립니다. 그 아래는 이 문항만의 값입니다.
                </span>
              </p>
              <div className="a2-form a2-form-lg mt-4">
                {sharedTagRows}
                <QuestionTagRows
                  key={`tags-${qs[openIndex].id}`}
                  q={qs[openIndex]}
                  band={view.band}
                  disabled={locked}
                  onChange={(next: Question) => setQuestion(openIndex, next)}
                />
              </div>
            </Panel>

            <Panel title="문항" flush>
              <div className="a2-form a2-form-lg">
                <QuestionBodyRows
                  key={`body-${qs[openIndex].id}`}
                  q={qs[openIndex]}
                  disabled={locked}
                  onChange={(next: Question) => setQuestion(openIndex, next)}
                />
              </div>
            </Panel>
          </div>
          {saveBar}
        </Body>
        <LeaveDialog guard={guard} />
      </>
    );
  }

  return (
    <>
      <PageHead
        title={view.code || "문항 ID 미정"}
        back={
          <Link href="/admin2/items" className="a2-btn">
            ← 이전으로
          </Link>
        }
        actions={
          <>
            <span className="mr-1 flex items-center gap-1.5">
              <span className="a2-t-xs text-(--a2-ink-4)">상태</span>
              <Status tone={itemTone[view.state]}>
                {stateLabel[view.state]}
              </Status>
            </span>
            {editable && (
              <button
                type="button"
                className="a2-btn"
                disabled={!ready || dirty}
                title={
                  dirty
                    ? "먼저 저장해 주세요 — 검수자는 저장된 문항을 받습니다"
                    : ready
                      ? undefined
                      : `${missingFields(item).join(" · ")}이(가) 남았습니다`
                }
                onClick={() => submitItem(view.id)}
              >
                검수로 제출
              </button>
            )}
            {view.state === "submitted" && (
              <button
                type="button"
                className="a2-btn"
                onClick={() => withdrawItem(view.id)}
              >
                제출 회수
              </button>
            )}
            {view.state === "approved" && (
              <button
                type="button"
                className="a2-btn"
                onClick={() => {
                  const next = reviseApproved(view.id);
                  if (next) router.push(`/admin2/items/${next.id}`);
                }}
              >
                새 판으로 고치기
              </button>
            )}
          </>
        }
      />

      <Body>
        <div className="grid gap-4">
          {/* 잠긴 까닭을 맨 위에 적는다. 아래 칸이 전부 회색인데 왜인지가 없으면
              고치는 길이 없는 문항으로 읽힌다 */}
          {locked && (
            <p className="a2-note">
              <span>
                {view.state === "submitted"
                  ? "검수 대기 중인 문항은 잠깁니다. 고치려면 위에서 제출을 회수하세요."
                  : view.state === "retired"
                    ? "사용 중지된 문항입니다. 아래 「승인 뒤 관리」에서 다시 쓰기를 누르면 풀립니다."
                    : "승인된 문항은 잠깁니다. 고치려면 위에서 새 판을 뜨세요 — 원본은 그대로 둡니다."}
              </span>
            </p>
          )}

          {/* ── ① 무엇부터 정하나 ──
              단일이냐 세트냐를 맨 위에 세운다. 이 하나가 아래를 전부 바꾸기 때문이다 —
              세트면 함께 읽을 보기가 있어야 하고, 문항이 하나가 아니라 목록이 되고,
              문항마다 따로 들어가 볼 것이 생긴다. 분류부터 채워 놓고 뒤늦게 세트로 돌리면
              지금까지 채운 것이 어느 문항의 것인지부터 다시 정해야 한다.

              판 제목을 달지 않았다. 줄 이름표가 이미 「문항 구성」이라, 제목을 달면
              같은 말이 위아래로 두 번 선다 */}
          <Panel flush>
            <div className="a2-form a2-form-lg">
              <FormRow label="문항 구성" req>
                <div className="flex min-h-10 flex-wrap items-center gap-x-5 gap-y-1">
                  {itemForms.map((f) => (
                    <label key={f.id} className="a2-choice">
                      <input
                        type="radio"
                        name="item-form"
                        checked={view.form === f.id}
                        disabled={locked}
                        onChange={() => {
                          /* 세트로 넘어가는데 문항이 하나뿐이면 빈 문항을 하나 붙여 둔다 —
                             「두 개 이상」이 세트의 성립 조건이라, 빈 채로 두면 저장하자마자
                             모자란 것 목록에 걸린다 */
                          const form = f.id as ItemForm;
                          set({
                            form,
                            questions:
                              form === "set" && qs.length < 2
                                ? [...qs, blankQuestion(qs)]
                                : qs,
                          });
                        }}
                      />
                      {f.label}
                    </label>
                  ))}
                </div>
                {dropping > 0 && (
                  <p
                    className="a2-note w-full"
                    style={{ borderLeftColor: "var(--a2-warn)" }}
                  >
                    <span>
                      단일로 두면 저장할 때 2번 이후 문항 <b>{dropping}개</b>가
                      사라집니다. 되돌리려면 세트를 다시 고르거나 취소를
                      누르세요.
                    </span>
                  </p>
                )}
              </FormRow>
            </div>
          </Panel>

          {/* ── ② 어디에 붙나 ──
              단일일 때만 선다. 세트에서는 분류가 문항마다 다르므로(성취기준도 단계도
              난이도도) 바깥에 한 벌 세워 두면 어느 문항의 것인지 말할 수 없는 값이 된다.
              세트의 분류는 문항 하나로 들어간 화면에 있다 */}
          {view.form === "single" && (
            <Panel title="분류" flush>
              <div className="a2-form a2-form-lg">
                {sharedTagRows}
                <QuestionTagRows
                  q={qs[0]}
                  band={view.band}
                  disabled={locked}
                  onChange={(next: Question) => setQuestion(0, next)}
                />
              </div>
            </Panel>
          )}

          {/* ── ③ 무엇을 읽히고 무엇을 묻나 ──
              단일이면 지문 → 유형 → 발문 → 보기 → 해설이 한 줄기로 이어진다. 세트면
              지문이 곧 「문항들이 함께 읽는 것」이라 목록 바로 위가 제자리다 */}
          <Panel
            title="문항"
            meta={view.form === "set" ? `${qs.length}문항` : undefined}
            flush
          >
            <div className="a2-form a2-form-lg">
              <FormRow
                label={view.form === "set" ? "보기 · 지문" : "지문 · 자료"}
                req={view.form === "set"}
              >
                <BodyEditor
                  name="passage-mode"
                  value={{
                    mode: view.passageMode,
                    body: view.passage,
                    images: view.passageImages,
                  }}
                  disabled={locked}
                  rows={8}
                  onChange={(patch) =>
                    set({
                      passageMode: patch.mode ?? view.passageMode,
                      passage: patch.body ?? view.passage,
                      passageImages: patch.images ?? view.passageImages,
                    })
                  }
                />
              </FormRow>
              {view.form === "single" && (
                <QuestionBodyRows
                  key={qs[0].id}
                  q={qs[0]}
                  disabled={locked}
                  onChange={(next: Question) => setQuestion(0, next)}
                />
              )}
            </div>
            {view.form === "set" && (
              <>
                <QuestionList
                  questions={qs}
                  disabled={locked}
                  max={SET_MAX}
                  onOpen={setOpenQ}
                  onMove={(k, dir) => {
                    const next = [...qs];
                    [next[k + dir], next[k]] = [next[k], next[k + dir]];
                    setQuestions(next);
                  }}
                  onRemove={(k) => setQuestions(qs.filter((_, n) => n !== k))}
                  onAdd={() => {
                    /* 더하고 바로 들어간다. 목록에 빈 줄만 하나 늘려 놓으면 그다음에 할 일이
                       「수정하기를 누른다」 하나뿐이라, 그 한 번을 여기서 대신 누른다 */
                    const made = blankQuestion(qs);
                    setQuestions([...qs, made]);
                    setOpenQ(made.id);
                  }}
                />
                {qs.length < 2 && (
                  <p
                    className="a2-note m-4 mt-0"
                    style={{ borderLeftColor: "var(--a2-warn)" }}
                  >
                    <span>세트는 문항이 두 개 이상이어야 합니다.</span>
                  </p>
                )}
              </>
            )}
          </Panel>

          {/* ── ④ 내보내기 전에 ── */}
          <Panel title="제출 준비" flush>
            <div className="a2-form a2-form-lg">
              <FormRow label="출제자 유의사항" req>
                <textarea
                  className="a2-textarea a2-textarea-lg"
                  rows={4}
                  value={view.guidance}
                  disabled={locked}
                  onChange={(e) => set({ guidance: e.target.value })}
                  placeholder="바꾸어 써도 뜻이 통하는지만 봅니다. 쓰임의 차이를 묻기 시작하면 S2로 이탈합니다."
                />
              </FormRow>

              <FormRow label="제출 전 체크리스트" req>
                <ul className="grid w-full gap-1.5">
                  {submitChecklist.map((c) => {
                    /* 자동으로 보는 둘은 사람이 켜고 끄지 못한다. 켤 수 있게 두면 코드가
                       틀린 채로 체크만 켜고 제출하는 길이 열린다 */
                    /* 세트면 문항 하나만 맞아도 통과가 되면 안 된다 — 전부를 본다 */
                    const auto =
                      c.id === "code"
                        ? allStandardsOk(view)
                        : c.id === "tagb"
                          ? allLevelsAllowed(view)
                          : null;
                    const on = c.auto ? !!auto : view.checks.includes(c.id);
                    return (
                      <li key={c.id}>
                        <label className="flex items-start gap-2.5 py-0.5">
                          <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={on}
                            readOnly={c.auto}
                            disabled={c.auto || locked}
                            onChange={() => {
                              if (c.auto) return;
                              set({
                                checks: view.checks.includes(c.id)
                                  ? view.checks.filter((x) => x !== c.id)
                                  : [...view.checks, c.id],
                              });
                            }}
                          />
                          <span className="a2-t-sm text-(--a2-ink-2)">
                            {c.text}
                            {c.auto && (
                              <span className="ml-1.5 a2-t-xs text-(--a2-ink-4)">
                                자동 확인 · {on ? "통과" : "아직"}
                              </span>
                            )}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
                {editable && missing.length > 0 && (
                  <p
                    className="a2-note w-full"
                    style={{ borderLeftColor: "var(--a2-warn)" }}
                  >
                    <span>제출까지 남은 것 — {missing.join(" · ")}</span>
                  </p>
                )}
              </FormRow>
            </div>
          </Panel>

          {/* ── 되짚어 보기 ── */}
          <Panel
            title="상태"
            meta={view.origin === "ai" ? "AI가 낸 초안" : "사람이 쓴 문항"}
          >
            <DescList
              rows={[
                {
                  k: "상태",
                  v: (
                    <Status tone={itemTone[view.state]}>
                      {stateLabel[view.state]}
                    </Status>
                  ),
                },
                { k: "출제자", v: `${view.authorName} (${view.author})` },
                { k: "구성", v: typeTextOf(view) },
                {
                  /* 세트의 b는 문항들의 평균이라 넷 중 하나로 떨어지지 않는다.
                     거기에 이름표를 붙이면 전부 「아직 고르지 않음」으로 뜬다 */
                  k: "배점 · 난이도",
                  v:
                    qs.length === 1
                      ? `${sum.points}점 · ${difficultyLabel(sum.b)} (b ${sum.b})`
                      : allDifficultiesPicked(view)
                        ? `${sum.points}점 · 평균 b ${sum.b}`
                        : `${sum.points}점 · 난이도를 아직 다 고르지 않았습니다`,
                },
                {
                  k: "Tag B 좌표",
                  v: <span className="a2-t-sm">{view.tagB || "—"}</span>,
                },
                {
                  k: "앵커",
                  v: view.anchor ? (
                    <Tag accent>앵커</Tag>
                  ) : (
                    <span className="text-(--a2-ink-4)">아님</span>
                  ),
                },
                {
                  k: "정답률",
                  v:
                    view.correctRate == null ? (
                      <span className="text-(--a2-ink-4)">미출제</span>
                    ) : (
                      <span className="a2-num">{view.correctRate}%</span>
                    ),
                },
                {
                  k: "나간 회차",
                  v: shipped.length ? (
                    shipped.join(" · ")
                  ) : (
                    <span className="text-(--a2-ink-4)">없음</span>
                  ),
                },
              ]}
            />
            {view.state === "rejected" && (
              <p
                className="a2-note mt-3"
                style={{ borderLeftColor: "var(--a2-danger)" }}
              >
                <span>
                  반려된 문항입니다. 아래 검수 소견대로 고친 뒤 다시 제출하면
                  검수 목록으로 돌아갑니다.
                </span>
              </p>
            )}
          </Panel>

          {/* key를 붙여 문항이 바뀌면 검수판을 새로 세운다. 붙이지 않으면 앞 문항에서
              짚어 둔 3단 체크가 다음 문항에 그대로 남아 다른 문항을 승인하게 된다. */}
          {view.state === "submitted" && (
            <ReviewPanel key={view.id} item={item} />
          )}

          {(view.state === "approved" || view.state === "retired") && (
            <Panel title="승인 뒤 관리" flush>
              <div className="a2-form a2-form-lg">
                <FormRow label="까닭" req>
                  <textarea
                    className="a2-textarea a2-textarea-lg"
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="예: 26A 회차 정답률 96% — 변별이 되지 않아 회차에서 뺍니다"
                  />
                  <span className="flex w-full flex-wrap gap-2">
                    {view.state === "approved" && (
                      <>
                        <button
                          type="button"
                          className="a2-btn"
                          disabled={
                            reason.trim().length < 5 || !!view.disclosed
                          }
                          title={
                            view.disclosed
                              ? "밖에 공개된 적이 있는 문항은 앵커가 될 수 없습니다"
                              : undefined
                          }
                          onClick={() => {
                            setAnchor(
                              view.id,
                              !view.anchor,
                              by,
                              prefs.role,
                              reason.trim(),
                            );
                            setReason("");
                          }}
                        >
                          {view.anchor ? "앵커 해제" : "앵커로 지정"}
                        </button>
                        <button
                          type="button"
                          className="a2-btn a2-btn-danger"
                          disabled={reason.trim().length < 5}
                          onClick={() => {
                            retireItem(view.id, by, prefs.role, reason.trim());
                            setReason("");
                          }}
                        >
                          사용 중지
                        </button>
                      </>
                    )}
                    {view.state === "retired" && (
                      <button
                        type="button"
                        className="a2-btn"
                        disabled={reason.trim().length < 5}
                        onClick={() => {
                          restoreItem(view.id, by, prefs.role, reason.trim());
                          setReason("");
                        }}
                      >
                        다시 쓰기
                      </button>
                    )}
                  </span>
                  {view.retireReason && (
                    <p className="a2-note w-full">
                      <span>
                        {view.retiredAt} · {view.retiredBy} —{" "}
                        {view.retireReason}
                      </span>
                    </p>
                  )}
                </FormRow>
              </div>
            </Panel>
          )}

          <Panel title="검수 이력" meta={`${view.reviews.length}회`} flush>
            {view.reviews.length === 0 ? (
              <p className="p-4 a2-t-sm text-(--a2-ink-4)">
                아직 검수를 거치지 않았습니다.
              </p>
            ) : (
              <ul className="divide-y divide-(--a2-line)">
                {[...view.reviews].reverse().map((r) => (
                  <li key={`${r.at}-${r.round}`} className="p-4">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Status tone={r.verdict === "approve" ? "ok" : "danger"}>
                        {r.verdict === "approve"
                          ? "승인"
                          : `반려 · ${r.code ? rejectLabel(r.code) : "사유 없음"}`}
                      </Status>
                      <span className="a2-t-sm text-(--a2-ink-2)">
                        {r.round}차 · {r.by}
                      </span>
                      <span className="a2-mono a2-t-xs text-(--a2-ink-4)">
                        {r.at}
                      </span>
                      {r.machine && <Tag>기계</Tag>}
                      {r.self && (
                        <span
                          className="a2-t-xs font-bold"
                          style={{ color: "var(--a2-danger)" }}
                        >
                          자가 검수
                        </span>
                      )}
                    </div>
                    <ul className="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-0.5">
                      {r.checks.map((c) => (
                        <li
                          key={c.id}
                          className="a2-t-xs"
                          style={{
                            color: c.ok ? "var(--a2-ok)" : "var(--a2-danger)",
                          }}
                        >
                          {c.id === "content"
                            ? "내용"
                            : c.id === "tagging"
                              ? "태깅"
                              : "윤리"}{" "}
                          {c.ok === null ? "—" : c.ok ? "통과" : "걸림"}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1.5 whitespace-pre-line a2-t-sm text-(--a2-ink-2)">
                      {r.text}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="메모" flush>
            <div className="a2-form a2-form-lg">
              <FormRow label="메모">
                <textarea
                  className="a2-textarea a2-textarea-lg"
                  rows={3}
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="반려까지는 아니지만 짚어 둘 것"
                />
                <span className="flex w-full justify-end">
                  <button
                    type="button"
                    className="a2-btn"
                    disabled={memo.trim().length < 2}
                    onClick={() => {
                      addComment(view.id, by, prefs.role, memo.trim());
                      setMemo("");
                    }}
                  >
                    메모 남기기
                  </button>
                </span>
              </FormRow>
            </div>
            {view.comments.length > 0 && (
              <ul className="divide-y divide-(--a2-line)">
                {[...view.comments].reverse().map((c, k) => (
                  <li key={`${c.at}-${k}`} className="p-4">
                    <p className="a2-t-xs text-(--a2-ink-4)">
                      <span className="a2-mono">{c.at}</span> · {c.by} ·{" "}
                      {c.kind === "reject"
                        ? "반려"
                        : c.kind === "approve"
                          ? "승인"
                          : "메모"}
                    </p>
                    <p className="whitespace-pre-line a2-t-sm text-(--a2-ink-2)">
                      {c.text}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {/* 저장은 오른쪽 아래에 붙여 둔다 — 회원·학생·기관 상세와 같은 자리다.
            판이 열 개를 넘어서 판마다 저장 줄을 두면 그 판만 저장하는 것으로 읽힌다 */}
        {saveBar}
      </Body>

      <LeaveDialog guard={guard} />
      <SeedNote>
        문항은 이 브라우저에만 저장됩니다(lib/itemStore.ts). 붙일 때는 문항
        API로 갈아 끼웁니다. 발문·지문에 넣은 그림은 파일 서버가 붙기 전까지
        문항 안에 통째로 들어갑니다.
      </SeedNote>
    </>
  );
}
