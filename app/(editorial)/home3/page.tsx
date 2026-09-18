import type { Metadata } from "next";
import Link from "next/link";
import Photo from "@/components/home3/Photo";
import TalentWheel from "@/components/home3/TalentWheel";
import { assessment, questionCountText, subjects, totalQuestions } from "@/lib/exam";
import { axes, primaryTypes } from "@/lib/result";

export const metadata: Metadata = {
  /* 루트 레이아웃의 template("%s | GENIXX")가 뒤를 붙인다 */
  title: "아이의 재능은 성적표 밖에 있습니다",
  description:
    "초등 3~4학년 재능 진단 TalentMe. 국어·수학·과학 답안과 보호자·교사의 관찰을 AI가 먼저 읽고, 한국창의영재교육원 전문가 40인이 판정을 확정합니다. 2026 파일럿은 무료입니다.",
};

/* ─────────────────────────────────────────────────────────────
   세 번째 시안 — 잡지의 문법으로.

   /와 /home2는 남색·고딕·각진 선의 「플랫폼」 화면이다. 이 시안은 그 반대편에
   선다. 종이색 바탕, 명조 제목, 테라코타 한 색, 크게 둥근 사진. 학부모가
   읽는 것은 제품 소개가 아니라 **아이에 관한 특집 기사 한 편**이어야 한다는
   생각에서다. 글꼴·색·헤더·푸터까지 전부 (editorial) 존 안에서만 정의한다 —
   app/(editorial)/home3.css 참조.

   ───── 차례 ─────
   첫 장    제목 한 줄, 큰 사진 한 장, 사진 위에 받게 될 리포트의 첫 줄
   숫자 넷  잡지의 「이 기사에서」 칸처럼 — 40 · 8 · 30 · 0
   who      이런 말을 하고 계시다면 — 학부모·교사가 하는 말 셋
   what     학력과 재능을 따로 잰다 — 여덟 갈래 고리(TalentWheel)
   experts  누가 판정하는가 — 어두운 녹색 장, 큰 숫자 40
   hidden   영재 판별이 아니다 — 4분면과 헌장 인용
   how      절차 — 세로 연대기
   report   리포트에 담기는 것
   programs 프로그램 넷
   faq      자주 묻는 질문
   마지막   테라코타 띠

   ───── 사실의 출처 ─────
   문항 수·시간·회차·마감은 lib/exam, 여덟 갈래와 유형 이름은 lib/result에서
   읽는다. 글로 박아 둔 숫자가 코드와 어긋나지 않게 하려는 것이다.

   ⚠ 「한국창의영재교육원 전문가 40인 — 영재학교 교수진, 교장·교감 출신 교육자」는
     2026-08-23 의뢰인의 설명에서 가져온 것으로, 저장소의 다른 화면에는 아직 근거
     문서가 없다. 개인 이름·이력은 적지 않고 기관·구성 단위로만 적는다.
   ⚠ 후기·응시 인원 실적·금액은 싣지 않는다. 2026 파일럿은 접수 중이라 셀 실적이
     없고, 정식 요금은 파일럿 뒤에 공지하기로 되어 있다.
   ⚠ 「영재」는 기관 이름과 「영재를 가려내는 검사가 아니다」는 부정문에서만 쓴다.
     아이를 가리키는 말로는 쓰지 않는다 — 윤리 헌장 제7조.
   ───────────────────────────────────────────────────────────── */

const deadline = (() => {
  const [y, m, d] = assessment.deadline.split("-").map(Number);
  return `${y}년 ${m}월 ${d}일`;
})();
const subjectNames = subjects.map((s) => s.short).join("·");
const limitMin = subjects[0].limitMin;
const measuredAxes = axes.filter((a) => a.subject);
const sampleType = primaryTypes.language;

/** 숫자 넷 — 제품 사실만. 실적처럼 보이는 수는 두지 않는다 */
const figures = [
  { n: "40", unit: "인", l: "한국창의영재교육원의 출제·평가 전문가" },
  { n: String(axes.length), unit: "갈래", l: `재능 좌표. 2026년에는 ${measuredAxes.length}갈래를 먼저 잽니다` },
  {
    n: String(totalQuestions()),
    unit: "문항",
    l: `${questionCountText()}, 과목당 ${limitMin}분`,
  },
  { n: "0", unit: "원", l: "2026 파일럿 전면 무료, 결제 수단 등록 없음" },
];

/** 이런 말을 하고 계시다면 — 가상의 말이다. 특정인의 후기가 아니다 */
const voices = [
  {
    say: "점수는 평범한데, 집에서는 끝없이 만들고 묻고 설명해요.",
    who: "성적으로는 설명되지 않는 아이의 보호자",
    then: "그 모습을 점수가 아니라 좌표로 적어 드립니다. 시험지에는 없던 자리가 보입니다.",
  },
  {
    say: "영재원을 준비하는데, 근거가 될 만한 게 없어요.",
    who: "심화 과정을 준비하기 전에 근거가 필요한 보호자",
    then: "여덟 갈래 좌표와 전문가 확정 소견을 준비의 근거 자료로 쓰실 수 있습니다.",
  },
  {
    say: "반 아이들을 한 명씩 들여다볼 시간이 없어요.",
    who: "학급을 맡은 교사, 학교와 기관",
    then: "파일럿에 참여하는 학교·기관에는 학급·학년 단위 집단 리포트를 드립니다.",
  },
];

/** 전문가단이 지키는 넷 — /about/hitl의 「사람이 반드시 개입하는 지점」과 같다 */
const safeguards = [
  { t: "출제한 사람과 검수한 사람이 다릅니다", d: "문항은 별도 인력이 교차 검수한 뒤에야 은행에 올라갑니다." },
  { t: "확신이 낮은 답은 사람이 다시 봅니다", d: "AI 채점 확신도가 낮은 응답은 자동으로 전문가에게 넘어갑니다." },
  { t: "경계선은 확정하지 않습니다", d: "애매한 사례는 판정을 미루고 다음 회차에 다시 관찰합니다." },
  { t: "확정 전에는 아무것도 보이지 않습니다", d: "전문가가 리포트를 승인하기 전에는 보호자 화면에 어떤 결과도 나오지 않습니다." },
];

/** 학력 × 재능 4분면 — 기존 첫 화면과 같은 이름·같은 자리 */
const quadrants = [
  { coord: "재능 높음 · 학력 낮음", t: "발현 기회", d: "성적에 가려져 있던 강점. 기회를 주면 가장 크게 자랍니다.", key: true },
  { coord: "재능 높음 · 학력 높음", t: "강점 확증", d: "두 축이 함께 높습니다. 심화 과제로 상한을 올릴 때입니다." },
  { coord: "재능 낮음 · 학력 낮음", t: "미발현", d: "'없다'가 아니라 '아직 관찰되지 않았다'로 읽습니다." },
  { coord: "재능 낮음 · 학력 높음", t: "성장 과제", d: "학습은 되는데 재능 축이 아직입니다. 다른 조건을 만들어 봅니다." },
];

const steps = [
  {
    t: "가입하고 아이를 등록합니다",
    d: "보호자 계정에 아이를 등록하면 8자리 접속코드가 나옵니다. 아이는 그 코드와 생년월일로 들어갑니다.",
    meta: "회원가입 즉시",
  },
  {
    t: "세 과목을 풉니다",
    d: `${questionCountText()}. 과목마다 따로 접속하고, 하루에 한 과목씩 나눠 봐도 됩니다.`,
    meta: `과목당 ${limitMin}분`,
  },
  {
    t: "집과 교실에서 본 모습을 적습니다",
    d: "보호자와 지도교사의 관찰 설문입니다. 건너뛰어도 진단은 진행되지만, 학생 응답만으로 판정하게 되어 리포트 신뢰도 표기가 '참고'로 낮아집니다.",
    meta: "선택",
  },
  {
    t: "전문가가 확정한 뒤 리포트가 열립니다",
    d: "AI 1차 분석 뒤 케이스 회의에서 판정을 확정합니다. 확정 전에는 어떤 결과도 보이지 않습니다.",
    meta: "1차 분석은 1~2일",
  },
];

/** 리포트에 담기는 것 — 결과 화면(components/exam/ResultView)의 실제 구성 순서 */
const reportParts = [
  { t: "재능 유형과 신뢰도", d: "이번 회차에 관찰된 행동의 요약. 아이를 규정하는 이름이 아니라서 회차가 바뀌면 바뀔 수 있습니다." },
  { t: "여덟 갈래 좌표", d: "2026년에 잰 세 갈래는 값으로, 아직 안 잰 다섯 갈래는 빈 자리로 그대로 둡니다." },
  { t: "과목별 응시 결과", d: "객관식 정답과 서술형 답안, 환산 점수." },
  { t: "앞으로의 방향", d: "내일부터 집에서 바꿔 볼 것. 분량이 아니라 매일 할 수 있는 크기로 적습니다." },
  { t: "전문가 확정 코멘트", d: "반영한 정보원 수와 확정 시각이 함께 적힙니다." },
];

const programs = [
  {
    name: "학력진단",
    what: `${questionCountText()}으로 지금 어디까지 이해하고 있는지 봅니다.`,
    when: "2026 파일럿 · 무료",
    live: true,
    href: "/service/academic",
  },
  {
    name: "재능진단",
    what: "지필 답안과 관찰 설문을 교차해 여덟 갈래 중 셋을 잽니다. 전문가가 확정합니다.",
    when: "2026 파일럿 포함",
    live: true,
    href: "/service/talent-base",
  },
  {
    name: "심화진단",
    what: "지필로 재기 어려운 나머지 갈래를 수행 과제로 잽니다.",
    when: "2027 예정",
    live: false,
    href: "/service/talent-advanced",
  },
  {
    name: "성장추적",
    what: "연 4회 회차마다 같은 좌표를 다시 재어 변화를 그립니다.",
    when: "정식 서비스 예정",
    live: false,
    href: "/service/tracking",
  },
];

const faqs = [
  {
    q: "초등 3학년도 볼 수 있나요?",
    a: "네. 2026 파일럿 회차는 초등 3~4학년을 대상으로 합니다. 이후 학년은 문항 이독성 검증을 마친 뒤 순차적으로 넓힙니다.",
  },
  {
    q: "정말 무료인가요?",
    a: "네. 2026 파일럿 회차는 전면 무료이고, 결제 수단을 등록하지 않으며, 자동으로 유료 전환되지 않습니다. 정식 서비스 요금은 파일럿이 끝난 뒤 확정해 공지합니다.",
  },
  {
    q: "결과는 언제 나오나요?",
    a: "세 과목을 모두 제출하면 AI 1차 분석이 1~2일 안에 끝나고, 그 뒤 전문가 협진 판정과 리포트 승인을 거쳐 열립니다. 전문가가 확정하기 전에는 어떤 결과도 보이지 않습니다.",
  },
  {
    q: "등급이나 석차가 나오나요?",
    a: "아니요. 줄 세우지 않습니다. 또래 서열 대신 발달 단계에 견준 위치와, 이번 회차에 관찰된 행동을 문장으로 적습니다.",
  },
  {
    q: "보호자 설문은 꼭 해야 하나요?",
    a: "아니요, 선택입니다. 설문 없이도 진단은 진행됩니다. 다만 학생 응답만으로 판정하게 되어 리포트의 신뢰도 표기가 '참고'로 낮아집니다.",
  },
  {
    q: "아이의 답안은 누가 보나요?",
    a: "보호자와 채점·판정을 맡은 전문가뿐입니다. 전문가가 열람할 때는 사유를 적어야 하고 모든 열람이 기록으로 남습니다.",
  },
];

/** 장 머리 — 작은 이름표와 명조 제목. 잡지의 장 제목처럼 */
function Chapter({
  label,
  title,
  lead,
  center = false,
  dark = false,
}: {
  label: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  center?: boolean;
  dark?: boolean;
}) {
  return (
    <div className={`max-w-3xl ${center ? "mx-auto text-center" : ""}`}>
      <p className="ed-eyebrow">{label}</p>
      <h2 className={`ed-h2 mt-4 ${dark ? "text-(--paper)" : "text-(--ink)"}`}>{title}</h2>
      {lead && (
        <p className={`ed-lead mt-6 max-w-2xl ${center ? "mx-auto" : ""} ${dark ? "text-(--paper-2)" : "text-(--ink-2)"}`}>
          {lead}
        </p>
      )}
    </div>
  );
}

function Pill({ text, live }: { text: string; live: boolean }) {
  return (
    <span
      className={`ed-small inline-block self-start rounded-full px-3 py-1 font-bold ${
        live ? "bg-(--accent) text-(--paper)" : "border border-(--ink-2) text-(--ink-2)"
      }`}
    >
      {text}
    </span>
  );
}

export default function Home3() {
  return (
    <>
      {/* ───── 첫 장 ─────
          제목 한 줄을 가운데 세우고 그 아래 사진 한 장. 사진 오른쪽 아래에 받게 될
          리포트의 첫 줄을 종이 카드로 얹는다 — 제품 화면을 통째로 보여 주는 대신
          기사 속 「도판」처럼 한 장만. */}
      <section className="ed-wrap pt-16 pb-10 lg:pt-24 lg:pb-14">
        <div className="mx-auto max-w-4xl text-center">
          <p className="ed-eyebrow">
            {assessment.name} · 초등 3~4학년 재능 진단 · {assessment.round} 접수 중
          </p>
          <h1 className="ed-display mt-6 text-(--ink)">
            아이의 재능은
            <br />
            성적표 밖에 있습니다.
          </h1>
          <p className="ed-lead mx-auto mt-7 max-w-[44rem] text-(--ink-2)">
            {subjectNames} 답안과 보호자·교사가 본 모습을 AI가 먼저 읽고, 한국창의영재교육원의 전문가
            40인이 판정을 확정합니다. 2026 파일럿은 무료입니다.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/exam" className="ed-btn ed-btn-accent">
              무료로 진단 시작
            </Link>
            <Link href="/sample/report" className="ed-btn ed-btn-ink">
              샘플 리포트 읽기
            </Link>
          </div>
          <p className="ed-small mt-5 text-(--ink-2)">
            회원가입 즉시 응시 · 과목당 {limitMin}분 · 접수 마감 {deadline}
          </p>
        </div>

        <figure className="mt-12 lg:mt-16">
          {/* 카드의 bottom 기준은 사진이어야 한다 — figcaption까지 같은 상자에 두면
              캡션 높이만큼 카드가 사진 아래로 삐져나온다 */}
          <div className="relative">
            <Photo
              name="promo-catalyst"
              alt="거실 바닥에 엎드려 자기가 만든 그림책을 소리 내어 읽고 있는 초등학생"
              ratio="aspect-[4/3] sm:aspect-[16/9] lg:aspect-[21/9]"
              sizes="(max-width: 1200px) 100vw, 1200px"
              radius="rounded-[1.75rem] lg:rounded-[2.5rem]"
              preload
            />

            {/* 받게 될 리포트의 첫 줄 — 값은 샘플이다. 좁은 화면에서는 사진 아래로
                내려앉는다. 사진 위에 얹으면 사진이 카드에 가려 남는 게 없다. */}
            <Link
              href="/sample/report"
              className="mt-4 block rounded-2xl bg-(--paper) p-4 shadow-[0_18px_50px_-24px_rgba(28,26,22,.45)] transition-transform hover:-translate-y-0.5 sm:absolute sm:right-6 sm:bottom-6 sm:mt-0 sm:max-w-sm sm:p-5 lg:right-8 lg:bottom-8"
            >
              <span className="ed-small flex items-center justify-between gap-3 text-(--ink-2)">
                <span>재능 지도 · {assessment.round}</span>
                <span className="rounded-full bg-(--paper-3) px-2 py-0.5 text-[11px] font-bold text-(--ink)">샘플</span>
              </span>
              <span className="ed-h3 mt-2 block text-(--ink)">{sampleType.name}형</span>
              <span className="ed-small mt-1 block text-(--ink-2)">{sampleType.tagline}</span>
              <span className="mt-3 flex flex-wrap gap-1.5">
                {["언어 88", "자연·탐구 81"].map((t) => (
                  <span key={t} className="rounded-full bg-(--accent) px-2.5 py-0.5 text-[11px] font-bold text-(--paper)">
                    {t}
                  </span>
                ))}
                <span className="rounded-full border border-dashed border-(--ink-2) px-2.5 py-0.5 text-[11px] font-bold text-(--ink-2)">
                  5갈래 · 2027
                </span>
              </span>
            </Link>
          </div>
          <figcaption className="ed-small mt-4 text-(--ink-2)">
            시키지 않아도 하는 일에서 재능이 드러납니다. 이 진단은 그 자리를 찾으러 갑니다.
          </figcaption>
        </figure>
      </section>

      {/* ───── 숫자 넷 ───── 잡지의 「이 기사에서」 칸 */}
      <section className="ed-wrap pb-6 lg:pb-10">
        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {figures.map((f) => (
            <li key={f.l} className="rounded-2xl bg-(--paper-2) p-6 lg:p-7">
              <p className="ed-num text-(--accent)">
                {f.n}
                <span className="ed-serif ml-1 text-[0.38em] font-bold text-(--ink)">{f.unit}</span>
              </p>
              <p className="ed-small mt-3 text-(--ink-2)">{f.l}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ───── who ───── 학부모·교사가 하는 말 셋. 가상의 말이다 — 특정인의 후기가 아니다 */}
      <section id="who" className="ed-band scroll-mt-20">
        <div className="ed-wrap">
          <Chapter
            label="누구를 위해"
            title={
              <>
                이런 말을 하고 계시다면,
                <br />그 아이를 위한 진단입니다.
              </>
            }
            lead="2026 파일럿 1회차는 초등 3~4학년이 대상입니다. 이후 학년은 문항 이독성 검증을 마친 뒤 순서대로 넓힙니다."
          />

          <ol className="mt-12 grid gap-5 lg:grid-cols-3">
            {voices.map((v) => (
              <li key={v.who} className="flex flex-col rounded-[1.5rem] border border-(--line) p-7 lg:p-8">
                {/* 순서가 없는 셋이라 번호를 붙이지 않는다. 여는 따옴표를 크게 걸어 둔다 */}
                <span aria-hidden className="ed-serif -mb-6 text-6xl leading-none text-(--accent)">
                  &ldquo;
                </span>
                <p className="ed-quote mt-5 text-(--ink)">{v.say}&rdquo;</p>
                <p className="ed-small mt-5 font-bold text-(--ink-2)">{v.who}</p>
                <p className="ed-body mt-3 text-(--ink-2)">{v.then}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ───── what ───── 여덟 갈래 고리 */}
      <section id="what" className="ed-band scroll-mt-20 bg-(--paper-2)">
        <div className="ed-wrap grid items-center gap-12 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)] lg:gap-20">
          <div>
            <Chapter
              label="무엇을 재나"
              title={
                <>
                  학력과 재능을
                  <br />
                  따로 잽니다.
                </>
              }
              lead="점수가 높아서 재능이 있는 것도, 낮아서 없는 것도 아닙니다. 학력은 세 과목 답안으로, 재능은 여덟 갈래 좌표로 따로 재어 겹쳐 봅니다."
            />
            <ul className="mt-10 space-y-4">
              {axes.map((a) => {
                const live = Boolean(a.subject);
                return (
                  <li key={a.id} className="flex items-baseline gap-4 border-b border-(--line) pb-4">
                    <span
                      aria-hidden
                      className={`mt-1 h-3 w-3 shrink-0 translate-y-0.5 rounded-full ${
                        live ? "bg-(--accent)" : "border border-dashed border-(--ink-2)"
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className={`ed-serif text-lg font-bold ${live ? "text-(--ink)" : "text-(--ink-2)"}`}>
                        {a.label}
                      </span>
                      <span className="ed-small block text-(--ink-2) sm:ml-2 sm:inline">{a.desc}</span>
                    </span>
                    <span className="ed-small shrink-0 text-(--ink-2)">{live ? "2026" : "2027"}</span>
                  </li>
                );
              })}
            </ul>
            <p className="ed-small mt-5 text-(--ink-2)">
              빈 갈래는 &lsquo;없음&rsquo;이 아니라 &lsquo;아직 재지 않음&rsquo;입니다. 나머지 다섯 갈래는 2027
              심화진단에서 수행 과제로 잽니다.
            </p>
          </div>

          {/* 폰에서는 틀의 여백까지 써서 고리를 화면 폭에 꽉 채운다 — 그래야 이름표가 12px 위로 올라온다 */}
          <div className="mx-auto w-full max-w-[520px] max-sm:-mx-5 max-sm:w-[calc(100%+2.5rem)]">
            <TalentWheel />
          </div>
        </div>
      </section>

      {/* ───── experts ───── 이 화면의 유일한 어두운 장. 숫자 40이 제목이다 */}
      <section id="experts" className="ed-band scroll-mt-20 bg-(--moss) text-(--paper)">
        <div className="ed-wrap">
          <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
            <div>
              <p className="ed-eyebrow text-(--paper-3)">누가 판정하나</p>
              <p className="ed-num mt-5 text-(--paper)">
                40
                <span className="ed-serif ml-2 text-[0.36em] font-bold">인의 전문가</span>
              </p>
              <h2 className="ed-h2 mt-6 text-(--paper)">
                출제부터 판정까지,
                <br />
                같은 전문가단이 맡습니다.
              </h2>
              <p className="ed-lead mt-6 max-w-2xl text-(--paper-2)">
                한국창의영재교육원의 전문가 40인이 문항 출제와 평가에 참여합니다. 영재학교 교수진과 교장·교감
                출신 현장 교육자로 구성되며, AI는 1차 분석까지만 하고 판정은 케이스 회의에서 사람이
                확정합니다.
              </p>
              <Link
                href="/about/hitl"
                className="ed-small mt-6 inline-block font-bold text-(--paper) underline decoration-(--moss-line) underline-offset-4 hover:decoration-(--paper)"
              >
                협진 절차 자세히 읽기
              </Link>
            </div>

            <Photo
              name="promo-expert"
              alt="회의실 테이블에 둘러앉아 출력된 자료의 한 줄을 짚으며 논의하는 교육 전문가들"
              ratio="aspect-[4/3]"
              sizes="(max-width: 1024px) 100vw, 480px"
              radius="rounded-[1.75rem]"
            />
          </div>

          <ol className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {safeguards.map((s) => (
              <li key={s.t} className="rounded-2xl bg-(--moss-2) p-6">
                <h3 className="ed-h3 text-(--paper)">{s.t}</h3>
                <p className="ed-body mt-2 text-(--paper-2)">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ───── hidden ───── 영재 판별이 아니다 */}
      <section id="hidden" className="ed-band scroll-mt-20">
        <div className="ed-wrap">
          <Chapter
            center
            label="무엇을 찾나"
            title={
              <>
                영재를 가려내는 검사가 아니라,
                <br className="hidden sm:block" />{" "}
                숨은 재능을 찾는 검사입니다.
              </>
            }
            lead="학력과 재능을 겹쳐 놓으면 네 자리가 생깁니다. 이 진단이 가장 먼저 찾는 것은 왼쪽 위, 성적에 가려져 있던 자리입니다."
          />

          <div className="mx-auto mt-12 grid max-w-4xl grid-cols-2 gap-3 sm:gap-4">
            {quadrants.map((q) => (
              <div
                key={q.t}
                className={`rounded-[1.5rem] p-5 sm:p-7 ${
                  q.key ? "bg-(--accent) text-(--paper)" : "bg-(--paper-2) text-(--ink)"
                }`}
              >
                <p className={`ed-small ${q.key ? "text-(--paper)" : "text-(--ink-2)"}`}>{q.coord}</p>
                <p className="ed-h3 mt-2">{q.t}</p>
                <p className={`ed-small mt-2 ${q.key ? "text-(--paper)" : "text-(--ink-2)"}`}>{q.d}</p>
              </div>
            ))}
          </div>

          <blockquote className="mx-auto mt-16 max-w-3xl text-center">
            <span aria-hidden className="ed-serif block text-6xl leading-none text-(--accent)">
              &ldquo;
            </span>
            <p className="ed-quote -mt-3 text-(--ink)">
              발현되지 않은 재능은 진단할 수 없습니다. 점수가 낮은 영역은 약점이 아니라 아직 발현되지 않은
              영역입니다.
            </p>
            <footer className="ed-small mt-5 text-(--ink-2)">
              진단 윤리 헌장 제7조 · 라벨링 방지 ·{" "}
              <Link href="/about/charter" className="font-bold text-(--accent) underline underline-offset-4">
                전문 읽기
              </Link>
            </footer>
          </blockquote>
        </div>
      </section>

      {/* ───── how ───── 세로 연대기 */}
      <section id="how" className="ed-band scroll-mt-20 bg-(--paper-2)">
        <div className="ed-wrap grid gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Chapter
              label="절차"
              title="신청부터 리포트까지, 네 걸음."
              lead="한 번에 몰아 하지 않습니다. 과목은 따로따로, 설문은 시간이 날 때, 판정은 사람이 확정할 때까지 기다립니다."
            />
            <Link href="/exam" className="ed-btn ed-btn-accent mt-8">
              무료로 진단 시작
            </Link>
          </div>

          <ol className="relative border-l-2 border-(--accent) pl-8 sm:pl-12">
            {steps.map((s, i) => (
              <li key={s.t} className="relative pb-12 last:pb-0">
                <span
                  aria-hidden
                  className="absolute top-1 -left-[calc(2rem+9px)] h-4 w-4 rounded-full border-[3px] border-(--accent) bg-(--paper-2) sm:-left-[calc(3rem+9px)]"
                />
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="ed-index">{String(i + 1).padStart(2, "0")}</span>
                  <span className="ed-small font-bold text-(--ink-2)">{s.meta}</span>
                </div>
                <h3 className="ed-h3 mt-2 text-(--ink)">{s.t}</h3>
                <p className="ed-body mt-2 max-w-xl text-(--ink-2)">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ───── report ───── */}
      <section id="report" className="ed-band scroll-mt-20">
        <div className="ed-wrap grid items-center gap-12 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)] lg:gap-20">
          <Photo
            name="promo-parent-worry"
            alt="식탁에서 아이가 펼친 공책을 함께 들여다보는 보호자와 초등학생"
            ratio="aspect-[4/3]"
            sizes="(max-width: 1024px) 100vw, 560px"
            radius="rounded-[1.75rem] lg:rounded-[2.5rem]"
          />
          <div>
            <Chapter
              label="리포트"
              title={
                <>
                  등급표가 아니라,
                  <br />
                  내일 할 일입니다.
                </>
              }
            />
            <ol className="mt-8 divide-y divide-(--line) border-y border-(--line)">
              {reportParts.map((p, i) => (
                <li key={p.t} className="grid grid-cols-[3rem_1fr] gap-x-3 py-4">
                  <span className="ed-index">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <h3 className="ed-serif text-base font-bold text-(--ink)">{p.t}</h3>
                    <p className="ed-small mt-1 text-(--ink-2)">{p.d}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Link href="/sample/report" className="ed-btn ed-btn-ink mt-8">
              샘플 리포트 읽기
            </Link>
          </div>
        </div>
      </section>

      {/* ───── programs ───── */}
      <section id="programs" className="ed-band scroll-mt-20 bg-(--paper-2)">
        <div className="ed-wrap">
          <Chapter
            label="프로그램"
            title={
              <>
                무료 학력진단에서 시작해,
                <br />
                회차마다 좌표를 다시 잽니다.
              </>
            }
            lead="지금 되는 것과 나중에 열리는 것을 같은 자리에 적습니다. 정식 서비스 요금은 파일럿이 끝난 뒤 공지합니다."
          />

          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {programs.map((p) => (
              <li key={p.name} className="flex flex-col rounded-[1.5rem] bg-(--paper) p-6 lg:p-7">
                <Pill text={p.when} live={p.live} />
                <h3 className="ed-h3 mt-5 text-(--ink)">{p.name}</h3>
                <p className="ed-body mt-2 flex-1 text-(--ink-2)">{p.what}</p>
                <Link
                  href={p.href}
                  className="ed-small mt-6 font-bold text-(--accent) underline underline-offset-4"
                >
                  {p.name} 자세히
                </Link>
              </li>
            ))}
          </ul>

          <p className="ed-small mt-6 text-(--ink-2)">
            학교·교육청 등 기관은 별도 구조로 운영합니다.{" "}
            <Link href="/partner/contact" className="font-bold text-(--accent) underline underline-offset-4">
              기관 도입 문의
            </Link>
          </p>
        </div>
      </section>

      {/* ───── faq ───── */}
      <section id="faq" className="ed-band scroll-mt-20">
        <div className="ed-wrap">
          <div className="mx-auto max-w-3xl">
            <Chapter center label="자주 묻는 질문" title="묻기 전에 먼저 답합니다." />
            <div className="mt-10 divide-y divide-(--line) border-y border-(--line)">
              {faqs.map((f) => (
                <details key={f.q} className="ed-faq group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5">
                    <span className="ed-h3 text-(--ink)">{f.q}</span>
                  </summary>
                  <p className="ed-body max-w-2xl pb-6 text-(--ink-2)">{f.a}</p>
                </details>
              ))}
            </div>
            <p className="ed-small mt-6 text-center text-(--ink-2)">
              더 궁금한 것은{" "}
              <Link href="/support/faq" className="font-bold text-(--accent) underline underline-offset-4">
                전체 FAQ
              </Link>
              에서, 답이 없으면{" "}
              <Link href="/support/inquiry" className="font-bold text-(--accent) underline underline-offset-4">
                1:1 문의
              </Link>
              로 보내 주세요.
            </p>
          </div>
        </div>
      </section>

      {/* ───── 마지막 ───── 테라코타 띠 */}
      <section className="bg-(--accent) text-(--paper)">
        <div className="ed-wrap py-20 text-center lg:py-28">
          <h2 className="ed-h2 text-(--paper)">아이의 재능 지도를 받아 보세요.</h2>
          <p className="ed-lead mx-auto mt-5 max-w-xl text-(--paper)">
            가입하고 아이를 등록하면 바로 응시할 수 있습니다. {assessment.round} 접수는 {deadline}까지입니다.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/exam" className="ed-btn ed-btn-paper">
              무료로 진단 시작
            </Link>
            <Link
              href="/partner/contact"
              className="ed-btn border-(--paper) text-(--paper) hover:bg-(--paper) hover:text-(--ink)"
            >
              기관 도입 문의
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
