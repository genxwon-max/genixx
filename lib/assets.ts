import fs from "node:fs";
import path from "node:path";

const EXTENSIONS = ["png", "webp", "jpg", "jpeg", "avif"];

export type LocalImage = {
  src: string;
  width: number;
  height: number;
};

/** PNG 헤더(IHDR)에서 크기를 읽는다. */
function pngSize(buf: Buffer): [number, number] | null {
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) return null;
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}

/** JPEG의 SOFn 마커를 찾아 크기를 읽는다. */
function jpegSize(buf: Buffer): [number, number] | null {
  if (buf.length < 4 || buf.readUInt16BE(0) !== 0xffd8) return null;
  let offset = 2;
  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buf[offset + 1];
    // SOF0~SOF15 (DHT/JPG/DAC 제외)
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return [buf.readUInt16BE(offset + 7), buf.readUInt16BE(offset + 5)];
    }
    offset += 2 + buf.readUInt16BE(offset + 2);
  }
  return null;
}

/** 간단한 VP8/VP8L/VP8X WebP 크기 판독 */
function webpSize(buf: Buffer): [number, number] | null {
  if (buf.length < 30 || buf.toString("ascii", 8, 12) !== "WEBP") return null;
  const chunk = buf.toString("ascii", 12, 16);
  if (chunk === "VP8X") return [buf.readUIntLE(24, 3) + 1, buf.readUIntLE(27, 3) + 1];
  if (chunk === "VP8 ") return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff];
  if (chunk === "VP8L") {
    const bits = buf.readUInt32LE(21);
    return [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1];
  }
  return null;
}

function readSize(file: string): [number, number] | null {
  let handle: number | undefined;
  try {
    handle = fs.openSync(file, "r");
    const buf = Buffer.alloc(65536);
    const read = fs.readSync(handle, buf, 0, buf.length, 0);
    const head = buf.subarray(0, read);
    return pngSize(head) ?? jpegSize(head) ?? webpSize(head);
  } catch {
    return null;
  } finally {
    if (handle !== undefined) fs.closeSync(handle);
  }
}

/**
 * public/ 아래에서 해당 이름의 이미지를 찾아 경로와 실제 크기를 돌려준다.
 * 없으면 null → 호출 측은 SVG 일러스트로 대체한다. (서버 컴포넌트 전용)
 */
export function findPublicImage(basename: string, fallbackSize = [1200, 800] as const): LocalImage | null {
  for (const ext of EXTENSIONS) {
    const file = `${basename}.${ext}`;
    const full = path.join(process.cwd(), "public", file);
    if (!fs.existsSync(full)) continue;

    const size = readSize(full) ?? fallbackSize;
    return { src: `/${file}`, width: size[0], height: size[1] };
  }
  return null;
}
