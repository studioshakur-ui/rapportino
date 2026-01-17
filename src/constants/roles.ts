// src/constants/roles.ts

export type AppRole = "CAPO" | "UFFICIO" | "DIREZIONE" | "MANAGER" | "ADMIN";

export const ALL_ROLES: AppRole[] = ["CAPO", "UFFICIO", "DIREZIONE", "MANAGER", "ADMIN"];

export type RoleOption = {
  value: "CAPO" | "UFFICIO" | "DIREZIONE";
  label: string;
};

// UI options used in some Admin flows. Kept limited on purpose.
export const ROLE_OPTIONS: RoleOption[] = [
  { value: "CAPO", label: "Capo" },
  { value: "UFFICIO", label: "Ufficio" },
  { value: "DIREZIONE", label: "Direzione" },
];
