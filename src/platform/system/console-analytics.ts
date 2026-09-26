import type { AnalyticsEvent, AnalyticsSink } from '../../core/analytics/index.ts';

/**
 * Sumidero de esta entrega (research.md D-011): escribe el evento en
 * consola. Lo sustituirá el adaptador de Firebase Analytics en la feature de
 * observabilidad, sin tocar el núcleo — solo implementa `AnalyticsSink`.
 */
export const consoleAnalytics: AnalyticsSink = {
  track(event: AnalyticsEvent): void {
    console.log(`[analytics] ${event.name}`, event);
  },
};
