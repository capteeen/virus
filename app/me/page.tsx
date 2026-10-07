'use client';
import dynamic from 'next/dynamic';
import theme from '@/themes';
import { useSim } from '@/store/useSim';
import { Panel, Empty, Tx, HostLink } from '@/components/ui';
import StrainRow from '@/components/StrainList';
import HostRow from '@/components/HostList';
import { holderOverlap } from '@/lib/rules';
import { fmtSol, utc } from '@/lib/format';

const WalletButton = dynamic(() => import('@solana/wallet-adapter-react-ui').then((m) => m.WalletMultiButton), { ssr: false });

export default function MePage() {
  const snap = useSim((s) => s.snap);
  const wallet = useSim((s) => s.wallet);
  if (!snap) return <Empty>loading</Empty>;
  if (!wallet)
    return (
      <div className="mx-auto max-w-[1400px] px-4 pt-8">
        <div className="eyebrow">carrier</div>
        <h1 className="mt-2 text-4xl">me</h1>
        <div className="mount mt-6 flex flex-col items-start gap-3 p-6">
          <p className="text-[12px] text-muted">Connect a wallet to see your {theme.unit}s, the {theme.target}s you hold that are {theme.states.infected}, your immunity purchases and anything claimable from expired children.</p>
          <WalletButton />
        </div>
      </div>
    );
  const mine = snap.strains.filter((s) => s.ownerWallet === wallet);
  // Phase 2: DAS getAssetsByOwner → hosts you hold. Mock: hosts whose holder-overlap with your wallet is high.
  const held = snap.hosts.filter((h) => holderOverlap(wallet, h) >= 30).filter((h) => h.strains.length > 0 || h.lysisSurvived > 0);
  const purchases = snap.immunityPurchases.filter((p) => p.wallet === wallet);
  const expiredChildren = mine.filter((s) => s.state === 'expired' && s.generation > 0);
  const lineageName = (id: string) => snap.lineages.find((l) => l.id === id)?.name;
  return (
    <div className="mx-auto max-w-[1400px] px-4 pt-8">
      <div className="eyebrow">carrier · {wallet.slice(0, 6)}…{wallet.slice(-4)}</div>
      <h1 className="mt-2 text-4xl">me</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title={`your ${theme.unit}s · ${mine.length} · dormant ones visible only to you`}>
          {mine.length === 0 && <Empty>none yet · <a href="/infect" className="text-specimen">{theme.verbs.attach} a {theme.target}</a></Empty>}
          {mine.map((s) => <StrainRow key={s.ca} s={s} lineageName={lineageName(s.lineageId)} />)}
        </Panel>
        <Panel title={`your ${theme.target}s · coins you hold that are ${theme.states.infected} · ${held.length}`}>
          {held.length === 0 && <Empty>none of your holdings are {theme.states.infected}. that you can see.</Empty>}
          {held.map((h) => <HostRow key={h.ca} h={h} />)}
        </Panel>
        <Panel title={`your immunity purchases · ${purchases.length}`}>
          {purchases.length === 0 && <Empty>none</Empty>}
          {purchases.map((p) => (
            <div key={p.id} className="grid grid-cols-4 gap-2 border-b border-border px-4 py-2 num text-[12px]">
              <span className="text-muted">{utc(p.at)}</span>
              <HostLink ca={p.hostCa}>${snap.hosts.find((h) => h.ca === p.hostCa)?.ticker}</HostLink>
              <span className="text-right text-viral">{p.virusPaid.toLocaleString()} {theme.hubToken}</span>
              <span className="text-right"><Tx sig={p.txSig} /></span>
            </div>
          ))}
        </Panel>
        <Panel title={`claimable from expired children · ${expiredChildren.length}`}>
          {expiredChildren.length === 0 && <Empty>nothing to claim</Empty>}
          {expiredChildren.map((s) => (
            <div key={s.ca} className="flex items-center justify-between border-b border-border px-4 py-2 text-[12px]">
              <span>{s.name} · gen {s.generation}</span>
              <span className="num text-muted">vault returned pro-rata · you own 25% · {fmtSol(0)} SOL pending</span>
              <button className="btn" disabled>claim · phase 2</button>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
}
