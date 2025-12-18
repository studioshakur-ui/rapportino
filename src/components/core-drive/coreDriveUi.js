// /src/components/core-drive/coreDriveUi.js

export function uniqSorted(arr) {
  return Array.from(new Set((arr || []).filter(Boolean))).sort((a, b) =>
    String(a).localeCompare(String(b))
  );
}

export function bytes(n) {
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

export function fmtDateTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });
}

export function fmtDateTimeLong(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("it-IT", { dateStyle: "medium", timeStyle: "short" });
}

export function statusTone(st) {
  const s = (st || "").toString().toUpperCase();
  if (s.includes("ARCH")) return "warn";
  if (s.includes("CONF") || s.includes("VAL")) return "ok";
  return "neutral";
}
