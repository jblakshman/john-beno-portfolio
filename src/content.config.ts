import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const work = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/work' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      /** One sentence for the home page row and search results. */
      summary: z.string(),
      /** Longer description for <meta name="description">. */
      description: z.string(),
      order: z.number(),
      disciplines: z.array(z.string()),
      tools: z.array(z.string()),
      /** e.g. "Semester 4 · University project" */
      context: z.string(),
      cover: image(),
      coverAlt: z.string(),
      /** Optional short muted loop that plays when hovering the cover. */
      previewVideo: z.string().optional(),
      liveUrl: z.url().optional(),
      liveLabel: z.string().optional(),
      status: z.enum(['complete', 'in-progress']).default('complete'),
      draft: z.boolean().default(false),
    }),
});

export const collections = { work };
