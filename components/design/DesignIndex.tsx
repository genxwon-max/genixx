import Link from "next/link";
import { designHref, screensIn, zoneLabel, type DesignArea, type DesignZone } from "@/lib/designScreens";

const zones: DesignZone[] = ["account", "exam", "admin2", "my", "student", "report", "site", "mail", "message"];

/**
 * 디자인 화면 목록 — /design과 /design2가 함께 쓴다. 구역(area)의 화면만 상태마다 주소로 편다.
 *
 * 디자인을 확인하는 사람이 여는 자리다. 서비스 메뉴에는 두지 않는다.
 */
export default function DesignIndex({
  area,
  title,
  lead,
}: {
  area: DesignArea;
  title: string;
  /** 제목 아래 소개 — 없으면 두지 않는다(/design2) */
  lead?: React.ReactNode;
}) {
  const list0 = screensIn(area);
  const total = list0.reduce((sum, s) => sum + s.states.length, 0);

  return (
    <main className="mx-auto w-full max-w-[72rem] px-5 py-10 text-slate-900 sm:px-8">
      <h1 className="text-[26px] font-bold tracking-tight">{title}</h1>
      {lead && <div className="mt-2.5 max-w-3xl text-[14px] leading-[1.8] text-slate-600">{lead}</div>}
      <p className="mt-1.5 text-[13px] text-slate-500">
        화면 {list0.length}개 · 주소 {total}개
      </p>

      {zones.map((zone) => {
        const list = list0.filter((s) => s.zone === zone);
        if (list.length === 0) return null;
        return (
          <section key={zone} className="mt-10">
            <h2 className="border-b-2 border-slate-900 pb-2 text-[17px] font-bold">{zoneLabel[zone]}</h2>
            {list.map((screen) => (
              <div key={screen.id} className="mt-6">
                <h3 className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-[15px] font-bold">{screen.name}</span>
                  <span className="text-[12.5px] text-slate-500">
                    실제 주소 <span className="font-mono">{screen.real}</span> · WBS {screen.wbs}
                  </span>
                </h3>
                <div className="mt-2.5 overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full min-w-[40rem] border-collapse text-[13px]">
                    <thead>
                      <tr className="bg-slate-50 text-left text-slate-500">
                        <th className="w-[3rem] border-b border-slate-200 px-3 py-2 font-semibold">No</th>
                        <th className="w-[11rem] border-b border-slate-200 px-3 py-2 font-semibold">구분</th>
                        <th className="border-b border-slate-200 px-3 py-2 font-semibold">상태</th>
                        <th className="border-b border-slate-200 px-3 py-2 font-semibold">주소</th>
                      </tr>
                    </thead>
                    <tbody>
                      {screen.states.map((state, i) => {
                        const href = designHref(screen, state.slug);
                        return (
                          <tr key={state.slug} className="border-b border-slate-100 last:border-b-0">
                            <td className="px-3 py-2 tabular-nums text-slate-400">{i + 1}</td>
                            <td className="px-3 py-2 text-slate-600">
                              {state.who ?? "—"}
                              {state.popup && (
                                <span className="ml-1.5 rounded bg-amber-50 px-1.5 py-0.5 text-[11.5px] font-semibold text-amber-700">
                                  팝업
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <span className="font-semibold">{state.name}</span>
                              {state.note && <span className="ml-2 text-slate-500">{state.note}</span>}
                            </td>
                            <td className="px-3 py-2">
                              <Link href={href} className="font-mono text-[12.5px] text-blue-700 hover:underline">
                                {href}
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </section>
        );
      })}
    </main>
  );
}
