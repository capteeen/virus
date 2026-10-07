import { ImageResponse } from 'next/og';
import { Simulator } from '@/lib/sim';
import theme from '@/themes';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OG({ params }: { params: { ca: string } }) {
  const sim = new Simulator({ seed: 7 });
  const h = sim.hosts.get(params.ca);
  const C = theme.palette;
  const badges = h ? h.immuneTo.map((l) => sim.strains.get(l)?.name ?? l.slice(0, 4)) : [];
  const tint = h ? (h.state === 'infected' || h.state === 'lysogenic' ? C.viral : h.state === 'dead' ? C.dead : C.specimen) : C.dead;
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: C.void, color: C.text, fontFamily: 'monospace', padding: 60 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 440, height: '100%', position: 'relative' }}>
          <div style={{ width: 340, height: 340, borderRadius: 999, border: `6px solid ${tint}`, boxShadow: `0 0 140px ${tint}66, inset 0 0 80px ${tint}33`, display: 'flex' }} />
          {h && h.immuneTo.length > 0 && <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: 999, border: `3px solid ${C.immune}`, opacity: 0.8 }} />}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, paddingLeft: 40 }}>
          <div style={{ fontSize: 18, letterSpacing: 4, color: C.muted }}>{`${theme.name} · ${theme.target.toUpperCase()}`}</div>
          <div style={{ fontSize: 72, fontWeight: 700, marginTop: 8 }}>{h ? `$${h.ticker}` : 'UNKNOWN'}</div>
          {h && (
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 24, fontSize: 24, gap: 10 }}>
              <div style={{ display: 'flex' }}><span style={{ color: C.muted, width: 260 }}>state</span><span style={{ color: tint }}>{h.state}</span></div>
              <div style={{ display: 'flex' }}><span style={{ color: C.muted, width: 260 }}>infections</span><span>{`${h.strains.length} attached · ${h.lysisSurvived} lyses survived`}</span></div>
              <div style={{ display: 'flex' }}><span style={{ color: C.muted, width: 260 }}>taken</span><span style={{ color: C.viral }}>{`${h.totalExtracted.toFixed(3)} SOL`}</span></div>
              <div style={{ display: 'flex' }}><span style={{ color: C.muted, width: 260 }}>immune to</span><span style={{ color: C.immune }}>{badges.length ? badges.join(' · ') : 'nothing'}</span></div>
            </div>
          )}
          <div style={{ marginTop: 32, fontSize: 16, color: C.muted }}>{theme.site.domain}</div>
        </div>
      </div>
    ),
    size,
  );
}
