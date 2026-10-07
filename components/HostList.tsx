'use client';
import Link from 'next/link';
import type { Host } from '@/lib/types';
import { fmtUsd, fmtInt, fmtSol } from '@/lib/format';
import { StatePill, ImmunityBadge } from './ui';
import { useSim } from '@/store/useSim';

export default function HostRow({ h, score, extra }: { h: Host; score?: number; extra?: React.ReactNode }) {
  const lineages = useSim((s) => s.snap?.lineages);
  const names = new Map(lineages?.map((l) => [l.id, l.name]));
  return (
    <Link href={`/host/${h.ca}`} className="bio flex items-center gap-3 border-b border-border px-4 py-2 hover:bg-[color-mix(in_srgb,var(--c-panel)_60%,var(--c-void))]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={h.image} alt="" className="h-7 w-7 rounded-full border border-border" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-text">${h.ticker}</span>
          <StatePill state={h.state} />
          {h.immuneTo.slice(0, 2).map((l) => (
            <ImmunityBadge key={l} name={names.get(l) ?? l.slice(0, 4)} permanent />
          ))}
          {h.immuneTo.length > 2 && <span className="text-[10px] text-muted">+{h.immuneTo.length - 2}</span>}
          {h.immuneUntil && <ImmunityBadge name="24h window" permanent={false} />}
        </div>
        <div className="num text-[11px] text-muted">
          {fmtUsd(h.mcap)} · {fmtInt(h.holders)} holders · {h.strains.length} strains · {fmtSol(h.totalExtracted)} SOL taken
        </div>
      </div>
      {score !== undefined && (
        <div className="num text-right">
          <div className="text-lg text-specimen">{score}</div>
          <div className="label">compat</div>
        </div>
      )}
      {extra}
    </Link>
  );
}
