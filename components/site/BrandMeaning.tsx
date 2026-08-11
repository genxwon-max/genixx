import { brandLetters, brandStory } from "@/lib/brand";

/**
 * 브랜드 이름 풀이.
 * 카드로 감싸지 않고 본문에 그대로 얹는다. 워드마크를 여섯 칸으로 쪼개
 * 가로선과 세로선만으로 구분하고, 마지막 두 X(인공지능·사용자)만 색으로 표시한다.
 */
export default function BrandMeaning({ tone = "light" }: { tone?: "light" | "muted" }) {
  return (
    <section className={`section-y-sm ${tone === "muted" ? "bg-brand-50/50" : ""}`}>
      <div className="container-x">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="type-eyebrow text-brand-500">브랜드 이름</p>
          <h2 className="type-h3 font-black text-brand-950">
            GENIXX는 여섯 글자가 각각 서비스의 축입니다
          </h2>
        </div>

        <ol className="mt-6 grid grid-cols-3 border-y border-brand-200 sm:grid-cols-6">
          {brandLetters.map((b, i) => {
            const isX = i >= 4;
            return (
              <li
                key={`${b.letter}-${i}`}
                className={`border-brand-100 px-3 py-6 text-center ${
                  i % 3 === 0 ? "" : "border-l"
                } ${i < 3 ? "" : "border-t sm:border-t-0"} ${i === 3 ? "sm:border-l" : ""}`}
              >
                <span
                  aria-hidden
                  className={`type-wordmark block font-black ${
                    isX ? "text-brand-600" : "text-brand-950"
                  }`}
                >
                  {b.letter}
                </span>
                <span className="type-caption mt-3 block font-bold uppercase tracking-[0.06em] text-slate-400">
                  {b.word}
                </span>
                <span className="type-h4 mt-0.5 block font-black text-brand-900">{b.ko}</span>
              </li>
            );
          })}
        </ol>

        <p className="type-meta mt-4 text-slate-500">
          <b className="font-bold text-brand-800">X × X</b> — {brandStory}
        </p>
      </div>
    </section>
  );
}
