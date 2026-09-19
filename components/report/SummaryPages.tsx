import type { DiagReport } from "@/lib/diagReport";
import { assessment } from "@/lib/exam";
import {
  Label,
  Page,
  PeerBar,
  ParentKid,
  Radar,
  Rich,
  colRule,
  koNum,
  subjectColor,
} from "./parts";

/**
 * 무료 요약본 두 면 — 결과의 방향만 담는다. 근거와 실행 방법은 정밀본에 있다.
 * 시안 「진단레포트_무료요약_2p」의 차례와 칸을 그대로 따른다.
 */
export default function SummaryPages({ r }: { r: DiagReport }) {
  const foot = `AI 정밀분석 · ${r.items}문항 전수 채점`;
  return (
    <>
      <SummaryOne r={r} foot={foot} />
      <SummaryTwo r={r} foot={foot} />
    </>
  );
}

const head = (t: string) => (
  <>
    요약본
    <span className="ml-2 font-medium">{t}</span>
  </>
);

function SummaryOne({ r, foot }: { r: DiagReport; foot: string }) {
  return (
    <Page r={r} head={head(`${assessment.name} 재능 진단 보고서`)} no={1} total={2} foot={foot}>
      {/* 유형 + 종합 백분위 */}
      <div className="mt-5 grid grid-cols-[1fr_190px] gap-8">
        <div>
          <p className="text-[11px] tracking-[0.08em] text-(--rp-muted)">종합 진단 유형</p>
          <h1 className="rp-serif mt-2 text-[34px] leading-[1.25] text-(--rp-ink)">
            {r.type.lead && (
              <>
                {r.type.lead}
                <br />
              </>
            )}
            <span className="text-(--rp-accent)">{r.type.name}</span>
          </h1>
          <p className="mt-3 max-w-[112mm] text-[13px] leading-[1.8]">{r.type.desc}</p>
        </div>
        <div className="border-l border-(--rp-rule) pl-6">
          <p className="text-[11px] tracking-[0.08em] text-(--rp-muted)">종합 백분위</p>
          <p className="rp-serif mt-1 text-[30px] text-(--rp-ink)">상위 {r.pct}%</p>
          <p className="mt-1 text-[11px] leading-[1.7] text-(--rp-muted)">
            전국 {r.student.gradeShort} {r.norm.toLocaleString()}명 기준
            <br />
            동일 유형 해당 비율 {r.type.share}%
          </p>
        </div>
      </div>

      {/* 과목별 결과 + 여섯 가지 사고 능력 */}
      <div className="mt-5 grid grid-cols-2 gap-8">
        <div>
          <Label right="검은 눈금 = 또래 평균">과목별 결과</Label>
          <div className="mt-2">
            {r.subjects.map((s) => (
              <div
                key={s.id}
                className="grid grid-cols-[1fr_120px_78px] items-center gap-3 border-b border-(--rp-line) py-2.5"
              >
                <p className="text-[11px] leading-tight text-(--rp-muted)">
                  <span className="rp-serif mr-2 text-[18px]" style={{ color: subjectColor[s.id] }}>
                    {s.name}
                  </span>
                  {s.power}
                </p>
                <PeerBar value={100 - s.pct} color={subjectColor[s.id]} />
                <span className="rp-serif text-right text-[16px] text-(--rp-ink)">
                  상위 {s.pct}%
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2.5 text-[11px] text-(--rp-muted)">
            100점 만점 점수가 아니라 또래 가운데 어느 위치인지를 나타냅니다.
          </p>
        </div>
        <div>
          <Label>여섯 가지 사고 능력</Label>
          <div className="mt-2 flex justify-center">
            <Radar items={r.abilities} size={232} />
          </div>
        </div>
      </div>

      {/* 강점 셋 */}
      <Label className="mt-5">이 아이의 강점 셋</Label>
      <div className="mt-2.5 grid grid-cols-3">
        {r.summary.strengths.map((s, i) => (
          <div key={s.t} className={i > 0 ? colRule : "pr-6"}>
            <p className="rp-serif text-[16px] text-(--rp-ink)">
              {koNum[i]}
              <span className="ml-2">{s.t}</span>
            </p>
            <p className="mt-1.5 text-[12px] leading-[1.75]">{s.d}</p>
          </div>
        ))}
      </div>

      <ParentKid r={r} parent={r.summary.parent} kid={r.summary.kid} className="mt-5" />

      {/* 이 요약본은 */}
      <div className="mt-auto grid grid-cols-[62mm_1fr] gap-6 border-t border-(--rp-rule) pt-3">
        <p className="rp-serif text-[19px] leading-[1.45] text-(--rp-ink)">
          이 요약본은
          <br />
          AI가 분석했습니다
        </p>
        <p className="text-[12px] leading-[1.8]">
          AI가 {r.items}문항을 전수 채점하고 풀이 시간과 수정 이력까지 분석해{" "}
          {r.norm.toLocaleString()}명 표본과 대조한 결과입니다.{" "}
          <b className="text-(--rp-ink)">
            전문가 교차검증과 서술형 채점 소견은 정밀본에만 실립니다.
          </b>{" "}
          서술형·창의성 문항의 해석이 필요하시면 정밀본을 확인해주세요.
        </p>
      </div>
      <div className="mt-3 flex justify-between border-t border-(--rp-line) pt-2 text-[10.5px] text-(--rp-muted)">
        <span>
          국어·수학·과학 {r.items}문항 · 응시 {r.minutes}분 · 표준화 표본 초
          {r.student.gradeShort.replace("학년", "")} {r.norm.toLocaleString()}명 · AI 전수 채점
        </span>
        <span>{r.no}</span>
      </div>
    </Page>
  );
}

function SummaryTwo({ r, foot }: { r: DiagReport; foot: string }) {
  const rows: [string, boolean][] = [
    [`AI 정밀분석 · ${r.items}문항 전수 채점`, true],
    ["전문가 교차검증과 서술형 채점", false],
    ["종합 유형 · 과목별 백분위 · 사고 능력", true],
    ["영역별 세부 점수와 대표 문항 답안 리뷰", false],
    ["학습 성향 분석과 학생용 성장 지도", false],
    ["가정 실행 안내 · 3개월 로드맵 · 총평", false],
  ];
  return (
    <Page r={r} head={head("과목별 개관 · 정밀본 안내")} no={2} total={2} foot={foot}>
      <div className="mt-3 border-t-[2.5px] border-(--rp-rule) pt-2.5">
        <h2 className="rp-serif text-[24px] text-(--rp-ink)">세 과목을 한 장으로 정리했습니다</h2>
        <p className="mt-1 text-[12px] text-(--rp-muted)">
          요약본은 결과의 방향만 담습니다. 근거와 실행 방법은 정밀본 열 장에 실려 있습니다.
        </p>
      </div>

      <div className="mt-3 grid grid-cols-3">
        {r.subjects.map((s, i) => (
          <div key={s.id} className={i > 0 ? colRule : "pr-6"}>
            <p
              className="rp-serif border-b pb-1.5 text-[20px]"
              style={{ color: subjectColor[s.id], borderColor: subjectColor[s.id] }}
            >
              {s.name}
            </p>
            <p className="mt-2.5 text-[10.5px] text-(--rp-muted)">잘한 영역</p>
            <p className="text-[12.5px] font-bold text-(--rp-ink)">
              {s.best.label} · 상위 {s.best.pct}%
            </p>
            <p className="mt-1.5 text-[10.5px] text-(--rp-muted)">더 살펴볼 영역</p>
            <p className="border-b border-(--rp-line) pb-2 text-[12.5px] font-bold text-(--rp-ink)">
              {s.weak.label} · 상위 {s.weak.pct}%
            </p>
            <p className="mt-2 text-[12px] leading-[1.75]">
              <b className="mr-1.5 text-(--rp-ink)">AI 분석</b>
              {s.ai}
            </p>
          </div>
        ))}
      </div>

      <ParentKid r={r} parent={r.summary.parent2} kid={r.summary.kid2} className="mt-4" />

      <div className="mt-4 grid grid-cols-[1fr_78mm] gap-7">
        <div>
          <Label>요약본과 정밀본의 차이</Label>
          <table className="mt-1 w-full text-[12px]">
            <thead>
              <tr className="border-b border-(--rp-rule) text-[11px] text-(--rp-ink)">
                <th className="py-1.5 text-left font-medium">수록 항목</th>
                <th className="w-16 font-medium">요약본</th>
                <th className="w-16 font-medium">정밀본</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([t, both]) => (
                <tr key={t} className="border-b border-(--rp-line)">
                  <td className={`py-1 ${both ? "" : "font-bold text-(--rp-ink)"}`}>{t}</td>
                  <td className="text-center">
                    {both ? "●" : <span className="text-(--rp-line)">—</span>}
                  </td>
                  <td className="text-center">●</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <Label>정밀본에만 실리는 지면</Label>
          {["전문가 서술형 채점 소견", "문항별 반응과 소요시간 분석"].map((t) => (
            <div key={t} className="mt-2 bg-[#efede6] px-3.5 py-2.5">
              <p className="text-[11px] text-(--rp-muted)">{t}</p>
              <div className="mt-2 space-y-1.5">
                <div className="h-px w-full bg-(--rp-line)" />
                <p className="text-center text-[11px] font-bold text-(--rp-ink)">🔒 정밀본 수록</p>
                <div className="h-px w-4/5 bg-(--rp-line)" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <Label className="mt-4">요약본만으로도 오늘 할 수 있는 것</Label>
      <p className="mt-2 text-[12px] leading-[1.75]">
        {r.summary.today.map((t, i) => (
          <span key={t} className="mr-3">
            <b className="text-(--rp-ink)">{koNum[i]}.</b> <Rich text={t} r={r} />
          </span>
        ))}
      </p>

      <div className="mt-auto flex items-center justify-between gap-6 border-y-[1.5px] border-(--rp-rule) py-3">
        <div>
          <p className="rp-serif text-[21px] text-(--rp-ink)">정밀본 열 장으로 이어서 보기</p>
          <p className="mt-1 text-[12px] text-(--rp-muted)">
            영역별 근거 · 답안 리뷰 · 30일 미션 · 3개월 로드맵
          </p>
        </div>
        <span className="border border-(--rp-rule) px-5 py-2.5 text-[13px] font-bold text-(--rp-ink)">
          정밀본 보기
        </span>
      </div>
      <p className="mt-2 text-[10.5px] leading-[1.6] text-(--rp-muted)">
        2026년 상반기 표준화 표본(초{r.student.gradeShort.replace("학년", "")}{" "}
        {r.norm.toLocaleString()}명) 기준 상대 점수이며, 고정된 능력이나 지능지수를 의미하지
        않습니다. · support@genixx.kr · {r.no}
      </p>
    </Page>
  );
}
