import type { Metadata } from "next";
import { notificationChannels, notificationKinds } from "@/lib/account";
import { AccHead, btnPrimary, card, cardPad } from "@/components/account/ui";

export const metadata: Metadata = {
  title: "알림 설정",
  description: "응시 안내·리포트 발행·재진단 리마인드 채널 선택. (ACC-04-1)",
  robots: { index: false, follow: false },
};

/** ACC-04-1 알림 설정 */
export default function NotificationPage() {
  return (
    <>
      <AccHead
        id="ACC-04-1"
        title="알림 설정"
        lead="어떤 소식을 어디로 받을지 고르실 수 있습니다."
        back={{ href: "/my/account", label: "내 정보 설정으로" }}
      />

      <div className={`${card} ${cardPad}`}>
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="pb-3 text-[13px] font-bold text-soft-ink">받을 소식</th>
              {notificationChannels.map((c) => (
                <th key={c} className="pb-3 text-center text-[13px] font-bold text-soft-ink">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {notificationKinds.map((k) => (
              <tr key={k.id} className="border-t border-soft-line">
                <td className="py-4 pr-4">
                  <span className="block text-[15px] font-bold text-soft-ink">
                    {k.label}
                    {k.required && (
                      <span className="ml-2 rounded border border-rose-300 bg-rose-50 px-1.5 py-0.5 text-[11px] font-bold text-rose-700">
                        필수
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block text-[13px] leading-relaxed text-soft-muted">
                    {k.desc}
                  </span>
                </td>
                {notificationChannels.map((c) => (
                  <td key={c} className="py-4 text-center">
                    <input
                      type="checkbox"
                      defaultChecked={k.required}
                      disabled={k.required && c === "SMS"}
                      aria-label={`${k.label} ${c}`}
                      className="h-5 w-5 accent-[#1b2a6b]"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 rounded-lg border border-soft-line bg-slate-50 px-5 py-4 text-[13px] leading-relaxed text-soft-muted">
        응시 안내와 리포트 발행은 최소 한 개 채널로는 반드시 받으셔야 합니다. 아이의 응시 기한을
        놓치면 회차가 마감되기 때문입니다.
      </p>

      <button type="button" className={`${btnPrimary} mt-5`}>
        저장하기
      </button>
    </>
  );
}
