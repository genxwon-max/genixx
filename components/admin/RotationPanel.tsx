"use client";

import { useMemo } from "react";
import { rounds } from "@/lib/admin";
import { useForms, type ExamForm } from "@/lib/formStore";
import { useItems } from "@/lib/itemStore";
import { useSecurity } from "@/lib/securityStore";
import { ItemCode, LevelText, RateText } from "./itemColumns";
import { Callout, TableCard } from "./Parts";
import * as a from "./ui";

/**
 * 문항 회전 · 노출 이력 (ADM-04-4).
 *
 * 같은 문항이 같은 자리에 계속 나오면 몇 회차 만에 답이 돌고, 그때부터 그 문항은
 * 아이의 힘이 아니라 정보를 잰다. 그래서 몇 번 나갔는지를 세고, 한계에 닿은 것은
 * 한 회차 쉬게 한다.
 *
 * 노출 이력은 확정된 검사지에서 읽어 온다 — 따로 적어 두면 언젠가 어긋나고, 어긋난
 * 순간 어느 쪽이 맞는지 아무도 답할 수 없다.
 *
 * ── 이 화면에서 빠진 것 두 가지 ──
 *
 * **화면 보호**(복사·오른쪽 단추·워터마크)는 회차 쪽으로 옮겼다. 바꾸는 것이 문항이
 * 아니라 응시 환경이라, 제한 시간·자동 제출과 같은 자리에 있어야 「이번 회차의 응시
 * 조건」을 한 번에 볼 수 있다. → components/admin/ScreenGuardPanel.tsx
 *
 * **응시자별 동적 할당**은 걷어냈다. 값을 저장하고 겹침 기대값을 셈해 보여 주기만
 * 했을 뿐, 실제 응시는 그 값을 읽지 않았다(응시 문항은 lib/examQuestions.ts에 고정).
 * 화면에 있으면 되는 줄 알게 되므로, 실제로 배정을 하게 될 때 다시 세운다. 그때도
 * 은행이 배정 문항 수의 두 배는 되어야 뜻이 있다.
 */
export default function RotationPanel() {
  const items = useItems();
  const forms = useForms();
  const settings = useSecurity();

  /* 확정된 검사지만 실제로 나간 것이다. 초안은 아직 아무도 보지 않았다. */
  const live = useMemo(() => forms.filter((f) => f.state === "confirmed"), [forms]);

  const exposure = useMemo(() => {
    const map = new Map<string, ExamForm[]>();
    for (const f of live) {
      for (const id of f.itemIds) map.set(id, [...(map.get(id) ?? []), f]);
    }
    return map;
  }, [live]);

  const used = items
    .filter((i) => exposure.has(i.id))
    .map((i) => {
      const on = exposure.get(i.id)!;
      const labels = on.map((f) => rounds.find((r) => r.id === f.round)?.label ?? f.round);
      /* 앵커는 회전에서 뺀다 — 회차마다 똑같이 들어가야 등화의 기준이 된다 */
      const rest = i.anchor ? false : on.length >= settings.maxRuns;
      return { item: i, runs: on.length, labels, rest };
    })
    .sort((x, y) => y.runs - x.runs);

  const resting = used.filter((u) => u.rest);
  const pool = items.filter((i) => i.state === "approved");
  const neverUsed = pool.filter((i) => !exposure.has(i.id));

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="확정되어 나간 검사지" value={`${live.length}건`} note="초안은 세지 않습니다" />
        <Stat
          label="한 번이라도 나간 문항"
          value={`${used.length}건`}
          note={`승인 문항 ${pool.length}건 중`}
        />
        <Stat
          label="쉬어야 하는 문항"
          value={`${resting.length}건`}
          note={`앵커를 뺀 문항이 ${settings.maxRuns}회 연달아 나갔습니다`}
          tone={resting.length > 0 ? "warn" : "good"}
        />
      </div>

      {resting.length > 0 && (
        <div className="mt-5">
          <Callout tone="warn" title={`쉬게 할 문항 ${resting.length}건`}>
            {resting.map((r) => r.item.code || r.item.id).join(", ")} — 다음 회차 검사지를 조립할
            때 빼 주세요. 대신 넣을 문항은 아직 한 번도 나가지 않은 {neverUsed.length}건 중에서
            고르시면 됩니다.
          </Callout>
        </div>
      )}

      <div className="mt-5">
        <TableCard
          title={`나간 문항 ${used.length}건`}
          caption="확정된 검사지에서 읽어 옵니다. 앵커는 회전 대상이 아닙니다 — 회차마다 똑같이 들어가야 회차 사이를 견주는 기준이 됩니다."
        >
          {used.length === 0 ? (
            <p className={`${a.bodyText} px-5 py-8`}>
              아직 확정된 검사지가 없어 나간 문항이 없습니다.
            </p>
          ) : (
            <table className={a.table}>
              <thead>
                <tr>
                  <th className={a.th}>문항번호</th>
                  <th className={a.th}>단계</th>
                  <th className={a.th}>나간 횟수</th>
                  <th className={a.th}>나간 회차</th>
                  <th className={a.th}>정답률</th>
                  <th className={a.th}>앵커</th>
                  <th className={a.th}>다음 회차</th>
                </tr>
              </thead>
              <tbody>
                {used.map(({ item, runs, labels, rest }) => (
                  <tr key={item.id}>
                    <td className={a.tdStrongTight}>
                      <ItemCode item={item} />
                    </td>
                    <td className={a.tdTight}>
                      <LevelText item={item} />
                    </td>
                    <td className={a.tdNum}>{runs}회</td>
                    <td className={a.td}>{labels.join(", ")}</td>
                    <td className={`${a.tdNum} ${a.nowrap}`}>
                      <RateText item={item} />
                    </td>
                    <td className={a.tdTight}>{item.anchor ? "앵커" : "—"}</td>
                    <td className={a.td}>
                      {item.anchor ? (
                        <span className="font-bold text-brand-700">계속 넣습니다</span>
                      ) : rest ? (
                        <span className="font-bold text-amber-700">한 회차 쉬게 하세요</span>
                      ) : (
                        <span className={a.hint}>넣어도 됩니다</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </TableCard>
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
  const color = tone === "good" ? "text-emerald-700" : tone === "warn" ? "text-amber-700" : "";
  return (
    <div className={`${a.panel} p-4`}>
      <p className={a.label}>{label}</p>
      <p className={`${a.metric} mt-1 ${color}`}>{value}</p>
      <p className={`${a.hint} mt-0.5`}>{note}</p>
    </div>
  );
}
