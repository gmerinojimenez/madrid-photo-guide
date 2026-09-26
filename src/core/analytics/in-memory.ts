import type { AnalyticsEvent } from './events.ts';
import type { AnalyticsSink } from './sink.ts';

/** Doble de `AnalyticsSink` para los tests: acumula los eventos en orden. */
export class InMemoryAnalyticsSink implements AnalyticsSink {
  readonly events: AnalyticsEvent[] = [];

  track(event: AnalyticsEvent): void {
    this.events.push(event);
  }
}
