"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { itemTone } from "@/lib/admin2";
import { fitSlots } from "@/lib/answerSlots";
import { submitChecklist, type Level } from "@/lib/blueprint";
import { patchQuestion, questionsIn, type Block, type ContentQuestion, type Response } from "@/lib/content";
import { designLinks } from "@/lib/designScreens";
import {
  SET_MAX,
  blankQuestion,
  contentFor,
  gradeLabelOf,
  itemForms,
  levelCountsOf,
  missingSubmit,
  seedItem,
  stateLabel,
  type ItemDraft,
  type Question,
} from "@/lib/itemStore";
import DocBox from "@/components/admin2/DocBox";
import { PageSaveBar } from "@/components/admin2/EditGuard";
import { Body, FormRow, PageHead, Panel, Status, Switch } from "@/components/admin2/ui";
import { BlockList } from "@/components/exam/ExamSession";
import BandUnitRows from "@/app/(admin2)/admin2/items/[id]/BandUnitRows";
import LevelCounts from "@/app/(admin2)/admin2/items/[id]/LevelCounts";
import {
  QuestionClassRows,
  QuestionContentRows,
  QuestionList,
} from "@/app/(admin2)/admin2/items/[id]/QuestionEditor";
import SubmitChecklist from "@/app/(admin2)/admin2/items/[id]/SubmitChecklist";
import ConsoleFrame, { type ConsoleMe } from "../ConsoleFrame";

/**
 * 문항 상세 · 원안지 양식(10.22) 항목 (실제 주소 /admin2/items/[문항]) — 디자인 (2026-10-28 요청).
 *
 * 화면 모양은 그대로 두고, 종이 「Genixx 지필 진단 문항 출제 원안지 양식」(2026-10-22 최종)에서 달라진
 * 항목만 얹은 모습이다 — Tag A의 NCIC · 2022 개정 코드 확인, 그림·삽화 사양, 인정 · 불인정 예, 이 문항의
 * 특성, 열두 줄로 바뀐 제출 전 자가 체크리스트, 고정 배점(S1 · S2 2점 · S3 4점 · S4 6점). 원안지의 빨간
 * 글씨는 칸이 비어 있는 동안만 서고, 값을 넣으면 사라진다.
 *
 *   빈 문항           새 문항 — 칸마다 빨간 안내(「(지우고 사용)」 · 「(수정 사용)」 …)
 *   채운 문항         원안지의 예시 문항(3학년 국어 「빗방울 악단」 S1)을 칸마다 적은 뒤 — 안내가 모두 사라짐
 *   그림 있음         그림 있음을 짚고 아래 확인 칸이 하나 남은 모습 — 체크리스트 마지막 줄에 빨간 경고
 *   체크리스트 확인   열두 줄을 다 짚고 확인한 뒤 — 「검수로 제출」이 켜진다
 *   세트              문항 목록 「문항 1」 ~ 「문항 4」와 목록에서 들어간 문항 1 · 4
 *
 * 화면은 실제 조각(QuestionEditor · SubmitChecklist)이고 값만 여기 적었다. 칸은 실제처럼 고쳐지고 안내 글도
 * 실제처럼 사라지지만 저장되지 않는다 — 주소를 다시 열면 처음 모습이다.
 */

const to = designLinks("item-card");

/** 출제는 출제자 권한을 받은 전문가가 한다 */
const author: ConsoleMe = { name: "최은비", role: "전문가 · 출제자", loginId: "ex.expert_author" };
const authorMenu = ["/admin2/authoring", "/admin2/items"];

/* ───────────────────────── 원안지의 예시 문항 ───────────────────────── */

/** 원안지 ⑦에 적힌 시 — 연마다 한 덩이 */
const POEM: Block[] = [
  { kind: "text", text: "빗방울 악단" },
  { kind: "text", text: "양철 지붕 위에서\n㉠또르르 또르르\n빗방울이 실로폰을 쳐요" },
  { kind: "text", text: "우산 위에서는\n㉡토독토독\n작은 북을 두드려요" },
  { kind: "text", text: "웅덩이에 뛰어들 때는\n㉢퐁당퐁당\n누가 더 크게 노래하나 시합해요" },
  { kind: "text", text: "바람이 지휘봉을 흔들면\n빗방울 악단은\n㉣와르르\n한꺼번에 쏟아져 내려요" },
];

const CHOICES = ["양철 지붕 위", "우산 위", "웅덩이 속", "바람 속", "작은 북 위"];

/** 세트가 함께 쓰는 값 — 3학년 국어 1학기 1단원 「생생하게 표현해요」 */
const PLACE: Partial<ItemDraft> = {
  subject: "국어",
  gradeNo: 3,
  band: "3-4",
  grade: gradeLabelOf(3),
  unit: "생생하게 표현해요",
  unitNo: "01",
  unitTerm: "3-1",
};

const base = seedItem("IT-2603")!;
const blank0 = blankQuestion([], "choice", { level: "S1" });

/** 원안지 「1. 문항 S1」을 칸마다 적은 문항 */
const s1: Question = {
  ...blank0,
  id: "q1",
  type: "choice",
  stem: "윗글에서 빗방울이 ‘작은 북을 두드리는’ 곳으로 알맞은 것은?",
  stemMode: "text",
  choices: CHOICES,
  answer: 1,
  distractorIntent: [
    "시의 첫 장소이자 ‘소리’가 가장 먼저 나오는 곳 — 앞부분만 읽은 학생이 고르기 쉬운 매력적인 오답",
    "",
    "‘퐁당퐁당’이 북소리처럼 들린다고 여길 때 고르는 매력적인 오답",
    "시의 낱말이지만 장소가 아닌 그냥 오답",
    "악기 이름을 장소로 착각할 때 고르는 매력적인 오답",
  ],
  explain:
    "② 우산 위\n▪ 2연에 “우산 위에서는 / 토독토독 / 작은 북을 두드려요”라고 그대로 나와 있다. 시에 적힌 장소와 악기의 짝을 그대로 지목하는 문항으로, 어떤 추론도 필요하지 않다.\n▪ 양철 지붕 위에서는 ‘실로폰’을 치고, 웅덩이에서는 ‘노래’ 시합을 하므로 작은 북과 짝이 되는 곳은 우산 위뿐이다.",
  rubric: "정답 ② 2점, 그 밖의 답 0점(선택형 — 부분점수 없음)",
  acceptExamples: "· 인정할 만한 유사답으로 봐 줄 수 있는 것이 이 지문에 없음",
  rejectExamples: "· ⑤ 작은 북 위 — 악기 이름을 장소로 착각한 답",
  perspectiveHierarchy:
    "‘작은 북을 두드려요’라는 표현과 같은 연에 적힌 장소를 그대로 대응시키는 재능 요소로, 사고 과정 없이 시에 있는 정보를 그대로 찾아내는 수준임(지각 → 변별에서 멈춤)",
  perspectiveAbility: "우산의 원물과 작은 북의 비유를 헷갈리지 않고 바르게 골라내는 정보 변별 능력",
  wrongIntent: "",
  tagAIntent: "시에 쓰인 소리 흉내 말과 그 소리가 나는 장소를 짝지어 찾을 수 있는지 확인한다.",
  ncicChecked: true,
  code2022Checked: true,
  figure: "none",
  figureChecks: [],
  trait: "연마다 장소 · 소리 · 악기가 짝을 이루는 시의 짜임을 그대로 읽어 내는 문항",
  standardCode: "[4국05-01]",
  standardText: "감각적 표현에 주목하며 작품을 감상한다.",
  tagADetail: "감각적 표현(소리 흉내 말) 찾기",
  talent: "LANG",
  subskill: "LANG-01",
  level: "S1",
  b: -1.5,
  points: 2,
};

const EMPTY: Response = { kind: "blanks", blanks: [] };

/** 세트의 S2 ~ S4 — 목록에서 보이는 만큼만 적었다(들어가면 나머지 칸은 빈 원안지 그대로) */
function more(id: string, level: Level, stem: string, extra: Partial<Question>): Question {
  return { ...blankQuestion([s1], "choice", { level }), id, stem, stemMode: "text", ...extra };
}
const s2 = more("q2", "S2", "㉠ ~ ㉣ 가운데 빗방울이 한꺼번에 많이 떨어지는 모습을 나타낸 말은?", {
  type: "choice",
  choices: ["㉠ 또르르 또르르", "㉡ 토독토독", "㉢ 퐁당퐁당", "㉣ 와르르"],
  answer: 3,
  b: -1,
  points: 2,
});
const S3_STEM = "빗방울이 창문을 두드리는 소리를 흉내 내는 말을 한 가지 쓰시오. ( [정답1] )";
const s3 = more("q3", "S3", S3_STEM, { type: "short", b: 1, points: 4 });
const S4_STEM = "이 시에서 빗방울을 ‘악단’에 빗댄 까닭을 시의 내용을 근거로 들어 쓰시오.\n{서술형1}";
const s4 = more("q4", "S4", S4_STEM, { type: "descriptive", b: 1.5, points: 6 });

const nodeOf = (q: Question): ContentQuestion => ({
  id: q.id,
  level: q.level,
  stem: q.stem,
  response:
    q.type === "choice"
      ? { kind: "choice", choices: q.choices, answer: q.answer }
      : fitSlots(q.stem, { response: EMPTY, answers: [] }, q.type === "short" ? { 정답1: "타닥타닥, 톡톡" } : {})
          .response,
});

function itemOf(qs: Question[], over: Partial<ItemDraft> = {}): ItemDraft {
  const set = qs.length > 1;
  return {
    ...base,
    ...PLACE,
    id: "IT-2702",
    code: "",
    state: "draft",
    form: set ? "set" : "single",
    stem: qs[0].stem,
    type: qs[0].type,
    passage: "",
    passageMode: "text",
    passageImages: [],
    questions: qs,
    content: {
      id: "IT-2702",
      material: {
        lead: set ? "※(1~4) 다음 글을 읽고 물음에 답하시오." : "다음 글을 읽고 물음에 답하시오.",
        blocks: POEM,
      },
      nodes: qs.map(nodeOf),
    },
    contentAuthored: true,
    reviews: [],
    comments: [],
    checks: [],
    signedAt: "",
    signedBy: "",
    guidance: "",
    reviewRequest: "",
    ...over,
  } as ItemDraft;
}

/** 아무것도 적지 않은 새 문항 — 지문도 비었다 */
const blankItem: ItemDraft = {
  ...itemOf([{ ...blank0, id: "q1" }]),
  content: {
    id: "IT-2702",
    material: { blocks: [] },
    nodes: [{ id: "q1", level: "S1", stem: "", response: EMPTY }],
  },
};

const allChecks = submitChecklist.map((c) => c.id);

function startOf(state: string): ItemDraft {
  if (state === "filled") return itemOf([s1]);
  if (state === "figure") {
    return itemOf([{ ...s1, figure: "has", figureChecks: ["fig-text", "fig-own"] }], {
      checks: allChecks.filter((id) => id !== "c12-figure"),
    });
  }
  if (state === "checked") {
    return itemOf([s1], { checks: allChecks, signedAt: "2026-10-28 10:20", signedBy: author.name });
  }
  if (state.startsWith("set")) return itemOf([s1, s2, s3, s4]);
  return blankItem;
}

export default function ItemCard({ state }: { state: string }) {
  /* 주소가 바뀌면 화면을 새로 세운다 — 앞 주소에서 고친 것이 다음 상태에 남지 않게 */
  return <Screen key={state} state={state} />;
}

function Screen({ state }: { state: string }) {
  const router = useRouter();
  const [start] = useState(() => startOf(state));
  const [item, setItem] = useState(start);
  const dirty = item !== start;
  const qs = item.questions;
  const content = contentFor(item);
  const open = /^set\/q(\d)$/.exec(state);
  const at = open ? Number(open[1]) - 1 : -1;

  const setAny = (patch: Partial<ItemDraft>) => setItem((i) => ({ ...i, ...patch }));
  const setQ = (next: Question) =>
    setItem((i) => ({ ...i, questions: i.questions.map((x) => (x.id === next.id ? next : x)) }));
  const setCq = (next: ContentQuestion) =>
    setItem((i) => ({ ...i, content: patchQuestion(contentFor(i), next.id, () => next), contentAuthored: true }));
  const cqOf = (id: string) => questionsIn(content).find((c) => c.id === id);
  const left = missingSubmit(item);
  const idRow = (
    <FormRow label="문항 ID">
      <span className="a2-cell-pad flex items-center a2-mono a2-t-md font-bold text-(--a2-ink)">
        저장하면 부여됩니다
      </span>
    </FormRow>
  );

  const head = (
    <PageHead
      title={at >= 0 ? `문항 ${at + 1}` : "문항 ID 미정"}
      back={
        at >= 0 ? (
          <Link href={to("set")} className="a2-btn">
            ← 문항 목록
          </Link>
        ) : (
          <Link href="/design/admin2/items/preview" className="a2-btn">
            ← 이전으로
          </Link>
        )
      }
      actions={
        at >= 0 ? (
          <span className="a2-t-xs text-(--a2-ink-4)">
            <span className="a2-mono">문항 ID 미정</span> · 세트 {qs.length}문
          </span>
        ) : (
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
            <button type="button" className="a2-btn">
              미리보기
            </button>
            <button
              type="button"
              className="a2-btn"
              disabled={left.length > 0}
              title={
                left.length > 0
                  ? `${left.slice(0, 8).join(" · ")}${left.length > 8 ? " …" : ""}이(가) 남았습니다`
                  : undefined
              }
            >
              검수로 제출
            </button>
          </>
        )
      }
    />
  );

  /* 세트에서 들어간 문항 하나 */
  if (at >= 0) {
    const q = qs[at];
    return (
      <ConsoleFrame at="/admin2/items" me={author} meHref="/design/admin2/me/author" only={authorMenu}>
        {head}
        <Body>
          <div className="grid gap-4">
            <Panel title="분류" flush>
              <p className="a2-note m-4 mb-0">
                <span>
                  문항 ID · 학년 · 교과 단원은 <b>세트 전체</b>가 함께 씁니다. 여기서 고치면 같은 세트의 다른
                  문항에도 그대로 적용됩니다. 그 아래는 이 문항만의 값입니다.
                </span>
              </p>
              <div className="a2-form a2-form-lg a2-card mt-4">
                {idRow}
                <BandUnitRows value={item} disabled={false} onChange={setAny} />
                <QuestionClassRows q={q} band={item.band} disabled={false} onChange={setQ} />
              </div>
            </Panel>
            <Panel title="문항" flush>
              <div className="a2-form a2-form-lg a2-card">
                <QuestionContentRows q={q} content={cqOf(q.id)} disabled={false} onChange={setQ} onContent={setCq} />
              </div>
            </Panel>
          </div>
          <PageSaveBar dirty={dirty} onSave={() => {}} onCancel={() => setItem(start)} />
        </Body>
      </ConsoleFrame>
    );
  }

  const passageFilled = !!content.material.lead || content.material.blocks.length > 0;

  return (
    <ConsoleFrame at="/admin2/items" me={author} meHref="/design/admin2/me/author" only={authorMenu}>
      {head}
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
                {item.form === "set" && (
                  <LevelCounts
                    counts={levelCountsOf(qs)}
                    total={qs.length}
                    min={1}
                    max={SET_MAX}
                    allowed={() => false}
                    disabled
                    onChange={() => {}}
                  />
                )}
              </FormRow>
            </div>
          </Panel>

          {item.form === "single" && (
            <Panel title="분류" flush>
              <div className="a2-form a2-form-lg a2-card">
                {idRow}
                <BandUnitRows value={item} disabled={false} onChange={setAny} />
                <QuestionClassRows q={qs[0]} band={item.band} disabled={false} onChange={setQ} />
              </div>
            </Panel>
          )}

          <Panel title="문항" meta={item.form === "set" ? `${qs.length}문항` : undefined} flush>
            <div className="a2-form a2-form-lg a2-card">
              {item.form === "set" ? (
                <>
                  <FormRow label="지시문">
                    <input className="a2-input" value={content.material.lead ?? ""} readOnly />
                  </FormRow>
                  <FormRow label="보기 · 지문" req>
                    <DocBox label="보기 · 지문" empty="비어 있습니다." disabled={false} filled onOpen={() => {}}>
                      <BlockList blocks={content.material.blocks} />
                    </DocBox>
                  </FormRow>
                </>
              ) : (
                <FormRow label="지문">
                  <DocBox
                    label="지문"
                    empty="비어 있습니다. 눌러서 문서 편집기로 쓰거나 한글 · 워드 파일을 불러옵니다."
                    disabled={false}
                    filled={passageFilled}
                    onOpen={() => {}}
                  >
                    {content.material.lead && <p className="a2-docbox-lead">{content.material.lead}</p>}
                    <BlockList blocks={content.material.blocks} />
                  </DocBox>
                </FormRow>
              )}
              {item.form === "single" && (
                <QuestionContentRows
                  q={qs[0]}
                  content={cqOf(qs[0].id)}
                  disabled={false}
                  onChange={setQ}
                  onContent={setCq}
                />
              )}
            </div>
            {item.form === "set" && (
              <QuestionList
                questions={qs}
                disabled={false}
                max={SET_MAX}
                onOpen={(id) => router.push(to(`set/q${qs.findIndex((x) => x.id === id) + 1}`))}
                onMove={() => {}}
                onRemove={() => {}}
                onAdd={() => {}}
              />
            )}
          </Panel>

          <SubmitChecklist item={item} signer={author.name} unsigned={false} disabled={false} onChange={setAny} />
        </div>
        <PageSaveBar dirty={dirty} onSave={() => {}} onCancel={() => setItem(start)} />
      </Body>
    </ConsoleFrame>
  );
}
