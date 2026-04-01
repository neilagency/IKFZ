/**
 * Advanced Media Library API
 * ==========================
 * GET    /api/admin/media              — List media (paginated, searchable, filterable)
 * GET    /api/admin/media?stats=true   — Media analytics (storage, counts, most used)
 * POST   /api/admin/media              — Upload file(s), update metadata, or replace image
 * DELETE /api/admin/media?id=xxx       — Safe delete (warns if in use)
 * PUT    /api/admin/media              — Scan & update usage tracking across all content
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyAuth, unauthorized } from '@/lib/auth';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'video/mp4', 'video/webm',
];

// ── GET: List media or fetch analytics ──────────────────────
export async function GET(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();

  try {
    const searchParams = req.nextUrl.searchParams;

    // Analytics mode
    if (searchParams.get('stats') === 'true') {
      const [totalCount, totalSizeResult, topUsed, byType] = await Promise.all([
        prisma.media.count(),
        prisma.media.aggregate({ _sum: { fileSize: true } }),
        prisma.media.findMany({
          where: { useCount: { gt: 0 } },
          orderBy: { useCount: 'desc' },
          take: 10,
          select: { id: true, fileName: true, thumbnailUrl: true, sourceUrl: true, useCount: true },
        }),
        prisma.media.groupBy({
          by: ['mimeType'],
          _count: true,
          _sum: { fileSize: true },
        }),
      ]);

      return NextResponse.json({
        totalFiles: totalCount,
        totalStorage: totalSizeResult._sum.fileSize || 0,
        topUsed,
        byType: byType.map((t) => ({
          type: t.mimeType,
          count: t._count,
          size: t._sum.fileSize || 0,
        })),
      });
    }

    // Normal list mode
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '24')));
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';
    const imagesOnly = searchParams.get('imagesOnly') !== 'false'; // default: true
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { fileName: { contains: search } },
        { title: { contains: search } },
        { altText: { contains: search } },
        { originalName: { contains: search } },
      ];
    }
    if (type === 'image') {
      where.mimeType = { startsWith: 'image/' };
    } else if (type === 'pdf') {
      where.mimeType = 'application/pdf';
    } else if (type === 'video') {
      where.mimeType = { startsWith: 'video/' };
    } else if (imagesOnly) {
      where.mimeType = { startsWith: 'image/' };
    }

    const [media, total] = await Promise.all([
      prisma.media.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.media.count({ where }),
    ]);

    return NextResponse.json({
      media: media.map(m => ({
        ...m,
        // backwards-compat aliases
        url: m.sourceUrl || m.localPath || '',
        filename: m.fileName || m.originalName || '',
        size: m.fileSize || 0,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      // legacy fields
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Media list error:', error);
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 });
  }
}

// ── POST: Upload files, update metadata, or replace image ───
export async function POST(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();

  try {
    const contentType = req.headers.get('content-type') || '';

    // Multipart: either upload new files or replace an existing image
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const id = formData.get('id') as string | null;

      // Replace existing image (multipart with id + file)
      if (id) {
        const file = formData.get('file') as File;
        if (!file) {
          return NextResponse.json({ error: 'File required for replace' }, { status: 400 });
        }

        const existing = await prisma.media.findUnique({ where: { id } });
        if (!existing) {
          return NextResponse.json({ error: 'Media not found' }, { status: 404 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Overwrite the original file at the same path
        const localPath = existing.localPath || existing.sourceUrl;
        const absPath = path.join(process.cwd(), 'public', localPath.replace(/^\//, ''));
        await writeFile(absPath, buffer);

        const updated = await prisma.media.update({
          where: { id },
          data: { fileSize: file.size, mimeType: file.type },
        });

        return NextResponse.json({ ...updated, url: updated.sourceUrl, filename: updated.fileName, size: updated.fileSize });
      }

      // Upload new files
      const files = formData.getAll('files') as File[];
      if (!files.length) {
        // Try single 'file' field
        const singleFile = formData.get('file') as File;
        if (singleFile) files.push(singleFile);
      }

      if (!files.length) {
        return NextResponse.json({ error: 'Keine Datei hochgeladen' }, { status: 400 });
      }

      await mkdir(UPLOAD_DIR, { recursive: true });
      const uploaded: any[] = [];

      for (const file of files) {
        if (!ALLOWED_TYPES.includes(file.type)) {
          return NextResponse.json({ error: `Dateityp nicht erlaubt: ${file.type}` }, { status: 400 });
        }
        if (file.size > MAX_FILE_SIZE) {
          return NextResponse.json({ error: `Datei zu groß (max. ${MAX_FILE_SIZE / 1024 / 1024}MB): ${file.name}` }, { status: 400 });
        }

        const ext = path.extname(file.name).toLowerCase();
        const baseName = path.basename(file.name, ext)
          .replace(/[^a-zA-Z0-9_-]/g, '-')
          .replace(/-+/g, '-')
          .substring(0, 80);
        const uniqueId = crypto.randomBytes(4).toString('hex');
        const safeFilename = `${baseName}-${uniqueId}${ext}`;

        const buffer = Buffer.from(await file.arrayBuffer());
        const filePath = path.join(UPLOAD_DIR, safeFilename);
        await writeFile(filePath, buffer);

        const media = await prisma.media.create({
          data: {
            sourceUrl: `/uploads/${safeFilename}`,
            localPath: `uploads/${safeFilename}`,
            fileName: safeFilename,
            originalName: file.name,
            mimeType: file.type,
            fileSize: file.size,
          },
        });

        uploaded.push({ ...media, url: media.sourceUrl, filename: media.fileName, size: media.fileSize });
      }

      return NextResponse.json({ media: uploaded }, { status: 201 });
    }

    // JSON body: update metadata
    const body = await req.json();
    const { id: metaId, fileName, altText, title } = body;

    if (!metaId) {
      return NextResponse.json({ error: 'Media ID required' }, { status: 400 });
    }

    const existing = await prisma.media.findUnique({ where: { id: metaId } });
    if (!existing) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    const data: any = {};
    if (fileName !== undefined) {
      data.fileName = fileName
        .toLowerCase()
        .replace(/[^a-z0-9.-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }
    if (altText !== undefined) data.altText = altText;
    if (title !== undefined) data.title = title;

    const updated = await prisma.media.update({ where: { id: metaId }, data });
    return NextResponse.json({ ...updated, url: updated.sourceUrl, filename: updated.fileName, size: updated.fileSize });
  } catch (error) {
    console.error('Media update error:', error);
    return NextResponse.json({ error: 'Failed to update media' }, { status: 500 });
  }
}

// ── DELETE: Safe delete with usage check ────────────────────
export async function DELETE(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();

  try {
    const id = req.nextUrl.searchParams.get('id');
    const force = req.nextUrl.searchParams.get('force') === 'true';

    if (!id) {
      return NextResponse.json({ error: 'ID erforderlich' }, { status: 400 });
    }

    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) {
      return NextResponse.json({ error: 'Datei nicht gefunden' }, { status: 404 });
    }

    // Check usage — block delete if in use (unless force=true)
    const usedIn = JSON.parse(media.usedIn || '[]');
    if (usedIn.length > 0 && !force) {
      return NextResponse.json({
        error: 'Bild wird noch verwendet',
        usedIn,
        useCount: usedIn.length,
        requireForce: true,
      }, { status: 409 });
    }

    // Delete all variant files from disk
    const urlsToDelete = [
      media.localPath || media.sourceUrl,
      media.thumbnailUrl,
      media.mediumUrl,
      media.largeUrl,
      media.webpUrl,
      media.avifUrl,
    ].filter(Boolean);

    for (const urlPath of urlsToDelete) {
      const cleaned = urlPath.replace(/^\//, '');
      const absPath = path.join(process.cwd(), 'public', cleaned);
      if (existsSync(absPath)) {
        try { await unlink(absPath); } catch { /* ignore */ }
      }
    }

    await prisma.media.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete media error:', error);
    return NextResponse.json({ error: 'Server-Fehler' }, { status: 500 });
  }
}

// ── PUT: Scan & update usage tracking ───────────────────────
export async function PUT(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();

  try {
    const allMedia = await prisma.media.findMany({
      select: { id: true, sourceUrl: true, thumbnailUrl: true, webpUrl: true },
    });

    const [posts, pages, products] = await Promise.all([
      prisma.blogPost.findMany({
        select: { id: true, title: true, featuredImage: true, content: true, ogImage: true },
      }),
      prisma.page.findMany({
        select: { id: true, title: true, featuredImage: true, content: true },
      }),
      prisma.product.findMany({
        select: { id: true, name: true, description: true, ogImage: true },
      }),
    ]);

    let updated = 0;

    for (const m of allMedia) {
      const refs: { type: string; id: string; field: string; title: string }[] = [];

      const matchesUrl = (text: string | null) => {
        if (!text) return false;
        return text.includes(m.sourceUrl) ||
          (m.thumbnailUrl && text.includes(m.thumbnailUrl)) ||
          (m.webpUrl && text.includes(m.webpUrl));
      };

      for (const p of posts) {
        if (matchesUrl(p.featuredImage)) refs.push({ type: 'blog', id: p.id, field: 'featuredImage', title: p.title });
        if (matchesUrl(p.content)) refs.push({ type: 'blog', id: p.id, field: 'content', title: p.title });
        if (matchesUrl(p.ogImage)) refs.push({ type: 'blog', id: p.id, field: 'ogImage', title: p.title });
      }
      for (const p of pages) {
        if (matchesUrl(p.featuredImage)) refs.push({ type: 'page', id: p.id, field: 'featuredImage', title: p.title });
        if (matchesUrl(p.content)) refs.push({ type: 'page', id: p.id, field: 'content', title: p.title });
      }
      for (const p of products) {
        if (matchesUrl(p.description)) refs.push({ type: 'product', id: p.id, field: 'description', title: p.name });
        if (matchesUrl(p.ogImage)) refs.push({ type: 'product', id: p.id, field: 'ogImage', title: p.name });
      }

      await prisma.media.update({
        where: { id: m.id },
        data: { usedIn: JSON.stringify(refs), useCount: refs.length },
      });
      updated++;
    }

    return NextResponse.json({ success: true, scanned: allMedia.length, updated });
  } catch (error) {
    console.error('Usage scan error:', error);
    return NextResponse.json({ error: 'Failed to scan usage' }, { status: 500 });
  }
}
