"use client";

import Link from "next/link";
import { ANCHOR_RATIO } from "@/lib/blueprint";
import { roundsOf, useForms } from "@/lib/formStore";
import { useItems } from "@/lib/itemStore";
import { Callout } from "./Parts";
import * as a from "./ui";

/**
 * 앵커 문항 상태 (ADM-04-2).
 *
 * 앵커는 회차가 달라도 같은 잣대로 재기 위해 두는 기준 문항이다. 26A와 26B의 점수를
 * 견주려면 두 회차에 똑같이 들어간 문항이 있어야 하고(등화), 그 문항이 흔들리면
 * 회차 사이의 성장 그래프가 통째로 흔들린다.
 *
 * 예전에는 이 자리에 표가 셋 있었다 — 지정된 것, 삼을 수 있는 것, 공개되어 못 쓰는
 * 것. 문항 열한 건짜리 은행에 표 셋이었고, 화면 1,900px을 썼다. 앵커는 문항이 가진
 * 참·거짓 값 하나(item.anchor)이지 따로 관리할 목록이 아니다. 그래서 **지정·해제는
 * 문항 상세로 옮기고**, 여기에는 등화가 성립하는지만 남긴다.
 *
 * 남긴 것은 셋이다.
 *
 *  1) **비율** — 발주서 §7.1의 30%를 채우고 있는가.
 *  2) **공개된 앵커** — 답이 알려진 문항은 기준 노릇을 못 한다.
 *  3) **사용 중지된 앵커** — 회차에 나가지 않는 문항은 등화 기준이 되지 못한다.
 *
 * 셋 다 「지금 등화가 되는가」를 묻는다. 하나라도 걸리면 회차 간 비교가 그 순간
 * 의미를 잃으므로, 목록이 아니라 경고로 세운다.
 */
export default function AnchorStatus() {
  const items = useItems();
  const forms = useForms();

  /* 앵커 비율은 「확정된 문항」을 모수로 본다. 아직 검수도 안 지난 초안까지 세면
     비율이 저절로 낮아 보이고, 그 숫자로는 아무 판단도 할 수 없다. */
  const confirmed = items.filter((i) => i.state === "approved" || i.state === "retired");
  const anchors = confirmed.filter((i) => i.anchor);
  const ratio = confirmed.length > 0 ? anchors.length / confirmed.length : 0;
  const target = Math.ceil(confirmed.length * ANCHOR_RATIO);

  const candidates = items.filter((i) => i.state === "approved" && !i.anchor && !i.disclosed);
  const retiredAnchors = anchors.filter((i) => i.state === "retired");
  /* 앵커로 삼은 뒤에 공개되는 일도 있다. 지정 때만 막으면 그 뒤는 못 잡는다. */
  const leaked = anchors.filter((i) => i.disclosed);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="앵커 문항"
          value={`${anchors.length}건`}
          note={`확정 문항 ${confirmed.length}건 중`}
        />
        <Stat
          label="지금 비율"
          value={`${Math.round(ratio * 100)}%`}
          note={`목표 ${Math.round(ANCHOR_RATIO * 100)}% · ${target}건`}
          tone={ratio >= ANCHOR_RATIO ? "good" : "warn"}
        />
        <Stat
          label="앵커로 삼을 수 있는 문항"
          value={`${candidates.length}건`}
          note="승인되었고 공개된 적 없는 문항"
        />
      </div>

      {ratio < ANCHOR_RATIO && (
        <div className="mt-5">
          <Callout tone="warn" title={`앵커가 ${target - anchors.length}건 모자랍니다`}>
            앵커가 모자라면 회차 사이의 점수를 견줄 수 없습니다. 승인된 문항을 열어 앵커로
            삼으시면 됩니다 — 지금 삼을 수 있는 것이 {candidates.length}건 있습니다. 앵커는 사후
            공개하지 않고 오래 씁니다.
          </Callout>
        </div>
      )}

      {retiredAnchors.length > 0 && (
        <div className="mt-4">
          <Callout tone="warn" title="사용 중지된 문항이 앵커로 남아 있습니다">
            {retiredAnchors.map((i) => i.code || i.id).join(", ")} — 회차에 나가지 않는 문항은 등화
            기준이 되지 못합니다. 앵커에서 빼거나 다시 쓰기로 되돌려 주세요.
          </Callout>
        </div>
      )}

      {leaked.length > 0 && (
        <div className="mt-4">
          <Callout tone="warn" title="공개된 문항이 앵커로 남아 있습니다">
            {leaked.map((i) => i.code || i.id).join(", ")} — 답이 알려진 문항은 회차 간 잣대가 되지
            못합니다. 앵커에서 빼고 다른 문항으로 채워 주세요.
          </Callout>
        </div>
      )}

      {/* 표를 세우지 않는다. 앵커는 네댓 건이고, 여기서 할 일은 「어느 것인지 확인하고
          하나 열어 보는 것」뿐이다. 그 일에는 줄 이름 여덟 개짜리 표가 필요 없다. */}
      <div className={`${a.panel} mt-5 p-5`}>
        <h3 className={a.label}>지금 앵커로 쓰는 문항</h3>
        {anchors.length === 0 ? (
          <p className={`${a.bodyText} mt-2`}>아직 앵커로 지정된 문항이 없습니다.</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {anchors.map((i) => {
              const went = roundsOf(i.id, forms);
              return (
                <li key={i.id}>
                  <Link
                    href={`/admin/items/${i.id}`}
                    className="block rounded-md border border-exam-line px-3.5 py-2 transition-colors hover:bg-exam-raised"
                  >
                    <span className="adm-t-md font-bold text-brand-800">{i.code || i.id}</span>
                    <span className={`${a.hint} ml-2`}>
                      {i.level} · {went.length === 0 ? "아직 안 나감" : `${went.length}회차`}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <p className={`${a.hint} mt-4`}>
          앵커로 삼거나 빼는 일은 문항을 열어서 합니다. 등화 기준이 바뀌는 일이라 까닭을 받아
          기록에 남깁니다.
        </p>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  tone?: "good" | "warn";
}) {
  const color = tone === "good" ? "text-emerald-700" : tone === "warn" ? "text-rose-700" : "";
  return (
    <div className={`${a.panel} p-4`}>
      <p className={a.label}>{label}</p>
      <p className={`${a.metric} mt-1 ${color}`}>{value}</p>
      <p className={`${a.hint} mt-0.5`}>{note}</p>
    </div>
  );
}
