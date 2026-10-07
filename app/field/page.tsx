'use client';
import { useMemo, useState } from 'react';
import theme from '@/themes';
import Field from '@/components/FieldClient';
import type { FieldFilter } from '@/components/Field';
import { useSim } from '@/store/useSim';
import HostRow from '@/components/HostList';
import { Tabs } from '@/components/ui';

type Sort = 'mcap' | 'extraction' | 'infections';

export default function FieldPage() {
  const snap = useSim((s) => s.snap);
  const [filter, setFilter] = useState<FieldFilter>('all');
  const [sort, setSort] = useState<Sort>('mcap');
  const [q, setQ] = useState('');
  const [hover, setHover] = useState<{ kind: 'host' | 'strain'; ca: string } | null>(null);
  const focus = useMemo(() => {
    if (!snap || q.length < 4) return null;
    const h = snap.hosts.find((h) => h.ca.toLowerCase().startsWith(q.toLowerCase()) || h.ticker.toLowerCase() === q.toLowerCase());
    return h?.ca ?? null;
  }, [q, snap]);
  const list = useMemo(() => {
    if (!snap) return [];
    let l = snap.hosts;
    if (filter === 'immune') l = l.filter((h) => h.immuneTo.length > 0 || !!h.immuneUntil);
    else if (filter !== 'all') l = l.filter((h) => h.state === filter);
    if (q) l = l.filter((h) => h.ca.toLowerCase().includes(q.toLowerCase()) || h.ticker.toLowerCase().includes(q.toLowerCase()));
    return [...l].sort((a, b) => (sort === 'mcap' ? b.mcap - a.mcap : sort === 'extraction' ? b.totalExtracted - a.totalExtracted : b.strains.length - a.strains.length));
  }, [snap, filter, sort, q]);
  const hoverName = hover ? (hover.kind === 'host' ? '$' + snap?.hosts.find((h) => h.ca === hover.ca)?.ticker : snap?.strains.find((s) => s.ca === hover.ca)?.name) : null;
  return (
    <div className="relative h-[calc(100vh-56px)] w-full overflow-hidden">
      <Field mode="full" filter={filter} focusCa={focus} onHover={setHover} />
      <div className="glass absolute left-4 top-4 flex max-h-[calc(100%-2rem)] w-[min(360px,calc(100%-2rem))] flex-col overflow-hidden">
        <div className="border-b border-border p-3">
          <input className="input" placeholder={`search ${theme.target} by CA or ticker`} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Tabs<FieldFilter>
          tabs={[
            { id: 'all', label: 'all' },
            { id: 'healthy', label: theme.states.healthy },
            { id: 'infected', label: theme.states.infected },
            { id: 'lysogenic', label: theme.states.lysogenic },
            { id: 'immune', label: theme.states.immune },
            { id: 'dead', label: theme.states.dead },
          ]}
          value={filter}
          onChange={setFilter}
        />
        <div className="flex items-center gap-3 border-b border-border px-3 py-2">
          <span className="label">sort</span>
          {(['mcap', 'extraction', 'infections'] as Sort[]).map((s) => (
            <button key={s} onClick={() => setSort(s)} className={`label bio ${sort === s ? 'text-specimen' : 'hover:text-text'}`}>
              {s}
            </button>
          ))}
          <span className="num ml-auto text-[11px] text-muted">{list.length}</span>
        </div>
        <div className="scroll-thin min-h-0 flex-1 overflow-auto">
          {list.slice(0, 80).map((h) => (
            <HostRow key={h.ca} h={h} />
          ))}
        </div>
      </div>
      {hoverName && <div className="glass pointer-events-none absolute bottom-4 right-4 px-3 py-2 text-[12px]">{hover?.kind} · {hoverName} · click to open</div>}
    </div>
  );
}
