import { ImageResponse } from 'next/og';
import { Simulator } from '@/lib/sim';
import theme from '@/themes';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OG({ params }: { params: { ca: string } }) {
  const sim = new Simulator({ seed: 7 });
  const s = sim.strains.get(params.ca);
  const C = theme.palette;
  const lineage = s ? sim.strains.get(s.lineageId)?.name : undefined;
  const hidden = !s || (s.dormant && s.state === 'dormant');
  // particle render: faceted hexagon-ish silhouette with glow rings
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: C.void, color: C.text, fontFamily: 'monospace', padding: 60 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 440, height: '100%', position: 'relative' }}>
          <div style={{ position: 'absolute', width: 380, height: 380, borderRadius: 999, border: `2px solid ${C.border}` }} />
          <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: 999, boxShadow: `0 0 120px ${C.viral}55` }} />
          <div style={{ width: 200, height: 200, background: hidden ? C.dead : C.viral, clipPath: 'polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)', display: 'flex' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, paddingLeft: 40 }}>
          <div style={{ fontSize: 18, letterSpacing: 4, color: C.muted }}>{`${theme.name} · ${theme.unit.toUpperCase()}`}</div>
          <div style={{ fontSize: 72, fontWeight: 700, marginTop: 8 }}>{hidden ? 'UNKNOWN' : s!.name}</div>
          {!hidden && (
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 24, fontSize: 24, gap: 10 }}>
              <div style={{ display: 'flex' }}><span style={{ color: C.muted, width: 260 }}>lineage</span><span>{lineage}</span></div>
              <div style={{ display: 'flex' }}><span style={{ color: C.muted, width: 260 }}>generation</span><span>{s!.generation}</span></div>
              <div style={{ display: 'flex' }}><span style={{ color: C.muted, width: 260 }}>hosts infected</span><span>{s!.hostsInfected}</span></div>
              <div style={{ display: 'flex' }}><span style={{ color: C.muted, width: 260 }}>virulence</span><span style={{ color: s!.virulence > 60 ? C.infection : C.specimen }}>{s!.virulence}</span></div>
              <div style={{ display: 'flex' }}><span style={{ color: C.muted, width: 260 }}>path</span><span>{s!.path}</span></div>
            </div>
          )}
          <div style={{ marginTop: 32, fontSize: 16, color: C.muted }}>{theme.site.domain}</div>
        </div>
      </div>
    ),
    size,
  );
}
