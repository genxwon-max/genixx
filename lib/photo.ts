/**
 * 프로필 사진을 브라우저에서 줄인다 — 전문가 「내 정보」가 쓴다(회원 자리 · 운영 콘솔).
 *
 * 올린 파일을 그대로 저장하지 않고 정사각 320px로 잘라 줄인다. 이 시안에는 파일 서버가
 * 없어 사진이 계정과 함께 브라우저 저장소에 들어가는데, 휴대전화 사진 한 장(수 MB)이면
 * 저장소가 넘친다.
 */

const PHOTO_PX = 320;

/** 고른 파일을 정사각으로 잘라 줄인 data URL로 바꾼다. 그림이 아니면 null */
export function shrinkPhoto(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) return resolve(null);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const canvas = document.createElement("canvas");
      canvas.width = PHOTO_PX;
      canvas.height = PHOTO_PX;
      const ctx = canvas.getContext("2d");
      URL.revokeObjectURL(url);
      if (!ctx || side === 0) return resolve(null);
      /* 가운데를 정사각으로 — 세로 사진은 위아래를, 가로 사진은 좌우를 덜어 낸다 */
      ctx.drawImage(
        img,
        (img.naturalWidth - side) / 2,
        (img.naturalHeight - side) / 2,
        side,
        side,
        0,
        0,
        PHOTO_PX,
        PHOTO_PX,
      );
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}
