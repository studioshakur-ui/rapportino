import React, { useRef } from "react";

type Props = {
  title: string; // "CORE"
};

export function CoreWordmark({ title }: Props): JSX.Element {
  const wrapRef = useRef<HTMLDivElement | null>(null);

  return (
    <div ref={wrapRef} className="relative inline-flex items-end gap-3 select-none">
      <h1 className="text-7xl md:text-7xl font-semibold tracking-tight leading-[0.95]">{title}</h1>
    </div>
  );
}