'use client';
import theme from '@/themes';
import { useSim } from '@/store/useSim';
import { Panel, Empty, Progress } from '@/components/ui';
import HostRow from '@/components/HostList';
import Link from 'next/link';
import { utc } from '@/lib/format';
import { RULES } from '@/lib/rules';

export default function ImmunityPage() {
  const snap = useSim((s) => s.snap);
  if (!snap) return <Empty>loading</Empty>;
  const survivors = snap.hosts.filter((h) => h.immuneTo.length > 0).sort((a, b) => b.lysisSurvived - a.lysisSurvived || b.immuneTo.length - a.immuneTo.length);
  const windows = snap.hosts.filter((h) => h.immuneUntil && h.immuneUntil > snap.now);
  const active = snap.lineages.filter((l) => !l.extinct && l.compatibleHosts > 0).sort((a, b) => b.immuneHosts / b.compatibleHosts - a.immuneHosts / a.compatibleHosts);
  const extinct = snap.lineages.filter((l) => l.extinct).sort((a, b) => (b.extinctAt ?? 0) - (a.extinctAt ?? 0));
  return (
    <div className="mx-auto max-w-[1400px] px-4 pt-8">
      <div className="eyebrow">selection pressure</div>
      <h1 className="mt-2 text-4xl">immunity</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title={`herd immunity · % of compatible ${theme.target}s immune per active ${theme.lineage} · extinct at ${RULES.herdImmunity * 100}%`}>
          {active.map((l) => {
            const f = l.immuneHosts / l.compatibleHosts;
            return (
              <Link key={l.id} href={`/strain/${l.rootCa}`} className="bio block border-b border-border px-4 py-3 hover:bg-void">
                <div className="mb-1 flex items-center justify-between text-[12px]">
                  <span className="text-text">{l.name} <span className="text-muted">#{l.narrativeTag}</span></span>
                  <span className="num" style={{ color: f >= 0.5 ? 'var(--c-immune)' : 'var(--c-muted)' }}>{l.immuneHosts}/{l.compatibleHosts} · {Math.round(f * 100)}%</span>
                </div>
                <Progress value={f / RULES.herdImmunity} />
              </Link>
            );
          })}
        </Panel>
        <div className="space-y-6">
          <Panel title={`recently ${theme.states.extinct} ${theme.lineage}s`}>
            {extinct.length === 0 && <Empty>none yet · watch the closest bar on the left</Empty>}
            {extinct.map((l) => (
              <Link key={l.id} href={`/strain/${l.rootCa}`} className="bio flex items-center justify-between border-b border-border px-4 py-3 text-dead hover:bg-void">
                <div>
                  <div className="line-through">{l.name}</div>
                  <div className="text-[11px]">{l.extinctCause}</div>
                </div>
                <span className="num text-[11px]">{l.extinctAt ? utc(l.extinctAt) : ''}</span>
              </Link>
            ))}
          </Panel>
          <Panel title={`purchased windows · ${windows.length} active`}>
            {windows.length === 0 && <Empty>no active windows</Empty>}
            {windows.map((h) => (
              <HostRow key={h.ca} h={h} />
            ))}
          </Panel>
        </div>
      </div>
      <Panel title={`surviving ${theme.target}s · ${survivors.length} with permanent badges`} className="mt-6">
        {survivors.length === 0 && <Empty>none</Empty>}
        {survivors.map((h) => (
          <HostRow key={h.ca} h={h} />
        ))}
      </Panel>
    </div>
  );
}
