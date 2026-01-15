// src/routes.tsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import { SiteInProduction } from "./pages/SiteInProduction";

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Catch-all: toutes les routes affichent la page "site en production" */}
      <Route path="*" element={<SiteInProduction />} />
    </Routes>
  );
};

export default AppRoutes;