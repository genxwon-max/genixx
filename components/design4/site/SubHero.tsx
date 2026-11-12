/**
 * /design4 하위 화면의 머리 — 화면 이름과 회색 상자 안의 한두 줄 설명.
 *
 * 현재 위치 줄과 갈래 메뉴는 틀(Frame4)이 그리므로 여기에는 두지 않는다. 공개 사이트의
 * SubHero와 같은 모양으로 받아(href · title · lead) 사본 화면이 import만 바꿔 쓰게 했다.
 */
export default function SubHero({
  title,
  lead,
}: {
  /** 공개 사이트 SubHero와 모양을 맞추려고 받기만 한다 */
  href?: string;
  title: string;
  lead?: string;
}) {
  return (
    <header className="mb-10 md:mb-12">
      <h1 className="mt-3 text-[26px] font-bold leading-snug tracking-[-0.03em] text-slate-900 md:text-[32px]">
        {title}
      </h1>
      {lead && (
        <p className="mt-5 rounded-2xl bg-[var(--d4-tint)] px-5 py-4 text-[14.5px] leading-[1.8] text-slate-600 md:px-6 md:py-5 md:text-[15px]">
          {lead}
        </p>
      )}
    </header>
  );
}
