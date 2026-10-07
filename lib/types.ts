export type HostState = 'healthy' | 'infected' | 'lysogenic' | 'dead';
export type StrainState = 'dormant' | 'active' | 'lysed' | 'integrated' | 'expired';
export type Path = 'lysis' | 'lysogeny';
export type EventKind =
  | 'infect'
  | 'extract'
  | 'lyse'
  | 'integrate'
  | 'activate'
  | 'immunize'
  | 'expire'
  | 'extinct'
  | 'burn';

export interface Host {
  ca: string;
  name: string;
  ticker: string;
  image: string;
  mcap: number; // USD
  holders: number;
  narrativeTag: string;
  strains: string[]; // strain CAs attached (visible only — dormant strains are hidden from public views)
  totalExtracted: number; // SOL
  lysisSurvived: number;
  immuneTo: string[]; // lineageIds
  immuneUntil?: number; // purchased 24h window (ms epoch)
  state: HostState;
  /** cumulative extraction samples for the chart */
  history: { t: number; v: number }[];
  /** who the dev is — used for dev-sell dormancy triggers */
  devWallet: string;
  /** mock: fraction of supply the dev has sold (0–1) */
  devSold: number;
  createdAt: number;
}

export type DormancyTrigger =
  | { kind: 'mcap'; value: number }
  | { kind: 'devsell'; value: number } // fraction 0–1
  | { kind: 'timestamp'; value: number };

export interface StrainParams {
  extractionRate: number; // fraction of host creator fees, e.g. 0.12
  lysisThreshold: number; // SOL, = 3 × launch cost at gen 0
  compatibilityRange: number; // 0–100; strain can attach to hosts scoring ≥ (100 − range)
}

export interface Strain {
  ca: string;
  name: string;
  ticker: string;
  image: string;
  wallet: string; // the strain's own wallet (launches the coin as creator)
  lineageId: string; // CA of patient zero
  generation: number;
  parentCa?: string;
  children: string[];
  hostCa?: string;
  path: Path;
  params: StrainParams;
  vault: number; // SOL currently held
  totalExtracted: number; // SOL ever extracted
  hostsInfected: number;
  hostsKilled: number;
  virulence: number; // 0–100
  dormant: boolean;
  trigger?: DormancyTrigger;
  state: StrainState;
  bornAt: number;
  ownerWallet: string;
  launchCost: number; // SOL
  lastActiveAt: number;
  attachedAt?: number;
  narrativeTag: string;
  /** mock: host CAs ever infected by this strain */
  hostHistory: string[];
}

export interface SimEvent {
  id: string;
  kind: EventKind;
  strainCa: string;
  hostCa?: string;
  amount?: number;
  text: string;
  txSig?: string;
  at: number;
  /** extra payload for animation: children CAs on lyse, lineage on extinct */
  meta?: Record<string, unknown>;
}

export interface Burn {
  id: string;
  at: number;
  solIn: number;
  virusBought: number;
  virusBurned: number;
  txSig: string;
}

export interface ImmunityPurchase {
  id: string;
  at: number;
  hostCa: string;
  wallet: string;
  virusPaid: number;
  until: number;
  txSig: string;
}

export interface Stats {
  hostsInfected: number;
  activeStrains: number;
  solExtracted: number;
  virusBurned: number;
  lineagesExtinct: number;
  nextBurnAt: number;
}

export interface Lineage {
  id: string;
  name: string;
  ticker: string;
  rootCa: string;
  narrativeTag: string;
  ownerWallet: string;
  members: string[];
  hostsInfected: number;
  hostsKilled: number;
  totalExtracted: number;
  deepestGeneration: number;
  maxVirulence: number;
  extinct: boolean;
  extinctAt?: number;
  extinctCause?: string;
  /** herd immunity progress */
  compatibleHosts: number;
  immuneHosts: number;
}

export interface PopulationSample {
  t: number;
  extractionRate: number;
  lysisThreshold: number;
  compatibilityRange: number;
  virulence: number;
  activeStrains: number;
}

export interface WorldSnapshot {
  hosts: Host[];
  strains: Strain[];
  events: SimEvent[];
  burns: Burn[];
  immunityPurchases: ImmunityPurchase[];
  lineages: Lineage[];
  stats: Stats;
  population: PopulationSample[];
  pendingBurnSol: number;
  version: number;
  now: number;
}
