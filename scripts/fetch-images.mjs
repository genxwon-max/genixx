/**
 * Pixabay / Pexels 에서 사이트에 쓸 사진을 내려받아 public/images 에 저장하고
 * lib/stock-manifest.json 을 갱신한다.
 *
 *   npm run images                      이미 받은 이미지는 건너뜀
 *   npm run images -- --force           전부 다시 받음
 *   npm run images -- --only project-ai-robot,about-team   특정 자리만 다시 받음
 *
 * API 키는 .env.local 에서만 읽으며 앱 번들에는 포함되지 않는다.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";

const ROOT = process.cwd();
const IMAGE_DIR = path.join(ROOT, "public", "images");
const MANIFEST = path.join(ROOT, "lib", "stock-manifest.json");
const FORCE = process.argv.includes("--force");

const onlyIndex = process.argv.indexOf("--only");
/** --only 로 지정한 자리만 처리한다 (지정 시 항상 새로 받음) */
const ONLY =
  onlyIndex >= 0 && process.argv[onlyIndex + 1]
    ? new Set(process.argv[onlyIndex + 1].split(",").map((s) => s.trim()))
    : null;

const PIXABAY_KEY = process.env.PIXABAY_API_KEY;
const PEXELS_KEY = process.env.PEXELS_API_KEY;

/**
 * 사이트에서 사진이 필요한 자리 정의.
 * 새 자리를 추가하려면 여기에 { id, source, query, alt } 를 넣고
 * `npm run images` 를 돌린 뒤 화면에서 <StockPhoto id="..." /> 로 렌더한다.
 */
const SLOTS = [
  // 홈 — 기관 도입 배너
  { id: "school-teacher", source: "pexels", query: "teacher classroom students", alt: "교실에서 수업하는 교사" },
];

function fail(message) {
  console.error(`✖ ${message}`);
  process.exitCode = 1;
}

async function searchPixabay(query) {
  const url = new URL("https://pixabay.com/api/");
  url.searchParams.set("key", PIXABAY_KEY);
  url.searchParams.set("q", query);
  url.searchParams.set("image_type", "photo");
  url.searchParams.set("orientation", "horizontal");
  url.searchParams.set("safesearch", "true");
  url.searchParams.set("per_page", "10");

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Pixabay ${res.status} ${res.statusText}`);
  const data = await res.json();
  const hit = data.hits?.[0];
  if (!hit) throw new Error(`Pixabay: "${query}" 결과 없음`);

  // largeImageURL 은 긴 변이 1280px 이 되도록 축소된 이미지
  const ratio = hit.imageWidth / hit.imageHeight;
  const [width, height] =
    ratio >= 1 ? [1280, Math.round(1280 / ratio)] : [Math.round(1280 * ratio), 1280];

  return {
    downloadUrl: hit.largeImageURL,
    width,
    height,
    credit: { name: hit.user, url: hit.pageURL, source: "Pixabay", sourceUrl: "https://pixabay.com" },
  };
}

async function searchPexels(query) {
  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", query);
  url.searchParams.set("orientation", "landscape");
  url.searchParams.set("per_page", "10");

  const res = await fetch(url, { headers: { Authorization: PEXELS_KEY } });
  if (!res.ok) throw new Error(`Pexels ${res.status} ${res.statusText}`);
  const data = await res.json();
  const photo = data.photos?.[0];
  if (!photo) throw new Error(`Pexels: "${query}" 결과 없음`);

  return {
    downloadUrl: photo.src.large2x, // 1880 x 1300 고정 크롭
    width: 1880,
    height: 1300,
    credit: {
      name: photo.photographer,
      url: photo.url,
      source: "Pexels",
      sourceUrl: "https://www.pexels.com",
    },
  };
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`다운로드 실패 ${res.status} ${res.statusText}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(dest, buffer);
  return buffer.length;
}

async function main() {
  if (!PIXABAY_KEY || !PEXELS_KEY) {
    fail(".env.local 에 PIXABAY_API_KEY 와 PEXELS_API_KEY 를 설정해주세요.");
    return;
  }

  await fs.mkdir(IMAGE_DIR, { recursive: true });

  /** @type {{generatedAt: string, images: Record<string, unknown>}} */
  let manifest = { generatedAt: "", images: {} };
  if (existsSync(MANIFEST)) {
    try {
      manifest = JSON.parse(await fs.readFile(MANIFEST, "utf8"));
    } catch {
      // 손상된 매니페스트는 새로 만든다
    }
  }

  let downloaded = 0;
  let skipped = 0;

  for (const slot of SLOTS) {
    const file = `${slot.id}.jpg`;
    const dest = path.join(IMAGE_DIR, file);

    if (ONLY) {
      if (!ONLY.has(slot.id)) {
        skipped += 1;
        continue;
      }
    } else if (!FORCE && existsSync(dest) && manifest.images[slot.id]) {
      skipped += 1;
      continue;
    }

    try {
      const found =
        slot.source === "pixabay"
          ? await searchPixabay(slot.query)
          : await searchPexels(slot.query);

      const bytes = await download(found.downloadUrl, dest);
      manifest.images[slot.id] = {
        file: `/images/${file}`,
        width: found.width,
        height: found.height,
        alt: slot.alt,
        credit: found.credit,
      };
      downloaded += 1;
      console.log(
        `✔ ${slot.id.padEnd(24)} ${found.credit.source.padEnd(8)} ${(bytes / 1024).toFixed(0)}KB  © ${found.credit.name}`,
      );
    } catch (error) {
      fail(`${slot.id}: ${error.message}`);
    }
  }

  // SLOTS 에서 빠진 자리는 매니페스트와 파일에서 함께 정리한다
  let pruned = 0;
  const ids = new Set(SLOTS.map((s) => s.id));
  for (const id of Object.keys(manifest.images)) {
    if (ids.has(id)) continue;
    delete manifest.images[id];
    await fs.rm(path.join(IMAGE_DIR, `${id}.jpg`), { force: true });
    pruned += 1;
    console.log(`− ${id.padEnd(24)} 사용하지 않아 삭제`);
  }

  manifest.generatedAt = new Date().toISOString();
  await fs.writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  console.log(`\n완료 — 새로 받음 ${downloaded}개, 건너뜀 ${skipped}개, 정리 ${pruned}개`);
  console.log(`매니페스트: ${path.relative(ROOT, MANIFEST)}`);
}

main();
