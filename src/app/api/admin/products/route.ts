import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import prisma from '@/lib/db';
import { verifyAuth, unauthorized } from '@/lib/auth';
import { priceEvents } from '@/lib/price-events';
import { productCreateSchema, productUpdateSchema, formatZodErrors } from '@/lib/validations';

export const dynamic = 'force-dynamic';

function jsonResponse(data: unknown) {
  return new NextResponse(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, must-revalidate',
    },
  });
}

// GET /api/admin/products - List products with pagination
export async function GET(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();

  const searchParams = req.nextUrl.searchParams;

  // Single product by ID (for edit form)
  const id = searchParams.get('id');
  if (id) {
    try {
      const product = await prisma.product.findUnique({ where: { id } });
      if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json(product);
    } catch (error) {
      console.error('Product fetch error:', error);
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
  }

  const search = searchParams.get('search') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));

  // If ?all=true, return all products (for dropdowns etc.)
  const fetchAll = searchParams.get('all') === 'true';

  const where: Record<string, unknown> = {};
  if (search) {
    (where as any).OR = [
      { name: { contains: search } },
      { slug: { contains: search } },
      { serviceType: { contains: search } },
    ];
  }

  try {
    if (fetchAll) {
      const products = await prisma.product.findMany({
        select: { id: true, name: true, slug: true, price: true, isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 500,
      });
      return NextResponse.json(products);
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          isActive: true,
          serviceType: true,
          formType: true,
          featuredImage: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return jsonResponse({
      products,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Products API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/admin/products - Create a product
export async function POST(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();

  try {
    const body = await req.json();

    // Zod validation
    const parsed = productCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(formatZodErrors(parsed.error), { status: 400 });
    }
    const data = parsed.data;

    // Generate slug from name if not provided
    const slug = data.slug || data.name
      .toLowerCase()
      .replace(/[äÄ]/g, 'ae').replace(/[öÖ]/g, 'oe').replace(/[üÜ]/g, 'ue').replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const product = await prisma.product.create({
      data: {
        name: data.name,
        slug,
        price: data.price,
        description: data.description,
        options: data.options,
        isActive: data.isActive,
        serviceType: data.serviceType,
        content: data.content,
        heroTitle: data.heroTitle,
        heroSubtitle: data.heroSubtitle,
        featuredImage: data.featuredImage,
        faqItems: data.faqItems,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
        canonical: data.canonical,
        robots: data.robots,
        ogTitle: data.ogTitle,
        ogDescription: data.ogDescription,
        ogImage: data.ogImage,
        formType: data.formType,
      },
    });

    try {
      revalidatePath('/');
      revalidatePath('/kfz-services');
      revalidatePath(`/product/${product.slug}`);
      revalidatePath('/sitemap.xml');
      revalidateTag('products');
    } catch (e) {
      console.warn('Revalidation warning:', e);
    }

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Product create error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PUT /api/admin/products - Update a product
export async function PUT(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();

  try {
    const body = await req.json();

    // Zod validation
    const parsed = productUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(formatZodErrors(parsed.error), { status: 400 });
    }
    const data = parsed.data;

    // Check slug uniqueness
    if (data.slug) {
      const existing = await prisma.product.findFirst({ where: { slug: data.slug, id: { not: data.id } } });
      if (existing) {
        return NextResponse.json({ error: 'Slug existiert bereits' }, { status: 409 });
      }
    }

    const product = await prisma.product.update({
      where: { id: data.id },
      data: {
        name: data.name,
        slug: data.slug,
        price: data.price,
        description: data.description,
        options: data.options,
        isActive: data.isActive,
        serviceType: data.serviceType,
        content: data.content,
        heroTitle: data.heroTitle,
        heroSubtitle: data.heroSubtitle,
        featuredImage: data.featuredImage,
        faqItems: data.faqItems,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
        canonical: data.canonical,
        robots: data.robots,
        ogTitle: data.ogTitle,
        ogDescription: data.ogDescription,
        ogImage: data.ogImage,
        formType: data.formType,
      },
    });

    // Broadcast price/options change to all connected SSE clients
    priceEvents.emit('price_updated', {
      slug: product.slug,
      price: product.price,
      options: product.options ?? null,
    });

    try {
      revalidatePath('/');
      revalidatePath('/kfz-services');
      revalidatePath(`/product/${product.slug}`);
      revalidatePath('/sitemap.xml');
      revalidateTag('products');
    } catch (e) {
      console.warn('Revalidation warning:', e);
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Product update error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/admin/products - Delete a product
export async function DELETE(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

  try {
    await prisma.productImage.deleteMany({ where: { productId: id } });
    await prisma.productProductCategory.deleteMany({ where: { productId: id } });
    await prisma.product.delete({ where: { id } });

    try {
      revalidatePath('/');
      revalidatePath('/kfz-services');
      revalidatePath('/sitemap.xml');
      revalidateTag('products');
    } catch (e) {
      console.warn('Revalidation warning:', e);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Product delete error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
