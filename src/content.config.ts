import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    originalPublishedAt: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    kind: z.enum(['original', 'reprint']).default('original'),
    author: z.string().default('vtroiswhite'),
    translator: z.string().optional(),
    sourceName: z.string().optional(),
    sourceUrl: z.url().optional(),
    originalUrl: z.url().optional(),
    draft: z.boolean().default(false),
  }).refine(post => post.kind !== 'reprint' || Boolean(post.sourceUrl && post.sourceName), {
    message: '转载文章需要填写 sourceName 和 sourceUrl。',
  }),
});

export const collections = { posts };
