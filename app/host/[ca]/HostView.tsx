'use client';
import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import theme from '@/themes';
import { useSim } from '@/store/useSim';
import Specimen from '@/components/SpecimenClient';
import TransmissionLog from '@/components/TransmissionLog';
import { Panel, StatePill, Ca, Row, ImmunityBadge, Empty, StrainLink, Readout } from '@/components/ui';
import { LineChartBox } from '@/components/Charts';
import { fmtUsd, fmtInt, fmtSol, timeAgo, pumpUrl, utc, fmtPct } from '@/lib/format';
import { immunityPrice } from '@/lib/rules';

const WalletButton = dynamic(() => import('@solana/wallet-adapter-react-ui').then((m) => m.WalletMultiButton), { ssr: false });

export default function HostView({ ca }: { ca: string }) {
  const snap = useSim((s) => s.snap);
  const sim = useSim((s) => s.sim);
  const wallet = useSim((s) => s.wallet);
  const [buying, setBuying] = useState<'idle' | 'signing' | 'done'>('idle');
  const h = snap?.hosts.find((x) => x.ca === ca);
  const strains = useMemo(() => (snap && h ? h.strains.map((c) => snap.strains.find((s) => s.ca === c)).filter(Boolean) : []) as NonNullable<typeof snap>['strains'], [snap, h]);
  const lineageName = (id: string) => snap?.lineages.find((l) => l.id === id)?.name ?? id.slice(0, 6);
  if (!snap) return <Empty>loading specimen</Empty>;
  if (!h) return <Empty>no {theme.target} at this address</Empty>;
  const price = immunityPrice(h.mcap);
  const takenBy = strains.map((s) => ({ s, taken: s.hostCa === h.ca ? s.totalExtracted : 0 }));
  const history = snap.events.filter((e) => e.hostCa === h.ca && (e.kind === 'lyse' || e.kind === 'immunize'));
  const buy = async () => {
    if (!sim || !wallet) return;
    setBuying('signing');
    // Phase 2: build a burn ix for `price` $VIRUS from the wallet, sign, send, then record on-chain. Mocked here.
    await new Promise((r) => setTimeout(r, 900));
    sim.buyImmunity(h.ca, wallet);
    setBuying('done');
    setTimeout(() => setBuying('idle'), 2500);
  };
  const immuneWindow = h.immuneUntil && h.immuneUntil > snap.now;
  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 pt-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="relative h-[420px] overflow-hidden lg:col-span-1">
          <Specimen host={h} />
          <div className="pointer-events-none absolute left-3 top-3 label">{theme.target} · specimen</div>
        </Panel>
        <div className="space-y-6 lg:col-span-2">
          <Panel>
            <div className="flex flex-wrap items-start gap-4 p-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={h.image} alt="" className="h-14 w-14 rounded-full border-2 border-border" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl">{h.name}</h1>
                  <span className="num text-muted">${h.ticker}</span>
                  <StatePill state={h.state} label={theme.states[h.state]} />
                  <span className="pill">#{h.narrativeTag}</span>
                </div>
                <div className="mt-1 flex items-center gap-3">
                  <Ca ca={h.ca} n={6} />
                  <a href={pumpUrl(h.ca)} target="_blank" rel="noreferrer" className="label hover:text-text">
                    trade on pump.fun ↗
                  </a>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {h.immuneTo.map((l) => (
                    <ImmunityBadge key={l} name={lineageName(l)} permanent />
                  ))}
                  {immuneWindow && <ImmunityBadge name={`24h window · ${timeAgo(snap.now - (h.immuneUntil! - snap.now))} left`} permanent={false} />}
                  {h.immuneTo.length === 0 && !immuneWindow && <span className="text-[11px] text-muted">no immunity</span>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-right">
                <div><div className="label">mcap</div><div className="num text-lg"><Readout value={h.mcap} format={fmtUsd} /></div></div>
                <div><div className="label">holders</div><div className="num text-lg"><Readout value={h.holders} format={fmtInt} /></div></div>
                <div><div className="label">taken from it</div><div className="num text-lg text-viral"><Readout value={h.totalExtracted} format={(v) => fmtSol(v, 4)} /> SOL</div></div>
                <div><div className="label">lyses survived</div><div className="num text-lg text-immune">{h.lysisSurvived}</div></div>
              </div>
            </div>
            {/* plain statement */}
            <div className="border-t border-border px-5 py-3 text-[12px]">
              {h.totalExtracted > 0 ? (
                <>
                  <span className="text-viral">{fmtSol(h.totalExtracted, 4)} SOL</span> has been taken from this {theme.target}
                  {takenBy.length > 0 ? ` by ${takenBy.length} attached ${theme.unit}${takenBy.length > 1 ? 's' : ''}` : ''}
                  {h.lysisSurvived > 0 ? ` and it has survived ${h.lysisSurvived} lysis event${h.lysisSurvived > 1 ? 's' : ''}` : ''}. Visible from the first SOL.
                </>
              ) : (
                <>Nothing has been taken from this {theme.target}. That you can see.</>
              )}
            </div>
          </Panel>
          <Panel title={`infection panel · ${strains.length} attached ${theme.unit}s`}>
            {strains.length === 0 && <Empty>no visible {theme.unit}s attached</Empty>}
            {strains.map((s) => (
              <div key={s.ca} className="grid grid-cols-2 items-center gap-2 border-b border-border px-4 py-2 md:grid-cols-6">
                <StrainLink ca={s.ca}>
                  <span className="text-text">{s.name}</span>
                </StrainLink>
                <span className="num text-[11px] text-muted">{lineageName(s.lineageId)} · gen {s.generation}</span>
                <span className="num">{s.state === 'integrated' ? `3% share` : fmtPct(s.params.extractionRate)} <span className="label">rate</span></span>
                <span className="num text-viral">{fmtSol(s.totalExtracted)} SOL <span className="label">taken</span></span>
                <span className="pill w-fit">{s.path}</span>
                <span className="num text-[11px] text-muted">attached {s.attachedAt ? timeAgo(s.attachedAt, snap.now) + ' ago' : '—'}</span>
              </div>
            ))}
          </Panel>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title={`${theme.verbs.extract}ion over time · SOL cumulative`} className="lg:col-span-2">
          <div className="p-2">
            <LineChartBox points={h.history} height={240} />
          </div>
        </Panel>
        <Panel title={`buy immunity with ${theme.hubToken}`}>
          <Row k="window" v="24h" />
          <Row k="price (scales with mcap)" v={`${price.toLocaleString()} ${theme.hubToken}`} />
          <Row k="what happens" v={`${theme.hubToken} burned`} />
          <Row k="status" v={immuneWindow ? `immune until ${utc(h.immuneUntil!)}` : 'open to infection'} />
          <div className="p-4">
            {wallet ? (
              <button className="btn btn-cyan w-full" disabled={buying !== 'idle' || h.state === 'dead'} onClick={buy}>
                {buying === 'signing' ? 'signing…' : buying === 'done' ? 'immunity active ✓' : `burn ${price.toLocaleString()} ${theme.hubToken} → immune 24h`}
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <span className="text-[11px] text-muted">connect a wallet to buy immunity</span>
                <WalletButton />
              </div>
            )}
            <p className="mt-3 text-[11px] text-muted">While the window is open, no {theme.unit} can attach. Already attached {theme.unit}s keep extracting; this does not evict them. Permanent lineage immunity only comes from surviving a lysis.</p>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="lysis survival record">
          {history.length === 0 && <Empty>no lysis events recorded</Empty>}
          {history.map((e) => (
            <div key={e.id} className="flex items-center justify-between border-b border-border px-4 py-2 text-[11.5px]">
              <span style={{ color: e.kind === 'lyse' ? 'var(--c-infection)' : 'var(--c-immune)' }}>{e.kind}</span>
              <span className="min-w-0 flex-1 truncate px-3">{e.text}</span>
              <span className="num text-muted">{utc(e.at)}</span>
            </div>
          ))}
        </Panel>
        <Panel title={`events on this ${theme.target}`} className="lg:col-span-2">
          <TransmissionLog filterHost={h.ca} height={300} />
        </Panel>
      </div>
    </div>
  );
}
