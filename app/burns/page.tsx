'use client';
import theme from '@/themes';
import { useSim } from '@/store/useSim';
import { Panel, Empty, Tx, Ca, Readout, HostLink } from '@/components/ui';
import { BarChartBox, LineChartBox } from '@/components/Charts';
import { fmtSol, fmtCompact, utc } from '@/lib/format';
import { HUB_CA } from '@/lib/sim';
import Countdown from '@/components/Countdown';

export default function BurnsPage() {
  const snap = useSim((s) => s.snap);
  if (!snap) return <Empty>loading</Empty>;
  const burns = snap.burns;
  const totalBurned = burns.reduce((a, b) => a + b.virusBurned, 0);
  const totalSol = burns.reduce((a, b) => a + b.solIn, 0);
  const series = [...burns].sort((a, b) => a.at - b.at);
  let cum = 0;
  const cumulative = series.map((b) => ({ t: b.at, v: (cum += b.virusBurned) }));
  const hostTicker = (ca: string) => snap.hosts.find((h) => h.ca === ca)?.ticker ?? ca.slice(0, 4);
  return (
    <div className="mx-auto max-w-[1400px] px-4 pt-8">
      <div className="eyebrow">hub ritual · hourly · on the hour · UTC</div>
      <h1 className="mt-2 text-4xl">{theme.hubRitual}s</h1>
      <p className="mt-2 max-w-2xl text-[12px] text-muted">20% of all {theme.verbs.extract}ion each hour buys {theme.hubToken} on Jupiter and {theme.hubRitual}s 100% of it. No distribution. The metaphor is destruction.</p>
      <div className="mount mt-6 grid grid-cols-2 md:grid-cols-5">
        <div className="flex flex-col gap-1 px-4 py-3"><span className="label">next {theme.hubRitualLabel}</span><span className="num text-xl"><Countdown /></span></div>
        <div className="rule-v flex flex-col gap-1 px-4 py-3"><span className="label">queued this hour</span><span className="num text-xl"><Readout value={snap.pendingBurnSol} format={(v) => fmtSol(v, 4)} /> SOL</span></div>
        <div className="rule-v flex flex-col gap-1 px-4 py-3"><span className="label">{theme.hubToken} {theme.hubRitual}ed (ritual)</span><span className="num text-xl text-viral"><Readout value={totalBurned} format={fmtCompact} /></span></div>
        <div className="rule-v flex flex-col gap-1 px-4 py-3"><span className="label">{theme.hubToken} {theme.hubRitual}ed (all)</span><span className="num text-xl text-viral"><Readout value={snap.stats.virusBurned} format={fmtCompact} /></span></div>
        <div className="rule-v flex flex-col gap-1 px-4 py-3"><span className="label">{theme.hubToken} CA</span><span className="num text-sm"><Ca ca={HUB_CA} n={6} /></span></div>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title={`${theme.hubToken} ${theme.hubRitual}ed per ritual`}><div className="p-2"><BarChartBox points={series.map((b) => ({ t: b.at, v: b.virusBurned }))} height={220} /></div></Panel>
        <Panel title={`cumulative ${theme.hubRitual}ed`}><div className="p-2"><LineChartBox points={cumulative} color={theme.palette.viral} height={220} /></div></Panel>
      </div>
      <Panel title={`every ${theme.hubRitual} · ${burns.length} · ${fmtSol(totalSol)} SOL in`} className="mt-6">
        <div className="grid grid-cols-5 gap-2 border-b border-border px-4 py-2 label">
          <span>time (UTC)</span><span className="text-right">SOL in</span><span className="text-right">{theme.hubToken} bought</span><span className="text-right">{theme.hubRitual}ed</span><span className="text-right">tx</span>
        </div>
        {burns.map((b) => (
          <div key={b.id} className="grid grid-cols-5 gap-2 border-b border-border px-4 py-2 num text-[12px]">
            <span className="text-muted">{utc(b.at)}</span>
            <span className="text-right">{fmtSol(b.solIn)}</span>
            <span className="text-right">{b.virusBought.toLocaleString()}</span>
            <span className="text-right text-viral">{b.virusBurned.toLocaleString()} · 100%</span>
            <span className="text-right"><Tx sig={b.txSig} /></span>
          </div>
        ))}
      </Panel>
      <Panel title={`immunity purchases · ${snap.immunityPurchases.length} · ${theme.hubToken} ${theme.hubRitual}ed on purchase`} className="mt-6">
        {snap.immunityPurchases.length === 0 && <Empty>none yet</Empty>}
        {snap.immunityPurchases.slice(0, 50).map((p) => (
          <div key={p.id} className="grid grid-cols-4 gap-2 border-b border-border px-4 py-2 num text-[12px]">
            <span className="text-muted">{utc(p.at)}</span>
            <HostLink ca={p.hostCa}>${hostTicker(p.hostCa)}</HostLink>
            <span className="text-right text-viral">{p.virusPaid.toLocaleString()} {theme.hubToken}</span>
            <span className="text-right"><Tx sig={p.txSig} /></span>
          </div>
        ))}
      </Panel>
    </div>
  );
}
