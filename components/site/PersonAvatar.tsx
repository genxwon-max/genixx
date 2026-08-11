import Image from "next/image";
import { groupOf, type Person } from "@/lib/people";
import { findPublicImage } from "@/lib/assets";

type Props = {
  person: Person;
  /** 픽셀 단위 한 변 길이 */
  size?: number;
  className?: string;
};

/**
 * 참여진 인물 사진.
 * public/people/{id}.{png|webp|jpg} 가 있으면 그 사진을 쓰고,
 * 없으면 그룹 색을 입힌 이름 모노그램으로 대체한다. (서버 컴포넌트 전용)
 */
export default function PersonAvatar({ person, size = 48, className = "" }: Props) {
  const photo = findPublicImage(`people/${person.id}`);
  const group = groupOf(person.group);

  if (photo) {
    return (
      <Image
        src={photo.src}
        alt={`${person.name} ${person.role}`}
        width={size}
        height={size}
        // sizes를 주면 브라우저가 레이아웃 전에 최대 폭(3840w)을 고르는 경우가 있어
        // 고정 크기 아바타에서는 생략하고 Next의 1x·2x srcset을 그대로 쓴다
        className={`shrink-0 rounded-full object-cover ring-1 ring-brand-100 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.round(size * 0.34) }}
      className={`flex shrink-0 items-center justify-center rounded-full font-black ${group.tone} ${className}`}
    >
      {person.name.slice(1)}
    </span>
  );
}
