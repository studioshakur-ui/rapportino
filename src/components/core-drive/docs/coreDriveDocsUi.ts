// /src/components/core-drive/docs/coreDriveDocsUi.js
export function uniqSorted<T>(arr: T[] | null | undefined): T[] {
  return Array.from(new Set((arr || []).filter(Boolean) as T[])).sort((a, b) =>
    String(a).localeCompare(String(b))
  );
}

export function bytes(n: unknown): string {
  const v = Number(n || 0);
  if (!v) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let x = v;
  while (x >= 1024 && i < units.length - 1) {
    x /= 1024;
    i += 1;
  }
  return `${x.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatDate(value: unknown): string {
  if (!value) return "";
  const d = new Date(value as string | number | Date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("it-IT");
}

export function formatDateTime(value: unknown): string {
  if (!value) return "";
  const d = new Date(value as string | number | Date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });
}
