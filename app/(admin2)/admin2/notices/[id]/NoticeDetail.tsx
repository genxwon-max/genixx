"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import {
  blankNotice,
  removeNotice,
  saveNotice,
  today,
  useContent,
  type Notice,
} from "@/lib/contentStore";
import BodyEditor from "@/components/admin2/BodyEditor";
import { LeaveDialog, PageSaveBar, useEditDraft, useUnsavedGuard } from "@/components/admin2/EditGuard";
import { Body, FormRow, PageHead, Panel } from "@/components/admin2/ui";

/**
 * ADM-15 공지 상세 — 하나를 쓰고 고친다.
 *
 * 주소가 있어야 하는 까닭은 둘이다. 하나는 「이 공지 좀 봐 달라」고 링크를 건넬 수 있어야
 * 해서고, 다른 하나는 본문이 긴 글이라 목록과 같은 화면에 두면 고치다가 다른 줄을 보려고
 * 화면 끝까지 올라와야 하기 때문이다.
 *
 * `new`는 아직 저장소에 없는 공지다. 저장을 눌러야 목록에 서고, 그때 제 번호를 받아
 * 그 주소로 갈아탄다 — 화면을 열기만 해도 빈 공지가 생기면 목록이 빈 줄로 늘어난다.
 */
export default function NoticeDetail({ id }: { id: string }) {
  const router = useRouter();
  const content = useContent();
  const fresh = id === "new";

  /* 새 공지는 **한 번만** 짓는다 — 그래서 content를 일부러 딸림값에서 뺀다. 넣으면 다른
     공지를 저장할 때마다 번호가 다시 매겨지고 쓰던 초안이 날아간다 */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const made = useMemo(() => (fresh ? blankNotice(content, today()) : null), [fresh]);
  const saved = made ?? content.notices.find((v) => v.id === id) ?? null;

  if (!saved) {
    return (
      <>
        <PageHead
          title="없는 공지"
          back={
            <Link href="/admin2/notices" className="a2-btn">
              ← 공지 목록
            </Link>
          }
        />
        <Body>
          <Panel title="찾지 못했습니다">
            <p className="a2-t-sm text-(--a2-ink-2)">
              <span className="a2-mono">{id}</span> 공지가 목록에 없습니다. 지워졌거나 다른 브라우저에서 만든
              공지일 수 있습니다(공지는 이 브라우저에만 저장됩니다).
            </p>
          </Panel>
        </Body>
      </>
    );
  }

  return <Editor key={saved.id} notice={saved} fresh={fresh} router={router} />;
}

function Editor({
  notice,
  fresh,
  router,
}: {
  notice: Notice;
  fresh: boolean;
  router: ReturnType<typeof useRouter>;
}) {
  const draft = useEditDraft({
    title: notice.title,
    postedOn: notice.postedOn,
    shown: notice.shown,
    popup: notice.popup,
    pinned: notice.pinned,
    body: notice.body,
  });
  const v = draft.value;

  /* 아직 저장소에 없는 공지는 늘 저장할 것이 있다 */
  const dirty = fresh || draft.dirty;
  const bad = v.title.trim() === "";

  const save = () => {
    if (bad) return false;
    saveNotice({ ...notice, ...v, title: v.title.trim() });
    /* 새 공지는 제 주소로 갈아탄다 — replace라 뒤로가기가 빈 새 공지로 돌아오지 않는다 */
    if (fresh) router.replace(`/admin2/notices/${notice.id}`);
    return true;
  };

  const guard = useUnsavedGuard(dirty, save, draft.reset);

  return (
    <>
      <PageHead
        title={v.title.trim() || (fresh ? "새 공지" : "제목 없음")}
        back={
          <Link href="/admin2/notices" className="a2-btn">
            ← 공지 목록
          </Link>
        }
        actions={
          !fresh && (
            <button
              type="button"
              className="a2-btn a2-btn-danger"
              onClick={() => {
                /* 되돌릴 수 없는 일이라 한 번 묻는다. 내려 두는 길이 따로 있으므로
                   여기까지 오는 것은 잘못 만든 것을 걷어 낼 때다 */
                const ok = window.confirm(
                  `「${notice.title || notice.id}」 공지를 지웁니다.\n\n내려 두려면 지우지 말고 노출을 끄세요 — 그러면 목록에는 남고 사람 눈에만 안 보입니다.\n\n지울까요?`,
                );
                if (!ok) return;
                removeNotice(notice.id);
                router.replace("/admin2/notices");
              }}
            >
              지우기
            </button>
          )
        }
      />
      <Body>
        <Panel title="공지" meta={notice.id} flush>
          <div className="a2-form a2-form-lg">
            <FormRow label="제목" req>
              <input
                className="a2-input a2-input-lg"
                style={{ maxWidth: "32rem" }}
                value={v.title}
                onChange={(e) => draft.set("title", e.target.value)}
                placeholder="2026 파일럿 3회차 응시 안내"
              />
            </FormRow>

            <FormRow label="게시일" req>
              <input
                type="date"
                className="a2-input a2-input-lg a2-mono"
                style={{ maxWidth: "11rem" }}
                value={v.postedOn}
                onChange={(e) => draft.set("postedOn", e.target.value)}
              />
            </FormRow>

            <FormRow label="노출">
              <label className="a2-choice">
                <input
                  type="checkbox"
                  checked={v.shown}
                  onChange={(e) => {
                    draft.patch({ shown: e.target.checked, popup: e.target.checked && v.popup });
                  }}
                />
                사람에게 보입니다
              </label>
              <label className="a2-choice">
                <input
                  type="checkbox"
                  checked={v.pinned}
                  onChange={(e) => draft.set("pinned", e.target.checked)}
                />
                목록 맨 위에 고정
              </label>
            </FormRow>

            {/* 띄우는 것은 올려 두는 것과 다른 일이라 줄을 따로 세운다 */}
            <FormRow
              label="팝업"
              hint="모르고 지나가면 곤란한 것만 띄웁니다. 공지마다 띄우면 사람이 판을 닫는 손버릇부터 익히고, 정작 띄워야 할 때 그것도 같이 닫힙니다."
            >
              <span className="flex flex-wrap items-center gap-x-5 gap-y-1">
                <label className="a2-choice">
                  <input
                    type="radio"
                    name="notice-popup"
                    checked={!v.popup}
                    onChange={() => draft.set("popup", false)}
                  />
                  띄우지 않습니다
                </label>
                <label className="a2-choice">
                  <input
                    type="radio"
                    name="notice-popup"
                    checked={v.popup}
                    disabled={!v.shown}
                    onChange={() => draft.set("popup", true)}
                  />
                  사이트를 열면 판으로 띄웁니다
                </label>
              </span>
              {!v.shown && (
                <p className="a2-note w-full" style={{ borderLeftColor: "var(--a2-warn)" }}>
                  <span>내려 둔 공지는 띄울 수 없습니다. 먼저 노출을 켜 주세요.</span>
                </p>
              )}
            </FormRow>

            <FormRow label="본문">
              <BodyEditor
                name={`notice-mode-${notice.id}`}
                value={v.body}
                disabled={false}
                rows={8}
                placeholder="공지에 담을 말을 적습니다."
                onChange={(patch) => draft.set("body", { ...v.body, ...patch })}
              />
            </FormRow>
          </div>
        </Panel>

        <PageSaveBar
          dirty={dirty}
          onSave={save}
          onCancel={fresh ? () => router.push("/admin2/notices") : draft.reset}
          disabled={bad}
          note={bad ? "제목을 적어야 저장할 수 있습니다." : undefined}
        />
      </Body>
      <LeaveDialog guard={guard} />
    </>
  );
}
