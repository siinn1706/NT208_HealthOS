export function formatKcal(val: number): string {
  return val >= 1000 ? `${(val / 1000).toFixed(1)}k` : String(val);
}

export function formatMl(val: number): string {
  return val >= 1000 ? `${(val / 1000).toFixed(1)}L` : `${val}ml`;
}

export function formatBpm(val: number): string {
  return `${val} bpm`;
}

export function formatPercent(val: number): string {
  return `${Math.round(val * 100)}%`;
}

export function formatSteps(val: number): string {
  return val >= 1000 ? `${(val / 1000).toFixed(1)}k` : String(val);
}
