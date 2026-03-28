import { z } from 'zod';

export const blogPostCreateSchema = z.object({
  title:           z.string().min(1).max(500),
  slug:            z.string().min(1).max(500),
  content:         z.string().max(200000).optional().default(''),
  excerpt:         z.string().max(2000).optional().default(''),
  status:          z.enum(['draft', 'scheduled', 'publish']).optional().default('draft'),
  category:        z.string().max(200).optional().default(''),
  featuredImage:   z.string().max(2000).optional().default(''),
  featuredImageId: z.string().max(200).optional().default(''),
  tags:            z.string().max(2000).optional().default(''),
  scheduledAt:     z.string().nullable().optional(),
  metaTitle:       z.string().max(200).optional().default(''),
  metaDescription: z.string().max(500).optional().default(''),
  focusKeyword:    z.string().max(200).optional().default(''),
  canonical:       z.string().max(500).optional().default(''),
  ogTitle:         z.string().max(200).optional().default(''),
  ogDescription:   z.string().max(500).optional().default(''),
});

export const blogPostUpdateSchema = blogPostCreateSchema.extend({
  id: z.string().min(1),
});
