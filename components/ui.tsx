'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { HostState, StrainState } from '@/lib/types';
import { shortCa, txUrl } from '@/lib/format';

export function Panel({ children, className = '', title, right }: { children: React.ReactNode; className?: string; title?: string; right?: React.ReactNode }) {
  return (
    <section className={`mount ${className}`}>
      {(title || right) && (
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          {title && <span className="label">{title}</span>}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

/** Instrument readout: numbers tick toward their target instead of snapping. */
export function Readout({ value, format = (v: number) => Math.round(v).toLocaleString(), className = '' }: { value: number; format?: (v: number) => string; className?: string }) {
  const [shown, setShown] = useState(value);
  const ref = useRef(value);
  useEffect(() => {
    const from = ref.current;
    const to = value;
    if (from === to) return;
    const t0 = performance.now();
    const dur = 900;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      const v = from + (to - from) * e;
      ref.current = v;
      setShown(v);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className={`num ${className}`}>{format(shown)}</span>;
}

export function Stat({ label, value, sub, accent }: { label: string; value: React.ReactNode; sub?: React.ReactNode; accent?: string }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3">
      <span className="label">{label}</span>
      <span className="num text-xl" style={{ color: accent }}>
        {value}
      </span>
      {sub && <span className="text-[11px] text-muted">{sub}</span>}
    </div>
  );
}

export const STATE_COLOR: Record<HostState | StrainState | 'immune' | 'extinct', string> = {
  healthy: 'var(--c-specimen)',
  infected: 'var(--c-viral)',
  lysogenic: 'var(--c-viral)',
  dead: 'var(--c-dead)',
  dormant: 'var(--c-dormant)',
  active: 'var(--c-viral)',
  lysed: 'var(--c-infection)',
  integrated: 'var(--c-viral)',
  expired: 'var(--c-dead)',
  immune: 'var(--c-immune)',
  extinct: 'var(--c-dead)',
};

export function StatePill({ state, label }: { state: keyof typeof STATE_COLOR; label?: string }) {
  return (
    <span className="pill" style={{ borderColor: STATE_COLOR[state], color: STATE_COLOR[state] }}>
      <span className="dot" style={{ background: STATE_COLOR[state] }} />
      {label ?? state}
    </span>
  );
}

export function Ca({ ca, n = 4, copy = true }: { ca: string; n?: number; copy?: boolean }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="num bio inline-flex items-center gap-1 text-muted hover:text-specimen"
      onClick={() => {
        if (!copy) return;
        navigator.clipboard?.writeText(ca);
        setDone(true);
        setTimeout(() => setDone(false), 1200);
      }}
      title={ca}
    >
      {shortCa(ca, n)}
      {copy && <span className="text-[10px]">{done ? '✓' : '⧉'}</span>}
    </button>
  );
}

export function Tx({ sig }: { sig?: string }) {
  const url = txUrl(sig);
  if (!url) return <span className="text-muted">—</span>;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="num bio text-muted hover:text-specimen">
      tx {shortCa(sig!, 3)} ↗
    </a>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-10 text-center text-[11px] uppercase tracking-[0.14em] text-muted">{children}</div>;
}

export function Row({ k, v, bold }: { k: string; v: React.ReactNode; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between border-t border-border px-4 py-2 ${bold ? 'font-bold text-text' : ''}`}>
      <span className="label">{k}</span>
      <span className="num">{v}</span>
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (t: T) => void }) {
  return (
    <div className="flex flex-wrap gap-0 border-b border-border">
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)} className={`bio px-4 py-2 text-[11px] uppercase tracking-[0.14em] ${value === t.id ? 'border-b-2 border-specimen text-specimen' : 'text-muted hover:text-text'}`}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function HostLink({ ca, children }: { ca: string; children: React.ReactNode }) {
  return (
    <Link href={`/host/${ca}`} className="bio hover:text-specimen">
      {children}
    </Link>
  );
}
export function StrainLink({ ca, children }: { ca: string; children: React.ReactNode }) {
  return (
    <Link href={`/strain/${ca}`} className="bio hover:text-viral">
      {children}
    </Link>
  );
}

export function ImmunityBadge({ name, permanent }: { name: string; permanent: boolean }) {
  return (
    <span className="pill" style={{ borderColor: permanent ? 'var(--c-immune)' : 'var(--c-dormant)', color: permanent ? 'var(--c-immune)' : 'var(--c-dormant)' }} title={permanent ? 'permanent lineage immunity (survived lysis)' : 'purchased 24h window'}>
      <span className="dot" style={{ background: 'currentColor' }} />
      {permanent ? `immune · ${name}` : name}
    </span>
  );
}

export function Progress({ value, color = 'var(--c-immune)' }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 w-full border border-border">
      <div className="bio h-full" style={{ width: `${Math.min(100, Math.max(0, value * 100))}%`, background: color }} />
    </div>
  );
}
