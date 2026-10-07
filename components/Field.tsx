'use client';
/**
 * THE FIELD — dark-field microscopy view.
 * Hosts are translucent cells (instanced spheres, custom shader), strains are
 * magenta icosahedron particles (instanced). Brownian drift + soft collisions.
 * EVERY animation is driven by exactly one SimEvent from the simulator:
 *   infect / extract / lyse / integrate / activate / extinct / expire.
 * Dormant strains are never added to the scene until their 'activate' event.
 */
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as THREE from 'three';
import { EffectComposer, RenderPass, EffectPass, BloomEffect, VignetteEffect, DepthOfFieldEffect, BlendFunction, KernelSize } from 'postprocessing';
import theme from '@/themes';
import { getSim, type Simulator } from '@/lib/sim';
import type { Host, SimEvent, Strain, HostState } from '@/lib/types';
import { useSim } from '@/store/useSim';
import { makeAtlas, makeCellMaterial, makeParticleMaterial, tileOf } from './field/shaders';

export type FieldFilter = 'all' | 'healthy' | 'infected' | 'lysogenic' | 'immune' | 'dead';

interface Cell {
  ca: string;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  r: number;
  rTarget: number;
  tint: number;
  tintTarget: number;
  halo: number;
  haloTarget: number;
  speckle: number;
  dead: number;
  swell: number;
  flash: number;
  dim: number;
  tile: [number, number];
  phase: number;
}
interface Particle {
  ca: string;
  lineageId: string;
  pos: THREE.Vector3;
  from: THREE.Vector3;
  to: THREE.Vector3;
  mode: 'attached' | 'free' | 'travel' | 'fade' | 'merge';
  hostCa?: string;
  t0: number;
  dur: number;
  alpha: number;
  alphaTarget: number;
  scale: number;
  scaleTarget: number;
  color: THREE.Color;
  angle: number;
  speed: number;
  vel: THREE.Vector3;
  onDone?: () => void;
}
interface Thread {
  hostCa: string;
  strainCa: string;
  t0: number;
}
interface Spark {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  max: number;
  color: THREE.Color;
}
interface Pending {
  at: number;
  fn: () => void;
}

const MAX_CELLS = 160;
const MAX_PARTICLES = 420;
const MAX_THREADS = 64;
const MAX_SPARKS = 2400;
const FIELD_W = 128;
const FIELD_H = 72;

function radiusFor(mcap: number) {
  return THREE.MathUtils.clamp(0.55 + 0.6 * (Math.log10(Math.max(mcap, 100)) - 3), 0.5, 3.2);
}
function tintFor(h: Host) {
  // deepens with cumulative extraction (SOL) — 2 SOL ≈ full magenta
  const byExtraction = Math.min(1, h.totalExtracted / 2);
  const byState = h.state === 'infected' || h.state === 'lysogenic' ? 0.35 : 0;
  return Math.min(1, Math.max(byState, byExtraction));
}
function isVisibleStrain(s: Strain) {
  return s.state === 'active' && !s.dormant;
}
const ease = (k: number) => 1 - Math.pow(1 - k, 3); // viscous

export default function Field({
  mode = 'hero',
  filter = 'all',
  focusCa,
  className = '',
  onHover,
}: {
  mode?: 'hero' | 'full';
  filter?: FieldFilter;
  focusCa?: string | null;
  className?: string;
  onHover?: (info: { kind: 'host' | 'strain'; ca: string } | null) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const brightfield = useSim((s) => s.brightfield);
  const filterRef = useRef(filter);
  const focusRef = useRef(focusCa);
  const brightRef = useRef(brightfield);
  filterRef.current = filter;
  focusRef.current = focusCa;
  brightRef.current = brightfield;
  const hoverRef = useRef(onHover);
  hoverRef.current = onHover;

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const sim = getSim();
    let disposed = false;

    // ---------- renderer / scene ----------
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance', stencil: false, depth: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(new THREE.Color(theme.palette.void), 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.cursor = 'grab';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 500);
    camera.position.set(0, 0, mode === 'hero' ? 78 : 70);
    const camTarget = new THREE.Vector3(0, 0, camera.position.z);

    // ---------- cells ----------
    const { texture: atlas, draw } = makeAtlas();
    const cellGeo = new THREE.SphereGeometry(1, 36, 24);
    const cellMat = makeCellMaterial(atlas, theme.palette);
    const cellMesh = new THREE.InstancedMesh(cellGeo, cellMat, MAX_CELLS);
    cellMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    cellMesh.frustumCulled = false;
    const attr = (name: string, size: number) => {
      const a = new THREE.InstancedBufferAttribute(new Float32Array(MAX_CELLS * size), size);
      a.setUsage(THREE.DynamicDrawUsage);
      cellGeo.setAttribute(name, a);
      return a;
    };
    const aTint = attr('aTint', 1), aHalo = attr('aHalo', 1), aSpeckle = attr('aSpeckle', 1), aDead = attr('aDead', 1), aTile = attr('aTile', 2), aSwell = attr('aSwell', 1), aFlash = attr('aFlash', 1), aDim = attr('aDim', 1);
    scene.add(cellMesh);

    // ---------- particles ----------
    const partGeo = new THREE.IcosahedronGeometry(0.28, 0);
    const partMat = makeParticleMaterial();
    const partMesh = new THREE.InstancedMesh(partGeo, partMat, MAX_PARTICLES);
    partMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    partMesh.frustumCulled = false;
    const aColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_PARTICLES * 3), 3);
    const aAlpha = new THREE.InstancedBufferAttribute(new Float32Array(MAX_PARTICLES), 1);
    aColor.setUsage(THREE.DynamicDrawUsage);
    aAlpha.setUsage(THREE.DynamicDrawUsage);
    partGeo.setAttribute('aColor', aColor);
    partGeo.setAttribute('aAlpha', aAlpha);
    scene.add(partMesh);

    // ---------- threads (extraction pulses) ----------
    const threadGeo = new THREE.BufferGeometry();
    const threadPos = new Float32Array(MAX_THREADS * 2 * 3);
    const threadCol = new Float32Array(MAX_THREADS * 2 * 3);
    threadGeo.setAttribute('position', new THREE.BufferAttribute(threadPos, 3).setUsage(THREE.DynamicDrawUsage));
    threadGeo.setAttribute('color', new THREE.BufferAttribute(threadCol, 3).setUsage(THREE.DynamicDrawUsage));
    const threadMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const threadLines = new THREE.LineSegments(threadGeo, threadMat);
    threadLines.frustumCulled = false;
    scene.add(threadLines);

    // ---------- sparks (burst / travel debris) ----------
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPos = new Float32Array(MAX_SPARKS * 3);
    const sparkCol = new Float32Array(MAX_SPARKS * 3);
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3).setUsage(THREE.DynamicDrawUsage));
    sparkGeo.setAttribute('color', new THREE.BufferAttribute(sparkCol, 3).setUsage(THREE.DynamicDrawUsage));
    const sparkMat = new THREE.PointsMaterial({ size: 0.22, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true });
    const sparkPoints = new THREE.Points(sparkGeo, sparkMat);
    sparkPoints.frustumCulled = false;
    scene.add(sparkPoints);

    // ---------- post ----------
    const composer = new EffectComposer(renderer, { multisampling: 0 });
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new BloomEffect({ blendFunction: BlendFunction.ADD, luminanceThreshold: 0.18, luminanceSmoothing: 0.4, intensity: 1.15, kernelSize: KernelSize.MEDIUM, mipmapBlur: true, radius: 0.6 });
    const dof = new DepthOfFieldEffect(camera, { focusDistance: 0.0, focalLength: 0.09, bokehScale: 2.2, resolutionScale: 0.5 });
    const vignette = new VignetteEffect({ darkness: 0.62, offset: 0.28 });
    composer.addPass(new EffectPass(camera, bloom, dof, vignette));

    // ---------- world state ----------
    const cells = new Map<string, Cell>();
    const cellOrder: Cell[] = [];
    const particles = new Map<string, Particle>();
    const partOrder: Particle[] = [];
    const threads: Thread[] = [];
    const sparks: Spark[] = [];
    const pending: Pending[] = [];
    const claimed = new Set<string>(); // strains mid-animation; reconcile leaves them alone
    const viral = new THREE.Color(theme.palette.viral);
    const specimen = new THREE.Color(theme.palette.specimen);
    const immune = new THREE.Color(theme.palette.immune);
    const infection = new THREE.Color(theme.palette.infection);

    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const randomPoint = () => new THREE.Vector3(rand(-FIELD_W / 2, FIELD_W / 2), rand(-FIELD_H / 2, FIELD_H / 2), rand(-4, 4));
    const edgePoint = () => {
      const side = Math.floor(Math.random() * 4);
      const x = side === 0 ? -FIELD_W / 2 - 10 : side === 1 ? FIELD_W / 2 + 10 : rand(-FIELD_W / 2, FIELD_W / 2);
      const y = side === 2 ? -FIELD_H / 2 - 10 : side === 3 ? FIELD_H / 2 + 10 : rand(-FIELD_H / 2, FIELD_H / 2);
      return new THREE.Vector3(x, y, rand(-3, 3));
    };

    function addCell(h: Host, index: number) {
      // rejection placement
      const r = radiusFor(h.mcap);
      let pos = randomPoint();
      for (let tries = 0; tries < 40; tries++) {
        let ok = true;
        for (const c of cellOrder) if (c.pos.distanceTo(pos) < c.r + r + 1.2) { ok = false; break; }
        if (ok) break;
        pos = randomPoint();
      }
      const c: Cell = {
        ca: h.ca, pos, vel: new THREE.Vector3(rand(-0.3, 0.3), rand(-0.3, 0.3), 0), r: r * 0.2, rTarget: r,
        tint: tintFor(h), tintTarget: tintFor(h), halo: h.immuneTo.length ? 1 : 0, haloTarget: h.immuneTo.length ? 1 : 0,
        speckle: h.state === 'lysogenic' ? 1 : 0, dead: h.state === 'dead' ? 1 : 0, swell: 0, flash: 0, dim: 1,
        tile: tileOf(index), phase: Math.random() * Math.PI * 2,
      };
      cells.set(h.ca, c);
      cellOrder.push(c);
      draw(index, h.image, h.ticker);
    }
    function lineageColor(lineageId: string) {
      // subtle per-lineage hue drift around viral magenta
      let hsh = 0;
      for (let i = 0; i < lineageId.length; i++) hsh = (hsh * 31 + lineageId.charCodeAt(i)) >>> 0;
      const hsl = { h: 0, s: 0, l: 0 };
      viral.getHSL(hsl);
      return new THREE.Color().setHSL((hsl.h + ((hsh % 100) / 100 - 0.5) * 0.08 + 1) % 1, hsl.s, hsl.l);
    }
    function addParticle(s: Strain, opts: { pos?: THREE.Vector3; mode?: Particle['mode']; alpha?: number; scale?: number } = {}): Particle {
      if (partOrder.length >= MAX_PARTICLES) {
        // evict the oldest free-floating particle to stay inside the instanced budget
        const victim = partOrder.find((p) => p.mode === 'free' || p.mode === 'fade') ?? partOrder[0];
        removeParticle(victim.ca);
      }
      const attached = !!s.hostCa && s.state === 'active';
      const host = attached ? cells.get(s.hostCa!) : undefined;
      const p: Particle = {
        ca: s.ca, lineageId: s.lineageId,
        pos: opts.pos ? opts.pos.clone() : host ? host.pos.clone() : randomPoint(),
        from: new THREE.Vector3(), to: new THREE.Vector3(),
        mode: opts.mode ?? (host ? 'attached' : 'free'), hostCa: host ? s.hostCa : undefined,
        t0: 0, dur: 0, alpha: opts.alpha ?? 1, alphaTarget: 1, scale: opts.scale ?? 1, scaleTarget: 1,
        color: lineageColor(s.lineageId), angle: Math.random() * Math.PI * 2, speed: rand(0.35, 0.7) * (Math.random() < 0.5 ? 1 : -1),
        vel: new THREE.Vector3(rand(-0.6, 0.6), rand(-0.6, 0.6), 0),
      };
      particles.set(s.ca, p);
      partOrder.push(p);
      return p;
    }
    function removeParticle(ca: string) {
      const p = particles.get(ca);
      if (!p) return;
      particles.delete(ca);
      const i = partOrder.indexOf(p);
      if (i >= 0) partOrder.splice(i, 1);
      claimed.delete(ca);
    }
    function travel(p: Particle, to: THREE.Vector3, dur: number, mode: Particle['mode'], onDone?: () => void) {
      p.from.copy(p.pos);
      p.to.copy(to);
      p.t0 = performance.now();
      p.dur = dur;
      p.mode = 'travel';
      p.onDone = () => {
        p.mode = mode;
        onDone?.();
      };
    }
    function burst(at: THREE.Vector3, n: number, color: THREE.Color, speed = 9, life = 1.6) {
      for (let i = 0; i < n; i++) {
        if (sparks.length >= MAX_SPARKS) sparks.shift();
        const dir = new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-0.3, 0.3)).normalize();
        sparks.push({ pos: at.clone(), vel: dir.multiplyScalar(rand(0.2, 1) * speed), life: 0, max: life * rand(0.6, 1), color });
      }
    }
    function later(ms: number, fn: () => void) {
      pending.push({ at: performance.now() + ms, fn });
    }

    // ---------- initial population (no animation; this is the "already moving" state) ----------
    const hosts0 = [...sim.hosts.values()];
    hosts0.forEach((h, i) => addCell(h, i));
    for (const s of sim.strains.values()) if (isVisibleStrain(s)) addParticle(s);

    // ---------- reconcile on snapshot (fallback; animations do the visible work) ----------
    const offChange = sim.onChange((snap) => {
      for (const h of snap.hosts) {
        const c = cells.get(h.ca);
        if (!c) continue;
        c.rTarget = radiusFor(h.mcap);
        c.tintTarget = tintFor(h);
        if (!(c.swell > 0)) c.haloTarget = h.immuneTo.length ? 1 : 0;
        c.speckle = h.state === 'lysogenic' ? 1 : c.speckle;
        c.dead = h.state === 'dead' ? 1 : 0;
      }
      for (const s of snap.strains) {
        if (claimed.has(s.ca)) continue;
        const vis = isVisibleStrain(s);
        const p = particles.get(s.ca);
        if (vis && !p) addParticle(s, { scale: 0.01 });
        else if (!vis && p && p.mode !== 'fade' && p.mode !== 'travel' && p.mode !== 'merge') {
          p.mode = 'fade';
          p.alphaTarget = 0;
        } else if (vis && p && p.mode === 'free' && s.hostCa && cells.get(s.hostCa)) {
          p.hostCa = s.hostCa;
          p.mode = 'attached';
        }
      }
    });

    // ---------- EVENTS → ANIMATIONS ----------
    const offEvent = sim.onEvent((e: SimEvent) => {
      const s = sim.strains.get(e.strainCa);
      const host = e.hostCa ? cells.get(e.hostCa) : undefined;
      switch (e.kind) {
        case 'infect': {
          if (!s || !host) return;
          claimed.add(s.ca);
          let p = particles.get(s.ca);
          if (!p) p = addParticle(s, { pos: edgePoint(), mode: 'free', scale: 1 });
          const origin = p.pos.clone();
          // escort swarm crossing the gap
          for (let i = 0; i < 7; i++) {
            if (sparks.length >= MAX_SPARKS) sparks.shift();
            const dir = host.pos.clone().sub(origin).normalize();
            const d = origin.distanceTo(host.pos);
            sparks.push({ pos: origin.clone().add(new THREE.Vector3(rand(-0.8, 0.8), rand(-0.8, 0.8), 0)), vel: dir.multiplyScalar(d / 1.5 * rand(0.9, 1.1)), life: 0, max: 1.5, color: viral });
          }
          travel(p, host.pos, 1500, 'attached', () => {
            p!.hostCa = host.ca;
            host.tintTarget = Math.max(host.tintTarget, 0.4);
            claimed.delete(s.ca);
          });
          break;
        }
        case 'extract': {
          if (!s || !host || s.state === 'integrated') return;
          if (!particles.get(s.ca)) return;
          if (threads.length >= MAX_THREADS) threads.shift();
          threads.push({ hostCa: host.ca, strainCa: s.ca, t0: performance.now() });
          host.tintTarget = tintFor(sim.hosts.get(host.ca)!);
          break;
        }
        case 'lyse': {
          if (!s || !host) return;
          claimed.add(s.ca);
          const childCas = (e.meta?.children as string[]) ?? [];
          for (const c of childCas) claimed.add(c);
          // 1. swell 1.5s
          host.swell = 0.001;
          host.haloTarget = host.halo; // hold halo until re-form
          later(1500, () => {
            // 2. rupture
            burst(host.pos, 90, viral, 11, 1.8);
            burst(host.pos, 30, specimen, 6, 1.4);
            host.swell = 0;
            host.r = host.rTarget * 0.45;
            removeParticle(s.ca);
            // 3. three children shoot outward
            childCas.forEach((cca, i) => {
              const cs = sim.strains.get(cca);
              if (!cs) return;
              const p = addParticle(cs, { pos: host.pos, mode: 'free', scale: 1.2 });
              const ang = (i / 3) * Math.PI * 2 + rand(-0.4, 0.4);
              const dest = new THREE.Vector3(Math.cos(ang), Math.sin(ang), 0).multiplyScalar(rand(14, 26)).add(host.pos);
              dest.x = THREE.MathUtils.clamp(dest.x, -FIELD_W / 2, FIELD_W / 2);
              dest.y = THREE.MathUtils.clamp(dest.y, -FIELD_H / 2, FIELD_H / 2);
              travel(p, dest, 1400, 'free', () => {
                p.scaleTarget = 1;
                claimed.delete(cca);
              });
            });
            // 4. re-form with white immunity halo
            later(300, () => {
              host.haloTarget = 1;
              const h = sim.hosts.get(host.ca);
              if (h) {
                host.dead = h.state === 'dead' ? 1 : 0;
                host.tintTarget = tintFor(h);
              }
            });
          });
          break;
        }
        case 'integrate': {
          if (!s || !host) return;
          claimed.add(s.ca);
          let p = particles.get(s.ca);
          if (!p) p = addParticle(s, { pos: edgePoint(), mode: 'free' });
          travel(p, host.pos, 1600, 'merge', () => {
            p!.mode = 'merge';
            p!.alphaTarget = 0;
            p!.scaleTarget = 0.01;
            host.speckle = 1;
            host.tintTarget = Math.max(host.tintTarget, 0.3);
            later(900, () => {
              removeParticle(s.ca);
            });
          });
          break;
        }
        case 'activate': {
          if (!s || !host) return;
          claimed.add(s.ca);
          host.flash = 1;
          const p = addParticle(s, { pos: host.pos, mode: 'attached', alpha: 0, scale: 0.01 });
          p.hostCa = host.ca;
          p.alphaTarget = 1;
          p.scaleTarget = 1.4;
          burst(host.pos, 20, infection, 5, 0.9);
          later(900, () => {
            p.scaleTarget = 1;
            claimed.delete(s.ca);
          });
          break;
        }
        case 'extinct': {
          const members = (e.meta?.members as string[]) ?? [];
          for (const ca of members) {
            const p = particles.get(ca);
            if (!p) continue;
            claimed.add(ca);
            p.mode = 'fade';
            p.alphaTarget = 0;
            later(1600, () => removeParticle(ca));
          }
          break;
        }
        case 'expire': {
          if (!s) return;
          const p = particles.get(s.ca);
          if (!p) return;
          claimed.add(s.ca);
          p.mode = 'fade';
          p.alphaTarget = 0;
          later(1400, () => removeParticle(s.ca));
          break;
        }
        case 'immunize': {
          if (host && e.meta?.purchase) {
            host.haloTarget = 1;
            burst(host.pos, 12, immune, 3, 1.0);
          }
          break;
        }
        default:
          break;
      }
    });

    // ---------- controls ----------
    let dragging = false, moved = false, lastX = 0, lastY = 0, pinch = 0;
    const toWorldScale = () => (2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z) / el.clientHeight;
    const onDown = (ev: PointerEvent) => {
      dragging = true; moved = false; lastX = ev.clientX; lastY = ev.clientY;
      renderer.domElement.setPointerCapture(ev.pointerId);
      renderer.domElement.style.cursor = 'grabbing';
    };
    const onMove = (ev: PointerEvent) => {
      if (dragging) {
        const dx = ev.clientX - lastX, dy = ev.clientY - lastY;
        if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
        const k = toWorldScale();
        camTarget.x -= dx * k;
        camTarget.y += dy * k;
        lastX = ev.clientX; lastY = ev.clientY;
      } else {
        const hit = pick(ev.clientX, ev.clientY);
        renderer.domElement.style.cursor = hit ? 'pointer' : 'grab';
        hoverRef.current?.(hit);
      }
    };
    const onUp = (ev: PointerEvent) => {
      dragging = false;
      renderer.domElement.style.cursor = 'grab';
      if (!moved) {
        const hit = pick(ev.clientX, ev.clientY);
        if (hit) router.push(hit.kind === 'host' ? `/host/${hit.ca}` : `/strain/${hit.ca}`);
      }
    };
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      camTarget.z = THREE.MathUtils.clamp(camTarget.z * (1 + Math.sign(ev.deltaY) * 0.12), 14, 170);
    };
    const onTouch = (ev: TouchEvent) => {
      if (ev.touches.length === 2) {
        ev.preventDefault();
        const d = Math.hypot(ev.touches[0].clientX - ev.touches[1].clientX, ev.touches[0].clientY - ev.touches[1].clientY);
        if (pinch) camTarget.z = THREE.MathUtils.clamp(camTarget.z * (pinch / d), 14, 170);
        pinch = d;
      } else pinch = 0;
    };
    const ndc = new THREE.Vector3();
    function pick(cx: number, cy: number): { kind: 'host' | 'strain'; ca: string } | null {
      const rect = renderer.domElement.getBoundingClientRect();
      const px = cx - rect.left, py = cy - rect.top;
      let best: { kind: 'host' | 'strain'; ca: string; d: number } | null = null;
      const test = (pos: THREE.Vector3, radiusPx: number, kind: 'host' | 'strain', ca: string) => {
        ndc.copy(pos).project(camera);
        if (ndc.z > 1) return;
        const sx = (ndc.x * 0.5 + 0.5) * rect.width, sy = (-ndc.y * 0.5 + 0.5) * rect.height;
        const d = Math.hypot(sx - px, sy - py);
        if (d < radiusPx && (!best || d < best.d)) best = { kind, ca, d };
      };
      const k = toWorldScale();
      for (const p of partOrder) if (p.alpha > 0.3) test(p.pos, Math.max(10, 0.5 / k), 'strain', p.ca);
      if (best) return best;
      for (const c of cellOrder) if (c.dim > 0.5) test(c.pos, c.r / k, 'host', c.ca);
      return best;
    }
    const dom = renderer.domElement;
    dom.addEventListener('pointerdown', onDown);
    dom.addEventListener('pointermove', onMove);
    dom.addEventListener('pointerup', onUp);
    dom.addEventListener('pointerleave', () => hoverRef.current?.(null));
    dom.addEventListener('wheel', onWheel, { passive: false });
    dom.addEventListener('touchmove', onTouch, { passive: false });

    // ---------- resize ----------
    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      composer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    // ---------- loop ----------
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), tmp = new THREE.Vector3();
    let last = performance.now();
    let raf = 0;
    let visible = true;
    const onVis = () => { visible = !document.hidden; };
    document.addEventListener('visibilitychange', onVis);

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (disposed || !visible) return;
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      cellMat.uniforms.uTime.value = t;
      cellMat.uniforms.uBright.value = brightRef.current ? 1 : 0;
      partMat.uniforms.uBright.value = brightRef.current ? 1 : 0;
      renderer.setClearColor(brightRef.current ? new THREE.Color(theme.palette.light?.void ?? '#FAFBFC') : new THREE.Color(theme.palette.void));
      cellMat.blending = brightRef.current ? THREE.NormalBlending : THREE.AdditiveBlending;
      partMat.blending = brightRef.current ? THREE.NormalBlending : THREE.AdditiveBlending;

      // pending timers
      for (let i = pending.length - 1; i >= 0; i--) if (pending[i].at <= now) { const p = pending.splice(i, 1)[0]; p.fn(); }

      // camera easing
      camera.position.lerp(camTarget, 1 - Math.pow(0.001, dt));
      // focus
      if (focusRef.current) {
        const c = cells.get(focusRef.current) ?? undefined;
        const p = particles.get(focusRef.current);
        const target = c?.pos ?? p?.pos;
        if (target) { camTarget.x = target.x; camTarget.y = target.y; camTarget.z = Math.min(camTarget.z, 30); }
      }

      // ---- cells: brownian drift + soft collisions ----
      const f = filterRef.current;
      const simHosts = sim.hosts;
      for (let i = 0; i < cellOrder.length; i++) {
        const c = cellOrder[i];
        c.vel.x += (Math.random() - 0.5) * 0.9 * dt;
        c.vel.y += (Math.random() - 0.5) * 0.9 * dt;
        c.vel.multiplyScalar(1 - 0.6 * dt);
        // soft walls
        if (c.pos.x > FIELD_W / 2) c.vel.x -= 0.8 * dt; if (c.pos.x < -FIELD_W / 2) c.vel.x += 0.8 * dt;
        if (c.pos.y > FIELD_H / 2) c.vel.y -= 0.8 * dt; if (c.pos.y < -FIELD_H / 2) c.vel.y += 0.8 * dt;
        for (let j = i + 1; j < cellOrder.length; j++) {
          const o = cellOrder[j];
          const dx = o.pos.x - c.pos.x, dy = o.pos.y - c.pos.y;
          const d2 = dx * dx + dy * dy;
          const min = c.r + o.r + 0.8;
          if (d2 < min * min && d2 > 0.0001) {
            const d = Math.sqrt(d2);
            const push = (min - d) * 0.9 * dt;
            const nx = dx / d, ny = dy / d;
            c.vel.x -= nx * push; c.vel.y -= ny * push;
            o.vel.x += nx * push; o.vel.y += ny * push;
          }
        }
        c.pos.addScaledVector(c.vel, dt);
        // eased params
        const k = 1 - Math.pow(0.02, dt);
        c.r += (c.rTarget - c.r) * k * 0.8;
        c.tint += (c.tintTarget - c.tint) * k;
        c.halo += (c.haloTarget - c.halo) * k;
        if (c.swell > 0) c.swell = Math.min(1, c.swell + dt / 1.5);
        c.flash = Math.max(0, c.flash - dt / 0.9);
        const h = simHosts.get(c.ca);
        let dimTarget = 1;
        if (h && f !== 'all') {
          const st: HostState | 'immune' = f === 'immune' ? 'immune' : (f as HostState);
          const match = st === 'immune' ? h.immuneTo.length > 0 || !!h.immuneUntil : h.state === st;
          dimTarget = match ? 1 : 0.12;
        }
        if (focusRef.current && focusRef.current !== c.ca) dimTarget = Math.min(dimTarget, 0.35);
        c.dim += (dimTarget - c.dim) * k;
        const rr = c.r * (1 + 0.012 * Math.sin(t * 0.7 + c.phase));
        m.compose(c.pos, q, sc.set(rr, rr, rr));
        cellMesh.setMatrixAt(i, m);
        aTint.setX(i, c.tint); aHalo.setX(i, c.halo); aSpeckle.setX(i, c.speckle); aDead.setX(i, c.dead);
        aTile.setXY(i, c.tile[0], c.tile[1]); aSwell.setX(i, c.swell); aFlash.setX(i, c.flash); aDim.setX(i, c.dim);
      }
      cellMesh.count = cellOrder.length;
      cellMesh.instanceMatrix.needsUpdate = true;
      aTint.needsUpdate = aHalo.needsUpdate = aSpeckle.needsUpdate = aDead.needsUpdate = aTile.needsUpdate = aSwell.needsUpdate = aFlash.needsUpdate = aDim.needsUpdate = true;

      // ---- particles ----
      for (let i = 0; i < partOrder.length; i++) {
        const p = partOrder[i];
        if (p.mode === 'travel') {
          const kk = Math.min(1, (now - p.t0) / p.dur);
          const e = ease(kk);
          p.pos.lerpVectors(p.from, p.to, e);
          p.pos.z = Math.sin(e * Math.PI) * 2;
          if (kk >= 1) { const cb = p.onDone; p.onDone = undefined; cb?.(); }
        } else if (p.mode === 'attached' && p.hostCa) {
          const c = cells.get(p.hostCa);
          if (c) {
            p.angle += p.speed * dt;
            const rr = c.r * 0.62;
            tmp.set(c.pos.x + Math.cos(p.angle) * rr, c.pos.y + Math.sin(p.angle) * rr * 0.8, c.pos.z + Math.sin(p.angle * 1.3) * rr * 0.4);
            p.pos.lerp(tmp, 1 - Math.pow(0.001, dt));
          }
        } else if (p.mode === 'free') {
          p.vel.x += (Math.random() - 0.5) * 2.4 * dt;
          p.vel.y += (Math.random() - 0.5) * 2.4 * dt;
          p.vel.multiplyScalar(1 - 0.5 * dt);
          if (p.pos.x > FIELD_W / 2) p.vel.x -= 2 * dt; if (p.pos.x < -FIELD_W / 2) p.vel.x += 2 * dt;
          if (p.pos.y > FIELD_H / 2) p.vel.y -= 2 * dt; if (p.pos.y < -FIELD_H / 2) p.vel.y += 2 * dt;
          p.pos.addScaledVector(p.vel, dt);
        }
        const k = 1 - Math.pow(0.02, dt);
        p.alpha += (p.alphaTarget - p.alpha) * k;
        p.scale += (p.scaleTarget - p.scale) * k;
        let dim = 1;
        if (f !== 'all' && f !== 'infected') dim = 0.15;
        if (focusRef.current && focusRef.current !== p.ca && focusRef.current !== p.hostCa) dim = Math.min(dim, 0.35);
        q.setFromEuler(new THREE.Euler(t * 0.6 + i, t * 0.4, 0));
        m.compose(p.pos, q, sc.set(p.scale, p.scale, p.scale));
        partMesh.setMatrixAt(i, m);
        aColor.setXYZ(i, p.color.r, p.color.g, p.color.b);
        aAlpha.setX(i, p.alpha * dim);
      }
      partMesh.count = partOrder.length;
      partMesh.instanceMatrix.needsUpdate = true;
      aColor.needsUpdate = aAlpha.needsUpdate = true;
      q.identity();

      // ---- threads ----
      let ti = 0;
      for (let i = threads.length - 1; i >= 0; i--) {
        const th = threads[i];
        const age = (now - th.t0) / 1000;
        if (age > 1.1) { threads.splice(i, 1); continue; }
        const c = cells.get(th.hostCa), p = particles.get(th.strainCa);
        if (!c || !p) { threads.splice(i, 1); continue; }
        const a = Math.sin(Math.min(1, age / 1.1) * Math.PI);
        const o = ti * 6;
        threadPos[o] = c.pos.x; threadPos[o + 1] = c.pos.y; threadPos[o + 2] = c.pos.z;
        threadPos[o + 3] = p.pos.x; threadPos[o + 4] = p.pos.y; threadPos[o + 5] = p.pos.z;
        threadCol[o] = specimen.r * a; threadCol[o + 1] = specimen.g * a; threadCol[o + 2] = specimen.b * a;
        threadCol[o + 3] = specimen.r * a * 0.3; threadCol[o + 4] = specimen.g * a * 0.3; threadCol[o + 5] = specimen.b * a * 0.3;
        ti++;
      }
      threadGeo.setDrawRange(0, ti * 2);
      (threadGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (threadGeo.attributes.color as THREE.BufferAttribute).needsUpdate = true;

      // ---- sparks ----
      let si = 0;
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life += dt;
        if (s.life > s.max) { sparks.splice(i, 1); continue; }
        s.vel.multiplyScalar(1 - 1.4 * dt);
        s.pos.addScaledVector(s.vel, dt);
        const a = 1 - s.life / s.max;
        const o = si * 3;
        sparkPos[o] = s.pos.x; sparkPos[o + 1] = s.pos.y; sparkPos[o + 2] = s.pos.z;
        sparkCol[o] = s.color.r * a; sparkCol[o + 1] = s.color.g * a; sparkCol[o + 2] = s.color.b * a;
        si++;
      }
      sparkGeo.setDrawRange(0, si);
      (sparkGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (sparkGeo.attributes.color as THREE.BufferAttribute).needsUpdate = true;

      composer.render(dt);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      offChange();
      offEvent();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      dom.removeEventListener('pointerdown', onDown);
      dom.removeEventListener('pointermove', onMove);
      dom.removeEventListener('pointerup', onUp);
      dom.removeEventListener('wheel', onWheel);
      dom.removeEventListener('touchmove', onTouch);
      composer.dispose();
      cellGeo.dispose(); cellMat.dispose(); partGeo.dispose(); partMat.dispose();
      threadGeo.dispose(); threadMat.dispose(); sparkGeo.dispose(); sparkMat.dispose(); atlas.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === el) el.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  return <div ref={wrap} className={`relative h-full w-full ${className}`} />;
}
