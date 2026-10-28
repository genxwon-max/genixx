"use client";

import { rounds } from "@/lib/admin";
import { useForms } from "@/lib/formStore";
import { useItems } from "@/lib/itemStore";
import { useSecurity } from "@/lib/securityStore";
import RotationBoard from "@/components/admin2/RotationBoard";

/** 회차 번호 → 이름(「2026 파일럿 3회차」) */
const roundLabel = (id: string) => rounds.find((r) => r.id === id)?.label ?? id;

/**
 * ADM-04-4 문항 회전 — 화면은 components/admin2/RotationBoard.tsx가 그린다. 여기서는 문항 · 검사지 ·
 * 회전 한계를 저장소에서 읽어 넘긴다.
 */
export default function RotationView() {
  const items = useItems();
  const forms = useForms();
  const settings = useSecurity();
  return (
    <RotationBoard items={items} forms={forms} maxRuns={settings.maxRuns} roundLabel={roundLabel} />
  );
}
