"use client";

import type { Field as FieldDef } from "@/lib/signup";
import { field as inputClass } from "@/components/account/ui";

type Props = {
  field: FieldDef;
  value: string;
  error?: string;
  readOnly?: boolean;
  onChange: (value: string) => void;
};

export default function Field({ field, value, error, readOnly, onChange }: Props) {
  const id = `f-${field.name}`;
  const tone = error
    ? "border-rose-300 focus:border-rose-400"
    : readOnly
      ? "border-exam-line bg-exam-raised text-exam-muted"
      : "";

  return (
    <div className={field.half ? "" : "sm:col-span-2"}>
      <label htmlFor={id} className="text-[13px] font-bold text-exam-text">
        {field.label}
        {field.required ? (
          <span className="ml-1 text-rose-600">*</span>
        ) : (
          <span className="ml-1.5 rounded border border-exam-line px-1.5 py-0.5 text-[10px] font-medium text-exam-muted">
            선택
          </span>
        )}
      </label>

      {field.type === "select" ? (
        <select
          id={id}
          value={value}
          disabled={readOnly}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          className={`mt-2 ${inputClass} ${tone} ${value ? "" : "text-exam-muted/70"}`}
        >
          <option value="">선택해 주세요</option>
          {field.options?.map((o) => (
            <option key={o} value={o} className="bg-exam-panel text-exam-text">
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          type={field.type}
          value={value}
          readOnly={readOnly}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          className={`mt-2 ${inputClass} ${tone}`}
        />
      )}

      {readOnly && (
        <p className="mt-1.5 text-[12px] text-brand-700">
          간편 로그인에서 자동으로 가져온 정보입니다.
        </p>
      )}
      {error ? (
        <p role="alert" className="mt-1.5 text-[12px] font-medium text-rose-600">
          {error}
        </p>
      ) : (
        field.hint && (
          <p className="mt-1.5 text-[12px] leading-relaxed text-exam-muted">{field.hint}</p>
        )
      )}
    </div>
  );
}
