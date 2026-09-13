"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { blankFaq, faqGroups, removeFaq, saveFaq, useContent, type Faq } from "@/lib/contentStore";
import BodyEditor from "@/components/admin2/BodyEditor";
import { LeaveDialog, PageSaveBar, useEditDraft, useUnsavedGuard } from "@/components/admin2/EditGuard";
import { Body, FormRow, PageHead, Panel } from "@/components/admin2/ui";

/**
 * ADM-15-1 자주 묻는 질문 상세 — 하나를 쓰고 고친다.
 *
 * `new`는 아직 저장소에 없는 질문이다. 저장을 눌러야 목록에 서고 그때 제 번호를 받는다.
 */
export default function FaqDetail({ id }: { id: string }) {
  const router = useRouter();
  const content = useContent();
  const fresh = id === "new";

  /* 새 질문은 **한 번만** 짓는다 — content를 딸림값에 넣으면 다른 질문을 저장할 때마다
     번호가 다시 매겨지고 쓰던 초안이 날아간다 */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const made = useMemo(() => (fresh ? blankFaq(content) : null), [fresh]);
  const saved = made ?? content.faqs.find((v) => v.id === id) ?? null;

  if (!saved) {
    return (
      <>
        <PageHead
          title="없는 질문"
          back={
            <Link href="/admin2/faq" className="a2-btn">
              ← 자주 묻는 질문
            </Link>
          }
        />
        <Body>
          <Panel title="찾지 못했습니다">
            <p className="a2-t-sm text-(--a2-ink-2)">
              <span className="a2-mono">{id}</span> 질문이 목록에 없습니다. 지워졌거나 다른 브라우저에서 만든
              질문일 수 있습니다(글은 이 브라우저에만 저장됩니다).
            </p>
          </Panel>
        </Body>
      </>
    );
  }

  return <Editor key={saved.id} faq={saved} fresh={fresh} router={router} />;
}

function Editor({
  faq,
  fresh,
  router,
}: {
  faq: Faq;
  fresh: boolean;
  router: ReturnType<typeof useRouter>;
}) {
  const draft = useEditDraft({ group: faq.group, q: faq.q, a: faq.a, shown: faq.shown, home: faq.home });
  const v = draft.value;

  const dirty = fresh || draft.dirty;
  const bad = v.q.trim() === "";

  const save = () => {
    if (bad) return false;
    saveFaq({ ...faq, ...v, q: v.q.trim() });
    if (fresh) router.replace(`/admin2/faq/${faq.id}`);
    return true;
  };

  const guard = useUnsavedGuard(dirty, save, draft.reset);

  return (
    <>
      <PageHead
        title={v.q.trim() || (fresh ? "새 질문" : "질문 없음")}
        back={
          <Link href="/admin2/faq" className="a2-btn">
            ← 자주 묻는 질문
          </Link>
        }
        actions={
          !fresh && (
            <button
              type="button"
              className="a2-btn a2-btn-danger"
              onClick={() => {
                const ok = window.confirm(
                  `「${faq.q || faq.id}」 질문을 지웁니다.\n\n안 쓰는 질문이면 지우지 말고 노출을 끄세요 — 그러면 목록에는 남고 사람 눈에만 안 보입니다.\n\n지울까요?`,
                );
                if (!ok) return;
                removeFaq(faq.id);
                router.replace("/admin2/faq");
              }}
            >
              지우기
            </button>
          )
        }
      />
      <Body>
        <Panel title="질문" meta={faq.id} flush>
          <div className="a2-form a2-form-lg">
            <FormRow label="분류" req>
              <select
                className="a2-select a2-input-lg"
                style={{ maxWidth: "14rem" }}
                value={v.group}
                onChange={(e) => draft.set("group", e.target.value)}
              >
                {faqGroups.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </FormRow>

            <FormRow label="질문" req>
              <input
                className="a2-input a2-input-lg"
                style={{ maxWidth: "32rem" }}
                value={v.q}
                onChange={(e) => draft.set("q", e.target.value)}
                placeholder="결과에 등급이 나오나요?"
              />
            </FormRow>

            <FormRow label="답변">
              <BodyEditor
                name={`faq-mode-${faq.id}`}
                value={v.a}
                disabled={false}
                rows={7}
                placeholder="묻는 사람이 그대로 읽을 답을 적습니다."
                onChange={(patch) => draft.set("a", { ...v.a, ...patch })}
              />
            </FormRow>

            {/* 홈은 「먼저 걸리는 것」만 세운다. 열일곱을 다 세우면 홈이 FAQ 화면이 된다 */}
            <FormRow label="노출">
              <label className="a2-choice">
                <input
                  type="checkbox"
                  checked={v.shown}
                  onChange={(e) => draft.patch({ shown: e.target.checked, home: e.target.checked && v.home })}
                />
                고객지원에 보입니다
              </label>
              <label className="a2-choice">
                <input
                  type="checkbox"
                  checked={v.home}
                  disabled={!v.shown}
                  onChange={(e) => draft.set("home", e.target.checked)}
                />
                홈에도 세웁니다
              </label>
            </FormRow>
          </div>
        </Panel>

        <PageSaveBar
          dirty={dirty}
          onSave={save}
          onCancel={fresh ? () => router.push("/admin2/faq") : draft.reset}
          disabled={bad}
          note={bad ? "질문을 적어야 저장할 수 있습니다." : undefined}
        />
      </Body>
      <LeaveDialog guard={guard} />
    </>
  );
}
