// src/components/rapportino/page/useToast.ts
import { useEffect, useRef, useState } from "react";

export type Toast = {
  type?: "info" | "success" | "error";
  message?: string;
  detail?: string;
} | null;

export function useToast(): {
  toast: Toast;
  pushToast: (t: Exclude<Toast, null>) => void;
  clearToast: () => void;
} {
  const [toast, setToast] = useState<Toast>(null);
  const timerRef = useRef<number | null>(null);

  const clearToast = () => setToast(null);

  const pushToast = (t: Exclude<Toast, null>) => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setToast(t);

    const ms = t?.type === "error" ? 4000 : 2400;
    timerRef.current = window.setTimeout(() => {
      setToast(null);
      timerRef.current = null;
    }, ms);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  return { toast, pushToast, clearToast };
}
