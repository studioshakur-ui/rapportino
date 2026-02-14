import { Outlet, useLocation } from "react-router-dom";
import { useRef } from "react";

export function KeepAliveOutlet() {
  const location = useLocation();
  const cacheRef = useRef<Map<string, JSX.Element>>(new Map());

  const key = location.pathname;

  if (!cacheRef.current.has(key)) {
    cacheRef.current.set(key, <Outlet />);
  }

  return (
    <>
      {[...cacheRef.current.entries()].map(([k, el]) => (
        <div key={k} style={{ display: k === key ? "block" : "none" }}>
          {el}
        </div>
      ))}
    </>
  );
}
