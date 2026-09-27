"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import {
  blankClip,
  canonClip,
  clipKindLabel,
  clipKinds,
  clipRatio,
  looksLikeUrl,
  removeClip,
  saveClip,
  useClipRows,
  youtubeId,
  type ClipRow,
} from "@/lib/clipStore";
import { LeaveDialog, PageSaveBar, useEditDraft, useUnsavedGuard } from "@/components/admin2/EditGuard";
import { Body, FormRow, PageHead, Panel } from "@/components/admin2/ui";

/**
 * ADM-15-2-1 홍보 영상 상세 — 한 칸을 걸고 고친다.
 *
 * `new`는 아직 저장소에 없는 칸이다. 저장을 눌러야 목록에 서고, 그때 제 번호를 받아 그
 * 주소로 갈아탄다(공지 상세와 같은 규칙).
 *
 * ── 미리보기를 둔 까닭 ──
 * 주소를 잘못 걸었는지는 첫 화면에 나가 봐야 안다. 유튜브 주소라면 영상 번호를 뽑아
 * 미리보기 그림을 여기서 띄운다 — 「걸었는데 안 보인다」의 절반은 주소를 짧은 링크나
 * 채널 주소로 붙여 넣은 경우다.
 *
 * 영상을 심어 보여 주지 않고 그림만 띄운다. 콘솔 화면에서 영상이 자동으로 뜨면 밀린 일을
 * 보러 온 사람의 회선을 쓰고, 무엇보다 이 화면이 확인해야 하는 것은 「그 영상이 맞는가」라
 * 표지 그림으로 충분하다.
 */
export default function ClipEdit({ id }: { id: string }) {
  const router = useRouter();
  const rows = useClipRows();
  const fresh = id === "new";

  /* 새 칸은 **한 번만** 짓는다 — rows를 일부러 딸림값에서 뺀다(공지 상세와 같은 까닭) */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const made = useMemo(() => (fresh ? blankClip(rows) : null), [fresh]);
  const saved = made ?? rows.find((r) => r.id === id) ?? null;

  if (!saved) {
    return (
      <>
        <PageHead
          title="없는 영상"
          back={
            <Link href="/admin2/clips" className="a2-btn">
              ← 홍보 영상
            </Link>
          }
        />
        <Body>
          <Panel title="찾지 못했습니다">
            <p className="a2-t-sm text-(--a2-ink-2)">
              <span className="a2-mono">{id}</span> 영상이 목록에 없습니다. 지워졌거나 다른
              브라우저에서 걸어 둔 칸일 수 있습니다(목록은 이 브라우저에만 저장됩니다).
            </p>
          </Panel>
        </Body>
      </>
    );
  }

  return <Editor key={saved.id} row={saved} fresh={fresh} router={router} />;
}

function Editor({
  row,
  fresh,
  router,
}: {
  row: ClipRow;
  fresh: boolean;
  router: ReturnType<typeof useRouter>;
}) {
  const draft = useEditDraft({
    kind: row.kind,
    title: row.title,
    desc: row.desc,
    length: row.length,
    url: row.url ?? "",
    shown: row.shown,
  });
  const v = draft.value;

  const bad = v.title.trim() === "";
  /* 못 쓸 주소는 막지 않고 일러만 준다 — 주소가 없는 칸도 「준비 중」으로 서야 하므로,
     주소 하나로 저장을 막으면 미리 걸어 두는 일이 불가능해진다 */
  const badUrl = v.url.trim() !== "" && !looksLikeUrl(v.url);
  const thumb = youtubeId(v.url);

  const save = () => {
    if (bad) return false;
    const clean = canonClip({ ...row, ...v, url: v.url });
    saveClip(clean);
    /* 저장소가 다듬은 꼴을 초안에 되돌려 넣는다 — 안 넣으면 저장 줄이 안 내려온다 */
    draft.patch({
      title: clean.title,
      desc: clean.desc,
      length: clean.length,
      url: clean.url ?? "",
    });
    if (fresh) router.replace(`/admin2/clips/${row.id}`);
    return true;
  };

  const dirty = fresh || draft.dirty;
  const guard = useUnsavedGuard(dirty, save, draft.reset);

  return (
    <>
      <PageHead
        title={v.title.trim() || (fresh ? "새 영상" : "제목 없음")}
        back={
          <Link href="/admin2/clips" className="a2-btn">
            ← 홍보 영상
          </Link>
        }
        actions={
          !fresh && (
            <button
              type="button"
              className="a2-btn a2-btn-danger"
              onClick={() => {
                const ok = window.confirm(
                  `「${row.title || row.id}」 영상을 지웁니다.\n\n잠깐 내리려면 지우지 말고 노출을 끄세요 — 그러면 목록에는 남고 첫 화면에만 안 보입니다.\n\n지울까요?`,
                );
                if (!ok) return;
                removeClip(row.id);
                router.replace("/admin2/clips");
              }}
            >
              지우기
            </button>
          )
        }
      />

      <Body>
        <Panel title="영상" meta={row.id} flush>
          <div className="a2-form a2-form-lg">
            <FormRow label="갈래" req>
              {clipKinds.map((k) => (
                <label key={k} className="a2-choice">
                  <input
                    type="radio"
                    name="clip-kind"
                    checked={v.kind === k}
                    onChange={() => draft.set("kind", k)}
                  />
                  {clipKindLabel[k]} <span className="a2-num a2-t-xs text-(--a2-ink-4)">{clipRatio[k]}</span>
                </label>
              ))}
            </FormRow>

            <FormRow label="제목" req>
              <input
                className="a2-input a2-input-lg"
                style={{ maxWidth: "32rem" }}
                value={v.title}
                onChange={(e) => draft.set("title", e.target.value)}
                placeholder="성적표로는 보이지 않던 것"
              />
            </FormRow>

            <FormRow label="설명">
              <textarea
                className="a2-textarea"
                rows={3}
                value={v.desc}
                onChange={(e) => draft.set("desc", e.target.value)}
                placeholder="학력 축과 재능 축을 왜 따로 재는지, 3분으로 줄인 소개."
              />
            </FormRow>

            <FormRow label="길이">
              <input
                className="a2-input a2-input-lg a2-num"
                style={{ maxWidth: "7rem" }}
                value={v.length}
                onChange={(e) => draft.set("length", e.target.value)}
                placeholder="3:12"
              />
            </FormRow>

            <FormRow label="영상 주소">
              <input
                className="a2-input a2-input-lg"
                style={{ maxWidth: "32rem" }}
                value={v.url}
                onChange={(e) => draft.set("url", e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
              />
              {badUrl && (
                <p className="a2-note w-full" style={{ borderLeftColor: "var(--a2-warn)" }}>
                  <span>
                    쓸 수 없는 주소입니다. https://로 시작하는 주소만 카드가 링크가 됩니다 — 그대로
                    두면 「준비 중」으로 섭니다.
                  </span>
                </p>
              )}
              {thumb && (
                <span className="w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://i.ytimg.com/vi/${thumb}/mqdefault.jpg`}
                    alt="영상 표지 미리보기"
                    className="h-[6.75rem] w-48 rounded-[3px] border border-(--a2-line) object-cover"
                  />
                </span>
              )}
            </FormRow>

            <FormRow label="노출">
              <label className="a2-choice">
                <input
                  type="checkbox"
                  checked={v.shown}
                  onChange={(e) => draft.set("shown", e.target.checked)}
                />
                첫 화면에 세웁니다
              </label>
            </FormRow>
          </div>
        </Panel>

        <PageSaveBar
          dirty={dirty}
          onSave={save}
          onCancel={fresh ? () => router.push("/admin2/clips") : draft.reset}
          disabled={bad}
          note={bad ? "제목을 적어야 저장할 수 있습니다." : undefined}
        />
      </Body>
      <LeaveDialog guard={guard} />
    </>
  );
}
