import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * EChart (ECharts wrapper)
 * - Lazy-load echarts to keep initial bundle lighter
 * - ResizeObserver auto-resize
 * - Safe cleanup to avoid leaks
 */
export default function EChart({
  option,
  className = "",
  style,
  theme, // optional echarts theme name
  renderer = "canvas", // "canvas" | "svg"
}) {
  const elRef = useRef(null);
  const chartRef = useRef(null);
  const roRef = useRef(null);
  const [echartsMod, setEchartsMod] = useState(null);

  const safeOption = useMemo(() => option || {}, [option]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const m = await import("echarts");
        if (!mounted) return;
        setEchartsMod(m);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[EChart] Impossibile caricare echarts. Hai installato 'echarts'?", e);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!echartsMod) return;
    const echarts = echartsMod?.default || echartsMod;
    if (!elRef.current) return;

    // init chart
    if (!chartRef.current) {
      chartRef.current = echarts.init(elRef.current, theme || null, { renderer });
    }

    // set option
    chartRef.current.setOption(safeOption, { notMerge: true, lazyUpdate: true });

    // resize observer
    if (!roRef.current && typeof ResizeObserver !== "undefined") {
      roRef.current = new ResizeObserver(() => {
        // avoid layout thrash
        requestAnimationFrame(() => {
          try {
            chartRef.current?.resize();
          } catch {
            // ignore
          }
        });
      });
      roRef.current.observe(elRef.current);
    }

    return () => {
      // keep instance for updates; cleanup happens on unmount below
    };
  }, [echartsMod, safeOption, theme, renderer]);

  useEffect(() => {
    return () => {
      try {
        roRef.current?.disconnect();
      } catch {
        // ignore
      }
      roRef.current = null;

      try {
        chartRef.current?.dispose();
      } catch {
        // ignore
      }
      chartRef.current = null;
    };
  }, []);

  return (
    <div
      ref={elRef}
      className={className}
      style={{
        width: "100%",
        height: "100%",
        minHeight: 220,
        ...style,
      }}
    />
  );
}
