import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyAuth, unauthorized } from '@/lib/auth';
import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'video/mp4', 'video/webm',
];

// GET /api/admin/media - List media with pagination
export async function GET(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();

  const searchParams = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '30')));
  const search = searchParams.get('search') || '';
  const type = searchParams.get('type') || ''; // image, pdf, video

  const where: any = {};
  if (search) {
    where.filename = { contains: search };
  }
  if (type === 'image') {
    where.mimeType = { startsWith: 'image/' };
  } else if (type === 'pdf') {
    where.mimeType = 'application/pdf';
  } else if (type === 'video') {
    where.mimeType = { startsWith: 'video/' };
  }

  const [media, total] = await Promise.all([
    prisma.media.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
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
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

// POST /api/admin/media - Upload file(s)
export async function POST(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();

  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (!files.length) {
      return NextResponse.json({ error: 'Keine Datei hochgeladen' }, { status: 400 });
    }

    // Ensure upload dir exists
    await mkdir(UPLOAD_DIR, { recursive: true });

    const uploaded: any[] = [];

    for (const file of files) {
      // Validate type
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json({ error: `Dateityp nicht erlaubt: ${file.type}` }, { status: 400 });
      }

      // Validate size
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: `Datei zu groß (max. ${MAX_FILE_SIZE / 1024 / 1024}MB): ${file.name}` }, { status: 400 });
      }

      // Generate safe filename
      const ext = path.extname(file.name).toLowerCase();
      const baseName = path.basename(file.name, ext)
        .replace(/[^a-zA-Z0-9_-]/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 80);
      const uniqueId = crypto.randomBytes(4).toString('hex');
      const safeFilename = `${baseName}-${uniqueId}${ext}`;

      // Write file
      const buffer = Buffer.from(await file.arrayBuffer());
      const filePath = path.join(UPLOAD_DIR, safeFilename);
      await writeFile(filePath, buffer);

      // Store in database
      const media = await prisma.media.create({
        data: {
          sourceUrl: `/uploads/${safeFilename}`,
          fileName: safeFilename,
          originalName: file.name,
          mimeType: file.type,
          fileSize: file.size,
        },
      });

      // Return with 'url' field for backwards compatibility
      uploaded.push({ ...media, url: media.sourceUrl, filename: media.fileName, size: media.fileSize });
    }

    return NextResponse.json({ media: uploaded }, { status: 201 });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload fehlgeschlagen' }, { status: 500 });
  }
}

// DELETE /api/admin/media?id=X - Delete media
export async function DELETE(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();

  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'ID erforderlich' }, { status: 400 });
  }

  try {
    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) {
      return NextResponse.json({ error: 'Datei nicht gefunden' }, { status: 404 });
    }

    // Delete physical file
    const filePath = path.join(process.cwd(), 'public', media.sourceUrl);
    try {
      await unlink(filePath);
    } catch {
      // File may already be deleted, continue with DB cleanup
    }

    // Delete DB record
    await prisma.media.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete media error:', error);
    return NextResponse.json({ error: 'Server-Fehler' }, { status: 500 });
  }
}
