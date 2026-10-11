"use client";

import Link from "next/link";
import { designLinks } from "@/lib/designScreens";
import { Body, DescList, FormRow, PageHead, Panel, Status, Tag } from "@/components/admin2/ui";
import ConsoleFrame, { ConsoleDialog, type ConsoleMe as Me } from "../ConsoleFrame";

/**
 * 내 정보 (실제 주소 /admin2/me) — 디자인.
 *
 * 콘솔 상단 바의 이름을 누르면 오는 자리다. 들어온 사람에 따라 두 가지로 갈린다.
 *
 * ── 최상위 관리자 ──
 * 가입으로 만든 계정이 아니라 서비스를 열 때 DB에 넣어 둔 계정이다. 그래서 아이디와 역할은
 * 바꿀 수 없고, 이 화면에서 **연락처 · 비밀번호 · 2단계 인증**을 스스로 고친다. 처음 넣어 둔
 * 비밀번호를 그대로 쓰는 동안에는 화면 맨 위에서 바꾸라고 알린다.
 *
 * 지금의 실제 화면은 이름 · 아이디 · 역할을 읽기만 하는 판 하나뿐이다. 「연락처」 · 「로그인
 * 보안」 · 「최근 로그인」 세 판과 창 두 개(비밀번호 변경 · 2단계 인증)가 여기서 새로 정하는 것이다.
 *
 * ── 전문가 회원 ──
 * 가입 승인에서 받은 권한과, 보호자에게 보이는 프로필(사진 · 직함 · 연혁 · 소개)을 고친다.
 * 프로필 칸은 실제 화면(app/(admin2)/admin2/me/MyInfo.tsx)과 같고, 「로그인 보안」만 더했다.
 */

const to = designLinks("console-me");

const PW_RULE = "최소 8자 · 영문 대문자, 소문자, 숫자, 기호 중 2가지 이상";

const red = { color: "var(--a2-danger)" };
const redLine = { borderColor: "var(--a2-danger)" };

/** 저장 줄 — 상세 화면과 같은 자리(화면 아래에 붙어 따라다닌다) */
function SaveBar({ dirty }: { dirty: boolean }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-3 mt-3 border-t border-(--a2-line) bg-(--a2-panel)/95 px-3 py-2.5 backdrop-blur">
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <span className="mr-auto a2-t-xs text-(--a2-ink-4)">
          {dirty ? "저장하지 않은 변경이 있습니다." : ""}
        </span>
        <button type="button" className="a2-btn" disabled={!dirty}>
          취소
        </button>
        <button type="button" className="a2-btn a2-btn-primary" disabled={!dirty}>
          저장
        </button>
      </div>
    </div>
  );
}

export default function ConsoleMe({ state }: { state: string }) {
  if (state === "expert") return <ExpertMe />;
  return <SuperMe slug={state} />;
}

/* ───────────────────────── 최상위 관리자 ───────────────────────── */

const logins = [
  { at: "2026-10-11 09:02", ip: "121.134.20.18", where: "서울", agent: "Chrome · Windows", ok: true, now: true },
  { at: "2026-10-10 18:47", ip: "121.134.20.18", where: "서울", agent: "Chrome · Windows", ok: true },
  { at: "2026-10-10 08:55", ip: "121.134.20.18", where: "서울", agent: "Chrome · Windows", ok: true },
  { at: "2026-10-09 22:13", ip: "175.223.11.204", where: "세종", agent: "Safari · iPhone", ok: false },
  { at: "2026-10-09 09:10", ip: "121.134.20.18", where: "서울", agent: "Chrome · Windows", ok: true },
];

function SuperMe({ slug }: { slug: string }) {
  const first = slug === "first";
  const editing = slug === "edit";
  const changed = slug === "password/done";
  const pwOpen = slug === "password" || slug === "password/error";
  const pwBad = slug === "password/error";

  return (
    <ConsoleFrame at="/admin2/me" crumb="내 정보">
      <PageHead title="내 정보" />

      <Body className="flex flex-col gap-3">
        {first && (
          <div className="a2-note items-center" style={{ borderLeftColor: "var(--a2-warn)" }}>
            <span className="flex-1">
              <b className="text-(--a2-ink)">처음 받은 비밀번호를 그대로 쓰고 있습니다.</b> 이 계정은 모든 화면과
              개인정보에 접근할 수 있습니다. 지금 새 비밀번호로 바꿔 주세요.
            </span>
            <Link href={to("password")} className="a2-btn a2-btn-sm a2-btn-primary">
              비밀번호 변경
            </Link>
          </div>
        )}
        {changed && (
          <p className="a2-note" style={{ borderLeftColor: "var(--a2-ok)" }}>
            <span>
              <b className="text-(--a2-ink)">비밀번호를 바꿨습니다.</b> 이 브라우저를 뺀 다른 기기에서는 모두
              로그아웃되었습니다.
            </span>
          </p>
        )}

        <Panel title="계정">
          <DescList
            rows={[
              { k: "아이디", v: <span className="a2-mono">admin.park</span> },
              { k: "역할", v: <Tag accent>최상위 관리자</Tag> },
              { k: "화면 권한", v: "모든 화면" },
              { k: "계정을 만든 때", v: <span className="a2-mono">2026-07-01</span> },
            ]}
          />
          <p className="a2-hint mt-2">
            최상위 관리자 계정은 회원가입으로 만들지 않고, 서비스를 열 때 함께 만들어 둔 계정입니다. 아이디와
            역할은 바꿀 수 없습니다.
          </p>
        </Panel>

        <Panel title="연락처" flush>
          <div className="a2-form">
            <FormRow label="이름" req>
              <input aria-label="이름" className="a2-input max-w-56" defaultValue="박서준" />
            </FormRow>
            <FormRow label="이메일" req hint="비밀번호를 잊었을 때 다시 정하는 안내를 이 주소로 받습니다.">
              <input
                aria-label="이메일"
                type="email"
                className="a2-input a2-mono max-w-80"
                defaultValue={editing ? "seojun.park@genixx.kr" : "admin.park@genixx.kr"}
              />
              {editing && (
                <span className="a2-t-xs font-bold" style={{ color: "var(--a2-warn)" }}>
                  수정됨
                </span>
              )}
            </FormRow>
            <FormRow label="휴대전화" hint="2단계 인증 문자와 로그인 알림을 받는 번호입니다.">
              <input
                aria-label="휴대전화"
                type="tel"
                className="a2-input a2-mono max-w-48"
                defaultValue={editing ? "010-7720-4415" : "010-5512-0983"}
              />
              {editing && (
                <span className="a2-t-xs font-bold" style={{ color: "var(--a2-warn)" }}>
                  수정됨
                </span>
              )}
            </FormRow>
          </div>
        </Panel>

        <Panel title="로그인 보안" flush>
          <div className="a2-form">
            <FormRow label="비밀번호">
              {first ? (
                <Status tone="warn">처음 받은 비밀번호 사용 중</Status>
              ) : (
                <span className="a2-t-sm text-(--a2-ink-2)">
                  마지막 변경{" "}
                  <span className="a2-mono text-(--a2-ink)">{changed ? "2026-10-11" : "2026-08-14"}</span>
                  {changed ? " (오늘)" : " (58일 전)"}
                </span>
              )}
              <Link href={to("password")} className="a2-btn">
                비밀번호 변경
              </Link>
            </FormRow>
            <FormRow label="2단계 인증" hint="최상위 관리자 계정은 2단계 인증을 끌 수 없습니다.">
              <Status tone="ok">사용 중</Status>
              <span className="a2-t-sm text-(--a2-ink-2)">인증 앱 · 2026-07-01에 설정</span>
              <Link href={to("mfa")} className="a2-btn">
                다시 설정
              </Link>
            </FormRow>
            <FormRow label="로그인한 기기">
              <span className="a2-t-sm text-(--a2-ink-2)">
                이 브라우저를 포함해 <b className="text-(--a2-ink)">2대</b>에서 로그인 중입니다.
              </span>
              <button type="button" className="a2-btn">
                다른 기기에서 모두 로그아웃
              </button>
            </FormRow>
          </div>
        </Panel>

        <Panel title="최근 로그인" meta="최근 5건" flush>
          <div className="a2-table-wrap">
            <table className="a2-table">
              <thead>
                <tr>
                  <th scope="col" style={{ width: "10rem" }}>
                    시각
                  </th>
                  <th scope="col" style={{ width: "13rem" }}>
                    접속한 곳
                  </th>
                  <th scope="col">브라우저</th>
                  <th scope="col" style={{ width: "9rem" }}>
                    결과
                  </th>
                </tr>
              </thead>
              <tbody>
                {logins.map((l) => (
                  <tr key={l.at}>
                    <td className="a2-mono a2-nowrap a2-t-sm">{l.at}</td>
                    <td className="a2-nowrap">
                      {l.where} <span className="a2-mono a2-t-xs text-(--a2-ink-4)">{l.ip}</span>
                    </td>
                    <td className="a2-nowrap">
                      {l.agent}
                      {l.now && <span className="ml-1.5 a2-t-xs font-bold text-(--a2-accent-2)">지금 이 기기</span>}
                    </td>
                    <td className="a2-nowrap">
                      {l.ok ? <Status tone="ok">로그인</Status> : <Status tone="danger">실패 · 비밀번호 틀림</Status>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-(--a2-line) px-3 py-2 a2-t-xs text-(--a2-ink-4)">
            모르는 로그인이 있으면 비밀번호를 바꾸고 다른 기기에서 모두 로그아웃해 주세요. 전체 기록은{" "}
            <Link href="/admin2/audit" className="underline">
              감사 로그
            </Link>
            에 있습니다.
          </p>
        </Panel>

        <SaveBar dirty={editing} />
      </Body>

      {pwOpen && (
        <ConsoleDialog
          title="비밀번호 변경"
          actions={
            <>
              <Link href={to()} className="a2-btn">
                취소
              </Link>
              <Link href={pwBad ? to("password/error") : to("password/done")} className="a2-btn a2-btn-primary">
                변경
              </Link>
            </>
          }
        >
          <div className="grid gap-2.5">
            <label className="a2-field block">
              <span className="a2-label">지금 비밀번호</span>
              <input
                type="password"
                className="a2-input"
                style={pwBad ? redLine : undefined}
                defaultValue={pwBad ? "wrongpass" : ""}
                autoComplete="current-password"
              />
              {pwBad && (
                <span className="a2-hint block" style={red}>
                  지금 비밀번호가 맞지 않습니다.
                </span>
              )}
            </label>
            <label className="a2-field block">
              <span className="a2-label">새 비밀번호</span>
              <input
                type="password"
                className="a2-input"
                style={pwBad ? redLine : undefined}
                defaultValue={pwBad ? "1234" : ""}
                autoComplete="new-password"
              />
              <span className="a2-hint block" style={pwBad ? red : undefined}>
                {pwBad ? `조건에 맞지 않습니다. ${PW_RULE}` : PW_RULE}
              </span>
            </label>
            <label className="a2-field block">
              <span className="a2-label">새 비밀번호 확인</span>
              <input
                type="password"
                className="a2-input"
                style={pwBad ? redLine : undefined}
                defaultValue={pwBad ? "12345" : ""}
                autoComplete="new-password"
              />
              {pwBad && (
                <span className="a2-hint block" style={red}>
                  새 비밀번호와 서로 다릅니다.
                </span>
              )}
            </label>
          </div>
          <p className="a2-hint mt-3">
            바꾸면 이 브라우저를 뺀 다른 기기에서는 모두 로그아웃됩니다. 지금 쓰는 비밀번호와 같은 비밀번호는
            쓸 수 없습니다.
          </p>
        </ConsoleDialog>
      )}

      {slug === "mfa" && (
        <ConsoleDialog
          title="2단계 인증 다시 설정"
          wide
          actions={
            <>
              <Link href={to()} className="a2-btn">
                취소
              </Link>
              <Link href={to()} className="a2-btn a2-btn-primary">
                설정 완료
              </Link>
            </>
          }
        >
          <ol className="grid gap-3">
            <li className="flex gap-3">
              <span className="a2-mono a2-t-xs flex h-5 w-5 shrink-0 items-center justify-center rounded-(--a2-radius) bg-(--a2-ink) font-bold text-white">
                1
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-(--a2-ink)">인증 앱으로 아래 QR 코드를 읽어 주세요</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  {/* QR 코드 자리 — 실제로는 서버가 만든 코드가 들어온다 */}
                  <span
                    role="img"
                    aria-label="2단계 인증 QR 코드"
                    className="block h-28 w-28 shrink-0 rounded-(--a2-radius) border border-(--a2-line-2) bg-white"
                    style={{
                      backgroundImage:
                        "linear-gradient(45deg, #14181f 25%, transparent 25%, transparent 75%, #14181f 75%), linear-gradient(45deg, #14181f 25%, transparent 25%, transparent 75%, #14181f 75%)",
                      backgroundSize: "14px 14px",
                      backgroundPosition: "0 0, 7px 7px",
                      backgroundClip: "content-box",
                      padding: 8,
                    }}
                  />
                  <span>
                    <span className="a2-label block">QR 코드를 읽을 수 없으면 직접 입력</span>
                    <span className="a2-mono mt-1 block text-(--a2-ink)">JBSW Y3DP EHPK 3PXP</span>
                    <button type="button" className="a2-btn a2-btn-sm mt-1.5">
                      복사
                    </button>
                  </span>
                </div>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="a2-mono a2-t-xs flex h-5 w-5 shrink-0 items-center justify-center rounded-(--a2-radius) bg-(--a2-ink) font-bold text-white">
                2
              </span>
              <label className="min-w-0 flex-1">
                <span className="block font-semibold text-(--a2-ink)">앱에 표시된 6자리 숫자를 입력해 주세요</span>
                <input
                  inputMode="numeric"
                  placeholder="000000"
                  defaultValue=""
                  className="a2-input a2-mono mt-2 max-w-40 text-center tracking-[0.3em]"
                />
              </label>
            </li>
          </ol>
          <p className="a2-note mt-3" style={{ borderLeftColor: "var(--a2-warn)" }}>
            <span>설정을 마치면 예전에 연결한 인증 앱은 더 쓸 수 없습니다.</span>
          </p>
        </ConsoleDialog>
      )}
    </ConsoleFrame>
  );
}

/* ───────────────────────── 전문가 회원 ───────────────────────── */

const expert: Me = { name: "한지수", role: "전문가 · 출제자 · 상담사", loginId: "ex.jisu_han" };

/** 출제자 · 상담사 권한으로 열리는 화면 */
const expertScreens = ["/admin2/authoring", "/admin2/items", "/admin2/counsel", "/admin2/counsel/schedule"];

function ExpertMe() {
  return (
    <ConsoleFrame at="/admin2/me" crumb="내 정보" me={expert} only={expertScreens}>
      <PageHead title="내 정보" />

      <Body className="flex flex-col gap-3">
        <Panel title="계정" meta="EX-2610-004">
          <DescList
            rows={[
              {
                k: "가입 수단",
                v: (
                  <>
                    아이디 가입 · <span className="a2-mono">jisu_han</span>
                  </>
                ),
              },
              { k: "가입 승인", v: "승인됨 · 2026-10-12 10:05" },
              {
                k: "권한",
                v: (
                  <span className="flex flex-wrap gap-2">
                    <Tag>출제자</Tag>
                    <Tag>상담사</Tag>
                  </span>
                ),
              },
            ]}
          />
          <p className="a2-hint mt-2">권한은 운영진이 가입 승인에서 정합니다. 받은 권한의 화면만 왼쪽 메뉴에 보입니다.</p>
        </Panel>

        <Panel title="프로필" meta="보호자가 보는 상담사 카드에 그대로 표시됩니다" flush>
          <div className="a2-form">
            <FormRow label="사진" hint="정사각형으로 잘려 등록됩니다.">
              <span className="flex flex-wrap items-center gap-2.5">
                <span className="flex h-14 w-14 items-center justify-center rounded-(--a2-radius) border border-(--a2-line) bg-(--a2-bg) a2-t-sm font-bold text-(--a2-ink-3)">
                  한
                </span>
                <button type="button" className="a2-btn">
                  사진 올리기
                </button>
              </span>
            </FormRow>
            <FormRow label="이름" req>
              <input aria-label="이름" className="a2-input" style={{ maxWidth: "14rem" }} defaultValue="한지수" />
            </FormRow>
            <FormRow label="직함">
              <input
                aria-label="직함"
                className="a2-input"
                style={{ maxWidth: "22rem" }}
                defaultValue="초등 수학 문항 개발위원"
                placeholder="예) 교육과정 자문위원"
              />
            </FormRow>
            <FormRow label="소속">
              <input aria-label="소속" className="a2-input" style={{ maxWidth: "22rem" }} defaultValue="한국창의영재교육원" />
            </FormRow>
            <FormRow label="전문 분야" hint="여럿이면 쉼표로 나눠 적습니다.">
              <input aria-label="전문 분야" className="a2-input" defaultValue="초등 수학, 문항 개발, 결과 해석" />
            </FormRow>
            <FormRow label="한 줄 소개">
              <input
                aria-label="한 줄 소개"
                className="a2-input"
                defaultValue="아이가 어디에서 막혔는지를 문항을 놓고 함께 짚어 드립니다."
              />
            </FormRow>
            <FormRow label="연혁" hint="한 줄에 하나씩 적습니다.">
              <textarea
                aria-label="연혁"
                className="a2-textarea"
                rows={4}
                defaultValue={"교육학 석사 (수학교육 전공)\n초등학교 교사 11년\n영재학급 수학 담당 5년"}
              />
            </FormRow>
            <FormRow label="소개 내용">
              <textarea
                aria-label="소개 내용"
                className="a2-textarea"
                rows={4}
                defaultValue="교실에서 아이들을 가르치며 수학 문항을 만들어 왔습니다. 점수보다 풀이 과정에서 드러나는 생각의 길을 읽어 드립니다."
              />
            </FormRow>
          </div>
        </Panel>

        <Panel title="로그인 보안" flush>
          <div className="a2-form">
            <FormRow label="비밀번호">
              <span className="a2-t-sm text-(--a2-ink-2)">
                마지막 변경 <span className="a2-mono text-(--a2-ink)">2026-10-11</span> (가입한 날)
              </span>
              <button type="button" className="a2-btn">
                비밀번호 변경
              </button>
            </FormRow>
            <FormRow label="2단계 인증" hint="전문가 회원은 로그인할 때마다 2단계 인증을 거칩니다.">
              <Status tone="ok">사용 중</Status>
              <span className="a2-t-sm text-(--a2-ink-2)">문자 · 010-****-2291</span>
            </FormRow>
          </div>
        </Panel>

        <SaveBar dirty={false} />
      </Body>
    </ConsoleFrame>
  );
}
