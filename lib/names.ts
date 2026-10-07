/** Word lists for the mock world. */
export const TAGS = ['dog', 'cat', 'frog', 'ai', 'politics', 'food', 'space', 'anime', 'music', 'celeb'] as const;
export type Tag = (typeof TAGS)[number];

export const HOST_WORDS: Record<Tag, string[]> = {
  dog: ['BONK', 'WIF', 'SHIBA', 'PUPPO', 'DOGO', 'HUSKY', 'CORGI', 'WOOF', 'BEAGLE', 'PUG', 'MUTT', 'BARK'],
  cat: ['POPCAT', 'MEW', 'KITTY', 'PURR', 'TABBY', 'SIAM', 'MEOW', 'FELIX', 'CATTO', 'NYAN', 'TOM', 'WHISK'],
  frog: ['PEPE', 'RIBBIT', 'TOAD', 'KEK', 'FROGE', 'HOPPY', 'LILY', 'CROAK', 'NEWT', 'AXOL', 'TADPO', 'BUFO'],
  ai: ['GPTX', 'AGENT', 'NEURON', 'SYNTH', 'TENSOR', 'LLAMA', 'PROMPT', 'TOKEN', 'LOGIT', 'ROBO', 'BYTE', 'ALIGN'],
  politics: ['TREMP', 'BODEN', 'VOTE', 'SENATE', 'MAGA', 'LIBERT', 'KAMA', 'ELECT', 'CAUCUS', 'PUTIN', 'BALLOT', 'POLL'],
  food: ['PIZZA', 'TACO', 'SUSHI', 'RAMEN', 'BAGEL', 'WAFFLE', 'BURGER', 'BOBA', 'DONUT', 'CURRY', 'KIMCHI', 'NOODLE'],
  space: ['MOON', 'MARS', 'ORBIT', 'NEBULA', 'QUASAR', 'ROCKET', 'PLUTO', 'VOID', 'COMET', 'ASTRO', 'LUNA', 'SOLARIS'],
  anime: ['GOKU', 'NARUTO', 'SAILOR', 'MECHA', 'CHIBI', 'WAIFU', 'SENPAI', 'KAWAII', 'OTAKU', 'GUNDAM', 'TOTORO', 'AKIRA'],
  music: ['DRAKE', 'VINYL', 'BEAT', 'SYNTHW', 'TEMPO', 'BASS', 'CHORD', 'RIFF', 'DRUM', 'LOFI', 'ECHO', 'REMIX'],
  celeb: ['ELON', 'KANYE', 'SWIFT', 'OPRAH', 'BEZOS', 'ZUCK', 'KIM', 'TATE', 'SNOOP', 'MRBEAST', 'LOGAN', 'KEANU'],
};

export const LINEAGE_NAMES = ['RHABDO', 'PHAGE', 'CORONA', 'MARBURG', 'PICORNA', 'REOVIR', 'FILO', 'HERPES', 'POXV', 'FLAVI', 'ARENA', 'BUNYA', 'LENTI', 'TOGA', 'ORTHO', 'PARAMYX'];

export const SUFFIXES = ['', '2', 'X', 'AI', 'SOL', 'INU', 'DAO', 'WIF', '420', '69', 'MAX', 'PRO'];

export function svgAvatar(seed: number, text: string, hue: number, kind: 'host' | 'strain'): string {
  const bg = kind === 'host' ? `hsl(${hue},45%,22%)` : `hsl(${hue},80%,30%)`;
  const fg = kind === 'host' ? `hsl(${hue},70%,70%)` : '#fff';
  const r = 30 + (seed % 10);
  const shape =
    kind === 'host'
      ? `<circle cx="32" cy="32" r="${r}" fill="${bg}" stroke="${fg}" stroke-width="2"/>`
      : `<polygon points="32,4 58,19 58,45 32,60 6,45 6,19" fill="${bg}" stroke="${fg}" stroke-width="2"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${shape}<text x="32" y="38" font-family="monospace" font-size="14" font-weight="700" text-anchor="middle" fill="${fg}">${text.slice(0, 4)}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}
