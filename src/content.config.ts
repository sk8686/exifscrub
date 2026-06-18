import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const docs = defineCollection({
  loader: glob({
    base: './src/content/docs',
    pattern: '**/*.{md,mdx}',
    generateId: ({ entry }) => entry.replace(/\.(md|mdx)$/, ''),
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    slug: z.string(),
    order: z.number(),
    lang: z.string().default('en'),
  }),
});

export const collections = { docs };
