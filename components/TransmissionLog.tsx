'use client';
import { useEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { SimEvent, EventKind } from '@/lib/types';
import { useSim } from '@/store/useSim';
import { timeAgo, txUrl, shortCa } from '@/lib/format';
import { HostLink, StrainLink } from './ui';

const KIND_COLOR: Record<EventKind, string> = {
  infect: 'var(--c-viral)',
  extract: 'var(--c-specimen)',
  lyse: 'var(--c-infection)',
  integrate: 'var(--c-viral)',
  activate: 'var(--c-infection)',
  immunize: 'var(--c-immune)',
  expire: 'var(--c-dead)',
  extinct: 'var(--c-dead)',
  burn: 'var(--c-viral)',
};

export default function TransmissionLog({ events, height = 420, filterStrain, filterHost }: { events?: SimEvent[]; height?: number; filterStrain?: string; filterHost?: string }) {
  const snapEvents = useSim((s) => s.snap?.events);
  let list = events ?? snapEvents ?? [];
  if (filterStrain) list = list.filter((e) => e.strainCa === filterStrain || (e.meta?.children as string[] | undefined)?.includes(filterStrain));
  if (filterHost) list = list.filter((e) => e.hostCa === filterHost);
  const parent = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  const v = useVirtualizer({ count: list.length, getScrollElement: () => parent.current, estimateSize: () => 30, overscan: 12 });
  const strains = useSim((s) => s.snap?.strains);
  const names = useRef(new Map<string, string>());
  if (strains) for (const s of strains) names.current.set(s.ca, s.name);

  return (
    <div ref={parent} className="scroll-thin overflow-auto" style={{ height }}>
      {list.length === 0 && <div className="px-4 py-8 text-center text-muted">no transmissions yet</div>}
      <div style={{ height: v.getTotalSize(), position: 'relative' }}>
        {v.getVirtualItems().map((row) => {
          const e = list[row.index];
          const url = txUrl(e.txSig);
          return (
            <div
              key={e.id}
              className="absolute left-0 top-0 flex w-full items-center gap-3 border-b border-border px-4 text-[11.5px]"
              style={{ transform: `translateY(${row.start}px)`, height: row.size }}
            >
              <span className="num w-8 shrink-0 text-right text-muted">{timeAgo(e.at, now)}</span>
              <span className="w-[72px] shrink-0 uppercase tracking-[0.1em]" style={{ color: KIND_COLOR[e.kind] }}>
                {e.kind}
              </span>
              <span className="min-w-0 flex-1 truncate">
                {e.strainCa !== 'hub' ? (
                  <StrainLink ca={e.strainCa}>
                    <span className="text-text">{e.text}</span>
                  </StrainLink>
                ) : (
                  <span className="text-text">{e.text}</span>
                )}
              </span>
              {e.hostCa && (
                <HostLink ca={e.hostCa}>
                  <span className="num hidden text-muted md:inline">{shortCa(e.hostCa, 3)}</span>
                </HostLink>
              )}
              {url ? (
                <a href={url} target="_blank" rel="noreferrer" className="num shrink-0 text-muted hover:text-specimen">
                  tx ↗
                </a>
              ) : (
                <span className="w-7 shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
