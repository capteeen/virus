'use client';
import { create } from 'zustand';
import type { WorldSnapshot } from '@/lib/types';
import { getSim, type Simulator } from '@/lib/sim';

interface SimStore {
  snap: WorldSnapshot | null;
  sim: Simulator | null;
  wallet: string | null;
  brightfield: boolean;
  sound: boolean;
  boot: () => void;
  setWallet: (w: string | null) => void;
  toggleBrightfield: () => void;
  toggleSound: () => void;
}

export const useSim = create<SimStore>((set, get) => ({
  snap: null,
  sim: null,
  wallet: null,
  brightfield: false,
  sound: false,
  boot: () => {
    if (get().sim) return;
    const sim = getSim();
    set({ sim, snap: sim.snapshot() });
    sim.onChange((snap) => set({ snap }));
  },
  setWallet: (wallet) => {
    const sim = get().sim;
    if (sim) sim.userWallet = wallet;
    set({ wallet });
  },
  toggleBrightfield: () => {
    const v = !get().brightfield;
    set({ brightfield: v });
    if (typeof document !== 'undefined') document.documentElement.dataset.theme = v ? 'light' : 'dark';
  },
  toggleSound: () => set({ sound: !get().sound }),
}));

export const useSnap = () => useSim((s) => s.snap);
