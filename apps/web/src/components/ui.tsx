'use client';

import type { ReactNode } from 'react';

/** 판정 배지 — 두 단계만 쓴다 (불가 / 확인 필요) */
const BADGE_STYLE: Record<string, string> = {
  INELIGIBLE: 'bg-danger-soft text-danger ring-danger-line',
  NEEDS_CHECK: 'bg-caution-soft text-caution ring-caution-line',
  CONDITIONAL: 'bg-brand-soft text-brand ring-brand-line',
  ELIGIBLE: 'bg-brand-soft text-brand ring-brand-line',
};

export function Badge({ kind, label }: { kind: string; label: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
        BADGE_STYLE[kind] ?? BADGE_STYLE.NEEDS_CHECK
      }`}
    >
      <span
        aria-hidden
        className={`size-1.5 rounded-full ${
          kind === 'INELIGIBLE' ? 'bg-danger' : kind === 'NEEDS_CHECK' ? 'bg-caution' : 'bg-brand'
        }`}
      />
      {label}
    </span>
  );
}

/** 사유 칩. tone 은 색이 아니라 의미다 */
const CHIP_STYLE: Record<string, string> = {
  blocking: 'bg-danger-soft text-danger ring-danger-line',
  warning: 'bg-caution-soft text-caution ring-caution-line',
  info: 'bg-canvas text-ink-soft ring-line',
};

export function Chip({ tone, children }: { tone: string; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
        CHIP_STYLE[tone] ?? CHIP_STYLE.info
      }`}
    >
      {children}
    </span>
  );
}

/**
 * 선택 버튼. 온보딩은 텍스트 입력 없이 이것만으로 끝난다.
 * 터치 대상이 작으면 모바일에서 오선택이 나므로 넉넉하게 잡는다.
 */
export function Choice({
  selected,
  onClick,
  label,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`w-full rounded-xl px-4 py-3 text-left ring-1 transition-colors ${
        selected
          ? 'bg-brand-soft text-ink ring-2 ring-brand'
          : 'bg-surface text-ink ring-line hover:bg-canvas hover:ring-line-strong'
      }`}
    >
      <span className="block text-sm font-semibold">{label}</span>
      {description != null && (
        <span className="mt-0.5 block text-xs text-ink-faint">{description}</span>
      )}
    </button>
  );
}

/** 좁은 선택지용 (급수, 시간 등) */
export function ChoicePill({
  selected,
  onClick,
  label,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-lg px-3.5 py-2.5 text-sm font-medium ring-1 transition-colors ${
        selected
          ? 'bg-brand text-white ring-brand'
          : 'bg-surface text-ink ring-line hover:bg-canvas hover:ring-line-strong'
      }`}
    >
      {label}
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-7">
      <h2 className="text-sm font-semibold text-ink">{label}</h2>
      {hint != null && <p className="mt-1 text-xs text-ink-faint">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** 모든 판정 화면에 붙는 고지 (L3) */
export function Disclaimer({ text }: { text: string }) {
  return <p className="text-xs leading-relaxed text-ink-faint">{text}</p>;
}
