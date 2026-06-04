// src/shell/nav.ts
// Navigation des 6 modules CORE COMMAND. Ordre = ordre du command center.

export type NavItem = {
  to: string;
  label: string;
  short: string;
  icon: string; // emoji glyph, premium-neutral
};

export const NAV: NavItem[] = [
  { to: "/", label: "Command Center", short: "Command", icon: "◎" },
  { to: "/priorities", label: "Priorités", short: "Priorités", icon: "▲" },
  { to: "/inca", label: "INCA", short: "INCA", icon: "▤" },
  { to: "/whatsapp", label: "WhatsApp Intake", short: "Intake", icon: "✉" },
  { to: "/timeline", label: "Timeline", short: "Timeline", icon: "⌁" },
  { to: "/agents", label: "Agents", short: "Agents", icon: "❖" },
];
