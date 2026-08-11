import manifest from "./stock-manifest.json";

export type StockCredit = {
  name: string;
  url: string;
  source: string;
  sourceUrl: string;
};

export type StockImage = {
  file: string;
  width: number;
  height: number;
  alt: string;
  credit: StockCredit;
};

const images = manifest.images as Record<string, StockImage>;

/**
 * `npm run images` 로 내려받은 사진을 id로 찾는다.
 * 아직 받지 않았다면 null을 돌려주고, 호출 측은 대체 배경을 렌더한다.
 */
export function getStock(id: string): StockImage | null {
  return images[id] ?? null;
}

/** 푸터 크레딧 표기에 쓸 출처 목록 */
export function stockSources() {
  const sources = new Map<string, string>();
  for (const image of Object.values(images)) {
    sources.set(image.credit.source, image.credit.sourceUrl);
  }
  return [...sources].map(([name, url]) => ({ name, url }));
}
