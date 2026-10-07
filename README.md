# VIRUS — coins that cannot live alone

A coin that must name a **host** (an existing coin) before it can launch. It attaches to the host, diverts a slice of the host's creator fees into its own vault, and makes one irreversible choice: **lysis** (extract, burst, spawn three children) or **lysogeny** (integrate forever, share the host's fees). Virulence is public and limits who you can infect. Hosts that survive gain immunity. Enough immunity and a lineage goes extinct. 20% of all extraction buys `$VIRUS` hourly and burns 100% of it.

Structurally a sibling of villageonchain / colonyonchain / spreadonchain (hub token, 20% fee route, hourly ritual, one-screen mechanic), built as an **engine** with VIRUS as the first theme.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
npm run typecheck && npm run lint
```

No backend, no env vars required. The field is alive on first load from the Phase 1 simulator.

Optional:

- `NEXT_PUBLIC_THEME=culture` — swap to the second theme at build time (or edit one import in `themes/index.ts`).
- `NEXT_PUBLIC_RPC` — Solana RPC for the wallet adapter (defaults to mainnet-beta public).
- `NEXT_PUBLIC_SITE_URL` — `metadataBase` for OG images.

## What is here

| Path | Purpose |
| --- | --- |
| `themes/types.ts` | The `Theme` contract: nouns, verbs, hub token, ritual, split, palette, fonts, shape, scene, copy. |
| `themes/virus.ts` | VIRUS theme (strain / host / carrier, infect / extract / lyse / integrate, `$VIRUS`, burn, dark-field palette). |
| `themes/culture.ts` | CULTURE theme (colony / dish / culturist, inoculate / metabolise / divide / biofilm, `$AGAR`, autoclave). Proves the engine generalizes by swapping one import. |
| `themes/index.ts` | The one-line swap. |
| `lib/types.ts` | Data model: `Host`, `Strain`, `Event`, `Burn`, `Stats`, `Lineage`, snapshot. |
| `lib/rules.ts` | Every mechanical rule as pure functions: compatibility, virulence pool rule, virulence score + decay, mutation, immunity price, thresholds. No LLM in the money path. All constants in `RULES`, all shown on `/how`. |
| `lib/sim.ts` | Phase 1 mock simulator (see below). |
| `components/Field.tsx` | The dark-field 3D canvas (Three.js + postprocessing). |
| `components/field/shaders.ts` | Cell shader (rim light, subsurface approximation, atlas-mapped host image, speckle, halo, swell, flash) and particle shader. |
| `components/Specimen.tsx` | Single-cell / single-particle 3D render for host and strain pages. |
| `components/LineageTree.tsx` | d3-force lineage tree, click a node → strain page. |
| `components/Charts.tsx` | lightweight-charts wrappers (cyan on black). |
| `components/TransmissionLog.tsx` | TanStack-Virtual event log, every row with a tx link. |
| `app/*` | Pages: `/`, `/field`, `/host/[ca]`, `/strain/[ca]`, `/infect`, `/lineages`, `/immunity`, `/burns`, `/how`, `/me`, `/stats`, plus OG images per host and per strain. |
| `store/useSim.ts` | Zustand store: simulator snapshot, wallet, brightfield, sound. |

### The rules (short form; long form on `/how`)

- **Compatibility**: ≥ 15% holder overlap with the launcher's wallet holdings, or a shared narrative tag. Score 0–100. A strain's `compatibilityRange` sets the minimum score it can reach (`100 − range`).
- **Extraction**: `extractionRate` (default 12%) of the host's creator fees per trade. 80% to the strain vault, 20% queued for the hourly burn. Visible on the host page from the first SOL.
- **Lysis**: threshold = 3 × launch cost. On reaching it the strain dumps its position (host takes the sell pressure, can die if it drops under ~$2.5k), launcher takes 40% of the vault, three children spawn with mutated params (launcher owns 25% of each), host becomes permanently immune to the lineage.
- **Lysogeny**: irreversible at launch. Extraction stops. Supply airdropped pro-rata to all host holders and future buyers. 3% of host creator fees forever, 50/50 launcher and strain holders. Virulence pinned at 0.
- **Virulence**: `(SOL extracted / hosts) × (hosts killed + 1)`, normalized so raw 6 = 100, minus 5 points per day idle. > 60 halves the compatible pool. > 85 only hosts under $10k.
- **Latency**: optional. Dormant strains are not in `host.strains`, not in the field, not in the lineage tree, and `/strain/[ca]` 404s for everyone but the launcher. On trigger (mcap ≥ X, dev sells ≥ Y%, timestamp) they appear with a red flash.
- **Immunity**: surviving a lysis → permanent lineage immunity + badge. Any host can burn `$VIRUS` for a 24h window (`500 + 12·√mcap`). **Herd immunity**: ≥ 60% of a lineage's compatible hosts immune → lineage extinct, every live member expires.
- **Mutation**: children drift `extractionRate` ± 4 points, `lysisThreshold` and `compatibilityRange` ± 15%. A child with no host after 24h expires and returns its vault.
- **Hub ritual**: hourly, on the hour, UTC. 20% of extraction → buy `$VIRUS` on Jupiter → burn 100%. Posted with tx on `/burns`.

### Phase 1 — the simulator (`lib/sim.ts`)

Deterministic (mulberry32, seed 7). Seeds 120 hosts (log-uniform mcap $2k–$8M, 10 narrative tags) and 40 strains across 6 lineages with pre-history: lysed ancestors, integrated lysogens, hunting children, 5 dormant strains with live triggers, and one lineage (REOVIR) seeded one lysis short of herd immunity.

Every 2–5 s a tick: market drift, extraction ticks, lysis threshold checks, dormancy triggers, one major action (a hunter attaches / a stranger launches a new lineage / a host buys immunity), expiries, immunity windows lapsing, virulence recompute, burn when due (every 60 s in mock), a population sample every 8 ticks.

Mock time scale: 1 "day" = 120 s (expiry, virulence decay); burn every 60 s. A headless run of 10 simulated minutes produces: first lysis at ~40 s, first extinction at ~60 s, activations, expiries, integrations, 10 burns. Visible particles plateau around 120 regardless of run length.

Every state change emits exactly one `SimEvent` with a mock tx signature. The field subscribes to that event stream and **only** animates from it:

| Event | Animation |
| --- | --- |
| `infect` | escort particles cross the gap, strain particle travels in, membrane tints magenta (deepens with cumulative extraction) |
| `extract` | cyan thread pulses host → particle |
| `lyse` | cell swells 1.5 s, ruptures into a particle burst, three children shoot outward, cell shrinks and re-forms with a white immunity halo |
| `integrate` | particle merges into the membrane and vanishes, cell gains permanent magenta speckle |
| `activate` | particle appears from nothing with a red flash |
| `extinct` | every particle of the lineage fades out simultaneously |
| `expire` | particle fades |

Rendering: instanced spheres with a custom shader (rim light, subsurface approximation, host image mapped from a 16×16 canvas atlas, additive blending for dark-field), instanced icosahedra for particles, line segments for threads, points for debris. UnrealBloom + depth of field + vignette via `postprocessing`. Pixel ratio capped at 1.5, one draw call per layer. Drag to pan, wheel/pinch to zoom, click a cell → host page, click a particle → strain page. Brightfield mode switches blending and clear colour.

### Wallet

Solana wallet adapter with Phantom and Solflare adapters explicitly; Backpack and any other Wallet-Standard wallet is auto-detected. `/infect`, `/host/[ca]` (buy immunity) and `/me` are wired to the connected public key. Launch and immunity purchase are mocked: a short "signing…" delay then the simulator mutates state and emits the event.

## Phase 2 — going on-chain (TODO)

Everything below is stubbed with a comment at the call site. The data model, `lib/rules.ts` and the event stream shape stay; the tick loop is replaced by workers.

1. **Launch** — `/infect` collects `launchCost + reserve + dormancyFee + devBuy` into a fresh strain keypair's wallet. A worker launches the coin on pump.fun through PumpPortal's local-tx `create` with the strain keypair as creator (so creator fees accrue to the strain wallet), uploads image + description to IPFS via PumpPortal, applies the dev buy, and writes `Strain` + an `infect` event with the real tx.
2. **Compatibility** — holder overlap via Helius DAS: `getAssetsByOwner` for the launcher wallet, `getTokenAccounts` (by mint) for the host. Overlap = share of the launcher's held mints that the host's holder set also holds, cached per (wallet, host) for 10 min. Narrative tags come from a curated tag table keyed by CA with a fallback classifier that only affects compatibility, never money.
3. **Extraction** — see the open question below. Chosen approach: **creator-fee split where the host opted in, otherwise the strain's own fee stream plus programmatic host buys.** Concretely: (a) opted-in hosts register a fee-split rule; the worker claims the host's pump.fun creator fees with the host's delegated authority and transfers `extractionRate` to the strain vault each claim; (b) non-opted-in hosts cannot have fees taken from them, so the strain's "extraction" is its own creator fees, and `extractionRate` of those fees is spent buying the host token into the strain vault (the strain becomes a real holder of its host, and its later lysis sells that position into the host). Both paths are labelled on the host page so nobody mistakes (b) for (a).
4. **Lysis** — worker watches vault balance; at threshold it sells the vault's host position and the strain's own token position via PumpPortal `sell`, pays 40% to the launcher, creates three child keypairs with mutated params, funds each with 20% of the vault, writes `lyse` + `immunize` events.
5. **Lysogeny** — on launch, snapshot host holders (DAS), airdrop strain supply pro-rata (compressed transfers batched), register a Helius webhook on host token transfers to airdrop to new buyers, route 3% of host creator fees (opt-in path only) 50/50.
6. **Hourly burn** — cron on the hour UTC: sum the 20% queue, swap SOL → `$VIRUS` through Jupiter `/swap`, `burn` the full amount, write the `Burn` row with tx.
7. **Immunity purchases** — client builds a `$VIRUS` burn instruction for `immunityPrice(mcap)`, the server verifies the burn tx and sets `immuneUntil`.
8. **Dormancy triggers** — Helius webhooks: host token transfers (dev-wallet sells, computed as share of dev's initial balance), price feed for mcap triggers, a cron for timestamps. On trigger the worker flips state and emits `activate`.
9. **Herd immunity / expiry / virulence decay** — a minute cron recomputes `herd()` per lineage, expires 24h-hostless children (returning vaults pro-rata to holders by snapshot), and decays virulence.

Storage: Postgres with the same shapes as `lib/types.ts`; events as an append-only table; the client swaps `getSim()` for an SSE stream of `SimEvent` + periodic snapshots. Nothing in the UI needs to change.

## Open question

The prompt referenced an open question that did not arrive with it, so this covers the one Phase 2 forces: **can a virus really divert a host's creator fees without the host's consent?**

On pump.fun, creator fees are claimable only by the creator wallet. A third party cannot take them. So "extraction" can only be literal where the host's creator signs a delegation (opt-in). For every other host the honest options are:

- **Own-fee-stream + host buys** (chosen for Phase 2): the strain spends a slice of *its own* creator fees buying the host, so it is a real holder that later dumps. The host feels the lysis (sell pressure) but never loses fees. The number shown as "taken from this host" is then SOL the strain *put into* the host and later pulled out, which is a different statement, and the UI must say so.
- **Opt-in only**: only hosts that delegate fee claims can be infected. Honest, but the board starts empty and the atmosphere ("any host may already be infected") is gone.
- **Volume-tax on the strain side**: the strain's own trading fee is set high and framed as "the host's fees" — this is misdirection and is rejected.

The product's promise, "every host page states plainly how much has been taken from it and by whom", only holds literally under opt-in. Under the chosen approach the plain statement becomes "how much this strain has moved through the host and what it sold on lysis." Decide which sentence the host page should carry before Phase 2 ships.

## Licence / disclaimer

Coins launch on pump.fun (Solana). A meme, not an investment. Crypto is risky. Only use what you can afford to lose.
