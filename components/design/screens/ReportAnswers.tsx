import Link from "next/link";
import { sampleReport, type DiagReport, type SubjectReport } from "@/lib/diagReport";
import { designLinks } from "@/lib/designScreens";
import ReportViewer from "@/components/report/ReportViewer";
import { BarRow, Label, Page, ParentKid, VBars, colRule, subjectColor } from "@/components/report/parts";
import "@/components/report/report.css";

/**
 * 진단 보고서의 음성 입력 답 · 사진 답안 표시 (실제 주소 /report/full · WBS Q.1.7) — 디자인.
 *
 * 정밀본의 과목 면(04~06)에는 「대표 문항 리뷰」가 있고, 거기에 아이가 쓴 답이 그대로 실린다.
 * 지금은 그 답이 글로 쓴 것이라고만 여긴다. 응시 화면에는 답하는 길이 둘 더 있어, 보고서가
 * 그것을 알려야 한다 —
 *
 *   음성 입력   답은 글로 실리되 「음성 입력」 표시를 단다. 말한 것을 받아 적은 글이라 문장
 *               부호가 아이가 쓴 것이 아니다 — 보호자가 「왜 마침표가 없지」 하고 읽지 않게 한다.
 *   사진 올리기 글 대신 아이가 올린 사진을 싣는다. 화면에서는 눌러서 크게 보고, 인쇄본에는
 *               이 크기 그대로 실린다. 사진은 AI가 분석하지 않아 「AI 분석」 칸이 그것을 말한다.
 *
 * 과목 면의 나머지(점수 · 영역 · 오답의 공통점 · 다음 30일)는 지금의 보고서
 * (components/report/FullPages.tsx의 SubjectPage) 그대로이고, 값은 보고서 예시(lib/diagReport.ts)다.
 * 요약본(2면)에는 대표 문항이 없어 달라지는 것이 없다.
 */

const to = designLinks("report-answers");

const TOTAL = 10;
const r = sampleReport;
const foot = `전문가 40인 중 ${r.reviewers}인 교차검증 · AI 정밀분석`;

/** 대표 문항의 답이 어떻게 들어온 것인가 */
type How = "typed" | "voice" | "photo";

export default function ReportAnswers({ state }: { state: string }) {
  const plain = state === "none";
  const korean = r.subjects[0];
  const science = r.subjects[2];

  return (
    <>
      <ReportViewer edition="full" name={r.student.name}>
        <SubjectSheet r={r} s={korean} no={4} how={plain ? "typed" : "voice"} />
        <SubjectSheet r={r} s={science} no={6} how={plain ? "typed" : "photo"} />
      </ReportViewer>

      {state === "photo" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-5">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="사진으로 낸 답"
            className="w-full max-w-[44rem] rounded-lg bg-white p-5 shadow-xl"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[16px] font-bold text-slate-900">
                {science.review.head} · {r.student.call}가 사진으로 낸 답
              </h2>
              <Link href={to()} className="text-[13px] text-slate-500 hover:text-slate-800">
                닫기
              </Link>
            </div>
            <p className="mt-1 text-[13px] text-slate-600">{science.review.title}</p>
            <div className="mt-3 overflow-hidden rounded-md border border-slate-200">
              <AnswerPhoto />
            </div>
            <p className="mt-2 text-[12px] text-slate-500">
              응시 중에 올린 사진 그대로입니다. 인쇄본에는 과목 면에 작은 크기로 실립니다.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

const head = (no: number, t: string) => (
  <>
    {String(no).padStart(2, "0")}
    <span className="ml-2 font-medium">{t}</span>
  </>
);

/** 답 옆에 다는 작은 표시 — 「음성 입력」 · 「사진으로 낸 답」 */
function Mark({ children }: { children: string }) {
  return (
    <span className="ml-2 rounded-[2px] border border-(--rp-line) px-1.5 py-px align-[1px] text-[10px] font-medium text-(--rp-muted)">
      {children}
    </span>
  );
}

/** 과목 면 — 「대표 문항 리뷰」의 답 표시만 새로 넣었다 */
function SubjectSheet({ r, s, no, how }: { r: DiagReport; s: SubjectReport; no: number; how: How }) {
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
      {how === "photo" ? (
        /* 사진 답안 — 글 대신 아이가 올린 사진을 싣는다 */
        /* 종이 한 장의 높이가 정해져 있어(A4) 사진은 글 석 줄이 있던 자리만큼만 차지한다 */
        <div className="mt-2.5 grid grid-cols-[1fr_38mm] items-start gap-6">
          <div>
            <p className="text-[13px] font-bold text-(--rp-ink)">
              {s.review.head} <span className="ml-1.5">{s.review.title}</span>
            </p>
            <p className="mt-0.5 text-[11px] text-(--rp-muted)">{s.review.desc}</p>
            <div className="mt-2.5 border-l-[3px] pl-3.5" style={{ borderColor: c }}>
              <p className="text-[11px] font-bold" style={{ color: c }}>
                {r.student.call}의 답안
                <Mark>사진으로 낸 답</Mark>
              </p>
              <p className="mt-1 text-[12px] leading-[1.7] text-(--rp-ink)">
                종이에 그림과 글로 답하고 사진을 찍어 올렸습니다. 오른쪽이 그 사진이고, 화면에서는
                눌러서 크게 볼 수 있습니다.
              </p>
            </div>
          </div>
          <Link
            href={to("photo")}
            aria-label="사진 크게 보기"
            className="block overflow-hidden border border-(--rp-line)"
          >
            <AnswerPhoto />
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-2.5 text-[13px] font-bold text-(--rp-ink)">
            {s.review.head} <span className="ml-1.5">{s.review.title}</span>
          </p>
          <p className="mt-0.5 text-[11px] text-(--rp-muted)">{s.review.desc}</p>
          <div className="mt-2.5 border-l-[3px] pl-3.5" style={{ borderColor: c }}>
            <p className="text-[11px] font-bold" style={{ color: c }}>
              {r.student.call}의 답안
              {how === "voice" && <Mark>음성 입력</Mark>}
            </p>
            <p className="rp-serif mt-1 text-[13px] leading-[1.7] text-(--rp-ink)">
              “{how === "voice" ? spoken(s.review.answer) : s.review.answer}”
            </p>
            {how === "voice" && (
              <p className="mt-1 text-[10.5px] text-(--rp-muted)">
                말한 것을 받아 적은 글입니다. 문장 부호와 띄어쓰기는 받아 적을 때 정해진 것입니다.
              </p>
            )}
          </div>
        </>
      )}

      <div className="mt-3 grid grid-cols-2 gap-7">
        <div>
          <Label color="var(--rp-line)">
            <span className="text-(--rp-muted)">AI 분석</span>
          </Label>
          <p className="mt-2 text-[12px] leading-[1.75]">
            {how === "photo"
              ? "사진으로 낸 답은 AI가 분석하지 않습니다. 진단 위원이 사진을 직접 확인해 채점했습니다."
              : s.review.ai}
          </p>
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

/** 받아 적은 글의 모양 — 말로 입력하면 쉼표 · 마침표 없이 이어진다 */
const spoken = (text: string) => text.replace(/[.,…]/g, "").replace(/\s+/g, " ").trim();

/**
 * 아이가 올린 사진의 예시 — 화분 둘을 그리고 확인할 방법을 적은 종이.
 * 실제로는 올린 사진이 그대로 실린다. 시안에 쓸 사진이 없어 그림으로 대신한다.
 */
function AnswerPhoto() {
  const ink = "#2b3550";
  return (
    <svg
      viewBox="0 0 400 300"
      role="img"
      aria-label="아이가 올린 사진 — 햇빛을 받는 화분과 상자로 덮은 화분을 그리고, 물은 똑같이 준다고 적었습니다"
      className="block h-auto w-full"
    >
      <rect width="400" height="300" fill="#8c8377" />
      <g transform="rotate(2 200 150)">
        <rect x="24" y="18" width="352" height="264" rx="3" fill="#fbf9f2" />
        {Array.from({ length: 10 }, (_, i) => (
          <line key={i} x1="24" x2="376" y1={50 + i * 24} y2={50 + i * 24} stroke="#cfd9e6" strokeWidth="1" />
        ))}
        <g stroke={ink} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {/* 해 */}
          <circle cx="84" cy="62" r="13" />
          <path d="M84 40v-8M84 92v-8M62 62h-8M114 62h-8M68 46l-6-6M100 46l6-6" />
          {/* 햇빛을 받는 화분 — 크게 자랐다 */}
          <path d="M96 176h56l-8 44h-40z" />
          <path d="M124 176v-62M124 150q-22 -6 -26 -26M124 138q22 -8 28 -30M124 122q-14 -10 -12 -26" />
          {/* 상자로 덮은 화분 — 조금 자랐다 */}
          <path d="M232 176h56l-8 44h-40z" />
          <path d="M260 176v-22M260 164q-10 -2 -12 -12" />
          <path d="M214 102h92v80M214 102v80" strokeDasharray="6 5" />
        </g>
        <g fill={ink} fontStyle="italic" fontFamily="var(--font-noto-kr), sans-serif">
          <text x="92" y="244" fontSize="15">햇빛 O</text>
          <text x="224" y="244" fontSize="15">상자로 덮기</text>
          <text x="60" y="270" fontSize="14">물은 둘 다 똑같이! 일주일 보기</text>
        </g>
      </g>
    </svg>
  );
}
