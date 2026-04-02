import { startScheduler } from '@/lib/scheduler';

// Next.js instrumentation hook - runs once when the server starts
export async function register() {
  // Only start scheduler on the server side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // ── Database Connection Verification ──
    console.log('[STARTUP] ════════════════════════════════════════');
    console.log('[STARTUP] NODE_ENV:', process.env.NODE_ENV);
    console.log('[STARTUP] DB_PATH:', process.env.DB_PATH || '(not set)');
    console.log('[STARTUP] CWD:', process.cwd());

    try {
      const { default: prisma } = await import('@/lib/db');
      const products = await prisma.product.count();
      const orders = await prisma.order.count();
      const settings = await prisma.siteSetting.count();
      console.log('[STARTUP] ✅ Database verified:',
        `Products=${products}`,
        `Orders=${orders}`,
        `Settings=${settings}`
      );
    } catch (error) {
      console.error('[STARTUP] ❌ DATABASE CONNECTION FAILED:', error);
      console.error('[STARTUP] The admin dashboard will NOT work without a valid database!');
    }
    console.log('[STARTUP] ════════════════════════════════════════');

    startScheduler();
  }
}
