import type { Theme } from './types';

export const virusTheme: Theme = {
  id: 'virus',
  name: 'VIRUS',
  unit: 'strain',
  target: 'host',
  holder: 'carrier',
  lineage: 'lineage',
  verbs: { attach: 'infect', extract: 'extract', burst: 'lyse', integrate: 'integrate' },
  hubToken: '$VIRUS',
  hubRitual: 'burn',
  hubRitualLabel: 'BURN',
  hubSplit: { burn: 1.0 },
  feeToHub: 0.2,
  palette: {
    void: '#06080A',
    panel: '#0D1117',
    border: '#1C2430',
    specimen: '#4DD0E1',
    viral: '#E91E63',
    infection: '#FF3B30',
    immune: '#F0F4F8',
    dormant: '#7C4DFF',
    dead: '#3A4049',
    text: '#D7DEE6',
    muted: '#6B7684',
    light: {
      void: '#FAFBFC',
      panel: '#FFFFFF',
      border: '#D9DEE5',
      specimen: '#007C91',
      viral: '#B0003A',
      infection: '#D32F2F',
      immune: '#1B2430',
      dormant: '#5E35B1',
      dead: '#9AA3AE',
      text: '#1B2430',
      muted: '#6B7684',
    },
  },
  fonts: { mono: 'JetBrains Mono', head: 'Space Grotesk', headWeight: 600 },
  shape: 'circle',
  scene: 'field',
  copy: {
    eyebrow: 'A coin that cannot live alone',
    tagline:
      'Name a host. Attach to it. Divert a slice of its creator fees. Then choose, once and forever, whether to burst it or to live inside it.',
    steps: [
      {
        title: 'Find a host.',
        body: "Pick an existing coin you're compatible with. You can't launch without one.",
      },
      {
        title: 'Infect it.',
        body: "Your virus launches on pump.fun and starts diverting a slice of the host's creator fees.",
      },
      {
        title: 'Choose your nature.',
        body: "Lysis: extract, burst, spawn three children. Lysogeny: integrate forever and share the host's fees.",
      },
      {
        title: 'Survive selection.',
        body: 'Virulent strains run out of hosts. Immune hosts end lineages. Only sustainable strains last.',
      },
    ],
    features: [
      {
        title: 'Virulence is public.',
        body: 'Every strain carries a 0–100 score computed from what it has taken and what it has killed. High virulence shrinks the pool of hosts it may touch.',
      },
      {
        title: 'Hosts fight back.',
        body: 'Survive a lysis and you are immune to that lineage forever. Enough immune hosts and the lineage goes extinct.',
      },
      {
        title: 'Everything burns.',
        body: '20% of all extraction buys $VIRUS every hour and burns 100% of it. No distribution. The metaphor is destruction.',
      },
    ],
    paths: {
      burst: {
        title: 'LYSIS',
        launcher:
          'When the vault reaches 3× your launch cost, the strain sells its entire position, you receive 40% of the vault, and it spawns three mutated children. You own 25% of each child.',
        target:
          'The host absorbs the full sell pressure of the dump. It records a lysis event and becomes permanently immune to your lineage.',
      },
      integrate: {
        title: 'LYSOGENY',
        launcher:
          'Extraction stops immediately. Your strain earns 3% of host creator fees forever, split 50% to you and 50% to strain holders. Virulence stays at 0.',
        target:
          'Every current host holder is airdropped your strain pro-rata. Every future host buyer receives it automatically. The host keeps 97% of its fees.',
      },
    },
    footer:
      'Coins launch on pump.fun (Solana). A meme, not an investment. Crypto is risky. Only use what you can afford to lose.',
  },
  states: {
    healthy: 'healthy',
    infected: 'infected',
    lysogenic: 'lysogenic',
    dead: 'dead',
    dormant: 'dormant',
    immune: 'immune',
    extinct: 'extinct',
  },
  site: { title: 'VIRUS', domain: 'virusonchain.fun' },
};

export default virusTheme;
