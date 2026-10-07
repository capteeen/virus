'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import theme from '@/themes';
import { useSim } from '@/store/useSim';
import Countdown from './Countdown';

const WalletButton = dynamic(() => import('@solana/wallet-adapter-react-ui').then((m) => m.WalletMultiButton), { ssr: false });

const NAV = [
  ['/field', 'field'],
  ['/infect', theme.verbs.attach],
  ['/lineages', theme.lineage + 's'],
  ['/immunity', 'immunity'],
  ['/burns', theme.hubRitual + 's'],
  ['/how', 'how'],
  ['/me', 'me'],
] as const;

export default function Header() {
  const path = usePathname();
  const brightfield = useSim((s) => s.brightfield);
  const toggle = useSim((s) => s.toggleBrightfield);
  const sound = useSim((s) => s.sound);
  const toggleSound = useSim((s) => s.toggleSound);
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-[color-mix(in_srgb,var(--c-void)_82%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-3">
          <span className="inline-block h-3 w-3 rounded-full border-2 border-specimen" />
          <span className="font-head text-base tracking-wide">{theme.name}</span>
        </Link>
        <nav className="hidden items-center gap-5 text-[11px] uppercase tracking-[0.14em] text-muted md:flex">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className={`bio hover:text-text ${path?.startsWith(href) ? 'text-specimen' : ''}`}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden items-center gap-2 text-[11px] text-muted sm:flex">
            <span className="label">next {theme.hubRitualLabel}</span>
            <span className="num text-text">
              <Countdown />
            </span>
          </div>
          <button onClick={toggleSound} className="label bio hidden hover:text-text md:block" title="lab hum">
            {sound ? 'hum on' : 'hum off'}
          </button>
          <button onClick={toggle} className="label bio hover:text-text" title="toggle brightfield">
            {brightfield ? 'darkfield' : 'brightfield'}
          </button>
          <WalletButton />
        </div>
      </div>
      <nav className="flex gap-4 overflow-x-auto px-4 pb-2 text-[11px] uppercase tracking-[0.14em] text-muted md:hidden">
        {NAV.map(([href, label]) => (
          <Link key={href} href={href} className={`whitespace-nowrap ${path?.startsWith(href) ? 'text-specimen' : ''}`}>
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
