// Internal scheduler that checks for scheduled posts
// Called via API route with self-invoking mechanism
// Only runs on cluster instance 0 (or non-cluster) to prevent duplicates

const CRON_SECRET = process.env.CRON_SECRET || 'ikfz-cron-secret-2024';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || process.env.SITE_URL || 'https://ikfzdigitalzulassung.de';
const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

let schedulerRunning = false;

export async function startScheduler() {
  if (schedulerRunning) return;

  // In PM2 cluster mode, only run on instance 0
  const instanceId = process.env.NODE_APP_INSTANCE || process.env.pm_id || '0';
  if (instanceId !== '0') {
    console.log(`[Scheduler] Skipping on cluster instance ${instanceId}`);
    return;
  }

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
  const timer = setInterval(run, INTERVAL_MS);
  if (timer.unref) timer.unref();
}
