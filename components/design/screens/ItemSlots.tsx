"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { itemTone } from "@/lib/admin2";
import { fitSlots, scanSlots, slotType } from "@/lib/answerSlots";
import { patchQuestion, questionsIn, type ContentQuestion, type Response } from "@/lib/content";
import { designLinks } from "@/lib/designScreens";
import { SLOT_STEM, SLOT_WHY } from "@/lib/examDesign";
import { examSets } from "@/lib/examQuestions";
import {
  SET_MAX,
  contentFor,
  itemForms,
  levelCountsOf,
  missingSubmit,
  seedItem,
  stateLabel,
  withSlots,
  type ItemDraft,
  type Question,
} from "@/lib/itemStore";
import type { Level } from "@/lib/blueprint";
import DocBox from "@/components/admin2/DocBox";
import { PageSaveBar } from "@/components/admin2/EditGuard";
import ItemPreview from "@/components/admin2/ItemPreview";
import { Body, FormRow, PageHead, Panel, Status, Switch } from "@/components/admin2/ui";
import BandUnitRows from "@/app/(admin2)/admin2/items/[id]/BandUnitRows";
import LevelCounts from "@/app/(admin2)/admin2/items/[id]/LevelCounts";
import {
  QuestionClassRows,
  QuestionContentRows,
  QuestionList,
} from "@/app/(admin2)/admin2/items/[id]/QuestionEditor";
import { BlockList } from "@/components/exam/ExamSession";
import ConsoleFrame, { type ConsoleMe } from "../ConsoleFrame";

/**
 * 문항 상세 · 답 칸 표지 (실제 주소 /admin2/items/[문항]) — 디자인 (2026-10-16 요청).
 *
 * 출제자가 문항을 쓰면서 답이 들어갈 자리에 표지를 넣으면 그 자리에 칸이 생기는 화면이다
 * (lib/answerSlots.ts). 예전에는 형식을 먼저 고르고 문항 아래 「답 칸 편집기」에서 칸을 하나씩
 * 만들었다.
 *
 *   쓰기 전       문항 상자가 비어 있고, 정답 줄 자리에 표지를 쓰는 법 · 형식은 「정해지지 않음」
 *   편집기        원고를 붙여 넣은 문서 → 답이 될 글자를 고르고 [정답] · {서술형}을 누른 뒤 → 표지 안내
 *   표지 넣은 뒤  문항 상자에 이름표(「정답 1」), 아래 「정답 및 채점기준」에 표지마다 한 줄,
 *                 형식이 표지에서 정해진다(서술형)
 *   확인 필요     칸이 생기지 않는 표지(사진을 다른 표지와 함께 씀) · 문제 이름표로 본 「[서술형 2]」
 *   미리보기      학생 화면 — 괄호 자리에 짧은 칸, 「이유를 쓰시오」 아래에 쓰는 칸
 *   유형마다      정답 · OX · 선택 · 서술형 · 논술형 · 그리기 · 사진 · 선 잇기 · 객관식
 *   옛 문항       표지 없이 만든 답 칸(문장 속 괄호 · 이름 붙은 칸) → 「표지로 바꾸기」
 *
 * 화면은 실제 조각(QuestionEditor의 QuestionClassRows · QuestionContentRows, 문서 편집기, 미리보기
 * 창)이고 값만 여기 적었다. 칸은 실제처럼 고쳐지고 문서 편집기도 열리지만 저장되지 않는다 — 주소를
 * 다시 열면 처음 모습이다. 문항은 문항 은행의 과학 문항(IT-2603, 물의 상태 변화)을 바탕으로 했다.
 * 제출 전 자가 체크리스트 판은 바뀐 것이 없어 이 디자인에서 뺐다.
 */

const to = designLinks("item-slots");

/** 출제는 출제자 권한을 받은 전문가가 한다 */
const author: ConsoleMe = { name: "최은비", role: "전문가 · 출제자", loginId: "ex.expert_author" };
const authorMenu = ["/admin2/authoring", "/admin2/items"];

/* ───────────────────────── 예시 문항 ───────────────────────── */

const seed = seedItem("IT-2603")!;
const q0 = seed.questions[0];

/** 문항 하나 — 문항 글과, 학생이 보는 답 칸 · 칸마다의 정답 */
type Example = {
  stem: string;
  level: Level;
  points: number;
  response: Response;
  answers?: string[];
  /** 객관식 — 보기와 정답 */
  choices?: string[];
  answer?: number;
  explain?: string;
  rubric?: string;
  accept?: string;
};

const EMPTY: Response = { kind: "blanks", blanks: [] };

function questionOf(id: string, ex: Example): Question {
  const marks = scanSlots(ex.stem).marks;
  return {
    ...q0,
    id,
    type: ex.choices ? "choice" : (slotType(marks) ?? "descriptive"),
    stem: ex.stem,
    stemMode: "text",
    stemImages: [],
    choices: ex.choices ?? [],
    answer: ex.answer ?? 0,
    distractorIntent: ex.choices ? ex.choices.map((_, k) => (k === ex.answer ? "" : "상태 변화와 무게 변화를 섞어 생각한다")) : [],
    shortAnswers: "",
    explain: ex.explain ?? "",
    rubric: ex.rubric ?? "",
    acceptExamples: ex.accept ?? "",
    level: ex.level,
    points: ex.points,
    tagADetail: "물이 끓을 때의 변화",
    tagAIntent: "끓음을 물이 수증기로 바뀌는 상태 변화로 설명할 수 있는지 확인한다.",
    perspectiveHierarchy: "관찰한 현상(거품)을 상태 변화 개념으로 다시 설명한다.",
    perspectiveAbility: "현상과 개념을 잇는 인과 설명",
    wrongIntent: "거품을 물속에 녹아 있던 공기로 보는 오개념",
  };
}

/** 문항들로 문항 하나(단일) 또는 세트를 짓는다 — 학생이 보는 모양은 블록으로 쓴 것으로 둔다 */
function itemOf(id: string, list: Example[], over: Partial<ItemDraft> = {}): ItemDraft {
  const qs = list.map((ex, k) => questionOf(`q${k + 1}`, ex));
  const nodes: ContentQuestion[] = list.map((ex, k) => ({
    id: `q${k + 1}`,
    level: ex.level,
    stem: ex.stem,
    response: ex.response,
    ...(ex.answers?.some((a) => a.trim()) ? { sampleAnswer: ex.answers } : {}),
  }));
  return {
    ...seed,
    id,
    code: "",
    state: "draft",
    form: list.length > 1 ? "set" : "single",
    stem: qs[0].stem,
    type: qs[0].type,
    passage: "",
    passageMode: "text",
    passageImages: [],
    questions: qs,
    content: { id, material: { blocks: [] }, nodes },
    contentAuthored: true,
    reviews: [],
    comments: [],
    signedAt: "",
    ...over,
  };
}

/** 표지대로 칸을 세운 문항 — 칸마다의 정답(given)을 표지 이름으로 넣는다 */
function slotted(stem: string, level: Level, points: number, given: Record<string, string> = {}, more: Partial<Example> = {}): Example {
  const fit = fitSlots(stem, { response: EMPTY, answers: [] }, given);
  return { stem, level, points, response: fit.response, answers: fit.answers, ...more };
}

/** 물이 끓을 때 생기는 거품 — 「ㄱ = 단답형, 이유 = 서술형」을 한 문항에 쓴 것. 응시 화면 유형 보기와 같은 문항 */
const BOIL = SLOT_STEM;
const BOIL_WHY = SLOT_WHY;
const boilMore: Partial<Example> = {
  explain: `(1) 수증기\n(2) ${BOIL_WHY}`,
  rubric: "(1) 수증기 — 1점\n(2) 물이 수증기로 변한다는 것과 그 수증기가 거품이 된다는 것을 모두 쓰면 2점, 하나만 쓰면 1점",
  accept: "· 물이 수증기로 바뀌어서 거품이 생긴다.\n· 끓을 때 물속에서 생긴 수증기가 올라오는 것이다.",
};
const boilEmpty = slotted(BOIL, "S3", 3, {}, boilMore);
const boilFilled = slotted(BOIL, "S3", 3, { 정답1: "수증기, 수증기(기체), 기체 상태의 물", 서술형1: BOIL_WHY }, boilMore);

/** 문서 편집기에 붙여 넣은 원고 — 답이 그 자리에 적혀 있다 */
const para = (lines: string[]) => lines.map((l) => `<p>${l}</p>`).join("");
const MANUSCRIPT = para([
  "다음은 물이 끓을 때 생기는 거품을 두고 두 친구가 나눈 대화입니다.",
  "민서: 물이 끓을 때 생기는 거품은 물속에 녹아 있던 공기야.",
  "준호: 아니야, 거품은 ( ㄱ )(이)야.",
  "(1) ㄱ에 들어갈 알맞은 말을 쓰시오. ( 수증기 )",
  "(2) 준호의 말이 옳은 이유를 물의 상태 변화와 관련지어 쓰시오.",
  BOIL_WHY,
]);
/** 「수증기」를 골라 [정답]을, 모범 답 문단을 골라 {서술형}을 누른 뒤 */
const MARKED = para([
  "다음은 물이 끓을 때 생기는 거품을 두고 두 친구가 나눈 대화입니다.",
  "민서: 물이 끓을 때 생기는 거품은 물속에 녹아 있던 공기야.",
  "준호: 아니야, 거품은 ( ㄱ )(이)야.",
  "(1) ㄱ에 들어갈 알맞은 말을 쓰시오. ( [정답1: 수증기] )",
  "(2) 준호의 말이 옳은 이유를 물의 상태 변화와 관련지어 쓰시오.",
  `{서술형1: ${BOIL_WHY}}`,
]);

/** 확인이 필요한 표지 — 사진을 다른 표지와 함께 썼고, 원고의 문제 이름표 「[서술형 2]」가 남았다 */
const CHECK = [
  BOIL,
  "[서술형 2] 끓는 물에서 거품이 생기는 모습을 관찰해 그리고, 사진을 찍어 올리시오. {사진1}",
].join("\n");

/** 유형마다 한 문항 — 같은 단원(물의 상태 변화)에서 */
const TYPES: Record<string, Example> = {
  short: slotted("물이 얼면 부피는 어떻게 됩니까? ( [정답1] )", "S3", 2, { 정답1: "늘어난다, 커진다, 증가한다" }, {
    explain: "물은 얼면 부피가 늘어납니다.",
  }),
  ox: slotted(
    "다음 설명이 맞으면 O, 틀리면 X를 고르시오.\n(1) 물은 얼면 부피가 늘어난다. ( [OX1] )\n(2) 물이 끓을 때 생기는 거품은 공기이다. ( [OX2] )",
    "S1",
    1,
    { OX1: "O", OX2: "X" },
    { explain: "(1) 물은 얼면 부피가 늘어난다. (2) 거품은 수증기이다." },
  ),
  pick: {
    stem: "다음 중 물이 수증기로 변하는 현상은 무엇입니까? [선택1]",
    level: "S2",
    points: 1,
    response: {
      kind: "blanks",
      blanks: [{ label: "", slot: "선택1", options: ["증발", "응결", "응고", "융해"], accept: ["증발"] }],
    },
    answers: ["증발"],
    explain: "물이 표면에서 수증기로 변하는 현상은 증발입니다.",
  },
  write: slotted("젖은 빨래가 마르는 까닭을 물의 상태 변화와 관련지어 쓰시오. {서술형1}", "S3", 3, {
    서술형1: "빨래에 있던 물이 증발하여 수증기가 되어 공기 중으로 날아가기 때문이다.",
  }, { explain: "빨래의 물이 증발해 수증기로 날아갑니다.", rubric: "증발 · 수증기를 모두 쓰면 3점, 하나만 쓰면 2점" }),
  essay: slotted("물을 아껴 써야 하는 까닭을 물의 순환과 관련지어 한 편의 글로 쓰시오. {논술형1}", "S4", 3, {
    논술형1: "물은 증발과 응결을 거치며 돌고 돌지만, 우리가 바로 쓸 수 있는 깨끗한 물은 아주 적다. …",
  }, { explain: "물의 순환과 쓸 수 있는 물의 양을 함께 근거로 든다.", rubric: "근거 두 가지 이상 · 주장과 근거가 이어지면 3점" }),
  draw: slotted("물이 끓을 때 물속에서 거품이 생겨 올라오는 모습을 그림으로 나타내시오. {그리기1}", "S4", 3, {
    그리기1: "바닥에서 생긴 거품이 위로 갈수록 커지며 올라오는 모습이면 인정",
  }, { explain: "물속 여러 곳에서 생긴 수증기 거품이 위로 올라온다.", rubric: "거품이 물속에서 생겨 올라오는 모습 3점" }),
  photo: slotted(
    "주전자의 물이 끓는 모습을 관찰한 내용을 종이에 그림과 글로 정리하고, 사진을 찍어 올리시오. {사진1}",
    "S3",
    3,
    { 사진1: "거품 · 김(수증기)을 구별해 적었으면 인정" },
    { explain: "끓을 때 거품과 김이 생기는 것을 정리한다.", rubric: "관찰 내용 두 가지 이상 3점" },
  ),
  match: {
    stem: "물의 상태 변화와 그 예를 알맞게 선으로 이으시오. {선잇기1}",
    level: "S2",
    points: 1,
    response: {
      kind: "match",
      left: [{ text: "증발" }, { text: "응결" }],
      right: [
        { text: "젖은 빨래가 마른다." },
        { text: "차가운 컵 표면에 물방울이 맺힌다." },
        { text: "어항의 물이 조금씩 줄어든다." },
      ],
      pairs: [
        [0, 0],
        [1, 1],
        [0, 2],
      ],
    },
    explain: "빨래가 마르고 어항의 물이 줄어드는 것은 증발, 컵 표면의 물방울은 응결입니다.",
  },
  choice: {
    stem: "물이 얼 때 일어나는 변화로 알맞은 것은 무엇입니까?",
    level: "S1",
    points: 1,
    response: { kind: "choice", choices: [], answer: 0 },
    choices: ["부피가 늘어난다.", "부피가 줄어든다.", "무게가 늘어난다.", "무게가 줄어든다.", "아무 변화가 없다."],
    answer: 0,
    explain: "물은 얼면 부피가 늘어나고 무게는 변하지 않습니다.",
  },
};

/** 예전 방식으로 만든 문항 — 응시 화면 과학 13번(한반도 지형). 문장 속 괄호 하나와 「이유」 칸 */
const oldNode = questionsIn({ id: "", material: { blocks: [] }, nodes: examSets.find((s) => s.id === "sci-erosion")!.nodes })[0];
const legacyEx: Example = {
  stem: oldNode.stem,
  level: oldNode.level,
  points: 2,
  response: oldNode.response,
  answers: oldNode.sampleAnswer,
  explain: oldNode.sampleAnswer?.join("\n"),
  rubric: oldNode.scoring?.join("\n"),
};

/* ───────────────────────── 상태 ───────────────────────── */

type Start = {
  item: ItemDraft;
  /** 문서 편집기를 연 채로 — 편집기에 펴 둘 글 */
  doc?: string;
  guide?: boolean;
  /** 미리보기 창 — 정답 · 해설을 켠 채인가 */
  preview?: boolean;
  reveal?: boolean;
};

const ID = "IT-2701";

function startOf(state: string): Start {
  if (state === "") return { item: itemOf(ID, [{ stem: "", level: "S3", points: 3, response: EMPTY }]) };
  if (state === "doc") return { item: itemOf(ID, [{ stem: "", level: "S3", points: 3, response: EMPTY }]), doc: MANUSCRIPT };
  if (state === "doc/slots") return { item: itemOf(ID, [{ stem: "", level: "S3", points: 3, response: EMPTY }]), doc: MARKED };
  if (state === "doc/guide") {
    return { item: itemOf(ID, [{ stem: "", level: "S3", points: 3, response: EMPTY }]), doc: MARKED, guide: true };
  }
  if (state === "slots") return { item: itemOf(ID, [boilEmpty]) };
  if (state === "slots/filled") return { item: itemOf(ID, [boilFilled]) };
  if (state === "slots/check") return { item: itemOf(ID, [slotted(CHECK, "S3", 3, { 정답1: "수증기", 서술형1: BOIL_WHY }, boilMore)]) };
  if (state === "preview") return { item: itemOf(ID, [boilFilled]), preview: true, reveal: true };
  if (state === "preview/plain") return { item: itemOf(ID, [boilFilled]), preview: true, reveal: false };
  if (state === "preview/types") {
    const order = ["short", "ox", "pick", "write", "essay", "draw", "photo", "match", "choice"];
    return { item: itemOf(ID, order.map((k) => TYPES[k])), preview: true, reveal: true };
  }
  if (state.startsWith("types/")) return { item: itemOf(ID, [TYPES[state.slice(6)] ?? TYPES.short]) };
  /* 잠긴(승인된) 옛 문항 — 지금 칸을 요약만 한다 */
  if (state === "legacy") return { item: itemOf("IT-2611", [legacyEx], { unit: "지표의 변화", state: "approved" }) };
  /* 그 문항을 「새 버전으로 수정」한 판 — 읽을 때 표시로 옮겨져 온다(실제 저장소와 같은 셈, withSlots) */
  if (state === "legacy/converted") {
    return { item: withSlots(itemOf("IT-2629", [legacyEx], { unit: "지표의 변화", version: 2, revisionOf: "IT-2611" })) };
  }
  return { item: itemOf(ID, [boilFilled]) };
}

export default function ItemSlots({ state }: { state: string }) {
  /* 주소가 바뀌면 화면을 새로 세운다 — 앞 주소에서 고친 것이 다음 상태에 남지 않게 */
  return <Screen key={state} state={state} />;
}

function Screen({ state }: { state: string }) {
  const router = useRouter();
  /* 처음 모습은 한 번만 짓는다 — 그릴 때마다 지으면 고친 것이 없어도 「저장하지 않은 변경」으로 읽힌다 */
  const [start] = useState(() => startOf(state));
  const [item, setItem] = useState(start.item);
  const dirty = item !== start.item;

  const q = item.questions[0];
  const content = contentFor(item);
  const cq = questionsIn(content).find((c) => c.id === q.id);
  const setQ = (next: Question) =>
    setItem((i) => ({ ...i, questions: i.questions.map((x) => (x.id === next.id ? next : x)), type: next.type }));
  const setCq = (next: ContentQuestion) =>
    setItem((i) => ({ ...i, content: patchQuestion(contentFor(i), next.id, () => next), contentAuthored: true }));
  const left = missingSubmit(item);

  return (
    <ConsoleFrame at="/admin2/items" me={author} meHref="/design/admin2/me/author" only={authorMenu}>
      <PageHead
        title={item.code || "문항 ID 미정"}
        back={
          <Link href="/design/admin2/items/preview" className="a2-btn">
            ← 이전으로
          </Link>
        }
        actions={
          <>
            <span className="mr-2 flex items-center gap-1.5" title="승인된 문항만 켜고 끌 수 있습니다">
              <span className="a2-t-xs text-(--a2-ink-4)" aria-hidden>
                사용
              </span>
              <Switch label="사용" on={false} disabled onChange={() => {}} />
            </span>
            <span className="mr-1 flex items-center gap-1.5">
              <span className="a2-t-xs text-(--a2-ink-4)">상태</span>
              <Status tone={itemTone[item.state]}>{stateLabel[item.state]}</Status>
            </span>
            {/* 미리보기 창은 주소로 연다 — 유형마다 보기는 유형 아홉을 한 창에 모은 주소로 */}
            <Link href={to(state.startsWith("types/") ? "preview/types" : "preview")} className="a2-btn">
              미리보기
            </Link>
            <button
              type="button"
              className="a2-btn"
              disabled
              title={left.length > 0 ? `${left.slice(0, 8).join(" · ")}${left.length > 8 ? " …" : ""}이(가) 남았습니다` : undefined}
            >
              검수로 제출
            </button>
          </>
        }
      />
      <Body>
        <div className="grid gap-4">
          <Panel flush>
            <div className="a2-form a2-form-lg a2-card">
              <FormRow label="문항 구성" req>
                <div className="a2-cell-pad flex flex-wrap items-center gap-x-5 gap-y-1">
                  {itemForms.map((f) => (
                    <label key={f.id} className="a2-choice">
                      <input type="radio" name="item-form" checked={item.form === f.id} readOnly />
                      {f.label}
                    </label>
                  ))}
                </div>
              </FormRow>
            </div>
          </Panel>

          {item.form === "single" && (
            <Panel title="분류" flush>
              <div className="a2-form a2-form-lg a2-card">
                <FormRow label="문항 ID">
                  <span className="a2-cell-pad flex items-center a2-mono a2-t-md font-bold text-(--a2-ink)">
                    저장하면 부여됩니다
                  </span>
                </FormRow>
                <BandUnitRows value={item} disabled={false} onChange={(p) => setItem((i) => ({ ...i, ...p }))} />
                <QuestionClassRows q={q} band={item.band} disabled={false} onChange={setQ} />
              </div>
            </Panel>
          )}

          <Panel title="문항" meta={item.form === "set" ? `${item.questions.length}문항` : undefined} flush>
            <div className="a2-form a2-form-lg a2-card">
              <FormRow label="지문">
                <DocBox
                  label="지문"
                  empty="비어 있습니다. 눌러서 문서 편집기로 쓰거나 한글 · 워드 파일을 불러옵니다."
                  disabled={false}
                  filled={false}
                  onOpen={() => {}}
                >
                  {null}
                </DocBox>
              </FormRow>
              {item.form === "single" && (
                <QuestionContentRows
                  q={q}
                  content={cq}
                  disabled={false}
                  onChange={setQ}
                  onContent={setCq}
                  startDoc={start.doc}
                  startGuide={start.guide}
                />
              )}
            </div>
          </Panel>
        </div>
        <PageSaveBar dirty={dirty} onSave={() => {}} onCancel={() => setItem(start.item)} />
      </Body>

      {start.preview && (
        <ItemPreview item={item} startReveal={start.reveal} onClose={() => router.push(to("slots/filled"))} />
      )}
    </ConsoleFrame>
  );
}

/* ───────────────────────── 세트 · 새 버전으로 수정한 판 ───────────────────────── */

/**
 * 세트 문항을 「새 버전으로 수정」한 판 (실제 주소 /admin2/items/IT-2629) — 디자인.
 *
 * 승인된 세트(IT-SET-04 · 영월 한반도 지형)는 예전 답 칸 편집기로 만든 칸(문장 속 괄호 · 이름 붙은 칸 ·
 * 그림 칸)을 가지고 있다. 새 버전은 작성 중 문항이라 **열자마자 표시로 옮겨져 있다**(lib/itemStore.ts의
 * withSlots — 실제 저장소가 읽을 때 쓰는 셈을 그대로 불렀다). 「표시로 바꾸기」를 누를 일이 없다.
 *
 *   목록      지문(보기) · 문항 1~4 — 유형 칸은 표시에서 정해진 형식
 *   문항 1~4  문항 상자의 이름표와 표시마다의 정답 줄. 적어 두었던 정답 · 예시 답 · 밑그림이 그대로다
 *   미리보기  학생 화면 — 괄호 자리 칸 · 이유 칸 · 그림 칸
 *
 * 세트 안의 세트(묶음) 판과 체크리스트 판은 바뀐 것이 없어 뺐다.
 */
const toSet = designLinks("item-slots-set");

const setSeed = seedItem("IT-SET-04")!;
/** 「새 버전으로 수정」 — 실제 reviseApproved가 짓는 꼴(작성 중 · 판 올림 · 서명 풀림) */
const revised: ItemDraft = withSlots({
  ...setSeed,
  id: "IT-2629",
  state: "draft",
  version: setSeed.version + 1,
  revisionOf: setSeed.code || setSeed.id,
  comments: [],
  signedAt: "",
});

export function ItemSlotsSet({ state }: { state: string }) {
  return <SetScreen key={state} state={state} />;
}

function SetScreen({ state }: { state: string }) {
  const router = useRouter();
  const [item, setItem] = useState(revised);
  const dirty = item !== revised;
  const qs = item.questions;
  const content = contentFor(item);
  const open = /^q(\d)$/.exec(state);
  const at = open ? Number(open[1]) - 1 : -1;
  const q = at >= 0 ? qs[at] : null;

  const setQ = (next: Question) =>
    setItem((i) => ({ ...i, questions: i.questions.map((x) => (x.id === next.id ? next : x)) }));
  const setCq = (next: ContentQuestion) =>
    setItem((i) => ({ ...i, content: patchQuestion(contentFor(i), next.id, () => next), contentAuthored: true }));

  const head = (
    <PageHead
      title={q ? `문항 ${at + 1}` : item.code || "문항 ID 미정"}
      back={
        q ? (
          <Link href={toSet()} className="a2-btn">
            ← 문항 목록
          </Link>
        ) : (
          <Link href="/design/admin2/items/preview" className="a2-btn">
            ← 이전으로
          </Link>
        )
      }
      actions={
        q ? (
          <span className="a2-t-xs text-(--a2-ink-4)">
            <span className="a2-mono">{item.code || "문항 ID 미정"}</span> · 세트 {qs.length}문
          </span>
        ) : (
          <>
            <span className="mr-1 flex items-center gap-1.5">
              <span className="a2-t-xs text-(--a2-ink-4)">상태</span>
              <Status tone={itemTone[item.state]}>{stateLabel[item.state]}</Status>
            </span>
            <Link href={toSet("preview")} className="a2-btn">
              미리보기
            </Link>
            <button type="button" className="a2-btn" disabled>
              검수로 제출
            </button>
          </>
        )
      }
    />
  );

  return (
    <ConsoleFrame at="/admin2/items" me={author} meHref="/design/admin2/me/author" only={authorMenu}>
      {head}
      <Body>
        {q ? (
          <div className="grid gap-4">
            <Panel title="분류" flush>
              <p className="a2-note m-4 mb-0">
                <span>
                  문항 ID · 학년 · 교과 단원은 <b>세트 전체</b>가 함께 씁니다. 여기서 고치면 같은 세트의
                  다른 문항에도 그대로 적용됩니다. 그 아래는 이 문항만의 값입니다.
                </span>
              </p>
              <div className="a2-form a2-form-lg a2-card mt-4">
                <FormRow label="문항 ID">
                  <span className="a2-cell-pad flex items-center a2-mono a2-t-md font-bold text-(--a2-ink)">
                    {item.code || "저장하면 부여됩니다"}
                  </span>
                </FormRow>
                <BandUnitRows value={item} disabled={false} onChange={(p) => setItem((i) => ({ ...i, ...p }))} />
                <QuestionClassRows q={q} band={item.band} disabled={false} onChange={setQ} />
              </div>
            </Panel>
            <Panel title="문항" flush>
              <div className="a2-form a2-form-lg a2-card">
                <QuestionContentRows
                  q={q}
                  content={questionsIn(content).find((c) => c.id === q.id)}
                  disabled={false}
                  onChange={setQ}
                  onContent={setCq}
                />
              </div>
            </Panel>
          </div>
        ) : (
          <div className="grid gap-4">
            <Panel flush>
              <div className="a2-form a2-form-lg a2-card">
                <FormRow label="문항 구성" req>
                  <div className="a2-cell-pad flex flex-wrap items-center gap-x-5 gap-y-1">
                    {itemForms.map((f) => (
                      <label key={f.id} className="a2-choice">
                        <input type="radio" name="item-form" checked={item.form === f.id} readOnly />
                        {f.label}
                      </label>
                    ))}
                  </div>
                  <LevelCounts
                    counts={levelCountsOf(qs)}
                    total={qs.length}
                    min={1}
                    max={SET_MAX}
                    allowed={() => false}
                    disabled
                    onChange={() => {}}
                  />
                </FormRow>
              </div>
            </Panel>
            <Panel title="문항" meta={`${qs.length}문항`} flush>
              <div className="a2-form a2-form-lg a2-card">
                <FormRow label="지시문">
                  <input className="a2-input" value={content.material.lead ?? ""} readOnly placeholder="다음을 읽고 물음에 답하시오." />
                </FormRow>
                <FormRow label="보기 · 지문" req>
                  <DocBox label="보기 · 지문" empty="비어 있습니다." disabled={false} filled onOpen={() => {}}>
                    <BlockList blocks={content.material.blocks} />
                  </DocBox>
                </FormRow>
              </div>
              <QuestionList
                questions={qs}
                disabled={false}
                max={SET_MAX}
                onOpen={(id) => router.push(toSet(`q${qs.findIndex((x) => x.id === id) + 1}`))}
                onMove={() => {}}
                onRemove={() => {}}
                onAdd={() => {}}
              />
            </Panel>
          </div>
        )}
        <PageSaveBar dirty={dirty} onSave={() => {}} onCancel={() => setItem(revised)} />
      </Body>

      {state === "preview" && <ItemPreview item={item} onClose={() => router.push(toSet())} />}
    </ConsoleFrame>
  );
}
