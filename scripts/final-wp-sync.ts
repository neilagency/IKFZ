#!/usr/bin/env node
/**
 * Final WordPress/WooCommerce Sync
 * =================================
 * Last-ever fetch from WooCommerce API.
 * Compares with local DB and inserts any missing data.
 * 
 * Usage: npx tsx scripts/final-wp-sync.ts
 *        npx tsx scripts/final-wp-sync.ts --dry-run
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import * as path from "path";
import * as fs from "fs";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const DRY_RUN = process.argv.includes("--dry-run");
const WP_BASE = process.env.WP_BASE || "https://ikfzdigitalzulassung.de";
const WC_KEY = process.env.WC_CONSUMER_KEY!;
const WC_SECRET = process.env.WC_CONSUMER_SECRET!;
const WC_API = `${WP_BASE}/wp-json/wc/v3`;
const AUDIT_DIR = path.join(process.cwd(), "audit");

if (!WC_KEY || !WC_SECRET) {
  console.error("❌ Missing WC_CONSUMER_KEY or WC_CONSUMER_SECRET in .env.local");
  process.exit(1);
}

// ─── Prisma ───────────────────────────────────────────────
const dbPath = path.join(process.cwd(), "prisma", "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

fs.mkdirSync(AUDIT_DIR, { recursive: true });

// ─── Counters ─────────────────────────────────────────────
const stats = {
  before: { customers: 0, orders: 0, payments: 0, invoices: 0, orderItems: 0 },
  after: { customers: 0, orders: 0, payments: 0, invoices: 0, orderItems: 0 },
  new: { customers: 0, orders: 0, payments: 0, invoices: 0, orderItems: 0 },
  updated: { customers: 0, orders: 0 },
  wpFetched: { customers: 0, orders: 0 },
};

// ─── WC Paginated Fetch ───────────────────────────────────
async function wcFetchAll<T = any>(endpoint: string, params: Record<string, string> = {}): Promise<T[]> {
  const all: T[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const searchParams = new URLSearchParams({
      consumer_key: WC_KEY,
      consumer_secret: WC_SECRET,
      per_page: "100",
      page: String(page),
      ...params,
    });

    const url = `${WC_API}/${endpoint}?${searchParams}`;
    console.log(`  📡 Fetching ${endpoint} page ${page}/${totalPages}...`);

    const res = await fetch(url);
    if (!res.ok) {
      console.error(`  ❌ ${endpoint} page ${page}: HTTP ${res.status}`);
      break;
    }

    const tp = res.headers.get("x-wp-totalpages");
    if (tp) totalPages = parseInt(tp, 10);

    const data: T[] = await res.json();
    all.push(...data);
    page++;
  }

  return all;
}

// ═══════════════════════════════════════════════
// SYNC CUSTOMERS
// ═══════════════════════════════════════════════
async function syncCustomers(wcOrders: any[], wcCustomers: any[]) {
  console.log("\n══ SYNCING CUSTOMERS ══");

  // Collect all unique emails from WC customers + orders
  const emailMap = new Map<string, any>();

  for (const c of wcCustomers) {
    if (c.email) emailMap.set(c.email.toLowerCase(), {
      wcId: c.id,
      email: c.email.toLowerCase(),
      firstName: c.first_name || null,
      lastName: c.last_name || null,
      company: c.billing?.company || null,
      phone: c.billing?.phone || null,
      billingAddress1: c.billing?.address_1 || null,
      billingCity: c.billing?.city || null,
      billingPostcode: c.billing?.postcode || null,
      billingCountry: c.billing?.country || null,
    });
  }

  for (const o of wcOrders) {
    const email = o.billing?.email?.toLowerCase();
    if (!email || emailMap.has(email)) continue;
    emailMap.set(email, {
      wcId: o.customer_id || null,
      email,
      firstName: o.billing?.first_name || null,
      lastName: o.billing?.last_name || null,
      company: o.billing?.company || null,
      phone: o.billing?.phone || null,
      billingAddress1: o.billing?.address_1 || null,
      billingCity: o.billing?.city || null,
      billingPostcode: o.billing?.postcode || null,
      billingCountry: o.billing?.country || null,
    });
  }

  console.log(`  WP total unique customers: ${emailMap.size}`);

  for (const [email, data] of emailMap) {
    const existing = await prisma.customer.findUnique({ where: { email } });
    if (existing) {
      // Update if missing fields
      const updates: any = {};
      if (!existing.firstName && data.firstName) updates.firstName = data.firstName;
      if (!existing.lastName && data.lastName) updates.lastName = data.lastName;
      if (!existing.phone && data.phone) updates.phone = data.phone;
      if (!existing.billingAddress1 && data.billingAddress1) updates.billingAddress1 = data.billingAddress1;
      if (!existing.billingCity && data.billingCity) updates.billingCity = data.billingCity;

      if (Object.keys(updates).length > 0 && !DRY_RUN) {
        await prisma.customer.update({ where: { email }, data: updates });
        stats.updated.customers++;
        console.log(`  🔄 Updated: ${email} (${Object.keys(updates).join(", ")})`);
      }
      continue;
    }

    if (!DRY_RUN) {
      try {
        await prisma.customer.create({
          data: {
            wcId: data.wcId && !await prisma.customer.findUnique({ where: { wcId: data.wcId } }) ? data.wcId : null,
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            company: data.company,
            phone: data.phone,
            billingAddress1: data.billingAddress1,
            billingCity: data.billingCity,
            billingPostcode: data.billingPostcode,
            billingCountry: data.billingCountry,
          },
        });
        stats.new.customers++;
        console.log(`  ➕ New customer: ${email}`);
      } catch (err: any) {
        console.error(`  ❌ Customer ${email}: ${err.message}`);
      }
    } else {
      stats.new.customers++;
      console.log(`  [DRY] Would create: ${email}`);
    }
  }
}

// ═══════════════════════════════════════════════
// SYNC ORDERS + PAYMENTS + INVOICES
// ═══════════════════════════════════════════════
async function syncOrders(wcOrders: any[]) {
  console.log("\n══ SYNCING ORDERS ══");
  console.log(`  WP total orders: ${wcOrders.length}`);

  // Sort chronologically
  wcOrders.sort((a: any, b: any) => a.id - b.id);

  for (const o of wcOrders) {
    // Check if exists by wcId
    const existing = await prisma.order.findUnique({ where: { wcId: o.id } });

    if (existing) {
      // Update status if changed
      const wpStatus = o.status || "pending";
      if (existing.status !== wpStatus) {
        if (!DRY_RUN) {
          await prisma.order.update({
            where: { id: existing.id },
            data: {
              status: wpStatus,
              datePaid: o.date_paid ? new Date(o.date_paid) : existing.datePaid,
              dateCompleted: o.date_completed ? new Date(o.date_completed) : existing.dateCompleted,
            },
          });
          stats.updated.orders++;
          console.log(`  🔄 Updated order #${o.id}: ${existing.status} → ${wpStatus}`);
        }
      }
      continue;
    }

    // New order — create it
    if (DRY_RUN) {
      stats.new.orders++;
      console.log(`  [DRY] Would create order #${o.id} (${o.status}, ${o.total} EUR)`);
      continue;
    }

    try {
      // Find customer
      let customerId: string | null = null;
      if (o.billing?.email) {
        const customer = await prisma.customer.findUnique({ where: { email: o.billing.email.toLowerCase() } });
        if (customer) customerId = customer.id;
      }

      const subtotal = (o.line_items || []).reduce((sum: number, li: any) => sum + (parseFloat(li.subtotal) || 0), 0);

      const order = await prisma.order.create({
        data: {
          wcId: o.id,
          orderNumber: String(o.number || o.id),
          status: o.status || "pending",
          currency: o.currency || "EUR",
          total: parseFloat(o.total) || 0,
          subtotal,
          totalTax: parseFloat(o.total_tax) || 0,
          shippingTotal: parseFloat(o.shipping_total) || 0,
          discountTotal: parseFloat(o.discount_total) || 0,
          paymentMethod: o.payment_method || null,
          paymentMethodTitle: o.payment_method_title || null,
          transactionId: o.transaction_id || null,
          customerNote: o.customer_note || null,
          billingFirstName: o.billing?.first_name || null,
          billingLastName: o.billing?.last_name || null,
          billingCompany: o.billing?.company || null,
          billingEmail: o.billing?.email || null,
          billingPhone: o.billing?.phone || null,
          billingAddress1: o.billing?.address_1 || null,
          billingAddress2: o.billing?.address_2 || null,
          billingCity: o.billing?.city || null,
          billingState: o.billing?.state || null,
          billingPostcode: o.billing?.postcode || null,
          billingCountry: o.billing?.country || null,
          shippingFirstName: o.shipping?.first_name || null,
          shippingLastName: o.shipping?.last_name || null,
          shippingAddress1: o.shipping?.address_1 || null,
          shippingAddress2: o.shipping?.address_2 || null,
          shippingCity: o.shipping?.city || null,
          shippingState: o.shipping?.state || null,
          shippingPostcode: o.shipping?.postcode || null,
          shippingCountry: o.shipping?.country || null,
          customerId,
          datePaid: o.date_paid ? new Date(o.date_paid) : null,
          dateCompleted: o.date_completed ? new Date(o.date_completed) : null,
          createdAt: o.date_created ? new Date(o.date_created) : new Date(),
        },
      });
      stats.new.orders++;

      // Line Items
      for (const li of (o.line_items || [])) {
        let productId: string | null = null;
        if (li.product_id) {
          const product = await prisma.product.findUnique({ where: { wcId: li.product_id } });
          if (product) productId = product.id;
        }

        await prisma.orderItem.create({
          data: {
            orderId: order.id,
            productId,
            wcProductId: li.product_id || null,
            name: li.name || "",
            quantity: li.quantity || 1,
            price: parseFloat(li.price) || 0,
            total: parseFloat(li.total) || 0,
            totalTax: parseFloat(li.total_tax) || 0,
            sku: li.sku || null,
            metaData: li.meta_data ? JSON.stringify(li.meta_data) : null,
          },
        });
        stats.new.orderItems++;
      }

      // Payment
      if (o.payment_method) {
        const paymentStatus = (o.status === "completed" || o.status === "processing") ? "paid" :
                              o.status === "refunded" ? "refunded" :
                              o.status === "failed" ? "failed" : "pending";

        await prisma.payment.create({
          data: {
            orderId: order.id,
            method: o.payment_method,
            methodTitle: o.payment_method_title || null,
            transactionId: o.transaction_id || null,
            status: paymentStatus,
            amount: parseFloat(o.total) || 0,
            currency: o.currency || "EUR",
            paidAt: o.date_paid ? new Date(o.date_paid) : null,
          },
        });
        stats.new.payments++;
      }

      // Invoice (for paid orders)
      if (o.status === "completed" || o.status === "processing") {
        const invoiceNum = `INV-${String(o.number || o.id).padStart(6, "0")}`;

        // Check if invoice number exists
        const existingInv = await prisma.invoice.findUnique({ where: { invoiceNumber: invoiceNum } });
        if (!existingInv) {
          const addrParts = [
            o.billing?.address_1,
            [o.billing?.postcode, o.billing?.city].filter(Boolean).join(" "),
            o.billing?.country,
          ].filter(Boolean);

          const itemsSummary = (o.line_items || []).map((li: any) =>
            `${li.name} x${li.quantity} = ${li.total} ${o.currency}`
          ).join("\n");

          await prisma.invoice.create({
            data: {
              orderId: order.id,
              invoiceNumber: invoiceNum,
              status: o.date_paid ? "paid" : "issued",
              amount: parseFloat(o.total) || 0,
              currency: o.currency || "EUR",
              issuedAt: o.date_created ? new Date(o.date_created) : new Date(),
              paidAt: o.date_paid ? new Date(o.date_paid) : null,
              billingName: [o.billing?.first_name, o.billing?.last_name].filter(Boolean).join(" ") || null,
              billingEmail: o.billing?.email || null,
              billingAddress: addrParts.join(", ") || null,
              items: itemsSummary || null,
            },
          });
          stats.new.invoices++;
        }
      }

      console.log(`  ➕ New order #${o.id} (${o.status}, ${o.total} EUR)`);
    } catch (err: any) {
      console.error(`  ❌ Order ${o.id}: ${err.message}`);
    }
  }
}

// ═══════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════
async function main() {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║   FINAL WordPress/WooCommerce Sync              ║");
  console.log("║   ⚠️  Last-ever fetch from WordPress API        ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log(DRY_RUN ? "🔍 DRY RUN MODE" : "🚀 LIVE MODE");
  console.log("");

  // ── BEFORE counts ──
  stats.before.customers = await prisma.customer.count();
  stats.before.orders = await prisma.order.count();
  stats.before.payments = await prisma.payment.count();
  stats.before.invoices = await prisma.invoice.count();
  stats.before.orderItems = await prisma.orderItem.count();

  console.log("📊 BEFORE sync:");
  console.log(`  Customers:  ${stats.before.customers}`);
  console.log(`  Orders:     ${stats.before.orders}`);
  console.log(`  Payments:   ${stats.before.payments}`);
  console.log(`  Invoices:   ${stats.before.invoices}`);
  console.log(`  OrderItems: ${stats.before.orderItems}`);

  // ── Fetch from WP ──
  console.log("\n══ FETCHING FROM WORDPRESS (FINAL TIME) ══");
  const wcCustomers = await wcFetchAll("customers");
  stats.wpFetched.customers = wcCustomers.length;
  console.log(`  ✅ Fetched ${wcCustomers.length} WC customers`);

  const wcOrders = await wcFetchAll("orders", { status: "any" });
  stats.wpFetched.orders = wcOrders.length;
  console.log(`  ✅ Fetched ${wcOrders.length} WC orders`);

  // Save raw data for audit trail
  fs.writeFileSync(
    path.join(AUDIT_DIR, "final-sync-wp-data.json"),
    JSON.stringify({ timestamp: new Date().toISOString(), customers: wcCustomers.length, orders: wcOrders.length }, null, 2)
  );

  // ── Sync ──
  await syncCustomers(wcOrders, wcCustomers);
  await syncOrders(wcOrders);

  // ── AFTER counts ──
  stats.after.customers = await prisma.customer.count();
  stats.after.orders = await prisma.order.count();
  stats.after.payments = await prisma.payment.count();
  stats.after.invoices = await prisma.invoice.count();
  stats.after.orderItems = await prisma.orderItem.count();

  // ── Report ──
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║            FINAL SYNC REPORT                     ║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log(`║  WP Customers fetched:  ${String(stats.wpFetched.customers).padStart(6)}                ║`);
  console.log(`║  WP Orders fetched:     ${String(stats.wpFetched.orders).padStart(6)}                ║`);
  console.log("╠══════════════════════════════════════════════════╣");
  console.log(`║                    BEFORE  →  AFTER   NEW        ║`);
  console.log(`║  Customers:     ${String(stats.before.customers).padStart(6)}  → ${String(stats.after.customers).padStart(6)}   +${stats.new.customers}       ║`);
  console.log(`║  Orders:        ${String(stats.before.orders).padStart(6)}  → ${String(stats.after.orders).padStart(6)}   +${stats.new.orders}       ║`);
  console.log(`║  Payments:      ${String(stats.before.payments).padStart(6)}  → ${String(stats.after.payments).padStart(6)}   +${stats.new.payments}       ║`);
  console.log(`║  Invoices:      ${String(stats.before.invoices).padStart(6)}  → ${String(stats.after.invoices).padStart(6)}   +${stats.new.invoices}       ║`);
  console.log(`║  OrderItems:    ${String(stats.before.orderItems).padStart(6)}  → ${String(stats.after.orderItems).padStart(6)}   +${stats.new.orderItems}       ║`);
  console.log("╠══════════════════════════════════════════════════╣");
  console.log(`║  Updated customers: ${stats.updated.customers}                          ║`);
  console.log(`║  Updated orders:    ${stats.updated.orders}                          ║`);
  console.log("╚══════════════════════════════════════════════════╝");

  // Save report
  fs.writeFileSync(
    path.join(AUDIT_DIR, "final-sync-report.json"),
    JSON.stringify({ ...stats, timestamp: new Date().toISOString(), dryRun: DRY_RUN }, null, 2)
  );
  console.log("\n📄 Report saved to audit/final-sync-report.json");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
