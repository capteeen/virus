'use client';
import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import theme from '@/themes';
import { useSim } from '@/store/useSim';
import { compatibility, RULES, lysisThresholdFor } from '@/lib/rules';
import type { DormancyTrigger, Path } from '@/lib/types';
import { fmtUsd, fmtInt, fmtSol } from '@/lib/format';
import { Panel, Row, ImmunityBadge, StatePill, Empty } from '@/components/ui';
import { svgAvatar } from '@/lib/names';

const WalletButton = dynamic(() => import('@solana/wallet-adapter-react-ui').then((m) => m.WalletMultiButton), { ssr: false });

type DormancyMode = 'off' | 'mcap' | 'devsell' | 'timestamp';

export default function InfectPage() {
  const snap = useSim((s) => s.snap);
  const sim = useSim((s) => s.sim);
  const wallet = useSim((s) => s.wallet);
  const router = useRouter();
  const [hostCa, setHostCa] = useState<string | null>(null);
  const [path, setPath] = useState<Path | null>(null);
  const [q, setQ] = useState('');
  const [tag, setTag] = useState<string>('');
  const [name, setName] = useState('');
  const [ticker, setTicker] = useState('');
  const [desc, setDesc] = useState('');
  const [image, setImage] = useState<string | undefined>();
  const [dormancy, setDormancy] = useState<DormancyMode>('off');
  const [trigValue, setTrigValue] = useState('');
  const [devBuy, setDevBuy] = useState('');
  const [status, setStatus] = useState<'idle' | 'signing' | 'launching' | 'done'>('idle');

  // compatibility is computed against the connected wallet; without one we show a preview wallet so the list is browsable
  const previewWallet = wallet ?? 'PREVIEW11111111111111111111111111111111111111';
  const launcherTag = tag || snap?.hosts.find((h) => h.ca === hostCa)?.narrativeTag || 'dog';

  const candidates = useMemo(() => {
    if (!snap) return [];
    return snap.hosts
      .map((h) => ({ h, c: compatibility(previewWallet, launcherTag, h, undefined, 0, RULES.defaultCompatibilityRange) }))
      .filter(({ h }) => !q || h.ticker.toLowerCase().includes(q.toLowerCase()) || h.ca.toLowerCase().includes(q.toLowerCase()) || h.name.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => Number(b.c.eligible) - Number(a.c.eligible) || b.c.score - a.c.score);
  }, [snap, previewWallet, launcherTag, q]);
  const host = snap?.hosts.find((h) => h.ca === hostCa);
  // lineages this wallet already launched: a host immune to any of them gets a warning
  const myLineages = new Set((snap?.lineages ?? []).filter((l) => wallet && l.ownerWallet === wallet).map((l) => l.id));
  const lineageName = (id: string) => snap?.lineages.find((l) => l.id === id)?.name ?? id.slice(0, 6);

  const dormancyFee = dormancy === 'off' ? 0 : RULES.dormancyFee;
  const dev = Math.max(0, parseFloat(devBuy) || 0);
  const total = RULES.launchCost + RULES.strainReserve + dormancyFee + dev;
  const trigger: DormancyTrigger | undefined =
    dormancy === 'off'
      ? undefined
      : dormancy === 'mcap'
        ? { kind: 'mcap', value: parseFloat(trigValue) || (host ? host.mcap * 1.5 : 50000) }
        : dormancy === 'devsell'
          ? { kind: 'devsell', value: Math.min(1, (parseFloat(trigValue) || 20) / 100) }
          : { kind: 'timestamp', value: trigValue ? new Date(trigValue).getTime() : Date.now() + 3600_000 };
  const canLaunch = !!wallet && !!host && !!path && name.trim().length > 1 && ticker.trim().length > 0 && status === 'idle';

  const launch = async () => {
    if (!sim || !wallet || !host || !path) return;
    setStatus('signing');
    // Phase 2: transfer `total` SOL to the strain keypair's wallet, which launches the coin via PumpPortal as creator.
    await new Promise((r) => setTimeout(r, 900));
    setStatus('launching');
    await new Promise((r) => setTimeout(r, 1200));
    const s = sim.launchStrain({ name, ticker, image, hostCa: host.ca, path, trigger, devBuy: dev, ownerWallet: wallet });
    setStatus('done');
    if (s) router.push(`/strain/${s.ca}`);
  };

  const onImage = (f?: File) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setImage(String(r.result));
    r.readAsDataURL(f);
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 pt-8">
      <div className="eyebrow">launch flow</div>
      <h1 className="mt-2 text-4xl">{theme.verbs.attach} a {theme.target}</h1>
      <p className="mt-2 max-w-2xl text-[12px] text-muted">A {theme.unit} cannot launch alone. Three steps, one irreversible choice.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* STEP 1 */}
          <Panel title={`01 · pick a ${theme.target}`} right={host ? <span className="num text-specimen">${host.ticker} selected</span> : <span className="label">required</span>}>
            <div className="flex flex-wrap gap-3 border-b border-border p-3">
              <input className="input md:flex-1" placeholder="search by ticker, name or CA" value={q} onChange={(e) => setQ(e.target.value)} />
              <select className="input md:w-48" value={tag} onChange={(e) => setTag(e.target.value)}>
                <option value="">your narrative tag · auto</option>
                {['dog', 'cat', 'frog', 'ai', 'politics', 'food', 'space', 'anime', 'music', 'celeb'].map((t) => (
                  <option key={t} value={t}>#{t}</option>
                ))}
              </select>
            </div>
            <div className="border-b border-border px-4 py-2 text-[11px] text-muted">
              Compatibility = holder overlap between {wallet ? 'your wallet' : 'a preview wallet (connect to see yours)'} and the {theme.target}&apos;s holders (≥ {RULES.minOverlap}% required) or a shared narrative tag. Score 0–100.
            </div>
            <div className="scroll-thin max-h-[420px] overflow-auto">
              {candidates.length === 0 && <Empty>loading {theme.target}s</Empty>}
              {candidates.slice(0, 120).map(({ h, c }) => (
                <button
                  key={h.ca}
                  disabled={!c.eligible}
                  onClick={() => setHostCa(h.ca)}
                  className={`bio flex w-full items-center gap-3 border-b border-border px-4 py-2 text-left ${hostCa === h.ca ? 'bg-[color-mix(in_srgb,var(--c-specimen)_10%,transparent)]' : 'hover:bg-void'} ${!c.eligible ? 'opacity-40' : ''}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={h.image} alt="" className="h-7 w-7 rounded-full border border-border" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-text">${h.ticker}</span>
                      <StatePill state={h.state} label={theme.states[h.state]} />
                      <span className="pill">#{h.narrativeTag}</span>
                      {h.immuneTo.slice(0, 3).map((l) => (
                        <ImmunityBadge key={l} name={lineageName(l)} permanent />
                      ))}
                      {h.immuneUntil && <ImmunityBadge name="24h window" permanent={false} />}
                      {h.immuneTo.some((l) => myLineages.has(l)) && <span className="pill" style={{ borderColor: 'var(--c-infection)', color: 'var(--c-infection)' }}>immune to your {theme.lineage}</span>}
                    </div>
                    <div className="num text-[11px] text-muted">
                      {fmtUsd(h.mcap)} · {fmtInt(h.holders)} holders · overlap {c.overlap}% {c.tagMatch ? '· tag match' : ''}
                      {!c.eligible && <span className="text-infection"> · {c.reasons[0]}</span>}
                    </div>
                  </div>
                  <div className="num text-right">
                    <div className={`text-lg ${c.eligible ? 'text-specimen' : 'text-dead'}`}>{c.score}</div>
                    <div className="label">compat</div>
                  </div>
                </button>
              ))}
            </div>
          </Panel>

          {/* STEP 2 */}
          <Panel title="02 · choose your nature" right={<span className="label text-infection">this cannot be changed</span>}>
            <div className="grid gap-px bg-border md:grid-cols-2">
              {(['lysis', 'lysogeny'] as Path[]).map((p) => {
                const c = p === 'lysis' ? theme.copy.paths.burst : theme.copy.paths.integrate;
                const sel = path === p;
                return (
                  <button key={p} onClick={() => setPath(p)} className={`bio bg-panel p-6 text-left ${sel ? 'outline outline-2 -outline-offset-2' : ''}`} style={{ outlineColor: p === 'lysis' ? 'var(--c-infection)' : 'var(--c-viral)' }}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl" style={{ color: p === 'lysis' ? 'var(--c-infection)' : 'var(--c-viral)' }}>{c.title}</h3>
                      <span className="pill">{p === 'lysis' ? `${theme.verbs.extract} · ${theme.verbs.burst} · spawn` : `${theme.verbs.integrate} forever`}</span>
                    </div>
                    <div className="mt-4 label">what you get</div>
                    <p className="mt-1 text-[12px] leading-relaxed">{c.launcher}</p>
                    <div className="mt-4 label" style={{ color: p === 'lysis' ? 'var(--c-infection)' : 'var(--c-specimen)' }}>what happens to the {theme.target}</div>
                    <p className="mt-1 text-[12px] leading-relaxed">{c.target}</p>
                    <div className="mt-4 num text-[11px] text-muted">
                      {p === 'lysis'
                        ? `threshold ${fmtSol(lysisThresholdFor(RULES.launchCost))} SOL · rate ${RULES.defaultExtractionRate * 100}% · launcher ${RULES.lysisLauncherCut * 100}% of vault · ${RULES.childOwnership * 100}% of each child`
                        : `${RULES.lysogenyShare * 100}% of ${theme.target} fees forever · ${RULES.lysogenyLauncherSplit * 100}% to you · virulence 0`}
                    </div>
                  </button>
                );
              })}
            </div>
          </Panel>

          {/* STEP 3 */}
          <Panel title="03 · details">
            <div className="grid gap-4 p-4 md:grid-cols-2">
              <label className="flex flex-col gap-1"><span className="label">name</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. RHABDO" maxLength={32} /></label>
              <label className="flex flex-col gap-1"><span className="label">ticker</span><input className="input" value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} placeholder="RHAB" maxLength={10} /></label>
              <label className="flex flex-col gap-1 md:col-span-2"><span className="label">description</span><textarea className="input" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="what this strain is for" /></label>
              <label className="flex flex-col gap-1">
                <span className="label">image</span>
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image ?? svgAvatar(1, ticker || 'NEW', 335, 'strain')} alt="" className="h-10 w-10 border border-border" />
                  <input type="file" accept="image/*" className="text-[11px] text-muted" onChange={(e) => onImage(e.target.files?.[0])} />
                </div>
              </label>
              <label className="flex flex-col gap-1"><span className="label">dev buy (SOL, optional)</span><input className="input" inputMode="decimal" value={devBuy} onChange={(e) => setDevBuy(e.target.value)} placeholder="0" /></label>
              <div className="flex flex-col gap-2 md:col-span-2">
                <span className="label">dormancy · +{RULES.dormancyFee} SOL · invisible and extracting nothing until the trigger</span>
                <div className="flex flex-wrap gap-2">
                  {(['off', 'mcap', 'devsell', 'timestamp'] as DormancyMode[]).map((m) => (
                    <button key={m} onClick={() => setDormancy(m)} className={`btn ${dormancy === m ? 'border-dormant text-dormant' : ''}`}>
                      {m === 'off' ? 'off' : m === 'mcap' ? `${theme.target} mcap ≥ X` : m === 'devsell' ? `dev sells ≥ Y%` : 'timestamp'}
                    </button>
                  ))}
                </div>
                {dormancy !== 'off' && (
                  <input className="input md:w-72" type={dormancy === 'timestamp' ? 'datetime-local' : 'text'} inputMode="decimal" value={trigValue} onChange={(e) => setTrigValue(e.target.value)} placeholder={dormancy === 'mcap' ? `USD · e.g. ${host ? Math.round(host.mcap * 1.5) : 50000}` : dormancy === 'devsell' ? '% of supply · e.g. 20' : ''} />
                )}
              </div>
            </div>
          </Panel>
        </div>

        {/* BREAKDOWN */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <Panel title="breakdown">
            <Row k="launch cost (now)" v={`${fmtSol(RULES.launchCost, 2)} SOL`} />
            <Row k={`${theme.unit} reserve`} v={`${fmtSol(RULES.strainReserve, 2)} SOL`} />
            {dormancyFee > 0 && <Row k="dormancy fee" v={`${fmtSol(dormancyFee, 2)} SOL`} />}
            <Row k="dev buy" v={`${fmtSol(dev, 2)} SOL`} />
            <Row k="you pay" v={`${fmtSol(total, 2)} SOL`} bold />
            <div className="px-4 py-3 text-[11px] leading-relaxed text-muted">
              Paid to your {theme.unit}&apos;s own wallet, which launches the coin as creator. 80% of everything it {theme.verbs.extract}s stays with the {theme.unit}. 20% buys {theme.hubToken} every hour and {theme.hubRitual}s it.
            </div>
            <div className="border-t border-border px-4 py-3 text-[11px]">
              <div className="flex justify-between"><span className="label">{theme.target}</span><span>{host ? `$${host.ticker}` : <span className="text-infection">none</span>}</span></div>
              <div className="flex justify-between"><span className="label">nature</span><span>{path ?? <span className="text-infection">none</span>}</span></div>
              <div className="flex justify-between"><span className="label">dormancy</span><span>{dormancy}</span></div>
              {path === 'lysis' && host && <div className="mt-2 text-infection">On lysis ${host.ticker} takes the full sell pressure of your vault and becomes immune to your {theme.lineage} forever.</div>}
              {path === 'lysogeny' && host && <div className="mt-2 text-specimen">${host.ticker}&apos;s {fmtInt(host.holders)} holders receive your {theme.unit} pro-rata. Extraction never starts.</div>}
            </div>
            <div className="flex flex-col gap-2 p-4">
              {!wallet && <WalletButton />}
              <button className="btn btn-primary w-full" disabled={!canLaunch} onClick={launch}>
                {status === 'signing' ? 'sign in wallet…' : status === 'launching' ? 'launching on pump.fun…' : status === 'done' ? 'launched ✓' : `${theme.verbs.attach}`}
              </button>
              {!wallet && <span className="text-center text-[11px] text-muted">connect a wallet to launch</span>}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
