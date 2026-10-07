/**
 * PHASE 1 — MOCK SIMULATOR
 * A deterministic, seeded world that looks alive with zero backend.
 * Every state change produces exactly one SimEvent with a (mock) tx signature.
 * The 3D field animates ONLY from these events.
 *
 * Phase 2 replaces the tick loop with chain workers (see README) but keeps
 * the data model, the rules in /lib/rules.ts and the event stream shape.
 */
import type {
  Burn,
  DormancyTrigger,
  Host,
  ImmunityPurchase,
  Lineage,
  Path,
  PopulationSample,
  SimEvent,
  Stats,
  Strain,
  StrainParams,
  WorldSnapshot,
} from './types';
import { RULES, applyVirulencePool, compatibility, immunityPrice, lysisThresholdFor, mutate, virulenceOf } from './rules';
import { HOST_WORDS, LINEAGE_NAMES, SUFFIXES, TAGS, svgAvatar } from './names';

export interface SimOptions {
  seed?: number;
  /** ms per "day" (expiry, virulence decay). mock: 120s, prod: 86400s */
  dayMs?: number;
  /** ms between hub rituals. mock: 60s, prod: 3600s on the hour UTC */
  burnIntervalMs?: number;
  /** min/max ms between ticks */
  tickMin?: number;
  tickMax?: number;
  /** maximum events retained in memory */
  maxEvents?: number;
}

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export const SOL_USD = 180; // mock price for "sell pressure" conversions
export const VIRUS_PER_SOL = 1_000_000; // mock $VIRUS price

export const HUB_CA = 'V1RUS8urnHubTokenMintAddressMockxxxxxxxxxxxxx';

export class Simulator {
  readonly seed: number;
  readonly dayMs: number;
  readonly burnIntervalMs: number;
  private tickMin: number;
  private tickMax: number;
  private maxEvents: number;

  hosts = new Map<string, Host>();
  strains = new Map<string, Strain>();
  events: SimEvent[] = []; // newest first
  burns: Burn[] = []; // newest first
  immunityPurchases: ImmunityPurchase[] = [];
  population: PopulationSample[] = [];
  extinct = new Map<string, { at: number; cause: string }>();
  pendingBurnSol = 0;
  virusBurnedTotal = 0;
  nextBurnAt = 0;
  version = 0;
  startedAt: number;
  /** wallets that paid for immunity / launched strains in this session */
  userWallet: string | null = null;

  private rndState: number;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private tickCount = 0;
  private eventListeners = new Set<(e: SimEvent) => void>();
  private changeListeners = new Set<(s: WorldSnapshot) => void>();
  private snapshotCache: WorldSnapshot | null = null;
  private lineageNameIdx = 0;

  constructor(opts: SimOptions = {}) {
    this.seed = opts.seed ?? 7;
    this.rndState = this.seed >>> 0 || 1;
    this.dayMs = opts.dayMs ?? 120_000;
    this.burnIntervalMs = opts.burnIntervalMs ?? 60_000;
    this.tickMin = opts.tickMin ?? 2000;
    this.tickMax = opts.tickMax ?? 5000;
    this.maxEvents = opts.maxEvents ?? 600;
    this.startedAt = Date.now();
    this.nextBurnAt = Math.ceil(this.startedAt / this.burnIntervalMs) * this.burnIntervalMs;
    this.seedWorld();
  }

  // ---------- RNG / ids ----------
  rnd(): number {
    // mulberry32
    this.rndState = (this.rndState + 0x6d2b79f5) >>> 0;
    let t = this.rndState;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  private pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.rnd() * arr.length)];
  }
  private b58(n: number): string {
    let s = '';
    for (let i = 0; i < n; i++) s += B58[Math.floor(this.rnd() * B58.length)];
    return s;
  }
  private ca(): string {
    return this.b58(44);
  }
  private tx(): string {
    return this.b58(88);
  }
  private id(): string {
    return this.b58(10);
  }

  // ---------- seeding ----------
  private seedWorld() {
    const now = this.startedAt;
    const usedNames = new Set<string>();
    // 120 hosts
    for (let i = 0; i < 120; i++) {
      const tag = TAGS[i % TAGS.length];
      let base = this.pick(HOST_WORDS[tag]);
      let ticker = base + this.pick(SUFFIXES);
      let guard = 0;
      while (usedNames.has(ticker) && guard++ < 20) {
        base = this.pick(HOST_WORDS[tag]);
        ticker = base + this.pick(SUFFIXES);
      }
      usedNames.add(ticker);
      // log-uniform mcap between 2k and 8M
      const mcap = Math.round(Math.exp(Math.log(2000) + this.rnd() * (Math.log(8_000_000) - Math.log(2000))));
      const holders = Math.round(Math.sqrt(mcap) * (1.5 + this.rnd() * 2));
      const hue = Math.floor(this.rnd() * 360);
      const ca = this.ca();
      this.hosts.set(ca, {
        ca,
        name: base.charAt(0) + base.slice(1).toLowerCase() + (ticker !== base ? ' ' + ticker.slice(base.length) : ''),
        ticker,
        image: svgAvatar(i, ticker, hue, 'host'),
        mcap,
        holders,
        narrativeTag: tag,
        strains: [],
        totalExtracted: 0,
        lysisSurvived: 0,
        immuneTo: [],
        state: 'healthy',
        history: [{ t: now - 2 * this.dayMs, v: 0 }],
        devWallet: this.ca(),
        devSold: this.rnd() * 0.2,
        createdAt: now - Math.floor(this.rnd() * 30 * this.dayMs),
      });
    }
    const hostArr = [...this.hosts.values()];

    // 6 lineages, 40 strains
    const lineagePlan: { tag: string; n: number; demoExtinct?: boolean; path: Path }[] = [
      { tag: 'dog', n: 9, path: 'lysis' },
      { tag: 'frog', n: 8, path: 'lysis' },
      { tag: 'ai', n: 7, path: 'lysis' },
      { tag: 'cat', n: 6, path: 'lysogeny' },
      { tag: 'space', n: 5, path: 'lysis' },
      { tag: 'anime', n: 5, path: 'lysis', demoExtinct: true },
    ];
    const pastEvents: SimEvent[] = [];
    let created = 0;
    for (const plan of lineagePlan) {
      const owner = this.ca();
      const rootName = this.nextLineageName();
      const root = this.makeStrain({
        name: rootName,
        ticker: rootName,
        generation: 0,
        path: plan.path,
        ownerWallet: owner,
        narrativeTag: plan.tag,
        bornAt: now - (1.5 + this.rnd()) * this.dayMs,
        launchCost: RULES.launchCost,
        params: plan.demoExtinct ? { extractionRate: 0.16, lysisThreshold: lysisThresholdFor(RULES.launchCost), compatibilityRange: 40 } : undefined,
      });
      root.lineageId = root.ca;
      created++;
      const members: Strain[] = [root];
      // grow a tree
      let frontier = [root];
      while (members.length < plan.n) {
        const parent = this.pick(frontier);
        const child = this.makeStrain({
          name: `${rootName}-${parent.generation + 1}${String.fromCharCode(65 + (parent.children.length % 26))}`,
          ticker: `${rootName}${parent.generation + 1}${String.fromCharCode(65 + (parent.children.length % 26))}`,
          generation: parent.generation + 1,
          parentCa: parent.ca,
          path: plan.path,
          ownerWallet: owner,
          narrativeTag: plan.tag,
          bornAt: parent.bornAt + (0.2 + this.rnd() * 0.5) * this.dayMs,
          launchCost: parent.launchCost,
          params: mutate(parent.params, () => this.rnd()),
        });
        child.lineageId = root.ca;
        parent.children.push(child.ca);
        members.push(child);
        if (parent.children.length >= 3) frontier = frontier.filter((f) => f !== parent);
        frontier.push(child);
        created++;
      }
      // assign states & hosts
      const pool = hostArr.filter((h) => this.compatibleFor(root, h, true).eligible && h.strains.length === 0);
      let poolIdx = 0;
      for (let i = 0; i < members.length; i++) {
        const s = members[i];
        const isRoot = i === 0;
        const host = pool[(poolIdx++ + Math.floor(this.rnd() * 3)) % Math.max(1, pool.length)];
        if (!host) continue;
        if (plan.path === 'lysogeny') {
          // integrate everyone
          s.hostCa = host.ca;
          s.attachedAt = s.bornAt;
          s.state = 'integrated';
          s.hostsInfected = 1;
          s.hostHistory.push(host.ca);
          host.strains.push(s.ca);
          host.state = 'lysogenic';
          s.vault = this.rnd() * 0.6;
          s.totalExtracted = 0;
          pastEvents.push(this.mkEvent('integrate', s, host, undefined, s.bornAt + 1000));
          continue;
        }
        const roll = this.rnd();
        if (isRoot || roll < 0.3) {
          // already lysed a host in the past → that host is immune
          const victim = host;
          s.hostHistory.push(victim.ca);
          s.hostsInfected = 1 + Math.floor(this.rnd() * 2);
          s.totalExtracted = s.params.lysisThreshold * (1 + this.rnd() * 0.3);
          s.state = 'lysed';
          s.lastActiveAt = s.bornAt + 0.4 * this.dayMs;
          victim.lysisSurvived++;
          victim.totalExtracted += s.totalExtracted;
          if (!victim.immuneTo.includes(root.ca)) victim.immuneTo.push(root.ca);
          victim.history.push({ t: s.lastActiveAt, v: victim.totalExtracted });
          pastEvents.push(this.mkEvent('infect', s, victim, undefined, s.bornAt));
          pastEvents.push(this.mkEvent('lyse', s, victim, s.totalExtracted, s.lastActiveAt));
          if (this.rnd() < 0.25 && victim.mcap < 20000) {
            victim.state = 'dead';
            s.hostsKilled++;
          }
        } else if (roll < 0.5) {
          // dormant, attached invisibly
          s.hostCa = host.ca;
          s.attachedAt = s.bornAt;
          s.dormant = true;
          s.state = 'dormant';
          s.trigger = this.randomTrigger(host, now);
          // NOT pushed to host.strains — genuinely invisible
        } else if (roll < 0.62) {
          // unattached child hunting
          s.state = 'active';
        } else {
          // active and extracting
          s.hostCa = host.ca;
          s.attachedAt = now - this.rnd() * 0.5 * this.dayMs;
          s.state = 'active';
          s.hostsInfected = 1;
          s.hostHistory.push(host.ca);
          s.vault = this.rnd() * s.params.lysisThreshold * 0.7;
          s.totalExtracted = s.vault / 0.8;
          host.strains.push(s.ca);
          host.state = 'infected';
          host.totalExtracted += s.totalExtracted;
          host.history.push({ t: s.attachedAt, v: 0 }, { t: now - 1000, v: host.totalExtracted });
          pastEvents.push(this.mkEvent('infect', s, host, undefined, s.attachedAt));
        }
      }
      // demo: set up a lineage close to herd immunity so an extinction is visible early
      if (plan.demoExtinct) {
        const lin = this.lineageOf(root.ca);
        const compat = hostArr.filter((h) => h.state !== 'dead' && this.compatibleFor(root, h, true).eligible);
        const target = Math.ceil(compat.length * RULES.herdImmunity) - 1; // one short
        let immune = compat.filter((h) => h.immuneTo.includes(root.ca)).length;
        for (const h of compat) {
          if (immune >= target) break;
          if (!h.immuneTo.includes(root.ca)) {
            h.immuneTo.push(root.ca);
            h.lysisSurvived++;
            immune++;
            pastEvents.push({
              id: this.id(),
              kind: 'immunize',
              strainCa: root.ca,
              hostCa: h.ca,
              text: `$${h.ticker} survived lysis · permanently immune to ${lin.name}`,
              txSig: this.tx(),
              at: now - this.rnd() * this.dayMs,
            });
          }
        }
        // make sure one active member is attached to a non-immune compatible host, near threshold
        const active = members.find((m) => m.state === 'active' && m.hostCa) ?? members.find((m) => m.state === 'active') ?? members[members.length - 1];
        const victim = compat.find((h) => !h.immuneTo.includes(root.ca) && h.strains.length === 0 && h.state !== 'dead');
        if (active && victim) {
          active.dormant = false;
          active.trigger = undefined;
          if (active.hostCa) {
            const prev = this.hosts.get(active.hostCa);
            if (prev) {
              prev.strains = prev.strains.filter((c) => c !== active.ca);
              if (prev.strains.length === 0) prev.state = 'healthy';
            }
          }
          active.hostCa = victim.ca;
          active.attachedAt = now - 0.3 * this.dayMs;
          active.state = 'active';
          active.hostsInfected = Math.max(1, active.hostsInfected);
          active.vault = active.params.lysisThreshold * 0.9;
          victim.strains.push(active.ca);
          victim.state = 'infected';
          pastEvents.push(this.mkEvent('infect', active, victim, undefined, active.attachedAt));
        }
      }
    }
    // top up to 40 strains with a few extra hunting children across lineages
    const roots = [...this.strains.values()].filter((s) => s.generation === 0);
    while (created < 40) {
      const parent = this.pick([...this.strains.values()].filter((s) => s.state === 'lysed'));
      const root = roots.find((r) => r.ca === parent.lineageId)!;
      const child = this.makeStrain({
        name: `${root.name}-${parent.generation + 1}${String.fromCharCode(65 + (parent.children.length % 26))}`,
        ticker: `${root.name}${parent.generation + 1}${String.fromCharCode(65 + (parent.children.length % 26))}`,
        generation: parent.generation + 1,
        parentCa: parent.ca,
        path: parent.path,
        ownerWallet: parent.ownerWallet,
        narrativeTag: parent.narrativeTag,
        bornAt: now - this.rnd() * 0.3 * this.dayMs,
        launchCost: parent.launchCost,
        params: mutate(parent.params, () => this.rnd()),
      });
      child.lineageId = parent.lineageId;
      child.state = 'active';
      parent.children.push(child.ca);
      created++;
    }
    // historic burns
    for (let i = 6; i >= 1; i--) {
      const solIn = 0.4 + this.rnd() * 2.5;
      const bought = Math.round(solIn * VIRUS_PER_SOL * (0.9 + this.rnd() * 0.2));
      this.burns.push({ id: this.id(), at: this.nextBurnAt - i * this.burnIntervalMs, solIn, virusBought: bought, virusBurned: bought, txSig: this.tx() });
      this.virusBurnedTotal += bought;
    }
    this.burns.reverse();
    this.events = pastEvents.sort((a, b) => b.at - a.at).slice(0, this.maxEvents);
    this.pendingBurnSol = 0.3 + this.rnd() * 0.4;
    for (const s of this.strains.values()) s.virulence = virulenceOf(s, now);
    this.samplePopulation(now);
    this.invalidate();
  }

  private nextLineageName(): string {
    const n = LINEAGE_NAMES[this.lineageNameIdx % LINEAGE_NAMES.length];
    const round = Math.floor(this.lineageNameIdx / LINEAGE_NAMES.length);
    this.lineageNameIdx++;
    return round === 0 ? n : `${n}${round + 1}`;
  }

  private makeStrain(p: {
    name: string;
    ticker: string;
    generation: number;
    parentCa?: string;
    path: Path;
    ownerWallet: string;
    narrativeTag: string;
    bornAt: number;
    launchCost: number;
    params?: StrainParams;
    image?: string;
  }): Strain {
    const ca = this.ca();
    const s: Strain = {
      ca,
      name: p.name,
      ticker: p.ticker,
      image: p.image ?? svgAvatar(Math.floor(this.rnd() * 1000), p.ticker, 330 + Math.floor(this.rnd() * 30), 'strain'),
      wallet: this.ca(),
      lineageId: ca,
      generation: p.generation,
      parentCa: p.parentCa,
      children: [],
      path: p.path,
      params: p.params ?? {
        extractionRate: RULES.defaultExtractionRate,
        lysisThreshold: lysisThresholdFor(p.launchCost),
        compatibilityRange: RULES.defaultCompatibilityRange,
      },
      vault: 0,
      totalExtracted: 0,
      hostsInfected: 0,
      hostsKilled: 0,
      virulence: 0,
      dormant: false,
      state: 'active',
      bornAt: p.bornAt,
      ownerWallet: p.ownerWallet,
      launchCost: p.launchCost,
      lastActiveAt: p.bornAt,
      narrativeTag: p.narrativeTag,
      hostHistory: [],
    };
    this.strains.set(ca, s);
    return s;
  }

  private randomTrigger(host: Host, now: number): DormancyTrigger {
    const r = this.rnd();
    if (r < 0.4) return { kind: 'mcap', value: Math.round(host.mcap * (1.03 + this.rnd() * 0.12)) };
    if (r < 0.7) return { kind: 'devsell', value: Math.min(0.9, host.devSold + 0.05 + this.rnd() * 0.15) };
    return { kind: 'timestamp', value: now + 20_000 + this.rnd() * 300_000 };
  }

  // ---------- helpers ----------
  lineageOf(lineageId: string): { name: string; ticker: string; root: Strain } {
    const root = this.strains.get(lineageId)!;
    return { name: root.name, ticker: root.ticker, root };
  }

  compatibleFor(s: Strain, h: Host, ignoreImmunity = false) {
    return compatibility(s.ownerWallet, s.narrativeTag, h, ignoreImmunity ? undefined : s.lineageId, ignoreImmunity ? 0 : s.virulence, s.params.compatibilityRange);
  }

  /** hosts a strain may attach to right now, after every rule */
  eligibleHosts(s: Strain): { host: Host; score: number }[] {
    const list: { host: Host; score: number }[] = [];
    for (const h of this.hosts.values()) {
      if (h.strains.includes(s.ca)) continue;
      const c = this.compatibleFor(s, h);
      if (c.eligible) list.push({ host: h, score: c.score });
    }
    return applyVirulencePool(list, s.virulence);
  }

  /** the lineage's compatible pool (ignores immunity) and how many of it are immune */
  herd(lineageId: string): { compatible: number; immune: number } {
    const root = this.strains.get(lineageId);
    if (!root) return { compatible: 0, immune: 0 };
    let compatible = 0;
    let immune = 0;
    for (const h of this.hosts.values()) {
      if (h.state === 'dead') continue;
      if (!this.compatibleFor(root, h, true).eligible) continue;
      compatible++;
      if (h.immuneTo.includes(lineageId)) immune++;
    }
    return { compatible, immune };
  }

  private mkEvent(kind: SimEvent['kind'], s: Strain, h?: Host, amount?: number, at?: number, meta?: Record<string, unknown>): SimEvent {
    const lin = this.strains.get(s.lineageId)?.name ?? s.name;
    let text = '';
    switch (kind) {
      case 'infect':
        text = `${s.name} infected $${h?.ticker} · extracting ${(s.params.extractionRate * 100).toFixed(1)}% of creator fees`;
        break;
      case 'extract':
        text =
          s.path === 'lysogeny'
            ? `${s.name} received ${fmtSol(amount ?? 0)} SOL · 3% lysogenic share of $${h?.ticker} fees`
            : `${s.name} extracted ${fmtSol(amount ?? 0)} SOL from $${h?.ticker}`;
        break;
      case 'lyse':
        text = `${s.name} lysed $${h?.ticker} · ${fmtSol(amount ?? 0)} SOL dumped · 3 children spawned · $${h?.ticker} immune to ${lin}`;
        break;
      case 'integrate':
        text = `${s.name} integrated into $${h?.ticker} · airdropped to ${h?.holders.toLocaleString()} carriers · extraction stopped`;
        break;
      case 'activate':
        text = `dormant ${s.name} ACTIVATED on $${h?.ticker} · trigger: ${describeTrigger(s.trigger)}`;
        break;
      case 'immunize':
        text = `$${h?.ticker} survived lysis · permanently immune to ${lin}`;
        break;
      case 'expire':
        text = `${s.name} found no host in 24h · expired · ${fmtSol(amount ?? 0)} SOL returned to holders`;
        break;
      case 'extinct':
        text = `lineage ${lin} EXTINCT · ${meta?.cause ?? 'herd immunity'}`;
        break;
      case 'burn':
        text = `BURN · ${fmtSol(amount ?? 0)} SOL → ${(meta?.virusBurned as number)?.toLocaleString()} $VIRUS burned`;
        break;
    }
    return { id: this.id(), kind, strainCa: s.ca, hostCa: h?.ca, amount, text, txSig: this.tx(), at: at ?? Date.now(), meta };
  }

  private emit(e: SimEvent) {
    this.events.unshift(e);
    if (this.events.length > this.maxEvents) this.events.length = this.maxEvents;
    for (const l of this.eventListeners) l(e);
  }

  onEvent(fn: (e: SimEvent) => void): () => void {
    this.eventListeners.add(fn);
    return () => this.eventListeners.delete(fn);
  }
  onChange(fn: (s: WorldSnapshot) => void): () => void {
    this.changeListeners.add(fn);
    return () => this.changeListeners.delete(fn);
  }
  private invalidate() {
    this.version++;
    this.snapshotCache = null;
  }
  private publish() {
    this.invalidate();
    const snap = this.snapshot();
    for (const l of this.changeListeners) l(snap);
  }

  // ---------- loop ----------
  start() {
    if (this.timer) return;
    const loop = () => {
      this.tick();
      this.timer = setTimeout(loop, this.tickMin + this.rnd() * (this.tickMax - this.tickMin));
    };
    this.timer = setTimeout(loop, 800);
  }
  stop() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  tick() {
    const now = Date.now();
    this.tickCount++;
    // 1. markets drift
    for (const h of this.hosts.values()) {
      if (h.state === 'dead') continue;
      h.mcap = Math.max(500, Math.round(h.mcap * (1 + (this.rnd() - 0.49) * 0.05)));
      if (this.rnd() < 0.05) h.devSold = Math.min(1, h.devSold + this.rnd() * 0.08);
      if (this.rnd() < 0.3) h.holders = Math.max(5, h.holders + Math.round((this.rnd() - 0.45) * 6));
    }
    // 2. extraction ticks (up to 3 strains per tick)
    for (const s of this.strains.values()) {
      if (s.hostCa && (s.state === 'active' || s.state === 'integrated') && !s.dormant && this.rnd() < 0.5) this.extractTick(s, now);
    }
    // 3. lysis thresholds
    for (const s of this.strains.values()) {
      if (s.state === 'active' && s.hostCa && !s.dormant && s.path === 'lysis' && s.vault >= s.params.lysisThreshold) this.lyse(s, now);
    }
    // 4. dormancy triggers
    for (const s of this.strains.values()) {
      if (s.state !== 'dormant' || !s.hostCa) continue;
      const h = this.hosts.get(s.hostCa);
      if (h && this.triggerMet(s.trigger, h, now)) this.activate(s, now);
    }
    // 5. one major action
    const r = this.rnd();
    if (r < 0.45) this.hunt(now);
    else if (r < 0.52) this.randomLaunch(now);
    else if (r < 0.6) this.randomImmunityPurchase(now);
    // 6. expiries
    for (const s of this.strains.values()) {
      if (s.state === 'active' && !s.hostCa && now - s.bornAt > this.dayMs) this.expire(s, now);
    }
    // 7. purchased immunity windows lapse
    for (const h of this.hosts.values()) if (h.immuneUntil && h.immuneUntil < now) h.immuneUntil = undefined;
    // 8. virulence
    for (const s of this.strains.values()) s.virulence = virulenceOf(s, now);
    // 9. hub ritual
    if (now >= this.nextBurnAt) this.burn(now);
    // 10. population sample
    if (this.tickCount % 8 === 0) this.samplePopulation(now);
    this.publish();
  }

  private triggerMet(t: DormancyTrigger | undefined, h: Host, now: number): boolean {
    if (!t) return false;
    if (t.kind === 'mcap') return h.mcap >= t.value;
    if (t.kind === 'devsell') return h.devSold >= t.value;
    return now >= t.value;
  }

  private extractTick(s: Strain, now: number) {
    const h = this.hosts.get(s.hostCa!);
    if (!h || h.state === 'dead') return;
    // host creator-fee volume this tick (mock: one tick ≈ a burst of trades), scaled by mcap
    const feeSol = 0.03 + this.rnd() * 0.09 + (h.mcap / 1_000_000) * (0.1 + this.rnd() * 0.2);
    if (s.path === 'lysogeny') {
      const share = feeSol * RULES.lysogenyShare;
      s.vault += share;
      s.lastActiveAt = now;
      this.emit(this.mkEvent('extract', s, h, share, now));
      return;
    }
    const amount = feeSol * s.params.extractionRate;
    s.vault += amount * (1 - RULES.feeToHub);
    this.pendingBurnSol += amount * RULES.feeToHub;
    s.totalExtracted += amount;
    s.lastActiveAt = now;
    h.totalExtracted += amount;
    h.history.push({ t: now, v: h.totalExtracted });
    if (h.history.length > 300) h.history.splice(0, h.history.length - 300);
    this.emit(this.mkEvent('extract', s, h, amount, now));
  }

  private hunt(now: number) {
    const hunters = [...this.strains.values()].filter((s) => s.state === 'active' && !s.hostCa && !s.dormant);
    if (hunters.length === 0) return;
    const s = this.pick(hunters);
    const eligible = this.eligibleHosts(s);
    if (eligible.length === 0) return;
    // prefer higher scores but keep variety
    eligible.sort((a, b) => b.score - a.score);
    const choice = eligible[Math.floor(Math.pow(this.rnd(), 2) * eligible.length)];
    this.attach(s, choice.host, now);
  }

  private attach(s: Strain, h: Host, now: number) {
    s.hostCa = h.ca;
    s.attachedAt = now;
    s.hostsInfected++;
    s.hostHistory.push(h.ca);
    s.lastActiveAt = now;
    if (s.path === 'lysogeny') {
      this.integrate(s, h, now);
      return;
    }
    if (s.dormant) {
      s.state = 'dormant';
      return; // invisible: no host.strains entry, no event
    }
    h.strains.push(s.ca);
    if (h.state === 'healthy') h.state = 'infected';
    this.emit(this.mkEvent('infect', s, h, undefined, now));
  }

  private integrate(s: Strain, h: Host, now: number) {
    s.state = 'integrated';
    s.dormant = false;
    s.virulence = 0;
    h.strains.push(s.ca);
    if (h.state !== 'dead') h.state = 'lysogenic';
    this.emit(this.mkEvent('integrate', s, h, undefined, now));
  }

  private activate(s: Strain, now: number) {
    const h = this.hosts.get(s.hostCa!);
    if (!h) return;
    s.dormant = false;
    s.state = 'active';
    s.lastActiveAt = now;
    s.attachedAt = now;
    if (!s.hostHistory.includes(h.ca)) {
      s.hostHistory.push(h.ca);
      s.hostsInfected++;
    }
    h.strains.push(s.ca);
    if (h.state === 'healthy') h.state = 'infected';
    this.emit(this.mkEvent('activate', s, h, undefined, now));
  }

  private lyse(s: Strain, now: number) {
    const h = this.hosts.get(s.hostCa!);
    if (!h) return;
    const vault = s.vault;
    const root = this.strains.get(s.lineageId)!;
    // sell pressure: vault dumped into host's market
    const pressure = Math.min(0.45, (vault * SOL_USD * 6) / Math.max(h.mcap, 1));
    h.mcap = Math.round(h.mcap * (1 - pressure));
    h.strains = h.strains.filter((c) => c !== s.ca);
    h.lysisSurvived++;
    if (!h.immuneTo.includes(s.lineageId)) h.immuneTo.push(s.lineageId);
    const died = h.mcap < 2500 || (h.mcap < 8000 && this.rnd() < 0.3);
    if (died) {
      h.state = 'dead';
      s.hostsKilled++;
    } else {
      h.state = h.strains.some((c) => this.strains.get(c)?.state === 'integrated') ? 'lysogenic' : h.strains.length ? 'infected' : 'healthy';
    }
    s.state = 'lysed';
    s.vault = 0;
    s.lastActiveAt = now;
    // children
    const children: Strain[] = [];
    for (let i = 0; i < RULES.childrenPerLysis; i++) {
      const letter = String.fromCharCode(65 + (s.children.length % 26));
      const c = this.makeStrain({
        name: `${root.name}-${s.generation + 1}${letter}`,
        ticker: `${root.ticker}${s.generation + 1}${letter}`,
        generation: s.generation + 1,
        parentCa: s.ca,
        path: 'lysis',
        ownerWallet: s.ownerWallet,
        narrativeTag: s.narrativeTag,
        bornAt: now,
        launchCost: s.launchCost,
        params: mutate(s.params, () => this.rnd()),
      });
      c.lineageId = s.lineageId;
      c.vault = (vault * (1 - RULES.lysisLauncherCut)) / RULES.childrenPerLysis;
      s.children.push(c.ca);
      children.push(c);
    }
    this.emit(
      this.mkEvent('lyse', s, h, vault, now, {
        children: children.map((c) => c.ca),
        launcherCut: vault * RULES.lysisLauncherCut,
        died,
        pressure,
      }),
    );
    this.emit({ ...this.mkEvent('immunize', s, h, undefined, now), txSig: undefined });
    this.checkExtinction(s.lineageId, now);
  }

  private expire(s: Strain, now: number) {
    s.state = 'expired';
    const returned = s.vault;
    s.vault = 0;
    this.emit(this.mkEvent('expire', s, undefined, returned, now));
  }

  checkExtinction(lineageId: string, now: number) {
    if (this.extinct.has(lineageId)) return;
    const { compatible, immune } = this.herd(lineageId);
    if (compatible > 0 && immune / compatible >= RULES.herdImmunity) {
      const cause = `herd immunity · ${Math.round((immune / compatible) * 100)}% of ${compatible} compatible hosts immune`;
      this.extinct.set(lineageId, { at: now, cause });
      const root = this.strains.get(lineageId)!;
      const members: string[] = [];
      for (const s of this.strains.values()) {
        if (s.lineageId !== lineageId) continue;
        members.push(s.ca);
        if (s.state === 'active' || s.state === 'dormant') {
          if (s.hostCa) {
            const h = this.hosts.get(s.hostCa);
            if (h) {
              h.strains = h.strains.filter((c) => c !== s.ca);
              if (h.state === 'infected' && h.strains.length === 0) h.state = 'healthy';
            }
          }
          s.state = 'expired';
          s.vault = 0;
        }
      }
      this.emit(this.mkEvent('extinct', root, undefined, undefined, now, { cause, members }));
    }
  }

  private randomLaunch(now: number) {
    // a stranger launches a brand-new lineage
    const tag = this.pick(TAGS);
    const name = this.nextLineageName();
    const path: Path = this.rnd() < 0.25 ? 'lysogeny' : 'lysis';
    const s = this.makeStrain({ name, ticker: name, generation: 0, path, ownerWallet: this.ca(), narrativeTag: tag, bornAt: now, launchCost: RULES.launchCost });
    s.lineageId = s.ca;
    s.dormant = this.rnd() < 0.2;
    const eligible = this.eligibleHosts(s);
    if (eligible.length === 0) {
      this.strains.delete(s.ca);
      return;
    }
    eligible.sort((a, b) => b.score - a.score);
    const host = eligible[Math.floor(Math.pow(this.rnd(), 2) * eligible.length)].host;
    if (s.dormant) s.trigger = this.randomTrigger(host, now);
    this.attach(s, host, now);
  }

  private randomImmunityPurchase(now: number) {
    const candidates = [...this.hosts.values()].filter((h) => h.state !== 'dead' && !h.immuneUntil && h.mcap > 20000);
    if (!candidates.length) return;
    const h = this.pick(candidates);
    this.buyImmunity(h.ca, h.devWallet, now, false);
  }

  // ---------- user actions ----------
  buyImmunity(hostCa: string, wallet: string, now = Date.now(), publish = true): ImmunityPurchase | null {
    const h = this.hosts.get(hostCa);
    if (!h || h.state === 'dead') return null;
    const price = immunityPrice(h.mcap);
    const until = now + RULES.immunityWindow;
    h.immuneUntil = until;
    const p: ImmunityPurchase = { id: this.id(), at: now, hostCa, wallet, virusPaid: price, until, txSig: this.tx() };
    this.immunityPurchases.unshift(p);
    this.virusBurnedTotal += price;
    const anchor = h.strains[0] ? this.strains.get(h.strains[0]) : undefined;
    this.emit({
      id: this.id(),
      kind: 'immunize',
      strainCa: anchor?.ca ?? 'hub',
      hostCa,
      amount: price,
      text: `$${h.ticker} bought a 24h immunity window · ${price.toLocaleString()} $VIRUS burned`,
      txSig: p.txSig,
      at: now,
      meta: { purchase: true },
    });
    if (publish) this.publish();
    return p;
  }

  launchStrain(input: {
    name: string;
    ticker: string;
    image?: string;
    hostCa: string;
    path: Path;
    trigger?: DormancyTrigger;
    devBuy?: number;
    ownerWallet: string;
  }): Strain | null {
    const now = Date.now();
    const h = this.hosts.get(input.hostCa);
    if (!h) return null;
    const s = this.makeStrain({
      name: input.name.toUpperCase(),
      ticker: input.ticker.toUpperCase(),
      generation: 0,
      path: input.path,
      ownerWallet: input.ownerWallet,
      narrativeTag: h.narrativeTag,
      bornAt: now,
      launchCost: RULES.launchCost,
      image: input.image,
    });
    s.lineageId = s.ca;
    s.vault = (input.devBuy ?? 0) * 0.5 + RULES.strainReserve;
    if (input.trigger) {
      s.dormant = true;
      s.trigger = input.trigger;
    }
    this.attach(s, h, now);
    this.publish();
    return s;
  }

  // ---------- hub ritual ----------
  private burn(now: number) {
    const solIn = this.pendingBurnSol;
    this.pendingBurnSol = 0;
    const price = VIRUS_PER_SOL * (0.85 + this.rnd() * 0.3);
    const bought = Math.round(solIn * price);
    const b: Burn = { id: this.id(), at: now, solIn, virusBought: bought, virusBurned: bought, txSig: this.tx() };
    this.burns.unshift(b);
    this.virusBurnedTotal += bought;
    this.nextBurnAt = Math.ceil((now + 1) / this.burnIntervalMs) * this.burnIntervalMs;
    this.emit({ id: this.id(), kind: 'burn', strainCa: 'hub', amount: solIn, text: `BURN · ${fmtSol(solIn)} SOL → ${bought.toLocaleString()} $VIRUS bought and burned`, txSig: b.txSig, at: now, meta: { virusBurned: bought } });
  }

  private samplePopulation(now: number) {
    const live = [...this.strains.values()].filter((s) => s.state === 'active' || s.state === 'dormant');
    const n = Math.max(1, live.length);
    const avg = (f: (s: Strain) => number) => live.reduce((a, s) => a + f(s), 0) / n;
    this.population.push({
      t: now,
      extractionRate: avg((s) => s.params.extractionRate),
      lysisThreshold: avg((s) => s.params.lysisThreshold),
      compatibilityRange: avg((s) => s.params.compatibilityRange),
      virulence: avg((s) => s.virulence),
      activeStrains: live.length,
    });
    if (this.population.length > 400) this.population.shift();
  }

  // ---------- snapshot ----------
  lineages(): Lineage[] {
    const out: Lineage[] = [];
    for (const root of this.strains.values()) {
      if (root.generation !== 0) continue;
      const members = [...this.strains.values()].filter((s) => s.lineageId === root.ca);
      const herd = this.herd(root.ca);
      const ext = this.extinct.get(root.ca);
      out.push({
        id: root.ca,
        name: root.name,
        ticker: root.ticker,
        rootCa: root.ca,
        narrativeTag: root.narrativeTag,
        ownerWallet: root.ownerWallet,
        members: members.map((m) => m.ca),
        hostsInfected: members.reduce((a, m) => a + m.hostsInfected, 0),
        hostsKilled: members.reduce((a, m) => a + m.hostsKilled, 0),
        totalExtracted: members.reduce((a, m) => a + m.totalExtracted, 0),
        deepestGeneration: members.reduce((a, m) => Math.max(a, m.generation), 0),
        maxVirulence: members.reduce((a, m) => Math.max(a, m.virulence), 0),
        extinct: !!ext,
        extinctAt: ext?.at,
        extinctCause: ext?.cause,
        compatibleHosts: herd.compatible,
        immuneHosts: herd.immune,
      });
    }
    return out;
  }

  stats(): Stats {
    let hostsInfected = 0;
    for (const h of this.hosts.values()) if (h.strains.length > 0 || h.lysisSurvived > 0) hostsInfected++;
    let activeStrains = 0;
    let solExtracted = 0;
    for (const s of this.strains.values()) {
      if (s.state === 'active' || s.state === 'dormant' || s.state === 'integrated') activeStrains++;
      solExtracted += s.totalExtracted;
    }
    return {
      hostsInfected,
      activeStrains,
      solExtracted,
      virusBurned: this.virusBurnedTotal,
      lineagesExtinct: this.extinct.size,
      nextBurnAt: this.nextBurnAt,
    };
  }

  snapshot(): WorldSnapshot {
    if (this.snapshotCache) return this.snapshotCache;
    const snap: WorldSnapshot = {
      hosts: [...this.hosts.values()].map((h) => ({ ...h, strains: [...h.strains], immuneTo: [...h.immuneTo] })),
      strains: [...this.strains.values()].map((s) => ({ ...s, children: [...s.children], params: { ...s.params } })),
      events: [...this.events],
      burns: [...this.burns],
      immunityPurchases: [...this.immunityPurchases],
      lineages: this.lineages(),
      stats: this.stats(),
      population: [...this.population],
      pendingBurnSol: this.pendingBurnSol,
      version: this.version,
      now: Date.now(),
    };
    this.snapshotCache = snap;
    return snap;
  }
}

export function fmtSol(x: number): string {
  if (x >= 100) return x.toFixed(1);
  if (x >= 1) return x.toFixed(3);
  return x.toFixed(4);
}

export function describeTrigger(t?: DormancyTrigger): string {
  if (!t) return 'none';
  if (t.kind === 'mcap') return `host mcap ≥ $${Math.round(t.value).toLocaleString()}`;
  if (t.kind === 'devsell') return `host dev sells ≥ ${Math.round(t.value * 100)}%`;
  return `timestamp ${new Date(t.value).toISOString().replace('T', ' ').slice(0, 19)} UTC`;
}

/** singleton for the browser; a fresh instance per request on the server */
let browserSim: Simulator | null = null;
export function getSim(): Simulator {
  if (typeof window === 'undefined') return new Simulator({ seed: 7 });
  if (!browserSim) {
    browserSim = new Simulator({ seed: 7 });
    browserSim.start();
  }
  return browserSim;
}
