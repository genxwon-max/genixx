/**
 * 시험지 **워터마크** — 비스듬히 깔리는 「GENIXX2026」.
 *
 * 표지(ExamCover)에만 있던 것을 문항지에도 깐다. 셋트 · 무료 진단 · 유료 진단이 모두 같은
 * 것을 쓴다. 자리가 둘이다 —
 *
 *   ExamWatermark  종이 한 장 가운데에 한 번. 표지와 셋트의 1번 · 2번
 *   ItemWatermark  **문항 위에 겹쳐서.** 자료 상자와 문항(발문 · 보기)마다 그 위에 깐다
 *
 * 응시자 이름을 겹쳐 까는 화면 보호(ExamGuard의 「응시자 표시 겹치기」)와는 다른 것이다.
 * 그쪽은 누구 화면인지를 남기려고 관리자가 켜는 장치이고, 이것은 어느 시험지인지를 남기는
 * 종이의 무늬라 늘 있다.
 *
 * ── 문항과 겹쳐야 한다 ──
 * 처음에는 자료 칸 · 문제 칸 한가운데에 하나씩 두었다. 글이 짧으면 무늬가 글 아래 빈 자리에
 * 서서, 문항만 오려 내면 무늬 없는 문항이 남았다. 워터마크는 떼어 낼 것에 붙어 있어야 한다.
 * 그래서 칸이 아니라 **문항에** 붙인다 — 자료 상자와 문항이 저마다 제 무늬를 지니고, 글을
 * 내려도 종이와 같이 움직인다. 자료가 길면 한 번으로는 위아래가 비므로 일정한 간격으로
 * 되풀이한다.
 *
 * 같은 까닭으로 문항에서는 글 **뒤**가 아니라 **위**에 얹는다. 뒤에 깔면 흰 바탕이 있는 것
 * (사진 · 「이렇게 써 보세요」 상자 · 답안 칸)이 무늬를 가려, 사진만 오려 내면 역시 깨끗하다.
 *
 * ── 푸는 데 걸리지 않게 ──
 *   글자는 그대로  무늬가 본문 글자와 같은 색이다. 그 색을 글자 위에 얹어도 글자는 달라지지
 *                 않고, 흰 바탕만 4%쯤 가라앉는다 — 뒤에 깐 것과 똑같이 보인다
 *   표지보다 옅게  표지는 한 번 보고 넘기지만 문항지는 시험 내내 읽는다
 *   크게, 듬성하게 작은 글자를 촘촘히 깔면 무늬의 획이 본문 글자와 비슷한 굵기가 되어 읽는
 *                 눈에 걸린다. 획이 본문보다 훨씬 굵으면 바탕의 결로만 남는다
 *   손에 안 잡히게 누르는 것도 끄는 것도 받지 않고(답을 고르고 쓰는 손은 그대로 아래에
 *                 닿는다), 낭독기에도 읽히지 않는다
 */

/**
 * 무늬에 적는 글자 — 「GENIXX2026」.
 *
 * season은 「2026학년도 3분기」 꼴로 온다. 접수 기록이 없는 계정은 회차 설정의 이름으로
 * 물러서는데, 그것은 관리자가 손으로 적는 글이라 해로 시작하지 않을 수 있다. 그때 앞 네
 * 글자를 그대로 붙이면 「GENIXX파일럿 」 같은 것이 종이마다 깔리므로 해가 없으면 이름만 적는다.
 */
export const watermarkOf = (season: string) => `GENIXX${/^\d{4}/.exec(season)?.[0] ?? ""}`;

/* 글꼴을 못 박는다 — 명조로 짠 종이(font-myeongjo) 안에 깔려도 표지와 같은 글자여야 한다 */
const word = "-rotate-[28deg] whitespace-nowrap font-sans font-black tracking-[0.06em]";

const tones = {
  /* 표지 — 종이 한 장을 통째로 쓰는 자리라 크고 또렷하다 */
  cover: "text-[68px] text-exam-text/[0.055] md:text-[104px]",
  /* 문항지 — 표지보다 옅다. 크기는 깔린 자리를 따라 준다: 자료 상자와 문항은 화면마다 폭이
     다르고, 낮은 자리(두 줄짜리 자료 · 셋트 1번)는 폭만 보고 키우면 글자 끝이 밖으로 잘린다.
     위로는 4rem에서 멈춘다 — 넓은 화면에서 폭이 다른 두 칸의 무늬가 같은 크기로 선다 */
  page: "text-[length:clamp(1.75rem,min(11cqw,22cqh),4rem)] text-exam-text/[0.04]",
};

/**
 * 종이 한 장 가운데에 한 번 — 표지와 셋트의 1번 · 2번.
 *
 * 무늬를 깔 종이에 `relative isolate`를 주고 그 안에 둔다. 종이의 바탕 바로 위, 안에 든 것
 * 전부의 아래에 깔린다(-z-10). isolate가 없으면 더 바깥 바탕 밑으로 들어가 보이지 않는다.
 */
export default function ExamWatermark({
  text,
  tone,
}: {
  /** 「GENIXX2026」 — watermarkOf가 만든다 */
  text: string;
  tone: keyof typeof tones;
}) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 flex select-none items-center justify-center overflow-hidden [container-type:size]"
    >
      <span className={`${word} ${tones[tone]}`}>{text}</span>
    </span>
  );
}

/** 한 자리에 설 수 있는 줄 수의 위 끝 — 한 줄이 8rem 이상이라 3000px 넘는 자료까지 덮는다 */
const ROWS = 24;

/**
 * 문항 위에 겹쳐 까는 무늬 — 자료 상자와 문항(QuestionBody)이 저마다 하나씩 든다.
 *
 * 무늬를 얹을 자리에 `relative isolate`를 주고 그 안에 둔다. 그 자리에서 무늬보다 위에
 * 서야 하는 것(아이가 쓰는 긴 답안 칸)은 z-20을 준다.
 *
 * ── 줄 ──
 * 자리를 줄로 **고르게** 나누고 줄마다 가운데에 한 번 적는다. 낮은 자리(짧은 자료 · 보기
 * 넷짜리 문항)는 한 줄이라 한가운데에 한 번이고, 긴 자료는 높이를 따라 줄이 는다. 줄 수는
 * CSS가 센다(auto-fill) — 높이를 재서 다시 그리지 않는다. 그래서 줄을 넉넉히 그려 두고,
 * 쓰이지 않은 줄은 높이 없는 줄로 밀려나 보이지 않는다.
 *
 * 한 줄의 높이는 **폭의 45%**에서 시작한다. 글자 크기가 폭을 따라 줄기 때문이다 — 좁은
 * 칸에서는 무늬가 작아져, 줄을 넓은 칸과 같은 높이로 두면 문항 한가운데만 지나고 위의
 * 발문과 아래 보기가 비켜 간다. 무늬 하나가 차지하는 높이가 폭의 45%쯤이라 그만큼씩 끊는다.
 *
 * 위로는 12rem에서 멈춘다. 서술형 문항은 발문이 위에, 답안 칸이 아래에 선다. 줄이 이보다
 * 길면 문항 하나가 한 줄이 되어 무늬가 답안 칸 뒤로만 들어가고, 정작 찍혀 나갈 발문은
 * 비켜 간다.
 */
export function ItemWatermark({ text }: { text: string }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-10 select-none overflow-hidden [container-type:size]"
    >
      <div className="grid h-full auto-rows-[0px] grid-rows-[repeat(auto-fill,minmax(min(clamp(8rem,45cqw,12rem),100%),1fr))]">
        {Array.from({ length: ROWS }, (_, n) => (
          <span
            key={n}
            className="flex items-center justify-center overflow-hidden [container-type:size]"
          >
            <span className={`${word} ${tones.page}`}>{text}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
