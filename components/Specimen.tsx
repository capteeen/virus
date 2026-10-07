'use client';
/** A single host cell or strain particle rendered large — used on host/strain pages. */
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer, RenderPass, EffectPass, BloomEffect, VignetteEffect, BlendFunction, KernelSize } from 'postprocessing';
import theme from '@/themes';
import type { Host, Strain } from '@/lib/types';
import { useSim } from '@/store/useSim';
import { makeAtlas, makeCellMaterial, makeParticleMaterial } from './field/shaders';

export default function Specimen({ host, strain, className = '' }: { host?: Host; strain?: Strain; className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const brightfield = useSim((s) => s.brightfield);
  const bright = useRef(brightfield);
  bright.current = brightfield;
  const hostRef = useRef(host);
  hostRef.current = host;
  const strainRef = useRef(strain);
  strainRef.current = strain;
  const key = host?.ca ?? strain?.ca ?? '';

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, 7);
    const { texture, draw } = makeAtlas();
    const h = hostRef.current;
    const s = strainRef.current;
    let mesh: THREE.Mesh;
    let cellMat: THREE.ShaderMaterial | null = null;
    let partMat: THREE.ShaderMaterial | null = null;
    const satellites: THREE.Mesh[] = [];
    if (h) {
      draw(0, h.image, h.ticker);
      cellMat = makeCellMaterial(texture, theme.palette);
      const geo = new THREE.SphereGeometry(1.9, 64, 48);
      const n = geo.attributes.position.count;
      const one = (v: number) => new THREE.BufferAttribute(new Float32Array(n).fill(v), 1);
      const tint = Math.min(1, Math.max(h.state === 'infected' || h.state === 'lysogenic' ? 0.35 : 0, h.totalExtracted / 2));
      geo.setAttribute('aTint', one(tint));
      geo.setAttribute('aHalo', one(h.immuneTo.length || h.immuneUntil ? 1 : 0));
      geo.setAttribute('aSpeckle', one(h.state === 'lysogenic' ? 1 : 0));
      geo.setAttribute('aDead', one(h.state === 'dead' ? 1 : 0));
      geo.setAttribute('aTile', new THREE.BufferAttribute(new Float32Array(n * 2).fill(0), 2));
      geo.setAttribute('aSwell', one(0));
      geo.setAttribute('aFlash', one(0));
      geo.setAttribute('aDim', one(1));
      mesh = new THREE.Mesh(geo, cellMat);
      scene.add(mesh);
      // attached (visible) strains orbit inside
      partMat = makeParticleMaterial();
      const pg = new THREE.IcosahedronGeometry(0.24, 0);
      const pn = pg.attributes.position.count;
      const c = new THREE.Color(theme.palette.viral);
      const col = new Float32Array(pn * 3);
      for (let i = 0; i < pn; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
      pg.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
      pg.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(pn).fill(1), 1));
      for (let i = 0; i < Math.min(12, h.strains.length); i++) {
        const sat = new THREE.Mesh(pg, partMat);
        sat.userData.phase = (i / Math.max(1, h.strains.length)) * Math.PI * 2;
        satellites.push(sat);
        scene.add(sat);
      }
    } else {
      partMat = makeParticleMaterial();
      const geo = new THREE.IcosahedronGeometry(1.6, 0);
      const n = geo.attributes.position.count;
      const c = new THREE.Color(s?.dormant ? theme.palette.dormant : theme.palette.viral);
      const col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
      geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
      geo.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(n).fill(s?.state === 'expired' ? 0.35 : 1), 1));
      mesh = new THREE.Mesh(geo, partMat);
      scene.add(mesh);
      // wireframe shell
      const wire = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.62, 0)), new THREE.LineBasicMaterial({ color: theme.palette.immune, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending }));
      mesh.add(wire);
    }
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new EffectPass(camera, new BloomEffect({ blendFunction: BlendFunction.ADD, luminanceThreshold: 0.2, intensity: 1.1, kernelSize: KernelSize.MEDIUM, mipmapBlur: true }), new VignetteEffect({ darkness: 0.7, offset: 0.2 })));
    const resize = () => {
      const w = el.clientWidth, hh = el.clientHeight;
      if (!w || !hh) return;
      renderer.setSize(w, hh, false);
      composer.setSize(w, hh);
      camera.aspect = w / hh;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    let raf = 0;
    const t0 = performance.now();
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const t = (performance.now() - t0) / 1000;
      const b = bright.current ? 1 : 0;
      renderer.setClearColor(new THREE.Color(bright.current ? theme.palette.light?.void ?? '#FAFBFC' : theme.palette.void));
      if (cellMat) { cellMat.uniforms.uTime.value = t; cellMat.uniforms.uBright.value = b; cellMat.blending = b ? THREE.NormalBlending : THREE.AdditiveBlending; }
      if (partMat) { partMat.uniforms.uBright.value = b; partMat.blending = b ? THREE.NormalBlending : THREE.AdditiveBlending; }
      mesh.rotation.y = t * 0.12;
      mesh.rotation.x = Math.sin(t * 0.2) * 0.15;
      mesh.position.y = Math.sin(t * 0.5) * 0.05;
      satellites.forEach((sat, i) => {
        const a = t * (0.4 + i * 0.07) + sat.userData.phase;
        sat.position.set(Math.cos(a) * 1.2, Math.sin(a * 1.1) * 0.9, Math.sin(a) * 1.0);
        sat.rotation.set(t, t * 0.7, 0);
      });
      composer.render();
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      composer.dispose();
      renderer.dispose();
      texture.dispose();
      if (renderer.domElement.parentElement === el) el.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return <div ref={wrap} className={`h-full w-full ${className}`} />;
}
