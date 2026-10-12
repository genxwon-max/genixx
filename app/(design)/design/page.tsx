import type { Metadata } from "next";
import Link from "next/link";
import { designHref, designScreens, zoneLabel, type DesignZone } from "@/lib/designScreens";

export const metadata: Metadata = {
  title: "디자인 화면 목록",
  robots: { index: false, follow: false },
};

const zones: DesignZone[] = ["account", "exam", "admin2", "my", "student", "report", "site", "mail"];

/**
 * 디자인 화면 목록 (/design) — 상태마다 나눈 주소를 한 장에 모은다.
 *
 * 디자인을 확인하는 사람이 여는 자리다. 서비스 메뉴에는 두지 않는다.
 */
export default function DesignIndexPage() {
  const total = designScreens.reduce((sum, s) => sum + s.states.length, 0);

  return (
    <main className="mx-auto w-full max-w-[72rem] px-5 py-10 text-slate-900 sm:px-8">
      <h1 className="text-[26px] font-bold tracking-tight">디자인 화면 목록</h1>
      <p className="mt-2.5 max-w-3xl text-[14px] leading-[1.8] text-slate-600">
        화면마다, 상태마다 주소를 따로 두었습니다. 비회원 · 회원처럼 보는 사람에 따라 달라지는 화면과
        팝업이 열린 화면 · 닫힌 화면도 주소가 다릅니다. 화면의 값은 모두 예시로 적어 둔 것이고,
        단추는 다른 상태로 넘어가는 것만 눌립니다.
      </p>
      <p className="mt-1.5 text-[13px] text-slate-500">
        화면 {designScreens.length}개 · 주소 {total}개
      </p>

      {zones.map((zone) => {
        const list = designScreens.filter((s) => s.zone === zone);
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
