"use client";

import Link from "next/link";
import { themeOf } from "@/lib/authVariant";
import { designLinks } from "@/lib/designScreens";
import { AccHead, btnPrimary, card, cardPad } from "@/components/account/ui";
import DashFrame from "../DashFrame";

/**
 * 알림 설정 · 면담 안내와 앱 알림 (실제 주소 /my/account/notification · WBS L.1.13 · M.2.12) — 디자인.
 *
 * 지금의 알림 설정(app/(dash)/my/account/notification/page.tsx)을 값만 적어 넣은 사본으로 옮기고
 * 빠진 것을 더했다. 생김새는 그대로다 — 받을 소식을 세로로, 받는 곳을 가로로 놓은 표에 체크로
 * 고르고 「저장하기」를 누른다.
 *
 * ── 더한 것 ──
 *  · 받을 소식이 넷에서 여덟으로 — 진단 접수 · 결제 완료 · 응시 시작 · 응시 미완료 · 진단 완료 ·
 *    리포트 발행 · 결과 공개 · 면담 안내. 소식마다 한 줄 설명을 붙였다.
 *  · 받는 곳에 「앱 알림」 — 앱 알림 · 카카오 알림톡 · 문자 · 이메일 넷이다.
 *  · 「필수」는 결제 완료와 면담 안내 둘이다. 결제와 예약은 꼭 알려야 하는 거래 안내라 이메일을
 *    끌 수 없게 고정했다(이메일 알림 디자인의 「수신 설정과 관계없이 보내 드립니다」와 같은 규칙).
 *    나머지 세 곳은 고를 수 있다.
 *  · 앱 알림은 기기에서 알림을 허용해야 받는다. 기기에서 꺼져 있으면 그 열을 고를 수 없게 막고
 *    켜는 방법을 안내한다(push-off). 골라 둔 값은 지우지 않는다 — 기기에서 켜면 그대로 다시 받는다.
 *  · 저장한 뒤의 안내(saved).
 *
 * 지금 화면에 있던 「이벤트·소식」은 표에서 뺐다. 광고성 안내는 마케팅 수신 동의에 따르는 것이라
 * 표 아래에 동의 관리로 가는 한 줄만 남겼다.
 */

const t = themeOf(2);
const to = designLinks("notification-settings");

const channels = ["앱 알림", "카카오 알림톡", "문자", "이메일"] as const;
const APP = 0;
const MAIL = 3;

type Kind = {
  id: string;
  label: string;
  desc: string;
  /** 끌 수 없는 소식 — 이메일이 고정된다 */
  required?: boolean;
  /** 받는 곳마다 켜 둔 값 — 앱 알림 · 카카오 알림톡 · 문자 · 이메일 */
  on: [boolean, boolean, boolean, boolean];
};

const kinds: Kind[] = [
  { id: "applied", label: "진단 접수", desc: "진단 접수가 끝나면 응시 기간과 과목을 알려 드립니다.", on: [true, true, false, true] },
  { id: "paid", label: "결제 완료", desc: "결제나 환불이 끝나면 금액과 주문번호를 알려 드립니다.", required: true, on: [true, true, false, true] },
  { id: "open", label: "응시 시작", desc: "접수한 진단의 응시 기간이 시작되는 날 알려 드립니다.", on: [true, true, false, false] },
  { id: "remind", label: "응시 미완료", desc: "응시 마감이 다가오는데 끝내지 않은 과목이 있으면 알려 드립니다.", on: [true, true, false, false] },
  { id: "done", label: "진단 완료", desc: "학생이 모든 과목을 최종 제출하면 알려 드립니다.", on: [true, false, false, false] },
  { id: "report", label: "리포트 발행", desc: "전문가가 확정한 진단 보고서가 발행되면 알려 드립니다.", on: [true, true, false, true] },
  { id: "result", label: "결과 공개", desc: "결과 화면에서 점수와 재능 유형 요약을 볼 수 있게 되면 알려 드립니다.", on: [true, true, false, false] },
  { id: "counsel", label: "면담 안내", desc: "면담 예약 확정 · 일정 변경 · 취소와 면담 하루 전 안내를 보내 드립니다.", required: true, on: [true, true, true, true] },
];

export default function NotificationSettings({ state }: { state: string }) {
  const pushOff = state === "push-off";
  const saved = state === "saved";

  return (
    <DashFrame who="parent" at="/mypage" unread={3} bellHref="/design/my/alerts">
      <AccHead
        title="알림 설정"
        lead="어떤 소식을 어디로 받을지 고르실 수 있습니다."
        back={{ href: "/mypage", label: "마이페이지로" }}
      />

      {saved && (
        <p
          role="status"
          className="mb-4 rounded-[14px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-[14px] leading-[1.7] text-emerald-900"
        >
          <b>알림 설정을 저장했습니다.</b> 지금부터 고르신 대로 보내 드립니다.
        </p>
      )}

      {/* 이 기기에서 알림이 막혀 있을 때 — 무엇이 안 되는지와 켜는 방법 */}
      {pushOff && (
        <section className="mb-4 rounded-[14px] border border-amber-200 bg-amber-50 p-5 sm:p-6">
          <h2 className="text-[15px] font-bold text-amber-900">이 기기에서 앱 알림이 꺼져 있습니다</h2>
          <p className="mt-1.5 text-[13.5px] leading-[1.75] text-amber-900">
            기기에서 알림을 허용해야 앱 알림을 받을 수 있습니다. 지금은 아래 표의 「앱 알림」을 고를 수 없습니다.
            골라 두신 내용은 그대로 저장되어 있어, 알림을 켜면 바로 다시 받습니다.
          </p>
          <dl className="mt-4 grid gap-x-4 gap-y-2 border-t border-amber-200 pt-4 text-[13.5px] leading-[1.7] text-amber-900 sm:grid-cols-[5.5rem_1fr]">
            <dt className="font-bold">휴대전화</dt>
            <dd>
              휴대전화의 「설정」에서 「알림」을 열고, 목록에서 GENIXX를 찾아 「알림 허용」을 켜 주세요.
            </dd>
            <dt className="font-bold">컴퓨터</dt>
            <dd>브라우저 주소창 왼쪽의 자물쇠를 누른 뒤 「알림」을 「허용」으로 바꿔 주세요.</dd>
          </dl>
          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
            <Link href={to()} className={t.btnQuiet}>
              다시 확인하기
            </Link>
            <span className="text-[12.5px] text-amber-900">
              카카오 알림톡 · 문자 · 이메일은 지금도 고르신 대로 보내 드립니다.
            </span>
          </div>
        </section>
      )}

      {/* 상태가 바뀌면 표를 새로 그린다 — 체크는 처음 값(defaultChecked)으로만 정해지기 때문이다 */}
      <div key={state} className={`${card} ${cardPad} max-sm:p-4`}>
        <table className="w-full text-left">
          <caption className="sr-only">받을 소식과 받는 곳</caption>
          <thead>
            <tr>
              <th scope="col" className="pb-3 align-bottom text-[13px] font-bold text-soft-ink">
                받을 소식
              </th>
              {channels.map((c, i) => {
                const off = pushOff && i === APP;
                return (
                  <th
                    key={c}
                    scope="col"
                    className={`w-[2.75rem] px-1 pb-3 text-center align-bottom text-[13px] font-bold sm:w-[6.5rem] ${
                      off ? "bg-slate-50 pt-2.5 text-slate-400" : "text-soft-ink"
                    }`}
                  >
                    {c === "카카오 알림톡" ? (
                      <>
                        <span className="sm:hidden">알림톡</span>
                        <span className="hidden sm:inline">{c}</span>
                      </>
                    ) : (
                      c
                    )}
                    {off && (
                      <span className="mt-0.5 block text-[11px] font-semibold text-amber-700">꺼져 있습니다</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {kinds.map((k) => (
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
                  <span className="mt-1 block text-[13px] leading-relaxed text-soft-muted">{k.desc}</span>
                </td>
                {channels.map((c, i) => {
                  const off = pushOff && i === APP;
                  /* 필수 소식의 이메일은 늘 켜져 있고 끌 수 없다 */
                  const fixed = k.required === true && i === MAIL;
                  return (
                    <td key={c} className={`px-1 py-4 text-center ${off ? "bg-slate-50" : ""}`}>
                      {/* 「항상 발송」은 체크 아래에 띄워 둔다 — 칸 안에 그냥 두면 이 칸의 체크만 위로 밀려
                          같은 줄의 다른 체크와 높이가 어긋난다 */}
                      <span className="relative inline-flex">
                        <input
                          type="checkbox"
                          defaultChecked={k.on[i]}
                          disabled={off || fixed}
                          title={
                            off
                              ? "이 기기에서 앱 알림이 꺼져 있어 고를 수 없습니다"
                              : fixed
                                ? "필수 소식은 이메일로 항상 보내 드립니다"
                                : undefined
                          }
                          aria-label={`${k.label} ${c}`}
                          className="h-5 w-5 accent-[#1b2a6b] disabled:cursor-not-allowed"
                        />
                        {fixed && (
                          <span className="absolute left-1/2 top-full mt-0.5 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold text-soft-muted">
                            항상 발송
                          </span>
                        )}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <ul className="mt-2 space-y-1.5 border-t border-soft-line pt-5 text-[13px] leading-[1.75] text-soft-muted">
          <li>
            · <b className="text-soft-ink">「필수」 소식</b>은 결제와 면담 예약처럼 꼭 알려 드려야 하는 내용이라
            이메일로 항상 보내 드립니다. 앱 알림 · 카카오 알림톡 · 문자로도 받을지는 고르실 수 있습니다.
          </li>
          <li>
            · 카카오 알림톡과 문자는 <b className="tabular-nums text-soft-ink">010-4821-7730</b>, 이메일은{" "}
            <b className="text-soft-ink">jieun.kim@example.com</b>으로 보내 드립니다. 연락처는{" "}
            <Link href="/mypage?section=profile" className="font-semibold text-soft-primary hover:underline">
              회원정보
            </Link>
            에서 바꿀 수 있습니다.
          </li>
          <li>
            · 앱 알림은 지금 쓰는 기기의 화면에 바로 표시되는 알림입니다. 앱 알림을 꺼도 화면 위 종의 알림
            목록에는 모든 소식이 표시됩니다.
          </li>
          <li>
            · 이벤트와 새 소식 같은 광고성 안내는 마케팅 수신에 동의하셔야 보내 드립니다. 동의는{" "}
            <Link href="/mypage?section=consent" className="font-semibold text-soft-primary hover:underline">
              동의 관리
            </Link>
            에서 바꿀 수 있습니다.
          </li>
        </ul>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
        {saved && <span className="text-[13px] font-semibold text-emerald-700">저장했습니다</span>}
        {state === "" ? (
          <Link href={to("saved")} className={btnPrimary}>
            저장하기
          </Link>
        ) : (
          <button type="button" className={btnPrimary}>
            저장하기
          </button>
        )}
      </div>
    </DashFrame>
  );
}
