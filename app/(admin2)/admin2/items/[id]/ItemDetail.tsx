"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { allGradeBands, checkStandardCode, levelAllowed, type Level } from "@/lib/blueprint";
import { itemTone } from "@/lib/admin2";
import { useAdminPrefs } from "@/lib/adminStore";
import {
  SET_MAX,
  blankQuestion,
  contentFor,
  itemForms,
  levelCountsOf,
  levelInsertAt,
  missingSubmit,
  patchItem,
  questionHasContent,
  rejectLabel,
  restoreItem,
  retireItem,
  reviseApproved,
  setAnchor,
  setLevelCount,
  stateLabel,
  submitItem,
  useItems,
  withdrawItem,
  type ItemComment,
  type ItemDraft,
  type ItemForm,
  type Question,
} from "@/lib/itemStore";
import { LeaveDialog, PageSaveBar, useUnsavedGuard } from "@/components/admin2/EditGuard";
import {
  Body,
  FormRow,
  PageHead,
  Panel,
  Status,
  Switch,
  Tag,
} from "@/components/admin2/ui";
import GroupEditor from "@/components/admin2/GroupEditor";
import {
  blankMarks,
  patchQuestion,
  questionsIn,
  type ContentQuestion,
  type ContentSet,
} from "@/lib/content";
import GrowTextarea from "@/components/admin2/GrowTextarea";
import ItemPreview from "@/components/admin2/ItemPreview";
import DocEditor from "@/components/admin2/DocEditor";
import DocBox from "@/components/admin2/DocBox";
import { BlockList } from "@/components/exam/ExamSession";
import { blocksToHtml, htmlToBlocks, splitLeadHtml, textToHtml } from "@/lib/docBlocks";
import BandUnitRows from "./BandUnitRows";
import LevelCounts from "./LevelCounts";
import ReviewPanel from "./ReviewPanel";
import SubmitChecklist from "./SubmitChecklist";
import { QuestionClassRows, QuestionContentRows, QuestionList } from "./QuestionEditor";

/** 지문 칸에 문단을 이을 때의 틈 — 빈 줄 하나 */
const PARAGRAPH_GAP = String.fromCharCode(10, 10);

/**
 * ADM-04-1 문항 상세 — 등록 · 수정 · 검수를 한 장에서.
 *
 * 기존 콘솔은 이 셋을 세 화면으로 갈라 두었다(출제 워크벤치 · 문항 카드 · 검수
 * 워크벤치). 역할이 넷이라 서로의 화면을 안 보는 것이 옳았기 때문이다. 이 콘솔은
 * 쓰는 화면과 검수하는 화면을 가르지 않는다 — 「고쳐 놓고 바로 승인」이 한 화면에서
 * 끝나야 한다.
 *
 * ── 차례는 문항 카드의 차례 ──
 * 맨 위에 검수 이력 — 무엇이 걸렸나. 기록이 없으면 서지 않는다.
 *   ① 문항 구성  단일인가 세트인가
 *   ② 분류      단일일 때만. 문항 ID · 학년 · 교과 단원 · 인지단계 · Tag A · Tag B ·
 *               형식 · 난이도|배점
 *   ③ 문항      지문 · 문항 · 정답·채점 기준 · 인정 예 · 재능 평가 관점 ·
 *               오답 설계 의도 (세트는 지문 아래 목록 → 문항 상세)
 *   ④ 제출 전 자가 체크리스트  열네 줄 · 제출 확인 · 출제자 유의|검토 요청
 * 그 아래는 검수 대기일 때 검수판, 승인 뒤에는 앵커 판.
 * 사용 · 사용 중지는 판이 아니라 머리의 스위치가 맡는다.
 *
 * 한동안 분류를 문항 앞뒤로 갈라(쓰기 전에 정할 다섯 / 쓰고 나서 붙일 세부 분류) 세웠다.
 * 문항을 쓰는 출제위원이 종이 문항 카드를 옆에 펴 놓고 옮겨 적는데 화면 차례가 카드와
 * 달라서, 칸을 찾아 화면을 오르내렸다. 카드의 차례로 되돌린다. 「세부 분류」 판은 없어지고
 * 그 줄은 분류 판으로 올라갔다. 단원 번호 줄은 걷었다 — 교과 단원을 목록에서 고르면 따라온다.
 *
 * ── 체크리스트와 출제자 유의사항을 되돌렸다 ──
 * 한때 이 콘솔은 쓰는 사람이 곧 검수하는 사람이라고 보고 두 판을 걷었다. 그런데 문항을 쓰는
 * 것은 전문가단의 출제위원이고 검수는 따로 한다 — 출제위원이 무엇을 짚고 이름을 걸었는지가
 * 검수자에게 건너가야 한다. 그래서 판을 되돌리고 제출 문턱에도 넣었다(lib/itemStore.ts
 * missingSubmit). 문턱에서 뺀 판을 돌려놓지 않은 채 문턱만 두면 제출 단추가 영영 안 켜지고,
 * 판만 두고 문턱에서 빼면 짚지 않고도 낸다 — 둘은 늘 같이 간다.
 *
 * 상태 판과 메모 쓰는 칸은 걷은 그대로다. 상태는 머리에 이미 서 있고, 반려됐다는 한 줄만 맨
 * 위로 옮겼다. 메모에 쌓인 기록(반려 사유 · 앵커 지정과 다시 쓰기의 까닭)은 검수 이력에 함께
 * 편다. 기록까지 걷으면 반려 사유가 이 콘솔 어디에도 보이지 않는 문항이 생긴다.
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
 * 단일과 같은 차례로 선다 — 분류 → 문항. 분류 판에는 세트가 함께 쓰는 것(문항 ID ·
 * 학년 · 교과 단원)이 먼저 서고 그 문항만의 것이 뒤따르며, 어느 쪽이 함께 걸리는 값인지
 * 판 맨 위에 적어 둔다. 지문과 체크리스트는 세트가 통째로 쥐므로 바깥 화면에 선다.
 *
 * ── 이름표는 왼쪽, 예외 없이 ──
 * 칸 위에 이름을 얹으면 한 줄이 두 줄을 먹어서, 분류만으로 화면 한 장이 넘어갔다.
 * 옆으로 돌리면 훑을 때 눈이 왼쪽 한 줄만 타고 내려가면 되고, 무엇을 안 채웠는지도
 * 한눈에 보인다(components/admin2/ui.tsx의 FormRow · admin2.css의 a2-form-lg).
 *
 * 그래서 판이 줄었다. 난이도·문항 구성·지문은 각각 판 하나에 칸 하나뿐이었는데, 이름표를
 * 왼쪽으로 돌리자 판 제목과 이름표가 같은 말을 두 번 하게 됐다. 난이도는 분류 줄에,
 * 지문은 문항 판의 첫 줄로 들어갔다. 맨 위 문항 구성은 판 제목 없이 줄 하나만 세운다.
 * 늘 맞춰 보는 두 칸(난이도 · 배점)은 한 줄에 반반으로 선다(FormRowPair).
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

/** 고쳐도 제출 확인을 풀지 않는 칸 — 문항 내용이 아니라 확인에 딸린 것들 */
const ATTEST_KEYS = new Set<string>([
  "checks",
  "signedBy",
  "signedAt",
  "guidance",
  "reviewRequest",
]);

export default function ItemDetail({ id }: { id: string }) {
  const items = useItems();
  const prefs = useAdminPrefs();
  const router = useRouter();
  const [reason, setReason] = useState("");
  /** 고치는 중인 값. null이면 손대지 않았다는 뜻이다 */
  const [draft, setDraft] = useState<Partial<ItemDraft> | null>(null);
  /** 세트에서 들어가 있는 문항. null이면 목록을 보고 있다 */
  const [openQ, setOpenQ] = useState<string | null>(null);
  /** 응시 화면 미리보기를 띄웠는가 */
  const [preview, setPreview] = useState(false);
  /** 지문을 문서 편집기로 열었는가 — 열 때 편 블록 중 편집기가 못 고치는 것(atoms)을 들고 있다 */
  const [docOpen, setDocOpen] = useState<{
    html: string;
    atoms: import("@/lib/content").Block[];
    /** 독립 문항 — 첫 줄 지시문을 함께 펴고 되돌린다 */
    lead: boolean;
  } | null>(null);
  /** 고친 내용 때문에 제출 확인이 풀렸는가 — 체크리스트 판이 까닭을 적는다 */
  const [unsigned, setUnsigned] = useState(false);

  const item = items.find((i) => i.id === id);
  /** 화면이 그리는 값 — 저장된 문항 위에 고치는 중인 값을 덮는다 */
  const view = item && draft ? { ...item, ...draft } : item;

  const dirty = draft !== null;
  const cancel = () => {
    /* 세트의 문항 화면에 들어가 있었으면 목록으로 나온다. 열어 둔 열쇠(q3)를 남겨 두면, 취소로
       q3이 사라진 뒤 다음에 더하는 문항이 같은 열쇠를 받아 목록에서 +만 눌렀는데 그 문항 화면으로
       넘어간다. 「저장된 문항이면 남는다」로 가르지 않는다 — 뺀 문항의 열쇠를 새 문항이 다시 받으면
       (q5를 빼고 문항 추가) 취소한 뒤 엉뚱한 저장된 문항 화면에 선다 */
    setOpenQ(null);
    setDraft(null);
    setUnsigned(false);
  };
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
              <span className="a2-mono">{id}</span> 문항이 이 브라우저의 저장소에 없습니다. 다른
              기기에서 만든 문항이거나 주소가 잘못되었습니다.
            </p>
          </Panel>
        </Body>
      </>
    );
  }

  const editable = view.state === "draft" || view.state === "rejected";
  const locked = !editable;
  /** 사용 스위치를 켜고 끌 수 있는가 — 검수를 지난 문항만 */
  const switchable = view.state === "approved" || view.state === "retired";
  const by = prefs.staffName || "운영자";
  /** 제출 문턱은 저장된 값 기준이다 — 검수자는 저장된 문항을 받는다 */
  const ready = missingSubmit(item).length === 0;

  /**
   * 고친 값을 초안에 담아 둔다. 저장소로 나가는 것은 save()뿐이다.
   *
   * 제출 확인한 뒤 **문항 내용**을 고치면 확인을 푼다(signedAt). 출제위원의 서명은 그때 본
   * 내용에 한 것이라, 발문 한 글자를 고친 문항에 그 서명이 붙어 나가면 서명이 아무것도
   * 보증하지 않는다. 체크는 남긴다 — 다시 확인하는 것은 한 번 누르면 된다.
   * 체크리스트 · 서명 · 출제자 유의 · 검토 요청은 내용이 아니라서 풀지 않는다.
   */
  const set = (patch: Partial<ItemDraft>) => {
    if (!editable) return;
    const content = Object.keys(patch).some((k) => !ATTEST_KEYS.has(k));
    const unsign = content && view.signedAt !== "";
    if (unsign) setUnsigned(true);
    if (patch.signedAt) setUnsigned(false);
    setDraft((d) => ({ ...(d ?? {}), ...patch, ...(unsign ? { signedAt: "" } : {}) }));
  };

  const qs = view.questions;
  const setQuestions = (next: Question[]) => set({ questions: next });
  const setQuestion = (k: number, next: Question) =>
    setQuestions(qs.map((x, n) => (n === k ? next : x)));

  /* 학생이 보는 모양 — 자료 블록 · 묶음 · 답 칸(lib/content.ts). 여기서 고치기 시작하면 이것이
     원본이 된다(contentAuthored). 목록 · 검수가 한 줄로 읽는 지문 칸에는 문단 글만 옮겨 둔다 */
  const content = contentFor(view);
  const setContent = (next: ContentSet) =>
    set({
      content: next,
      contentAuthored: true,
      passage: next.material.blocks
        .flatMap((b) => (b.kind === "text" ? [b.text] : []))
        .join(PARAGRAPH_GAP),
      passageMode: "text",
      passageImages: [],
    });
  /* 빈칸 표지는 세트 자료와 묶음 자료에서 함께 찾는다 — 「[측정 결과]」 표의 ( ㄱ )도 문항이 묻는다 */
  const marks = blankMarks([
    ...content.material.blocks,
    ...content.nodes.flatMap((n) => ("kind" in n ? n.material.blocks : [])),
  ]);
  const contentOfQ = (qid: string) => questionsIn(content).find((c) => c.id === qid);
  const setContentOfQ = (qid: string, next: ContentQuestion) =>
    setContent(patchQuestion(content, qid, () => next));

  /* 세트의 단계별 문항 수 — 문항 구성 줄에서 − / +로 고친다(lib/itemStore.ts setLevelCount).
     빠지는 문항에 적어 둔 것이 있으면 먼저 묻는다. 수만 보고 누르는 칸이라, 어느 문항이
     빠지는지는 눌러 보기 전에 보이지 않는다 */
  const levelCounts = levelCountsOf(qs);
  const changeLevelCount = (level: Level, count: number) => {
    const dropping = qs.filter((q) => q.level === level).slice(count);
    if (
      dropping.some(questionHasContent) &&
      !window.confirm(`${level}의 마지막 문항에 적어 둔 내용이 있습니다. 이 문항을 뺄까요?`)
    ) {
      return;
    }
    setQuestions(setLevelCount(qs, level, count));
  };

  /* 학년을 바꾸면 성취기준 코드가 범위를 벗어난다. 세트면 코드가 문항마다 들어간 화면에
     있어 바꾼 자리에서 보이지 않으므로 학년 칸에도 적는다. 다른 학년이었다면 맞았을
     코드만 센다 — 비었거나 형식이 틀린 코드는 학년을 바꿔서 생긴 일이 아니다 */
  /* 단일로 돌려 둔 세트의 2번 이후는 화면에 없고 저장할 때 떨어진다 — 세지 않는다 */
  const bandBroken = (view.form === "single" ? qs.slice(0, 1) : qs).filter(
    (q) =>
      !checkStandardCode(q.standardCode, view.band).ok &&
      allGradeBands.some((g) => g.id !== view.band && checkStandardCode(q.standardCode, g.id).ok),
  ).length;

  /* 검수 이력에 메모를 함께 편다. 메모를 쓰는 판은 걷었지만 거기 쌓인 기록은 걷지 않는다 —
     반려 사유만 comments에 들고 있는 문항이 있고(검수 기록이 생기기 전에 반려된 IT-2602),
     앵커 지정·다시 쓰기의 까닭은 comments에만 남는다. 검수판에서 승인·반려하면 같은 말이
     reviews와 comments 양쪽에 남으므로, 짝이 있는 것은 검수 기록 쪽 한 번만 세운다 */
  const mirrored = (c: ItemComment) =>
    c.kind !== "note" &&
    view.reviews.some((r) => r.at === c.at && r.verdict === c.kind && r.text === c.text);
  const loose = view.comments.filter((c) => !mirrored(c));
  const notes = loose.length;
  const history = [
    ...view.reviews.map((r) => ({ at: r.at, review: r, comment: undefined, key: `r-${r.at}-${r.round}` })),
    ...loose.map((c, k) => ({ at: c.at, review: undefined, comment: c, key: `c-${c.at}-${k}` })),
  ]
    .map((e, k) => ({ ...e, k }))
    /* 새것이 위. 같은 시각이면 나중에 쌓인 것이 위 — at은 「YYYY-MM-DD HH:MM」이라 글자로 견준다 */
    .sort((a, b) => (a.at === b.at ? b.k - a.k : a.at < b.at ? 1 : -1));

  const saveBar = editable ? <PageSaveBar dirty={dirty} onSave={save} onCancel={cancel} /> : null;

  /* 세트가 통째로 함께 쓰는 칸 — 분류 판의 앞머리에 선다.
     단일이면 문항 상세에, 세트면 문항 하나로 들어간 화면에 선다. 세트 바깥 화면에는
     세우지 않는다. 거기서는 어느 문항의 분류인지 말할 수가 없다.

     과목 줄은 없다. 교과 단원을 고르면 과목이 따라온다 — 둘을 따로 고르게 두면
     「수학 · 생생하게 표현해요」가 생길 수 있다. */
  const sharedRows = (
    <>
      {/* 손으로 적는 칸이 아니다. 코드에 담기는 것이 전부 이 화면의 다른 칸에
          이미 있어서, 적게 하면 그 둘이 어긋나기만 한다(lib/itemStore.ts 문항 ID).
          학년·과목·형식·단계를 바꾸면 저장할 때 번호가 다시 매겨지는데, 그 예고는 칸 아래에
          적지 않는다 — 설명 줄을 걷어 낸 판이라 저장한 뒤 바뀐 번호가 이 칸에 선다 */}
      <FormRow label="문항 ID">
        <span className="a2-cell-pad flex items-center a2-mono a2-t-md font-bold text-(--a2-ink)">
          {view.code || "저장하면 매겨집니다"}
        </span>
      </FormRow>

      <BandUnitRows
        value={view}
        disabled={locked}
        bandHint={
          bandBroken > 0 ? (
            <span style={{ color: "var(--a2-danger)" }}>
              {view.form === "set"
                ? `이 세트 문항의 성취기준 코드 ${bandBroken}개가`
                : "아래 Tag A의 성취기준 코드가"}{" "}
              이 학년 범위를 벗어납니다.
            </span>
          ) : undefined
        }
        onChange={set}
      />
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
            <button type="button" className="a2-btn" onClick={() => setOpenQ(null)}>
              ← 문항 목록
            </button>
          }
          actions={
            <span className="a2-t-xs text-(--a2-ink-4)">
              <span className="a2-mono">{view.code || "문항 ID 미정"}</span> · 세트 {qs.length}문
            </span>
          }
        />
        <Body>
          <div className="grid gap-4">
            <Panel title="분류" flush>
              <p className="a2-note m-4 mb-0">
                <span>
                  문항 ID · 학년 · 교과 단원은 <b>세트 전체</b>가 함께 씁니다. 여기서 고치면 같은
                  세트의 다른 문항에도 그대로 걸립니다. 그 아래는 이 문항만의 값입니다.
                </span>
              </p>
              <div className="a2-form a2-form-lg a2-card mt-4">
                {sharedRows}
                <QuestionClassRows
                  key={`class-${qs[openIndex].id}`}
                  q={qs[openIndex]}
                  band={view.band}
                  disabled={locked}
                  onChange={(next: Question) => setQuestion(openIndex, next)}
                />
              </div>
            </Panel>

            {/* 지문은 세트가 함께 읽는 것이라 목록 화면에 있다 */}
            <Panel title="문항" flush>
              <div className="a2-form a2-form-lg a2-card">
                <QuestionContentRows
                  key={`content-${qs[openIndex].id}`}
                  q={qs[openIndex]}
                  content={contentOfQ(qs[openIndex].id)}
                  marks={marks}
                  disabled={locked}
                  onChange={(next: Question) => setQuestion(openIndex, next)}
                  onContent={(next) => setContentOfQ(qs[openIndex].id, next)}
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
            {/* 사용 여부 — 승인됨과 사용 중지를 오간다. 문항 상태와 따로 노는 값이 아니다.
                「사용 중지」라는 상태가 이미 회차 편성에서 문항을 빼는 자리라, 켜고 끄는 값을
                하나 더 두면 승인됨인데 비사용인 문항이 생겨 둘 중 무엇을 믿을지 정해야 한다.

                아래 판에 두지 않고 머리에 세운다. 승인된 문항은 판이 전부 잠겨 있어서, 문항을
                열고 하는 일이 사실상 이것 하나인데 그 스위치가 판 열 개 밑에 있으면 찾으러
                내려가야 한다. 승인 전 문항에도 꺼진 채로 세워 두고 까닭을 적는다 — 자리가
                있다 없다 하면 승인하고 나서야 스위치가 있다는 것을 안다.

                까닭을 묻지 않는다. 되돌리는 것도 스위치 한 번이고, 누가 언제 껐는지는 검수
                이력에 메모로 남는다(lib/itemStore.ts retireItem) */}
            <span
              className="mr-2 flex items-center gap-1.5"
              title={switchable ? undefined : "승인된 문항만 켜고 끌 수 있습니다"}
            >
              <span className="a2-t-xs text-(--a2-ink-4)" aria-hidden>
                사용
              </span>
              <Switch
                label="사용"
                on={view.state === "approved"}
                disabled={!switchable}
                onChange={(on) =>
                  on ? restoreItem(view.id, by, prefs.role) : retireItem(view.id, by, prefs.role)
                }
              />
            </span>
            <span className="mr-1 flex items-center gap-1.5">
              <span className="a2-t-xs text-(--a2-ink-4)">상태</span>
              <Status tone={itemTone[view.state]}>{stateLabel[view.state]}</Status>
            </span>
            {/* 검수하는 사람이 가장 자주 누르는 단추라 나가는 문들보다 왼쪽에 둔다.
                지금 화면의 값(초안 포함)으로 띄운다 — 저장하기 전에 「이렇게 보이는가」를
                보는 것이 미리보기의 일이다 */}
            <button type="button" className="a2-btn" onClick={() => setPreview(true)}>
              미리보기
            </button>
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
                      : `${missingSubmit(item).join(" · ")}이(가) 남았습니다`
                }
                onClick={() => submitItem(view.id)}
              >
                검수로 제출
              </button>
            )}
            {view.state === "submitted" && (
              <button type="button" className="a2-btn" onClick={() => withdrawItem(view.id)}>
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
          {/* 맨 위의 상태 안내 줄(「검수 대기 중인 문항은 잠깁니다…」 · 「승인된 문항은 잠깁니다…」 ·
              「사용 중지된 문항입니다…」 · 「반려된 문항입니다…」)은 걷었다. 상태는 머리에 서 있고,
              푸는 길(제출 회수 · 새 판으로 고치기 · 사용 스위치)도 머리의 단추가 말한다. 누가 언제
              사용을 껐는지와 반려 소견은 바로 아래 검수 이력에 남는다(retireItem · rejectItem) */}

          {/* ── 검수 이력 ──
              맨 위에 둔다. 검수를 거친 문항을 여는 까닭은 대개 「무엇이 걸렸나」를 보고
              고치러 온 것이라, 소견이 입력 칸 아래에 있으면 고칠 곳과 고칠 까닭 사이를
              스크롤로 오가야 한다. 기록이 하나도 없으면 판째 세우지 않는다 — 「아직 검수를
              거치지 않았습니다」 한 줄이 작성 중인 문항마다 맨 위 자리를 차지한다 */}
          {history.length > 0 && (
            <Panel
              title="검수 이력"
              meta={`${view.reviews.length}회${notes > 0 ? ` · 메모 ${notes}건` : ""}`}
              flush
            >
              <ul className="divide-y divide-(--a2-line)">
                {history.map(({ review: r, comment: c, key }) =>
                  c ? (
                    <li key={key} className="p-4">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        {c.kind === "note" ? (
                          <span className="a2-t-sm font-semibold text-(--a2-ink-3)">메모</span>
                        ) : (
                          <Status tone={c.kind === "approve" ? "ok" : "danger"}>
                            {c.kind === "approve"
                              ? "승인"
                              : c.code
                                ? `반려 · ${rejectLabel(c.code)}`
                                : "반려"}
                          </Status>
                        )}
                        <span className="a2-t-sm text-(--a2-ink-2)">{c.by}</span>
                        <span className="a2-mono a2-t-xs text-(--a2-ink-4)">{c.at}</span>
                      </div>
                      {c.text && (
                        <p className="mt-1.5 whitespace-pre-line a2-t-sm text-(--a2-ink-2)">{c.text}</p>
                      )}
                    </li>
                  ) : r ? (
                    <li key={key} className="p-4">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        {/* 검수판이 반려 사유 코드를 받지 않게 된 뒤의 반려는 코드가 없다. 「사유 없음」으로
                            적으면 까닭 없이 돌려보낸 것으로 읽힌다 — 어느 갈래에서 반려했는지는 아래에 선다 */}
                        <Status tone={r.verdict === "approve" ? "ok" : "danger"}>
                          {r.verdict === "approve"
                            ? "승인"
                            : r.code
                              ? `반려 · ${rejectLabel(r.code)}`
                              : "반려"}
                        </Status>
                        <span className="a2-t-sm text-(--a2-ink-2)">
                          {r.round}차 · {r.by}
                        </span>
                        <span className="a2-mono a2-t-xs text-(--a2-ink-4)">{r.at}</span>
                        {r.machine && <Tag>기계</Tag>}
                        {r.self && (
                          <span className="a2-t-xs font-bold" style={{ color: "var(--a2-danger)" }}>
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
                            {c.id === "content" ? "내용" : c.id === "tagging" ? "태깅" : "윤리"}{" "}
                            {c.ok === null ? "—" : c.ok ? "확인" : "반려"}
                          </li>
                        ))}
                      </ul>
                      {r.text && (
                        <p className="mt-1.5 whitespace-pre-line a2-t-sm text-(--a2-ink-2)">{r.text}</p>
                      )}
                    </li>
                  ) : null,
                )}
              </ul>
            </Panel>
          )}

          {/* ── ① 무엇부터 정하나 ──
              단일이냐 세트냐를 맨 위에 세운다. 이 하나가 아래를 전부 바꾸기 때문이다 —
              세트면 함께 읽을 보기가 있어야 하고, 문항이 하나가 아니라 목록이 되고,
              문항마다 따로 들어가 볼 것이 생긴다. 분류부터 채워 놓고 뒤늦게 세트로 돌리면
              지금까지 채운 것이 어느 문항의 것인지부터 다시 정해야 한다.

              판 제목을 달지 않았다. 줄 이름표가 이미 「문항 구성」이라, 제목을 달면
              같은 말이 위아래로 두 번 선다 */}
          <Panel flush>
            <div className="a2-form a2-form-lg a2-card">
              <FormRow label="문항 구성" req>
                <div className="a2-cell-pad flex flex-wrap items-center gap-x-5 gap-y-1">
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
                              form === "set" && qs.length < 2 ? [...qs, blankQuestion(qs)] : qs,
                          });
                        }}
                      />
                      {f.label}
                    </label>
                  ))}
                </div>
                {/* 세트를 단일로 돌리면 저장할 때 2번 이후 문항이 떨어진다. 그 예고를 칸 아래에
                    적어 두었다가 걷었다 — 되돌리는 길(세트 다시 고르기 · 취소)은 저장 전까지 열려 있다 */}
                {/* 세트면 단계마다 몇 문항인지 — 지금 든 문항을 센 값이다. 늘리는 단계는 새 문항이
                    분류를 물려받을 문항의 재능 축이 다룰 수 있는 것만 연다(자기-성찰은 S4가 없다).
                    그 문항은 저장소가 끼울 자리를 고르는 것과 같은 셈으로 찾는다(levelInsertAt) */}
                {view.form === "set" && (
                  <LevelCounts
                    counts={levelCounts}
                    total={qs.length}
                    min={1}
                    max={SET_MAX}
                    allowed={(l) => {
                      const { from } = levelInsertAt(qs, l);
                      return !!from && levelAllowed(from.talent, l);
                    }}
                    disabled={locked}
                    onChange={changeLevelCount}
                  />
                )}
              </FormRow>
            </div>
          </Panel>

          {/* ── ② 분류 ──
              단일일 때만 선다. 세트에서는 분류가 문항마다 다르므로(단계도 난이도도) 바깥에
              한 벌 세워 두면 어느 문항의 것인지 말할 수 없는 값이 된다. 세트의 분류는 문항
              하나로 들어간 화면에 있다 */}
          {view.form === "single" && (
            <Panel title="분류" flush>
              <div className="a2-form a2-form-lg a2-card">
                {sharedRows}
                <QuestionClassRows
                  q={qs[0]}
                  band={view.band}
                  disabled={locked}
                  onChange={(next: Question) => setQuestion(0, next)}
                />
              </div>
            </Panel>
          )}

          {/* ── ③ 무엇을 읽히고 무엇을 묻나 ──
              단일이면 지문 → 문항 → 정답 · 채점 기준 → 오답 설계 의도가 한 줄기로 이어진다.
              세트면 지문이 곧 「문항들이 함께 읽는 것」이라 목록 바로 위가 제자리다 */}
          <Panel title="문항" meta={view.form === "set" ? `${qs.length}문항` : undefined} flush>
            <div className="a2-form a2-form-lg a2-card">
              {/* 보기 상자의 네모 테두리와 「[1~4]」 번호는 응시 화면이 그린다. 여기서는 상자 위
                  지시문과 상자 안에 들어갈 것만 쓴다 */}
              {view.form === "set" ? (
                <>
                  <FormRow label="지시문">
                    <input
                      className="a2-input"
                      value={content.material.lead ?? ""}
                      disabled={locked}
                      placeholder="다음의 등잔과 초에 대한 설명을 읽고 물음에 답하시오."
                      onChange={(e) =>
                        setContent({
                          ...content,
                          material: { ...content.material, lead: e.target.value || undefined },
                        })
                      }
                    />
                  </FormRow>
                  {/* 보기 · 지문은 상자 하나 — 응시 화면 모양 그대로 그리고, 누르면 문서 편집기가 열린다 */}
                  <FormRow label="보기 · 지문" req>
                    <DocBox
                      label="보기 · 지문"
                      empty="비어 있습니다. 눌러서 문서 편집기로 쓰거나 한글 · 워드 파일을 불러옵니다."
                      disabled={locked}
                      filled={content.material.blocks.length > 0}
                      onOpen={() => setDocOpen({ ...blocksToHtml(content.material.blocks), lead: false })}
                    >
                      <BlockList blocks={content.material.blocks} />
                    </DocBox>
                  </FormRow>
                </>
              ) : (
                /* 독립 문항은 지시문과 지문을 상자 하나 「지문」에 담는다(2026-09-22 요청) — 첫 줄이 지시문,
                   그 아래가 자료다. 편집기에서도 첫 줄로 펴고, 적용하면 「…답하시오.」 줄을 지시문으로 되돌린다.
                   세트는 지시문이 「[1~4]」 묶음 머리라 칸을 따로 둔다 */
                <FormRow label="지문">
                  <DocBox
                    label="지문"
                    empty="비어 있습니다. 눌러서 문서 편집기로 쓰거나 한글 · 워드 파일을 불러옵니다."
                    disabled={locked}
                    filled={!!content.material.lead || content.material.blocks.length > 0}
                    onOpen={() => {
                      const body = blocksToHtml(content.material.blocks);
                      setDocOpen({
                        html: textToHtml(content.material.lead ?? "") + body.html,
                        atoms: body.atoms,
                        lead: true,
                      });
                    }}
                  >
                    {content.material.lead && (
                      <p className="a2-docbox-lead">{content.material.lead}</p>
                    )}
                    <BlockList blocks={content.material.blocks} />
                  </DocBox>
                </FormRow>
              )}
              {view.form === "single" && (
                <QuestionContentRows
                  key={qs[0].id}
                  q={qs[0]}
                  content={contentOfQ(qs[0].id)}
                  marks={marks}
                  disabled={locked}
                  onChange={(next: Question) => setQuestion(0, next)}
                  onContent={(next) => setContentOfQ(qs[0].id, next)}
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
                  <p className="a2-note m-4 mt-0" style={{ borderLeftColor: "var(--a2-warn)" }}>
                    <span>세트는 문항이 두 개 이상이어야 합니다.</span>
                  </p>
                )}
                {/* 세트 안의 세트 — 이어진 문항을 묶어 한 화면에 세우고 자료를 더 얹는다 */}
                {qs.length >= 2 && (
                  <GroupEditor
                    content={content}
                    count={qs.length}
                    disabled={locked}
                    onChange={setContent}
                  />
                )}
              </>
            )}
          </Panel>

          {/* ── ④ 제출 전 자가 체크리스트 ──
              단일이든 세트든 바깥 화면 맨 아래에 한 벌. 서명은 문항 하나가 아니라 이 묶음
              통째에 하는 것이다 — 세트의 「앞 문항이 뒤 문항의 답을 노출하지 않는가」는
              문항 하나로 들어간 화면에서는 짚을 수가 없다 */}
          {/* 「제출까지 남은 것」 줄은 걷었다. 체크리스트 판 바로 아래에서 칸 이름 열 개를 한 줄로
              다시 읽혀, 판의 맨 끝이 안내문이 되었다. 무엇이 남았는지는 꺼진 「검수로 제출」
              단추의 풍선 도움말이 말한다 */}
          {/* 검수 대기 중에는 체크리스트를 걷는다. 검수자가 짚을 것은 아래 검수판이고, 출제위원이
              짚은 열네 줄은 이미 제출 문턱에서 다 켜진 채 넘어온다. 출제자 유의 · 검토 요청만 남긴다 */}
          <SubmitChecklist
            item={view}
            signer={by}
            unsigned={unsigned}
            disabled={locked}
            reviewing={view.state === "submitted"}
            onChange={set}
          />

          {/* key를 붙여 문항이 바뀌면 검수판을 새로 세운다. 붙이지 않으면 앞 문항에서
              짚어 둔 3단 체크가 다음 문항에 그대로 남아 다른 문항을 승인하게 된다. */}
          {view.state === "submitted" && <ReviewPanel key={view.id} item={item} />}

          {/* 사용 중지·다시 쓰기는 머리의 사용 스위치로 올라갔다. 이 판에는 앵커만 남는다.
              앵커는 까닭을 그대로 받는다 — 회차를 건너 같은 잣대로 쓰겠다는 결정이라, 켜고
              끄는 스위치처럼 가볍게 오가는 값이 아니다 */}
          {view.state === "approved" && (
            <Panel title="앵커" flush>
              <div className="a2-form a2-form-lg">
                <FormRow label="까닭" req>
                  <GrowTextarea
                    className="a2-textarea a2-textarea-lg"
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="예: 세 회차 정답률이 40~60%로 고르게 나와 등화 기준으로 둡니다"
                  />
                  <span className="flex w-full flex-wrap gap-2">
                    <button
                      type="button"
                      className="a2-btn"
                      disabled={reason.trim().length < 5 || !!view.disclosed}
                      title={
                        view.disclosed
                          ? "밖에 공개된 적이 있는 문항은 앵커가 될 수 없습니다"
                          : undefined
                      }
                      onClick={() => {
                        setAnchor(view.id, !view.anchor, by, prefs.role, reason.trim());
                        setReason("");
                      }}
                    >
                      {view.anchor ? "앵커 해제" : "앵커로 지정"}
                    </button>
                  </span>
                </FormRow>
              </div>
            </Panel>
          )}

        </div>

        {/* 저장은 오른쪽 아래에 붙여 둔다 — 회원·학생·기관 상세와 같은 자리다.
            판이 열 개를 넘어서 판마다 저장 줄을 두면 그 판만 저장하는 것으로 읽힌다 */}
        {saveBar}
      </Body>

      <LeaveDialog guard={guard} />
      {preview && <ItemPreview item={view} onClose={() => setPreview(false)} />}

      {/* 지문 문서 편집기 — 적용하면 블록으로 되접어 지문 칸을 갈아 끼운다. 첫 줄이 「…답하시오.」면
          지시문 칸으로 옮긴다(한글 원고는 지시문을 본문 첫 줄에 쓴다) */}
      {docOpen && (
        <DocEditor
          title={`${view.form === "set" ? "보기 · 지문" : "지문"} — ${view.code || view.id}`}
          initialHtml={docOpen.html}
          mode="passage"
          onClose={() => setDocOpen(null)}
          onApply={(html) => {
            /* 독립은 지시문도 편집기 안에 있었다 — 첫 줄이 지시문 꼴이 아니면 지시문을 비운다(지운 것이다).
               세트는 지시문 칸이 따로라, 원고 첫 줄에 지시문이 있을 때만 옮긴다 */
            const cut = splitLeadHtml(html);
            const blocks = htmlToBlocks(cut.html, docOpen.atoms);
            const lead = docOpen.lead ? cut.lead ?? undefined : cut.lead ?? content.material.lead;
            setContent({ ...content, material: { ...content.material, blocks, lead } });
          }}
        />
      )}
    </>
  );
}
