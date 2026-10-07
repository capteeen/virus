/**
 * THEME ENGINE
 * A Theme is pure configuration. Mechanics (compatibility, extraction, the two
 * paths, virulence, immunity, mutation, the hub ritual) live in /lib and are
 * theme-agnostic. Swapping the import in /themes/index.ts re-skins every page,
 * every verb, the palette, the fonts and the 3D scene.
 */

export interface ThemePalette {
  void: string;
  panel: string;
  border: string;
  specimen: string; // healthy unit colour (cell / colony)
  viral: string; // attacker colour
  infection: string; // alert / damage
  immune: string; // resistant / white
  dormant: string; // latent
  dead: string;
  text: string;
  muted: string;
  /** optional light "brightfield" variant */
  light?: Partial<Omit<ThemePalette, 'light'>>;
}

export interface ThemeFonts {
  /** Google Fonts family name for numbers, addresses, logs, labels */
  mono: string;
  /** Google Fonts family name for headings */
  head: string;
  headWeight: number;
}

export interface ThemeCopy {
  eyebrow: string;
  tagline: string;
  /** the one-screen core loop, exactly 4 */
  steps: { title: string; body: string }[];
  /** three feature callouts */
  features: { title: string; body: string }[];
  /** the two irreversible paths */
  paths: {
    burst: { title: string; launcher: string; target: string };
    integrate: { title: string; launcher: string; target: string };
  };
  footer: string;
}

export interface Theme {
  id: string;
  name: string;
  /** what the launched coin is called */
  unit: string;
  /** what it attaches to */
  target: string;
  /** what a holder of the target is called */
  holder: string;
  /** a group sharing a common ancestor */
  lineage: string;
  verbs: {
    attach: string; // infect / inoculate
    extract: string; // extract / metabolise
    burst: string; // lyse / fission
    integrate: string; // integrate / biofilm
  };
  hubToken: string;
  hubRitual: string; // burn / sterilise
  hubRitualLabel: string; // display label for countdown
  hubSplit: { burn: number; distribute?: number };
  feeToHub: number; // 0.2
  palette: ThemePalette;
  fonts: ThemeFonts;
  shape: 'circle' | 'blob';
  scene: 'field' | 'dish';
  copy: ThemeCopy;
  /** nouns for states */
  states: {
    healthy: string;
    infected: string;
    lysogenic: string;
    dead: string;
    dormant: string;
    immune: string;
    extinct: string;
  };
  /** site title / domain hint */
  site: { title: string; domain: string };
}
