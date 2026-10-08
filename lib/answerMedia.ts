"use client";

import { useEffect, useState } from "react";

/**
 * 파일로 낸 답(사진 · 녹음)을 두는 곳 — 브라우저의 파일 저장소(IndexedDB).
 *
 * 응시 기록(lib/examStore.ts)은 localStorage에 있고 5MB에서 끊긴다. 녹음 하나가 수백 KB라
 * 거기에 함께 담으면 문항 두엇에서 기록 전체가 저장되지 않는다. 그래서 파일은 여기에 두고
 * 응시 기록의 답 자리에는 열쇠만 적는다(lib/exam.ts joinUpload).
 *
 * ⚠ 브라우저에만 있다. 서버가 붙으면 saveMedia가 파일을 올리고 주소를 돌려주면 된다 —
 *   부르는 쪽은 열쇠가 무엇인지 모른다.
 */

const DB = "genixx.answers";
const STORE = "media";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = window.indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, act: (s: IDBObjectStore) => IDBRequest<T>) {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = act(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

/** 파일을 담고 열쇠를 돌려준다 */
export async function saveMedia(blob: Blob): Promise<string> {
  const key = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  await run("readwrite", (s) => s.put(blob, key));
  return key;
}

export async function loadMedia(key: string): Promise<Blob | null> {
  const found = await run<unknown>("readonly", (s) => s.get(key));
  return found instanceof Blob ? found : null;
}

/** 다시 내거나 지운 답의 파일을 버린다 — 실패해도 답에는 영향이 없다 */
export async function dropMedia(key: string) {
  try {
    await run("readwrite", (s) => s.delete(key));
  } catch {}
}

/**
 * 열쇠로 파일을 읽어 화면에 쓸 주소로 만든다.
 *
 *   url      읽는 중이거나 없으면 null
 *   missing  다 읽었는데 없다 — 다른 기기에서 낸 답이거나 브라우저 저장소를 비운 경우
 */
export function useMediaUrl(key: string | null) {
  const [state, setState] = useState<{ key: string; url: string | null } | null>(null);

  useEffect(() => {
    if (!key) return;
    let url: string | null = null;
    let gone = false;
    loadMedia(key)
      .catch(() => null)
      .then((blob) => {
        if (gone) return;
        url = blob ? URL.createObjectURL(blob) : null;
        setState({ key, url });
      });
    return () => {
      gone = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [key]);

  const ready = !!key && state?.key === key;
  return { url: ready ? state.url : null, missing: ready && !state.url };
}
