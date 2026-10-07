import theme from '@/themes';
import { RULES } from '@/lib/rules';

const C = theme.palette;

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="grid gap-6 border-t border-border py-10 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <h2 className="text-2xl">{title}</h2>
      </div>
      <div className="space-y-4 text-[12.5px] leading-relaxed lg:col-span-3">{children}</div>
    </section>
  );
}
function Formula({ children }: { children: React.ReactNode }) {
  return <pre className="mount num overflow-auto p-4 text-[12px] text-specimen">{children}</pre>;
}

export default function HowPage() {
  const T = theme;
  return (
    <div className="mx-auto max-w-[1100px] px-4 pt-8">
      <div className="eyebrow">rules · all mechanical · no model in the money path</div>
      <h1 className="mt-2 text-4xl">how it works</h1>
      <p className="mt-3 max-w-2xl text-[13px] text-muted">{T.copy.tagline}</p>
      <ol className="mt-8 grid gap-px border-2 border-border bg-border md:grid-cols-4">
        {T.copy.steps.map((s, i) => (
          <li key={i} className="bg-panel p-5"><div className="num text-specimen">0{i + 1}</div><h3 className="mt-1">{s.title}</h3><p className="mt-1 text-[12px] text-muted">{s.body}</p></li>
        ))}
      </ol>

      <Section id="compatibility" title="Compatibility">
        <p>A {T.unit} may only attach to a {T.target} with at least <b className="num">{RULES.minOverlap}%</b> holder overlap with the launcher&apos;s wallet holdings, <em>or</em> one sharing the launcher&apos;s narrative tag. Every candidate shows a 0–100 compatibility score in the launch flow.</p>
        <Formula>{`overlap  = |holders(host) ∩ holdings(launcher)| / |holdings(launcher)|
score    = tagMatch ? max(55, 55 + overlap·0.75) : min(100, overlap·1.4)
eligible = (overlap ≥ ${RULES.minOverlap}% OR tagMatch) AND score ≥ 100 − compatibilityRange
           AND host not immune to lineage AND no purchased window AND host alive`}</Formula>
        <svg viewBox="0 0 520 150" className="w-full">
          <circle cx="150" cy="75" r="60" fill="none" stroke={C.specimen} strokeWidth="2" />
          <circle cx="230" cy="75" r="60" fill="none" stroke={C.viral} strokeWidth="2" />
          <text x="100" y="80" fill={C.text} fontSize="11" fontFamily="monospace">host holders</text>
          <text x="248" y="80" fill={C.text} fontSize="11" fontFamily="monospace">your holdings</text>
          <text x="172" y="78" fill={C.immune} fontSize="11" fontFamily="monospace">≥{RULES.minOverlap}%</text>
          <line x1="330" y1="75" x2="400" y2="75" stroke={C.border} />
          <circle cx="440" cy="75" r="26" fill="none" stroke={C.specimen} strokeWidth="2" />
          <text x="440" y="79" textAnchor="middle" fill={C.specimen} fontSize="12" fontFamily="monospace">0–100</text>
        </svg>
      </Section>

      <Section id="extraction" title="Extraction">
        <p>An attached {T.unit} diverts <span className="num">extractionRate</span> (default <b className="num">{RULES.defaultExtractionRate * 100}%</b>, mutates in children ±{RULES.extractionDrift * 100} points) of the {T.target}&apos;s creator fees into its own vault, per trade. The {T.target} keeps the rest. Extraction is visible on the {T.target}&apos;s page from the first SOL.</p>
        <Formula>{`per trade:  taken = creatorFee · extractionRate
            vault      += taken · ${1 - RULES.feeToHub}
            hubQueue   += taken · ${RULES.feeToHub}     → bought & burned on the hour`}</Formula>
        <svg viewBox="0 0 520 110" className="w-full">
          <circle cx="80" cy="55" r="40" fill="none" stroke={C.specimen} strokeWidth="2" />
          <text x="80" y="59" textAnchor="middle" fill={C.text} fontSize="11" fontFamily="monospace">{T.target}</text>
          <line x1="122" y1="55" x2="230" y2="55" stroke={C.specimen} strokeWidth="1" strokeDasharray="3 3" />
          <text x="176" y="47" textAnchor="middle" fill={C.specimen} fontSize="10" fontFamily="monospace">12% of fees</text>
          <polygon points="260,30 285,42 285,68 260,80 235,68 235,42" fill="none" stroke={C.viral} strokeWidth="2" />
          <text x="260" y="59" textAnchor="middle" fill={C.viral} fontSize="10" fontFamily="monospace">vault</text>
          <line x1="290" y1="55" x2="400" y2="30" stroke={C.border} />
          <line x1="290" y1="55" x2="400" y2="80" stroke={C.border} />
          <text x="410" y="33" fill={C.text} fontSize="10" fontFamily="monospace">80% stays</text>
          <text x="410" y="84" fill={C.viral} fontSize="10" fontFamily="monospace">20% → {T.hubRitual} {T.hubToken}</text>
        </svg>
      </Section>

      <Section id="paths" title="The two paths">
        <p>Chosen at launch. Irreversible.</p>
        <div className="grid gap-px bg-border md:grid-cols-2">
          <div className="bg-panel p-4">
            <h3 className="text-infection">{T.copy.paths.burst.title}</h3>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-[12px]">
              <li>Threshold = <span className="num">{RULES.lysisMultiple}×</span> the {T.unit}&apos;s launch cost.</li>
              <li>On reaching it the {T.unit} dumps its entire position; the {T.target} absorbs the sell pressure.</li>
              <li>{RULES.childrenPerLysis} children spawn with mutated parameters. Launcher receives <span className="num">{RULES.lysisLauncherCut * 100}%</span> of the vault and <span className="num">{RULES.childOwnership * 100}%</span> of each child.</li>
              <li>The {T.target} records a lysis event and is permanently immune to that {T.lineage}.</li>
            </ul>
          </div>
          <div className="bg-panel p-4">
            <h3 className="text-viral">{T.copy.paths.integrate.title}</h3>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-[12px]">
              <li>Extraction stops immediately.</li>
              <li>{T.unit} supply is airdropped pro-rata to all current {T.target} holders and to all future buyers automatically.</li>
              <li>Earns <span className="num">{RULES.lysogenyShare * 100}%</span> of {T.target} creator fees in perpetuity: {RULES.lysogenyLauncherSplit * 100}% launcher, {100 - RULES.lysogenyLauncherSplit * 100}% {T.unit} holders.</li>
              <li>Virulence stays 0. Lysogenic {T.unit}s always keep full {T.target} access.</li>
            </ul>
          </div>
        </div>
        <svg viewBox="0 0 520 160" className="w-full">
          <circle cx="60" cy="80" r="30" fill="none" stroke={C.specimen} strokeWidth="2" />
          <polygon points="60,70 69,75 69,85 60,90 51,85 51,75" fill={C.viral} />
          <line x1="95" y1="80" x2="160" y2="40" stroke={C.border} /><line x1="95" y1="80" x2="160" y2="120" stroke={C.border} />
          <circle cx="220" cy="40" r="38" fill="none" stroke={C.infection} strokeWidth="2" strokeDasharray="4 3" />
          <text x="220" y="44" textAnchor="middle" fill={C.infection} fontSize="10" fontFamily="monospace">swell → burst</text>
          {[0, 1, 2].map((i) => <polygon key={i} points={`${300 + i * 34},30 ${307 + i * 34},34 ${307 + i * 34},42 ${300 + i * 34},46 ${293 + i * 34},42 ${293 + i * 34},34`} fill={C.viral} />)}
          <circle cx="440" cy="40" r="24" fill="none" stroke={C.immune} strokeWidth="2" />
          <text x="440" y="44" textAnchor="middle" fill={C.immune} fontSize="9" fontFamily="monospace">immune</text>
          <circle cx="220" cy="120" r="30" fill="none" stroke={C.viral} strokeWidth="2" />
          {[...Array(12)].map((_, i) => <circle key={i} cx={220 + Math.cos(i) * 18} cy={120 + Math.sin(i * 1.7) * 18} r="1.5" fill={C.viral} />)}
          <text x="270" y="124" fill={C.text} fontSize="10" fontFamily="monospace">integrated · every holder is a carrier · 3% forever</text>
        </svg>
      </Section>

      <Section id="virulence" title="Virulence">
        <Formula>{`raw        = (total SOL extracted / total hosts) × (hosts killed + 1)
virulence  = min(100, raw / ${RULES.virulenceScale} × 100) − ${RULES.virulenceDecayPerDay} × days inactive
> ${RULES.virulenceShrinkAt}   compatible host pool shrinks ${RULES.virulenceShrinkFactor * 100}% (lowest scores dropped)
> ${RULES.virulenceSmallCapAt}   may only infect hosts under $${RULES.smallCapCeiling / 1000}k mcap
lysogeny   always 0`}</Formula>
        <p>Displayed on every {T.unit}. The system pushes {T.unit}s toward sustainable parasitism: take too much, kill too often, and you run out of {T.target}s.</p>
        <svg viewBox="0 0 520 90" className="w-full">
          <rect x="20" y="40" width="480" height="10" fill={C.panel} stroke={C.border} />
          <rect x="20" y="40" width="288" height="10" fill={C.specimen} opacity="0.5" />
          <rect x="308" y="40" width="120" height="10" fill={C.viral} opacity="0.6" />
          <rect x="428" y="40" width="72" height="10" fill={C.infection} opacity="0.7" />
          <text x="20" y="32" fill={C.muted} fontSize="10" fontFamily="monospace">0</text>
          <text x="308" y="32" fill={C.viral} fontSize="10" fontFamily="monospace">60 · pool −50%</text>
          <text x="428" y="32" fill={C.infection} fontSize="10" fontFamily="monospace">85 · &lt;$10k only</text>
          <text x="20" y="72" fill={C.muted} fontSize="10" fontFamily="monospace">decays {RULES.virulenceDecayPerDay} pts / day of inactivity</text>
        </svg>
      </Section>

      <Section id="latency" title="Latency (dormancy)">
        <p>Optional at launch for a small extra fee ({RULES.dormancyFee} SOL). A dormant {T.unit} is <b>invisible</b> on the {T.target} page and extracts nothing. It activates on a launcher-set trigger: {T.target} mcap ≥ X, {T.target} dev wallet sells ≥ Y%, or a timestamp. On activation it appears instantly with a red flash. Any {T.target} on the board may already be infected.</p>
      </Section>

      <Section id="immunity" title="Immunity & herd immunity">
        <ul className="list-disc space-y-1 pl-4">
          <li>Surviving a lysis → permanent immunity to that {T.lineage}, badge shown on the {T.target}.</li>
          <li>Any {T.target} may buy a 24h immunity window with {T.hubToken}; price scales with mcap (<span className="num">500 + 12·√mcap</span>). The {T.hubToken} is burned. This is the hub token&apos;s utility.</li>
          <li><b>Herd immunity:</b> when ≥ <span className="num">{RULES.herdImmunity * 100}%</span> of a {T.lineage}&apos;s compatible {T.target}s carry immunity to it, that {T.lineage} can find no {T.target}s and is marked {T.states.extinct} globally. Every active member expires.</li>
        </ul>
        <svg viewBox="0 0 520 100" className="w-full">
          {[...Array(10)].map((_, i) => <circle key={i} cx={40 + i * 48} cy="50" r="16" fill="none" stroke={i < 6 ? C.immune : C.specimen} strokeWidth="2" />)}
          <text x="40" y="90" fill={C.immune} fontSize="10" fontFamily="monospace">6 of 10 compatible immune → 60% → lineage extinct</text>
        </svg>
      </Section>

      <Section id="mutation" title="Mutation">
        <Formula>{`child.extractionRate     = parent ± ${RULES.extractionDrift * 100} points   (clamped 3%–30%)
child.lysisThreshold     = parent × (1 ± ${RULES.paramDrift})
child.compatibilityRange = parent × (1 ± ${RULES.paramDrift})
a child with no host after 24h EXPIRES: vault returned to its holders`}</Formula>
        <p>Population parameters drift over time. Charted on <a href="/stats" className="text-specimen">/stats</a>.</p>
      </Section>

      <Section id="burn" title={`Hub ritual · ${T.hubRitualLabel}`}>
        <p>Hourly, on the hour, UTC. {RULES.feeToHub * 100}% of all {T.verbs.extract}ion that hour buys {T.hubToken} on Jupiter and {T.hubRitual}s 100% of it. No distribution. Site-wide countdown. Every {T.hubRitual} posted with its tx on <a href="/burns" className="text-specimen">/{T.hubRitual}s</a>.</p>
      </Section>
    </div>
  );
}
