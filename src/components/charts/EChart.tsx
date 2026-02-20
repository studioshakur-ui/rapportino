// src/components/charts/EChart.jsx
import { useMemo } from "react";
import type { CSSProperties } from "react";

declare const require: (id: string) => { default?: unknown } | unknown;

type EChartsComponent = (props: {
  option?: unknown;
  style?: CSSProperties;
  className?: string;
  notMerge?: boolean;
  lazyUpdate?: boolean;
}) => JSX.Element;

/**
 * Wrapper ECharts:
 * - supporte "echarts-for-react" si présent
 * - sinon fallback lisible (ne casse pas la page)
 *
 * IMPORTANT: pour activer les “super graphes”, installe/assure:
 *   npm i echarts echarts-for-react
 */
export default function EChart({
  option,
  style,
  className,
}: {
  option?: unknown;
  style?: CSSProperties;
  className?: string;
}) {
  // Lazy require: évite crash build si lib absente.
  const ReactECharts = useMemo<EChartsComponent | null>(() => {
    try {
      // eslint-disable-next-line global-require, import/no-extraneous-dependencies
      const mod = require("echarts-for-react") as { default?: unknown } | null;
      return (mod?.default || mod) as EChartsComponent;
    } catch {
      return null;
    }
  }, []);

  if (!ReactECharts) {
    return (
      <div className={className} style={style}>
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          ECharts non disponibile: installa <span className="font-mono">echarts</span> +{" "}
          <span className="font-mono">echarts-for-react</span> per riattivare i grafici.
        </div>
      </div>
    );
  }

  return <ReactECharts option={option} style={style} className={className} notMerge={true} lazyUpdate={true} />;
}
