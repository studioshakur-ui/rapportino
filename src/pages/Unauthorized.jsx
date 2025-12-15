// src/pages/Unauthorized.jsx
import React from "react";
import { Link } from "react-router-dom";
import { pageBg, cardSurface, headerPill, buttonPrimary } from "../ui/designSystem";

export default function Unauthorized() {
  const isDark = true;

  return (
    <div className={["min-h-screen flex items-center justify-center px-4", pageBg(isDark)].join(" ")}>
      <div className="w-full max-w-md">
        <div className="text-left mb-4">
          <div className={`${headerPill(isDark)} mb-2`}>SISTEMA CENTRALE DI CANTIERE</div>
          <h1 className="text-2xl font-semibold mb-2">Accesso non autorizzato</h1>
          <p className="text-[14px] text-slate-500 leading-relaxed">
            Non hai i permessi per accedere a questa area.
          </p>
        </div>

        <div className={cardSurface(isDark, "p-6")}>
          <div className="flex flex-col gap-2">
            <Link to="/login" className={buttonPrimary(isDark, "w-full justify-center")}>
              Vai al Login
            </Link>
            <Link to="/" className="text-center text-[12px] text-slate-400 underline underline-offset-2 hover:text-sky-400">
              Torna alla panoramica
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
