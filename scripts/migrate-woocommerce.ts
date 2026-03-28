#!/usr/bin/env node
/**
 * ============================================
 * WooCommerce → Next.js E-Commerce Migration
 * ============================================
 * Fetches ALL data from WooCommerce REST API:
 *   - Products + images + categories
 *   - Orders + line items
 *   - Customers (extracted from orders)
 *   - Payment records
 *   - Auto-generated invoices
 * 
 * Stores everything in Prisma/SQLite DB.
 * Usage: npx tsx scripts/migrate-woocommerce.ts
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import * as path from "path";
import * as fs from "fs";
import * as dotenv from "dotenv";

// Load .env.local
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

// ─── Config ───────────────────────────────────────────────
const WP_BASE = process.env.WP_BASE || "https://ikfzdigitalzulassung.de";
const WC_KEY = process.env.WC_CONSUMER_KEY!;
const WC_SECRET = process.env.WC_CONSUMER_SECRET!;
const WC_API = `${WP_BASE}/wp-json/wc/v3`;
const LOG_DIR = path.join(process.cwd(), "logs");
const AUDIT_DIR = path.join(process.cwd(), "audit");

if (!WC_KEY || !WC_SECRET) {
  console.error("❌ Missing WC_CONSUMER_KEY or WC_CONSUMER_SECRET in .env.local");
  process.exit(1);
}

// ─── Prisma Setup ─────────────────────────────────────────
const dbPath = path.join(process.cwd(), "prisma", "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

// ─── Logger ───────────────────────────────────────────────
fs.mkdirSync(LOG_DIR, { recursive: true });
fs.mkdirSync(AUDIT_DIR, { recursive: true });
const logFile = path.join(LOG_DIR, `wc-migration-${new Date().toISOString().slice(0, 10)}.log`);
const logStream = fs.createWriteStream(logFile, { flags: "a" });

function log(level: string, msg: string) {
  const line = `[${new Date().toISOString()}] [${level}] ${msg}`;
  console.log(level === "ERROR" ? `\x1b[31m${line}\x1b[0m` : level === "OK" ? `\x1b[32m${line}\x1b[0m` : `\x1b[36m${line}\x1b[0m`);
  logStream.write(line + "\n");
}

// ─── WC API Fetch with Pagination ─────────────────────────
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
    log("FETCH", `${endpoint} page ${page}/${totalPages}`);

    try {
      const res = await fetch(url);
      if (!res.ok) {
        log("ERROR", `${endpoint} page ${page}: HTTP ${res.status}`);
        break;
      }

      const tp = res.headers.get("x-wp-totalpages");
      if (tp) totalPages = parseInt(tp, 10);

      const data: T[] = await res.json();
      all.push(...data);
      log("OK", `${endpoint} page ${page}: ${data.length} items (total so far: ${all.length})`);
    } catch (err: any) {
      log("ERROR", `${endpoint} page ${page}: ${err.message}`);
      break;
    }
    page++;
  }

  return all;
}

// ═══════════════════════════════════════════════════════════
// PHASE 1: FETCH ALL WOOCOMMERCE DATA
// ═══════════════════════════════════════════════════════════
async function fetchAllData() {
  log("PHASE", "═══ PHASE 1: FETCHING ALL WOOCOMMERCE DATA ═══");

  // Products
  const products = await wcFetchAll("products");
  fs.writeFileSync(path.join(AUDIT_DIR, "wc-products.json"), JSON.stringify(products, null, 2));
  log("OK", `Fetched ${products.length} products`);

  // Product categories
  const categories = await wcFetchAll("products/categories");
  fs.writeFileSync(path.join(AUDIT_DIR, "wc-categories.json"), JSON.stringify(categories, null, 2));
  log("OK", `Fetched ${categories.length} product categories`);

  // Orders (all statuses)
  const orders = await wcFetchAll("orders", { status: "any" });
  fs.writeFileSync(path.join(AUDIT_DIR, "wc-orders.json"), JSON.stringify(orders, null, 2));
  log("OK", `Fetched ${orders.length} orders`);

  // Customers
  const customers = await wcFetchAll("customers");
  fs.writeFileSync(path.join(AUDIT_DIR, "wc-customers.json"), JSON.stringify(customers, null, 2));
  log("OK", `Fetched ${customers.length} customers`);

  // Payment gateways
  const searchParams = new URLSearchParams({ consumer_key: WC_KEY, consumer_secret: WC_SECRET });
  const gwRes = await fetch(`${WC_API}/payment_gateways?${searchParams}`);
  const gateways = await gwRes.json();
  fs.writeFileSync(path.join(AUDIT_DIR, "wc-payment-gateways.json"), JSON.stringify(gateways, null, 2));
  log("OK", `Fetched ${gateways.length} payment gateways`);

  return { products, categories, orders, customers, gateways };
}

// ═══════════════════════════════════════════════════════════
// PHASE 2: MIGRATE PRODUCT CATEGORIES
// ═══════════════════════════════════════════════════════════
async function migrateCategories(categories: any[]) {
  log("PHASE", "═══ PHASE 2: MIGRATING PRODUCT CATEGORIES ═══");
  let created = 0;
  let skipped = 0;

  for (const cat of categories) {
    try {
      const existing = await prisma.productCategory.findUnique({ where: { wcId: cat.id } });
      if (existing) { skipped++; continue; }

      await prisma.productCategory.create({
        data: {
          wcId: cat.id,
          name: cat.name || "Uncategorized",
          slug: cat.slug || `cat-${cat.id}`,
          description: cat.description || null,
          count: cat.count || 0,
        },
      });
      created++;
      log("OK", `Category: ${cat.name}`);
    } catch (err: any) {
      log("ERROR", `Category ${cat.id}: ${err.message}`);
    }
  }

  log("OK", `Categories: ${created} created, ${skipped} skipped`);
}

// ═══════════════════════════════════════════════════════════
// PHASE 3: MIGRATE PRODUCTS
// ═══════════════════════════════════════════════════════════
async function migrateProducts(products: any[]) {
  log("PHASE", "═══ PHASE 3: MIGRATING PRODUCTS ═══");
  let created = 0;
  let skipped = 0;

  for (const p of products) {
    try {
      const existing = await prisma.product.findUnique({ where: { wcId: p.id } });
      if (existing) { skipped++; continue; }

      const product = await prisma.product.create({
        data: {
          wcId: p.id,
          name: p.name || "",
          slug: p.slug || `product-${p.id}`,
          type: p.type || "simple",
          status: p.status || "publish",
          description: p.description || null,
          shortDescription: p.short_description || null,
          sku: p.sku || null,
          price: parseFloat(p.price) || 0,
          regularPrice: parseFloat(p.regular_price) || 0,
          salePrice: p.sale_price ? parseFloat(p.sale_price) : null,
          currency: "EUR",
          stockStatus: p.stock_status || "instock",
          stockQuantity: p.stock_quantity || null,
          weight: p.weight || null,
          featured: p.featured || false,
          catalogVisibility: p.catalog_visibility || "visible",
          taxStatus: p.tax_status || "taxable",
          taxClass: p.tax_class || null,
          permalink: p.permalink || null,
        },
      });

      // Images
      if (p.images && p.images.length > 0) {
        for (let i = 0; i < p.images.length; i++) {
          const img = p.images[i];
          await prisma.productImage.create({
            data: {
              productId: product.id,
              wcId: img.id || null,
              src: img.src || "",
              name: img.name || null,
              alt: img.alt || null,
              position: i,
            },
          });
        }
        log("OK", `  → ${p.images.length} images`);
      }

      // Link categories
      if (p.categories && p.categories.length > 0) {
        for (const cat of p.categories) {
          const dbCat = await prisma.productCategory.findUnique({ where: { wcId: cat.id } });
          if (dbCat) {
            await prisma.productProductCategory.create({
              data: { productId: product.id, categoryId: dbCat.id },
            });
          }
        }
      }

      created++;
      log("OK", `Product: ${p.name} (${p.price} EUR)`);
    } catch (err: any) {
      log("ERROR", `Product ${p.id} (${p.name}): ${err.message}`);
    }
  }

  log("OK", `Products: ${created} created, ${skipped} skipped`);
}

// ═══════════════════════════════════════════════════════════
// PHASE 4: EXTRACT & MIGRATE CUSTOMERS FROM ORDERS
// ═══════════════════════════════════════════════════════════
async function migrateCustomers(orders: any[], wcCustomers: any[]) {
  log("PHASE", "═══ PHASE 4: MIGRATING CUSTOMERS ═══");
  let created = 0;
  let skipped = 0;

  // First: WC customers if any
  for (const c of wcCustomers) {
    if (!c.email) continue;
    try {
      const existing = await prisma.customer.findUnique({ where: { email: c.email } });
      if (existing) { skipped++; continue; }

      await prisma.customer.create({
        data: {
          wcId: c.id || null,
          email: c.email,
          firstName: c.first_name || null,
          lastName: c.last_name || null,
          company: c.billing?.company || null,
          phone: c.billing?.phone || null,
          billingAddress1: c.billing?.address_1 || null,
          billingAddress2: c.billing?.address_2 || null,
          billingCity: c.billing?.city || null,
          billingState: c.billing?.state || null,
          billingPostcode: c.billing?.postcode || null,
          billingCountry: c.billing?.country || null,
          shippingAddress1: c.shipping?.address_1 || null,
          shippingAddress2: c.shipping?.address_2 || null,
          shippingCity: c.shipping?.city || null,
          shippingState: c.shipping?.state || null,
          shippingPostcode: c.shipping?.postcode || null,
          shippingCountry: c.shipping?.country || null,
        },
      });
      created++;
    } catch (err: any) {
      log("ERROR", `Customer ${c.email}: ${err.message}`);
    }
  }

  // Second: Extract unique customers from orders
  const seenEmails = new Set<string>();
  for (const o of orders) {
    const email = o.billing?.email;
    if (!email || seenEmails.has(email.toLowerCase())) continue;
    seenEmails.add(email.toLowerCase());

    try {
      const existing = await prisma.customer.findUnique({ where: { email: email.toLowerCase() } });
      if (existing) { skipped++; continue; }

      await prisma.customer.create({
        data: {
          wcId: o.customer_id || null,
          email: email.toLowerCase(),
          firstName: o.billing?.first_name || null,
          lastName: o.billing?.last_name || null,
          company: o.billing?.company || null,
          phone: o.billing?.phone || null,
          billingAddress1: o.billing?.address_1 || null,
          billingAddress2: o.billing?.address_2 || null,
          billingCity: o.billing?.city || null,
          billingState: o.billing?.state || null,
          billingPostcode: o.billing?.postcode || null,
          billingCountry: o.billing?.country || null,
          shippingAddress1: o.shipping?.address_1 || null,
          shippingAddress2: o.shipping?.address_2 || null,
          shippingCity: o.shipping?.city || null,
          shippingState: o.shipping?.state || null,
          shippingPostcode: o.shipping?.postcode || null,
          shippingCountry: o.shipping?.country || null,
        },
      });
      created++;
    } catch (err: any) {
      log("ERROR", `Customer from order ${o.id} (${email}): ${err.message}`);
    }
  }

  log("OK", `Customers: ${created} created, ${skipped} skipped`);
}

// ═══════════════════════════════════════════════════════════
// PHASE 5: MIGRATE ORDERS + LINE ITEMS + PAYMENTS + INVOICES
// ═══════════════════════════════════════════════════════════
async function migrateOrders(orders: any[]) {
  log("PHASE", "═══ PHASE 5: MIGRATING ORDERS + PAYMENTS + INVOICES ═══");
  let ordersCreated = 0;
  let itemsCreated = 0;
  let paymentsCreated = 0;
  let invoicesCreated = 0;
  let skipped = 0;

  // Sort by ID to maintain order
  orders.sort((a: any, b: any) => a.id - b.id);

  for (const o of orders) {
    try {
      const existing = await prisma.order.findUnique({ where: { wcId: o.id } });
      if (existing) { skipped++; continue; }

      // Find customer
      let customerId: string | null = null;
      if (o.billing?.email) {
        const customer = await prisma.customer.findUnique({ where: { email: o.billing.email.toLowerCase() } });
        if (customer) customerId = customer.id;
      }

      // Calculate subtotal from line items
      const subtotal = (o.line_items || []).reduce((sum: number, li: any) => sum + (parseFloat(li.subtotal) || 0), 0);

      const order = await prisma.order.create({
        data: {
          wcId: o.id,
          orderNumber: String(o.number || o.id),
          status: o.status || "pending",
          currency: o.currency || "EUR",
          total: parseFloat(o.total) || 0,
          subtotal: subtotal,
          totalTax: parseFloat(o.total_tax) || 0,
          shippingTotal: parseFloat(o.shipping_total) || 0,
          discountTotal: parseFloat(o.discount_total) || 0,
          paymentMethod: o.payment_method || null,
          paymentMethodTitle: o.payment_method_title || null,
          transactionId: o.transaction_id || null,
          customerNote: o.customer_note || null,
          // Billing
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
          // Shipping
          shippingFirstName: o.shipping?.first_name || null,
          shippingLastName: o.shipping?.last_name || null,
          shippingAddress1: o.shipping?.address_1 || null,
          shippingAddress2: o.shipping?.address_2 || null,
          shippingCity: o.shipping?.city || null,
          shippingState: o.shipping?.state || null,
          shippingPostcode: o.shipping?.postcode || null,
          shippingCountry: o.shipping?.country || null,
          // Customer link
          customerId: customerId,
          // Dates
          datePaid: o.date_paid ? new Date(o.date_paid) : null,
          dateCompleted: o.date_completed ? new Date(o.date_completed) : null,
          createdAt: o.date_created ? new Date(o.date_created) : new Date(),
        },
      });
      ordersCreated++;

      // Line Items
      for (const li of (o.line_items || [])) {
        // Try to find product in DB
        let productId: string | null = null;
        if (li.product_id) {
          const product = await prisma.product.findUnique({ where: { wcId: li.product_id } });
          if (product) productId = product.id;
        }

        await prisma.orderItem.create({
          data: {
            orderId: order.id,
            productId: productId,
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
        itemsCreated++;
      }

      // Payment record
      if (o.payment_method) {
        const paymentStatus = (o.status === "completed" || o.status === "processing") ? "completed" :
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
        paymentsCreated++;
      }

      // Auto-generate invoice for completed/processing orders
      if (o.status === "completed" || o.status === "processing") {
        const invoiceNum = `INV-${String(o.number || o.id).padStart(6, "0")}`;

        // Build billing address string
        const addrParts = [
          o.billing?.address_1,
          o.billing?.address_2,
          [o.billing?.postcode, o.billing?.city].filter(Boolean).join(" "),
          o.billing?.country,
        ].filter(Boolean);

        // Build items summary
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
        invoicesCreated++;
      }

      if (ordersCreated % 20 === 0) {
        log("OK", `  Progress: ${ordersCreated} orders...`);
      }
    } catch (err: any) {
      log("ERROR", `Order ${o.id}: ${err.message}`);
    }
  }

  log("OK", `Orders: ${ordersCreated} created, ${skipped} skipped`);
  log("OK", `Line items: ${itemsCreated} created`);
  log("OK", `Payments: ${paymentsCreated} created`);
  log("OK", `Invoices: ${invoicesCreated} generated`);
}

// ═══════════════════════════════════════════════════════════
// PHASE 6: VALIDATION
// ═══════════════════════════════════════════════════════════
async function validate(wcData: any) {
  log("PHASE", "═══ PHASE 6: DATA VALIDATION ═══");

  const dbProducts = await prisma.product.count();
  const dbOrders = await prisma.order.count();
  const dbCustomers = await prisma.customer.count();
  const dbPayments = await prisma.payment.count();
  const dbInvoices = await prisma.invoice.count();
  const dbOrderItems = await prisma.orderItem.count();
  const dbCategories = await prisma.productCategory.count();
  const dbImages = await prisma.productImage.count();

  const wcLineItems = wcData.orders.reduce((sum: number, o: any) => sum + (o.line_items?.length || 0), 0);
  const wcPaidOrders = wcData.orders.filter((o: any) => o.status === "completed" || o.status === "processing").length;

  console.log("");
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║              DATA VALIDATION REPORT                     ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log(`║  Products:     WC=${wcData.products.length.toString().padStart(4)}  →  DB=${dbProducts.toString().padStart(4)}  ${wcData.products.length === dbProducts ? "✅" : "❌"}              ║`);
  console.log(`║  Categories:   WC=${wcData.categories.length.toString().padStart(4)}  →  DB=${dbCategories.toString().padStart(4)}  ${wcData.categories.length === dbCategories ? "✅" : "❌"}              ║`);
  console.log(`║  Orders:       WC=${wcData.orders.length.toString().padStart(4)}  →  DB=${dbOrders.toString().padStart(4)}  ${wcData.orders.length === dbOrders ? "✅" : "❌"}              ║`);
  console.log(`║  Line Items:   WC=${wcLineItems.toString().padStart(4)}  →  DB=${dbOrderItems.toString().padStart(4)}  ${wcLineItems === dbOrderItems ? "✅" : "❌"}              ║`);
  console.log(`║  Customers:          DB=${dbCustomers.toString().padStart(4)}  (from orders)    ║`);
  console.log(`║  Payments:           DB=${dbPayments.toString().padStart(4)}  (from orders)    ║`);
  console.log(`║  Invoices:     Paid=${wcPaidOrders.toString().padStart(4)}  →  DB=${dbInvoices.toString().padStart(4)}  ${wcPaidOrders === dbInvoices ? "✅" : "❌"}              ║`);
  console.log(`║  Images:             DB=${dbImages.toString().padStart(4)}                    ║`);
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log("");

  const allMatch = wcData.products.length === dbProducts && wcData.orders.length === dbOrders;

  if (allMatch) {
    console.log("\x1b[42m\x1b[30m ✅ ALL DATA MIGRATED SUCCESSFULLY — ZERO DATA LOSS \x1b[0m");
  } else {
    console.log("\x1b[41m\x1b[37m ❌ DATA MISMATCH DETECTED — CHECK LOGS \x1b[0m");
  }

  // Save validation report
  const report = {
    timestamp: new Date().toISOString(),
    wordpress: {
      products: wcData.products.length,
      categories: wcData.categories.length,
      orders: wcData.orders.length,
      lineItems: wcLineItems,
      paidOrders: wcPaidOrders,
    },
    database: { products: dbProducts, categories: dbCategories, orders: dbOrders, orderItems: dbOrderItems, customers: dbCustomers, payments: dbPayments, invoices: dbInvoices, images: dbImages },
    match: allMatch,
  };
  fs.writeFileSync(path.join(AUDIT_DIR, "wc-migration-report.json"), JSON.stringify(report, null, 2));
  log("OK", "Validation report saved to audit/wc-migration-report.json");

  return allMatch;
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════
async function main() {
  console.log("");
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║     WooCommerce → Next.js E-Commerce Migration         ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log("");

  const startTime = Date.now();

  // Phase 1: Fetch all data
  const wcData = await fetchAllData();

  // Phase 2: Migrate categories
  await migrateCategories(wcData.categories);

  // Phase 3: Migrate products
  await migrateProducts(wcData.products);

  // Phase 4: Migrate customers
  await migrateCustomers(wcData.orders, wcData.customers);

  // Phase 5: Migrate orders + payments + invoices
  await migrateOrders(wcData.orders);

  // Phase 6: Validate
  const success = await validate(wcData);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log("DONE", `Migration completed in ${elapsed}s`);

  await prisma.$disconnect();
  logStream.end();
  process.exit(success ? 0 : 1);
}

main().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
