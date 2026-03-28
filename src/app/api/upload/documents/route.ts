import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'documents');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const uploadedFiles: Record<string, string> = {};

    // Ensure upload directory exists
    await mkdir(UPLOAD_DIR, { recursive: true });

    const fields = ['fahrzeugschein', 'fahrzeugbrief', 'ausweis'];

    for (const key of fields) {
      const value = formData.get(key);
      if (!value || !(value instanceof File)) continue;
      if (value.size === 0) continue;

      // Validate file type
      if (!ALLOWED_TYPES.includes(value.type)) {
        return NextResponse.json(
          { error: `Ungültiger Dateityp für ${key}: ${value.type}` },
          { status: 400 }
        );
      }

      // Validate file size
      if (value.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `Datei ${key} ist zu groß (max. 10 MB)` },
          { status: 400 }
        );
      }

      // Generate safe filename
      const ext = value.name.split('.').pop()?.toLowerCase() ?? 'bin';
      const safeExt = ext.replace(/[^a-z0-9]/g, '');
      const filename = `${key}-${randomUUID()}.${safeExt}`;
      const filepath = path.join(UPLOAD_DIR, filename);

      // Write file
      const arrayBuffer = await value.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await writeFile(filepath, buffer);

      uploadedFiles[key] = `/uploads/documents/${filename}`;
    }

    return NextResponse.json({
      success: true,
      files: uploadedFiles,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload fehlgeschlagen' },
      { status: 500 }
    );
  }
}
