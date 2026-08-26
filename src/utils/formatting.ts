export function formatGB(bytes: number): string {
  return (bytes / 1e9).toFixed(1);
}

export function formatMB(bytes: number): string {
  return (bytes / 1e6).toFixed(1);
}

export function formatOps(ops: number): string {
  return ops.toLocaleString();
}
