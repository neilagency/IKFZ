import { EventEmitter } from 'events';

export interface PriceUpdateEvent {
  slug: string;
  price: number;
  options: string | null;
}

// Singleton EventEmitter — broadcasts price changes within the Node.js process.
// Uses globalThis to survive Next.js hot-reload in dev without creating duplicate emitters.
const g = globalThis as typeof globalThis & { __priceEvents?: EventEmitter };

if (!g.__priceEvents) {
  g.__priceEvents = new EventEmitter();
  g.__priceEvents.setMaxListeners(200);
}

export const priceEvents: EventEmitter = g.__priceEvents;
