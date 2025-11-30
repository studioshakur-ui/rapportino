// src/components/Toast.jsx
import React, { useEffect } from 'react';

export default function Toast({ open, type = 'info', message, onClose, duration = 3500 }) {
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => {
      onClose?.();
    }, duration);
    return () => clearTimeout(id);
  }, [open, duration, onClose]);

  if (!open || !message) return null;

  const base =
    'fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-md shadow-lg text-sm flex items-center gap-2 border';

  let variant = '';
  if (type === 'success') {
    variant = 'bg-emerald-600 text-emerald-50 border-emerald-400';
  } else if (type === 'error') {
    variant = 'bg-rose-600 text-rose-50 border-rose-400';
  } else {
    variant = 'bg-slate-800 text-slate-50 border-slate-500';
  }

  const label =
    type === 'success' ? 'OK' : type === 'error' ? 'Errore' : 'Info';

  return (
    <div className={`${base} ${variant} no-print`}>
      <span className="text-xs font-semibold uppercase tracking-wide opacity-80">
        {label}
      </span>
      <span>{message}</span>
      <button
        type="button"
        onClick={onClose}
        className="ml-2 text-xs opacity-80 hover:opacity-100"
      >
        ×
      </button>
    </div>
  );
}
