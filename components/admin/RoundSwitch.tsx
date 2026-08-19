import Link from "next/link";
import { rounds } from "@/lib/admin";
import * as a from "./ui";

/**
 * 대시보드의 회차 고르개.
 *
 * 진단은 분기마다 한 번, 한 해에 네 번 돈다. 대시보드가 늘 최신 회차만 보여 주면
 * 지난 분기가 어디까지 갔는지 확인하려고 회차 현황 화면까지 들어갔다 나와야 한다.
 * 여기서 바로 앞뒤로 넘긴다.
 *
 * 고른 회차는 주소에 남긴다(`/admin?round=2026-2`). 화면 안 상태로 들고 있으면
 * 뒤로 가기가 듣지 않고, 「2회차 화면」을 남에게 그대로 보낼 수도 없다.
 *
 * 상태(응시 진행중·채점중·마감)는 여기 적지 않는다. 회차를 고르는 데 필요한 것은
 * 어느 회차이고 언제였는가뿐이고, 그 회차가 어디까지 갔는지는 바로 아래 진행률이
 * 이미 말한다. 회차 상태를 갈래로 다루는 자리는 회차 현황(ADM-05)이다.
 *
 * ── 화살표 ──
 * rounds는 최신이 앞이라, 「‹ 이전」은 배열 뒤(지난 분기)로, 「다음 ›」은 앞(새
 * 회차)으로 간다. 끝에 닿으면 사라지지 않고 옅은 회색으로 자리를 지킨다 — 없어졌다
 * 생겼다 하면 가운데 이름이 좌우로 흔들린다. 글자 라벨이 없으므로 aria-label로
 * 어느 회차로 가는지까지 읽어 준다.
 */
const arrowShape =
  "inline-flex min-h-[2rem] min-w-[2rem] items-center justify-center rounded-md border adm-t-md font-bold transition-colors";

export default function RoundSwitch({ id }: { id: string }) {
  const at = Math.max(
    0,
    rounds.findIndex((r) => r.id === id),
  );
  const round = rounds[at];
  const older = rounds[at + 1];
  const newer = rounds[at - 1];

  const arrow = (to: (typeof rounds)[number] | undefined, label: string, mark: string) =>
    to ? (
      <Link
        href={`/admin?round=${to.id}`}
        aria-label={`${label} — ${to.label}`}
        className={`${arrowShape} border-exam-line bg-white text-exam-text hover:bg-exam-raised`}
      >
        {mark}
      </Link>
    ) : (
      <span aria-hidden className={`${arrowShape} border-exam-line/60 bg-white text-exam-line`}>
        {mark}
      </span>
    );

  return (
    <nav aria-label="회차 고르기" className="flex items-center gap-2">
      {arrow(older, "이전 회차", "‹")}

      {/* 이름 칸의 바닥 너비를 붙들어 둔다. 회차마다 글자 수가 달라 그대로 두면
          화살표가 좌우로 밀리고, 연달아 넘길 때 손이 매번 자리를 다시 찾는다.
          min-으로 두는 것은 글자를 1.6배까지 키우는 콘솔이라 위로는 열려 있어야
          하기 때문이다. */}
      <p className="min-w-[9.5rem] text-center">
        <span className="block adm-t-md font-black text-exam-text">{round.label}</span>
        <span className={`${a.hint} block`}>{round.period}</span>
      </p>

      {arrow(newer, "다음 회차", "›")}
    </nav>
  );
}
