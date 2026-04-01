/**
 * Zod Validation Schemas
 * =======================
 * Shared validation schemas for API routes.
 */

import { z } from 'zod';

// ─── Checkout ────────────────────────────────────

export const checkoutDirectSchema = z.object({
  firstName: z.string().max(100).optional().default(''),
  lastName: z.string().max(100).optional().default(''),
  company: z.string().max(200).optional().default(''),
  street: z.string().max(200).optional().default(''),
  postcode: z.string().max(10).optional().default(''),
  city: z.string().max(100).optional().default(''),
  phone: z
    .string()
    .min(6, 'Telefonnummer ist zu kurz')
    .max(30)
    .regex(/^[0-9+\-\s()]+$/, 'Ungültige Telefonnummer'),
  email: z
    .string()
    .min(1, 'E-Mail ist erforderlich')
    .email('Ungültige E-Mail-Adresse')
    .max(255),
  paymentMethod: z.string().min(1, 'Zahlungsmethode ist erforderlich'),
  productId: z.string().min(1).max(100).optional().default('abmeldung'),
  productName: z.string().max(200).optional().default(''),
  productPrice: z.string().optional(),
  serviceData: z.record(z.any()).optional().default({}),
  couponCode: z.string().max(50).optional().default(''),
  customerNote: z.string().max(2000).optional().default(''),
  addons: z.array(z.object({
    label: z.string().max(200),
    price: z.number().optional(),
  })).optional().default([]),
});

export type CheckoutDirectInput = z.infer<typeof checkoutDirectSchema>;

// ─── Admin: Product ──────────────────────────────

export const productCreateSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich').max(255),
  slug: z
    .string()
    .max(255)
    .optional()
    .refine(
      (val) => !val || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(val),
      'Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten.',
    ),
  price: z.number().min(0).optional().default(0),
  description: z.string().max(10000).optional().default(''),
  options: z.string().max(10000).optional().default('[]'),
  isActive: z.boolean().optional().default(true),
  serviceType: z.string().max(100).optional().default(''),
  content: z.string().max(100000).optional().default(''),
  heroTitle: z.string().max(500).optional().default(''),
  heroSubtitle: z.string().max(1000).optional().default(''),
  featuredImage: z.string().max(2000).optional().default(''),
  faqItems: z.string().max(50000).optional().default('[]'),
  formType: z.string().max(50).optional().default(''),
  // SEO fields
  metaTitle: z.string().max(200).optional().default(''),
  metaDescription: z.string().max(500).optional().default(''),
  canonical: z.string().max(500).optional().default(''),
  robots: z.string().max(100).optional().default('index, follow'),
  ogTitle: z.string().max(200).optional().default(''),
  ogDescription: z.string().max(500).optional().default(''),
  ogImage: z.string().max(2000).optional().default(''),
});

export const productUpdateSchema = productCreateSchema.extend({
  id: z.string().min(1, 'ID ist erforderlich'),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

// ─── Admin: Blog Post ────────────────────────────

export const blogPostCreateSchema = z.object({
  title: z.string().min(1, 'Titel ist erforderlich').max(500),
  slug: z
    .string()
    .min(1, 'Slug ist erforderlich')
    .max(500)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten.',
    ),
  content: z.string().max(200000).optional().default(''),
  excerpt: z.string().max(2000).optional().default(''),
  status: z.enum(['draft', 'scheduled', 'publish']).optional().default('draft'),
  category: z.string().max(200).optional().default(''),
  featuredImage: z.string().max(2000).optional().default(''),
  featuredImageId: z.string().max(200).optional().default(''),
  tags: z.string().max(2000).optional().default(''),
  scheduledAt: z.string().nullable().optional(),
  // SEO fields
  metaTitle: z.string().max(200).optional().default(''),
  metaDescription: z.string().max(500).optional().default(''),
  focusKeyword: z.string().max(200).optional().default(''),
  canonical: z.string().max(500).optional().default(''),
  ogTitle: z.string().max(200).optional().default(''),
  ogDescription: z.string().max(500).optional().default(''),
});

export const blogPostUpdateSchema = blogPostCreateSchema.extend({
  id: z.string().min(1, 'ID ist erforderlich'),
});

export type BlogPostCreateInput = z.infer<typeof blogPostCreateSchema>;
export type BlogPostUpdateInput = z.infer<typeof blogPostUpdateSchema>;

// ─── Admin: Page ─────────────────────────────────

export const pageCreateSchema = z.object({
  title: z.string().min(1, 'Titel ist erforderlich').max(500),
  slug: z
    .string()
    .min(1, 'Slug ist erforderlich')
    .max(500)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten.',
    ),
  content: z.string().max(200000).optional().default(''),
  excerpt: z.string().max(2000).optional().default(''),
  status: z.enum(['draft', 'publish']).optional().default('draft'),
  author: z.string().max(200).optional().default('iKFZ-Team'),
  template: z.string().max(200).optional().default(''),
  parent: z.number().optional().default(0),
  menuOrder: z.number().optional().default(0),
  featuredImage: z.string().max(2000).optional().default(''),
  // SEO fields
  metaTitle: z.string().max(200).optional().default(''),
  metaDescription: z.string().max(500).optional().default(''),
  focusKeywords: z.string().max(500).optional().default(''),
  seoScore: z.number().min(0).max(100).optional().default(0),
  canonical: z.string().max(500).optional().default(''),
  robots: z.string().max(100).optional().default('index, follow'),
  schemaType: z.string().max(100).optional().default(''),
  schemaData: z.string().max(50000).optional().default(''),
  ogTitle: z.string().max(200).optional().default(''),
  ogDescription: z.string().max(500).optional().default(''),
  ogImage: z.string().max(2000).optional().default(''),
  ogType: z.string().max(50).optional().default('article'),
  twitterTitle: z.string().max(200).optional().default(''),
  twitterDescription: z.string().max(500).optional().default(''),
  twitterImage: z.string().max(2000).optional().default(''),
  twitterCard: z.string().max(50).optional().default('summary_large_image'),
});

export type PageCreateInput = z.infer<typeof pageCreateSchema>;

// ─── Helper: format Zod errors ───────────────────

export function formatZodErrors(error: z.ZodError) {
  return {
    error: 'Ungültige Eingabe',
    details: error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    })),
  };
}
