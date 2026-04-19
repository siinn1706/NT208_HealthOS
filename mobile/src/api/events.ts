type Listener<T> = (payload: T) => void;

class EventBus<TEvents extends Record<string, unknown>> {
  private listeners: { [K in keyof TEvents]?: Set<Listener<TEvents[K]>> } = {};

  on<K extends keyof TEvents>(event: K, listener: Listener<TEvents[K]>): () => void {
    // Local-bind the set so TypeScript can narrow it without needing a
    // non-null assertion. Initializes-on-first-use; the same Set instance
    // is reused across subsequent listeners for the same event.
    const set = this.listeners[event] ?? new Set<Listener<TEvents[K]>>();
    if (!this.listeners[event]) {
      this.listeners[event] = set;
    }
    set.add(listener);
    return () => {
      this.listeners[event]?.delete(listener);
    };
  }

  emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): void {
    this.listeners[event]?.forEach((listener) => {
      try {
        listener(payload);
      } catch (err) {
        if (__DEV__) {
          console.warn(`[events] listener for ${String(event)} threw`, err);
        }
      }
    });
  }
}

/**
 * Strongly-typed event names + payloads. We use a flat record (not template
 * literal keys) so the type satisfies `EventBus`'s `Record<string, unknown>`
 * constraint. To add a new event, just extend this interface.
 */
export interface AppEvents extends Record<string, unknown> {
  "auth:expired": { reason: "401" | "manual" };
  "auth:logged-in": { userId: string };
  "auth:logged-out": null;
}

export const appEvents = new EventBus<AppEvents>();
