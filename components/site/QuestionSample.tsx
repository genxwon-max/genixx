import { levelOf, type Question } from "@/lib/exam";

/**
 * 공개용 예시 문항.
 *
 * KEDI 영재성 검사 소개(ged.kedi.re.kr intro4_2~4_4)가 검사도구마다 예시 문항을
 * 그대로 공개하는 방식을 따랐다. 무엇을 재는지 백 마디로 설명하는 것보다 실제
 * 문항 한 개를 보여 주는 편이 빠르고, 학부모가 가장 불안해하는 대목이 「우리 아이가
 * 무슨 문제를 푸는가」라서다.
 *
 * 응시 화면(components/exam)과 같은 좌·우 구성으로 그리되 응답 칸은 두지 않는다.
 * 정답도 싣지 않는다 — 이 문항 자체가 회차에 쓰이지는 않지만, 정답을 함께 걸면
 * 「미리 풀어 보고 오는 자리」로 읽히기 시작한다.
 */
/*
 * 표 셀·보기·문단의 key는 내용이 아니라 위치를 쓴다. 「같음」처럼 같은 글자가 여러
 * 칸에 들어가는 자료가 실제로 있어서 내용을 키로 쓰면 React가 칸을 지운다. 이 목록들은
 * 순서가 바뀌거나 중간에 끼어드는 일이 없으므로 위치가 그대로 정체성이다.
 */
export default function QuestionSample({ q }: { q: Question }) {
  const level = levelOf(q.level);

  return (
    <figure className="overflow-hidden rounded-lg border border-brand-200 bg-white">
      <figcaption className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-brand-100 bg-brand-50/70 px-5 py-3 sm:px-6">
        <span className="type-tag rounded-full bg-brand-900 px-2.5 py-1 text-white">
          {q.level} {level.name}
        </span>
        <span className="type-meta font-bold text-brand-800">
          {q.type === "choice" ? "객관식 4지 선다" : "서술형"}
        </span>
        <span className="type-caption text-slate-500">{level.desc}</span>
      </figcaption>

      <div className="grid gap-0 md:grid-cols-2">
        {/* 왼쪽 — 자료. 응시 중에는 계속 볼 수 있는 자리다 */}
        <div className="border-b border-brand-100 bg-brand-50/40 px-5 py-5 sm:px-6 md:border-r md:border-b-0">
          <p className="type-tag text-brand-500">{q.brief.label}</p>
          <p className="type-h3 mt-1.5 font-black text-brand-950">{q.brief.title}</p>

          {/* 공개 예시는 글 · 목록 · 표만 옮긴다 — 사진 · 영상이 든 세트는 여기 싣지 않는다 */}
          {q.brief.blocks.map((b, i) => {
            if (b.kind === "text") {
              return (
                <p key={i} className="type-body mt-3 text-slate-700">
                  {b.text}
                </p>
              );
            }
            if (b.kind === "list") {
              return (
                <ul key={i} className="mt-3 space-y-1.5">
                  {b.items.map((l, k) => (
                    <li key={k} className="type-body text-slate-700">
                      {l}
                    </li>
                  ))}
                </ul>
              );
            }
            if (b.kind === "table") {
              return (
                <div
                  key={i}
                  className="mt-3 overflow-x-auto rounded-xl border border-brand-100 bg-white"
                >
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-brand-100">
                        {b.table.head.map((h, k) => (
                          <th key={k} className="type-caption px-3 py-2 font-black text-brand-800">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {b.table.rows.map((row, r) => (
                        <tr key={r} className="border-b border-brand-50 last:border-0">
                          {row.map((cell, c) => (
                            <td key={c} className="type-caption px-3 py-2 text-slate-700">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }
            if (b.kind === "note") {
              return (
                <p key={i} className="type-caption mt-3 text-slate-500">
                  {b.text}
                </p>
              );
            }
            return null;
          })}
        </div>

        {/* 오른쪽 — 발문과 보기 */}
        <div className="px-5 py-5 sm:px-6">
          <p className="type-h3 font-black text-brand-950">{q.stem}</p>

          {q.choices && (
            <ol className="mt-4 space-y-2">
              {q.choices.map((c, i) => (
                <li
                  key={i}
                  className="type-body flex gap-3 rounded-xl border border-brand-100 px-4 py-3 text-slate-700"
                >
                  <span aria-hidden className="font-black text-brand-400">
                    {i + 1}
                  </span>
                  {c}
                </li>
              ))}
            </ol>
          )}

          {q.guide && (
            <ul className="mt-4 space-y-1.5 rounded-xl bg-brand-50/70 px-4 py-3.5">
              {q.guide.map((g, i) => (
                <li key={i} className="type-body flex gap-2 text-slate-700">
                  <span aria-hidden className="text-brand-400">
                    ·
                  </span>
                  {g}
                </li>
              ))}
            </ul>
          )}

          {q.type === "essay" && (
            <div className="mt-3 rounded-xl border border-dashed border-brand-200 px-4 py-6 text-center">
              <p className="type-caption text-slate-500">
                실제 응시 화면에서는 여기에 답을 씁니다
                {q.minLength ? ` (${q.minLength}자 이상)` : ""}
              </p>
            </div>
          )}
        </div>
      </div>
    </figure>
  );
}
