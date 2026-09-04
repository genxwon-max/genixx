"use client";

import { useSyncExternalStore } from "react";
import type { DetailMode } from "./richText";

/**
 * PAY-01 상품 — 파는 것의 목록.
 *
 * 이 콘솔이 파는 것은 물건이 아니라 **응시권과 리포트**다. 그래서 재고·배송·옵션 같은
 * 칸을 두지 않는다. 상품 하나가 답해야 하는 것은 넷뿐이다 —
 *
 *   무엇인가        이름 · 종류 · 한 줄 소개
 *   얼마인가        정가 · 판매가(할인)
 *   어떻게 보이는가  대표 이미지 · 상세 내용
 *   지금 파는가      상태 · 판매 기간
 *
 * ── 상세 내용은 한 갈래를 골라 쓴다 ──
 * 그림만 올리게 두었더니, 글 한 줄을 고치려고 시안을 다시 뜨는 일이 생겼다. 지금은
 * 이미지·마크다운·HTML·일반 텍스트 넷 중 하나를 고른다(detailMode). 무엇을 어떻게
 * 그리는지는 lib/richText.ts가 맡고, 여기서는 고른 갈래와 그 내용만 든다.
 *
 * ── 이미지를 브라우저에 담는 방법 ──
 * 이 프로젝트에는 파일 서버가 없다. 올린 그림을 data URL로 바꿔 localStorage에 담되,
 * 원본 그대로 담지 않는다 — 폰으로 찍은 사진 한 장이 4MB를 넘고, localStorage는 대개
 * 5MB에서 끊긴다. 담기 전에 캔버스로 긴 변을 줄이고 JPEG로 다시 굽는다(shrink).
 *
 * 붙일 때는 이 자리에 업로드 URL이 들어오고 저장되는 것은 그 주소 문자열뿐이다.
 * 그래서 타입은 지금도 `string`이다 — data URL이든 https URL이든 화면은 같게 그린다.
 */

export type ProductKind = "assessment" | "report" | "bundle" | "subscription";

export const productKindLabel: Record<ProductKind, string> = {
  assessment: "응시권",
  report: "리포트",
  bundle: "묶음 상품",
  subscription: "정기 구독",
};

/** 차림표에 세우는 차례 — 파는 양이 많은 것부터. 가나다순으로 두면 묶음이 맨 앞에 선다 */
export const productKinds: ProductKind[] = ["assessment", "report", "bundle", "subscription"];

export type ProductState = "draft" | "selling" | "hidden" | "ended";

export const productStateLabel: Record<ProductState, string> = {
  draft: "작성 중",
  selling: "판매중",
  hidden: "숨김",
  ended: "판매 종료",
};

/**
 * 상태 차례 — 손이 가야 하는 것을 위로.
 *
 * 판매중이 맨 앞이 아니다. 이 화면을 여는 사람이 먼저 찾는 것은 「아직 못 연 상품」이고,
 * 판매중은 이미 제 일을 하고 있는 줄이다.
 */
export const productStateOrder: ProductState[] = ["draft", "selling", "hidden", "ended"];

export type Product = {
  id: string;
  name: string;
  kind: ProductKind;
  /** 정가 (원) */
  price: number;
  /**
   * 판매가. null이면 정가 그대로 판다.
   *
   * 「할인율」을 저장하지 않는다 — 율과 금액을 둘 다 들면 반올림에서 어긋나고,
   * 결제 내역에 남는 것은 언제나 실제로 받은 금액이다. 율은 화면에서 계산해 보여 준다.
   */
  salePrice: number | null;
  /**
   * 목록과 카드에 서는 대표 이미지 한 장.
   *
   * 올린 그림(data URL)이든 바깥 주소(https)든 여기에 문자열 하나로 들어온다 —
   * 화면은 둘을 같게 그리므로 어느 쪽인지 따로 들지 않는다.
   */
  thumb: string | null;
  /** 상세를 무엇으로 쓰는가 — 이미지 · 마크다운 · HTML · 일반 텍스트 */
  detailMode: DetailMode;
  /** detailMode가 "images"일 때. 순서가 곧 보이는 차례다 */
  detailImages: string[];
  /** 한 줄 소개 — 목록·카드에 그대로 나간다 */
  summary: string;
  /** detailMode가 마크다운·HTML·일반 텍스트일 때의 본문 */
  description: string;
  state: ProductState;
  /** 판매 기간 (선택) */
  sellsFrom: string;
  sellsTo: string;
  createdAt: string;
  updatedAt: string;
};

const KEY = "genixx.products";
const EVENT = "genixx:products-change";

/**
 * 씨앗 넉 장.
 *
 * 이미지가 없는 채로 두었다 — 예시 그림을 data URL로 박아 두면 이 파일이 수백 KB가 되고,
 * 「이미지 없음」이 목록에서 어떻게 보이는지도 확인할 수 없다. 화면에서 올려 보면 된다.
 */
const SEED: Product[] = [
  {
    id: "PRD-0001",
    name: "TalentMe 학력진단 응시권 1회",
    kind: "assessment",
    price: 0,
    salePrice: null,
    thumb: null,
    detailMode: "text",
    detailImages: [],
    summary: "국어·수학·과학 학력진단 1회 응시권입니다.",
    description:
      "파일럿 회차에서는 전액 무료로 제공합니다. 응시권 한 장으로 한 회차의 모든 과목을 응시할 수 있습니다.",
    state: "selling",
    sellsFrom: "2026-01-01",
    sellsTo: "",
    createdAt: "2026-01-04 10:20",
    updatedAt: "2026-06-11 09:05",
  },
  {
    id: "PRD-0002",
    name: "재능진단 종합 리포트",
    kind: "report",
    price: 49000,
    salePrice: 39000,
    thumb: null,
    detailMode: "markdown",
    detailImages: [],
    summary: "8개 재능 축 해석과 성장 가이드를 담은 리포트입니다.",
    description: [
      "## 무엇이 들어 있나요",
      "",
      "- 8개 **재능 축**별 해석과 근거",
      "- 또래 견줌 없이 읽는 **성장 가이드**",
      "- 다음 회차에 볼 것 한 장",
      "",
      "> 점수로 등수를 매기지 않습니다. 아직 발현되지 않은 영역은 약점이 아니라 그렇게 적습니다.",
      "",
      "지필·상황판단·설문·면담 응답을 교차 검증해 전문가가 확정합니다. 발행 승인 뒤에 열람할 수 있습니다.",
    ].join("\n"),
    state: "selling",
    sellsFrom: "2026-03-01",
    sellsTo: "",
    createdAt: "2026-02-18 14:40",
    updatedAt: "2026-07-02 11:12",
  },
  {
    id: "PRD-0003",
    name: "심화진단 + 리포트 묶음",
    kind: "bundle",
    price: 120000,
    salePrice: 99000,
    thumb: null,
    detailMode: "text",
    detailImages: [],
    summary: "2단계 심화진단 응시권과 종합 리포트를 함께 담았습니다.",
    description: "심화 수행과제는 신청 시점에 음성·영상·행동로그 수집 동의를 따로 받습니다.",
    state: "hidden",
    sellsFrom: "",
    sellsTo: "",
    createdAt: "2026-05-06 16:02",
    updatedAt: "2026-07-28 17:31",
  },
  {
    id: "PRD-0004",
    name: "기관 응시권 100석 팩",
    kind: "bundle",
    price: 900000,
    salePrice: null,
    thumb: null,
    detailMode: "text",
    detailImages: [],
    summary: "학교·학원용 응시권 100석 묶음입니다.",
    description: "기관 계정에 응시권으로 배정됩니다. 세금계산서는 월 마감 후 발행합니다.",
    state: "draft",
    sellsFrom: "",
    sellsTo: "",
    createdAt: "2026-08-03 09:14",
    updatedAt: "2026-08-03 09:14",
  },
];

let cacheRaw: string | null = null;
let cacheValue: Product[] = SEED;

/**
 * 옛 줄 채우기.
 *
 * detailMode가 생기기 전에 담은 상품에는 그 칸이 없다. 그림이 있으면 이미지로 쓰던
 * 상품이고, 없으면 글로 쓰던 상품이다 — 열어 보고 정하게 두면 그때까지 상세가 빈칸으로
 * 보인다.
 */
function normalize(rows: Partial<Product>[]): Product[] {
  return rows.map((r) => ({
    ...(r as Product),
    detailMode: r.detailMode ?? ((r.detailImages?.length ?? 0) > 0 ? "images" : "text"),
    detailImages: r.detailImages ?? [],
  }));
}

function read(): Product[] {
  if (typeof window === "undefined") return SEED;
  const raw = window.localStorage.getItem(KEY);
  if (raw === cacheRaw) return cacheValue;
  cacheRaw = raw;
  try {
    cacheValue = raw ? normalize(JSON.parse(raw) as Partial<Product>[]) : SEED;
  } catch {
    cacheValue = SEED;
  }
  return cacheValue;
}

function write(next: Product[]) {
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

export function useProducts(): Product[] {
  return useSyncExternalStore(subscribe, read, () => SEED);
}

export function getProducts() {
  return read();
}

export function findProduct(id: string) {
  return read().find((p) => p.id === id) ?? null;
}

function now() {
  const d = new Date();
  const p = (v: number) => String(v).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 다음 번호 — 목록에서 가장 큰 수 다음. 지운 번호는 다시 쓰지 않는다 */
function nextId(rows: Product[]) {
  const max = rows.reduce((m, p) => Math.max(m, Number(p.id.replace(/\D/g, "")) || 0), 0);
  return `PRD-${String(max + 1).padStart(4, "0")}`;
}

export type ProductInput = Omit<Product, "id" | "createdAt" | "updatedAt">;

export function blankProduct(): ProductInput {
  return {
    name: "",
    kind: "assessment",
    price: 0,
    salePrice: null,
    thumb: null,
    detailMode: "images",
    detailImages: [],
    summary: "",
    description: "",
    state: "draft",
    sellsFrom: "",
    sellsTo: "",
  };
}

export function createProduct(input: ProductInput) {
  const rows = read();
  const at = now();
  const made: Product = { ...input, id: nextId(rows), createdAt: at, updatedAt: at };
  write([...rows, made]);
  return made;
}

export function updateProduct(id: string, patch: Partial<ProductInput>) {
  write(read().map((p) => (p.id === id ? { ...p, ...patch, updatedAt: now() } : p)));
}

export function removeProduct(id: string) {
  write(read().filter((p) => p.id !== id));
}

export function clearProducts() {
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
}

/* ───────────────────────── 값 읽기 ───────────────────────── */

/** 실제로 받는 값 — 판매가가 있으면 그것, 없으면 정가 */
export function paidPrice(p: Pick<Product, "price" | "salePrice">) {
  return p.salePrice ?? p.price;
}

/** 할인율(%). 정가와 같거나 정가가 0이면 null */
export function discountRate(p: Pick<Product, "price" | "salePrice">) {
  if (p.salePrice == null || p.price <= 0 || p.salePrice >= p.price) return null;
  return Math.round(((p.price - p.salePrice) / p.price) * 100);
}

/** 원화 표기 — 목록·통계가 같은 함수를 쓴다. 두 화면이 각자 포맷하면 자릿점이 갈린다 */
export function won(v: number) {
  return `${v.toLocaleString("ko-KR")}원`;
}

/* ───────────────────────── 이미지 ─────────────────────────
   올린 그림을 그대로 담지 않는다. 긴 변을 줄이고 JPEG로 다시 구워 data URL로 만든다.
   localStorage가 5MB에서 끊기므로, 원본을 담으면 상품 두엇에서 저장이 통째로 실패한다.

   투명한 PNG도 JPEG로 굽는다 — 상품 이미지는 흰 바탕에 놓이므로 투명이 필요 없고,
   PNG로 두면 같은 그림이 서너 배가 된다. 대신 흰색을 먼저 칠하고 그린다. */

export const IMAGE_MAX_PX = 1200;
/** 한 장이 이보다 크면 담지 않는다 — 저장소가 통째로 막히기 전에 여기서 끊는다 */
export const IMAGE_MAX_BYTES = 700_000;

export async function shrinkImage(file: File, maxPx = IMAGE_MAX_PX): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("이미지를 읽지 못했습니다."));
      el.src = url;
    });

    const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("이 브라우저에서는 이미지를 줄일 수 없습니다.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    return canvas.toDataURL("image/jpeg", 0.72);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** data URL이 실제로 차지하는 바이트 수 (base64는 4/3배로 부푼다) */
export function dataUrlBytes(url: string) {
  const i = url.indexOf(",");
  return i < 0 ? url.length : Math.round((url.length - i - 1) * 0.75);
}
