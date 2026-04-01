import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyAuth, unauthorized, requireRole, forbiddenResponse } from '@/lib/auth';
import { priceEvents } from '@/lib/price-events';

// GET /api/admin/products - List products with pagination
export async function GET(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();

  const searchParams = req.nextUrl.searchParams;
  const search = searchParams.get('search') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '30')));

  const where = search ? { name: { contains: search } } : undefined;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        images: { orderBy: { position: 'asc' } },
        productCategories: { include: { category: true } },
        _count: { select: { orderItems: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({ products, total, page, totalPages: Math.ceil(total / limit) });
}

// POST /api/admin/products - Create a product
export async function POST(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();

  try {
    const data = await req.json();
    const product = await prisma.product.create({
      data: {
        name: data.name,
        slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        type: data.type || 'simple',
        status: data.status || 'publish',
        description: data.description || null,
        shortDescription: data.shortDescription || null,
        sku: data.sku || null,
        price: parseFloat(data.price) || 0,
        regularPrice: parseFloat(data.regularPrice) || 0,
        salePrice: data.salePrice ? parseFloat(data.salePrice) : null,
        stockStatus: data.stockStatus || 'instock',
        stockQuantity: data.stockQuantity || null,
        featured: data.featured || false,
      },
    });
    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/admin/products - Update a product
export async function PUT(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();

  try {
    const data = await req.json();
    if (!data.id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

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
        status: data.status,
        description: data.description,
        shortDescription: data.shortDescription,
        sku: data.sku,
        price: data.price !== undefined ? parseFloat(data.price) : undefined,
        regularPrice: data.regularPrice !== undefined ? parseFloat(data.regularPrice) : undefined,
        salePrice: data.salePrice !== undefined ? parseFloat(data.salePrice) : undefined,
        stockStatus: data.stockStatus,
        stockQuantity: data.stockQuantity,
        featured: data.featured,
        options: data.options !== undefined ? data.options : undefined,
      },
    });

    // Broadcast price/options change to all connected SSE clients
    priceEvents.emit('price_updated', {
      slug: product.slug,
      price: product.price,
      options: product.options ?? null,
    });

    return NextResponse.json(product);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/products - Delete a product (admin only)
export async function DELETE(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();
  if (!requireRole(user, 'admin')) return forbiddenResponse();

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

  try {
    await prisma.productImage.deleteMany({ where: { productId: id } });
    await prisma.productProductCategory.deleteMany({ where: { productId: id } });
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
