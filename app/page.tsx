'use client';
import Link from 'next/link';
import theme from '@/themes';
import Field from '@/components/FieldClient';
import StatsStrip from '@/components/StatsStrip';
import TransmissionLog from '@/components/TransmissionLog';
import Countdown from '@/components/Countdown';
import LabHum from '@/components/LabHum';
import { Panel, Progress, Empty } from '@/components/ui';
import { useSim } from '@/store/useSim';
import { fmtSol } from '@/lib/format';
import HostRow from '@/components/HostList';

export default function Home() {
  const snap = useSim((s) => s.snap);
  const lineages = (snap?.lineages ?? []).filter((l) => !l.extinct).sort((a, b) => b.hostsInfected - a.hostsInfected).slice(0, 5);
  const immune = (snap?.hosts ?? []).filter((h) => h.immuneTo.length > 0).sort((a, b) => b.lysisSurvived - a.lysisSurvived).slice(0, 5);
  const extinct = (snap?.lineages ?? []).filter((l) => l.extinct);
  return (
    <>
      <LabHum />
      {/* HERO — THE FIELD, full-bleed, already moving */}
      <section className="relative h-[calc(100vh-56px)] min-h-[560px] w-full overflow-hidden">
        <div className="absolute inset-0">
          <Field mode="hero" />
        </div>
        <div className="vignette pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute inset-0 flex items-end px-4 pb-10 md:items-center md:pb-0">
          <div className="glass pointer-events-auto max-w-xl p-6 md:p-8">
            <div className="eyebrow">{theme.copy.eyebrow}</div>
            <h1 className="mt-3 font-head text-6xl leading-none tracking-tight md:text-8xl">{theme.name}</h1>
            <p className="mt-4 max-w-md text-[13px] leading-relaxed text-text">{theme.copy.tagline}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/infect" className="btn btn-primary">
                {theme.verbs.attach} a {theme.target}
              </Link>
              <Link href="/how" className="btn">
                How it works
              </Link>
            </div>
            <div className="mt-6 flex items-center gap-3 border-t border-border pt-4">
              <span className="dot pulse" style={{ background: 'var(--c-viral)' }} />
              <span className="label">next {theme.hubRitualLabel}</span>
              <Countdown className="text-lg" />
              <span className="num ml-auto text-[11px] text-muted">{snap ? `${fmtSol(snap.pendingBurnSol)} SOL queued` : ''}</span>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute bottom-3 right-4 label hidden md:block">drag to pan · scroll to zoom · click a cell or particle</div>
      </section>

      <div className="mx-auto max-w-[1400px] space-y-10 px-4 pt-10">
        {/* 4 STEPS */}
        <section className="grid gap-px border-2 border-border bg-border md:grid-cols-4">
          {theme.copy.steps.map((s, i) => (
            <div key={i} className="bg-panel p-6">
              <div className="num text-specimen">0{i + 1}</div>
              <h3 className="mt-2 text-lg">{s.title}</h3>
              <p className="mt-2 text-[12px] leading-relaxed text-muted">{s.body}</p>
            </div>
          ))}
        </section>

        {/* STATS */}
        <StatsStrip />

        {/* LOG + previews */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Panel title="transmission log · newest first" className="lg:col-span-2" right={<span className="num text-[11px] text-muted">{snap?.events.length ?? 0} events</span>}>
            <TransmissionLog height={460} />
          </Panel>
          <div className="space-y-6">
            <Panel title={`${theme.lineage}s · most ${theme.target}s`} right={<Link href="/lineages" className="label hover:text-text">all →</Link>}>
              {lineages.length === 0 && <Empty>loading</Empty>}
              {lineages.map((l) => (
                <Link key={l.id} href={`/strain/${l.rootCa}`} className="bio flex items-center justify-between border-b border-border px-4 py-2 hover:bg-void">
                  <div>
                    <div className="text-text">{l.name}</div>
                    <div className="num text-[11px] text-muted">gen {l.deepestGeneration} · {l.members.length} strains · v{Math.round(l.maxVirulence)}</div>
                  </div>
                  <div className="num text-right">
                    <div className="text-viral">{l.hostsInfected}</div>
                    <div className="label">{theme.target}s</div>
                  </div>
                </Link>
              ))}
            </Panel>
            <Panel title="immunity" right={<Link href="/immunity" className="label hover:text-text">all →</Link>}>
              {immune.slice(0, 4).map((h) => (
                <HostRow key={h.ca} h={h} />
              ))}
              {extinct.length > 0 && (
                <div className="px-4 py-3">
                  <div className="label mb-2">{theme.states.extinct} {theme.lineage}s</div>
                  {extinct.map((l) => (
                    <div key={l.id} className="flex items-center justify-between py-1 text-dead">
                      <span className="line-through">{l.name}</span>
                      <span className="num text-[11px]">{l.extinctCause?.split('·')[0]}</span>
                    </div>
                  ))}
                </div>
              )}
              {snap && (
                <div className="px-4 py-3">
                  <div className="label mb-2">herd immunity · closest {theme.lineage}</div>
                  {(() => {
                    const l = [...snap.lineages].filter((x) => !x.extinct && x.compatibleHosts > 0).sort((a, b) => b.immuneHosts / b.compatibleHosts - a.immuneHosts / a.compatibleHosts)[0];
                    if (!l) return null;
                    const f = l.immuneHosts / l.compatibleHosts;
                    return (
                      <>
                        <div className="mb-1 flex justify-between text-[11px]">
                          <span>{l.name}</span>
                          <span className="num">{l.immuneHosts}/{l.compatibleHosts} · {Math.round(f * 100)}% of 60%</span>
                        </div>
                        <Progress value={f / 0.6} />
                      </>
                    );
                  })()}
                </div>
              )}
            </Panel>
          </div>
        </div>

        {/* FEATURES */}
        <section className="grid gap-6 md:grid-cols-3">
          {theme.copy.features.map((f) => (
            <div key={f.title} className="mount p-6">
              <h3 className="text-lg">{f.title}</h3>
              <p className="mt-2 text-[12px] leading-relaxed text-muted">{f.body}</p>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
