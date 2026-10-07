import theme from '@/themes';
import { HUB_CA } from '@/lib/sim';

export default function Footer() {
  return (
    <footer className="rule mt-20">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-4 py-8 text-[11px] text-muted md:flex-row md:items-center md:justify-between">
        <p>{theme.copy.footer}</p>
        <p className="num">
          {theme.hubToken} · <span className="text-text">{HUB_CA.slice(0, 6)}…{HUB_CA.slice(-6)}</span> · {theme.site.domain}
        </p>
      </div>
    </footer>
  );
}
