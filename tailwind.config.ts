import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './themes/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: 'var(--c-void)',
        panel: 'var(--c-panel)',
        border: 'var(--c-border)',
        specimen: 'var(--c-specimen)',
        viral: 'var(--c-viral)',
        infection: 'var(--c-infection)',
        immune: 'var(--c-immune)',
        dormant: 'var(--c-dormant)',
        dead: 'var(--c-dead)',
        text: 'var(--c-text)',
        muted: 'var(--c-muted)',
      },
      fontFamily: {
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
        head: ['var(--font-head)', 'system-ui', 'sans-serif'],
      },
      transitionTimingFunction: { bio: 'cubic-bezier(0.4, 0, 0.2, 1)' },
      transitionDuration: { bio: '700ms' },
    },
  },
  plugins: [],
};
export default config;
