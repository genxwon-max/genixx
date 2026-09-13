"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  blankProduct,
  createProduct,
  dataUrlBytes,
  discountRate,
  IMAGE_MAX_BYTES,
  productKindLabel,
  productKinds,
  productStateLabel,
  productStateOrder,
  removeProduct,
  shrinkImage,
  updateProduct,
  type Product,
  type ProductInput,
} from "@/lib/productStore";
import { detailModes, renderDetail, sanitizeHtml, type DetailMode } from "@/lib/richText";
import { Body, PageHead, Panel } from "@/components/admin2/ui";

/**
 * PAY-01-1 상품 등록·수정 — 이름표 칸과 입력 칸을 가로선으로 나눈 폼.
 *
 * 등록과 수정이 같은 화면이다. 칸이 같고 검사도 같은데 화면을 둘로 두면, 칸을 하나 더할
 * 때마다 두 곳을 고쳐야 하고 언젠가 한쪽만 고친다. `edit`이 있으면 수정, 없으면 등록이다.
 *
 * ── 칸 차례 ──
 * 위에서 아래로 「무엇을 · 얼마에 · 어떻게 보이게 · 언제까지」다. 이미지가 값 아래인 것은
 * 값 없이 파는 상품은 없지만 그림 없이 등록해 두는 일은 흔해서다 — 필수 칸을 위로 모은다.
 *
 * ── 이미지 ──
 * 파일 서버가 없어 브라우저 저장소에 담는다. 올린 그림은 담기 전에 긴 변
 * {IMAGE_MAX_PX}px으로 줄이고 JPEG로 다시 굽는다(lib/productStore.ts의 shrink 주석).
 * 그러고도 큰 그림은 받지 않고 그 자리에서 알린다 — 저장이 통째로 막힌 뒤에 알리면
 * 그때까지 채운 칸이 다 날아간다.
 *
 * 대표 이미지는 **올리거나 주소를 적거나** 둘 중 하나다. 이미 CDN에 올려 둔 그림을 쓰는
 * 일이 흔한데, 그것을 내려받아 다시 올리게 하면 같은 그림이 두 벌이 된다.
 *
 * ── 상세 내용 ──
 * 이미지만 받던 칸을 네 갈래로 열었다 — 이미지 · 마크다운 · HTML · 일반 텍스트.
 * 무엇을 어떻게 그리는지는 lib/richText.ts가 맡고, 여기서는 고르는 자리와 미리보기만 둔다.
 *
 * 갈래를 바꿔도 **앞서 채운 것을 지우지 않는다.** 이미지로 올려 두었다가 마크다운으로
 * 옮겨 적어 보고 다시 돌아오는 일이 흔한데, 바꿀 때마다 비우면 그 왕복이 불가능하다.
 * 저장되는 것은 고른 갈래가 쓰는 값이고, 나머지는 그대로 남아 있다가 되돌아오면 다시 선다.
 *
 * 상세 이미지는 여러 장이고 **순서가 곧 보이는 차례**다. 그래서 지우기 말고 앞뒤로
 * 옮기는 단추를 함께 둔다. 끌어 옮기기(drag)는 두지 않았다 — 두세 장짜리 목록에서
 * 끌기는 누르기보다 느리고, 손이 떨리는 사람에게는 아예 안 된다.
 *
 * HTML은 저장할 때 **소독한다.** 운영자가 적은 마크업이 파는 화면에 그대로 나가므로,
 * 허용 목록 밖의 태그와 속성은 여기서 끊는다(lib/richText.ts의 sanitizeHtml).
 */

/** 콤마가 섞여 들어와도 숫자로 읽는다 — 값을 붙여넣는 일이 잦다 */
function toNumber(v: string) {
  const digits = v.replace(/[^0-9]/g, "");
  return digits ? Number(digits) : 0;
}

export default function ProductForm({ edit }: { edit?: Product }) {
  const router = useRouter();
  const thumbRef = useRef<HTMLInputElement>(null);
  const detailRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<ProductInput>(() =>
    edit
      ? {
          name: edit.name,
          kind: edit.kind,
          price: edit.price,
          salePrice: edit.salePrice,
          thumb: edit.thumb,
          detailMode: edit.detailMode,
          detailImages: edit.detailImages,
          summary: edit.summary,
          description: edit.description,
          state: edit.state,
          sellsFrom: edit.sellsFrom,
          sellsTo: edit.sellsTo,
        }
      : blankProduct(),
  );
  const [errors, setErrors] = useState<string[]>([]);
  /** 이미지를 굽는 동안 — 큰 사진은 한두 박자 걸린다 */
  const [busy, setBusy] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  /** 대표 이미지를 올릴 것인가 주소로 걸 것인가 — 저장되는 값은 어느 쪽이든 문자열 하나다 */
  const [thumbBy, setThumbBy] = useState<"upload" | "url">(() =>
    edit?.thumb?.startsWith("data:") === false ? "url" : "upload",
  );
  /** 마크다운·HTML은 쓰면서 봐야 한다. 접어 두면 저장하고 파는 화면에서야 확인하게 된다 */
  const [preview, setPreview] = useState(true);

  const set = <K extends keyof ProductInput>(k: K, v: ProductInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  /** 올린 파일을 줄여 data URL로 바꾼다. 너무 큰 것은 여기서 끊는다 */
  const load = async (files: FileList | null, to: "thumb" | "detail" | "body") => {
    if (!files || files.length === 0) return;
    setBusy(true);
    setImageError(null);
    try {
      const made: string[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          setImageError(`${file.name}은(는) 이미지가 아닙니다.`);
          continue;
        }
        const url = await shrinkImage(file);
        if (dataUrlBytes(url) > IMAGE_MAX_BYTES) {
          setImageError(
            `${file.name}은(는) 줄이고도 너무 큽니다. 더 작은 그림으로 올려 주세요.`,
          );
          continue;
        }
        made.push(url);
      }
      if (made.length === 0) return;
      if (to === "thumb") set("thumb", made[0]);
      else if (to === "detail") setForm((f) => ({ ...f, detailImages: [...f.detailImages, ...made] }));
      else made.forEach(insertImage);
    } catch (e) {
      setImageError(e instanceof Error ? e.message : "이미지를 읽지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const moveDetail = (i: number, dir: -1 | 1) =>
    setForm((f) => {
      const next = [...f.detailImages];
      const j = i + dir;
      if (j < 0 || j >= next.length) return f;
      [next[i], next[j]] = [next[j], next[i]];
      return { ...f, detailImages: next };
    });

  const save = () => {
    const bad: string[] = [];
    if (!form.name.trim()) bad.push("상품명을 적어 주세요.");
    if (!Number.isFinite(form.price) || form.price < 0) bad.push("정가를 0원 이상으로 적어 주세요.");
    if (form.salePrice != null && form.salePrice > form.price)
      bad.push("판매가가 정가보다 큽니다. 할인이 아니라면 정가를 고쳐 주세요.");
    if (form.sellsFrom && form.sellsTo && form.sellsTo < form.sellsFrom)
      bad.push("판매 종료일이 시작일보다 앞섭니다.");
    if (form.state === "selling" && !form.thumb)
      bad.push("판매중으로 열려면 대표 이미지가 있어야 합니다.");
    if (bad.length > 0) return setErrors(bad);

    /* HTML은 담기 전에 한 번 걸러 둔다. 파는 화면에서 그릴 때도 다시 소독하지만,
       저장된 값 자체가 깨끗해야 나중에 다른 화면이 이 값을 그대로 써도 안전하다 */
    const clean: ProductInput =
      form.detailMode === "html" ? { ...form, description: sanitizeHtml(form.description) } : form;

    if (edit) {
      updateProduct(edit.id, clean);
      router.push("/admin2/products");
      return;
    }
    createProduct(clean);
    router.push("/admin2/products");
  };

  const rate = discountRate({ price: form.price, salePrice: form.salePrice });
  const totalBytes =
    (form.thumb?.startsWith("data:") ? dataUrlBytes(form.thumb) : 0) +
    form.detailImages.reduce((s, u) => s + dataUrlBytes(u), 0);

  const mode = form.detailMode;
  /* 미리보기는 그릴 때마다 만든다. 글자 수가 몇천이라 값싸고, 담아 두면 갈래를 바꿨을 때
     앞 갈래의 그림이 한 박자 남는다 */
  const previewHtml = renderDetail(mode, form.description, form.detailImages);

  /** 본문 끝에 그림 한 장을 갈래에 맞는 표기로 붙인다 */
  const insertImage = (url: string) => {
    const mark =
      mode === "markdown" ? `\n\n![](${url})\n` : mode === "html" ? `\n<img src="${url}" alt="">\n` : "";
    if (!mark) return;
    setForm((f) => ({ ...f, description: `${f.description}${mark}` }));
  };

  return (
    <>
      <PageHead
        title={edit ? "상품 수정" : "상품 등록"}
        actions={
          <Link href="/admin2/products" className="a2-btn">
            상품 관리
          </Link>
        }
      />

      <Body>
        <div className="a2-form">
          {/* ── 무엇을 ── */}
          <div className="a2-form-row">
            <div className="a2-form-label a2-form-req">상품명</div>
            <div className="a2-form-field">
              <input
                className="a2-input"
                style={{ maxWidth: "28rem" }}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="재능진단 종합 리포트"
              />
            </div>
          </div>

          <div className="a2-form-row">
            <div className="a2-form-label a2-form-req">상품 종류</div>
            <div className="a2-form-field">
              <select
                className="a2-select"
                style={{ maxWidth: "12rem" }}
                value={form.kind}
                onChange={(e) => set("kind", e.target.value as ProductInput["kind"])}
              >
                {productKinds.map((k) => (
                  <option key={k} value={k}>
                    {productKindLabel[k]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="a2-form-row">
            <div className="a2-form-label">한 줄 소개</div>
            <div className="a2-form-field">
              <input
                className="a2-input"
                style={{ maxWidth: "34rem" }}
                value={form.summary}
                onChange={(e) => set("summary", e.target.value)}
                placeholder="8개 재능 축 해석과 성장 가이드를 담은 리포트입니다."
              />
            </div>
          </div>

          {/* ── 얼마에 ── */}
          <div className="a2-form-row">
            <div className="a2-form-label a2-form-req">정가</div>
            <div className="a2-form-field">
              <input
                className="a2-input a2-num"
                style={{ maxWidth: "11rem" }}
                inputMode="numeric"
                value={form.price ? form.price.toLocaleString("ko-KR") : ""}
                onChange={(e) => set("price", toNumber(e.target.value))}
                placeholder="0"
              />
              <span className="a2-t-sm text-(--a2-ink-3)">원</span>
            </div>
          </div>

          <div className="a2-form-row">
            <div className="a2-form-label">판매가</div>
            <div className="a2-form-field">
              <input
                className="a2-input a2-num"
                style={{ maxWidth: "11rem" }}
                inputMode="numeric"
                value={form.salePrice != null ? form.salePrice.toLocaleString("ko-KR") : ""}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9]/g, "");
                  set("salePrice", v ? Number(v) : null);
                }}
                placeholder="비우면 정가로 팝니다"
              />
              <span className="a2-t-sm text-(--a2-ink-3)">원</span>
              {rate != null && (
                <span className="a2-num a2-t-sm font-bold" style={{ color: "var(--a2-danger)" }}>
                  −{rate}%
                </span>
              )}
            </div>
          </div>

          {/* ── 어떻게 보이게 ── */}
          <div className="a2-form-row">
            <div className="a2-form-label">대표 이미지</div>
            <div className="a2-form-field">
              <span className="flex w-full flex-wrap items-center gap-x-4 gap-y-1">
                {(
                  [
                    { id: "upload" as const, label: "파일 올리기" },
                    { id: "url" as const, label: "이미지 주소" },
                  ]
                ).map((o) => (
                  <label key={o.id} className="a2-choice">
                    <input
                      type="radio"
                      name="thumb-by"
                      checked={thumbBy === o.id}
                      onChange={() => setThumbBy(o.id)}
                    />
                    {o.label}
                  </label>
                ))}
              </span>

              {thumbBy === "url" && (
                <input
                  className="a2-input"
                  style={{ maxWidth: "28rem" }}
                  value={form.thumb?.startsWith("data:") ? "" : (form.thumb ?? "")}
                  onChange={(e) => set("thumb", e.target.value.trim() || null)}
                  placeholder="https://cdn.example.com/product/thumb.jpg"
                />
              )}

              {form.thumb ? (
                <span className="inline-flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.thumb}
                    alt="대표 이미지 미리보기"
                    className="h-20 w-20 rounded-[3px] border border-(--a2-line) object-cover"
                  />
                  {thumbBy === "upload" && (
                    <button type="button" className="a2-btn a2-btn-sm" onClick={() => thumbRef.current?.click()}>
                      바꾸기
                    </button>
                  )}
                  <button type="button" className="a2-btn a2-btn-sm" onClick={() => set("thumb", null)}>
                    지우기
                  </button>
                </span>
              ) : (
                thumbBy === "upload" && (
                  <button
                    type="button"
                    className="a2-btn a2-btn-sm"
                    disabled={busy}
                    onClick={() => thumbRef.current?.click()}
                  >
                    이미지 올리기
                  </button>
                )
              )}
              <input
                ref={thumbRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  void load(e.target.files, "thumb");
                  e.target.value = "";
                }}
              />
            </div>
          </div>


          {/* ── 어떻게 보이게 — 상세 내용 ──
              갈래를 고르고, 그 갈래에 맞는 편집기를 아래에 세운다. 갈래를 바꿔도 앞서
              채운 것은 그대로 남는다(머리 주석) */}
          <div className="a2-form-row">
            <div className="a2-form-label">상세 내용</div>
            <div className="a2-form-field">
              <span className="flex w-full flex-wrap items-center gap-x-4 gap-y-1">
                {detailModes.map((m) => (
                  <label key={m.id} className="a2-choice">
                    <input
                      type="radio"
                      name="detail-mode"
                      checked={mode === m.id}
                      onChange={() => set("detailMode", m.id as DetailMode)}
                    />
                    {m.label}
                  </label>
                ))}
              </span>

              {/* ── 이미지 갈래 ── */}
              {mode === "images" && (
                <>
                  <div className="flex w-full flex-wrap gap-2">
                    {form.detailImages.map((url, i) => (
                      <span key={`${i}-${url.slice(-16)}`} className="inline-flex flex-col gap-1">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`상세 이미지 ${i + 1}`}
                          className="h-24 w-24 rounded-[3px] border border-(--a2-line) object-cover"
                        />
                        <span className="flex items-center justify-between gap-1">
                          <span className="a2-num a2-t-xs text-(--a2-ink-4)">{i + 1}</span>
                          <span className="flex gap-0.5">
                            <button
                              type="button"
                              className="a2-btn a2-btn-sm"
                              disabled={i === 0}
                              aria-label={`상세 이미지 ${i + 1} 앞으로`}
                              onClick={() => moveDetail(i, -1)}
                            >
                              ←
                            </button>
                            <button
                              type="button"
                              className="a2-btn a2-btn-sm"
                              disabled={i === form.detailImages.length - 1}
                              aria-label={`상세 이미지 ${i + 1} 뒤로`}
                              onClick={() => moveDetail(i, 1)}
                            >
                              →
                            </button>
                            <button
                              type="button"
                              className="a2-btn a2-btn-sm a2-btn-danger"
                              aria-label={`상세 이미지 ${i + 1} 지우기`}
                              onClick={() =>
                                setForm((f) => ({
                                  ...f,
                                  detailImages: f.detailImages.filter((_, k) => k !== i),
                                }))
                              }
                            >
                              ×
                            </button>
                          </span>
                        </span>
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="a2-btn a2-btn-sm"
                    disabled={busy}
                    onClick={() => detailRef.current?.click()}
                  >
                    {busy ? "줄이는 중…" : "이미지 추가"}
                  </button>
                </>
              )}

              {/* ── 글 갈래 셋 ── */}
              {mode !== "images" && (
                <>
                  <textarea
                    className={`a2-textarea ${mode === "text" ? "" : "a2-mono"}`}
                    rows={mode === "text" ? 6 : 12}
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                    placeholder={
                      mode === "markdown"
                        ? "## 무엇이 들어 있나요\n\n- 8개 재능 축 해석\n- 성장 가이드"
                        : mode === "html"
                          ? '<h2>무엇이 들어 있나요</h2>\n<ul><li>8개 재능 축 해석</li></ul>'
                          : "무엇이 들어 있고, 언제 받아 볼 수 있는지 적어 주세요."
                    }
                  />
                  <span className="flex w-full flex-wrap items-center gap-1.5">
                    {mode !== "text" && (
                      <button
                        type="button"
                        className="a2-btn a2-btn-sm"
                        disabled={busy}
                        onClick={() => detailRef.current?.click()}
                      >
                        {busy ? "줄이는 중…" : "그림 넣기"}
                      </button>
                    )}
                    <button
                      type="button"
                      className="a2-btn a2-btn-sm"
                      aria-pressed={preview}
                      onClick={() => setPreview((v) => !v)}
                    >
                      {preview ? "미리보기 접기" : "미리보기 펼치기"}
                    </button>
                    <span className="a2-t-xs text-(--a2-ink-4)">
                      <span className="a2-num">{form.description.length.toLocaleString("ko-KR")}</span>자
                    </span>
                  </span>
                </>
              )}

              {/* ── 미리보기 ── */}
              {preview && (
                <div className="w-full">
                  <p className="a2-label mb-1">미리보기</p>
                  {previewHtml.trim() === "" ? (
                    <p className="a2-preview a2-t-sm text-(--a2-ink-4)">아직 채운 것이 없습니다.</p>
                  ) : (
                    <div
                      className="a2-preview a2-prose"
                      /* 소독을 거친 값만 넣는다(lib/richText.ts). 이미지 갈래는 우리가 만든
                         <img>뿐이고, 나머지 셋은 renderDetail 안에서 sanitizeHtml을 지난다 */
                      dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                  )}
                </div>
              )}

              {/* 파일 고르개는 갈래와 상관없이 하나만 둔다 — 이미지 갈래는 목록에 붙이고,
                  글 갈래는 본문에 표기로 넣는다 */}
              <input
                ref={detailRef}
                type="file"
                accept="image/*"
                multiple={mode === "images"}
                className="sr-only"
                onChange={(e) => {
                  void load(e.target.files, mode === "images" ? "detail" : "body");
                  e.target.value = "";
                }}
              />
              {totalBytes > 0 && (
                <span className="a2-hint">
                  지금 담은 이미지 <span className="a2-num">{Math.round(totalBytes / 1024)}</span>KB.
                </span>
              )}
              {imageError && (
                <span className="a2-hint" style={{ color: "var(--a2-danger)" }}>
                  {imageError}
                </span>
              )}
            </div>
          </div>

          {/* ── 언제까지 ── */}
          <div className="a2-form-row">
            <div className="a2-form-label a2-form-req">판매 상태</div>
            <div className="a2-form-field">
              {productStateOrder.map((s) => (
                <label key={s} className="a2-choice">
                  <input
                    type="radio"
                    name="product-state"
                    checked={form.state === s}
                    onChange={() => set("state", s)}
                  />
                  {productStateLabel[s]}
                </label>
              ))}
            </div>
          </div>

          <div className="a2-form-row">
            <div className="a2-form-label">판매 기간</div>
            <div className="a2-form-field">
              <input
                type="date"
                className="a2-input"
                style={{ maxWidth: "11rem" }}
                value={form.sellsFrom}
                onChange={(e) => set("sellsFrom", e.target.value)}
              />
              <span className="a2-t-sm text-(--a2-ink-3)">—</span>
              <input
                type="date"
                className="a2-input"
                style={{ maxWidth: "11rem" }}
                value={form.sellsTo}
                onChange={(e) => set("sellsTo", e.target.value)}
              />
            </div>
          </div>
        </div>

        {errors.length > 0 && (
          <Panel title="채우지 못한 칸" className="mt-3">
            <ul className="flex flex-col gap-1">
              {errors.map((e) => (
                <li key={e} className="a2-t-sm" style={{ color: "var(--a2-danger)" }}>
                  · {e}
                </li>
              ))}
            </ul>
          </Panel>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-end gap-1.5">
          {edit && (
            /* 지우기는 왼쪽 끝에 홀로 둔다. 저장 옆에 붙여 두면 급한 날 잘못 눌린다 */
            <button
              type="button"
              className="a2-btn a2-btn-danger mr-auto"
              onClick={() => {
                if (confirm(`${edit.name}을(를) 지웁니다. 계속할까요?`)) {
                  removeProduct(edit.id);
                  router.push("/admin2/products");
                }
              }}
            >
              상품 지우기
            </button>
          )}
          <Link href="/admin2/products" className="a2-btn">
            취소
          </Link>
          <button type="button" className="a2-btn a2-btn-primary" disabled={busy} onClick={save}>
            {edit ? "수정 저장" : "상품 등록"}
          </button>
        </div>
      </Body>
    </>
  );
}
