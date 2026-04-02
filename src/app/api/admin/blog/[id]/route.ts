import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyAuth, unauthorized, requireRole, forbiddenResponse } from '@/lib/auth';
import { blogPostUpdateSchema } from '@/lib/validations';
import { revalidatePath, revalidateTag } from 'next/cache';

export const dynamic = 'force-dynamic';

function revalidateBlog(slug?: string) {
  if (slug) revalidatePath(`/${slug}`);
  revalidatePath('/insiderwissen');
  revalidatePath('/sitemap.xml');
  revalidateTag('blog');
  revalidateTag('blog-posts');
  revalidateTag('blog-categories');
}

// GET /api/admin/blog/[id] — Get single blog post
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();

  const { id } = await params;
  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) {
    return NextResponse.json({ error: 'Beitrag nicht gefunden' }, { status: 404 });
  }

  return NextResponse.json({
    ...post,
    scheduledAt: post.scheduledAt?.toISOString() || null,
    publishedAt: post.publishedAt?.toISOString() || null,
  });
}

// PUT /api/admin/blog/[id] — Update blog post
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = blogPostUpdateSchema.safeParse({ ...body, id });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Ungültige Eingabe' }, { status: 400 });
    }
    const data = parsed.data;

    // Check slug uniqueness
    if (data.slug) {
      const existing = await prisma.blogPost.findFirst({
        where: { slug: data.slug, id: { not: id } },
      });
      if (existing) {
        return NextResponse.json({ error: 'Slug existiert bereits' }, { status: 409 });
      }
    }

    // Get current post for status transition
    const current = await prisma.blogPost.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ error: 'Beitrag nicht gefunden' }, { status: 404 });
    }

    // Handle scheduling
    let publishedAt = current.publishedAt;
    let scheduledAt = current.scheduledAt;
    let finalStatus = data.status || current.status;

    if (data.status === 'publish') {
      publishedAt = current.publishedAt || new Date(); // Preserve existing publishedAt
      scheduledAt = null;
    } else if (data.status === 'scheduled' && data.scheduledAt) {
      const schedDate = new Date(data.scheduledAt);
      if (schedDate <= new Date()) {
        publishedAt = publishedAt || new Date();
        finalStatus = 'publish';
        scheduledAt = null;
      } else {
        scheduledAt = schedDate;
        finalStatus = 'scheduled';
      }
    } else if (data.status === 'draft') {
      scheduledAt = null;
    }

    const post = await prisma.blogPost.update({
      where: { id },
      data: {
        title: data.title,
        slug: data.slug,
        content: data.content || '',
        excerpt: data.excerpt || '',
        status: finalStatus,
        category: data.category || '',
        tags: data.tags || '',
        featuredImage: data.featuredImage || '',
        featuredImageId: data.featuredImageId || '',
        metaTitle: data.metaTitle || '',
        metaDescription: data.metaDescription || '',
        focusKeyword: data.focusKeyword || '',
        canonical: data.canonical || '',
        ogTitle: data.ogTitle || '',
        ogDescription: data.ogDescription || '',
        publishedAt,
        scheduledAt,
      },
    });

    // Revalidate old slug too if changed
    if (current.slug !== data.slug) revalidateBlog(current.slug);
    revalidateBlog(data.slug);

    return NextResponse.json(post);
  } catch (error: any) {
    console.error('Update blog post error:', error);
    return NextResponse.json({ error: error?.message || 'Server-Fehler' }, { status: 500 });
  }
}

// DELETE /api/admin/blog/[id] — Delete blog post
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();
  if (!requireRole(user, 'admin')) return forbiddenResponse();

  const { id } = await params;

  try {
    const post = await prisma.blogPost.findUnique({ where: { id } });
    if (!post) {
      return NextResponse.json({ error: 'Beitrag nicht gefunden' }, { status: 404 });
    }

    await prisma.blogPost.delete({ where: { id } });
    revalidateBlog(post.slug);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete blog post error:', error);
    return NextResponse.json({ error: 'Server-Fehler' }, { status: 500 });
  }
}
