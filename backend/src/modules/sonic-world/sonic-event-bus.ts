import { EventEmitter } from 'events';
import { db } from '../../db';
import { sonic_events } from '../../db/schema';

export type SonicEventType =
  | 'blueprint.generated'
  | 'memory.ingested'
  | 'recommendation.accepted'
  | 'mission.completed'
  | 'release.simulated'
  | 'execution.plan.created'
  | 'execution.milestone.completed'
  | 'execution.checkpoint.added'
  | 'session.stagnation.detected'
  | 'session.over_density.detected'
  | 'session.emotional_flatness.detected'
  | 'session.harmonic_repetition.detected'
  | 'session.weak_transitions.detected'
  | 'queue.job.enqueued'
  | 'queue.job.completed'
  | 'analytics.recalculated'
  | 'ranking.regenerated'
  | 'platform.signal.ingested';

export type SonicEventPayload = Record<string, unknown> & { artist_id?: string };

class SonicEventBus extends EventEmitter {
  publish(event: SonicEventType, payload: SonicEventPayload): void {
    db.insert(sonic_events).values({
      artist_id: (payload.artist_id as string) ?? null,
      event_type: event,
      payload,
    }).catch(err =>
      console.warn('[SonicEventBus] persist failed:', err.message),
    );

    super.emit(event, payload);
    super.emit('*', { event, payload });
  }

  subscribe<T extends SonicEventPayload>(event: SonicEventType, handler: (payload: T) => void): void {
    this.on(event, handler);
  }

  unsubscribe<T extends SonicEventPayload>(event: SonicEventType, handler: (payload: T) => void): void {
    this.off(event, handler);
  }
}

export const sonicEventBus = new SonicEventBus();
sonicEventBus.setMaxListeners(100);
