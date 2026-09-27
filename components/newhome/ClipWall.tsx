"use client";

import Rise from "@/components/newhome/Rise";
import { useClips } from "@/lib/clipStore";
import type { Clip } from "@/lib/promoClips";

/**
 * /newhome ⑤ 「영상으로 보기」 — 걸린 영상 카드들.
 *
 * 첫 화면에서 이 칸만 떼어 클라이언트로 내린 까닭은 하나다. 영상 목록이 관리자가 고치는
 * 값이 되었고(lib/clipStore.ts) 그 저장소는 브라우저에만 있다. 페이지째 클라이언트로
 * 내리면 문항 판·진단서 시안까지 함께 내려가므로, 저장소를 읽는 칸만 뗀다.
 *
 * 서버는 씨앗을 그리고 브라우저가 저장분으로 덮는다(useSyncExternalStore의 서버 스냅숏).
 *
 * 영상이 한 칸도 없으면 **구간째 그리지 않는다.** 「영상으로 보기」라고 적어 놓고 아래가
 * 비어 있으면 화면이 고장 난 것으로 읽힌다.
 */

/** 영상 한 칸 — 주소가 없으면 링크가 아니라 「준비 중」으로 그린다 */
function ClipCard({ clip }: { clip: Clip }) {
  const ratio = clip.kind === "long" ? "aspect-video" : "aspect-[9/16]";
  const inner = (
    <>
      <div className={`relative ${ratio} overflow-hidden rounded-xl bg-brand-800`}>
        <span
          aria-hidden
          className="absolute inset-0 flex items-center justify-center text-white/90"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/40 backdrop-blur-sm transition-transform duration-200 group-hover:scale-110">
            <svg viewBox="0 0 24 24" className="ml-0.5 h-6 w-6 fill-current">
              <path d="M8 5.5v13l11-6.5z" />
            </svg>
          </span>
        </span>
        {clip.length && (
          <span className="type-tag absolute right-2.5 bottom-2.5 rounded bg-brand-950/70 px-1.5 py-0.5 text-white tabular-nums">
            {clip.length}
          </span>
        )}
        {!clip.url && (
          <span className="type-tag absolute top-2.5 left-2.5 rounded-full bg-white/90 px-2 py-0.5 text-brand-800">
            준비 중
          </span>
        )}
      </div>
      {/* 어두운 바탕(⑤ 구간)에만 놓이는 카드라 글자색을 여기서 정해 둔다 */}
      <p className="type-h4 mt-3 font-black text-white">{clip.title}</p>
      <p className="type-caption mt-1 text-brand-100">{clip.desc}</p>
    </>
  );

  /* 숏폼은 격자에 맡기지 않고 폭을 못 박는다 — 세로 9:16이라 칸이 넓어지면 카드 하나가
     화면 높이를 넘어간다. 개수가 늘거나 줄어도 같은 크기로 줄을 채운다. */
  const box = `group block ${clip.kind === "short" ? "w-[calc(50%-0.625rem)] sm:w-42" : ""}`;

  return clip.url ? (
    <a href={clip.url} target="_blank" rel="noreferrer" className={box}>
      {inner}
    </a>
  ) : (
    <div className={`${box} cursor-default`}>{inner}</div>
  );
}

export default function ClipWall() {
  const longClips = useClips("long");
  const shortClips = useClips("short");

  if (longClips.length === 0 && shortClips.length === 0) return null;

  return (
    <section className="section-y bg-brand-950 text-white">
      <div className="container-x">
        <Rise>
          <p className="type-eyebrow text-brand-300">영상으로 보기</p>
          <h2 className="type-h2 mt-2 font-black">읽기보다 보는 쪽이 빠르다면</h2>
          <p className="type-lead mt-3 max-w-2xl text-brand-100">
            진단 과정과 진단서 읽는 법을 영상으로 정리하고 있습니다. 올라오는 대로 이 자리에
            걸립니다.
          </p>
        </Rise>

        {longClips.length > 0 && (
          <Rise delay={80} className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {longClips.map((c) => (
              <ClipCard key={c.id} clip={c} />
            ))}
          </Rise>
        )}

        {shortClips.length > 0 && (
          <Rise delay={120} className="mt-10">
            <p className="type-eyebrow text-brand-300">숏폼</p>
            <div className="mt-3 flex flex-wrap gap-5">
              {shortClips.map((c) => (
                <ClipCard key={c.id} clip={c} />
              ))}
            </div>
          </Rise>
        )}
      </div>
    </section>
  );
}
