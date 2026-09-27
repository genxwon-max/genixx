"use client";

import Link from "next/link";
import { roomHref } from "@/lib/examCatalog";
import { useExamRecord } from "@/lib/examStore";
import { progressOf, phaseTone, subjectTone } from "@/lib/progress";
import { useRegistrations } from "@/components/exam/Registrations";
import { Head, WhoNote, btnGo, btnQuiet, cardBox, useSelf } from "./self";

/**
 * 학생 홈 (/student) — 접속코드로 들어온 아이가 처음 닿는 자리.
 *
 * 보호자 홈(/my)과 같은 껍데기를 쓰되 보는 것이 다르다. 저쪽은 **아이들이 줄로** 서고
 * 여기는 **내 과목이 칸으로** 선다. 아이에게 목록은 필요 없다 — 자기 하나뿐이다.
 *
 * 세 덩이로 둔다.
 *   지금 할 일   한 줄과 단추 하나. 아이가 이 화면에서 찾는 것은 사실 이것뿐이다
 *   내 진행      과목 셋 · 설문 · 단계. 어디까지 왔는지
 *   바로가기     결과 · 정답과 해설처럼 다 풀고 나서 가는 자리
 *
 * 실제 응시는 응시 존(/exam)에서 한다. 여기서 문항을 열지 않는 까닭은 시험지 껍데기가
 * 따로 있어서다 — 남은 시간과 과목만 남기고 메뉴를 감추는 그 틀이 대시보드 레일과 함께
 * 설 수 없다. 그래서 이 화면은 그 자리로 **건너가는 단추**를 가장 크게 둔다.
 */
export default function StudentHome() {
  const self = useSelf();
  const record = useExamRecord(self.id);
  const rows = useRegistrations(self.id);
  const latest = rows[0];

  /* 접수한 평가가 있으면 그 평가 판으로, 없으면 응시 존 첫 화면으로 보낸다 */
  const goHref = latest ? roomHref(latest.round, latest.track) : "/exam";
  const goLabel = latest ? "평가 페이지로 가기" : "응시 존으로 가기";

  const progress = self.student ? progressOf(self.student) : null;
  const tone = progress ? phaseTone[progress.phase] : null;

  return (
    <>
      <WhoNote self={self} />

      <Head
        eyebrowText="내 평가"
        title={`${self.name}님, 안녕하세요`}
        right={
          <>
            <Link href="/exam/apply" className={btnQuiet}>
              접수하기
            </Link>
            <Link href={goHref} className={btnGo}>
              {goLabel} →
            </Link>
          </>
        }
      />

      {/* ── 지금 할 일 ── */}
      <section className={`mt-7 p-6 sm:p-7 ${cardBox}`}>
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-[15rem] flex-1">
            <p className="text-[12.5px] font-semibold text-soft-muted">지금 할 일</p>
            <p className="mt-2 text-[17px] font-bold leading-[1.6] text-soft-ink sm:text-[18px]">
              {!self.hydrated
                ? "확인 중입니다…"
                : !latest
                  ? "아직 접수한 평가가 없습니다"
                  : (progress?.nextAction ?? "평가 페이지에서 이어서 응시하세요.")}
            </p>
            {self.hydrated && latest && (
              <p className="mt-2 text-[13px] text-soft-muted">{latest.title}</p>
            )}
            {self.hydrated && !latest && (
              <p className="mt-2 text-[13px] leading-[1.75] text-soft-muted">
                접수하기에서 회차와 학년을 고르면 이 자리에 내 평가가 뜹니다. 무료시험은 20문항
                한 판으로 바로 볼 수 있습니다.
              </p>
            )}
          </div>
          <Link href={goHref} className={btnGo}>
            {goLabel} →
          </Link>
        </div>
      </section>

      {/* ── 내 진행 ── */}
      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="text-[17px] font-bold tracking-tight text-soft-ink">내 진행</h2>
          {tone && (
            <span className={`inline-flex items-center gap-1.5 text-[13px] font-semibold ${tone.text}`}>
              <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
              {progress?.phase}
            </span>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(progress?.subjects ?? []).map((sub) => (
            <div key={sub.id} className={`${cardBox} p-5`}>
              <p className="text-[13px] font-semibold text-soft-muted">{sub.short}</p>
              <p className={`mt-1.5 text-[19px] font-bold ${subjectTone[sub.state]}`}>{sub.state}</p>
            </div>
          ))}

          {/* 설문 칸 — 과목과 나란히 둔다. 아이가 자기 설문을 냈는지 여기서 알게 된다 */}
          <Link href="/student/surveys" className={`${cardBox} p-5 transition-colors hover:border-soft-primary`}>
            <p className="text-[13px] font-semibold text-soft-muted">설문</p>
            <p className="mt-1.5 text-[19px] font-bold text-soft-ink tabular-nums">
              {self.hydrated ? `${progress?.surveys ?? 0}/3` : "—"}
              <span className="ml-1.5 align-[2px] text-[12px] font-semibold text-soft-primary">
                보기
              </span>
            </p>
          </Link>
        </div>

        {!self.student && self.hydrated && (
          <p className={`${cardBox} mt-3 p-6 text-center text-[13px] leading-[1.8] text-soft-muted`}>
            명부에 아직 이름이 없어 진행을 셀 수 없습니다. 접속코드로 들어오면 과목별 상태가
            이 자리에 뜹니다.
          </p>
        )}
      </section>

      {/* ── 바로가기 ── */}
      <section className="mt-8">
        <h2 className="mb-3 text-[17px] font-bold tracking-tight text-soft-ink">바로가기</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { href: "/student/exams", t: "내 평가", d: "접수한 평가와 응시 상태" },
            { href: "/student/results", t: "응시 결과", d: "8재능 팔각형과 전문가 평가" },
            { href: "/exam/answers", t: "정답과 해설", d: "제출을 마친 평가의 정오표" },
            { href: "/exam/info", t: "시험 안내", d: "과목·문항 수·시간" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`${cardBox} p-5 transition-colors hover:border-soft-primary`}
            >
              <p className="text-[15px] font-bold text-soft-ink">{l.t}</p>
              <p className="mt-1 text-[13px] text-soft-muted">{l.d}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* 최종 제출까지 간 아이에게는 결과가 다음 자리다 */}
      {record.finalized && (
        <p className="mt-6 text-center text-[13px] text-soft-muted">
          최종 제출을 마쳤습니다.{" "}
          <Link href="/student/results" className="font-semibold text-soft-primary hover:underline">
            응시 결과 보기
          </Link>
        </p>
      )}
    </>
  );
}
