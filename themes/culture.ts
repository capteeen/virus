import type { Theme } from './types';

/**
 * CULTURE — bacteria in a petri dish.
 * Same engine, different organism. Colonies grow as organic blobs, a strain
 * "inoculates" a dish, grows by metabolising the dish's fees, and either
 * divides by binary fission (burst) or forms a permanent biofilm (integrate).
 * Quorum sensing replaces herd immunity as the label for the extinction rule.
 */
export const cultureTheme: Theme = {
  id: 'culture',
  name: 'CULTURE',
  unit: 'colony',
  target: 'dish',
  holder: 'culturist',
  lineage: 'clade',
  verbs: { attach: 'inoculate', extract: 'metabolise', burst: 'divide', integrate: 'biofilm' },
  hubToken: '$AGAR',
  hubRitual: 'sterilise',
  hubRitualLabel: 'AUTOCLAVE',
  hubSplit: { burn: 1.0 },
  feeToHub: 0.2,
  palette: {
    void: '#070A06',
    panel: '#0E130C',
    border: '#1F2B1A',
    specimen: '#C6E86A',
    viral: '#FFB300',
    infection: '#FF6D00',
    immune: '#F4F8F0',
    dormant: '#26C6DA',
    dead: '#3E4638',
    text: '#DDE6D2',
    muted: '#7A8670',
    light: {
      void: '#FBFCF8',
      panel: '#FFFFFF',
      border: '#DCE3D2',
      specimen: '#4F7A00',
      viral: '#B36B00',
      infection: '#D84315',
      immune: '#1E2A16',
      dormant: '#00838F',
      dead: '#9AA394',
      text: '#1E2A16',
      muted: '#7A8670',
    },
  },
  fonts: { mono: 'IBM Plex Mono', head: 'Syne', headWeight: 700 },
  shape: 'blob',
  scene: 'dish',
  copy: {
    eyebrow: 'A coin that grows on others',
    tagline:
      'Pick a dish. Inoculate it. Metabolise a slice of its creator fees. Then choose, once and forever, whether to divide or to settle into a biofilm.',
    steps: [
      { title: 'Find a dish.', body: "Pick an existing coin whose medium you can grow on. You can't launch without one." },
      { title: 'Inoculate it.', body: "Your colony launches on pump.fun and starts metabolising a slice of the dish's creator fees." },
      { title: 'Choose your nature.', body: 'Fission: metabolise, divide, spawn three daughter colonies. Biofilm: settle forever and share the dish.' },
      { title: 'Survive selection.', body: 'Greedy clades exhaust their dishes. Resistant dishes end clades. Only sustainable colonies last.' },
    ],
    features: [
      { title: 'Appetite is public.', body: 'Every colony carries a 0–100 score from what it has consumed and what it has exhausted. High appetite shrinks the dishes it may grow on.' },
      { title: 'Dishes resist.', body: 'Survive a fission and the dish is resistant to that clade forever. Enough resistant dishes and the clade dies out by quorum.' },
      { title: 'Everything is autoclaved.', body: '20% of all metabolism buys $AGAR every hour and sterilises 100% of it.' },
    ],
    paths: {
      burst: {
        title: 'FISSION',
        launcher: 'When the vault reaches 3× your launch cost, the colony sells its entire position, you receive 40% of the vault, and it divides into three daughter colonies. You own 25% of each.',
        target: 'The dish absorbs the full sell pressure. It records a fission event and becomes permanently resistant to your clade.',
      },
      integrate: {
        title: 'BIOFILM',
        launcher: 'Metabolism stops immediately. Your colony earns 3% of dish creator fees forever, split 50% to you and 50% to colony holders. Appetite stays at 0.',
        target: 'Every current dish holder is airdropped your colony pro-rata. Every future buyer receives it automatically. The dish keeps 97% of its fees.',
      },
    },
    footer: 'Coins launch on pump.fun (Solana). A meme, not an investment. Crypto is risky. Only use what you can afford to lose.',
  },
  states: {
    healthy: 'sterile',
    infected: 'colonised',
    lysogenic: 'biofilm',
    dead: 'exhausted',
    dormant: 'spore',
    immune: 'resistant',
    extinct: 'died out',
  },
  site: { title: 'CULTURE', domain: 'cultureonchain.fun' },
};

export default cultureTheme;
