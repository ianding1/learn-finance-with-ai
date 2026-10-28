import { defineCollection, z } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
	docs: defineCollection({
		loader: docsLoader(),
		schema: docsSchema({
			extend: z.object({
				// Lesson id from course/curriculum.yaml, e.g. "0.3". Set on lesson pages only.
				lesson: z.string().optional(),
			}),
		}),
	}),
};
