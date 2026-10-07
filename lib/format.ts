export function fmtUsd(x: number): string {
  if (x >= 1e9) return '$' + (x / 1e9).toFixed(2) + 'B';
  if (x >= 1e6) return '$' + (x / 1e6).toFixed(2) + 'M';
  if (x >= 1e3) return '$' + (x / 1e3).toFixed(1) + 'k';
  return '$' + Math.round(x).toLocaleString();
}
export function fmtSol(x: number, d?: number): string {
  if (d !== undefined) return x.toFixed(d);
  if (x >= 1000) return x.toFixed(0);
  if (x >= 100) return x.toFixed(1);
  if (x >= 1) return x.toFixed(3);
  return x.toFixed(4);
}
export function fmtInt(x: number): string {
  return Math.round(x).toLocaleString();
}
export function fmtCompact(x: number): string {
  if (x >= 1e9) return (x / 1e9).toFixed(2) + 'B';
  if (x >= 1e6) return (x / 1e6).toFixed(2) + 'M';
  if (x >= 1e3) return (x / 1e3).toFixed(1) + 'k';
  return Math.round(x).toString();
}
export function fmtPct(x: number, d = 1): string {
  return (x * 100).toFixed(d) + '%';
}
export function shortCa(ca: string, n = 4): string {
  if (!ca) return '';
  return ca.slice(0, n) + '…' + ca.slice(-n);
}
export function timeAgo(t: number, now = Date.now()): string {
  const s = Math.max(0, Math.floor((now - t) / 1000));
  if (s < 60) return s + 's';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm';
  const h = Math.floor(m / 60);
  if (h < 48) return h + 'h';
  return Math.floor(h / 24) + 'd';
}
export function countdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const p = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${p(h)}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
}
export function utc(t: number): string {
  return new Date(t).toISOString().replace('T', ' ').slice(0, 19);
}
export function txUrl(sig?: string): string | undefined {
  return sig ? `https://solscan.io/tx/${sig}` : undefined;
}
export function pumpUrl(ca: string): string {
  return `https://pump.fun/coin/${ca}`;
}
