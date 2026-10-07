'use client';
import Link from 'next/link';
import type { Strain } from '@/lib/types';
import { fmtSol } from '@/lib/format';
import { StatePill } from './ui';

export default function StrainRow({ s, lineageName, extra }: { s: Strain; lineageName?: string; extra?: React.ReactNode }) {
  return (
    <Link href={`/strain/${s.ca}`} className="bio flex items-center gap-3 border-b border-border px-4 py-2 hover:bg-[color-mix(in_srgb,var(--c-panel)_60%,var(--c-void))]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={s.image} alt="" className="h-7 w-7 border border-border" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-text">{s.name}</span>
          <StatePill state={s.state} />
          <span className="pill">{s.path}</span>
          <span className="pill num">gen {s.generation}</span>
        </div>
        <div className="num text-[11px] text-muted">
          {lineageName ? `${lineageName} · ` : ''}virulence {s.virulence} · {fmtSol(s.totalExtracted)} SOL extracted · {s.hostsInfected} hosts · {s.hostsKilled} killed
        </div>
      </div>
      {extra}
    </Link>
  );
}
