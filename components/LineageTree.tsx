'use client';
/** Interactive lineage tree (d3-force on canvas): patient zero at the root, click a node → strain page. */
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, forceY, type SimulationNodeDatum, type SimulationLinkDatum } from 'd3-force';
import type { Strain } from '@/lib/types';
import theme from '@/themes';

interface N extends SimulationNodeDatum { id: string; gen: number; state: Strain['state']; name: string; dormant: boolean; virulence: number }
interface L extends SimulationLinkDatum<N> { source: string | N; target: string | N }

const STATE_COL: Record<Strain['state'], string> = {
  active: theme.palette.viral,
  dormant: theme.palette.dormant,
  lysed: theme.palette.infection,
  integrated: theme.palette.viral,
  expired: theme.palette.dead,
};

export default function LineageTree({ strains, currentCa, height = 360, revealDormant = false }: { strains: Strain[]; currentCa?: string; height?: number; revealDormant?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const router = useRouter();
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = canvas.clientWidth, H = height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    // dormant strains are invisible unless this is the owner's view
    const visible = strains.filter((s) => !s.dormant || revealDormant || s.ca === currentCa);
    const ids = new Set(visible.map((s) => s.ca));
    const nodes: N[] = visible.map((s) => ({ id: s.ca, gen: s.generation, state: s.state, name: s.name, dormant: s.dormant, virulence: s.virulence, x: W / 2 + (Math.random() - 0.5) * 50, y: 30 + s.generation * 70 }));
    const links: L[] = visible.filter((s) => s.parentCa && ids.has(s.parentCa)).map((s) => ({ source: s.parentCa!, target: s.ca }));
    const maxGen = Math.max(1, ...visible.map((s) => s.generation));
    const sim = forceSimulation<N>(nodes)
      .force('link', forceLink<N, L>(links).id((d) => d.id).distance(44).strength(0.9))
      .force('charge', forceManyBody().strength(-120))
      .force('center', forceCenter(W / 2, H / 2).strength(0.05))
      .force('collide', forceCollide(16))
      .force('y', forceY<N>((d) => 30 + (d.gen / maxGen) * (H - 60)).strength(0.9))
      .alphaDecay(0.03);
    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 1;
      for (const l of links) {
        const s = l.source as N, t = l.target as N;
        ctx.strokeStyle = theme.palette.border;
        ctx.beginPath();
        ctx.moveTo(s.x!, s.y!);
        ctx.lineTo(t.x!, t.y!);
        ctx.stroke();
      }
      for (const n of nodes) {
        const r = n.gen === 0 ? 9 : 6;
        const col = STATE_COL[n.state];
        ctx.beginPath();
        ctx.arc(n.x!, n.y!, r, 0, Math.PI * 2);
        ctx.fillStyle = n.state === 'expired' ? 'transparent' : col + (n.state === 'lysed' ? '66' : 'cc');
        ctx.fill();
        ctx.strokeStyle = n.id === currentCa ? theme.palette.immune : col;
        ctx.lineWidth = n.id === currentCa ? 2.5 : 1.2;
        ctx.stroke();
        if (n.id === currentCa || n.gen === 0) {
          ctx.fillStyle = theme.palette.text;
          ctx.font = `10px ${theme.fonts.mono}`;
          ctx.textAlign = 'center';
          ctx.fillText(n.name, n.x!, n.y! + r + 12);
        }
      }
    };
    sim.on('tick', draw);
    const onClick = (ev: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = ev.clientX - rect.left, y = ev.clientY - rect.top;
      const hit = nodes.find((n) => Math.hypot(n.x! - x, n.y! - y) < 12);
      if (hit) router.push(`/strain/${hit.id}`);
    };
    const onMove = (ev: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = ev.clientX - rect.left, y = ev.clientY - rect.top;
      const hit = nodes.find((n) => Math.hypot(n.x! - x, n.y! - y) < 12);
      canvas.style.cursor = hit ? 'pointer' : 'default';
      canvas.title = hit ? `${hit.name} · gen ${hit.gen} · ${hit.state} · virulence ${hit.virulence}` : '';
    };
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('mousemove', onMove);
    return () => {
      cancelAnimationFrame(raf);
      sim.stop();
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('mousemove', onMove);
    };
  }, [strains, currentCa, height, router, revealDormant]);
  return <canvas ref={ref} className="block w-full" style={{ height }} />;
}
