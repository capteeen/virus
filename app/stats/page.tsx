'use client';
import theme from '@/themes';
import { useSim } from '@/store/useSim';
import { Panel, Empty } from '@/components/ui';
import { LineChartBox } from '@/components/Charts';

export default function StatsPage() {
  const snap = useSim((s) => s.snap);
  if (!snap) return <Empty>loading</Empty>;
  const p = snap.population;
  const series = (k: keyof (typeof p)[number]) => p.map((x) => ({ t: x.t, v: x[k] as number }));
  return (
    <div className="mx-auto max-w-[1400px] px-4 pt-8">
      <div className="eyebrow">population drift · live {theme.unit}s</div>
      <h1 className="mt-2 text-4xl">stats</h1>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Panel title="mean extractionRate"><div className="p-2"><LineChartBox points={series('extractionRate')} height={200} area={false} /></div></Panel>
        <Panel title="mean lysisThreshold (SOL)"><div className="p-2"><LineChartBox points={series('lysisThreshold')} height={200} area={false} color={theme.palette.viral} /></div></Panel>
        <Panel title="mean compatibilityRange"><div className="p-2"><LineChartBox points={series('compatibilityRange')} height={200} area={false} color={theme.palette.immune} /></div></Panel>
        <Panel title="mean virulence"><div className="p-2"><LineChartBox points={series('virulence')} height={200} area={false} color={theme.palette.infection} /></div></Panel>
        <Panel title={`live ${theme.unit}s`} className="md:col-span-2"><div className="p-2"><LineChartBox points={series('activeStrains')} height={200} /></div></Panel>
      </div>
    </div>
  );
}
