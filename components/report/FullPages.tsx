import type { DiagReport, SubjectReport } from "@/lib/diagReport";
import { assessment } from "@/lib/exam";
import {
  BarRow,
  BigTitle,
  Label,
  Page,
  ParentKid,
  PeerBar,
  Radar,
  Rich,
  VBars,
  colRule,
  heat,
  koNum,
  subjectColor,
  SVG,
} from "./parts";

/**
 * 정밀본 열 면 — 시안 「진단레포트_정밀_10p」의 차례를 그대로 따른다.
 *
 *   01 표지와 차례 · 02 읽는 법과 평가 방식 · 03 종합 · 04~06 과목 심층 · 07 융합 사고력 ·
 *   08 학습 성향 · 09 학생용 성장 지도 · 10 가정 실행 안내와 총평
 */
const TOTAL = 10;

export const fullToc = [
  "표지와 차례",
  "보고서를 읽는 법과 평가 방식",
  "종합 진단 결과",
  "국어 심층 분석",
  "수학 심층 분석",
  "과학 심층 분석",
  "융합 사고력 프로파일",
  "학습 성향과 태도",
  "{아이}의 성장 지도 · 학생용",
  "가정 실행 안내와 총평",
];

export default function FullPages({ r }: { r: DiagReport }) {
  const foot = `전문가 40인 중 ${r.reviewers}인 교차검증 · AI 정밀분석`;
  return (
    <>
      <Cover r={r} />
      <HowToRead r={r} foot={foot} />
      <Overview r={r} foot={foot} />
      {r.subjects.map((s, i) => (
        <SubjectPage key={s.id} r={r} s={s} no={4 + i} foot={foot} />
      ))}
      <Fusion r={r} foot={foot} />
      <Style r={r} foot={foot} />
      <KidPage r={r} />
      <Home r={r} foot={foot} />
    </>
  );
}

const head = (no: number, t: string) => (
  <>
    {String(no).padStart(2, "0")}
    <span className="ml-2 font-medium">{t}</span>
  </>
);

/* ───────────────────────── 01 표지 ───────────────────────── */

function Cover({ r }: { r: DiagReport }) {
  const info: [string, React.ReactNode][] = [
    [
      "성명",
      <>
        <b className="text-[15px] text-(--rp-ink)">{r.student.name}</b>
        <span className="ml-2">{r.student.grade}</span>
      </>,
    ],
    ["진단일", r.date],
    ["검사 과목", `국어 · 수학 · 과학 (${r.items}문항 / ${r.minutes}분)`],
    ["평가 방식", "AI 정밀분석 + 전문가 40인 교차검증"],
    ["보고서 번호", r.no],
  ];
  return (
    <section className="rp-page" aria-label="표지">
      <div className="flex items-baseline justify-between border-b border-(--rp-rule) pb-2.5">
        <span className="text-[17px] font-bold text-(--rp-ink)">
          제닉스{" "}
          <span className="ml-1 text-[10px] font-medium tracking-[0.2em] text-(--rp-muted)">
            GENIXX
          </span>
        </span>
        <span className="text-[11px] text-(--rp-muted)">다차원 재능 진단</span>
      </div>

      <p className="mt-[30mm] text-[11px] font-bold tracking-[0.12em] text-(--rp-accent)">
        정밀본 · 전 {TOTAL}면
      </p>
      <h1 className="rp-serif mt-3 text-[46px] leading-[1.22] text-(--rp-ink)">
        {assessment.name}
        <br />
        재능 진단 보고서
      </h1>
      <p className="mt-3 text-[13px] text-(--rp-muted)">국어 · 수학 · 과학 통합 진단 · {r.round}</p>

      <div className="mt-[26mm] grid grid-cols-2 gap-10">
        <dl className="border-t border-(--rp-rule)">
          {info.map(([k, v]) => (
            <div
              key={k}
              className="grid grid-cols-[26mm_1fr] items-baseline border-b border-(--rp-line) py-2.5"
            >
              <dt className="text-[11px] text-(--rp-muted)">{k}</dt>
              <dd className="text-[12.5px] text-(--rp-ink)">{v}</dd>
            </div>
          ))}
        </dl>
        <div>
          <Label>차례</Label>
          <ol className="mt-1">
            {fullToc.map((t, i) => (
              <li
                key={t}
                className="flex gap-3 border-b border-(--rp-line) py-[7px] text-[12.5px] text-(--rp-ink)"
              >
                <span className="rp-serif w-5 text-(--rp-muted)">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <Rich text={t} r={r} />
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="-mx-[16.5mm] -mb-[10mm] mt-auto flex items-end justify-between bg-[#1d1d19] px-[16.5mm] pb-[14mm] pt-[10mm] text-white">
        <div>
          <p className="text-[10.5px] tracking-[0.12em] text-white/60">종합 진단 유형</p>
          <p className="rp-serif mt-3 text-[29px]">
            {r.type.lead ? `${r.type.lead} ` : ""}
            {r.type.name}
          </p>
          <p className="mt-2 text-[12px] text-white/60">{r.type.kidDesc.replace("친구", "아이")}</p>
        </div>
        <div className="border-l border-white/25 pl-7 text-right">
          <p className="text-[10.5px] tracking-[0.12em] text-white/60">종합 백분위</p>
          <p className="rp-serif mt-2 text-[34px]">상위 {r.pct}%</p>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── 02 읽는 법 ───────────────────────── */

function HowToRead({ r, foot }: { r: DiagReport; foot: string }) {
  const steps = [
    { t: "진단 응시", d: `국어·수학·과학 3과목\n${r.items}문항 · 약 ${r.minutes}분` },
    { t: "AI 1차 분석", d: "전 문항 자동 채점\n풀이 패턴과 소요시간 기록" },
    { t: "전문가 교차검증", d: `위원 40인 가운데\n**${r.reviewers}인이 이 보고서를 검토**` },
    { t: "최종 확정", d: "두 결과가 다르면\n제3 위원 1인이 조정" },
  ];
  const panel = [
    ["과학 · 탐구", "14", "과학영재학교 · 영재교육원 지도"],
    ["수학 · 논리", "12", "수학영재교육원 출제 및 심사"],
    ["국어 · 언어", "9", "독서논술 · 서술형 평가 전문"],
    ["교육심리 · 측정", "5", "문항 타당도 및 표준화 검토"],
  ];
  return (
    <Page r={r} head={head(2, "보고서를 읽는 법 · 평가 방식")} no={2} total={TOTAL} foot={foot}>
      <BigTitle
        r={r}
        no="02"
        title="이 결과는 [[전문가와 AI가 두 번]] 확인했습니다"
        sub="채점의 정확성은 AI가, 아이의 생각을 읽는 일은 전문가가 맡습니다."
      />
      <div className="mt-3 grid grid-cols-4 border-y border-(--rp-line) py-2">
        {steps.map((s, i) => (
          <div key={s.t} className={i > 0 ? "border-l border-(--rp-line) pl-4" : ""}>
            <p className="rp-serif text-[20px] text-(--rp-accent)">
              {String(i + 1).padStart(2, "0")}
            </p>
            <p className="mt-1 text-[13px] font-bold text-(--rp-ink)">{s.t}</p>
            <p className="mt-0.5 text-[11px] leading-[1.6] text-(--rp-muted)">
              <Rich text={s.d} r={r} />
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-7">
        <div>
          <Label>AI가 맡는 일</Label>
          <p className="mt-1.5 text-[12px] leading-[1.7]">
            {r.items}문항을 전수 채점해 채점자 편차를 없앱니다. 문항별 소요시간과 수정 횟수, 풀이
            순서를 기록하고 {r.norm.toLocaleString()}명 표본과 대조해 백분위를 산출하며, 과목을
            넘나드는 사고 패턴이 반복되는지도 탐지합니다.
          </p>
        </div>
        <div className={colRule}>
          <Label right={`이 보고서 검토 ${r.reviewers}인`}>전문가가 맡는 일</Label>
          <p className="mt-1.5 text-[12px] leading-[1.7]">
            <Rich
              text={`한국창의영재교육원 전문가 40인 가운데 **이 보고서는 ${r.reviewers}인이 검토**했습니다. 서술형과 창의성 문항은 **1문항당 2인이 각각 따로** 채점하고, 판단이 갈리면 제3 위원 1인이 조정합니다. 틀린 답 속의 좋은 생각을 찾아내고 답안의 의미를 해석하는 일, 가정 실행 안내와 총평도 전문가가 직접 씁니다.`}
              r={r}
            />
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_62mm] gap-7">
        <div>
          <Label right={`이 보고서 검토 ${r.reviewers}인`}>전문가 40인 구성</Label>
          <table className="mt-1 w-full text-[12px]">
            <thead>
              <tr className="border-b border-(--rp-rule) text-[11px] text-(--rp-ink)">
                <th className="py-1.5 text-left font-medium">전공 영역</th>
                <th className="w-12 text-right font-medium">인원</th>
                <th className="pl-5 text-left font-medium">주요 경력</th>
              </tr>
            </thead>
            <tbody>
              {panel.map(([a, n, c]) => (
                <tr key={a} className="border-b border-(--rp-line)">
                  <td className="py-[5px] text-(--rp-ink)">{a}</td>
                  <td className="rp-serif text-right text-[14px] text-(--rp-ink)">{n}</td>
                  <td className="pl-5">{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={colRule}>
          <p className="text-[11px] text-(--rp-muted)">신뢰도 지표</p>
          {[
            ["채점자 간 일치도", r.reliability.agreement],
            ["문항 내적 일관성", r.reliability.consistency],
            ["AI·전문가 불일치율", r.reliability.mismatch],
          ].map(([k, v]) => (
            <div
              key={k}
              className="flex items-baseline justify-between border-b border-(--rp-line) py-1.5"
            >
              <span className="text-[12px] text-(--rp-ink)">{k}</span>
              <span className="rp-serif text-[17px] text-(--rp-ink)">{v}</span>
            </div>
          ))}
          <p className="mt-1.5 text-[10.5px] leading-[1.5] text-(--rp-muted)">
            불일치 문항은 전량 제3 위원 1인이 재검토합니다.
          </p>
        </div>
      </div>

      <Label className="mt-4">점수를 이렇게 읽어주세요</Label>
      <div className="mt-2 grid grid-cols-2 gap-7">
        <div>
          <p className="text-[13px] font-bold text-(--rp-ink)">백분위</p>
          <div className="mt-3 w-[85%]">
            <PeerBar value={78} />
          </div>
          <p className="mt-2 text-[11.5px] leading-[1.6] text-(--rp-muted)">
            검은 눈금이 또래 평균입니다. 점이 눈금보다 오른쪽이면 평균보다 높습니다. 100점 만점
            점수가 아니라 또래 가운데 어디쯤인지를 나타냅니다.
          </p>
        </div>
        <div className={colRule}>
          <p className="text-[13px] font-bold text-(--rp-ink)">모양 그래프</p>
          <div className="mt-1 grid grid-cols-[96px_1fr] items-center gap-4">
            <Radar
              small
              size={96}
              items={[
                { label: "가", score: 85 },
                { label: "나", score: 70 },
                { label: "다", score: 92 },
                { label: "라", score: 60 },
                { label: "마", score: 78 },
                { label: "바", score: 66 },
              ]}
            />
            <p className="text-[11.5px] leading-[1.75]">
              모양이 클수록 전반적으로 높고, 고를수록 균형이 잡혀 있습니다. 뾰족한 쪽이 그 아이의
              특징입니다. 찌그러진 모양이 나쁜 것은 아닙니다.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-[52mm_1fr] gap-6 border-t border-(--rp-rule) pt-2.5">
        <p className="rp-serif text-[17px] leading-[1.4] text-(--rp-ink)">
          이 보고서가
          <br />
          말하지 않는 것
        </p>
        <p className="text-[12px] leading-[1.7]">
          지능지수, 앞으로의 성적 예측, 합격과 불합격 판정은 다루지 않습니다. 진단일 기준으로{" "}
          <b className="text-(--rp-ink)">지금의 수행과 사고 방식</b>을 담은 기록이며, 아이의 고정된
          능력을 규정하지 않습니다.
        </p>
      </div>

      <ParentKid
        r={r}
        className="mt-3"
        parent="결과를 아이에게 전하실 때는 등수나 백분위보다 **서술 부분을 먼저** 읽어주시길 권합니다. 아홉째 면의 학생용 지면은 아이가 혼자 읽을 수 있게 쓰여 있습니다."
        kid={
          "이 책자는 **{아이}가 어떻게 생각하는지**를 적어둔 거예요.\n잘하고 못하고를 정하는 시험 성적표가 아니에요. 편한 마음으로 넘겨보세요."
        }
      />
    </Page>
  );
}

/* ───────────────────────── 03 종합 ───────────────────────── */

export function Overview({ r, foot }: { r: DiagReport; foot: string }) {
  const ranked = [...r.abilities].sort((a, b) => b.score - a.score);
  const o = r.overview;
  return (
    <Page r={r} head={head(3, "종합 진단 결과")} no={3} total={TOTAL} foot={foot}>
      <BigTitle
        r={r}
        no="03"
        title={`{아이}는 [[${r.type.lead ? `${r.type.lead} ` : ""}${r.type.name}]]입니다`}
        sub={`전체 열두 가지 유형 가운데 ${r.student.gradeShort}에서 ${r.type.share}%가 해당하는 유형입니다.`}
      />
      <div className="mt-3 grid grid-cols-[250px_1fr] items-center gap-6">
        <Radar items={r.abilities} size={250} />
        <div>
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-(--rp-rule) text-[11px] text-(--rp-ink)">
                <th className="py-1.5 text-left font-medium">사고 능력</th>
                <th className="text-right font-medium">점수</th>
                <th className="text-right font-medium">또래 평균</th>
                <th className="text-right font-medium">위치</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((a) => (
                <tr key={a.label} className="border-b border-(--rp-line)">
                  <td className="py-[7px] text-(--rp-ink)">{a.label}</td>
                  <td className="rp-serif text-right text-[14px] text-(--rp-ink)">{a.score}</td>
                  <td className="rp-serif text-right text-[14px] text-(--rp-muted)">50</td>
                  <td className="rp-serif text-right text-[14px] text-(--rp-ink)">상위 {a.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2.5 text-[11px] leading-[1.7] text-(--rp-muted)">
            <Rich text={o.abilityNote} r={r} />
          </p>
        </div>
      </div>

      <Label className="mt-4" right="검은 눈금 = 또래 평균">
        과목별 종합
      </Label>
      {r.subjects.map((s) => (
        <BarRow key={s.id} label={`${s.name} · ${s.power}`} value={s.score} labelWidth={190} big />
      ))}

      <div className="mt-5 grid grid-cols-2 gap-7">
        <div>
          <Label>지금 밀어줄 강점</Label>
          <ul className="mt-2 space-y-1 text-[12.5px]">
            {o.strengths.map((t, i) => (
              <li key={t}>
                <b className="text-(--rp-ink)">{koNum[i]}.</b> {t}
              </li>
            ))}
          </ul>
        </div>
        <div className={colRule}>
          <Label>함께 채울 성장 지점</Label>
          <ul className="mt-2 space-y-1 text-[12.5px]">
            {o.growth.map((t, i) => (
              <li key={t}>
                <b className="text-(--rp-ink)">{koNum[i]}.</b> {t}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <Label>잘 자라는 환경</Label>
          <p className="mt-2 text-[12.5px] leading-[1.8]">
            <Rich text={o.thrive} r={r} />
          </p>
        </div>
        <div className={colRule}>
          <Label>막히기 쉬운 지점</Label>
          <p className="mt-2 text-[12.5px] leading-[1.8]">{o.stuck}</p>
        </div>
      </div>

      <ParentKid r={r} parent={o.parent} kid={o.kid} className="mt-auto" />
    </Page>
  );
}

/* ───────────────────────── 04~06 과목 ───────────────────────── */

function SubjectPage({
  r,
  s,
  no,
  foot,
}: {
  r: DiagReport;
  s: SubjectReport;
  no: number;
  foot: string;
}) {
  const c = subjectColor[s.id];
  return (
    <Page r={r} head={head(no, `${s.name} 심층 분석`)} no={no} total={TOTAL} foot={foot}>
      <div
        className="mt-4 flex items-end justify-between border-t-[2.5px] pt-3"
        style={{ borderColor: c }}
      >
        <p className="text-[12.5px] text-(--rp-body)">
          <span className="rp-serif mr-3 text-[32px] leading-none" style={{ color: c }}>
            {s.name}
          </span>
          전국 {r.student.gradeShort} 가운데 상위 {s.pct}% · {s.power}
        </p>
        <p className="text-[11px] text-(--rp-muted)">
          종합 <span className="rp-serif mx-1.5 text-[30px] text-(--rp-ink)">{s.score}</span>{" "}
          {s.items}문항 · {s.minutes}분
        </p>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_88mm] gap-7">
        <div>
          <Label right="검은 눈금 = 또래 평균">영역별 점수</Label>
          {s.areas.map((a) => (
            <BarRow key={a.label} label={a.label} value={a.score} color={c} labelWidth={110} />
          ))}
        </div>
        <div>
          <Label right="단위 %">문항 유형별 정답률</Label>
          <div className="mt-3">
            <VBars items={s.types} color={c} height={46} />
          </div>
        </div>
      </div>

      <Label className="mt-4">대표 문항 리뷰</Label>
      <p className="mt-2.5 text-[13px] font-bold text-(--rp-ink)">
        {s.review.head} <span className="ml-1.5">{s.review.title}</span>
      </p>
      <p className="mt-0.5 text-[11px] text-(--rp-muted)">{s.review.desc}</p>
      <div className="mt-2.5 border-l-[3px] pl-3.5" style={{ borderColor: c }}>
        <p className="text-[11px] font-bold" style={{ color: c }}>
          {r.student.call}의 답안
        </p>
        <p className="rp-serif mt-1 text-[13px] leading-[1.7] text-(--rp-ink)">
          “{s.review.answer}”
        </p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-7">
        <div>
          <Label color="var(--rp-line)">
            <span className="text-(--rp-muted)">AI 분석</span>
          </Label>
          <p className="mt-2 text-[12px] leading-[1.75]">{s.review.ai}</p>
        </div>
        <div>
          <Label color="var(--rp-line)">
            <span className="text-(--rp-muted)">전문가 소견 · 담당 2인</span>
          </Label>
          <p className="mt-2 text-[12px] leading-[1.75]">{s.review.expert}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-7">
        <div>
          <Label>오답 문항의 공통점</Label>
          {s.misses.map((m) => (
            <p key={m} className="border-b border-(--rp-line) py-1.5 text-[12px] leading-[1.6]">
              {m}
            </p>
          ))}
        </div>
        <div className={colRule}>
          <Label>이 과목의 다음 30일</Label>
          {s.plan.map((p) => (
            <div
              key={p.when}
              className="grid grid-cols-[62px_1fr] border-b border-(--rp-line) py-1.5 text-[12px]"
            >
              <span className="rp-serif" style={{ color: c }}>
                {p.when}
              </span>
              <span className="text-(--rp-ink)">{p.what}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-6 border-t border-(--rp-rule) pt-2.5">
        <p className="rp-serif text-[17px] leading-[1.45]" style={{ color: c }}>
          “{s.quote}”
        </p>
        <div className="grid grid-cols-3 text-center">
          {[
            [String(s.items), "출제 문항"],
            [s.perItem, "문항당 평균"],
            [s.vsPeer, "또래 대비"],
          ].map(([v, l], i) => (
            <div key={l} className={`px-5 ${i > 0 ? "border-l border-(--rp-line)" : ""}`}>
              <p className="rp-serif text-[21px] text-(--rp-ink)">{v}</p>
              <p className="text-[10.5px] text-(--rp-muted)">{l}</p>
            </div>
          ))}
        </div>
      </div>

      <ParentKid r={r} parent={s.parent} kid={s.kid} className="mt-auto" />
    </Page>
  );
}

/* ───────────────────────── 07 융합 사고력 ───────────────────────── */

function Fusion({ r, foot }: { r: DiagReport; foot: string }) {
  const f = r.fusion;
  return (
    <Page r={r} head={head(7, "융합 사고력 프로파일")} no={7} total={TOTAL} foot={foot}>
      <BigTitle
        r={r}
        no="07"
        title="과목을 넘어 [[반복해서 나타난]] 사고 습관"
        sub={`세 과목 ${r.items}문항에서 같은 방식으로 되풀이된 반응만 모아 분석했습니다.`}
      />
      <div className="mt-4 grid grid-cols-2 gap-7">
        <div>
          <Label>창의성 세 요소</Label>
          {f.creativity.map((a) => (
            <BarRow key={a.label} label={a.label} value={a.score} labelWidth={130} />
          ))}
          <p className="mt-2 text-[11px] text-(--rp-muted)">
            <Rich text={f.creativityNote} r={r} />
          </p>
          <Label className="mt-4">사고의 세 층</Label>
          {f.layers.map((a) => (
            <BarRow key={a.label} label={a.label} value={a.score} labelWidth={130} />
          ))}
          <p className="mt-2 text-[11px] leading-[1.65] text-(--rp-muted)">
            <Rich text={f.layersNote} r={r} />
          </p>
        </div>
        <div>
          <Label>과목과 사고력 교차표</Label>
          <table className="mt-2 w-full border-separate border-spacing-1 text-[12.5px]">
            <thead>
              <tr className="text-[11px] text-(--rp-ink)">
                <th />
                {r.subjects.map((s) => (
                  <th key={s.id} className="font-medium">
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {f.matrix.map((row) => (
                <tr key={row.row}>
                  <th className="pr-1 text-left text-[12px] font-bold text-(--rp-ink)">
                    {row.row}
                  </th>
                  {row.cells.map((v, i) => (
                    <td key={i} className="rp-serif py-1.5 text-center text-[14px]" style={heat(v)}>
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[11px] leading-[1.65] text-(--rp-muted)">
            <Rich text={f.matrixNote} r={r} />
          </p>
          <Label className="mt-4">반복 관찰된 사고 습관</Label>
          <ul className="mt-2 space-y-1 text-[12.5px]">
            {f.habits.map((h) => (
              <li key={h}>
                <Rich text={h} r={r} />
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Label className="mt-5">연결하는 힘이 자라면 어디로 이어지는가</Label>
      <div className="mt-3 grid grid-cols-3">
        {f.path.map((p, i) => (
          <div key={p.t} className={i > 0 ? colRule : "pr-6"}>
            <p className="rp-serif text-[16px] text-(--rp-ink)">{p.t}</p>
            <p className="mt-1.5 text-[12px] leading-[1.75]">{p.d}</p>
          </div>
        ))}
      </div>

      <ParentKid r={r} parent={f.parent} kid={f.kid} className="mt-5" />

      <div className="mt-auto grid grid-cols-[48mm_1fr_1fr] gap-6 border-t border-(--rp-rule) pt-3">
        <p className="rp-serif text-[18px] leading-[1.45] text-(--rp-ink)">
          이 지면을
          <br />
          어떻게 활용하나
        </p>
        {f.use.map((u, i) => (
          <div key={u.t} className={i > 0 ? colRule : ""}>
            <p className="text-[12.5px] font-bold text-(--rp-ink)">{u.t}</p>
            <p className="mt-1 text-[11.5px] leading-[1.7]">{u.d}</p>
          </div>
        ))}
      </div>
    </Page>
  );
}

/* ───────────────────────── 08 학습 성향 ───────────────────────── */

function Style({ r, foot }: { r: DiagReport; foot: string }) {
  const st = r.style;
  return (
    <Page r={r} head={head(8, "학습 성향과 태도")} no={8} total={TOTAL} foot={foot}>
      <BigTitle
        r={r}
        no="08"
        title="점수에 [[드러나지 않는]] 정보"
        sub="응시 중 기록된 시간·수정·순서 데이터를 분석했습니다. 좋고 나쁨이 아닌 성향입니다."
      />
      <div className="mt-4 grid grid-cols-2 gap-7">
        <div>
          <Label right="단위 문항 수">문항당 소요시간 분포</Label>
          <div className="mt-3">
            <VBars items={st.time} color="var(--rp-accent)" max={40} height={52} />
          </div>
          <p className="mt-2 text-[11.5px] leading-[1.65] text-(--rp-muted)">
            <Rich text={st.timeNote} r={r} />
          </p>
        </div>
        <div className={colRule}>
          <Label right="단위 정답률 %">진행에 따른 집중도</Label>
          <div className="mt-3">
            <VBars items={st.focus} color="#55534c" height={52} />
          </div>
          <p className="mt-2 text-[11.5px] leading-[1.65] text-(--rp-muted)">
            <Rich text={st.focusNote} r={r} />
          </p>
        </div>
        <div>
          <Label>난이도가 올라갈 때</Label>
          <div className="relative mt-6 h-3">
            <div className="absolute inset-x-0 top-1/2 h-px bg-(--rp-line)" />
            <div
              className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--rp-accent)"
              style={{ left: `${st.challenge}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[10.5px] text-(--rp-muted)">
            <span>회피</span>
            <span>도전</span>
          </div>
          <p className="mt-2 text-[11.5px] text-(--rp-muted)">{st.challengeNote}</p>
        </div>
        <div className={colRule}>
          <Label>되돌아보는 습관</Label>
          <div className="mt-2 border-b border-(--rp-line) pb-2">
            <p className="flex items-baseline justify-between text-[12.5px] font-bold text-(--rp-ink)">
              오답 직후 문항 정답률{" "}
              <span className="rp-serif text-[17px] font-normal">{st.afterMiss}</span>
            </p>
            <p className="text-[11px] text-(--rp-muted)">
              실수에 흔들리지 않는 편입니다. 시험 상황에서 유리한 특성입니다.
            </p>
          </div>
          <div className="mt-2 pb-1">
            <p className="flex items-baseline justify-between text-[12.5px] font-bold text-(--rp-ink)">
              답을 고친 문항 <span className="rp-serif text-[17px] font-normal">{st.fixed}</span>
            </p>
            <p className="text-[11px] text-(--rp-muted)">{st.fixedNote}</p>
          </div>
        </div>
      </div>

      <Label className="mt-5">데이터에 기반한 권장 학습 구조</Label>
      <div className="mt-2 grid grid-cols-[1fr_auto_1fr] border-b border-(--rp-rule)">
        {st.plan.map((p) => (
          <div
            key={p.t}
            className={`px-4 py-3 ${p.rest ? "border-x border-(--rp-line) bg-[#efede6]" : ""}`}
          >
            <p className="rp-serif text-[17px] text-(--rp-ink)">{p.t}</p>
            <p className="mt-0.5 text-[11px] text-(--rp-muted)">{p.d}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-(--rp-muted)">{st.planNote}</p>

      <ParentKid r={r} parent={st.parent} kid={st.kid} className="mt-5" />

      <div className="mt-auto grid grid-cols-[48mm_1fr] gap-6 border-t border-(--rp-rule) pt-3">
        <p className="rp-serif text-[18px] leading-[1.45] text-(--rp-ink)">
          성향은
          <br />
          고칠 대상이 아닙니다
        </p>
        <p className="text-[12px] leading-[1.8]">
          <Rich text={st.closing} r={r} />
        </p>
      </div>
    </Page>
  );
}

/* ───────────────────────── 09 학생용 ───────────────────────── */

function BadgeIcon({ icon }: { icon: "search" | "link" | "chat" }) {
  const p = {
    fill: "none",
    stroke: SVG.gold,
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg viewBox="0 0 24 24" width={30} height={30} aria-hidden>
      {icon === "search" && (
        <>
          <circle cx="10.5" cy="10.5" r="6.5" {...p} />
          <path d="m15.5 15.5 5 5" {...p} />
        </>
      )}
      {icon === "link" && (
        <>
          <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" {...p} />
          <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" {...p} />
        </>
      )}
      {icon === "chat" && <path d="M4 5h16v11H9l-4 3.5V16H4z" {...p} />}
    </svg>
  );
}

function KidPage({ r }: { r: DiagReport }) {
  const k = r.kidPage;
  return (
    <Page
      r={r}
      head={head(9, `${r.student.call}의 성장 지도`)}
      no={9}
      total={TOTAL}
      foot="학생용 지면 · 아이와 함께 읽어주세요"
      kid
    >
      <p className="mt-4 text-center text-[11px] font-bold tracking-[0.12em] text-(--rp-gold)">
        이 지면은 {r.student.call}가 직접 읽는 곳입니다
      </p>
      <h2 className="rp-serif mt-3 text-center text-[38px] text-(--rp-kid-ink)">
        <Rich text={k.title} r={r} />
      </h2>
      <p className="mt-2 text-center text-[14px] text-(--rp-kid-ink)/80">{k.desc}</p>

      <div className="mt-5 grid grid-cols-3 border-y border-[#dccfae] py-4">
        {k.badges.map((b, i) => (
          <div
            key={b.t}
            className={`flex flex-col items-center text-center ${i > 0 ? "border-l border-[#dccfae]" : ""}`}
          >
            <BadgeIcon icon={b.icon} />
            <p className="rp-serif mt-1.5 text-[17px] text-(--rp-kid-ink)">{b.t}</p>
            <p className="mt-1 whitespace-pre-line text-[11.5px] leading-[1.6] text-(--rp-kid-ink)/80">
              {b.d}
            </p>
          </div>
        ))}
      </div>

      <p className="rp-serif mt-6 border-b border-(--rp-gold) pb-1.5 text-[19px] text-(--rp-kid-ink)">
        30일 미션 · 하나씩 골라 도전해봐요
      </p>
      <div className="mt-1 grid grid-cols-2 gap-x-8">
        {k.missions.map((m) => (
          <div key={m.t} className="flex items-center gap-3 border-b border-[#e3d8bd] py-2.5">
            <span className="h-4 w-4 shrink-0 border-[1.5px] border-(--rp-gold)" />
            <span className="flex-1 text-[13px] font-bold text-(--rp-kid-ink)">{m.t}</span>
            <span className="text-[10.5px] text-(--rp-gold)">{m.tag}</span>
          </div>
        ))}
      </div>

      <p className="rp-serif mt-5 text-[17px] text-(--rp-kid-ink)">한 일이 있는 날은 칸을 칠해요</p>
      <div className="mt-2 grid grid-cols-10 border-l border-t border-[#dccfae]">
        {Array.from({ length: 30 }, (_, i) => (
          <div
            key={i}
            className="rp-serif h-[15mm] border-b border-r border-[#dccfae] pt-2 text-center text-[11px] text-(--rp-gold)"
          >
            {i + 1}
          </div>
        ))}
      </div>

      <p className="rp-serif mt-5 text-[17px] text-(--rp-kid-ink)">나의 한 달 목표를 적어봐요</p>
      <div className="mt-2 space-y-[8mm]">
        {[0, 1, 2].map((i) => (
          <div key={i} className="border-b border-dashed border-[#cdbb8e] pt-[3mm]" />
        ))}
      </div>

      <div className="mt-auto flex items-end justify-between gap-6 pt-4">
        <span className="text-[11.5px] text-(--rp-gold)">미션을 다 하면 여기에 사인해요</span>
        <span className="w-[50mm] border-b border-(--rp-gold)" />
      </div>
      <p className="rp-serif mt-4 text-center text-[15px] text-(--rp-kid-ink)">
        점수는 지금의 모습일 뿐이에요. {r.student.call}는 계속 자라고 있어요.
      </p>
    </Page>
  );
}

/* ───────────────────────── 10 가정 실행 · 총평 ───────────────────────── */

function Home({ r, foot }: { r: DiagReport; foot: string }) {
  const h = r.home;
  const colors = [subjectColor.korean, subjectColor.math, subjectColor.science];
  return (
    <Page r={r} head={head(10, "가정 실행 안내 · 총평")} no={10} total={TOTAL} foot={foot}>
      <BigTitle r={r} no="10" title="내일부터 할 수 있는 [[세 가지]]" />
      <div className="mt-3 grid grid-cols-3 gap-6">
        {h.three.map((t, i) => (
          <div key={t.t} className="border-t-2 pt-2" style={{ borderColor: colors[i] }}>
            <p className="text-[11px] font-bold" style={{ color: colors[i] }}>
              {t.tag}
            </p>
            <p className="rp-serif mt-1 text-[17px] text-(--rp-ink)">{t.t}</p>
            <p className="mt-1.5 border-b border-(--rp-line) pb-2 text-[11.5px] leading-[1.7]">
              {t.d}
            </p>
            <p className="mt-1.5 text-[10.5px] text-(--rp-muted)">{t.goal}</p>
          </div>
        ))}
      </div>

      <Label className="mt-4">3개월 로드맵</Label>
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b border-(--rp-rule) text-[11px] text-(--rp-ink)">
            <th className="w-[26mm] py-1.5 text-left font-medium">기간</th>
            {r.subjects.map((s) => (
              <th key={s.id} className="text-left font-medium">
                {s.name}
              </th>
            ))}
            <th className="w-10 text-right font-medium">점검</th>
          </tr>
        </thead>
        <tbody>
          {h.roadmap.map((m) => (
            <tr key={m.when} className="border-b border-(--rp-line) align-top">
              <td className="py-1.5">
                <b className="text-(--rp-ink)">{m.when}</b>
                <br />
                <span className="text-[10.5px] text-(--rp-muted)">{m.sub}</span>
              </td>
              {m.cells.map((c) => (
                <td key={c} className="py-1.5 pr-3 text-(--rp-ink)">
                  {c}
                </td>
              ))}
              <td className="py-1.5 text-right">
                <span className="inline-block h-3 w-3 border border-(--rp-line)" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1.5 text-[10.5px] text-(--rp-muted)">{h.roadmapNote}</p>

      <div className="mt-3 grid grid-cols-2 gap-7">
        <div>
          <Label>심화 경로 판단 참고</Label>
          <p className="mt-2 text-[11.5px] leading-[1.75]">{h.path}</p>
        </div>
        <div className={colRule}>
          <Label>이렇게는 말하지 말아주세요</Label>
          <ul className="mt-2 space-y-1 text-[12px]">
            {h.dont.map((d) => (
              <li key={d.say}>
                “{d.say}” → {d.why}
              </li>
            ))}
            <li className="font-bold text-(--rp-ink)">“{h.better}”</li>
          </ul>
        </div>
      </div>

      <Label className="mt-3">3개월 뒤, 무엇이 달라지면 성공인가</Label>
      <p className="mt-1.5 text-[12px] leading-[1.75]">
        <Rich text={h.success} r={r} />
      </p>
      <p className="text-[10.5px] text-(--rp-muted)">{h.successNote}</p>

      <div className="mt-3 border-t-[2px] border-(--rp-rule) pt-2">
        <div className="flex items-baseline justify-between">
          <span className="rp-label">전문가 총평</span>
          <span className="text-[11px] font-bold text-(--rp-ink)">
            40인 중 {r.reviewers}인 검토
          </span>
        </div>
        <p className="mt-2 text-[13px] leading-[1.85] text-(--rp-ink)">
          <Rich text={h.review} r={r} />
        </p>
        <div className="mt-2 grid grid-cols-3 gap-6">
          {h.reviewers.map((v) => (
            <div key={v.role} className="border-t border-(--rp-line) pt-1.5">
              <p className="text-[10.5px] text-(--rp-muted)">{v.role}</p>
              <p className="text-[12px] font-bold text-(--rp-ink)">{v.who}</p>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-auto border-t border-(--rp-line) pt-2 text-[10px] leading-[1.6] text-(--rp-muted)">
        2026년 상반기 표준화 표본 초{r.student.gradeShort.replace("학년", "")}{" "}
        {r.norm.toLocaleString()}명 기준 상대 평가 결과입니다. 백분위는 진단 시점의 수행을 나타내며
        지능지수나 장래 성취를 예측하지 않습니다. 서술형은 전문가 2인 독립 채점 후 불일치 시 제3
        위원이 조정했습니다. 채점자 간 일치도 {r.reliability.agreement}. · 재검사 권장 2027년 2월 ·
        support@genixx.kr · {r.no}
      </p>
    </Page>
  );
}
