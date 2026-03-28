import { startScheduler } from '@/lib/scheduler';

// Next.js instrumentation hook - runs once when the server starts
export async function register() {
  // Only start scheduler on the server side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    startScheduler();
  }
}
