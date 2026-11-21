import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    hook: z.string(),
    summary: z.string(),
    order: z.number(),
    role: z.string(),
    period: z.string(),
    context: z.string(),
    stack: z.array(z.string()),
    metrics: z.array(z.object({ value: z.string(), label: z.string() })).default([]),
    links: z.array(z.object({ label: z.string(), url: z.url() })).default([]),
    /** Optional dated milestones, newest first, shown as "Version history". */
    history: z.array(z.object({ version: z.string(), date: z.string(), note: z.string() })).default([]),
    /** true while the write-up still contains lorem ipsum. */
    placeholder: z.boolean().default(false),
  }),
});

const writing = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/writing' }),
  schema: z.object({
    title: z.string(),
    excerpt: z.string(),
    date: z.coerce.date(),
    category: z.enum(['Playwright', 'CI/CD', 'API testing', 'Career']),
    /** Set for posts published elsewhere (e.g. Medium): the list links out and no local page is built. */
    url: z.url().optional(),
    /** Where an external post lives, shown next to it ("Medium"). */
    source: z.string().optional(),
    /** Reading time for external posts, whose body isn't stored here. */
    minutes: z.number().optional(),
    /** true while the post is lorem ipsum; shows a "Draft" label. */
    placeholder: z.boolean().default(false),
  }),
});

export const collections = { projects, writing };
