"use client";

import Link from "next/link";
import { can, maySelfReview, pending, roleOf, type Round } from "@/lib/admin";
import { useAdminPrefs } from "@/lib/adminStore";
import { useHydrated } from "@/lib/examStore";
import { useItems } from "@/lib/itemStore";
import * as a from "./ui";

/**
 * 내게 온 일 (ADM-01).
 *
 * 사이트맵이 대시보드에 요구하는 셋 — **내 배정 건수 · 마감 · 반려 알림**.
 *
 * ── 왼쪽 메뉴 배지와 무엇이 다른가 ──
 *
 * 예전에 이 자리에 대기 큐 일곱 줄을 세워 두었다가 걷어냈다. 「검수 워크벤치 8건」을
 * 메뉴 배지가 이미 늘 띄우고 있는데 대시보드가 같은 숫자를 같은 링크로 한 번 더
 * 보여 주는 것이었기 때문이다.
 *
 * 여기 있는 것은 그 숫자가 아니다.
 *
 *   배지  「검수 워크벤치 8건」  — 콘솔 전체에 쌓인 갈래별 건수
 *   여기  「내가 검수할 문항 3건」 — 내가 쓰지 않아 내가 볼 수 있는 것만
 *         「반려되어 되돌아온 내 문항 1건」 — 내 아이디로 쓴 것 중 되돌아온 것
 *         「응시 마감 D-12」 — 배지에는 없는 값
 *
 * 그래서 숫자는 예시값이 아니라 실제 문항 저장소에서 센다. 하나만 예외가 발행 승인
 * 대기인데(마스터), 리포트 저장소가 아직 없어 예시 수치를 쓴다. 화면에 그렇게 적는다.
 *
 * ⚠ 줄을 늘리지 않는다. 역할 하나가 보는 줄이 넷을 넘어가는 순간 이 판은 다시
 *   「모든 큐 목록」이 되고, 그러면 메뉴 배지와 겹치던 옛 문제로 돌아간다.
 */

/** 오늘부터 마감까지 며칠 — 마감일 당일은 0 */
function daysLeft(closesOn: string) {
  const day = 24 * 60 * 60 * 1000;
  const today = new Date();
  const end = new Date(`${closesOn}T00:00:00`);
  const from = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.round((end.getTime() - from) / day);
}

type Alert = {
  kind: "배정" | "마감" | "반려";
  label: string;
  value: string;
  href: string;
  /** 지금 손대야 하는 것인가 — 색과 함께 「반려」·「마감」 꼬리표가 늘 붙는다 */
  urgent: boolean;
  note?: string;
};

export default function MyAlerts({ round }: { round: Round }) {
  const prefs = useAdminPrefs();
  const items = useItems();
  const hydrated = useHydrated();

  /* 로그인한 사람이 누구인지 브라우저에만 있어서, 하이드레이션 전에는 세지 않는다.
     자리는 미리 잡아 둔다 — 늦게 나타나면 아래 있던 것이 통째로 밀린다. */
  if (!hydrated) return <div className="mt-6 min-h-[9rem]" />;

  const mine = items.filter((i) => i.author === prefs.loginId);
  const rejected = mine.filter((i) => i.state === "rejected");
  const drafting = mine.filter((i) => i.state === "draft");
  const toReview = items.filter(
    (i) => i.state === "submitted" && (maySelfReview(prefs.role) || i.author !== prefs.loginId),
  );

  const left = daysLeft(round.closesOn);
  const alerts: Alert[] = [];

  /* 반려가 맨 위다. 되돌아온 문항은 내가 손대지 않으면 아무도 손대지 않는다. */
  if (can(prefs.role, "item.write") && rejected.length > 0) {
    alerts.push({
      kind: "반려",
      label: "반려되어 되돌아온 내 문항",
      value: `${rejected.length}건`,
      href: "/admin/authoring",
      urgent: true,
      note: rejected
        .slice(0, 3)
        .map((i) => i.code || i.id)
        .join(", "),
    });
  }

  if (can(prefs.role, "item.review")) {
    alerts.push({
      kind: "배정",
      label: "내가 검수할 문항",
      value: `${toReview.length}건`,
      href: "/admin/review",
      urgent: toReview.length > 0,
      note: maySelfReview(prefs.role) ? undefined : "내가 쓴 문항은 빼고 셉니다",
    });
  }

  if (can(prefs.role, "item.write")) {
    alerts.push({
      kind: "배정",
      label: "작성 중인 내 문항",
      value: `${drafting.length}건`,
      href: "/admin/authoring",
      urgent: false,
      note: "제출해야 검수로 넘어갑니다",
    });
  }

  if (can(prefs.role, "report.publish")) {
    alerts.push({
      kind: "배정",
      label: "발행 승인을 기다리는 리포트",
      value: `${pending.reports}건`,
      href: "/admin/report-approval",
      urgent: true,
      note: "예시 수치입니다",
    });
  }

  /* 마감은 늘 마지막에 둔다. 건수가 아니라 날짜라, 위 숫자들과 같은 줄로 읽히면
     안 된다. 지난 회차를 보고 있으면 남은 날이 아니라 지난 날을 적는다. */
  alerts.push({
    kind: "마감",
    label: `${round.label} 응시 마감`,
    value: left > 0 ? `D-${left}` : left === 0 ? "오늘" : `${-left}일 지남`,
    href: "/admin/rounds",
    urgent: left >= 0 && left <= 7,
    note: `${round.closesOn.replace(/-/g, ".")}까지`,
  });

  return (
    <section className="mt-6">
      <h2 className={a.cardTitle}>{roleOf(prefs.role).short}님께 온 것</h2>
      <ul className="mt-3 border-b border-exam-line">
        {alerts.map((x) => (
          <li key={x.label} className="border-t border-exam-line">
            <Link
              href={x.href}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-3 transition-colors hover:bg-exam-raised"
            >
              {/* 색만으로 급한 것을 알리지 않는다 — 갈래를 글자로 먼저 적는다 */}
              <span
                className={`${a.badge} min-w-[2.5rem] ${
                  x.kind === "반려"
                    ? "text-rose-700"
                    : x.kind === "마감"
                      ? "text-amber-700"
                      : "text-exam-muted"
                }`}
              >
                {x.kind}
              </span>
              <span className="adm-t-md font-bold text-exam-text">{x.label}</span>
              {x.note && <span className="adm-t-sm text-exam-muted">{x.note}</span>}
              <span
                className={`ml-auto adm-t-md font-bold tabular-nums ${
                  x.urgent ? "text-rose-700" : "text-exam-text"
                }`}
              >
                {x.value}
              </span>
              <span className="adm-t-sm font-bold text-brand-700">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
