/**
 * MECHANICAL RULES — no LLM in the money path. Everything here is public on /how.
 * Pure functions over the data model; the simulator (phase 1) and the chain
 * workers (phase 2) both call these.
 */
import type { Host, Strain, StrainParams } from './types';

export const RULES = {
  /** minimum holder overlap (%) for compatibility, unless narrative tag matches */
  minOverlap: 15,
  /** default fraction of host creator fees diverted per trade */
  defaultExtractionRate: 0.12,
  /** absolute drift of extractionRate in children (percentage points) */
  extractionDrift: 0.04,
  /** relative drift of lysisThreshold / compatibilityRange in children */
  paramDrift: 0.15,
  /** lysis threshold multiple of launch cost */
  lysisMultiple: 3,
  /** launcher's cut of a lysed vault */
  lysisLauncherCut: 0.4,
  /** launcher's ownership of each child */
  childOwnership: 0.25,
  /** children spawned per lysis */
  childrenPerLysis: 3,
  /** lysogenic strain's perpetual share of host creator fees */
  lysogenyShare: 0.03,
  /** of that share, the launcher's half */
  lysogenyLauncherSplit: 0.5,
  /** virulence thresholds */
  virulenceShrinkAt: 60,
  virulenceShrinkFactor: 0.5,
  virulenceSmallCapAt: 85,
  smallCapCeiling: 10_000,
  /** points of virulence lost per day of inactivity */
  virulenceDecayPerDay: 5,
  /** raw score that maps to 100 */
  virulenceScale: 6,
  /** herd immunity: fraction of compatible hosts immune → lineage extinct */
  herdImmunity: 0.6,
  /** child must find a host within this window or expire */
  childExpiry: 24 * 60 * 60 * 1000,
  /** purchased immunity window */
  immunityWindow: 24 * 60 * 60 * 1000,
  /** share of extraction routed to the hub ritual */
  feeToHub: 0.2,
  /** default launch cost (SOL) and strain reserve */
  launchCost: 0.5,
  strainReserve: 0.1,
  dormancyFee: 0.05,
  defaultCompatibilityRange: 70,
} as const;

/** fnv-1a, deterministic, used for mock holder-overlap */
export function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Holder overlap between a launcher wallet's holdings and a host's holder set.
 * Phase 2: computed from DAS (getAssetsByOwner for the wallet, getTokenAccounts
 * for the host). Phase 1: a deterministic hash so the number is stable.
 */
export function holderOverlap(wallet: string, host: Host): number {
  const h = hash32(wallet + ':' + host.ca);
  // skew hard toward low overlap with a long tail: ~24% of hosts clear the 15% floor
  const u = (h % 10000) / 10000;
  return Math.round(Math.pow(u, 5) * 60);
}

export interface Compatibility {
  score: number; // 0–100
  overlap: number; // %
  tagMatch: boolean;
  eligible: boolean;
  reasons: string[];
}

export function compatibility(
  wallet: string,
  launcherTag: string,
  host: Host,
  lineageId?: string,
  virulence = 0,
  range: number = RULES.defaultCompatibilityRange,
): Compatibility {
  const overlap = holderOverlap(wallet, host);
  const tagMatch = host.narrativeTag === launcherTag;
  // documented on /how: tag match guarantees ≥ 55, otherwise overlap scaled to 0–100
  const base = tagMatch ? Math.max(55, 55 + overlap * 0.75) : Math.min(100, overlap * 1.4);
  const score = Math.round(Math.min(100, base));
  const reasons: string[] = [];
  let eligible = overlap >= RULES.minOverlap || tagMatch;
  if (!eligible) reasons.push(`overlap ${overlap}% < ${RULES.minOverlap}% and no tag match`);
  if (score < 100 - range) {
    eligible = false;
    reasons.push(`score ${score} outside strain range (needs ≥ ${100 - range})`);
  }
  if (lineageId && host.immuneTo.includes(lineageId)) {
    eligible = false;
    reasons.push('host is immune to this lineage');
  }
  if (host.immuneUntil && host.immuneUntil > Date.now()) {
    eligible = false;
    reasons.push('host holds a purchased immunity window');
  }
  if (host.state === 'dead') {
    eligible = false;
    reasons.push('host is dead');
  }
  if (virulence > RULES.virulenceSmallCapAt && host.mcap >= RULES.smallCapCeiling) {
    eligible = false;
    reasons.push(`virulence > ${RULES.virulenceSmallCapAt}: only hosts under $${RULES.smallCapCeiling / 1000}k`);
  }
  return { score, overlap, tagMatch, eligible, reasons };
}

/**
 * Apply the virulence pool rule: above 60 the compatible list is halved
 * (lowest scores dropped). Above 85 only sub-$10k hosts remain (already
 * enforced per-host above).
 */
export function applyVirulencePool<T extends { score: number }>(list: T[], virulence: number): T[] {
  if (virulence <= RULES.virulenceShrinkAt) return list;
  const sorted = [...list].sort((a, b) => b.score - a.score);
  return sorted.slice(0, Math.max(1, Math.floor(sorted.length * RULES.virulenceShrinkFactor)));
}

/**
 * virulence = (total SOL extracted / total hosts) × (hosts killed + 1), normalized 0–100,
 * minus 5 points per day of inactivity. Lysogenic strains are always 0.
 */
export function virulenceOf(s: Pick<Strain, 'totalExtracted' | 'hostsInfected' | 'hostsKilled' | 'path' | 'lastActiveAt'>, now: number): number {
  if (s.path === 'lysogeny') return 0;
  const hosts = Math.max(1, s.hostsInfected);
  const raw = (s.totalExtracted / hosts) * (s.hostsKilled + 1);
  const normalized = Math.min(100, (raw / RULES.virulenceScale) * 100);
  const daysInactive = Math.max(0, (now - s.lastActiveAt) / (24 * 60 * 60 * 1000));
  return Math.max(0, Math.round((normalized - daysInactive * RULES.virulenceDecayPerDay) * 10) / 10);
}

export function virulenceEffect(v: number): string {
  if (v > RULES.virulenceSmallCapAt) return `Above ${RULES.virulenceSmallCapAt}: may only infect hosts under $${RULES.smallCapCeiling / 1000}k mcap.`;
  if (v > RULES.virulenceShrinkAt) return `Above ${RULES.virulenceShrinkAt}: compatible host pool shrinks by 50%.`;
  return 'Full compatible host pool.';
}

export function lysisThresholdFor(launchCost: number): number {
  return launchCost * RULES.lysisMultiple;
}

/** ±4 percentage points on rate, ±15% on threshold and range */
export function mutate(parent: StrainParams, rnd: () => number): StrainParams {
  const drift = (x: number, r: number) => x * (1 + (rnd() * 2 - 1) * r);
  return {
    extractionRate: clamp(parent.extractionRate + (rnd() * 2 - 1) * RULES.extractionDrift, 0.03, 0.3),
    lysisThreshold: Math.max(0.3, drift(parent.lysisThreshold, RULES.paramDrift)),
    compatibilityRange: clamp(Math.round(drift(parent.compatibilityRange, RULES.paramDrift)), 20, 95),
  };
}

/** price of a 24h immunity window in hub tokens, scaling with host mcap */
export function immunityPrice(mcap: number): number {
  return Math.round(500 + Math.sqrt(Math.max(0, mcap)) * 12);
}

export function herdImmunityFraction(immune: number, compatible: number): number {
  return compatible === 0 ? 1 : immune / compatible;
}

export function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}
