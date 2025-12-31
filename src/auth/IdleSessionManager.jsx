// src/auth/IdleSessionManager.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * CORE — Idle session manager (CAPO)
 *
 * Policy:
 * - Warning modal at 25 min of inactivity
 * - Forced logout at 30 min of inactivity
 * - Multi-tab sync (BroadcastChannel preferred, localStorage fallback)
 *
 * Notes:
 * - This component is intentionally UI-light but strict on security behavior.
 * - It does NOT assume any rapportino context/store exists.
 *   Instead it emits a DOM event before logout so any page can persist drafts if it wants:
 *   window.dispatchEvent(new CustomEvent("core:idle-before-logout", { detail: { reason } }))
 */
export default function IdleSessionManager({
  enabled = true,
  warnAfterMs = 25 * 60 * 1000,
  logoutAfterMs = 30 * 60 * 1000,
  onBeforeLogout, // async (reason) => void
  onExtend, // async () => void
  onLogout, // async (reason) => void
}) {
  const TAB_ID = useMemo(() => {
    try {
      // eslint-disable-next-line no-undef
      return crypto?.randomUUID?.() ?? `tab_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    } catch {
      return `tab_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    }
  }, []);

  const KEYS = useMemo(
    () => ({
      lastActivityAt: "core:lastActivityAt",
      warningOwner: "core:idleWarningOwner",
      broadcast: "core:idleBroadcast",
    }),
    []
  );

  const bcRef = useRef(null);
  const lastBroadcastAtRef = useRef(0);
  const lastActivityAtRef = useRef(0);
  const warningOpenRef = useRef(false);
  const loggingOutRef = useRef(false);

  const [warningOpen, setWarningOpen] = useState(false);
  const [remainingMs, setRemainingMs] = useState(logoutAfterMs);

  const nowMs = () => Date.now();

  const readLastActivityAt = useCallback(() => {
    try {
      const raw = window.localStorage.getItem(KEYS.lastActivityAt);
      const n = raw ? Number(raw) : 0;
      return Number.isFinite(n) ? n : 0;
    } catch {
      return 0;
    }
  }, [KEYS.lastActivityAt]);

  const writeLastActivityAt = useCallback(
    (ts) => {
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
    (payload) => {
      const msg = { ...payload, tabId: TAB_ID, at: payload?.at ?? nowMs() };

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
    [KEYS.broadcast, TAB_ID]
  );

  const isWarningOwnerValid = useCallback(
    (owner) => {
      if (!owner?.tabId || !owner?.expiresAt) return false;
      const exp = Number(owner.expiresAt);
      return Number.isFinite(exp) && exp > nowMs();
    },
    []
  );

  const getWarningOwner = useCallback(() => {
    try {
      const raw = window.localStorage.getItem(KEYS.warningOwner);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, [KEYS.warningOwner]);

  const setWarningOwner = useCallback(
    (owner) => {
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
      const owner = JSON.parse(raw);
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

  const maybeAcquireWarningOwnership = useCallback(() => {
    const owner = getWarningOwner();
    if (isWarningOwnerValid(owner)) {
      return owner.tabId === TAB_ID;
    }

    const base = lastActivityAtRef.current || readLastActivityAt() || nowMs();
    const expiresAt = base + logoutAfterMs;

    const newOwner = { tabId: TAB_ID, expiresAt };
    setWarningOwner(newOwner);
    return true;
  }, [
    TAB_ID,
    getWarningOwner,
    isWarningOwnerValid,
    logoutAfterMs,
    readLastActivityAt,
    setWarningOwner,
  ]);

  const updateRemaining = useCallback(() => {
    const last = lastActivityAtRef.current || readLastActivityAt();
    const lastEffective = last > 0 ? last : nowMs();

    const idle = nowMs() - lastEffective;
    const remaining = Math.max(0, logoutAfterMs - idle);
    setRemainingMs(remaining);

    return { idle, remaining };
  }, [logoutAfterMs, readLastActivityAt]);

  const doBeforeLogout = useCallback(
    async (reason) => {
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
    async (reason) => {
      if (loggingOutRef.current) return;
      loggingOutRef.current = true;

      closeWarning();
      clearWarningOwner();

      // Notify other tabs
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
    (source = "activity") => {
      const t = nowMs();

      // Throttle writes/broadcasts (avoid spam on mousemove/scroll)
      const lastB = lastBroadcastAtRef.current;
      if (t - lastB < 4000 && source !== "extend" && source !== "bootstrap") {
        return;
      }
      lastBroadcastAtRef.current = t;

      writeLastActivityAt(t);
      broadcast({ type: "activity", source, at: t });

      // If warning was open, close it as soon as there is activity
      if (warningOpenRef.current) {
        closeWarning();
        clearWarningOwner();
      }
    },
    [broadcast, clearWarningOwner, closeWarning, writeLastActivityAt]
  );

  const handleExtend = useCallback(async () => {
    // “Rester connecté”
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

  // Bootstrap lastActivityAt (once)
  useEffect(() => {
    if (!enabled) return;

    const existing = readLastActivityAt();
    const now = nowMs();

    // ✅ Critical fix:
    // If stored activity timestamp is stale (older than logoutAfterMs),
    // reset it on mount to avoid immediate logout after a new login.
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
  }, [enabled, logoutAfterMs]);

  // Setup multi-tab channel + storage events
  useEffect(() => {
    if (!enabled) return;

    try {
      bcRef.current = new BroadcastChannel("core-auth");
    } catch {
      bcRef.current = null;
    }

    const onMessage = (msg) => {
      if (!msg || msg.tabId === TAB_ID) return;

      if (msg.type === "activity") {
        const at = Number(msg.at) || nowMs();
        // Accept only if newer
        const cur = lastActivityAtRef.current || readLastActivityAt();
        if (at > cur) {
          writeLastActivityAt(at);
          if (warningOpenRef.current) {
            closeWarning();
          }
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
        doLogout(msg.reason || "logout_from_other_tab");
      }
    };

    const bc = bcRef.current;
    if (bc) {
      bc.addEventListener("message", (e) => onMessage(e.data));
    }

    const onStorage = (e) => {
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
          const msg = JSON.parse(e.newValue);
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
        bcRef.current?.close?.();
      } catch {
        // ignore
      }
      bcRef.current = null;
    };
  }, [
    TAB_ID,
    KEYS.broadcast,
    KEYS.lastActivityAt,
    clearWarningOwner,
    closeWarning,
    doLogout,
    enabled,
    readLastActivityAt,
    writeLastActivityAt,
  ]);

  // Attach activity listeners
  useEffect(() => {
    if (!enabled) return;

    const onAnyActivity = () => bumpActivity("activity");
    const onKeyDown = () => bumpActivity("keydown");
    const onPointer = () => bumpActivity("pointer");
    const onScroll = () => bumpActivity("scroll");

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        bumpActivity("visibility");
      }
    };

    const opts = { passive: true };

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

      // Force logout
      if (idle >= logoutAfterMs) {
        await doLogout("idle_timeout_30m");
        return;
      }

      // Warning window
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
      tick();
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
              <div className="text-sm tracking-[0.18em] text-slate-400 uppercase">
                Sécurité
              </div>
              <h2 className="mt-1 text-lg font-semibold text-slate-100">
                Session bientôt expirée
              </h2>
            </div>

            <div className="shrink-0 rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-sm font-semibold text-slate-100">
              {mmss}
            </div>
          </div>

          <p className="mt-3 text-sm text-slate-300 leading-relaxed">
            Pour des raisons de sécurité, vous serez déconnecté dans{" "}
            <span className="font-semibold text-slate-100">{mmss}</span> si vous ne
            confirmez pas.
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
