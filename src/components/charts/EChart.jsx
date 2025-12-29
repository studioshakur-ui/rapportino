// src/components/charts/EChart.jsx
import React, { useMemo } from "react";

/**
 * Wrapper ECharts:
 * - supporte "echarts-for-react" si présent
 * - sinon fallback lisible (ne casse pas la page)
 *
 * IMPORTANT: pour activer les “super graphes”, installe/assure:
 *   npm i echarts echarts-for-react
 */
export default function EChart({ option, style, className }) {
  // Lazy require: évite crash build si lib absente.
  const ReactECharts = useMemo(() => {
    try {
      // eslint-disable-next-line global-require, import/no-extraneous-dependencies
      return require("echarts-for-react").default;
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
