'use client';
import theme from '@/themes';
import { useSim } from '@/store/useSim';
import { Readout } from './ui';
import Countdown from './Countdown';
import { fmtCompact, fmtSol } from '@/lib/format';

export default function StatsStrip() {
  const stats = useSim((s) => s.snap?.stats);
  const cells = [
    [`${theme.target}s ${theme.verbs.attach}ed`, stats ? <Readout value={stats.hostsInfected} /> : '—'],
    [`active ${theme.unit}s`, stats ? <Readout value={stats.activeStrains} /> : '—'],
    [`SOL ${theme.verbs.extract}ed`, stats ? <Readout value={stats.solExtracted} format={(v) => fmtSol(v, 3)} /> : '—'],
    [`${theme.hubToken} ${theme.hubRitual}ed`, stats ? <Readout value={stats.virusBurned} format={fmtCompact} /> : '—'],
    [`${theme.lineage}s ${theme.states.extinct}`, stats ? <Readout value={stats.lineagesExtinct} /> : '—'],
    [`next ${theme.hubRitualLabel}`, <Countdown key="c" />],
  ] as const;
  return (
    <div className="mount grid grid-cols-2 md:grid-cols-6">
      {cells.map(([k, v], i) => (
        <div key={k} className={`flex flex-col gap-1 px-4 py-3 ${i > 0 ? 'rule-v' : ''}`}>
          <span className="label">{k}</span>
          <span className="num text-xl text-text">{v}</span>
        </div>
      ))}
    </div>
  );
}
