/**
 * LEGACY ROUTE — Redirects to /api/payment/webhook/
 * Kept for backward compatibility with in-flight Mollie payments.
 */
export { POST, dynamic } from '@/app/api/payment/webhook/route';
