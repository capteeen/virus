'use client';
import { useEffect, useState } from 'react';
import { useSim } from '@/store/useSim';
import { countdown } from '@/lib/format';

export default function Countdown({ className = '' }: { className?: string }) {
  const nextBurnAt = useSim((s) => s.snap?.stats.nextBurnAt ?? 0);
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  if (!now || !nextBurnAt) return <span className={className}>--:--</span>;
  return <span className={`num ${className}`}>{countdown(nextBurnAt - now)}</span>;
}
