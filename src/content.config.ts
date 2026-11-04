import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/** A six-digit hex color, e.g. #e5533d. */
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a six-digit hex color like #e5533d');

const link = z.object({
  label: z.string(),
  url: z.url(),
  /** What the link opens. Sets the icon and the order in the header. */
  type: z.enum(['live', 'prototype', 'video', 'appstore', 'testflight', 'code', 'file', 'press']).default('live'),
});

/**
 * Projects. Every field below the line marked "optional" can be left out;
 * the page only shows what is filled in. See CONTENT.md for a guide.
 */
const work = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/work' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      /** One sentence for the work list and the case header. Aim for under 150 characters. */
      summary: z.string(),
      /** Longer description for search results and link previews (about 150–160 characters). */
      description: z.string(),
      /** Position in the work list, lowest first. */
      order: z.number(),
      disciplines: z.array(z.string()),
      tools: z.array(z.string()),
      /** Short line about the setting, e.g. "Semester 7 · University project" or "Client · Freelance". */
      context: z.string(),
      cover: image(),
      coverAlt: z.string(),

      /* Optional ------------------------------------------------------- */

      /** case-study: a project write-up. app: one of your own apps. experiment: a small study. */
      kind: z.enum(['case-study', 'app', 'experiment']).default('case-study'),
      /** Show in the work list on the home page. Turn off to keep a project reachable by link only. */
      featured: z.boolean().default(true),
      /**
       * Link only: kept out of the work list, the sitemap and search results,
       * but anyone with the address can open it. For work under NDA that you
       * share with one person. (Not a password: do not use it for secrets.)
       */
      unlisted: z.boolean().default(false),
      /** Your role in one line, e.g. "Lead designer · research, interaction, prototyping". */
      role: z.string().optional(),
      year: z.number().int().optional(),
      /** e.g. "Oct 2025 – Feb 2026". Shown instead of the year when set. */
      period: z.string().optional(),
      /** e.g. "14 weeks". */
      duration: z.string().optional(),
      /** People or roles you worked with, e.g. ["Anna Weber, research", "2 engineers"]. */
      team: z.array(z.string()).default([]),
      /** e.g. ["iPadOS", "visionOS"]. */
      platforms: z.array(z.string()).default([]),
      /** Who the work was for, if not yourself. */
      client: z.string().optional(),
      /** Three short answers for readers in a hurry. Shown as "At a glance" under the header. */
      glance: z
        .object({
          challenge: z.string(),
          approach: z.string(),
          outcome: z.string(),
        })
        .optional(),
      /** Prototype, live site, App Store, video, code … */
      links: z.array(link).default([]),
      /** A color for this project: one hex, or a pair for light and dark backgrounds. */
      accent: z.union([hex, z.object({ light: hex, dark: hex })]).optional(),
      /** Short muted loop that plays on the cover in some work layouts. */
      previewVideo: z.string().optional(),
      /** Credits at the end of the case study. */
      credits: z.array(z.object({ name: z.string(), role: z.string(), url: z.url().optional() })).default([]),
      status: z.enum(['complete', 'in-progress']).default('complete'),
      /** Drafts are visible in the Studio preview only, never on the live site. */
      draft: z.boolean().default(false),
    }),
});

/**
 * Notes: short pieces of writing. Process notes, things you learned,
 * small studies. Shown when sections.notes is on in site.config.ts.
 */
const notes = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/notes' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      /** One or two sentences for the list, search results and the feed. */
      description: z.string(),
      date: z.coerce.date(),
      updated: z.coerce.date().optional(),
      tags: z.array(z.string()).default([]),
      /** Optional image for link previews. */
      image: image().optional(),
      imageAlt: z.string().optional(),
      draft: z.boolean().default(false),
    }),
});

export const collections = { work, notes };
