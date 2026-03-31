#!/usr/bin/env node
/**
 * Media Backfill Script
 * =====================
 * Scans public/uploads/ directory and creates a Media record
 * for every file found on disk that is not already in the DB.
 *
 * Usage: npx tsx scripts/backfill-media.ts
 *        npx tsx scripts/backfill-media.ts --dry-run
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import * as path from "path";
import * as fs from "fs";

const DRY_RUN = process.argv.includes("--dry-run");

// ─── Prisma Setup ─────────────────────────────────────────
const dbPath = path.join(process.cwd(), "prisma", "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".css": "text/css",
  ".ico": "image/x-icon",
};

function walkDir(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(full));
    } else if (entry.isFile()) {
      results.push(full);
    }
  }
  return results;
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase().split("?")[0]; // handle css?querystring
  return MIME_MAP[ext] || "application/octet-stream";
}

async function main() {
  console.log(DRY_RUN ? "🔍 DRY RUN — no DB writes" : "🚀 LIVE RUN — will write to DB");
  console.log("");

  // 1. Get all files on disk
  const allFiles = walkDir(UPLOAD_ROOT);
  console.log(`📁 Found ${allFiles.length} files in public/uploads/`);

  // 2. Get existing Media records (by sourceUrl)
  const existingMedia = await prisma.media.findMany({ select: { sourceUrl: true } });
  const existingUrls = new Set(existingMedia.map((m) => m.sourceUrl));
  console.log(`📊 Existing Media records in DB: ${existingMedia.length}`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const filePath of allFiles) {
    // Build the URL path: /uploads/2025/02/file.webp
    const relativePath = filePath.replace(UPLOAD_ROOT, "").replace(/\\/g, "/");
    const sourceUrl = `/uploads${relativePath}`;

    // Skip if already in DB
    if (existingUrls.has(sourceUrl)) {
      skipped++;
      continue;
    }

    const stat = fs.statSync(filePath);
    const ext = path.extname(filePath).toLowerCase().split("?")[0];
    const baseName = path.basename(filePath);
    const mimeType = getMimeType(filePath);

    // Extract folder (e.g. "2025/02")
    const parts = relativePath.split("/").filter(Boolean);
    const folder = parts.length > 1 ? parts.slice(0, -1).join("/") : "";

    // Title from filename
    const title = path
      .basename(filePath, ext)
      .replace(/[-_]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (DRY_RUN) {
      console.log(`  [DRY] Would create: ${sourceUrl} (${mimeType}, ${stat.size} bytes)`);
      created++;
      continue;
    }

    try {
      await prisma.media.create({
        data: {
          fileName: baseName,
          originalName: baseName,
          title,
          altText: title,
          sourceUrl,
          localPath: sourceUrl,
          mimeType,
          fileSize: stat.size,
          folder,
          createdAt: stat.birthtime || stat.mtime,
        },
      });
      created++;
    } catch (err: any) {
      console.error(`  ❌ Error: ${sourceUrl}: ${err.message}`);
      errors++;
    }
  }

  console.log("");
  console.log("═══════════════════════════════════════════════");
  console.log(`  Files on disk:      ${allFiles.length}`);
  console.log(`  Already in DB:      ${skipped}`);
  console.log(`  Newly created:      ${created}`);
  console.log(`  Errors:             ${errors}`);
  console.log("═══════════════════════════════════════════════");

  // Verify final count
  const finalCount = await prisma.media.count();
  console.log(`  Total Media in DB:  ${finalCount}`);
  console.log("");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
