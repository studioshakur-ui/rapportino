import type { CommanderMetrics } from "../types";

export function createNoopMetrics(): CommanderMetrics {
  return {
    increment() {
      return;
    },
    observe() {
      return;
    },
  };
}
