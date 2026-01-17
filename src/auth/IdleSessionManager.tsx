// src/auth/IdleSessionManager.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

type LogoutReason = string;

type IdleSessionManagerProps = {
  enabled?: boolean;
  warnAfterMs?: number;
  logoutAfterMs?: number;

  /**
   * IMPORTANT:
   * Provide a stable scope key (recommended: auth.uid()).
   * Example usage:
   * <IdleSessionManager storageScopeKey={session?.user?.id ?? "anon"} ... />
   */
  storageScopeKey?: string;

  onBeforeLogout?: (reason: LogoutReason) => Promise<void> | void;
  onExtend?: () => Promise<void> | void;
  onLogout?: (reason: LogoutReason) => Promise<void> | void;
};

type WarningOwner = {
  tabId: string;
  expiresAt: number;
};

type BroadcastMsg = {
  type: "activity" | "extend" | "logout" | "warning";
  tabId: string;
  at: number;
  scope: string;
  source?: string;
  reason?: string;
};

/**
 * CORE — Idle session manager (CAPO)
 *
 * Policy:
 * - Warning modal at 25 min of inactivity
 * - Forced logout at 30 min of inactivity
 * - Multi-tab sync (BroadcastChannel preferred, localStorage fallback)
 *
 * Notes:
 * - Keys MUST be scoped per-user to avoid cross-account contamination
 *   when multiple users are tested on the same machine/browser.
 */
export default function IdleSessionManager({
  enabled = true,
  warnAfterMs = 25 * 60 * 1000,
  logoutAfterMs = 30 * 60 * 1000,
  storageScopeKey = "anon",
  onBeforeLogout,
  onExtend,
  onLogout,
}: IdleSessionManagerProps): JSX.Element | null {
  const TAB_ID = useMemo(() => {
    try {
      return crypto?.randomUUID?.() ?? `tab_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    } catch {
      return `tab_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    }
  }, []);

  const scope = useMemo(() => {
    // Normalize scope key for storage safety
    const raw = String(storageScopeKey || "anon");
    return raw.replace(/[^a-zA-Z0-9:_-]/g, "_");
  }, [storageScopeKey]);

  const KEYS = useMemo(
    () => ({
      lastActivityAt: `core:${scope}:lastActivityAt`,
      warningOwner: `core:${scope}:idleWarningOwner`,
      broadcast: `core:${scope}:idleBroadcast`,
      channel: `core-auth:${scope}`,
    }),
    [scope]
  );

  const bcRef = useRef<BroadcastChannel | null>(null);
  const lastBroadcastAtRef = useRef<number>(0);
  const lastActivityAtRef = useRef<number>(0);
  const warningOpenRef = useRef<boolean>(false);
  const loggingOutRef = useRef<boolean>(false);

  const [warningOpen, setWarningOpen] = useState<boolean>(false);
  const [remainingMs, setRemainingMs] = useState<number>(logoutAfterMs);

  const nowMs = () => Date.now();

  const readLastActivityAt = useCallback((): number => {
    try {
      const raw = window.localStorage.getItem(KEYS.lastActivityAt);
      const n = raw ? Number(raw) : 0;
      return Number.isFinite(n) ? n : 0;
    } catch {
      return 0;
    }
  }, [KEYS.lastActivityAt]);

  const writeLastActivityAt = useCallback(
    (ts: number) => {
      try {
        window.localStorage.setItem(KEYS.lastActivityAt, String(ts));
      } catch {
        // ignore
      }
      lastActivityAtRef.current = ts;
    },
    [KEYS.lastActivityAt]
  );

  const broadcast = useCallback(
    (payload: Omit<BroadcastMsg, "tabId" | "scope" | "at"> & Partial<Pick<BroadcastMsg, "at">>) => {
      const msg: BroadcastMsg = {
        ...(payload as BroadcastMsg),
        tabId: TAB_ID,
        at: payload?.at ?? nowMs(),
        scope,
      };

      // BroadcastChannel (best)
      try {
        if (bcRef.current) {
          bcRef.current.postMessage(msg);
        }
      } catch {
        // ignore
      }

      // localStorage fallback (triggers storage event across tabs)
      try {
        window.localStorage.setItem(KEYS.broadcast, JSON.stringify(msg));
      } catch {
        // ignore
      }
    },
    [KEYS.broadcast, TAB_ID, scope]
  );

  const isWarningOwnerValid = useCallback((owner: WarningOwner | null): boolean => {
    if (!owner?.tabId || !owner?.expiresAt) return false;
    const exp = Number(owner.expiresAt);
    return Number.isFinite(exp) && exp > nowMs();
  }, []);

  const getWarningOwner = useCallback((): WarningOwner | null => {
    try {
      const raw = window.localStorage.getItem(KEYS.warningOwner);
      if (!raw) return null;
      return JSON.parse(raw) as WarningOwner;
    } catch {
      return null;
    }
  }, [KEYS.warningOwner]);

  const setWarningOwner = useCallback(
    (owner: WarningOwner) => {
      try {
        window.localStorage.setItem(KEYS.warningOwner, JSON.stringify(owner));
      } catch {
        // ignore
      }
    },
    [KEYS.warningOwner]
  );

  const clearWarningOwner = useCallback(() => {
    try {
      const raw = window.localStorage.getItem(KEYS.warningOwner);
      if (!raw) return;
      const owner = JSON.parse(raw) as WarningOwner;
      // Only the owner can clear
      if (owner?.tabId === TAB_ID) {
        window.localStorage.removeItem(KEYS.warningOwner);
      }
    } catch {
      // ignore
    }
  }, [KEYS.warningOwner, TAB_ID]);

  const closeWarning = useCallback(() => {
    warningOpenRef.current = false;
    setWarningOpen(false);
  }, []);

  const openWarning = useCallback(() => {
    warningOpenRef.current = true;
    setWarningOpen(true);
  }, []);

  const maybeAcquireWarningOwnership = useCallback((): boolean => {
    const owner = getWarningOwner();
    if (isWarningOwnerValid(owner)) {
      return owner.tabId === TAB_ID;
    }

    const base = lastActivityAtRef.current || readLastActivityAt() || nowMs();
    const expiresAt = base + logoutAfterMs;

    const newOwner: WarningOwner = { tabId: TAB_ID, expiresAt };
    setWarningOwner(newOwner);
    return true;
  }, [TAB_ID, getWarningOwner, isWarningOwnerValid, logoutAfterMs, readLastActivityAt, setWarningOwner]);

  const updateRemaining = useCallback((): { idle: number; remaining: number } => {
    const last = lastActivityAtRef.current || readLastActivityAt();
    const lastEffective = last > 0 ? last : nowMs();

    const idle = nowMs() - lastEffective;
    const remaining = Math.max(0, logoutAfterMs - idle);
    setRemainingMs(remaining);

    return { idle, remaining };
  }, [logoutAfterMs, readLastActivityAt]);

  const doBeforeLogout = useCallback(
    async (reason: LogoutReason) => {
      try {
        window.dispatchEvent(new CustomEvent("core:idle-before-logout", { detail: { reason } }));
      } catch {
        // ignore
      }
      if (typeof onBeforeLogout === "function") {
        await onBeforeLogout(reason);
      }
    },
    [onBeforeLogout]
  );

  const doLogout = useCallback(
    async (reason: LogoutReason) => {
      if (loggingOutRef.current) return;
      loggingOutRef.current = true;

      closeWarning();
      clearWarningOwner();

      // Notify other tabs (same user scope only)
      broadcast({ type: "logout", reason });

      // Give the app a chance to persist DRAFT / cleanup
      try {
        await doBeforeLogout(reason);
      } catch {
        // ignore
      }

      // Logout (supabase + app purge)
      try {
        if (typeof onLogout === "function") {
          await onLogout(reason);
        }
      } finally {
        // locked
      }
    },
    [broadcast, clearWarningOwner, closeWarning, doBeforeLogout, onLogout]
  );

  const bumpActivity = useCallback(
    (source: string = "activity") => {
      const t = nowMs();

      // ALWAYS write local activity timestamp (critical for focus/visibility)
      writeLastActivityAt(t);

      // Throttle broadcast only
      const lastB = lastBroadcastAtRef.current;
      const shouldThrottle = t - lastB < 4000;

      // For focus/visibility we still want fast sync across tabs
      const forceBroadcast =
        source === "extend" || source === "bootstrap" || source === "visibility" || source === "focus";

      if (!shouldThrottle || forceBroadcast) {
        lastBroadcastAtRef.current = t;
        broadcast({ type: "activity", source, at: t });
      }

      // If warning was open, close it as soon as there is activity
      if (warningOpenRef.current) {
        closeWarning();
        clearWarningOwner();
      }
    },
    [broadcast, clearWarningOwner, closeWarning, writeLastActivityAt]
  );

  const handleExtend = useCallback(async () => {
    bumpActivity("extend");

    try {
      if (typeof onExtend === "function") {
        await onExtend();
      }
    } catch {
      // ignore
    } finally {
      closeWarning();
      clearWarningOwner();
      broadcast({ type: "extend", at: nowMs() });
    }
  }, [bumpActivity, broadcast, clearWarningOwner, closeWarning, onExtend]);

  const handleUserLogout = useCallback(async () => {
    await doLogout("user_logout_from_idle_modal");
  }, [doLogout]);

  // Bootstrap lastActivityAt (once per mount + scope)
  useEffect(() => {
    if (!enabled) return;

    const existing = readLastActivityAt();
    const now = nowMs();

    if (existing > 0) {
      const idle = now - existing;
      if (idle >= logoutAfterMs) {
        writeLastActivityAt(now);
        broadcast({ type: "activity", source: "bootstrap", at: now });
      } else {
        lastActivityAtRef.current = existing;
      }
    } else {
      writeLastActivityAt(now);
      broadcast({ type: "activity", source: "bootstrap", at: now });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, logoutAfterMs, scope]);

  // Setup multi-tab channel + storage events (scoped)
  useEffect(() => {
    if (!enabled) return;

    try {
      bcRef.current = new BroadcastChannel(KEYS.channel);
    } catch {
      bcRef.current = null;
    }

    const onMessage = (msg: BroadcastMsg) => {
      if (!msg || msg.tabId === TAB_ID) return;
      if (msg.scope !== scope) return; // hard guard

      if (msg.type === "activity") {
        const at = Number(msg.at) || nowMs();
        const cur = lastActivityAtRef.current || readLastActivityAt();
        if (at > cur) {
          writeLastActivityAt(at);
          if (warningOpenRef.current) closeWarning();
        }
      }

      if (msg.type === "extend") {
        const at = Number(msg.at) || nowMs();
        const cur = lastActivityAtRef.current || readLastActivityAt();
        if (at > cur) writeLastActivityAt(at);
        if (warningOpenRef.current) closeWarning();
        clearWarningOwner();
      }

      if (msg.type === "logout") {
        void doLogout(msg.reason || "logout_from_other_tab");
      }
    };

    const bc = bcRef.current;
    const bcHandler = (e: MessageEvent) => onMessage(e.data as BroadcastMsg);
    if (bc) {
      bc.addEventListener("message", bcHandler);
    }

    const onStorage = (e: StorageEvent) => {
      if (!e?.key) return;

      if (e.key === KEYS.lastActivityAt) {
        const at = Number(e.newValue) || 0;
        const cur = lastActivityAtRef.current || readLastActivityAt();
        if (at > cur) {
          writeLastActivityAt(at);
          if (warningOpenRef.current) closeWarning();
        }
      }

      if (e.key === KEYS.broadcast && e.newValue) {
        try {
          const msg = JSON.parse(e.newValue) as BroadcastMsg;
          onMessage(msg);
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("storage", onStorage);
      try {
        if (bc) bc.removeEventListener("message", bcHandler);
        bcRef.current?.close?.();
      } catch {
        // ignore
      }
      bcRef.current = null;
    };
  }, [
    TAB_ID,
    KEYS.broadcast,
    KEYS.channel,
    KEYS.lastActivityAt,
    clearWarningOwner,
    closeWarning,
    doLogout,
    enabled,
    readLastActivityAt,
    scope,
    writeLastActivityAt,
  ]);

  // Attach activity listeners
  useEffect(() => {
    if (!enabled) return;

    const onAnyActivity = () => bumpActivity("focus");
    const onKeyDown = () => bumpActivity("keydown");
    const onPointer = () => bumpActivity("pointer");
    const onScroll = () => bumpActivity("scroll");

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        bumpActivity("visibility");
      }
    };

    const opts: AddEventListenerOptions = { passive: true };

    window.addEventListener("mousedown", onPointer, opts);
    window.addEventListener("pointerdown", onPointer, opts);
    window.addEventListener("touchstart", onPointer, opts);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, opts);
    window.addEventListener("focus", onAnyActivity);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("touchstart", onPointer);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("focus", onAnyActivity);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [bumpActivity, enabled]);

  // Main timer loop
  useEffect(() => {
    if (!enabled) return;

    const tick = async () => {
      if (loggingOutRef.current) return;

      const { idle, remaining } = updateRemaining();

      if (idle >= logoutAfterMs) {
        await doLogout("idle_timeout_30m");
        return;
      }

      const shouldWarn = idle >= warnAfterMs && idle < logoutAfterMs;
      const visible = document.visibilityState === "visible";

      if (shouldWarn && visible && !warningOpenRef.current) {
        const isOwner = maybeAcquireWarningOwnership();
        if (isOwner) {
          openWarning();
          broadcast({ type: "warning", at: nowMs() });
        }
      }

      if (!shouldWarn && warningOpenRef.current) {
        closeWarning();
        clearWarningOwner();
      }

      setRemainingMs(remaining);
    };

    const id = window.setInterval(() => {
      void tick();
    }, 1000);

    return () => window.clearInterval(id);
  }, [
    broadcast,
    clearWarningOwner,
    closeWarning,
    doLogout,
    enabled,
    logoutAfterMs,
    maybeAcquireWarningOwnership,
    openWarning,
    updateRemaining,
    warnAfterMs,
  ]);

  if (!enabled) return null;

  const mmss = useMemo(() => {
    const totalSec = Math.max(0, Math.ceil(remainingMs / 1000));
    const m = String(Math.floor(totalSec / 60)).padStart(2, "0");
    const s = String(totalSec % 60).padStart(2, "0");
    return `${m}:${s}`;
  }, [remainingMs]);

  if (!warningOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Session bientôt expirée"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm tracking-[0.18em] text-slate-400 uppercase">Sécurité</div>
              <h2 className="mt-1 text-lg font-semibold text-slate-100">Session bientôt expirée</h2>
            </div>

            <div className="shrink-0 rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-sm font-semibold text-slate-100">
              {mmss}
            </div>
          </div>

          <p className="mt-3 text-sm text-slate-300 leading-relaxed">
            Pour des raisons de sécurité, vous serez déconnecté dans{" "}
            <span className="font-semibold text-slate-100">{mmss}</span> si vous ne confirmez pas.
          </p>

          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleExtend}
              className="w-full rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-white py-2.5 text-sm font-semibold transition"
            >
              Rester connecté
            </button>

            <button
              type="button"
              onClick={handleUserLogout}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-200 py-2.5 text-sm font-semibold transition"
            >
              Se déconnecter
            </button>
          </div>

          <div className="mt-4 text-[12px] text-slate-500 leading-relaxed">
            Conseil chantier : verrouillez votre poste si vous quittez la zone.
          </div>
        </div>
      </div>
    </div>
  );
}
