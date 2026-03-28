// Internal scheduler that checks for scheduled posts
// Called via API route with self-invoking mechanism

const CRON_SECRET = process.env.CRON_SECRET || 'ikfz-cron-secret-2024';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

let schedulerRunning = false;

export async function startScheduler() {
  if (schedulerRunning) return;
  schedulerRunning = true;

  console.log('[Scheduler] Starting blog post scheduler (every 5 minutes)');

  const run = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/cron/publish-scheduled`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${CRON_SECRET}` },
      });
      const data = await res.json();
      if (data.published > 0) {
        console.log(`[Scheduler] Published ${data.published} scheduled posts`);
      }
    } catch (error) {
      // Server may not be ready yet, will retry
    }
  };

  // Run immediately and then on interval
  setTimeout(run, 10000); // Wait 10s for server startup
  setInterval(run, INTERVAL_MS);
}
