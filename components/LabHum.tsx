'use client';
/** Optional low lab-equipment hum. Off by default; toggled from the header. */
import { useEffect, useRef } from 'react';
import { useSim } from '@/store/useSim';

export default function LabHum() {
  const on = useSim((s) => s.sound);
  const ctx = useRef<AudioContext | null>(null);
  const gain = useRef<GainNode | null>(null);
  useEffect(() => {
    if (!on) {
      if (gain.current && ctx.current) gain.current.gain.linearRampToValueAtTime(0, ctx.current.currentTime + 0.7);
      return;
    }
    if (!ctx.current) {
      const ac = new AudioContext();
      const g = ac.createGain();
      g.gain.value = 0;
      g.connect(ac.destination);
      const o1 = ac.createOscillator();
      o1.type = 'sine';
      o1.frequency.value = 50;
      const o2 = ac.createOscillator();
      o2.type = 'triangle';
      o2.frequency.value = 100.5;
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 220;
      const g2 = ac.createGain();
      g2.gain.value = 0.25;
      o1.connect(lp);
      o2.connect(g2).connect(lp);
      lp.connect(g);
      o1.start();
      o2.start();
      ctx.current = ac;
      gain.current = g;
    }
    ctx.current.resume();
    gain.current!.gain.linearRampToValueAtTime(0.05, ctx.current.currentTime + 1.2);
  }, [on]);
  return null;
}
