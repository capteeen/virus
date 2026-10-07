import theme from '@/themes';

/** Emits the theme palette as CSS variables for dark (default) and light (brightfield) modes. */
export default function ThemeStyle() {
  const p = theme.palette;
  const l = { ...p, ...(p.light ?? {}) };
  const vars = (x: typeof p) =>
    `--c-void:${x.void};--c-panel:${x.panel};--c-border:${x.border};--c-specimen:${x.specimen};--c-viral:${x.viral};--c-infection:${x.infection};--c-immune:${x.immune};--c-dormant:${x.dormant};--c-dead:${x.dead};--c-text:${x.text};--c-muted:${x.muted};`;
  const css = `:root{${vars(p)}--font-mono:'${theme.fonts.mono}';--font-head:'${theme.fonts.head}';--head-weight:${theme.fonts.headWeight};color-scheme:dark}
:root[data-theme="light"]{${vars(l as typeof p)}color-scheme:light}`;
  const fontHref = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(theme.fonts.mono)}:wght@400;500;700&family=${encodeURIComponent(theme.fonts.head)}:wght@${theme.fonts.headWeight}&display=swap`;
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={fontHref} />
      <style dangerouslySetInnerHTML={{ __html: css }} />
    </>
  );
}
