'use client';
import { useState } from 'react';
import Link from 'next/link';
import theme from '@/themes';
import { useSim } from '@/store/useSim';
import { Panel, Tabs, Empty, Progress } from '@/components/ui';
import { fmtSol, utc } from '@/lib/format';
import type { Lineage } from '@/lib/types';

type Tab = 'hosts' | 'sol' | 'gen' | 'virulence' | 'extinct';

export default function LineagesPage() {
  const snap = useSim((s) => s.snap);
  const [tab, setTab] = useState<Tab>('hosts');
  if (!snap) return <Empty>loading</Empty>;
  const live = snap.lineages.filter((l) => !l.extinct);
  const sorters: Record<Tab, (a: Lineage, b: Lineage) => number> = {
    hosts: (a, b) => b.hostsInfected - a.hostsInfected,
    sol: (a, b) => b.totalExtracted - a.totalExtracted,
    gen: (a, b) => b.deepestGeneration - a.deepestGeneration,
    virulence: (a, b) => b.maxVirulence - a.maxVirulence,
    extinct: (a, b) => (b.extinctAt ?? 0) - (a.extinctAt ?? 0),
  };
  const list = (tab === 'extinct' ? snap.lineages.filter((l) => l.extinct) : live).sort(sorters[tab]);
  return (
    <div className="mx-auto max-w-[1400px] px-4 pt-8">
      <div className="eyebrow">population</div>
      <h1 className="mt-2 text-4xl">{theme.lineage}s</h1>
      <Panel className="mt-6">
        <Tabs<Tab>
          tabs={[
            { id: 'hosts', label: `most ${theme.target}s ${theme.verbs.attach}ed` },
            { id: 'sol', label: `most SOL ${theme.verbs.extract}ed` },
            { id: 'gen', label: 'deepest generation' },
            { id: 'virulence', label: 'highest virulence' },
            { id: 'extinct', label: `${theme.states.extinct} ${theme.lineage}s` },
          ]}
          value={tab}
          onChange={setTab}
        />
        <div className="hidden grid-cols-12 gap-2 border-b border-border px-4 py-2 label md:grid">
          <span className="col-span-3">{theme.lineage}</span>
          <span className="col-span-1 text-right">{theme.unit}s</span>
          <span className="col-span-1 text-right">{theme.target}s</span>
          <span className="col-span-1 text-right">killed</span>
          <span className="col-span-2 text-right">SOL {theme.verbs.extract}ed</span>
          <span className="col-span-1 text-right">gen</span>
          <span className="col-span-1 text-right">virulence</span>
          <span className="col-span-2 text-right">herd immunity</span>
        </div>
        {list.length === 0 && <Empty>none</Empty>}
        {list.map((l) => {
          const f = l.compatibleHosts ? l.immuneHosts / l.compatibleHosts : 0;
          return (
            <Link key={l.id} href={`/strain/${l.rootCa}`} className={`bio grid grid-cols-2 items-center gap-2 border-b border-border px-4 py-3 hover:bg-void md:grid-cols-12 ${l.extinct ? 'text-dead' : ''}`}>
              <div className="col-span-2 md:col-span-3">
                <div className={`text-text ${l.extinct ? 'text-dead line-through' : ''}`}>{l.name}</div>
                <div className="num text-[11px] text-muted">#{l.narrativeTag} · patient zero {l.rootCa.slice(0, 6)}…{l.extinct && l.extinctAt ? ` · extinct ${utc(l.extinctAt)}` : ''}</div>
                {l.extinct && <div className="text-[11px] text-dead">cause: {l.extinctCause}</div>}
              </div>
              <span className="num text-right md:col-span-1">{l.members.length}</span>
              <span className="num text-right text-viral md:col-span-1">{l.hostsInfected}</span>
              <span className="num text-right text-infection md:col-span-1">{l.hostsKilled}</span>
              <span className="num text-right md:col-span-2">{fmtSol(l.totalExtracted)}</span>
              <span className="num text-right md:col-span-1">{l.deepestGeneration}</span>
              <span className="num text-right md:col-span-1">{l.maxVirulence.toFixed(0)}</span>
              <div className="col-span-2 md:col-span-2">
                <div className="num mb-1 text-right text-[11px] text-muted">{l.immuneHosts}/{l.compatibleHosts} · {Math.round(f * 100)}%</div>
                <Progress value={f / 0.6} color={l.extinct ? 'var(--c-dead)' : 'var(--c-immune)'} />
              </div>
            </Link>
          );
        })}
      </Panel>
    </div>
  );
}
