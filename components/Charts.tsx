'use client';
import { useEffect, useRef } from 'react';
import { createChart, ColorType, LineStyle, type IChartApi, type UTCTimestamp } from 'lightweight-charts';
import theme from '@/themes';

type Pt = { t: number; v: number };

function baseOptions(el: HTMLElement) {
  const styles = getComputedStyle(document.documentElement);
  const c = (k: string) => styles.getPropertyValue(k).trim();
  return {
    width: el.clientWidth,
    height: el.clientHeight,
    layout: { background: { type: ColorType.Solid, color: c('--c-void') || theme.palette.void }, textColor: c('--c-muted') || theme.palette.muted, fontFamily: theme.fonts.mono, fontSize: 10, attributionLogo: false },
    grid: { vertLines: { color: c('--c-border'), style: LineStyle.Dotted }, horzLines: { color: c('--c-border'), style: LineStyle.Dotted } },
    rightPriceScale: { borderColor: c('--c-border') },
    timeScale: { borderColor: c('--c-border'), timeVisible: true, secondsVisible: true },
    crosshair: { vertLine: { color: c('--c-specimen'), width: 1 as const, style: LineStyle.Solid }, horzLine: { color: c('--c-specimen'), width: 1 as const, style: LineStyle.Solid } },
    handleScroll: false,
    handleScale: false,
    localization: { locale: 'en-US' },
  };
}

function dedupe(points: Pt[]): { time: UTCTimestamp; value: number }[] {
  const out: { time: UTCTimestamp; value: number }[] = [];
  let lastT = -1;
  for (const p of [...points].sort((a, b) => a.t - b.t)) {
    const t = Math.floor(p.t / 1000);
    if (t === lastT) out[out.length - 1].value = p.v;
    else {
      out.push({ time: t as UTCTimestamp, value: p.v });
      lastT = t;
    }
  }
  return out;
}

/** cumulative line, cyan on black */
export function LineChartBox({ points, color, area = true, height = 220 }: { points: Pt[]; color?: string; area?: boolean; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const series = useRef<ReturnType<IChartApi['addAreaSeries']> | ReturnType<IChartApi['addLineSeries']> | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ch = createChart(el, baseOptions(el));
    const col = color ?? theme.palette.specimen;
    series.current = area
      ? ch.addAreaSeries({ lineColor: col, topColor: col + '55', bottomColor: col + '00', lineWidth: 2, priceLineVisible: false, lastValueVisible: true, priceFormat: { type: 'price', precision: 4, minMove: 0.0001 } })
      : ch.addLineSeries({ color: col, lineWidth: 2, priceLineVisible: false, priceFormat: { type: 'price', precision: 2, minMove: 0.01 } });
    chart.current = ch;
    const ro = new ResizeObserver(() => ch.applyOptions({ width: el.clientWidth, height: el.clientHeight }));
    ro.observe(el);
    return () => {
      ro.disconnect();
      ch.remove();
      chart.current = null;
    };
  }, [color, area]);
  useEffect(() => {
    if (!series.current || !chart.current) return;
    series.current.setData(dedupe(points));
    chart.current.timeScale().fitContent();
  }, [points]);
  return <div ref={ref} style={{ height }} className="w-full" />;
}

/** histogram, magenta */
export function BarChartBox({ points, color, height = 220 }: { points: Pt[]; color?: string; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const series = useRef<ReturnType<IChartApi['addHistogramSeries']> | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ch = createChart(el, baseOptions(el));
    series.current = ch.addHistogramSeries({ color: color ?? theme.palette.viral, priceLineVisible: false, priceFormat: { type: 'volume' } });
    chart.current = ch;
    const ro = new ResizeObserver(() => ch.applyOptions({ width: el.clientWidth, height: el.clientHeight }));
    ro.observe(el);
    return () => {
      ro.disconnect();
      ch.remove();
    };
  }, [color]);
  useEffect(() => {
    if (!series.current || !chart.current) return;
    series.current.setData(dedupe(points).map((p) => ({ ...p, color: color ?? theme.palette.viral })));
    chart.current.timeScale().fitContent();
  }, [points, color]);
  return <div ref={ref} style={{ height }} className="w-full" />;
}
