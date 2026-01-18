// src/components/rapportino/page/useRapportinoAutoSave.ts
import { useEffect, useRef } from "react";

/**
 * Debounced autosave.
 * - Never validates, only saves current state.
 * - Skips empty reports.
 * - Skips if signature unchanged since last successful save.
 */
export function useRapportinoAutoSave({
  enabled,
  canEdit,
  profileId,
  initialLoading,
  loading,
  saving,
  hasContent,
  signature,
  onSave,
  onSaved,
  onError,
}: {
  enabled: boolean;
  canEdit: boolean;
  profileId: string | null | undefined;
  initialLoading: boolean;
  loading: boolean;
  saving: boolean;
  hasContent: boolean;
  signature: string;
  onSave: () => Promise<string | null>;
  onSaved?: () => void;
  onError?: (err: unknown) => void;
}): { markSaved: (sig?: string) => void } {
  const timerRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);
  const lastSavedSigRef = useRef("");

  const markSaved = (sig?: string) => {
    lastSavedSigRef.current = typeof sig === "string" ? sig : signature;
  };

  useEffect(() => {
    if (!enabled) return;
    if (!canEdit) return;
    if (!profileId) return;
    if (initialLoading || loading) return;
    if (saving) return;
    if (inFlightRef.current) return;

    if (!hasContent) return;
    if (signature === lastSavedSigRef.current) return;

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    timerRef.current = window.setTimeout(async () => {
      try {
        inFlightRef.current = true;
        const ok = await onSave();
        if (ok) {
          lastSavedSigRef.current = signature;
          onSaved?.();
        }
      } catch (e) {
        onError?.(e);
      } finally {
        inFlightRef.current = false;
      }
    }, 1200);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, canEdit, profileId, initialLoading, loading, saving, hasContent, signature, onSave, onSaved, onError]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  return { markSaved };
}
