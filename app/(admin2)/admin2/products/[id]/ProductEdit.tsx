"use client";

import Link from "next/link";
import { useHydrated } from "@/lib/examStore";
import { useProducts } from "@/lib/productStore";
import { Body, PageHead, Panel } from "@/components/admin2/ui";
import ProductForm from "../ProductForm";

/**
 * 주소의 상품 번호로 한 줄을 찾아 폼에 넘긴다.
 *
 * 목록을 구독해서 찾는다(useProducts). 한 번만 읽어 두면 다른 창에서 같은 상품을 지웠을 때
 * 이 화면은 없는 것을 고치고 있게 되고, 저장하는 순간 지워진 줄이 되살아난다.
 */
export default function ProductEdit({ id }: { id: string }) {
  const hydrated = useHydrated();
  const products = useProducts();

  if (!hydrated) {
    return <p className="p-6 text-center a2-t-sm text-(--a2-ink-3)">확인 중입니다…</p>;
  }

  const found = products.find((p) => p.id === id);

  if (!found) {
    return (
      <>
        <PageHead
          title="상품 수정"
          actions={
            <Link href="/admin2/products" className="a2-btn">
              상품 관리
            </Link>
          }
        />
        <Body>
          <Panel title="찾을 수 없는 상품">
            <p className="a2-t-sm text-(--a2-ink-2)">
              <span className="a2-mono">{id}</span> 상품이 없습니다. 지워졌거나 다른 브라우저에서 만든 것일 수
              있습니다 — 상품은 이 브라우저 저장소에만 있습니다.
            </p>
          </Panel>
        </Body>
      </>
    );
  }

  return <ProductForm edit={found} />;
}
