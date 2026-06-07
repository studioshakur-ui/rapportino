export function ensureArray<T>(value: T[] | null | undefined, label: string): T[] {
  if (Array.isArray(value)) return value;
  if (import.meta.env.DEV) {
    console.warn(`[array] Expected array for "${label}"`, value);
  }
  return [];
}
