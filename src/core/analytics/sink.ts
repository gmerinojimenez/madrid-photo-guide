import type { AnalyticsEvent } from './events.ts';

/** Puerto de analítica (principio IV). Síncrono y sin lanzar. */
export interface AnalyticsSink {
  track(event: AnalyticsEvent): void;
}
