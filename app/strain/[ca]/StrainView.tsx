'use client';
import { useMemo } from 'react';
import theme from '@/themes';
import { useSim } from '@/store/useSim';
import Specimen from '@/components/SpecimenClient';
import TransmissionLog from '@/components/TransmissionLog';
import LineageTree from '@/components/LineageTree';
import { Panel, StatePill, Ca, Row, Empty, HostLink, StrainLink, Readout } from '@/components/ui';
import { fmtSol, fmtPct, timeAgo, pumpUrl, utc } from '@/lib/format';
import { virulenceEffect, RULES } from '@/lib/rules';
import { describeTrigger } from '@/lib/sim';
import StrainRow from '@/components/StrainList';

export default function StrainView({ ca }: { ca: string }) {
  const snap = useSim((s) => s.snap);
  const wallet = useSim((s) => s.wallet);
  const s = snap?.strains.find((x) => x.ca === ca);
  const lineage = snap?.lineages.find((l) => l.id === s?.lineageId);
  const members = useMemo(() => (snap && s ? snap.strains.filter((x) => x.lineageId === s.lineageId) : []), [snap, s]);
  if (!snap) return <Empty>loading specimen</Empty>;
  if (!s) return <Empty>no {theme.unit} at this address</Empty>;
  const isOwner = wallet && s.ownerWallet === wallet;
  // dormant strains are invisible to everyone except their launcher
  if (s.dormant && s.state === 'dormant' && !isOwner) return <Empty>no {theme.unit} at this address</Empty>;
  const parent = s.parentCa ? snap.strains.find((x) => x.ca === s.parentCa) : undefined;
  const host = s.hostCa ? snap.hosts.find((h) => h.ca === s.hostCa) : undefined;
  const children = s.children.map((c) => snap.strains.find((x) => x.ca === c)).filter(Boolean) as typeof snap.strains;
  const drift = (k: keyof typeof s.params) => (parent ? ((s.params[k] - parent.params[k]) / parent.params[k]) * 100 : 0);
  const driftStr = (k: keyof typeof s.params) => (parent ? `${drift(k) >= 0 ? '+' : ''}${drift(k).toFixed(1)}% vs parent` : 'patient zero');
  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 pt-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="relative h-[420px] overflow-hidden">
          <Specimen strain={s} />
          <div className="pointer-events-none absolute left-3 top-3 label">{theme.unit} · particle</div>
        </Panel>
        <div className="space-y-6 lg:col-span-2">
          <Panel>
            <div className="flex flex-wrap items-start gap-4 p-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.image} alt="" className="h-14 w-14 border-2 border-border" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl">{s.name}</h1>
                  <span className="num text-muted">${s.ticker}</span>
                  <StatePill state={s.state} label={theme.states[s.state as keyof typeof theme.states] ?? s.state} />
                  <span className="pill" style={{ borderColor: 'var(--c-viral)', color: 'var(--c-viral)' }}>{s.path}</span>
                  <span className="pill num">generation {s.generation}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <Ca ca={s.ca} n={6} />
                  <span className="label">wallet</span>
                  <Ca ca={s.wallet} />
                  <a href={pumpUrl(s.ca)} target="_blank" rel="noreferrer" className="label hover:text-text">pump.fun ↗</a>
                </div>
                <div className="mt-2 text-[12px] text-muted">
                  {theme.lineage} <StrainLink ca={s.lineageId}><span className="text-text">{lineage?.name}</span></StrainLink>
                  {parent && <> · parent <StrainLink ca={parent.ca}><span className="text-text">{parent.name}</span></StrainLink></>}
                  {host && <> · {s.state === 'integrated' ? 'integrated into' : s.state === 'lysed' ? 'lysed' : 'attached to'} <HostLink ca={host.ca}><span className="text-text">${host.ticker}</span></HostLink></>}
                  {' · '}born {utc(s.bornAt)}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-right">
                <div><div className="label">virulence</div><div className="num text-2xl" style={{ color: s.virulence > 85 ? 'var(--c-infection)' : s.virulence > 60 ? 'var(--c-viral)' : 'var(--c-specimen)' }}><Readout value={s.virulence} format={(v) => v.toFixed(1)} /></div></div>
                <div><div className="label">total extracted</div><div className="num text-2xl text-viral"><Readout value={s.totalExtracted} format={(v) => fmtSol(v, 4)} /></div></div>
                <div><div className="label">hosts infected / killed</div><div className="num text-lg">{s.hostsInfected} / {s.hostsKilled}</div></div>
                <div><div className="label">vault</div><div className="num text-lg">{fmtSol(s.vault)} SOL</div></div>
              </div>
            </div>
            <div className="border-t border-border px-5 py-3 text-[12px]">
              <span className="label mr-2">virulence effect</span>
              {virulenceEffect(s.virulence)} Score = (SOL extracted ÷ hosts) × (hosts killed + 1), normalized, −{RULES.virulenceDecayPerDay}/day idle.
              {s.path === 'lysogeny' && ' Lysogenic strains are pinned at 0 and keep full host access.'}
            </div>
          </Panel>
          <div className="grid gap-6 md:grid-cols-2">
            <Panel title="parameters · drift vs parent">
              <Row k="extractionRate" v={<>{fmtPct(s.params.extractionRate)} <span className="text-muted">{driftStr('extractionRate')}</span></>} />
              <Row k="lysisThreshold" v={<>{fmtSol(s.params.lysisThreshold)} SOL <span className="text-muted">{driftStr('lysisThreshold')}</span></>} />
              <Row k="compatibilityRange" v={<>{s.params.compatibilityRange} <span className="text-muted">{driftStr('compatibilityRange')}</span></>} />
              <Row k="reaches hosts scoring" v={`≥ ${100 - s.params.compatibilityRange}`} />
              <Row k="lysis progress" v={s.path === 'lysis' && s.state === 'active' ? `${Math.min(100, Math.round((s.vault / s.params.lysisThreshold) * 100))}%` : '—'} />
            </Panel>
            <Panel title="dormancy">
              {s.trigger ? (
                <>
                  <Row k="latent" v={s.state === 'dormant' ? 'yes · invisible on host page' : 'was dormant · activated'} />
                  <Row k="trigger" v={describeTrigger(s.trigger)} />
                  {isOwner && s.state === 'dormant' && <div className="px-4 py-3 text-[11px] text-dormant">Only you can see this strain. It appears on ${host?.ticker}&apos;s page with a red flash the moment the trigger fires.</div>}
                </>
              ) : (
                <Row k="latent" v="no · active from launch" />
              )}
              <Row k="launcher" v={<Ca ca={s.ownerWallet} />} />
              <Row k="currently attached" v={host && (s.state === 'active' || s.state === 'integrated' || s.state === 'dormant') ? <HostLink ca={host.ca}>${host.ticker}</HostLink> : 'none'} />
              <Row k="last active" v={`${timeAgo(s.lastActiveAt, snap.now)} ago`} />
            </Panel>
          </div>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title={`${theme.lineage} tree · ${lineage?.name} · back to patient zero`} className="lg:col-span-2" right={<span className="num text-[11px] text-muted">{members.filter((m) => !m.dormant).length} nodes · click to open</span>}>
          <LineageTree strains={members} currentCa={s.ca} height={360} revealDormant={!!isOwner} />
        </Panel>
        <Panel title={`children · ${children.length}`}>
          {children.length === 0 && <Empty>{s.path === 'lysogeny' ? 'lysogenic strains do not spawn' : s.state === 'lysed' ? 'none' : 'none yet · spawns on lysis'}</Empty>}
          {children.map((c) => (
            <StrainRow key={c.ca} s={c} />
          ))}
        </Panel>
      </div>
      <Panel title="event log · with tx links">
        <TransmissionLog filterStrain={s.ca} height={320} />
      </Panel>
    </div>
  );
}
