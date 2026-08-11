"use client";

import { useEffect, useRef } from "react";

/**
 * 오른쪽 하단에 잠깐 떴다 사라지는 알림.
 * 성공/실패를 색으로 강조하지 않고 중립 톤으로 처리한다.
 */
export default function Toast({
  message,
  onClose,
  duration = 2600,
}: {
  message: string | null;
  onClose: () => void;
  duration?: number;
}) {
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(() => closeRef.current(), duration);
    return () => window.clearTimeout(id);
  }, [message, duration]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-fade-up fixed bottom-6 right-6 z-50 max-w-sm rounded-md border border-exam-line bg-exam-text px-5 py-3.5 text-[13px] font-medium leading-relaxed text-white shadow-float"
    >
      {message}
    </div>
  );
}
