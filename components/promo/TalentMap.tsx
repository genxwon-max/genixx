import { axes } from "@/lib/result";

/**
 * 히어로에 놓는 「재능 지도」 미리보기.
 *
 * 처음에는 아이 일러스트를 가운데 두고 여덟 노드를 두른 성좌 그림이었는데,
 * 그림이 예쁘기만 하고 아무 말도 하지 않았다. 학부모가 첫 화면에서 알고 싶은
 * 것은 「무엇을 받게 되는가」이므로, 받게 될 리포트의 첫 장을 그대로 보여 주는
 * 쪽으로 바꿨다. 위 띠가 절차(무엇을 넣으면 어떻게 되는가), 가운데가 결과,
 * 아래가 다음에 할 일이다 — 서비스 전체가 카드 한 장에 들어간다.
 *
 * 여기 적힌 점수·유형·문장은 전부 샘플이다. 카드 머리에 「샘플」을 붙여 실제
 * 응시 결과로 오해하지 않게 한다.
 */

/** 샘플 점수 — 2026년에 재는 세 축만 값이 있다 */
const sampleScores: Record<string, number> = { language: 88, logic: 74, nature: 81 };

/* ── 팔각 좌표 ─────────────────────────────────────────────── */

const BOX = 240;
const C = BOX / 2;
const R = 76;
const LABEL_R = R + 16;

const points = axes.map((axis, i) => {
  const rad = ((-90 + i * 45) * Math.PI) / 180;
  const score = sampleScores[axis.id] ?? null;
  const at = (r: number) => [C + r * Math.cos(rad), C + r * Math.sin(rad)] as const;
  return { axis, score, edge: at(R), label: at(LABEL_R), value: at((R * (score ?? 0)) / 100) };
});

const measured = points.filter((p) => p.score !== null);

/** 잰 축을 이은 면 — 「지금까지 그려진 만큼」이다 */
const drawn = [
  `M ${C} ${C}`,
  ...measured.map((p) => `L ${p.value[0].toFixed(1)} ${p.value[1].toFixed(1)}`),
  "Z",
].join(" ");

const ringPath = (ratio: number) =>
  points
    .map((p, i) => {
      const [x, y] = [C + (p.edge[0] - C) * ratio, C + (p.edge[1] - C) * ratio];
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ") + " Z";

function Octagon() {
  return (
    <svg
      viewBox={`0 0 ${BOX} ${BOX}`}
      className="h-auto w-full"
      role="img"
      aria-label={`샘플 재능 좌표. ${measured
        .map((p) => `${p.axis.label} ${p.score}점`)
        .join(", ")}. 나머지 다섯 축은 2027년 심화진단에서 측정하는 축이라 비어 있습니다.`}
    >
      <defs>
        <linearGradient id="tm-fill" x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#5164cf" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#7c65e8" stopOpacity="0.22" />
        </linearGradient>
      </defs>

      {[0.34, 0.67, 1].map((r) => (
        <path key={r} d={ringPath(r)} fill="none" stroke="#e2e8fb" strokeWidth={1} />
      ))}

      {points.map((p) => (
        <line
          key={`axis-${p.axis.id}`}
          x1={C}
          y1={C}
          x2={p.edge[0]}
          y2={p.edge[1]}
          stroke={p.score === null ? "#eef1fb" : "#c7d2f6"}
          strokeWidth={1}
          strokeDasharray={p.score === null ? "3 4" : undefined}
        />
      ))}

      <path
        d={drawn}
        fill="url(#tm-fill)"
        stroke="#5164cf"
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {points.map((p) =>
        p.score === null ? (
          /* 미측정 축은 빈 원 — 0점이 아니라 「아직 안 쟀다」는 표시다 */
          <circle
            key={`dot-${p.axis.id}`}
            cx={p.edge[0]}
            cy={p.edge[1]}
            r={3.5}
            fill="#ffffff"
            stroke="#c7d2f6"
            strokeWidth={1.2}
            strokeDasharray="2 2"
          />
        ) : (
          <circle key={`dot-${p.axis.id}`} cx={p.value[0]} cy={p.value[1]} r={4} fill="#3c4ab8" />
        ),
      )}

      {points.map((p) => {
        const cos = (p.label[0] - C) / LABEL_R;
        return (
          <text
            key={`label-${p.axis.id}`}
            x={p.label[0]}
            y={p.label[1]}
            textAnchor={cos > 0.3 ? "start" : cos < -0.3 ? "end" : "middle"}
            dominantBaseline="middle"
            fontSize={12}
            fontWeight={p.score === null ? 500 : 700}
            fill={p.score === null ? "#94a3b8" : "#1b2a6b"}
          >
            {p.axis.short}
          </text>
        );
      })}
    </svg>
  );
}

/* ── 카드 ──────────────────────────────────────────────────── */

const flow = ["글 · 말 · 손 · 행동", "AI 1차 분석", "교육전문가 확정"];

export default function TalentMap() {
  return (
    <div className="relative mx-auto w-full max-w-[600px]">
      {/* 뒤에 깔았던 번진 광채를 걷어냈다. 리포트 첫 장을 보여 주는 자리인데
          후광이 있으면 문서가 아니라 광고 배너로 읽힌다. */}
      <figure className="relative overflow-hidden rounded-md border border-brand-200 bg-white shadow-card">
        {/* 절차 — 무엇을 넣으면 무엇을 거쳐 나오는가 */}
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-b border-brand-100 bg-brand-50/80 px-4 py-3">
          {flow.map((step, i) => (
            <span key={step} className="flex items-center gap-2">
              {i > 0 && (
                <span aria-hidden className="text-brand-300">
                  →
                </span>
              )}
              <span className="type-caption font-bold text-brand-700">{step}</span>
            </span>
          ))}
        </div>

        <figcaption className="flex items-center justify-between gap-3 px-5 pt-5 sm:px-6">
          <span className="type-caption font-bold text-slate-500">
            재능 지도 · 2026년 1회차(26A)
          </span>
          <span className="type-tag rounded-sm bg-surface-blue px-2 py-1 text-brand-700">샘플</span>
        </figcaption>

        {/* 결과 */}
        <div className="grid items-center gap-4 px-5 pt-3 pb-5 sm:grid-cols-[minmax(0,212px)_1fr] sm:gap-5 sm:px-6">
          <Octagon />

          <div className="min-w-0">
            <p className="type-caption font-bold text-slate-500">재능 유형</p>
            <p className="type-h1 mt-1 font-black text-brand-950">이야기 탐험가형</p>
            <p className="type-body mt-1.5 text-slate-600">읽은 것을 자기 말로 다시 짜는 아이</p>

            <dl className="mt-4 space-y-2 border-t border-brand-100 pt-4">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <dt className="type-caption w-[5.5rem] shrink-0 text-slate-500">드러난 축</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {["언어 88", "자연·탐구 81"].map((t) => (
                    <span key={t} className="type-tag rounded-sm bg-brand-900 px-2 py-1 text-white">
                      {t}
                    </span>
                  ))}
                </dd>
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <dt className="type-caption w-[5.5rem] shrink-0 text-slate-500">아직 안 잰 축</dt>
                <dd className="type-caption text-slate-500">
                  <span className="rounded-sm border border-dashed border-brand-300 px-2 py-1">
                    5개 · 2027년 확대
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* 다음에 할 일 — 리포트가 점수표에서 끝나지 않는다는 증거 */}
        <div className="border-t border-brand-100 bg-brand-950 px-5 py-4 sm:px-6">
          <p className="type-caption font-bold text-brand-300">내일 해 볼 것</p>
          <p className="type-body mt-1 text-white">
            읽은 뒤 &lsquo;한 줄 요약 → 내 생각 한 줄&rsquo;로 적어 보게 하세요. 분량보다 매일 하는
            것이 중요합니다.
          </p>
        </div>
      </figure>
    </div>
  );
}
