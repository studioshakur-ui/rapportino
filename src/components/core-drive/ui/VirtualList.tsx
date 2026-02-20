// /src/components/core-drive/ui/VirtualList.jsx
import { useMemo, useRef, useState } from "react";
import type { ReactNode, UIEvent } from "react";

/**
 * VirtualList: render performant de grandes listes sans lib externe.
 * - rows: array
 * - rowHeight: number (px, fixe)
 * - height: number (px)
 * - renderRow: (row, index) => JSX
 */
export default function VirtualList<T>({
  rows,
  rowHeight = 34,
  height = 520,
  overscan = 10,
  renderRow,
}: {
  rows: T[] | null | undefined;
  rowHeight?: number;
  height?: number;
  overscan?: number;
  renderRow: (row: T, index: number) => ReactNode;
}) {
  const list = Array.isArray(rows) ? rows : [];
  const total = list.length;

  const ref = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState<number>(0);

  const onScroll = (e: UIEvent<HTMLDivElement>) => setScrollTop(e.currentTarget.scrollTop);

  const { start, end, offsetY } = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const visibleCount = Math.ceil(height / rowHeight) + overscan * 2;
    const endIndex = Math.min(total, startIndex + visibleCount);
    return { start: startIndex, end: endIndex, offsetY: startIndex * rowHeight };
  }, [scrollTop, rowHeight, height, overscan, total]);

  const slice = useMemo(() => list.slice(start, end), [list, start, end]);

  return (
    <div
      ref={ref}
      onScroll={onScroll}
      style={{ height }}
      className="relative overflow-auto"
    >
      <div style={{ height: total * rowHeight }} />
      <div style={{ transform: `translateY(${offsetY}px)` }} className="absolute left-0 top-0 w-full">
        {slice.map((row, i) => renderRow(row, start + i))}
      </div>
    </div>
  );
}
